import { it } from "node:test";
import assert from "node:assert/strict";
import { sessionOwnedReturns, sessionVirtualReturns } from "./session-owned-returns.mjs";

const key = (x) => x.id;
const rows = [
  { id: "fundedWin", r: 0.08, mult: 2, vol: 2 },
  { id: "fundedLoss", r: -0.02, mult: 1, vol: 1 },
  { id: "zeroWin", r: 0.5, mult: 1, vol: 1 },
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
  const loss = sessionOwnedReturns([{ id: "x", r: -0.1, mult: 1 }], new Map([["x", 1]]), key);
  assert.equal(loss.pf, 0); assert.equal(loss.noLoss, false); assert.equal(loss.losses, 1);
  const win = sessionOwnedReturns([rows[0]], new Map([["fundedWin", 1]]), key);
  assert.equal(win.noLoss, true); assert.equal(win.pf, 4);
});
