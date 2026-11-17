// SeriesCache.forgetSuffix reads a suffix index instead of every key: it must drop exactly the keys a plain
// endsWith scan drops (suffixes with and without ":", at the key's start, nested, after clear and re-memo).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";

const bars = () => barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 50, Date.UTC(2026, 9, 1), 3));
const keysOf = (c: SeriesCache) => [...(c as unknown as { m: Map<string, unknown> }).m.keys()].sort();

describe("series cache", () => {
  it("forgetSuffix drops exactly the keys a plain endsWith scan drops", () => {
    const pool = [
      "ema21", "rsi14", "combo:pivot:ema-21@m5", "f:pivot:ema-21@m5", "combo:pivot:ema-21@m5c", "x:combo:pivot:ema-21@m5",
      "xcombo:pivot:ema-21@m5", "combo:sar:ema-21@m5", "a:b:c", "b:c", ":c", "c", "combo:pivot:rsi@m5", "pivot:ema-21@m5",
    ];
    const suffixes = [
      "combo:pivot:ema-21@m5", ":pivot:ema-21@m5", ":ema-21@m5", "ema-21@m5", "c", ":c", "b:c", "a:b:c", ":", "21",
      "combo:sar:ema-21@m5", ":nothing", "m5c", "xcombo:pivot:ema-21@m5",
    ];
    let seed = 7;
    const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % n);
    for (let round = 0; round < 300; round++) {
      const c = new SeriesCache(bars());
      const plain = new Set<string>();
      for (let step = 0; step < 40; step++) {
        const op = rnd(10);
        if (op < 6) {
          const k = pool[rnd(pool.length)];
          c.memo(k, () => step);
          plain.add(k);
        } else if (op < 9) {
          const sfx = suffixes[rnd(suffixes.length)];
          c.forgetSuffix(sfx);
          for (const k of [...plain]) if (k.endsWith(sfx)) plain.delete(k);
        } else {
          const keep = rnd(2) ? [] : ["combo:"];
          c.clear(keep);
          for (const k of [...plain]) if (!keep.some((p) => k.startsWith(p))) plain.delete(k);
        }
        assert.deepEqual(keysOf(c), [...plain].sort(), `round ${round} step ${step}`);
      }
    }
  });
});
