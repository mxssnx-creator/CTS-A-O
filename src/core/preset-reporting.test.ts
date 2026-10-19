import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.CTS_CORE_STATE = "off";
const { CoreDb } = await import("./server/db.server.ts");
const { CoreRuntime } = await import("./server/runtime.server.ts");
const { walkForward } = await import("./sim/walkforward.ts");
const { unitStatsOf, statsOf } = await import("./metrics/stats.ts");
const { presetSeries } = await import("./statistics.ts");
const { upsertPreset } = await import("./presets.ts");
const { connInput, corePresetsData, corePresetSeriesData, corePresetSeriesInput, coreSimData } = await import("./api-data.ts");
import type { Trade } from "./domain/types.ts";

type Any = any;
const H = 3_600_000, END = Math.floor(Date.now() / H) * H;
const G = globalThis as unknown as { __ctsCoreRuntime?: InstanceType<typeof CoreRuntime> };
const runtimes: InstanceType<typeof CoreRuntime>[] = [];
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); delete G.__ctsCoreRuntime; });
function fixture() {
  const runtime = new CoreRuntime(new CoreDb(), { live: { enabled: false } }, { market: "synthetic", priceStream: null });
  runtime.stop(); runtimes.push(runtime); G.__ctsCoreRuntime = runtime;
  const universe = { bars: [], caches: [], startT: END - 4 * H, endT: END, splitT: END - 3 * H, nowT: END, baseTf: 60 } as never;
  runtime.sim = walkForward(universe, [], { ...runtime.wf, simH: 3 });
  runtime.sim.trades = trades();
  runtime.sim.openAtEnd = [];
  runtime.sim.sizedStats = undefined; // a retained pre-upgrade summary has no separately stored sized diagnostic
  return runtime;
}
function trades(): Trade[] {
  return [0.0136, -0.068].map((r, i) => ({ cfg: "follow|rsi-mom-14-25@m15|tp1|sl1|tr0|h32", sym: "AAA-USDT", side: 1,
    entryT: END - 2 * H + i * 60_000, exitT: END - H + i * 60_000, entry: 100, exit: 100,
    r, mult: i ? 6.8 : 1, reason: i ? "sl" : "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" }));
}

test("saved preset archives cannot expose weighted PF and new saves retain canonical unit/no-loss evidence", async () => {
  const runtime = fixture(), sim = runtime.sim!;
  sim.stats = statsOf(sim.trades, END); // retained weighted aggregate must not become a new saved primary result
  const measured = runtime.savePreset("QA verified measured");
  assert.ok(Math.abs(measured.metrics.pf! - 1.36) < 1e-10);
  assert.equal(measured.metrics.pfBasis, "unit-net-returns");
  assert.equal(measured.metrics.noLoss, false);
  assert.ok(Math.abs(measured.metrics.gp! - 1.36) < 1e-10);
  assert.equal(measured.metrics.gl, 1);
  assert.equal(measured.metrics.sample, "with-endpoint-marks");
  assert.equal(measured.metrics.endpointMarks, 0);
  sim.trades = [trades()[0]];
  const noLoss = runtime.savePreset("QA verified no losses");
  assert.equal(noLoss.metrics.pf, 4);
  assert.equal(noLoss.metrics.noLoss, true);
  assert.equal(noLoss.metrics.pfConvention, "no-loss-sentinel");
  const legacy = { ...measured, id: "legacy-weighted", kind: "auto" as const, metrics: { pf: 0.2, n: 2, perDay: 1, wr: 0.5, net: -5.44, greenHours: 0.5, period: "QA", source: "legacy weighted aggregate" } };
  runtime.db.kvSet("presets", [{ ...measured, id: "verified" }, { ...noLoss, id: "no-loss" }, legacy]);
  const before = JSON.stringify(runtime.db.kvGet("presets"));
  const response = await corePresetsData(connInput()) as Any;
  const old = response.saved.find((p: Any) => p.id === legacy.id);
  assert.equal(old.metrics.pf, null);
  assert.equal(old.metrics.noLoss, null);
  assert.equal(old.metrics.unknownReturns, null);
  assert.equal(old.metrics.n, 2);
  assert.equal(old.metrics.archiveDiagnostics.pf, 0.2);
  assert.equal(response.saved.find((p: Any) => p.id === "verified").metrics.noLoss, false);
  assert.equal(response.saved.find((p: Any) => p.id === "no-loss").metrics.noLoss, true);
  assert.equal(JSON.stringify(runtime.db.kvGet("presets")), before);
  const exaggeratedLegacy = { ...legacy, metrics: { ...legacy.metrics, pf: 100 } };
  const verifiedAuto = { ...measured, id: legacy.id, kind: "auto" as const };
  assert.equal(upsertPreset([exaggeratedLegacy], verifiedAuto)[0], verifiedAuto, "legacy weighted PF100 cannot outrank verified unit PF1.36");
  assert.equal(upsertPreset([verifiedAuto], exaggeratedLegacy)[0], verifiedAuto, "unverified evidence cannot replace verified evidence");
});

test("Presets current normalizes retained orders and discloses endpoint marks separately from settled diagrams", async () => {
  const runtime = fixture(), sim = runtime.sim!;
  const marked: Trade[] = [{ ...sim.trades[0], entryT: END - H, exitT: END, r: -0.01, mult: 1, reason: "time" }];
  sim.openAtEnd = marked;
  sim.stats = statsOf([...sim.trades, ...marked], END);
  const retained = JSON.stringify(sim.stats);
  const response = await corePresetsData(connInput()) as Any;
  assert.ok(Math.abs(response.current.pf - 0.68) < 1e-10, "the endpoint loss remains in qualification evidence");
  assert.equal(response.current.n, 3);
  assert.equal(response.current.endpointMarks, 1);
  assert.equal(response.current.sample, "with-endpoint-marks");
  assert.equal(response.current.noLoss, false);
  assert.equal(response.current.pfBasis, "unit-net-returns");
  assert.ok(Math.abs(response.current.settledStats.pf - 1.36) < 1e-10);
  assert.equal(response.current.settledStats.sample, "settled-closes");
  assert.equal(response.current.settledStats.n, 2);
  assert.ok(Math.abs(response.current.sizedStats.pf - 0.0136 / 0.078) < 1e-10);
  assert.equal(JSON.stringify(sim.stats), retained, "a read cannot rewrite historical cached evidence");
});

test("old backtest and diagram archives cannot claim primary PF or passing unit evidence", async () => {
  const runtime = fixture(), xs = runtime.sim!.trades;
  const primary = unitStatsOf(xs, END);
  const legacy = { n: 2, pf: 5, net: 4, pass: true, stable: true, days: 3, at: END, from: END - 3 * H, to: END,
    successHours: 1, greenHours: 3, hours: 3, ddtH: 0, byKind: { normal: { n: 2, pf: 5 } } };
  const verified = { ...legacy, ...primary, gp: primary.gp, gl: primary.gl, noLoss: false,
    pfConvention: "gross-return-ratio", sample: "with-endpoint-marks", endpointMarks: 0,
    settledStats: { ...primary, noLoss: false, sample: "settled-closes" } };
  runtime.db.kvSet("presetBacktests", { legacy: [legacy], verified: [verified] });
  const options = { startT: END - 3 * H, endT: END, balance: 1000, unit: () => 100, price: () => null, cost: 0.002, leverage: 10, days: 0.125 };
  const fresh = presetSeries(xs, options);
  const old = structuredClone(fresh) as Any;
  old.info.pf = old.info.cash.pf;
  for (const key of ["pfBasis", "unknownReturns", "gp", "gl", "noLoss", "pfConvention", "sample", "cash", "cashPositionLast"]) delete old.info[key];
  runtime.db.kvSet("presetSeries", { legacy: old, verified: fresh });
  const before = JSON.stringify({ backtests: runtime.db.kvGet("presetBacktests"), series: runtime.db.kvGet("presetSeries") });
  const response = await corePresetsData(connInput()) as Any;
  const unavailable = response.backtests.legacy[0];
  for (const key of ["pf", "gp", "gl", "net", "noLoss", "pass", "stable", "settledStats"]) assert.equal(unavailable[key], null, key);
  assert.equal(unavailable.n, 2);
  assert.equal(unavailable.unknownReturns, null, "the archive cannot establish an unknown-row count");
  assert.equal(unavailable.pfBasis, "unavailable");
  assert.equal(unavailable.archiveDiagnostics.pf, 5);
  assert.equal(unavailable.archiveDiagnostics.pass, true);
  assert.ok(Math.abs(response.backtests.verified[0].pf - 1.36) < 1e-10);
  const oldView = await corePresetSeriesData(corePresetSeriesInput({ id: "legacy" })) as Any;
  assert.equal(oldView.series.info.pf, null);
  assert.equal(oldView.series.info.pfBasis, "unavailable");
  assert.equal(oldView.series.info.unknownReturns, null);
  assert.ok(Math.abs(oldView.series.info.archiveDiagnostics.pf - 0.2) < 1e-10);
  assert.deepEqual(oldView.series.balance, old.balance, "cash curves remain available");
  assert.equal(oldView.series.info.netUsd, old.info.netUsd);
  const freshView = await corePresetSeriesData(corePresetSeriesInput({ id: "verified" })) as Any;
  assert.ok(Math.abs(freshView.series.info.pf - 1.36) < 1e-10);
  assert.ok(Math.abs(freshView.series.info.cash.pf - 0.2) < 1e-10);
  assert.equal(JSON.stringify({ backtests: runtime.db.kvGet("presetBacktests"), series: runtime.db.kvGet("presetSeries") }), before);
});

test("zero-close current, saved-preset and simulation reports expose PF as unavailable", async () => {
  const runtime = fixture();
  runtime.sim!.trades = [];
  runtime.sim!.openAtEnd = [];
  runtime.sim!.stats = statsOf([], END);

  const current = await corePresetsData(connInput()) as Any;
  assert.equal(current.current.n, 0);
  assert.equal(current.current.pf, null);
  assert.equal(current.current.pfBasis, "unavailable");
  assert.equal(current.current.pfConvention, "unavailable");
  assert.equal(current.current.stable, null);
  assert.equal(current.current.settledStats.pf, null);

  const saved = runtime.savePreset("QA empty sample");
  assert.equal(saved.metrics.pf, null);
  assert.equal(saved.metrics.pfBasis, "unavailable");
  assert.equal(saved.metrics.pfConvention, "unavailable");
  const report = await coreSimData(connInput()) as Any;
  assert.equal(report.sim.stats.n, 0);
  assert.equal(report.sim.stats.pf, null);
  assert.equal(report.sim.stats.pfBasis, "unavailable");
});

test("Presets unknown unit evidence keeps its losing outcome and cannot become a scored zero or passing record", async () => {
  const runtime = fixture(), sim = runtime.sim!;
  (sim.trades[1] as Trade & { unitR: null }).unitR = null;
  sim.stats = statsOf(sim.trades, END);
  const response = await corePresetsData(connInput()) as Any;
  assert.equal(response.current.n, 2);
  assert.equal(response.current.pfBasis, "unavailable");
  assert.equal(response.current.unknownReturns, 1);
  for (const key of ["pf", "gp", "gl", "net", "noLoss", "stable"]) assert.equal(response.current[key], null, key);
  assert.equal(response.current.settledStats.n, 2);
  assert.equal(response.current.settledStats.pf, null);
  assert.ok(Math.abs(response.current.sizedStats.pf - 0.2) < 1e-10);
});
