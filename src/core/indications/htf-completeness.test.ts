import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Candle } from "../domain/types.ts";
import { barsFromCandles, resample } from "../market/bars.ts";
import { CandleSeries, resampleTailBars } from "../market/candle-series.ts";
import { htfBars } from "./cache.ts";

const M = 60_000;
const candles = (minutes: number[]): Candle[] =>
  minutes.map((m) => ({
    t: m * M,
    o: 100 + m,
    h: 102 + m,
    l: 99 + m,
    c: 101 + m,
    v: 1 + m,
  }));
const columns = ["t", "o", "h", "l", "c", "v"] as const;

describe("higher timeframes require complete contiguous buckets", () => {
  for (const minutes of [
    [0, 1, 3],
    [1, 2, 3],
    [0.5, 1.5, 2.5, 3.5],
  ]) {
    it(`does not publish incomplete or misaligned bars: ${minutes.join(",")}`, () => {
      const cs = candles(minutes);
      const { hb, map } = htfBars(barsFromCandles("X", 1, cs), 4);
      assert.equal(hb.n, 0, "higher view has no complete bucket");
      assert.deepEqual(
        [...map],
        minutes.map(() => -1),
      );
      assert.deepEqual(resample(cs, 1, 4), [], "array resample agrees");
      assert.equal(
        resampleTailBars("X", CandleSeries.fromCandles(cs), 1, 4, 10).n,
        0,
        "column resample agrees",
      );
    });
  }

  for (const minutes of [
    [0, 1, 1, 3],
    [0, 1, 2, 3, 3],
    [0, 1, 3, 2],
  ]) {
    it(`rejects non-increasing source timestamps consistently: ${minutes.join(",")}`, () => {
      const cs = candles(minutes);
      const error = /strictly increasing timestamps/;
      assert.throws(() => htfBars(barsFromCandles("X", 1, cs), 4), error);
      assert.throws(() => resample(cs, 1, 4), error);
      assert.throws(() => resampleTailBars("X", CandleSeries.fromCandles(cs), 1, 4, 1), error);
    });
  }

  it("keeps the last complete map across a gap and resumes only after a full aligned bucket", () => {
    const cs = candles([0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const full = barsFromCandles("X", 1, cs);
    const { hb, map } = htfBars(full, 4);
    assert.deepEqual([...hb.t], [0, 8 * M]);
    assert.deepEqual([...map], [-1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
    const expected = barsFromCandles("X", 4, resample(cs, 1, 4));
    for (const k of columns) assert.deepEqual(hb[k], expected[k], k);
    for (let cut = 1; cut <= cs.length; cut++) {
      const part = htfBars(barsFromCandles("X", 1, cs.slice(0, cut)), 4);
      assert.deepEqual(part.map, map.slice(0, cut), `map prefix ${cut}`);
      for (const k of columns)
        assert.deepEqual(part.hb[k], hb[k].slice(0, part.hb.n), `${k} prefix ${cut}`);
    }
  });

  it("tail resampling returns the last n complete bars even across many empty buckets", () => {
    const cs = candles([0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 100, 101, 102, 103]);
    for (const n of [1, 2, 3, 10]) {
      const full = resample(cs, 1, 5);
      const expected = barsFromCandles("X", 5, full.slice(-n));
      const actual = resampleTailBars("X", CandleSeries.fromCandles(cs), 1, 5, n);
      assert.equal(actual.n, expected.n, `last ${n}`);
      for (const k of columns) assert.deepEqual(actual[k], expected[k], `${k} last ${n}`);
    }
  });

  it("array, column and mapped higher views agree across sparse 1m and 5m sources", () => {
    for (const srcMin of [1, 5]) {
      const cs = candles(
        Array.from({ length: 140 }, (_, i) => i * srcMin).filter(
          (_, i) => i % 17 !== 2 && (i < 45 || i > 80),
        ),
      );
      for (const factor of [2, 3, 4, 6]) {
        const tf = srcMin * factor;
        const full = resample(cs, srcMin, tf);
        const { hb } = htfBars(barsFromCandles("X", srcMin, cs), factor);
        const expectedFull = barsFromCandles("X", tf, full);
        for (const k of columns)
          assert.deepEqual(hb[k], expectedFull[k], `${srcMin}m x${factor} ${k}`);
        for (const n of [0, 1, 3, 20, 100]) {
          const tail = resampleTailBars("X", CandleSeries.fromCandles(cs), srcMin, tf, n);
          const expected = barsFromCandles("X", tf, n ? full.slice(-n) : []);
          for (const k of columns)
            assert.deepEqual(tail[k], expected[k], `${srcMin}m x${factor} last ${n} ${k}`);
        }
      }
    }
  });
});
