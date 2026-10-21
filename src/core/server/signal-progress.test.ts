// Bounded real-runtime regressions for independent Signal history, coordinator rebuilds and fitting progress.
import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime, laneSeriesFrom, strategyDataHours } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { DEFAULT_SIGNALS, signalSettings } from "../signal-config.ts";
import { isSignalInd } from "../indications/registry.ts";
import { isSignalCoordinationInd } from "../signal-coordination.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { coordSettings, type ConfigTape } from "../sim/walkforward.ts";
import { trackRuntimes } from "../test-support.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const tracked = trackRuntimes();
// Runtime and pool timers are unref'd; keep the isolated test process alive until its assertions complete.
const keepAlive = setInterval(() => {}, 1000);
after(() => clearInterval(keepAlive));
afterEach(() => tracked.disposeAll());
const H = 3_600_000;
const end = Date.UTC(2026, 8, 30, 12);
const price = (i: number) => 100 + 12 * Math.sin(i * 2 * Math.PI / 360);
const candles = Array.from({ length: 120 * 60 }, (_, i) => {
  const o = price(i - 1), c = price(i);
  return { t: end - (120 * 60 - 1 - i) * 60_000, o, c, h: Math.max(o, c) * 1.0001,
    l: Math.min(o, c) * 0.9999, v: 1000 };
});
type Inner = {
  workersBroken: boolean;
  workersBrokenAt: number;
  setStage(stage: string, done: number, total: number, label?: string, restart?: boolean): void;
  fastArgs: { coord: { floors: { pairProtects?: Record<string, unknown[]> } } };
  rebuildOnUniverse(u: ReturnType<typeof makeUniverse>, ids: ReadonlySet<string>, gen: number): Promise<ConfigTape[] | null>;
};
function fixture(local: boolean, hist: boolean, coord = false) {
  const rt = tracked.track(new CoreRuntime(new CoreDb(":memory:"), {
    symbols: 1, symbolRank: "volume", historyDays: 1, tfs: [1, 15], tfDays: { "1": 1, "15": 1 },
    focus: ["follow|ema-9-21@m15"], mainTop: 2, refineTop: 1, evalTop: 2,
    grid: { tp: [0.02], slOfTp: [1], trailOfTp: [0], holdH: [1],
      micro: false, minimal: false, minimalPlus: false,
      short: coord ? { tp: [4], slOfTp: [1], trailOfTp: [0] } : false,
      general: false, long: false },
    exitStrategy: { enabled: false },
    tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 0 },
    gates: { minPf: 1.5, minTrades: 1, maxDdr: 0 },
    signals: signalSettings({ enabled: true, sourcesMode: "allow", sources: { "ema-cross": true, "ema-slope": true },
      lanes: [15], ranges: { short: true, medium: false }, holdH: 1,
      normal: { tp: [0.02], slOfTp: [1] }, trailing: { tp: [0.03], trailOfTp: [0.5], slOfTp: 1 },
      trailingOnly: { ...DEFAULT_SIGNALS.trailingOnly, enabled: false }, filter: { trendH: 0, volFloor: 0 },
      hist: { enabled: hist, minN: 1, quantiles: [0.5], slOfTp: [1], trailOfTp: [0.5], lookbackH: 0 },
      coordination: { ...DEFAULT_SIGNALS.coordination, enabled: coord, minSources: 2, ranges: { short: true, normal: false, long: false } },
      accept: { ...DEFAULT_SIGNALS.accept, enabled: false }, sideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: false },
      guard: { ...DEFAULT_SIGNALS.guard, enabled: false }, cluster: { ...DEFAULT_SIGNALS.cluster, enabled: false },
      minTrades: 1, minBlockShare: 0, validate: false,
    }),
  } as never, {
    market: "bingx", replay: true, priceStream: null,
    feed: { tickers: async () => [{ sym: "TEST-USDT", last: price(candles.length - 1), quoteVol: 1e9, changePct: 0 }],
      history: async (_sym, _tf, n) => candles.slice(-n), klines: async () => [] },
  }));
  rt.updateSettings({}, { preH: 6, longH: 6, symH: 6, simH: 6, signalLongH: 72,
    lastN: 0, validLastN: 0, signalValidLastN: 0, symGate: "off", coord: coordSettings({ enabled: false }) });
  const inner = rt as unknown as Inner;
  inner.workersBroken = local;
  inner.workersBrokenAt = Date.now();
  return { rt, inner };
}
const cols = ["exitT", "entryT", "r", "entry", "exit", "symI", "side", "reason", "bars", "vol", "level", "gp", "gl", "rs", "r2"] as const;
function equalTapes(actual: readonly ConfigTape[], expected: readonly ConfigTape[]) {
  assert.deepEqual(actual.map((t) => t.id).sort(), expected.map((t) => t.id).sort(), "exact config identities");
  const byId = new Map(expected.map((t) => [t.id, t]));
  for (const a of actual) {
    const b = byId.get(a.id)!;
    assert.equal(a.n, b.n, a.id);
    for (const col of cols) assert.deepEqual(Array.from(a[col]), Array.from(b[col]), `${a.id}: ${col}`);
    assert.deepEqual(a.open, b.open, `${a.id}: open`);
    assert.deepEqual(a.pending, b.pending, `${a.id}: pending`);
  }
}
async function rebuild(rt: CoreRuntime, inner: Inner, tapes: ConfigTape[]) {
  const ordinary = makeUniverse(laneSeriesFrom(rt.candles, rt.settings, 0, strategyDataHours(rt.settings, rt.wf)));
  const rebuilt = await inner.rebuildOnUniverse(ordinary, new Set(tapes.map((t) => t.id)), rt.generation);
  assert.ok(rebuilt);
  equalTapes(rebuilt, tapes);
}
test("full worker/fallback and incremental rebuilds preserve independent Signal history", { timeout: 180_000 }, async () => {
  const worker = fixture(false, false), local = fixture(true, false);
  await worker.rt.cycle(); await local.rt.cycle();
  assert.equal(worker.inner.workersBroken, false, "worker result must not be a silent local fallback");
  assert.match(worker.rt.status.phases["Signal tapes"]?.slowest ?? "", /cores/, "the worker path actually ran");
  const expected = worker.rt.tapes.filter((t) => isSignalInd(t.ind));
  const actual = local.rt.tapes.filter((t) => isSignalInd(t.ind));
  assert.ok(expected.length > 0 && expected.some((t) => t.n > 0));
  assert.ok(expected.some((t) => t.entryT[0] < end - 48 * H), "Signal tapes contain history older than ordinary strategy data");
  equalTapes(actual, expected);
  assert.deepEqual(local.rt.sim?.signalSteps, worker.rt.sim?.signalSteps, "same exact activation keys");
  assert.deepEqual(local.rt.sim?.trades, worker.rt.sim?.trades, "same modeled execution");
  await rebuild(worker.rt, worker.inner, expected);
  await rebuild(local.rt, local.inner, actual);
});
test("local historical fitting reports intermediate progress and completes the job", { timeout: 180_000 }, async () => {
  const { rt, inner } = fixture(true, true);
  const values: number[] = [];
  const original = inner.setStage.bind(rt);
  inner.setStage = (stage, done, total, label, restart) => {
    original(stage, done, total, label, restart);
    if (label?.includes("signal historic configs")) values.push(rt.status.progress);
  };
  await rt.cycle();
  assert.ok(rt.status.signals?.historic && rt.status.signals.historic.evaluated > 0);
  assert.ok(values.some((p) => p > 0 && p < 1), `intermediate fitting progress: ${values}`);
  assert.equal(values.at(-1), 1);
  assert.ok(values.every((p, i) => !i || p >= values[i - 1]));
  assert.equal(rt.status.stage, "Realtime");
  assert.equal(rt.status.overall, 1);
});
test("historical coordinator ranges and exact configs survive incremental rebuilds", { timeout: 180_000 }, async () => {
  for (const local of [false, true]) {
    const { rt, inner } = fixture(local, true, true);
    await rt.cycle();
    if (!local) assert.equal(inner.workersBroken, false);
    const historical = Object.values(inner.fastArgs.coord.floors.pairProtects ?? {}).flat();
    assert.ok(historical.length > 0, "the runtime supplied enabled range floors to historic coordination fitting");
    assert.ok(historical.every((p) => (p as { tag: string }).tag === "sh"), "disabled General/Long ranges receive no historical variants");
    const tapes = rt.tapes.filter((t) => isSignalCoordinationInd(t.ind));
    assert.ok(tapes.length > 0);
    await rebuild(rt, inner, tapes);
  }
});
