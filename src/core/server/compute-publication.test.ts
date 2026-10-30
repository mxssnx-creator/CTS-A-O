import assert from "node:assert/strict";
import { after, test } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";
import { closePool } from "./pool.server.ts";
import { baseRangeCountsGen } from "../pipeline/pipeline.ts";

const runtimes: CoreRuntime[] = [];
after(async () => {
  for (const rt of runtimes) {
    rt.dispose();
    await rt.backtestsSettled();
    rt.db.db.close();
  }
  await closePool();
});
const statusFields = [
  "basePassed", "baseBuilt", "baseEvaluated", "baseHistory", "baseByRange", "baseTrailingOnlyByRange", "baseGates", "baseWhy", "strategyCoverage",
] as const;
const fields = [
  "basePassed",
  "exitBasePassed",
  "basePassedRanges",
  "basePassedTargets",
  "baseWideLadderPairs",
  "basePassedCells",
  "basePassedTrailingOnlyCells",
  "family",
  "signalBasePassed",
  "paused",
  "signalGuardN",
  "signalCluster",
  "signalAccept",
  "signalSideAccept",
  "signalOwnBase",
  "signalSourceGate",
  "signalPerSymbol",
  "signalMaxOpen",
  "signalMaxPositions",
] as const;
type Inner = {
  drive(name: string, ...args: unknown[]): Promise<unknown>;
  slimTapes(...args: unknown[]): Promise<void>;
  gen: number;
  fastArgs: unknown;
  basePairTags: unknown;
  baseSignalExitRows: unknown;
  inc: unknown;
  incTail: unknown;
};
function fixture() {
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    {
      symbols: 1,
      historyDays: 1,
      tfs: [1],
      tfDays: { "1": 1 },
      focus: ["follow|ema-21-55@m1"],
      pinned: [],
      signals: { enabled: false },
      exitStrategy: { enabled: false },
      refineTop: 1,
      mainTop: 1,
      evalTop: 1,
      grid: {
        tp: [0.01],
        slOfTp: [1],
        trailOfTp: [0],
        holdH: [1],
        micro: false,
        minimal: false,
        short: false,
        general: false,
        long: false,
      },
      gates: { minTrades: 10000 },
      tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false },
    },
    { market: "synthetic", priceStream: null },
  );
  runtimes.push(rt);
  rt.stop();
  rt.candles.set(
    "PUBLISH-USDT",
    CandleSeries.fromCandles(syntheticCandles("PUBLISH", 1, 600, Date.UTC(2026, 9, 17, 12))),
  );
  Object.assign(rt, { workersBroken: true, workersBrokenAt: Date.now() });
  rt.wf = {
    ...rt.wf,
    basePassed: new Set(["follow|old-current@m1"]),
    exitBasePassed: new Set(["exit|old-current@m1"]),
    basePassedRanges: { "follow|old-current@m1": ["mc"] },
    basePassedTargets: { "follow|old-current@m1": { mc: [0.01] } },
    baseWideLadderPairs: new Set(["follow|old-current@m1"]),
    basePassedCells: { "follow|old-current@m1": { tags: new Set(["mc"]), keys: new Set(["mc|0.01|0.01|0|60"]) } },
    basePassedTrailingOnlyCells: { "follow|old-current@m1": { tags: new Set(["mc"]), keys: new Set(["mc|0|0.01|0.005|60|to"]) } },
    family: ["old current family"],
    signalBasePassed: new Set(["follow|sig-old@m1"]),
    signalGuardN: 77,
    protects: [{ tp: 0.01, sl: 0.01, trail: 0, hold: 60 }],
    dcaProtects: [],
  };
  rt.status.basePassed = 17;
  rt.status.baseBuilt = 3;
  rt.status.baseEvaluated = 21;
  rt.status.baseHistory = [{ at: 1, compute: 0, passed: 17, built: 3, byRange: { wide: 17 } }];
  rt.status.strategyCoverage = { completedAt: 1, through: 1, total: 1,
    byKind: { axis: { engine: 1, signals: 0, heldOnly: 0, carried: 0 } } };
  const inner = rt as unknown as Inner;
  inner.inc = { current: true };
  inner.incTail = { current: true };
  inner.fastArgs = { current: true };
  inner.basePairTags = { current: ["mc"] };
  inner.baseSignalExitRows = [{ current: true }];
  return {
    rt,
    inner,
    previous: Object.fromEntries(fields.map((k) => [k, rt.wf[k]])),
    oldInc: inner.inc,
    oldIncTail: inner.incTail,
    oldFast: inner.fastArgs,
    oldTags: inner.basePairTags,
    oldSignalExitRows: inner.baseSignalExitRows,
    oldStatus: Object.fromEntries(statusFields.map((k) => [k, rt.status[k]])),
  };
}
function assertCurrent(f: ReturnType<typeof fixture>) {
  assert.equal(f.inner.inc, f.oldInc, "unfinished compute withdrew the published incremental state");
  assert.equal(f.inner.incTail, f.oldIncTail, "unfinished compute replaced the incremental seed universe");
  for (const key of statusFields)
    assert.equal(
      f.rt.status[key],
      f.oldStatus[key],
      `${key}: unfinished attempt changed published counts/history`,
    );
  for (const key of fields)
    assert.equal(
      f.rt.wf[key],
      f.previous[key],
      `${key}: unfinished compute changed current execution qualification`,
    );
  assert.equal(
    f.inner.fastArgs,
    f.oldFast,
    "unfinished compute changed current realtime rebuild arguments",
  );
  assert.equal(
    f.inner.basePairTags,
    f.oldTags,
    "unfinished compute changed current range provenance",
  );
  assert.equal(f.inner.baseSignalExitRows, f.oldSignalExitRows, "unfinished compute changed Signal Exit Base rows");
}

test("a failed compute cannot withdraw active Base/config qualifications before publishing new tapes", async () => {
  const f = fixture(),
    stop = new Error("fixture interruption before new tapes");
  f.inner.slimTapes = async () => {
    assertCurrent(f);
    throw stop;
  };
  await assert.rejects(f.rt.compute(), (error) => error === stop);
  assertCurrent(f);
  assert.equal(f.rt.status.computes, 0);
});

test("current qualifications and realtime inputs survive simulation slices, then publish with completed new tapes", async () => {
  const f = fixture(),
    drive = f.inner.drive.bind(f.rt);
  let observed = false;
  f.inner.drive = async (name, ...args) => {
    if (name === "Simulation") {
      observed = true;
      assertCurrent(f);
      assert.equal(f.rt.status.computes, 0);
    }
    return drive(name, ...args);
  };
  await f.rt.compute();
  assert.equal(observed, true);
  assert.equal(f.rt.status.computes, 1);
  assert.notEqual(f.rt.status.strategyCoverage, f.oldStatus.strategyCoverage);
  assert.equal(f.rt.status.strategyCoverage?.total, f.rt.tapes.length);
  assert.deepEqual(
    [...(f.rt.wf.basePassed ?? [])],
    [],
    "new failed Base results take effect after successful publication",
  );
  assert.equal(f.rt.wf.signalGuardN, 0);
  assert.notEqual(f.inner.fastArgs, f.oldFast);
  assert.equal(f.rt.status.basePassed, 0);
  assert.equal(f.rt.status.baseHistory?.length, 2);
  assert.equal(
    (f.oldStatus.baseHistory as unknown[]).length,
    1,
    "previous hourly snapshots stay immutable",
  );
});

for (const mode of ["failure", "settings", "generation"] as const)
  test(`simulation ${mode} cannot publish a partial replacement`, async () => {
    const f = fixture(),
      drive = f.inner.drive.bind(f.rt),
      stop = new Error("fixture simulation failure");
    f.inner.drive = async (name, ...args) => {
      if (name === "Simulation") {
        assertCurrent(f);
        if (mode === "failure") throw stop;
        const result = await drive(name, ...args);
        if (mode === "settings") f.rt.updateSettings({ cost: 0.001 });
        else f.rt.stop();
        return result;
      }
      return drive(name, ...args);
    };
    if (mode === "failure") await assert.rejects(f.rt.compute(), (error) => error === stop);
    else await f.rt.compute();
    assertCurrent(f);
    assert.equal(f.rt.status.computes, 0);
    assert.equal(f.rt.sim, null);
  });

for (const mode of ["failure", "settings", "generation"] as const)
  test(`coverage ${mode} cannot publish an unfinished replacement`, async () => {
    const f = fixture(), drive = f.inner.drive.bind(f.rt), stop = new Error("coverage interrupted");
    f.inner.drive = async (name, ...args) => {
      if (name !== "Strategy coverage") return drive(name, ...args);
      assertCurrent(f);
      if (mode === "failure") throw stop;
      const result = await drive(name, ...args);
      if (mode === "settings") f.rt.updateSettings({ cost: .001 });
      else f.rt.stop();
      return result;
    };
    if (mode === "failure") await assert.rejects(f.rt.compute(), (error) => error === stop);
    else await f.rt.compute();
    assertCurrent(f);
    assert.equal(f.rt.status.computes, 0);
    assert.equal(f.rt.sim, null);
  });

for (const phase of ["Base ranges", "Base gate sensitivity", "Base gate reasons"] as const)
  for (const mode of ["failure", "settings", "generation"] as const)
    test(`${phase} ${mode} cannot publish unfinished qualifications`, async () => {
      const f = fixture(), drive = f.inner.drive.bind(f.rt), stop = new Error("Base diagnostics interrupted");
      let observed = false;
      f.inner.drive = async (name, ...args) => {
        if (name !== phase) return drive(name, ...args);
        observed = true;
        assertCurrent(f);
        if (mode === "failure") throw stop;
        const result = await drive(name, ...args);
        if (mode === "settings") f.rt.updateSettings({ cost: 0.001 });
        else f.rt.stop();
        return result;
      };
      if (mode === "failure") await assert.rejects(f.rt.compute(), (error) => error === stop);
      else await f.rt.compute();
      assert.equal(observed, true);
      assertCurrent(f);
      assert.equal(f.rt.status.computes, 0);
      assert.equal(f.rt.sim, null);
    });

for (const cancel of [false, true])
  test(`large Base diagnostics yield to the event loop${cancel ? " and honor cancellation" : ""}`, async () => {
    const f = fixture();
    const runs = Array.from({ length: 384 }, () => ({
      ind: "ema-21-55@m1",
      full: { n: 12, pf: 1.5, net: 2, mdd: 1 },
    })) as unknown as Parameters<typeof baseRangeCountsGen>[0];
    const work = baseRangeCountsGen(runs, { minPf: 1, minTrades: 3 }, [], () => {
      const until = performance.now() + 0.15;
      while (performance.now() < until) { /* emulate a costly gate */ }
      return true;
    });
    let intervened = false;
    setImmediate(() => {
      intervened = true;
      if (cancel) f.rt.stop();
    });
    const result = f.inner.drive("Base ranges", work, () => {}, f.inner.gen);
    if (cancel) await assert.rejects(result, /superseded by a newer loop generation/);
    else await result;
    assert.equal(intervened, true);
    assertCurrent(f);
  });

test("timing-only settings changes do not discard a completed economic calculation", async () => {
  const f = fixture(),
    drive = f.inner.drive.bind(f.rt);
  let changed = false;
  f.inner.drive = async (name, ...args) => {
    const result = await drive(name, ...args);
    if (name === "Simulation") {
      f.rt.updateSettings({ cycleMs: f.rt.settings.cycleMs + 1000 });
      changed = true;
      assertCurrent(f);
    }
    return result;
  };
  await f.rt.compute();
  assert.equal(changed, true);
  assert.equal(f.rt.status.computes, 1);
  assert.equal(f.rt.status.appliedSettingsAt, f.rt.status.settingsAt);
  assert.notEqual(f.inner.fastArgs, f.oldFast);
});

for (const change of ["timing", "live", "unchanged"] as const)
  test(`${change} settings cannot cancel a partially completed exact Base sweep`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { BaseConfigJobRunner } = await import("./base-config-job.server.ts");
    const f = fixture();
    let paused = false;
    const runner = new BaseConfigJobRunner({
      ready: () => true,
      foreground: () => paused,
      memoryOkay: () => true,
      available: () => true,
      run: async (m) => {
        paused = true;
        const [bot, ind] = m.pair.split("|"),
          n = m.protects.length;
        return {
          seen: m.protects.map((p) => String(p.tp)),
          rows: [
            {
              bot,
              ind,
              tag: "",
              kind: "normal",
              configured: n,
              evaluated: n,
              pfPassed: n,
              passed: n,
              notEvaluated: {},
              minPf: 1.1,
              floorPf: 1.1,
              cost: m.options.cost,
              cutT: m.options.cutT,
              fromT: m.options.fromT,
              closes: 10 * n,
              gp: 1,
              gl: 0.1,
              firstEntryT: 0,
              lastExitT: 100,
            },
          ],
        };
      },
      publish: (snapshot) => {
        f.rt.baseConfigs = snapshot;
        f.rt.status.baseConfigs = snapshot.summary;
      },
    });
    const inner = f.rt as unknown as { baseConfigRunner: InstanceType<typeof BaseConfigJobRunner> };
    inner.baseConfigRunner.cancel("fixture replacement");
    inner.baseConfigRunner = runner;
    try {
      runner.request({
        key: "exact partial fixture",
        settingsAt: f.rt.status.settingsAt,
        pairs: ["follow|micro-1-drawdown-turn-fast@m1"],
        protects: Array.from({ length: 65 }, (_, i) => ({
          tp: (i + 1) / 10000,
          sl: 0.01,
          trail: 0,
          hold: 60,
        })),
        kinds: ["normal"],
        common: {
          bars: [],
          cost: 0.0015,
          floors: { minSl: 0, minTrail: 0 },
          options: { cost: 0.0015, gates: { minPf: 1.1, minTrades: 3 }, fromT: 0, cutT: 100 },
        },
      });
      t.mock.timers.tick(25);
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(runner.snapshot?.summary.state, "partial");
      assert.equal(runner.snapshot?.summary.passed, 32);
      if (change === "timing") f.rt.updateSettings({ cycleMs: f.rt.settings.cycleMs + 1000 });
      else if (change === "live") f.rt.updateSettings({ live: { openPaused: "fixture pause" } });
      else f.rt.updateSettings({ disabledKinds: [...(f.rt.settings.disabledKinds ?? [])] });
      assert.equal(
        runner.snapshot?.summary.state,
        "partial",
        "unchanged calculation inputs must retain completed work and continue the sweep",
      );
      assert.equal(runner.snapshot?.summary.passed, 32);
      assert.equal(runner.snapshot?.summary.doneChunks, 1);
      for (let i = 0; i < 2; i++) {
        paused = false;
        t.mock.timers.tick(250);
        await Promise.resolve();
        await Promise.resolve();
      }
      assert.equal(
        runner.snapshot?.summary.state,
        "complete",
        "the original sweep continues to completion without restarting its first chunk",
      );
      assert.equal(runner.snapshot?.summary.passed, 65);
      assert.equal(runner.snapshot?.summary.doneChunks, 3);
      f.rt.updateSettings({ cost: 0.001 });
      assert.equal(
        runner.snapshot?.summary.state,
        "cancelled",
        "a real economic change must invalidate old counts",
      );
      assert.equal(runner.snapshot?.summary.reason, "settingsChanged");
    } finally {
      runner.cancel("test cleanup");
    }
  });

for (const supersede of ["generation", "economics", "none"] as const)
  test(`incremental tapes publish only under their current cohort after Paper idle: ${supersede}`, async () => {
    const f = fixture();
    const old = [{ id: "held" }], replacement = { id: "held", updated: true };
    f.rt.tapes = old as never;
    const state = { step: () => ({ tapes: new Map([["held", replacement]]), broken: new Set() }) };
    const inc = { state, others: new Set(), ids: new Set(["held"]), since: 0, heavyBar: 1 };
    const inner = f.rt as unknown as { inc: unknown; paperIdle(): Promise<void>; lightStep(gen: number): Promise<boolean>; gen: number };
    inner.inc = inc;
    inner.paperIdle = async () => {
      if (supersede === "generation") inner.gen++;
      if (supersede === "economics") f.rt.updateSettings({ cost: 0.001 });
    };
    await inner.lightStep(inner.gen);
    if (supersede === "none") {
      assert.equal(f.rt.tapes[0], replacement);
      assert.equal(inc.since, 1);
    } else {
      assert.equal(f.rt.tapes, old, "a superseded incremental attempt replaced the active tape cohort");
      assert.equal(inc.since, 0, "an unpublished incremental step advanced the committed counter");
    }
  });
