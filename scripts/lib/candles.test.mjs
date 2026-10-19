// scripts/lib/candles.mjs: on a Candle[] and on a CandleSeries of the same bars every helper answers as the code the
// scripts had inline (copied here as the reference).
import { test } from "node:test";
import assert from "node:assert/strict";
import { closeAtExact, closesIn, lastCloseOf } from "./candles.mjs";
import { CandleSeries } from "../../src/core/market/candle-series.ts";

// the inline code before 14 Oct
const refCloseAt = (cs, t) => {
  let lo = 0;
  let hi = cs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cs[mid].t <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && cs[lo - 1].t === t ? cs[lo - 1].c : undefined;
};
const refCloses = (cs, a, b) => cs.filter((c) => c.t >= a && c.t <= b).map((c) => [c.t, c.c]);

function bars(seed, n) {
  let x = seed;
  const r = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out = [];
  let t = 1_790_000_000_000;
  for (let i = 0; i < n; i++) {
    out.push({ t, o: r(), h: r() + 1, l: r() - 1, c: r(), v: r() });
    // gaps and repeated open times (the latest of equal times wins)
    t += r() < 0.05 ? 0 : r() < 0.05 ? 7 * 60_000 : 60_000;
  }
  return out;
}

test("every helper answers on a series as the inline code did on the bars", () => {
  for (const seed of [1, 2, 3]) {
    const cs = bars(seed, 3000);
    const s = CandleSeries.fromCandles(cs);
    assert.equal(lastCloseOf(cs), cs.at(-1).c);
    assert.equal(lastCloseOf(s), cs.at(-1).c);
    for (let q = 0; q < 500; q++) {
      const t = cs[0].t - 120_000 + Math.floor((q / 500) * (cs.at(-1).t - cs[0].t + 240_000) / 60_000) * 60_000;
      assert.equal(closeAtExact(cs, t), refCloseAt(cs, t), `array t ${t}`);
      assert.equal(closeAtExact(s, t), refCloseAt(cs, t), `series t ${t}`);
    }
    for (const [a, b] of [[0, Infinity], [cs[100].t, cs[900].t], [cs[5].t + 1, cs[5].t + 1], [cs.at(-1).t + 1, Infinity]]) {
      assert.deepEqual(closesIn(cs, a, b), refCloses(cs, a, b));
      assert.deepEqual(closesIn(s, a, b), refCloses(cs, a, b));
    }
  }
  assert.equal(lastCloseOf(undefined), undefined);
  assert.equal(lastCloseOf([]), undefined);
  assert.equal(lastCloseOf(CandleSeries.EMPTY), undefined);
  assert.equal(closeAtExact(CandleSeries.EMPTY, 5), undefined);
});
