import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { entrySignal } from "../bots/bots.ts";
import { barsFromCandles, resample, syntheticCandles } from "../market/bars.ts";
import { laneInds } from "../pipeline/pipeline.ts";
import { SeriesCache } from "./cache.ts";
import { microAdxPullback } from "./micro-adx-pullback.ts";
import { INDICATION_BY_ID, indicationState } from "./registry.ts";

test("selective ADX pullback owns a causal one-minute Micro lane in both directions", () => {
  const { id } = microAdxPullback;
  assert.equal(INDICATION_BY_ID.get(id), microAdxPullback);
  const [lane] = laneInds(id, [1, 5, 15, 30]);
  assert.deepEqual(laneInds(id, [1, 5, 15, 30]), [`${id}@m1`]);
  assert.ok(!DEFAULT_SETTINGS.focus.some(pair => pair.includes(id)));

  const candles = syntheticCandles("ADX-USDT", 1, 4_000, Date.UTC(2026, 10, 27), 31);
  const cache = new SeriesCache(barsFromCandles("ADX-USDT", 1, candles));
  const clipped = new SeriesCache(barsFromCandles("ADX-USDT", 1, candles.slice(0, 1_600)));
  const state = indicationState(lane, cache)!;
  const orders = entrySignal("follow", lane, cache)!;
  assert.ok(orders.includes(1) && orders.includes(-1));
  assert.deepEqual(state.slice(0, 1_600), indicationState(lane, clipped));
  const five = new SeriesCache(barsFromCandles("ADX-USDT", 5, resample(candles, 1, 5)));
  assert.ok(microAdxPullback.fn(five).every(side => side === 0));
});
