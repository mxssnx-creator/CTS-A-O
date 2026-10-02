// Forced symbols: always in the universe, first, whatever their rank; the ranking fills the rest.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { forceSymbols, normSymbol } from "./bingx.ts";
import { checkSettings } from "../settings-check.ts";

describe("forced symbols", () => {
  it("normalizes names", () => {
    assert.equal(normSymbol("xrp"), "XRP-USDT");
    assert.equal(normSymbol("SOLUSDT"), "SOL-USDT");
    assert.equal(normSymbol(" bch-usdt "), "BCH-USDT");
  });

  it("puts the forced symbols first and fills up to n from the ranking, without duplicates", () => {
    const ranked = ["ZRO-USDT", "SOL-USDT", "SAND-USDT", "FHE-USDT", "PUMP-USDT"];
    assert.deepEqual(forceSymbols(ranked, ["XRP", "SOL", "BCH"], 5), [
      "XRP-USDT",
      "SOL-USDT",
      "BCH-USDT",
      "ZRO-USDT",
      "SAND-USDT",
    ]);
    // none forced: the ranking as it is
    assert.deepEqual(forceSymbols(ranked, [], 3), ranked.slice(0, 3));
    assert.deepEqual(forceSymbols(ranked, undefined, 3), ranked.slice(0, 3));
    // more forced than n: every forced symbol is kept
    assert.deepEqual(forceSymbols(ranked, ["XRP", "SOL", "BCH"], 2), ["XRP-USDT", "SOL-USDT", "BCH-USDT"]);
  });

  it("settings accept a symbol list and reject anything else", () => {
    assert.doesNotThrow(() => checkSettings({ forceSymbols: ["XRP-USDT", "SOL", "bch"] } as never));
    assert.throws(() => checkSettings({ forceSymbols: "XRP" } as never));
    assert.throws(() => checkSettings({ forceSymbols: ["XRP/USDT!"] } as never));
  });
});
