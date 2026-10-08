// Runtime coordination tests on the synthetic feed (no network), part 1: the walk-forward patch sanitiser, the self-audit
// of every published number, the feed and the lifecycle, and the event-loop bound during a compute. The suite is split over
// runtime.test.ts, runtime-coordination.test.ts, runtime-progress.test.ts and runtime-restart.test.ts (parallel in node).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeWf } from "./runtime.server.ts";
import { auditStateGen, type AuditInput } from "../audit.ts";
import { CoreDb } from "./db.server.ts";
import { laneLabel, laneOf } from "../indications/registry.ts";
import { syntheticCandles } from "../market/bars.ts";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreRuntime, mk, small, stopStarted, until } from "./runtime-harness.ts";

afterEach(stopStarted);

describe("walk-forward patch sanitiser", () => {
  it("keeps a short simulated window (it was clamped to 6 h, so a 2 h or 3 h run silently ran 6 h)", () => {
    assert.equal(sanitizeWf({ simH: 1 }).simH, 1);
    assert.equal(sanitizeWf({ simH: 2 }).simH, 2);
    assert.equal(sanitizeWf({ simH: 3 }).simH, 3);
    assert.equal(sanitizeWf({ simH: 0.5 }).simH, 1, "below one hour is raised to one");
    assert.equal(sanitizeWf({ simH: 500 }).simH, 240, "the upper bound stays");
    assert.equal(sanitizeWf({ preH: 3 }).preH, 3);
  });
});

// 20 min: a full compute per test on a 4-core host the live desk shares (the stress test alone is 3–5 min). The suite
// is split over runtime*.test.ts so that node runs the parts in parallel: the limit only guards against a hang.
describe("runtime coordination", { timeout: 1_200_000 }, () => {
  for (const [name, block] of [
    ["config set", {}],
    [
      "all sources, shared",
      {
        sources: { config: true, overall: true, symbol: true, direction: true, indication: true },
        mode: "shared",
      },
    ],
    [
      "all sources, additive",
      {
        sources: { config: true, overall: true, symbol: true, direction: true, indication: true },
        mode: "additive",
      },
    ],
    [
      "overall only + Active (must not lock itself out)",
      { sources: { config: false, overall: true }, active: true },
    ],
    [
      "type Overall (every source its own Block) + Active, steps",
      {
        sources: { config: false, overall: true, symbol: true, direction: true, indication: true },
        mode: "overall",
        steps: 3,
        active: true,
      },
    ],
  ] as const) {
    it(`self-audit passes on every published number (Block: ${name})`, async () => {
      const rt = new CoreRuntime(
        new CoreDb(":memory:"),
        {
          ...small,
          toggles: {
            normal: true,
            trailing: true,
            block: true,
            blockActive: "active" in block,
            dca: true,
            dcaActive: false,
            axis: true,
          },
          block: { mode: "shared", steps: 0, pause: 0, ratio: 0.2, maxLevel: 3, minActiveLevel: 1, maxMult: 2.5, ...block },
        } as never,
        { market: "synthetic" },
      );
      // the audit is what these runs check, not the selection: no last-N validation, so plenty of trades execute
      // whatever the synthetic market of the minute
      rt.updateSettings({}, { validLastN: 0, lastN: 0 });
      rt.start();
      await until(
        () => rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null,
      );
      rt.stop();
      const a = rt.audit!;
      const failed = a.checks.filter((c) => !c.ok);
      assert.deepEqual(failed, [], JSON.stringify(failed));
      assert.ok(a.checks.length >= 14, `${a.checks.length} checks`);
      assert.ok(rt.sim!.trades.length > 0, "the simulation executed trades");
      // the live validation (deactivation check) judges the selected configs on their live last 25 (default)
      assert.equal(rt.status.liveValidation?.lastN, 25);
      assert.ok((rt.status.liveValidation?.judged ?? -1) >= 0);
      // the group check is off by default: no group verdicts
      assert.equal(rt.status.liveValidation?.groupLastN, 0);
      assert.deepEqual(rt.status.liveValidation?.groups, []);
      // Block raises volume on some trades and never beyond the cap
      const mults = rt.sim!.trades.map((t) => t.mult ?? 1);
      assert.ok(
        mults.some((m) => m > 1),
        "some Block-raised trades",
      );
      // shared / additive: within maxMult; Overall: each source within maxMult, the stack within 8×
      if ((block as { mode?: string }).mode === "overall") {
        assert.ok(Math.max(...mults) <= 8 + 1e-9);
        for (const t of rt.sim!.trades)
          for (const v of Object.values(t.legs ?? {})) assert.ok((v ?? 0) <= 1.5 + 1e-9, `leg ${v}`);
      } else assert.ok(Math.max(...mults) <= 2.5 + 1e-9);
      // the audit catches tampering: a wrong volume, a lost trade, a wrong equity
      const t0 = rt.sim!.trades[0];
      t0.mult = (t0.mult ?? 1) + 0.5;
      assert.ok(!rt.runAudit().checks.find((c) => c.name.startsWith("replay"))!.ok);
      t0.mult = (t0.mult ?? 1) - 0.5;
      rt.sim!.trades.pop();
      assert.ok(
        !rt.runAudit().checks.find((c) => c.name === "numbers: stats match the trade list")!.ok,
      );
      rt.paper.equity += 1;
      assert.ok(!rt.runAudit().checks.find((c) => c.name.startsWith("paper: equity"))!.ok);
      rt.paper.equity -= 1;
      // a live tick between the sliced audit's slices re-marks the open positions in place: the audit judges the
      // book as it was when it started, not newer marks against an older equity
      if (rt.paper.positions.length) {
        const gen = auditStateGen((rt as unknown as { auditInput(): AuditInput }).auditInput());
        let r = gen.next();
        for (const p of rt.paper.positions) p.mtm += 0.01;
        if (!r.done) r = gen.next();
        while (!r.done) r = gen.next();
        const eq = r.value.checks.find((c) => c.name.startsWith("paper: equity"))!;
        assert.ok(eq.ok, eq.detail);
      }
    });
  }

  it("never reads candles of another timeframe as 1m base bars (hot reload / old snapshot)", async () => {
    const rt = mk();
    rt.candles.set("OLD-USDT", syntheticCandles("OLD", 15, 800, Date.now()));
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    assert.ok(!rt.candles.has("OLD-USDT"));
    for (const cs of rt.candles.values())
      assert.equal(cs[cs.length - 1].t - cs[cs.length - 2].t, 60_000);
    assert.ok(
      rt.db.all<{ msg: string }>("SELECT msg FROM events").some((e) => /not 1m bars/.test(e.msg)),
    );
    // every lane has series in the universe the engine computed on
    const tfs = new Set(rt.tapes.map((t) => laneOf(t.ind).tf));
    assert.ok(
      rt.pipeline!.s1.some((r) => laneOf(r.ind).tf === 30) &&
        rt.pipeline!.s1.some((r) => laneOf(r.ind).tf === 1),
    );
    assert.ok(tfs.size >= 1);
  });

  it("retires paper positions from before the timeframe lanes and gives every lane its Main share", async () => {
    const rt = mk();
    rt.paper.positions = [
      {
        cfg: "follow|rsi-14|tp2.6|sl3.9|tr0|h32",
        sym: "SYN0-USDT",
        side: 1,
        entryT: 0,
        entryI: 0,
        entry: 1,
        stop: 0.9,
        target: 1.1,
        peak: 1,
        trailOn: false,
        mtm: 0,
        vol: 1,
      },
    ];
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    assert.ok(rt.paper.positions.every((p) => laneOf(p.cfg.split("|")[1]).tf !== null));
    assert.ok(
      rt.db
        .all<{ msg: string }>("SELECT msg FROM events")
        .some((e) => /retired 1 paper position/.test(e.msg)),
    );
    assert.ok(
      rt.tapes.every((t) => laneOf(t.ind).tf !== null),
      "no plain tapes",
    );
    // the Main share reaches every lane that has Base passers
    const passedLanes = new Set(
      rt
        .pipeline!.s1.filter(
          (r) =>
            r.full.pf >= rt.settings.gates.minPf &&
            r.full.net > 0 &&
            r.full.n >= rt.settings.gates.minTrades,
        )
        .map((r) => laneLabel(r.ind)),
    );
    const tapeLanes = new Set(rt.tapes.map((t) => laneLabel(t.ind)));
    for (const l of passedLanes) assert.ok(tapeLanes.has(l), `lane ${l} reaches Main`);
  });

  it("shutdown persists settings, stats and runs; a new process restores them", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-persist-"));
    const prev = process.env.CTS_CORE_SNAPSHOT;
    process.env.CTS_CORE_SNAPSHOT = join(dir, "core.sqlite");
    try {
      const a = new CoreRuntime(
        new CoreDb(":memory:", { statePath: join(dir, "state.json") }),
        small,
        {
          market: "synthetic",
        },
      );
      a.updateSettings({ symbols: 3, block: { ...a.settings.block, mode: "additive" } });
      a.start();
      await until(() => a.status.computes >= 1 && a.status.state === "running");
      const runs = Number(a.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM runs")?.n);
      const r = a.shutdown("SIGTERM");
      assert.equal(r.snapshot, true);
      assert.equal(a.status.state, "stopped");
      assert.ok(existsSync(join(dir, "state.json")) && existsSync(join(dir, "core.sqlite")));
      // a new process on the same data location
      const b = new CoreRuntime(
        new CoreDb(":memory:", { statePath: join(dir, "state.json") }),
        undefined,
        {
          market: "synthetic",
        },
      );
      assert.equal(b.settings.symbols, 3);
      assert.equal(b.settings.block.mode, "additive");
      b.start();
      await until(
        () => Number(b.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM runs")?.n) >= runs,
      );
      assert.ok(
        b.db
          .all<{ msg: string }>("SELECT msg FROM events")
          .some((e) => /SIGTERM: state saved/.test(e.msg)),
      );
      b.stop();
    } finally {
      if (prev === undefined) delete process.env.CTS_CORE_SNAPSHOT;
      else process.env.CTS_CORE_SNAPSHOT = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("computes on the synthetic feed and publishes every stage", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    assert.equal(rt.status.source, "synthetic");
    assert.ok(rt.pipeline && rt.sim && rt.tapes.length > 0);
    assert.ok(Number(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM results")?.n) > 300);
    assert.ok(rt.db.kvGet("presetSims"));
    for (const k of ["Pipeline", "Persist", "Tapes", "Simulation", "Compare", "Paper"])
      assert.ok(rt.status.phases[k], k);
    // a Base config's trades recomputed on demand (detail page) match its stored stats exactly
    // two rows of every lane (independent and combined): lanes scale their protect, which the id carries
    const rows = ["@m1|", "@m1c|", "@m5|", "@m5c|", "@m15|", "@m15c|", "@m30|"].flatMap((lane) =>
      rt.db.all<{ id: string; n: number }>(
        "SELECT id, n FROM results WHERE stage = 1 AND n > 0 AND instr(id, ?) > 0 ORDER BY n DESC LIMIT 2",
        lane,
      ),
    );
    assert.ok(rows.length >= 7, `${rows.length} lane rows`);
    for (const row of rows) assert.equal(rt.comboTrades(row.id)?.length, row.n, row.id);
    assert.equal(rt.comboTrades("not|a|config"), null);
    // no table is left half-written: shadow tables are gone after the swap
    assert.equal(rt.db.all("SELECT name FROM sqlite_master WHERE name LIKE '%_next'").length, 0);
    rt.stop();
  });

  it("stop during a compute stays stopped and never reschedules", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    const cycles = rt.status.cycles;
    const computes = rt.status.computes;
    rt.stop();
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(rt.status.state, "stopped");
    assert.equal(rt.status.cycles, cycles, "abandoned cycle must not count");
    assert.equal(rt.status.computes, computes, "abandoned compute must not publish");
    // start again resumes
    rt.start();
    await until(() => rt.status.state === "running" && rt.status.cycles > cycles);
    rt.stop();
  });

  it("a settings change during a compute is applied by a follow-up compute, not mid-way", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    // a real compute change (the defaults already had dcaActive / blockActive off: that patch changed nothing, and
    // the test passed only while compute #1's auto-adjust happened to start a second compute)
    const minPf = rt.settings.gates.minPf + 0.05;
    rt.updateSettings({ gates: { ...rt.settings.gates, minPf } });
    // the running compute keeps its snapshot; the follow-up compute takes the change
    await until(() => rt.status.computes >= 2, 180_000);
    assert.equal(rt.sim?.opts.gates.minPf, minPf);
    rt.stop();
  });

  it("a live-only or unchanged settings patch during a compute keeps that compute (paper steps on it)", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    // a desk re-applying its patch file: live limits, and a patch that changes nothing compute-related
    rt.updateSettings({ live: { ...rt.settings.live, maxPositions: 0, maxNotionalUsd: 200, openPaused: "test" } });
    rt.updateSettings({ disabledKinds: [...(rt.settings.disabledKinds ?? [])] }, {});
    await until(() => rt.status.computes >= 1 && rt.status.state === "running", 180_000);
    const r = rt as unknown as { paperStepped: boolean; dirty: boolean };
    assert.equal(r.paperStepped, true, "the compute's tapes are stepped, not thrown away");
    assert.equal(rt.settings.live.maxPositions, 0);
    assert.equal(rt.settings.live.openPaused, "test");
    // a compute-relevant change still recomputes
    rt.updateSettings({ toggles: { ...rt.settings.toggles, dcaActive: !rt.settings.toggles.dcaActive } });
    assert.equal(r.dirty || rt.status.state === "computing", true);
    rt.stop();
  });

  it("resync while busy is applied at the next cycle and rebuilds the universe", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1);
    rt.updateSettings({ symbols: 3 });
    await until(() => rt.status.computes >= 2 && rt.candles.size === 3, 180_000);
    assert.equal(
      Number(rt.db.get<{ n: number }>("SELECT COUNT(DISTINCT sym) AS n FROM candles")?.n),
      3,
    );
    rt.stop();
  });

  it("the watchdog starts a new generation; the abandoned cycle never publishes", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    // a cycle waiting on workers that keep replying is alive
    const { markWorkersSilent, workerActivity } = await import("./pool.server.ts");
    await until(() => workerActivity().inFlight > 0 || rt.status.computes >= 1);
    if (workerActivity().inFlight > 0) {
      rt.status.heartbeat = 0;
      rt.ensureAlive();
      assert.equal(
        rt.db.all("SELECT msg FROM events WHERE msg LIKE 'watchdog%'").length,
        0,
        "not abandoned while its workers reply",
      );
    }
    rt.status.heartbeat = 0; // simulate a stuck loop (and silent workers)
    markWorkersSilent();
    rt.ensureAlive();
    await until(() => rt.status.computes >= 1, 180_000);
    const ev = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE 'watchdog%'");
    assert.equal(ev.length, 1);
    // exactly one compute run row per finished generation compute
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(
      Number(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM runs")?.n),
      rt.status.computes,
    );
    rt.stop();
  });

  it("keeps the event loop responsive during a compute", async () => {
    const rt = mk();
    let worst = 0;
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      worst = Math.max(worst, now - last - 10);
      last = now;
    }, 10);
    rt.start();
    await until(() => rt.status.computes >= 1);
    // a second compute starts by compacting the first one's tapes (slimTapes): in one piece it held the loop for
    // seconds on a desk (x02, 7 Oct) — it runs in slices like every other phase
    rt.updateSettings({ gates: { ...rt.settings.gates, minPf: rt.settings.gates.minPf + 0.05 } });
    await until(() => rt.status.computes >= 2);
    clearInterval(iv);
    rt.stop();
    assert.ok(worst < 250, `worst stall ${worst.toFixed(0)} ms`);
    if (rt.status.tapesReleased) assert.ok(rt.status.phases.Slim, "the compaction ran as its own sliced phase");
    for (const [k, v] of Object.entries(rt.status.phases))
      assert.ok(v.maxSliceMs < 250, `${k} slice ${v.maxSliceMs.toFixed(0)} ms`);
  });

});

