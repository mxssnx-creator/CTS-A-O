// Runtime coordination tests on the synthetic feed (no network): races between cycles, settings, stop,
// resync and the watchdog; plus a responsiveness bound on the event loop during a full compute.
import { allCombos } from "../pipeline/pipeline.ts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { SIGNAL_SOURCES } from "../signal-config.ts";
import { RESEARCH_PRESETS } from "../presets.ts";
import { isSignalInd, laneLabel, laneOf } from "../indications/registry.ts";
import { signalCombos, signalSettings } from "../signals.ts";
import { syntheticCandles } from "../market/bars.ts";

// the synthetic market ends on the hour: the same bars, lane buckets and hourly windows on every run (ending at
// the current minute, the minute decided whether any entry was Block-raised — the self-audit tests failed at random)
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const small = {
  symbols: 4,
  historyDays: 18,
  // lanes over a shorter history keep each synthetic engine light (the suite runs several in parallel)
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  // the short order range is covered by the protect-grid test; these runs stay on the wide grid only
  grid: { short: false as const },
  // runtime mechanics, not the entry tactics (tactics.test / processing.test cover them): no entry filter, so
  // every synthetic minute has trades to audit
  tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  // the synthetic feed has no edge: lenient gates so Base passes pairs and there are tapes, seats and trades to
  // publish and audit (the gates themselves: gating.test, walkforward.test, lastn-calc.test)
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  // runtime mechanics, not signal quality (signals.test covers the full signal defaults): percent exits and the
  // classic sources only keep each engine light enough to run several in parallel
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(
      SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false]),
    ),
  }),
};
const mk = () => new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
const until = async (cond: () => boolean, ms = 120_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("runtime coordination", { timeout: 600_000 }, () => {
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
    rt.updateSettings({
      toggles: { ...rt.settings.toggles, dcaActive: false, blockActive: false },
    });
    await until(() => rt.status.computes >= 2, 180_000);
    assert.equal(rt.sim?.opts.toggles.dcaActive, false);
    assert.equal(rt.sim?.opts.toggles.blockActive, false);
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
    clearInterval(iv);
    rt.stop();
    assert.ok(worst < 250, `worst stall ${worst.toFixed(0)} ms`);
    for (const [k, v] of Object.entries(rt.status.phases))
      assert.ok(v.maxSliceMs < 250, `${k} slice ${v.maxSliceMs.toFixed(0)} ms`);
  });

  it("applies a research preset (tactics, focus, fixed mode) without touching Live, then saves a preset", async () => {
    const rt = mk();
    rt.updateSettings({ live: { ...rt.settings.live, enabled: true } });
    await assert.rejects(async () => rt.savePreset("too early"), /no simulated run/);
    const p = rt.applyPreset(RESEARCH_PRESETS[0].id);
    // a research preset's timeframe is normalised: the engine always runs every lane from 1m
    assert.equal(rt.settings.tfMin, 1);
    assert.deepEqual(rt.settings.tfs, [1, 5, 15, 30]);
    assert.deepEqual(rt.settings.toggles, p.settings.toggles);
    assert.equal(rt.wf.lastN, p.wf.lastN);
    assert.equal(rt.settings.focus.length, p.settings.focus!.length);
    assert.equal(rt.wf.mode, "fixed");
    assert.equal(rt.settings.live.enabled, true, "Live is never changed by a preset");
    rt.updateSettings({ symbols: 3 });
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running", 240_000);
    rt.stop();
    // Base evaluates exactly the focus set plus the pinned pairs in every lane (4 timeframes + 3 combined); only
    // pairs passing the Base gate (PF ≥ min) continue to tapes (+ the signal sources, processed alongside)
    const sigCombos = signalCombos(signalSettings(rt.settings.signals), rt.settings.tfs).length;
    const focusPinned = [...new Set([...p.settings.focus!, ...(rt.settings.pinned ?? [])])];
    assert.equal(
      rt.status.baseEvaluated,
      allCombos(focusPinned, rt.settings.disabledKinds, rt.settings.tfs).length + sigCombos,
    );
    assert.ok(
      rt.tapes.every((t) => {
        if (isSignalInd(t.ind)) return true;
        const base = `${t.bot}|${laneOf(t.ind).base}`;
        const pair = `${t.bot}|${t.ind}`;
        const pin = rt.settings.pinned ?? [];
        return p.settings.focus!.includes(base) || pin.includes(base) || pin.includes(pair);
      }),
    );
    const saved = rt.savePreset("mine", "test");
    assert.equal(saved.kind, "saved");
    assert.deepEqual(saved.settings.focus, p.settings.focus);
    assert.equal("live" in saved.settings, false);
    assert.ok(rt.savedPresets().some((x) => x.id === saved.id));
    rt.deletePreset(saved.id);
    assert.ok(!rt.savedPresets().some((x) => x.id === saved.id));
  });

  it("stress: a storm of mixed operations always ends in a clean compute with the last settings", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const toggles = ["normal", "trailing", "block", "blockActive", "dca", "dcaActive"] as const;
    for (let i = 0; i < 60; i++) {
      const x = rnd();
      if (x < 0.15)
        rt.applyPreset(RESEARCH_PRESETS[Math.floor(rnd() * RESEARCH_PRESETS.length)].id);
      else if (x < 0.35)
        rt.updateSettings({
          toggles: { ...rt.settings.toggles, [toggles[Math.floor(rnd() * 6)]]: rnd() < 0.5 },
        });
      else if (x < 0.5)
        rt.updateSettings({
          tactics: {
            ...rt.settings.tactics,
            volRegime: rnd() < 0.5,
            session: rnd() < 0.3,
            cooldown: rnd() < 0.3,
          },
        });
      else if (x < 0.6)
        rt.updateSettings(
          {
            focus:
              rnd() < 0.5
                ? []
                : ["follow|rsi-mom-14-25", "follow|bb-walk@x4", "revert|cci-40-200@x4"],
          },
          { mode: (["fixed", "durable", "hourly"] as const)[Math.floor(rnd() * 3)] },
        );
      else if (x < 0.7)
        rt.updateSettings(
          {},
          { lastN: rnd() < 0.5 ? 0 : 12, maxPerSymbol: 1 + Math.floor(rnd() * 3) },
        );
      else if (x < 0.78) rt.stop();
      else if (x < 0.9) rt.start();
      else if (x < 0.95) rt.kick();
      else rt.requestResync();
      await new Promise((r) => setTimeout(r, rnd() * 60));
    }
    // final, known settings
    rt.updateSettings(
      {
        tfMin: 15,
        focus: [],
        tactics: { ...rt.settings.tactics, volRegime: true, session: false, cooldown: false },
        toggles: {
          normal: true,
          trailing: true,
          block: true,
          blockActive: true,
          dca: true,
          dcaActive: false,
          axis: true,
        },
      },
      { mode: "durable", lastN: 12 },
    );
    rt.start();
    const at = rt.status.settingsAt;
    await until(
      () =>
        rt.status.appliedSettingsAt >= at && rt.status.state === "running" && !rt.status.pending,
      280_000,
    );
    rt.stop();
    assert.equal(rt.status.error ?? null, null);
    assert.ok(rt.sim && rt.tapes.length > 0);
    assert.equal(rt.sim!.opts.toggles.dcaActive, false);
    assert.equal(rt.wf.mode, "durable");
    // every paper position passes the execution rules of the current settings
    // (Overall: every source its own Block, each within maxMult, the stack within 8×)
    const b = rt.settings.block;
    const cap = b.mode === "overall" ? 8 : b.maxMult;
    for (const p of rt.paper.positions) {
      assert.ok((p.vol ?? 1) >= 1 && (p.vol ?? 1) <= cap + 1e-9, `vol ${p.vol}`);
      for (const v of Object.values(p.legs ?? {})) assert.ok((v ?? 0) <= b.maxMult - 1 + 1e-9, `leg ${v}`);
    }
    assert.ok(rt.status.phases.Pipeline && rt.status.phases.Tapes && rt.status.phases.Simulation);
  });

  it("backtests a preset over the last days in the background and keeps the result", async () => {
    const rt = mk();
    const p = RESEARCH_PRESETS[0];
    rt.startPresetBacktest(p.id, 2);
    assert.throws(() => rt.startPresetBacktest(p.id, 3), /a backtest is running/);
    await until(() => rt.backtestJob?.state !== "running", 240_000);
    assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
    const list = rt.presetBacktests()[p.id];
    assert.equal(list.length, 1);
    const b = list[0];
    assert.equal(b.days, 2);
    assert.equal(b.tfMin, 1);
    assert.ok(b.to - b.from === 2 * 24 * 3_600_000 || b.to - b.from < 2 * 24 * 3_600_000);
    assert.ok(b.successHours >= 0 && b.successHours <= 1);
    assert.equal(b.pass, b.n > 0 && b.pf >= b.minPf && b.ddtH <= b.maxDdtH);
    // the diagrams and the info line are cached per preset (durable key), aligned on one time axis
    const s = rt.presetSeries(p.id)!;
    assert.ok(s, "diagrams cached");
    assert.equal(s.days, 2);
    assert.ok(s.t.length > 10 && s.t.length <= 401);
    for (const k of ["balance", "equity", "ddPct", "positions", "orders"] as const) assert.equal(s[k].length, s.t.length, k);
    for (const k of Object.keys(s.kinds) as Array<keyof typeof s.kinds>) assert.equal(s.kinds[k].length, s.t.length, k);
    assert.equal(b.posPerHour, s.info.posPerHour);
    assert.ok(s.info.posPerHour >= 0 && s.info.ddtH >= 0);
    assert.ok(s.info.positions <= b.n);
    assert.throws(() => rt.startPresetBacktest("nope", 2), /unknown preset/);
    // "backtest all": queued one after another, only presets without diagrams over the range
    const queued = rt.queuePresetBacktests(2, true);
    assert.ok(queued >= 1);
    assert.ok(!rt.backtestQueue.some((q) => q.id === p.id), "a preset with diagrams over the range is skipped");
    assert.equal(rt.backtestJob?.state, "running");
    rt.backtestQueue.length = 0;
    await until(() => rt.backtestJob?.state !== "running", 240_000);
    // editing a saved preset or deleting it drops its diagrams; the 30-day maximum is enforced
    rt.startPresetBacktest(p.id, 99);
    assert.equal(rt.backtestJob?.days, 30);
    await until(() => rt.backtestJob?.state !== "running", 600_000);
  });

  it("a set holding an open position stays processed until it closes, even when no longer selected", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const tp = rt.tapes.find((t) => t.open.length > 0);
    assert.ok(tp, "a tape with an open position");
    const op = tp!.open[0];
    rt.paper.positions = [{ ...op, vol: 1.4, level: 2 }];
    // nothing is selected any more and every cap is at its minimum
    rt.wf = {
      ...rt.wf,
      portfolio: 1,
      maxOpen: 1,
      maxPerSymbol: 1,
      maxPerSide: 1,
      maxPositions: 1,
      bots: ["nonexistent" as never],
      // no active signal either
      signalActive: new Set<string>(),
    };
    (rt as unknown as { stepPaper(): void }).stepPaper();
    const kept = rt.paper.positions.find(
      (p) => p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT,
    );
    assert.ok(kept, "the held position is still processed");
    assert.equal(kept!.vol, 1.4, "it keeps its volume");
    // regression: the deselected set's OTHER tape positions were never taken and must not appear (they
    // bypassed every cap and grew the paper book to hundreds of positions)
    const sel = new Set(rt.paper.selected);
    for (const p of rt.paper.positions)
      assert.ok(
        sel.has(p.cfg) || (p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT),
        `${p.cfg}@${p.sym} was never held and its set is not selected`,
      );
    const fresh = rt.paper.positions.filter((p) => !(p.cfg === op.cfg && p.sym === op.sym));
    assert.ok(fresh.length <= 1, `caps hold for new entries (${fresh.length})`);
  });

  it("a stop the live tick crosses while the paper step runs in slices stays crossed in the new book", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const tp = rt.tapes.find((t) => t.open.length > 0);
    assert.ok(tp, "a tape with an open position");
    const op = tp!.open[0];
    const self = rt as unknown as { stepPaperGen(): Generator<number, void> };
    const book = () => [{ ...op, vol: 1, level: 0 }];
    rt.db.kvSet("stopHits", {});
    // a dry run counts the slices
    rt.paper.positions = book();
    let n = 0;
    for (const _ of self.stepPaperGen()) n++;
    assert.ok(n > 0);
    // again: the tick crosses the held position's stop at the last slice (after the new book was built)
    rt.paper.positions = book();
    const old = rt.paper.positions[0] as { stopHit?: number };
    let i = 0;
    for (const _ of self.stepPaperGen()) if (++i === n) old.stopHit = 12345;
    const kept = rt.paper.positions.find(
      (p) => p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT,
    ) as { stopHit?: number } | undefined;
    assert.ok(kept, "the held position is still in the book");
    assert.equal(kept!.stopHit, 12345, "its tick-time stop crossing is carried over");
  });

  it("never runs two cycles at once, however often a recompute is requested", async () => {
    const rt = mk();
    let running = 0;
    let maxRunning = 0;
    const orig = rt.cycle.bind(rt);
    rt.cycle = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      try {
        await orig();
      } finally {
        running--;
      }
    };
    rt.start();
    await until(() => rt.status.state === "computing");
    for (let i = 0; i < 20; i++) {
      rt.kick();
      await new Promise((r) => setTimeout(r, 30));
    }
    await until(() => rt.status.computes >= 2 && rt.status.state === "running", 240_000);
    rt.stop();
    // an overlapping call returns immediately at the busy guard; real work never overlaps
    assert.ok(rt.status.computes >= 2);
    assert.ok(maxRunning <= 2, `overlap ${maxRunning}`);
  });
});
