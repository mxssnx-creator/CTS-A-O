import { it } from "node:test";
import assert from "node:assert/strict";
import { orderKey } from "../../src/core/sizing.ts";
import { rangeStudyEvidence } from "./range-study-evidence.mjs";
const H = 3_600_000, id = "follow|tactic-trend-s@m15|tp0.8|sl1.2|tr0|h64|mn";
function fixture() {
  const fold = { id: "test", evaluationFromT: 0, tradeStartT: 72 * H, endT: 78 * H };
  const p = { gates: { minPf: 1.1, minTrades: 12 }, classification: "synthetic", symbols: ["TEST-USDT", "OTHER-USDT"] };
  const universe = { configurations: [{ id, protect: { tag: "mn" } }], settingsVersion: "test", requestedCells: 1 };
  const trades = [
    { cfg: id, sym: "TEST-USDT", side: 1, entryT: 72 * H, exitT: 73 * H, r: .06, mult: 3, kind: "normal" },
    { cfg: id, sym: "TEST-USDT", side: 1, entryT: 72 * H, exitT: 74 * H, r: -.01, mult: 1, kind: "normal" },
    { cfg: id, sym: "ZERO-USDT", side: -1, entryT: 73 * H, exitT: 74 * H, r: .01, mult: 1, kind: "normal" },
  ];
  const raw = { window: { startT: fold.tradeStartT, endT: fold.endT }, settings: { wf: { causalBase: true } }, trades, openEnd: [],
    tapeTrades: [], validation: [{ t: fold.tradeStartT, real: [id], checks: [[id, 1, 30, 2, .2, .1]] }],
    engine: { baseByRange: [], baseWhy: [], coverage: { sets: [] } }, tapeAgg: { evalFails: {} } };
  const book = { checks: [], sizedOrders: trades.map((x, i) => ({ closeIndex: i, key: orderKey(x), exitT: x.exitT, unitNotional: i === 2 ? 0 : i ? 5 : 10, allocatedNotional: i === 2 ? 0 : i ? 5 : 10, volume: 1, sizedPnl: x.r * (i === 2 ? 0 : i ? 5 : 10) })) };
  return { raw, book, p, fold, profile: { id: "P0" }, universe };
}
const run = (x) => rangeStudyEvidence(x.raw, x.book, x.p, x.fold, x.profile, x.universe);
it("separates accepted virtual/funded unit PF from cash PF and counts partial closes as one onset", () => {
  const x = fixture(), out = run(x), r = out.ranges.find((v) => v.tag === "mn");
  assert.equal(r.virtualQualified.n, 3); assert.ok(Math.abs(r.virtualQualified.pf - 3) < 1e-12);
  assert.equal(r.funded.n, 2); assert.ok(Math.abs(r.funded.pf - 2) < 1e-12);
  assert.ok(Math.abs(r.funded.cashPf - 12) < 1e-12);
  assert.equal(r.funded.uniqueSettledOnsets, 1);
  assert.deepEqual(out.ownership, { positiveCloseSlices: 2, zeroCloseSlices: 1, unknownAllocationSlices: 0 });
  assert.equal(out.hourly.length, 144);
  const empty = out.hourly.find((v) => v.key === "hour-funded|5|sh|trailing|-1");
  assert.equal(empty.n, 0); assert.equal(empty.pf, null);
});
it("preserves missing/duplicate ownership as unknown rather than dropping a loss", () => {
  const x = fixture(); x.book.sizedOrders = x.book.sizedOrders.filter((v) => v.closeIndex !== 1);
  const out = run(x), r = out.ranges.find((v) => v.tag === "mn");
  assert.equal(out.ownership.unknownAllocationSlices, 1);
  assert.equal(r.funded.n, 2); assert.equal(r.funded.unknownReturns, 1); assert.equal(r.funded.pf, null);
  const y = fixture(); y.book.sizedOrders.push({ ...y.book.sizedOrders[1] });
  assert.equal(run(y).ownership.unknownAllocationSlices, 1);
});
it("requires30 unique own-side historical onsets plus the actual initial gate pass", () => {
  const x = fixture(), history = [];
  for (let i = 0; i < 29; i++) history.push(["TEST-USDT", 1, i * H, i * H + 1, .01]);
  history.push([...history[0]]); // thirty close rows, only29 independent onsets
  history.push(["TEST-USDT", -1, H, H + 1, -.01]);
  history.push(["OLD-USDT", 1, -H, 1, .5]); // indicator warmup must not qualify
  history.push(["EDGE-USDT", 1, H, x.fold.tradeStartT, .5]); // initial configEval closes strictly before its cutoff
  x.raw.tapeTrades = [{ id, trades: history }];
  assert.equal(run(x).configSymbolProof.find((v) => v.side === 1 && v.sym === "TEST-USDT").researchProof, false);
  history.push(["TEST-USDT", 1, 30 * H, 30 * H + 1, .01]);
  const out = run(x), long = out.configSymbolProof.find((v) => v.side === 1 && v.sym === "TEST-USDT"), short = out.configSymbolProof.find((v) => v.side === -1 && v.sym === "TEST-USDT");
  assert.equal(long.historical.uniqueSettledOnsets, 30); assert.equal(long.researchProof, true);
  assert.equal(long.historical.noLoss, true); assert.equal(long.historical.pf, null);
  assert.equal(short.researchProof, false);
  x.raw.validation[0].checks[0][1] = 0;
  assert.equal(run(x).configSymbolProof.find((v) => v.side === 1 && v.sym === "TEST-USDT").researchProof, false);
});
it("does not promote two symbols with15 onsets each from their pooled30", () => {
  const x = fixture(), trades = [];
  for (const sym of x.p.symbols) for (let i = 0; i < 15; i++) trades.push([sym, 1, i * H, i * H + 1, .01]);
  x.raw.tapeTrades = [{ id, trades }];
  const out = run(x);
  assert.equal(out.configSides.find((v) => v.side === 1).preSidePooledDiagnostic.uniqueSettledOnsets, 30);
  assert.ok(out.configSymbolProof.every((v) => !v.researchProof));
  assert.equal(out.historicalProofIds.length, 0);
});
it("never substitutes a later validation verdict for the initial historical gate", () => {
  const x = fixture();
  x.raw.tapeTrades = [{ id, trades: Array.from({ length: 30 }, (_, i) => ["TEST-USDT", 1, i * H, i * H + 1, .01]) }];
  x.raw.validation[0].t += H;
  const out = run(x);
  assert.equal(out.initialValidationRecorded, false);
  assert.equal(out.historicalProofIds.length, 0);
  assert.ok(out.configSymbolProof.every((v) => !v.researchProof));
});
it("uses total allocated USD precision, preserving a meaningful fill with a tiny unit value", () => {
  const x = fixture(), a = x.book.sizedOrders[0];
  a.unitNotional = 1e-10; a.volume = 1000; a.allocatedNotional = 1e-7; a.sizedPnl = x.raw.trades[0].r * a.unitNotional;
  assert.equal(run(x).ownership.positiveCloseSlices, 2);
  a.volume = 1; a.allocatedNotional = 1e-10;
  assert.equal(run(x).ownership.positiveCloseSlices, 1);
  assert.equal(run(x).ownership.zeroCloseSlices, 2);
  a.allocatedNotional = NaN;
  assert.equal(run(x).ownership.unknownAllocationSlices, 1);
});
it("keeps endpoint marks separate and refuses settled-window contamination", () => {
  const x = fixture(); x.raw.openEnd.push({ ...x.raw.trades[0], r: -.9 });
  const out = run(x), r = out.ranges.find((v) => v.tag === "mn");
  assert.equal(r.funded.n, 2); assert.equal(r.funded.uniqueSettledOnsets, 0);
  assert.equal(out.endpoints.planned.length, 1);
  x.raw.trades[0].markedOpen = true;
  assert.throws(() => run(x), /Endpoint\/prewindow/);
});
