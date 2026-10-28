import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barsFromCandles, mulberry32 } from "../market/bars.ts";
import type { Bars } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { StreamMath } from "./stream-math.ts";
import { simulate } from "../sim/backtest.ts";
import { ratchetTrail } from "../sim/trailing.ts";
import {
  DEFAULT_LOW_RANGE_POLICY, LOW_RANGE_IDS, LOW_RANGE_METHODS, LOW_RANGE_RELATIONS,
  LOW_RANGE_SL_RATIOS, LOW_RANGE_STEPS, LOW_RANGE_WINDOWS, lowRangeProtects, lowRangeState,
} from "./low-range-research.ts";

const prefix = (b: Bars, n: number): Bars => ({ ...b, n, t: b.t.slice(0, n), o: b.o.slice(0, n),
  h: b.h.slice(0, n), l: b.l.slice(0, n), c: b.c.slice(0, n), v: b.v.slice(0, n) });

function fixture(): Bars {
  const rng = mulberry32(43);
  let price = 100;
  return barsFromCandles("TEST", 1, Array.from({ length: 360 }, (_, i) => {
    const o = price;
    price *= 1 + (rng() - 0.5) * 0.006;
    return { t: (i + (i >= 170 ? 2 : 0)) * 60_000, o, c: price,
      h: Math.max(o, price) * 1.0007, l: Math.min(o, price) * 0.9993, v: 100 };
  }));
}

describe("Low-Range research candidate", () => {
  it("gives each method, relation and lookback a distinct identity", () => {
    assert.equal(LOW_RANGE_IDS.length, 650);
    assert.equal(new Set(LOW_RANGE_IDS).size, 650);
    assert.deepEqual(LOW_RANGE_WINDOWS, [1, 2, 3, 6, 9, 12, 18, 24, 36, 48]);
  });
  it("is causal and incremental output matches full recalculation through a gap", () => {
    const b = fixture();
    const math = new StreamMath();
    for (const n of [1, 12, 24, 48, 77, 151, 170, 171, 180, 220, 359, 360]) {
      const part = prefix(b, n), streamed = new SeriesCache(part).enableStreaming(math);
      for (const w of LOW_RANGE_WINDOWS) for (const method of LOW_RANGE_METHODS) for (const relation of LOW_RANGE_RELATIONS) {
        const complete = lowRangeState(new SeriesCache(b), w, method, relation);
        const direct = lowRangeState(new SeriesCache(part), w, method, relation);
        assert.deepEqual(direct, complete.slice(0, n), `${w}/${method}/${relation} prefix ${n}`);
        assert.deepEqual(lowRangeState(streamed, w, method, relation), direct, `${w}/${method}/${relation} stream ${n}`);
      }
    }
  });
  it("requires a fresh full window after bad or missing bars", () => {
    const b = fixture(); b.c[80] = NaN;
    for (const relation of LOW_RANGE_RELATIONS) {
      const out = lowRangeState(new SeriesCache(b), 24, "breakout", relation);
      assert.ok(out.slice(80, 105).every((x) => x === 0), `${relation} after invalid bar`);
      assert.ok(out.slice(170, 194).every((x) => x === 0), `${relation} after missing bars`);
    }
  });
  it("conditions past-move relations on prior closed prices and independently combines trend and breakout", () => {
    const b = fixture();
    let followed = 0, reversed = 0, neutral = 0;
    for (const window of LOW_RANGE_WINDOWS) for (const method of LOW_RANGE_METHODS) {
      const k = new SeriesCache(b);
      const base = lowRangeState(k, window, method, "standalone");
      const trend = lowRangeState(k, window, method, "trend");
      const breakout = lowRangeState(k, window, method, "breakout");
      const tf = lowRangeState(k, window, method, "trend-breakout");
      const follow = lowRangeState(k, window, method, "move-follow");
      const reverse = lowRangeState(k, window, method, "move-reverse");
      const trendFollow = lowRangeState(k, window, method, "trend-move-follow");
      const trendReverse = lowRangeState(k, window, method, "trend-move-reverse");
      const breakFollow = lowRangeState(k, window, method, "breakout-move-follow");
      const breakReverse = lowRangeState(k, window, method, "breakout-move-reverse");
      const bothFollow = lowRangeState(k, window, method, "trend-breakout-move-follow");
      const bothReverse = lowRangeState(k, window, method, "trend-breakout-move-reverse");
      for (let i = Math.max(window, 2); i < b.n; i++) {
        if (!base[i]) continue;
        let high = -Infinity, low = Infinity;
        for (let j = i - window; j < i; j++) { high = Math.max(high, b.h[j]); low = Math.min(low, b.l[j]); }
        const anchor = b.c[window === 1 ? i - 2 : i - window];
        const delta = Math.log1p((b.c[i - 1] - anchor) / anchor), threshold = Math.log1p((high - low) / low) * 0.2;
        const move = delta >= threshold ? 1 : delta <= -threshold ? -1 : 0;
        const f = move === base[i] ? base[i] : 0, r = move === -base[i] ? base[i] : 0;
        assert.equal(follow[i], f, `${window}/${method}/${i} follow`);
        assert.equal(reverse[i], r, `${window}/${method}/${i} reverse`);
        assert.equal(trendFollow[i], trend[i] && f ? base[i] : 0);
        assert.equal(trendReverse[i], trend[i] && r ? base[i] : 0);
        assert.equal(breakFollow[i], breakout[i] && f ? base[i] : 0);
        assert.equal(breakReverse[i], breakout[i] && r ? base[i] : 0);
        assert.equal(bothFollow[i], tf[i] && f ? base[i] : 0);
        assert.equal(bothReverse[i], tf[i] && r ? base[i] : 0);
        if (f) followed++; else if (r) reversed++; else neutral++;
      }
    }
    assert.ok(followed && reversed && neutral, "fixtures cover follow, reverse and insufficient movement");
  });
  it("keeps near-threshold past-move classifications under reciprocal price mirrors", () => {
    for (const fraction of [0.1999, 0.2001]) {
      const high = 100.5, low = 99.5, previous = 99.8;
      const anchor = previous / Math.exp(fraction * Math.log(high / low));
      const candles = Array.from({ length: 12 }, (_, i) => ({
        t: i * 60_000, o: i === 0 ? anchor : previous, c: i === 0 ? anchor : previous,
        h: high, l: low, v: 100,
      }));
      candles.push({ t: 12 * 60_000, o: previous, c: 100.2, h: 100.3, l: 99.7, v: 100 });
      const flipped = candles.map((x) => ({ ...x, o: 10_000 / x.o, c: 10_000 / x.c,
        h: 10_000 / x.l, l: 10_000 / x.h }));
      const a = lowRangeState(new SeriesCache(barsFromCandles("LR", 1, candles)), 12, "mid-reclaim", "move-follow");
      const z = lowRangeState(new SeriesCache(barsFromCandles("LR", 1, flipped)), 12, "mid-reclaim", "move-follow");
      assert.equal(a.at(-1), fraction > 0.2 ? 1 : 0);
      assert.equal(z.at(-1), fraction > 0.2 ? -1 : 0);
    }
  });
  it("uses all requested stop ratios and preserves cost-aware hard floors", () => {
    assert.deepEqual(LOW_RANGE_STEPS, [2, 3, 4, 5, 6]);
    assert.equal(LOW_RANGE_SL_RATIOS.length, 13);
    assert.equal(LOW_RANGE_SL_RATIOS[0], 0.5);
    assert.equal(LOW_RANGE_SL_RATIOS.at(-1), 3.5);
    const cost = 0.0015, step = 0.002;
    for (const n of LOW_RANGE_STEPS) for (const sl of LOW_RANGE_SL_RATIOS) {
      const p = lowRangeProtects({ step, cost, steps: [n], slRatios: [sl], trailRatios: [0, 0.25], tags: ["mc"] });
      assert.equal(p.length, 2);
      assert.equal(p[0].tp, +(cost + n * step).toFixed(9));
      assert.equal(p[0].sl, +(cost + Math.max(step, n * step * sl)).toFixed(9));
      assert.ok(p[1].trail >= cost + 2 * step - 1e-12);
      assert.equal(p[1].trailStep, 1);
    }
    const tags = new Set(lowRangeProtects().map((p) => p.tag));
    assert.deepEqual([...tags].sort(), ["mc", "mn", "sh"]);
    assert.throws(() => lowRangeProtects({ ...DEFAULT_LOW_RANGE_POLICY, step: NaN }));
    const fine = lowRangeProtects({ step: 0.00200000004, cost: 0.00150000004,
      steps: [2], slRatios: [0.5], trailRatios: [0.5], tags: ["mc"] })[0];
    assert.ok(fine.tp >= 0.00150000004 + 2 * 0.00200000004);
    assert.ok(fine.sl >= 0.00150000004 + 0.00200000004);
    assert.ok(fine.trail >= 0.00150000004 + 2 * 0.00200000004);
  });
  it("deducts modeled cost once for target and stop on both sides", () => {
    const policy = { ...DEFAULT_LOW_RANGE_POLICY, steps: [2], slRatios: [0.5], trailRatios: [0], tags: ["mc"] as const };
    const p = { ...lowRangeProtects(policy)[0], hold: 10 };
    for (const side of [1, -1] as const) for (const exit of ["tp", "sl"] as const) {
      const high = exit === "tp" ? (side === 1 ? 101 : 100.1) : (side === -1 ? 101 : 100.1);
      const low = exit === "tp" ? (side === -1 ? 99 : 99.9) : (side === 1 ? 99 : 99.9);
      const b = barsFromCandles("COST", 1, [
        { t: 0, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 },
        { t: 60000, o: 100, h: high, l: low, c: 100, v: 1 },
      ]);
      const result = simulate("follow|low-range-test", b, Int8Array.from([side, 0]), p, { cost: policy.cost });
      assert.equal(result.trades.length, 1);
      const expected = exit === "tp" ? p.tp - policy.cost : -p.sl - policy.cost;
      assert.ok(Math.abs(result.trades[0].r - expected) < 1e-12, `${side} ${exit}`);
    }
  });
  it("ratchets a trailing stop from the completed peak without loosening on both sides", () => {
    for (const side of [1, -1] as const) {
      const p = { side, entry: 100, stop: side === 1 ? 99 : 101, peak: 100, trailOn: false };
      ratchetTrail(p, 0.0055, 0.0055, side === 1 ? 101 : 100, side === -1 ? 99 : 100);
      assert.equal(p.trailOn, true);
      const oldStop = p.stop;
      ratchetTrail(p, 0.0055, 0.0055, 100, 100);
      assert.equal(p.stop, oldStop);
    }
  });
});
