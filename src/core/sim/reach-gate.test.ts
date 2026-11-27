// The reach gate keeps an entry only while the causal volatility can plausibly cover the cell's target within its hold.
import { it } from "node:test";
import assert from "node:assert/strict";
import { reachEntries } from "./walkforward.ts";
import { SeriesCache } from "../indications/cache.ts";
import { barsFromCandles } from "../market/bars.ts";
import { SHORT_RANGE } from "../minimal-coord.ts";
import { checkSettings } from "../settings-check.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

const rows = (range: number) => Array.from({ length: 80 }, (_, i) => ({
  t: Date.UTC(2026, 9, 1) + i * 900_000, o: 100, h: 100 + range / 2, l: 100 - range / 2, c: 100, v: 1 }));
const cache = (range: number) => { const b = barsFromCandles("AAA-USDT", 15, rows(range)); return { b, k: new SeriesCache(b) }; };
const sig = () => Int8Array.from({ length: 80 }, (_, i) => (i > 40 ? 1 : 0));

it("drops entries whose target the volatility cannot cover, keeps them when it can", () => {
  const calm = cache(0.2), wild = cache(3);
  // ATR% 0.2 %, hold 32 bars: reach 0.2 % x sqrt(32) = 1.13 %; the 2.4 % target needs 1.2 % at frac 0.5
  assert.ok(reachEntries(sig(), calm.b, calm.k, 0.024, 32, 0.5).every((x) => x === 0));
  // ATR% 3 %: reach 17 % - every entry stays
  assert.deepEqual(reachEntries(sig(), wild.b, wild.k, 0.024, 32, 0.5), sig());
  assert.deepEqual(reachEntries(sig(), calm.b, calm.k, 0.024, 32, 0), sig(), "frac 0 = off");
});

it("Short ships the gate and the setting is validated", () => {
  assert.equal(SHORT_RANGE.reachFrac, 0.5);
  assert.doesNotThrow(() => checkSettings({ grid: { ...DEFAULT_SETTINGS.grid, short: { ...SHORT_RANGE, reachFrac: 0.8 } } }));
  assert.throws(() => checkSettings({ grid: { ...DEFAULT_SETTINGS.grid, short: { ...SHORT_RANGE, reachFrac: -1 } } }));
});
