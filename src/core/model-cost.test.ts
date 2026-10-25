import { it } from "node:test";
import assert from "node:assert/strict";
import { modeledPriceReturn } from "./model-cost.ts";

it("net breakeven is exactly zero in both directions without turning material losses positive", () => {
  for (const side of [1, -1]) for (const entry of [.001, 10, 100, 67890]) for (const cost of [.0015, .002]) {
    const exit = entry * (1 + side * cost);
    assert.equal(modeledPriceReturn(side, entry, exit, cost), 0);
    assert.ok(modeledPriceReturn(side, entry, exit - side * entry * 1e-10, cost) < 0);
    assert.ok(modeledPriceReturn(side, entry, exit + side * entry * 1e-10, cost) > 0);
    assert.equal(modeledPriceReturn(side, entry, entry, cost), -cost);
  }
  assert.ok(Number.isNaN(modeledPriceReturn(1, 0, 0, .002)), "unknown values stay unknown");
});
