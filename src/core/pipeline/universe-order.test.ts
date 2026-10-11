// The universe is built from the loaded symbols in one canonical order (bySymbol): the candle map keeps the order its
// batches finished loading in, which differs between runs. A universe in load order gave the same 29 symbols different
// engine trades in two runs (8 Oct), because the engine breaks ties by position.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bySymbol } from "./pipeline.ts";

describe("the universe order does not depend on the order the symbols loaded in", () => {
  it("two maps with the same symbols, loaded in different orders, give the same order", () => {
    const a = new Map<string, number>([
      ["XRP-USDT", 1],
      ["BTC-USDT", 2],
      ["SOL-USDT", 3],
    ]);
    const b = new Map<string, number>([
      ["SOL-USDT", 3],
      ["XRP-USDT", 1],
      ["BTC-USDT", 2],
    ]);
    assert.deepEqual(bySymbol(a).map(([k]) => k), ["BTC-USDT", "SOL-USDT", "XRP-USDT"]);
    assert.deepEqual(bySymbol(a), bySymbol(b));
  });

  it("the values travel with their symbols", () => {
    const m = new Map<string, number>([["B-USDT", 2], ["A-USDT", 1]]);
    assert.deepEqual(bySymbol(m), [["A-USDT", 1], ["B-USDT", 2]]);
  });
});
