// Runtime coordination tests on the synthetic feed (no network): races between cycles, settings, stop,
// resync and the watchdog; plus a responsiveness bound on the event loop during a full compute.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { RESEARCH_PRESETS } from "../presets.ts";
import { laneLabel, laneOf } from "../indications/registry.ts";
import { syntheticCandles } from "../market/bars.ts";

const small = {
  symbols: 4,
  historyDays: 18,
  // lanes over a shorter history keep each synthetic engine light (the suite runs several in parallel)
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
};
const mk = () => new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
const until = async (cond: () => boolean, ms = 120_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("runtime coordination", { timeout: 300_000 }, () => {
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
          block: { ratio: 0.2, maxLevel: 3, minActiveLevel: 1, maxMult: 2.5, ...block },
        } as never,
        { market: "synthetic" },
      );
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
      // Block raises volume on some trades and never beyond the cap
      const mults = rt.sim!.trades.map((t) => t.mult ?? 1);
      assert.ok(
        mults.some((m) => m > 1),
        "some Block-raised trades",
      );
      assert.ok(Math.max(...mults) <= 2.5 + 1e-9);
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
    const rows = rt.db.all<{ id: string; n: number }>(
      "SELECT id, n FROM results WHERE stage = 1 AND n > 0 ORDER BY n DESC LIMIT 5",
    );
    assert.ok(rows.length > 0);
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
    rt.status.heartbeat = 0; // simulate a stuck loop
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
    // Base evaluates exactly the focus set in every lane (4 timeframes + 3 combined); only pairs passing the
    // Base gate (PF ≥ min) continue to tapes
    assert.equal(rt.status.baseEvaluated, p.settings.focus!.length * 7);
    assert.ok(rt.tapes.every((t) => p.settings.focus!.includes(`${t.bot}|${laneOf(t.ind).base}`)));
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
    for (const p of rt.paper.positions)
      assert.ok((p.vol ?? 1) >= 1 && (p.vol ?? 1) <= rt.settings.block.maxMult);
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
    assert.throws(() => rt.startPresetBacktest("nope", 2), /unknown preset/);
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
      bots: ["nonexistent" as never],
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
