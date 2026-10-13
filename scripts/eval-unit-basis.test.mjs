// The eval scores every order at one unit (scripts/lib/eval-orders.mjs unitR): an order the engine sized by its Block
// multiple (r × mult) counts its unit return, closed and marked-open alike.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unitR, windowOrders } from "./lib/eval-orders.mjs";

test("a Block-raised order scores at its unit return; an unsized one as stored", () => {
  assert.equal(unitR({ r: 0.03, mult: 3 }), 0.01);
  assert.equal(unitR({ r: -0.02, mult: 1 }), -0.02);
  assert.equal(unitR({ r: 0.015 }), 0.015, "no multiple stored: the return is the unit return");
  assert.equal(unitR({ r: 0.015, mult: 0 }), 0.015, "a bad multiple never divides by zero");
});

test("a marked-open order keeps its multiple through windowOrders, so it scores at one unit too", () => {
  const w = { from: 1000, to: 2000 };
  const raw = {
    trades: [{ cfg: "c", sym: "S", side: 1, entryT: 1100, entry: 1, exitT: 1500, exit: 1, r: 0.06, reason: "tp", mult: 2 }],
    openEnd: [{ cfg: "c", sym: "S", side: 1, entryT: 1200, entry: 1, mtmR: -0.04, mult: 4 }],
  };
  const { all } = windowOrders(raw, w);
  assert.deepEqual(all.map(unitR), [0.03, -0.01]);
});
