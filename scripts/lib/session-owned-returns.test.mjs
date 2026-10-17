import { it } from "node:test";
import assert from "node:assert/strict";
import { sessionCashPnl, sessionUnitNotional, sessionOwnedReturns, sessionVirtualReturns } from "./session-owned-returns.mjs";

const key = (x) => x.id;
const rows = [
  { id: "fundedWin", r: 0.08, mult: 2, vol: 2, entryT: 1, exitT: 2 },
  { id: "fundedLoss", r: -0.02, mult: 1, vol: 1, entryT: 2, exitT: 3 },
  { id: "zeroWin", r: 0.5, mult: 1, vol: 1, entryT: 3, exitT: 4 },
];
it("funded PF and virtual PF use explicitly different samples without changing cash or return weighting", () => {
  const allocations = new Map([["fundedWin", 3], ["fundedLoss", 7], ["zeroWin", 0]]);
  const owned = sessionOwnedReturns(rows, allocations, key);
  assert.equal(owned.n, 2); assert.equal(owned.fundedOrders, 2); assert.equal(owned.zeroAllocatedOrders, 1);
  assert.equal(owned.gpR, 0.04); assert.equal(owned.glR, 0.02); assert.equal(owned.pf, 2);
  assert.equal(owned.wins, 1); assert.equal(owned.losses, 1);
  assert.equal(sessionVirtualReturns(rows).pf, 27);
});
it("unknown allocation or unknown own return stays in the sample and invalidates PF", () => {
  const allocations = new Map([["fundedWin", 3], ["zeroWin", 0]]);
  const missing = sessionOwnedReturns(rows, allocations, key);
  assert.equal(missing.n, 2); assert.equal(missing.unknownAllocations, 1); assert.ok(Number.isNaN(missing.pf));
  const unknown = sessionOwnedReturns([{ id: "unknown", r: 0.1 }], new Map([["unknown", 2]]), key);
  assert.equal(unknown.n, 1); assert.equal(unknown.unknownReturns, 1); assert.ok(Number.isNaN(unknown.pf));
  for (const value of [null, -1, Infinity, NaN]) {
    assert.ok(Number.isNaN(sessionOwnedReturns([rows[0]], new Map([["fundedWin", value]]), key).pf));
  }
});
it("zero allocations never acquire return evidence, while funded loss/zero and no-loss sentinel remain explicit", () => {
  const free = sessionOwnedReturns([{ id: "unknown", r: 0.1 }], new Map([["unknown", 0]]), key);
  assert.equal(free.n, 0); assert.equal(free.zeroAllocatedOrders, 1); assert.equal(free.unknownReturns, 0);
  const loss = sessionOwnedReturns([{ id: "x", r: -0.1, mult: 1, entryT: 1, exitT: 2 }], new Map([["x", 1]]), key);
  assert.equal(loss.pf, 0); assert.equal(loss.noLoss, false); assert.equal(loss.losses, 1);
  const win = sessionOwnedReturns([rows[0]], new Map([["fundedWin", 1]]), key);
  assert.equal(win.noLoss, true); assert.equal(win.pf, 4);
});

it("empty, unknown-volume and overflowed samples cannot claim a finite primary PF", () => {
  for (const result of [sessionOwnedReturns([], new Map(), key), sessionVirtualReturns([])]) {
    assert.equal(result.n, 0); assert.equal(result.pfBasis, "unavailable");
    assert.ok(Number.isNaN(result.pf)); assert.equal(result.noLoss, false);
  }
  const unknownVolume = sessionOwnedReturns([{ ...rows[0], vol: null }], new Map([["fundedWin", 1]]), key);
  assert.equal(unknownVolume.n, 1); assert.equal(unknownVolume.unknownAllocations, 1);
  assert.equal(unknownVolume.pfBasis, "unavailable");
  const overflow = [1e308, 1e308, -1].map((r, i) => ({ id: String(i), r, mult: 1, entryT: i, exitT: i + 1 }));
  const allocations = new Map(overflow.map((x) => [x.id, 1]));
  for (const result of [sessionOwnedReturns(overflow, allocations, key), sessionVirtualReturns(overflow)]) {
    assert.equal(result.n, 3); assert.equal(result.unknownReturns, 0);
    assert.equal(result.unknownReturnTotals, 1); assert.equal(result.pfBasis, "unavailable");
    assert.ok(Number.isNaN(result.pf)); assert.ok(Number.isNaN(result.gpR));
    assert.equal(result.noLoss, false);
  }
});

it("missing and malformed allocation evidence cannot invent funded cash while known zero stays zero", () => {
  const x = rows[0];
  for (const value of [undefined, null, -1, Infinity, NaN]) {
    const allocations = new Map(value === undefined ? [] : [[x.id, value]]);
    assert.ok(Number.isNaN(sessionUnitNotional(x, allocations, key)));
    assert.ok(Number.isNaN(sessionCashPnl(x, allocations, key)));
  }
  const zero = new Map([[x.id, 0]]);
  assert.equal(sessionUnitNotional(x, zero, key), 0);
  assert.equal(sessionCashPnl({ ...x, r: Infinity }, zero, key), 0);
  assert.ok(Math.abs(sessionCashPnl(x, new Map([[x.id, 3]]), key) - 0.24) < 1e-12);
  assert.ok(Math.abs(sessionCashPnl({ ...x, r: 1e-20, vol: 1 }, new Map([[x.id, 3]]), key) / 3e-20 - 1) < 1e-12,
    "base-one cash change retains tiny returns instead of cancelling 1 + r back to 1");
  assert.ok(Number.isNaN(sessionCashPnl({ ...x, r: 1e308 }, new Map([[x.id, 3]]), key)));
});

it("cash PF scales the base-one return by funded unit notional without multiplying execution volume twice", () => {
  const win = { id: "win", r: 0.08, mult: 2, vol: 2 };
  const loss = { id: "loss", r: -0.02, mult: 1, vol: 1 };
  const allocations = new Map([["win", 3], ["loss", 3]]);
  assert.ok(Math.abs(sessionCashPnl(win, allocations, key) - 0.24) < 1e-12,
    "(1 + 0.08 − 1) × $3; the 2× execution volume is already in r");
  assert.ok(Math.abs(sessionCashPnl(loss, allocations, key) + 0.06) < 1e-12);
  assert.ok(Math.abs(sessionCashPnl(win, new Map([["win", 6]]), key) - 0.48) < 1e-12,
    "a $6 base notional scales base-one cash P&L linearly");
});
