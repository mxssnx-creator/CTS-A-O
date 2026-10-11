// The lane series: resampling only the window a lane keeps gives exactly the bars of the full resample.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resample } from "../market/bars.ts";
import { resampleTail } from "./runtime.server.ts";
import type { Candle } from "../domain/types.ts";

const M = 60_000;
/** deterministic 1 m candles, sorted, from a start that is not a bucket boundary (a 3-minute offset) */
function candles(n: number, start = 1_791_000_000_000 + 3 * M): Candle[] {
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = p * (1 + Math.sin(i * 0.37) * 0.002);
    out.push({ t: start + i * M, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 + (i % 7) });
    p = c;
  }
  return out;
}

describe("lane series: the window resample", () => {
  const cs = candles(12_000);
  for (const tf of [5, 15, 30]) {
    for (const n of [4, 50, 800, 3_000]) {
      it(`tf ${tf} m, last ${n} bars: identical to resampling everything and keeping the last ${n}`, () => {
        const full = resample(cs, 1, tf);
        const expected = full.length > n ? full.slice(full.length - n) : full;
        const tail = resampleTail(cs, 1, tf, n);
        const actual = tail.length > n ? tail.slice(tail.length - n) : tail;
        assert.deepEqual(actual, expected);
      });
    }
  }
  it("an empty series is an empty lane", () => {
    assert.deepEqual(resampleTail([], 1, 5, 10), []);
  });
});
