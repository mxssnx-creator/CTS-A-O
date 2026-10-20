import assert from "node:assert/strict";
import { after, test } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";
import { closePool } from "./pool.server.ts";

const runtimes: CoreRuntime[] = [];
after(async () => {
  for (const rt of runtimes) {
    rt.dispose();
    await rt.backtestsSettled();
    rt.db.db.close();
  }
  await closePool();
});
const statusFields = ["basePassed", "baseBuilt", "baseEvaluated", "baseHistory"] as const;
const fields = [
  "basePassed",
  "exitBasePassed",
  "basePassedRanges",
  "basePassedTargets",
  "baseWideLadderPairs",
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
  const inner = rt as unknown as Inner;
  inner.fastArgs = { current: true };
  inner.basePairTags = { current: ["mc"] };
  return {
    rt,
    inner,
    previous: Object.fromEntries(fields.map((k) => [k, rt.wf[k]])),
    oldFast: inner.fastArgs,
    oldTags: inner.basePairTags,
    oldStatus: Object.fromEntries(statusFields.map((k) => [k, rt.status[k]])),
  };
}
function assertCurrent(f: ReturnType<typeof fixture>) {
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
