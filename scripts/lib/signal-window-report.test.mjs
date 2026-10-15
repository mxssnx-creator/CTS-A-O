import { it } from "node:test";
import assert from "node:assert/strict";
import { signalRowsCsv, signalWindowMarkdown, signalWindowReport } from "./signal-window-report.mjs";
import { returnBucket, finishReturnEvidence } from "./return-evidence.mjs";
const H = 3_600_000;
const n0 = () => finishReturnEvidence(returnBucket());
function fixture(trades = []) {
  const protocol = { tradeStartT: H, endT: 7 * H, settings: { signals: { lanes: [1, 5, 15, 30] } } };
  const raw = { window: { startT: H, endT: 7 * H }, settings: { wf: { causalBase: true } }, trades, openEnd: [], engine: { skips: {}, skipsByRange: {} },
    signalProgress: { configs: [], steps: [], definitions: {} } };
  const book = { total: { balanceEnd: 1000, equityEnd: 999 }, sizedOrders: trades.map((x, closeIndex) => ({ key: `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`, closeIndex, exitT: x.exitT, unitNotional: 1, sizedPnl: x.r })), checksOk: false, checks: [{ name: "activity", ok: false }], hours: Array.from({ length: 6 }, (_, i) => ({ t: H + i * H, cashPf: 0.2, balance: 1000, equity: 999, net: -1, maxDdPctSoFar: 0.01 })) };
  return { protocol, raw, book };
}
const cfg = (kind = "normal") => `follow|sig-ema-cross-s@m1|tp${kind === "trailing-only" ? 0 : 1}|sl2|tr${kind === "normal" ? 0 : 1}|h60${kind === "trailing-only" ? "|to" : ""}`;
it("keeps all zero type/range/lane/direction cells and all six hours without a measured PF", () => {
  const { raw, book, protocol } = fixture();
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.cells.length, 48);
  assert.equal(r.hourlyCells.length, 288);
  assert.equal(r.hours.length, 6);
  assert.equal(r.total.pf, null);
  assert.ok(r.cells.every((x) => x.n === 0 && x.pf === null));
  assert.equal(r.coverage.allTypeRangeLaneSidesTraded, false);
  assert.equal(r.failedSessionChecks[0].name, "activity");
  assert.match(signalWindowMarkdown(r), /Every type.*\*\*no\*\*/);
});
it("uses unit returns, settled hour boundaries and both directions while keeping cash book diagnostics separate", () => {
  const xs = [
    { cfg: cfg(), kind: "normal", side: 1, sym: "TEST-USDT", entryT: H + 1, exitT: 2 * H, r: 0.02, mult: 2, reason: "tp" },
    { cfg: cfg(), kind: "normal", side: -1, sym: "TEST-USDT", entryT: 2 * H, exitT: 2 * H + 1, r: -0.01, mult: 1, reason: "sl" },
    { cfg: cfg("trailing"), kind: "trailing", side: 1, sym: "TEST-USDT", entryT: 3 * H, exitT: 3 * H + 1, r: 0.03, reason: "trail" },
  ];
  const { raw, book, protocol } = fixture(xs);
  raw.openEnd.push({ cfg: cfg(), sym: "TEST-USDT", side: 1, entryT: H + 1, mtmR: -0.5, mult: 5 });
  book.sizedOpenOrders = [{ key: `${cfg()}|TEST-USDT|1|${H + 1}`, openIndex: 0, unitNotional: 2, sizedPnl: -1 }];
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.total.pf, 4);
  assert.equal(r.types[0].pf, 1);
  assert.equal(r.types[1].noLoss, true);
  assert.equal(r.hours[0].n, 1);
  assert.equal(r.hours[1].n, 1);
  assert.equal(r.hours[0].cashNoLoss, true);
  assert.equal(r.hours[0].cashGp, 0.02);
  assert.equal(r.endpointMarks.n, 1);
  assert.equal(r.endpointMarks.gl, 0.1);
  assert.equal(r.coverage.longCloses, 2);
  assert.equal(r.coverage.shortCloses, 1);
  assert.equal(r.trades[0].unitR, 0.01);
  assert.equal(r.funded.flows.find((x) => x.t === 6 * H && x.kind === "normal").openOrdersEnd, 1);
});
it("makes positive-notional ownership primary, retains zero-allocation diagnostics and never drops unknown allocation rows", () => {
  const xs = [0.02, -0.01, -0.05, 0.2].map((r, i) => ({ cfg: cfg(), kind: "normal", side: i % 2 ? -1 : 1, sym: "TEST-USDT", entryT: H + i * 2 + 1, exitT: H + i * 2 + 2, r, mult: i ? 1 : 2, reason: "close" }));
  const { raw, book, protocol } = fixture(xs);
  book.sizedOrders.forEach((x, i) => { x.unitNotional = [10, 5, 0, 0][i]; x.sizedPnl = xs[i].r * x.unitNotional; });
  let r = signalWindowReport(raw, book, protocol);
  assert.equal(r.primarySample, "funded-positive-notional");
  assert.equal(r.total.n, 2); assert.equal(r.total.ownedCloses, 2); assert.equal(r.total.pf, 1);
  assert.equal(r.total.cashPfDiagnostic, 4); assert.equal(r.planned.total.n, 4); assert.equal(r.planned.total.zeroAllocations, 2);
  assert.equal(r.planned.trades[2].allocationStatus, "zero");
  book.sizedOrders[2].unitNotional = null;
  r = signalWindowReport(raw, book, protocol);
  assert.equal(r.total.n, 3); assert.equal(r.total.ownedCloses, 2); assert.equal(r.total.unknownAllocations, 1);
  assert.equal(r.total.pf, null); assert.equal(r.total.usd, null);
  assert.equal(r.planned.total.n, 4); assert.equal(r.planned.total.unknownAllocations, 1);
});
it("matches repeated entry allocation units to each partial close's own return, not the last slice P&L", () => {
  const xs = [0.01, -0.02].map((r, i) => ({ cfg: cfg(), kind: "normal", side: 1, sym: "TEST-USDT", entryT: H + 1, exitT: H + i + 2, r, reason: "close" }));
  const { raw, book, protocol } = fixture(xs);
  book.sizedOrders = xs.map((x) => ({ key: `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`, unitNotional: 10, sizedPnl: x.r * 10 }));
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.total.n, 2); assert.equal(r.total.pf, 0.5);
  assert.equal(r.total.cashGp, 0.1); assert.equal(r.total.cashGl, 0.2);
  assert.equal(r.trades[0].sizedPnl, 0.1); assert.equal(r.trades[1].sizedPnl, -0.2);
});
it("keeps mixed engine book equity separate and reconciles Signal cash from actual shared allocations", () => {
  const xs = [
    { cfg: cfg(), kind: "normal", side: 1, sym: "TEST-USDT", entryT: H + 1, exitT: H + 2, r: 0.01, reason: "tp" },
    { cfg: "follow|ema-9-21@m1|tp1|sl2|tr0|h60", kind: "normal", side: -1, sym: "TEST-USDT", entryT: H + 3, exitT: H + 4, r: -0.1, reason: "sl" },
  ];
  const { raw, book, protocol } = fixture(xs);
  assert.throws(() => signalWindowReport(raw, book, protocol), /Signals-only/);
  protocol.scope = "signals-with-default-engine-coordination";
  book.sizedOrders = xs.map((x) => ({ key: `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`, unitNotional: 20, sizedPnl: 20 * x.r }));
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.total.n, 1); assert.equal(r.total.usd, 0.2);
  assert.equal(r.engineExecutions.n, 1); assert.equal(r.engineExecutions.usd, -2);
  assert.equal(r.hours[0].usd, 0.2); assert.equal(r.hours[0].bookNet, -1);
  assert.match(r.bookScope, /whole-system/);
  assert.equal(r.trades[0].sizedPnl, 0.2);
});
it("retains unknown losing evidence and rejects endpoint marks or wrong windows instead of creating qualified subsets", () => {
  const { raw, book, protocol } = fixture([{ cfg: cfg("trailing-only"), kind: "trailing-only", side: -1, entryT: H + 1, exitT: H + 2, r: -1, unitR: null, reason: "trail" }]);
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.total.n, 1); assert.equal(r.total.unknownReturns, 1); assert.equal(r.total.pf, null);
  assert.equal(r.types[2].n, 1); assert.equal(r.types[2].pfBasis, "unavailable");
  raw.trades[0].markedOpen = true;
  assert.throws(() => signalWindowReport(raw, book, protocol), /Endpoint mark/);
  assert.throws(() => signalWindowReport({ ...raw, window: { startT: 0, endT: 7 * H } }, book, protocol), /differs/);
});
it("exports full pre/candidate/active/executed gross evidence and literal CSV safely", () => {
  const { raw, book, protocol } = fixture();
  raw.signalProgress.configs = [{ id: cfg(), kind: "normal", source: "ema-cross", range: "short", lane: 1, origin: "configured", built: false,
    protect: { tp: 0.01, sl: 0.02, trail: 0, hold: 60 }, holdMinutes: 60, status: "not built", sides: { 1: { pre: n0(), runCandidates: n0(), unitActiveCandidates: n0(), executed: n0() }, "-1": { pre: n0(), runCandidates: n0(), unitActiveCandidates: n0(), executed: n0() } } }];
  const r = signalWindowReport(raw, book, protocol);
  assert.equal(r.configurations.length, 2);
  assert.equal(r.configurations[0].preGp, 0);
  assert.equal(r.configurations[0].candidatePf, null);
  assert.equal(r.configurations[0].executedPfBasis, "unit-net-returns");
  assert.equal(signalRowsCsv([{ k: 'a,"b' }], ["k"]), 'k\n"a,""b"\n');
});
