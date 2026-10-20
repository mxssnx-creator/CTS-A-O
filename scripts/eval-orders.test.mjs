// The evaluation counts a window's orders still open at its end (marked), not only the closed ones.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockSplit, windowOrders } from "./lib/eval-orders.mjs";

const pf = (rs) => {
  let gp = 0;
  let gl = 0;
  for (const r of rs) {
    if (r > 0) gp += r;
    else gl -= r;
  }
  return gl > 0 ? gp / gl : Infinity;
};

describe("evaluation window orders", () => {
  const w = { from: 1000, to: 5000 };
  const raw = {
    trades: [
      { cfg: "a", sym: "X", side: 1, entryT: 1500, entry: 1, exitT: 2000, exit: 1.03, r: 0.03, reason: "tp" },
      { cfg: "a", sym: "X", side: 1, entryT: 2500, entry: 1, exitT: 3000, exit: 0.99, r: -0.01, reason: "sl" },
      // entered before the window: another window's order
      { cfg: "a", sym: "X", side: 1, entryT: 900, entry: 1, exitT: 1200, exit: 1.1, r: 0.1, reason: "tp" },
    ],
    openEnd: [
      { cfg: "s", sym: "Y", side: -1, entryT: 4000, entry: 2, mtmR: -0.05 },
      { cfg: "s", sym: "Y", side: -1, entryT: 6000, entry: 2, mtmR: -0.5 },
    ],
  };
  it("a loser still open at the window end lowers the window's PF (it was dropped before)", () => {
    const o = windowOrders(raw, w);
    assert.equal(o.closed.length, 2);
    assert.equal(o.open.length, 1, "only the open order entered in the window");
    assert.deepEqual(o.open[0], { cfg: "s", sym: "Y", side: -1, entryT: 4000, entry: 2, exitT: 5000, exit: null, r: -0.05, reason: "open-end" });
    assert.equal(pf(o.closed.map((t) => t.r)), 3);
    assert.equal(+pf(o.all.map((t) => t.r)).toFixed(6), +(0.03 / 0.06).toFixed(6));
  });
  it("a dump without openEnd (older engines) gives the closed orders only", () => {
    assert.equal(windowOrders({ trades: raw.trades }, w).all.length, 2);
  });
});

describe("the eval sees Block: volume-weighted PF and unit PF raised / unraised", () => {
  // stored r is sized (r × mult, the multiple beside it): a raised loser weighs 4 units, its unit edge one
  const orders = [
    { r: 0.02, mult: 1 },
    { r: -0.01 },
    { r: -0.04, mult: 4 },
    { r: 0.06, mult: 2 },
  ];
  it("splits raised from unraised orders and weighs the book by volume", () => {
    const b = blockSplit(orders);
    assert.equal(b.n, 4);
    assert.equal(b.raised, 2);
    // unit: +0.02 −0.01 −0.01 +0.03 → PF 0.05 / 0.02; volume: +0.02 −0.01 −0.04 +0.06 → 0.08 / 0.05
    assert.equal(b.pfUnit, 2.5);
    assert.equal(b.pfVol, 1.6);
    assert.equal(b.unraisedPfUnit, 2);
    assert.equal(b.raisedPfUnit, 3);
    assert.equal(b.raisedPfVol, 1.5);
    assert.equal(b.meanMult, 2);
  });
  it("Block off (every order at one unit): both PFs agree, nothing raised", () => {
    const b = blockSplit([{ r: 0.02 }, { r: -0.01, mult: 1 }]);
    assert.equal(b.raised, 0);
    assert.equal(b.pfVol, b.pfUnit);
    assert.equal(b.raisedPfUnit, null);
  });
});
