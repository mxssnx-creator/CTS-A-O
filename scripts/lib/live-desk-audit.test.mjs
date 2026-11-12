import assert from "node:assert/strict";
import { test } from "node:test";
import { auditDesk, opensPosition } from "./live-desk-audit.mjs";

const tag = "CTSAO_";
const ex = (coid, symbol, positionSide, side, type, executedQty, avgPrice, commission) =>
  ({ clientOrderId: coid, symbol, positionSide, side, type, executedQty: String(executedQty), avgPrice: String(avgPrice), commission });
const clean = () => ({
  tag, modelCost: 0.00176, from: 0, to: 10_000,
  book: {
    positions: [{ symbol: "AAAUSDT", venueSymbol: "AAA-USDT", side: "long", qty: 2 }],
    orders: [
      { id: "1", symbol: "AAAUSDT", venueSymbol: "AAA-USDT", clientOrderId: "ctsao_Sabc", positionSide: "LONG", type: "STOP_MARKET", stopPrice: 99 },
      { id: "2", symbol: "AAAUSDT", venueSymbol: "AAA-USDT", clientOrderId: "CTSAO_Tabc", positionSide: "LONG", type: "TAKE_PROFIT_MARKET", stopPrice: 101 },
    ],
  },
  history: [
    ex("CTSAO_Ua1", "AAA-USDT", "LONG", "BUY", "MARKET", 2, 100.05, "-0.10005"),
    ex("CTSAO_Ub1", "BBB-USDT", "SHORT", "SELL", "MARKET", 1, 50, "-0.025"),
    ex("CTSAO_Cb1", "BBB-USDT", "SHORT", "BUY", "MARKET", 1, 50.02, "-0.02501"),
  ],
  ledger: {
    orders: [
      { coid: "CTSAO_Ua1", sym: "AAA-USDT", side: 1, kind: "E", qty: 2, px: 100, status: "ok", at: 1000 },
      { coid: "CTSAO_Ub1", sym: "BBB-USDT", side: -1, kind: "E", qty: 1, px: 50.01, status: "ok", at: 2000 },
      { coid: "CTSAO_Cb1", sym: "BBB-USDT", side: -1, kind: "C", qty: 1, px: 50.01, status: "ok", at: 3000 },
    ],
    fills: [
      { coid: "CTSAO_Ua1", sym: "AAA-USDT", side: 1, kind: "E", qty: 2, ref_px: 100, fill_px: 100.05, fee: 0.10005, fee_known: 1, at: 1000 },
      { coid: "CTSAO_Ub1", sym: "BBB-USDT", side: -1, kind: "E", qty: 1, ref_px: 50.01, fill_px: 50, fee: 0.025, fee_known: 1, at: 2000 },
      { coid: "CTSAO_Cb1", sym: "BBB-USDT", side: -1, kind: "C", qty: 1, ref_px: 50.01, fill_px: 50.02, fee: 0.02501, fee_known: 1, at: 3000 },
    ],
  },
});

test("hedge-mode direction: BUY/LONG and SELL/SHORT open, the other two reduce", () => {
  assert.equal(opensPosition({ side: "BUY", positionSide: "LONG" }), true);
  assert.equal(opensPosition({ side: "SELL", positionSide: "SHORT" }), true);
  assert.equal(opensPosition({ side: "SELL", positionSide: "LONG" }), false);
  assert.equal(opensPosition({ side: "BUY", positionSide: "SHORT" }), false);
});

test("a consistent desk passes and reports the measured cost beside the model", () => {
  const r = auditDesk(clean());
  assert.equal(r.ok, true);
  for (const k of ["strandedOrders", "unprotected", "exchangeOnly", "ledgerOnly", "fillMismatch", "foreign"]) assert.deepEqual(r.checks[k], [], k);
  assert.deepEqual(r.book, { positions: 1, ownPositions: 1, orders: 2, ownOrders: 2 });
  assert.equal(r.exchange.executed, 3);
  // commission 0.05 % of each execution's notional
  assert.ok(Math.abs(r.cost.feePerSide - 0.0005) < 1e-9);
  assert.equal(r.cost.feeUnknown, 0);
  // entries: the long paid 0.05 % more, the short received 0.02 % less; the short's exit paid 0.02 % more
  assert.ok(Math.abs(r.cost.entrySlip - (0.0005 + (50.01 - 50) / 50.01) / 2) < 1e-9);
  assert.ok(Math.abs(r.cost.exitSlip - (50.02 - 50.01) / 50.01) < 1e-9);
  assert.ok(Math.abs(r.cost.roundTrip - (2 * r.cost.feePerSide + r.cost.entrySlip + r.cost.exitSlip)) < 1e-12);
});

test("a resting own order without a position is stranded; a held own quantity without a stop is unprotected", () => {
  const a = clean();
  a.book.orders.push({ id: "9", symbol: "CCCUSDT", venueSymbol: "CCC-USDT", clientOrderId: "CTSAO_Sxyz", positionSide: "SHORT", type: "STOP_MARKET", stopPrice: 5 });
  const r = auditDesk(a);
  assert.equal(r.ok, false);
  assert.deepEqual(r.checks.strandedOrders.map((x) => x.coid), ["CTSAO_Sxyz"]);
  const b = clean();
  b.book.orders = b.book.orders.filter((o) => !/_S/i.test(o.clientOrderId));
  const u = auditDesk(b);
  assert.equal(u.ok, false);
  assert.deepEqual(u.checks.unprotected, [{ symbol: "AAA-USDT", side: "long", qty: 2, ownQty: 2 }]);
  // a take-profit alone is not protection
  assert.equal(u.checks.strandedOrders.length, 0);
});

test("an execution only one record knows, and a differing quantity or price, are reported", () => {
  const a = clean();
  a.history.push(ex("CTSAO_Uzz", "DDD-USDT", "LONG", "BUY", "MARKET", 3, 7, "-0.01"));
  a.history.push(ex("CTSAO_Czz", "DDD-USDT", "LONG", "SELL", "MARKET", 3, 7, "-0.01"));
  assert.deepEqual(auditDesk(a).checks.exchangeOnly.map((x) => x.coid), ["CTSAO_UZZ", "CTSAO_CZZ"]);
  const b = clean();
  b.history = b.history.filter((o) => o.clientOrderId !== "CTSAO_Cb1");
  const lo = auditDesk(b);
  assert.deepEqual(lo.checks.ledgerOnly.map((x) => x.coid), ["CTSAO_CB1"]);
  // outside the history window that was read, a ledger fill is not judged
  assert.deepEqual(auditDesk({ ...b, from: 5000 }).checks.ledgerOnly, []);
  const c = clean();
  c.ledger.fills[0].qty = 1.5;
  assert.deepEqual(auditDesk(c).checks.fillMismatch.map((x) => [x.coid, x.ledgerQty, x.exchangeQty]), [["CTSAO_UA1", 1.5, 2]]);
  const d = clean();
  d.ledger.fills[0].fill_px = 100.2;
  assert.equal(auditDesk(d).checks.fillMismatch.length, 1);
});

test("quantity that is not the tag's is reported apart and never judged own; an unreported fee stays unknown", () => {
  const a = clean();
  a.book.positions.push({ symbol: "EEEUSDT", venueSymbol: "EEE-USDT", side: "short", qty: 4 });
  a.book.orders.push({ id: "7", symbol: "EEEUSDT", venueSymbol: "EEE-USDT", clientOrderId: "HAND1", positionSide: "SHORT", type: "LIMIT" });
  a.history.push(ex("HAND0", "EEE-USDT", "SHORT", "SELL", "MARKET", 4, 2, "-0.004"));
  const r = auditDesk(a);
  assert.equal(r.ok, true, "foreign quantity is not the desk's failure");
  assert.deepEqual(r.checks.foreign.map((x) => x.what), ["position", "order"]);
  assert.equal(r.checks.unprotected.length, 0, "a position the tag did not open needs no own stop");
  assert.equal(r.exchange.executed, 3);
  const b = clean();
  b.history[0].commission = undefined;
  const u = auditDesk(b);
  assert.equal(u.cost.feeUnknown, 1);
  assert.equal(u.cost.feeFills, 2);
  const c = clean();
  for (const o of c.history) o.commission = "";
  assert.equal(auditDesk(c).cost.feePerSide, null);
  assert.equal(auditDesk(c).cost.roundTrip, null);
  assert.throws(() => auditDesk({ ...clean(), tag: "" }), /tracking tag/);
});
