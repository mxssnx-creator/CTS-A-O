import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, newDefaultSettings } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { DEFAULT_ARBITRAGE_RESEARCH } from "./triangular.ts";

test("Arbitrage research settings have conservative bounded defaults", () => {
  assert.deepEqual(DEFAULT_SETTINGS.arbitrageResearch, DEFAULT_ARBITRAGE_RESEARCH);
  assert.doesNotThrow(() => checkSettings({ arbitrageResearch: { ...DEFAULT_ARBITRAGE_RESEARCH } }));
  for (const patch of [{ maxAgeMs: 0 }, { maxSkewMs: -1 }, { slippage: 1 },
    { minNetReturn: NaN }, { startAmount: 0 }, { startAsset: "usdt" }])
    assert.throws(() => checkSettings({ arbitrageResearch: { ...DEFAULT_ARBITRAGE_RESEARCH, ...patch } }));
  const copy = newDefaultSettings();
  assert.deepEqual(copy.arbitrageResearch, DEFAULT_ARBITRAGE_RESEARCH);
});
