// The evaluation counts a window's orders still open at its end (marked), not only the closed ones.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { windowOrders } from "./lib/eval-orders.mjs";

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
