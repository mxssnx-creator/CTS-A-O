// A symbol left out of the ranking is replaced by the next ranked one (trade-sim runs without a symbol's history).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dropExcluded } from "./bingx.ts";

describe("excluded symbols", () => {
  it("drops the excluded symbols and keeps the ranking order", () => {
    const ranked = ["ARIA-USDT", "BTC-USDT", "ETH-USDT", "SOL-USDT"];
    assert.deepEqual(dropExcluded(ranked, ["ARIA-USDT"]), ["BTC-USDT", "ETH-USDT", "SOL-USDT"]);
  });

  it("accepts short names and empty lists", () => {
    const ranked = ["ARIA-USDT", "BTC-USDT"];
    assert.deepEqual(dropExcluded(ranked, ["aria"]), ["BTC-USDT"]);
    assert.deepEqual(dropExcluded(ranked, undefined), ranked);
    assert.deepEqual(dropExcluded(ranked, []), ranked);
  });
});
