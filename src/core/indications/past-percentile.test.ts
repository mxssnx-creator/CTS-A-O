import assert from "node:assert/strict";
import { test } from "node:test";
import { pastPercentileRank } from "./filters.ts";

test("causal rolling percentile exactly matches the scalar prior-window rule", () => {
  let seed = 19037;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const cases = [new Float64Array(1200).fill(1), Float64Array.from({ length: 1200 }, (_, i) => {
    if (i % 29 === 0) return NaN;
    if (i % 83 === 0) return Infinity;
    if (i % 101 === 0) return -Infinity;
    if (i % 47 === 0) return -0;
    return Math.floor(random() * 19) - 9;
  })];
  for (const x of cases) for (const p of [1, 2, 7, 31, 336, 1500]) {
    const expected = new Float64Array(x.length).fill(NaN);
    for (let i = p; i < x.length; i++) {
      if (!Number.isFinite(x[i])) continue;
      let count = 0, below = 0;
      for (let j = i - p; j < i; j++) if (Number.isFinite(x[j])) {
        count++;
        if (x[j] < x[i]) below++;
      }
      if (count > p / 2) expected[i] = below / count;
    }
    const actual = pastPercentileRank(x, p);
    assert.deepEqual(actual, expected, `window ${p}`);
    for (const cut of [1, 333, 700, x.length])
      assert.deepEqual(pastPercentileRank(x.slice(0, cut), p), actual.slice(0, cut), `causal prefix ${cut}`);
  }
  assert.throws(() => pastPercentileRank(new Float64Array(1), 0), /positive integer/);
});
