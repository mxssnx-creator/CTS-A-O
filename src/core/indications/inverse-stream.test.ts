import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INVERSE_CONFIG_IDS } from "./inverse-config.ts";
import { indicationState, laneInd } from "./registry.ts";
import { StreamMath } from "./stream-math.ts";
import { IncrementalMarkets, MarketSource } from "./market.ts";
import { barsFromCandles, headBars, resample, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { entrySignal } from "../bots/bots.ts";

function same(actual: Int8Array | null, expected: Int8Array | null, label: string) {
  assert.equal(actual === null, expected === null, label);
  if (!actual || !expected) return;
  assert.equal(actual.length, expected.length, label);
  for (let i = 0; i < actual.length; i++)
    if (actual[i] !== expected[i]) assert.fail(`${label} at ${i}: ${actual[i]} != ${expected[i]}`);
}
describe("all Inverse sources on append-only calculation state", () => {
  it("matches full raw/filtered/onset signals on 1/5/15m and combined lanes, including gap resets", () => {
    const M = 60_000,
      start = Date.UTC(2026, 9, 1);
    for (const gaps of [false, true]) {
      const all = ["ADA-USDT", "BTC-USDT", "ETH-USDT"].flatMap((sym) => {
        const cs = syntheticCandles(sym, 1, 2400, start + 2400 * M)
          .filter((_, i) => !gaps || i !== 800)
          .map((bar, i) => (gaps && sym === "ADA-USDT" && i === 1300 ? { ...bar, c: NaN } : bar));
        return [1, 5, 15].map((tf) => ({
          ...barsFromCandles(sym, tf, resample(cs, 1, tf)),
          lanes: [1, 5, 15],
        }));
      });
      const states = new Map<string, StreamMath>(),
        markets = new IncrementalMarkets();
      for (const minute of [2100, 2101, 2102, 2105, 2115, 2130, 2161, 2190]) {
        const bars = all.map((b) => headBars(b, start + minute * M));
        const actual = makeUniverse(bars),
          expected = makeUniverse(bars);
        const market = new MarketSource(bars, markets);
        for (let s = 0; s < actual.bars.length; s++) {
          const b = actual.bars[s],
            key = `${b.sym}|${b.tfMin}`;
          let math = states.get(key);
          if (!math) states.set(key, (math = new StreamMath()));
          const k = actual.caches[s],
            reference = expected.caches[s];
          k.setMarket(market);
          k.enableStreaming(math);
          for (const id of INVERSE_CONFIG_IDS)
            for (const combined of [false, true]) {
              const lane = laneInd(id, b.tfMin, combined);
              const label = `${key} ${lane} minute ${minute} gaps ${gaps}`;
              same(indicationState(lane, k), indicationState(lane, reference), label);
              same(
                entrySignal("follow", lane, k, {
                  ...DEFAULT_SETTINGS.tactics,
                  volRegime: true,
                  trendStrength: true,
                }),
                entrySignal("follow", lane, reference, {
                  ...DEFAULT_SETTINGS.tactics,
                  volRegime: true,
                  trendStrength: true,
                }),
                `${label} filters`,
              );
            }
        }
      }
    }
  });
});
