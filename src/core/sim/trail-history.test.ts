// Signals: the trailing distance from pre-history on 1-minute prices (9 Oct). Failing tests first for the pieces: the
// give-back of a close is measured on the 1-minute path; the distance at t reads only the closes before t; the 1-minute
// exit follows `simulate` exactly on the same path (the reference is `simulate` run on the 1-minute bars).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars } from "../domain/types.ts";
import { simulate } from "./backtest.ts";
import {
  exitOn1m,
  giveBackOf,
  quantileOf,
  trailFromHistory,
  type GiveBackRecord,
} from "./trail-history.ts";

const MIN = 60_000;
const T0 = Date.UTC(2026, 8, 1);

/** 1-minute bars from a list of closes: each bar opens at the previous close, with a fixed wick above and below */
function barsFrom(closes: number[], wick = 0.001): Bars {
  const n = closes.length;
  const o = new Float64Array(n);
  const h = new Float64Array(n);
  const l = new Float64Array(n);
  const c = new Float64Array(n);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    o[i] = i === 0 ? closes[0] : closes[i - 1];
    c[i] = closes[i];
    h[i] = Math.max(o[i], c[i]) * (1 + wick);
    l[i] = Math.min(o[i], c[i]) * (1 - wick);
    t[i] = T0 + i * MIN;
  }
  return { sym: "AAA-USDT", tfMin: 1, n, t, o, h, l, c, v: new Float64Array(n) };
}

/** a seeded random walk of closes (deterministic, so a failure reproduces) */
function walk(seed: number, n: number, vol: number): number[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const out: number[] = [];
  let x = 100;
  for (let i = 0; i < n; i++) {
    x *= 1 + (rnd() - 0.5) * 2 * vol;
    out.push(x);
  }
  return out;
}

describe("the give-back of a close is measured on the 1-minute path", () => {
  it("a long's give-back is its best high less its exit, as a fraction of the entry", () => {
    // entry 100; the path climbs to 110 and falls back to 104 at the exit: give-back 6 / 100
    const bars = barsFrom([100, 105, 110, 108, 104]);
    bars.h.fill(0);
    bars.l.fill(0);
    bars.h.set([100, 105, 110, 108, 104]);
    bars.l.set([99, 104, 109, 104, 103]);
    const gb = giveBackOf(bars, 1, 100, T0, T0 + 5 * MIN, 104);
    assert.ok(Math.abs(gb - 0.06) < 1e-12, `gb ${gb}`);
  });

  it("a short's give-back is its exit less its best low, and never negative", () => {
    const bars = barsFrom([100, 95, 90, 92]);
    bars.h.set([100, 96, 95, 93]);
    bars.l.set([99, 94, 89, 91]);
    // the best low is 89; the exit at 92 gives back 3 / 100
    assert.ok(Math.abs(giveBackOf(bars, -1, 100, T0, T0 + 4 * MIN, 92) - 0.03) < 1e-12);
    // a close at its best point gives nothing back (the best high of this path is 100; a long exiting there gives 0)
    assert.equal(
      giveBackOf(bars, 1, 100, T0, T0 + 4 * MIN, 100),
      0,
      "no give-back when the exit is the best high",
    );
    assert.equal(
      giveBackOf(bars, -1, 100, T0, T0 + 4 * MIN, 89),
      0,
      "no give-back when a short exits at its best low",
    );
  });

  it("only the bars inside the trade count (the bar that opens at the exit is not part of it)", () => {
    const bars = barsFrom([100, 100, 100, 100]);
    bars.h.set([101, 101, 150, 150]);
    bars.l.set([99, 99, 99, 99]);
    // the trade lasts two minutes: its best high is 101 (the 150 bar opens at the exit and is not in the trade)
    assert.ok(Math.abs(giveBackOf(bars, 1, 100, T0, T0 + 2 * MIN, 100) - 0.01) < 1e-12);
  });
});

describe("the distance from pre-history is causal and clamped", () => {
  const recs: GiveBackRecord[] = [
    { exitT: T0 + 1 * MIN, gb: 0.01 },
    { exitT: T0 + 2 * MIN, gb: 0.02 },
    { exitT: T0 + 3 * MIN, gb: 0.03 },
    { exitT: T0 + 4 * MIN, gb: 0.04 },
  ];
  const o = { q: 0.5, window: 10, floor: 0, cap: 1, fallback: 0.005 };

  it("reads only the closes that exited at or before t", () => {
    // at t = 2 min the records are 0.01 and 0.02: their median is 0.015
    assert.ok(Math.abs(trailFromHistory(recs, T0 + 2 * MIN, o) - 0.015) < 1e-12);
    // a record after t changes nothing at t
    const future = [...recs, { exitT: T0 + 9 * MIN, gb: 0.5 }];
    assert.equal(
      trailFromHistory(future, T0 + 2 * MIN, o),
      trailFromHistory(recs, T0 + 2 * MIN, o),
    );
  });

  it("judges only the last `window` closes before t", () => {
    // window 2 at t = 4 min: the last two records (0.03, 0.04): median 0.035
    assert.ok(Math.abs(trailFromHistory(recs, T0 + 4 * MIN, { ...o, window: 2 }) - 0.035) < 1e-12);
  });

  it("is never below the floor nor above the cap, and the fallback applies with no record", () => {
    assert.equal(trailFromHistory(recs, T0 + 2 * MIN, { ...o, floor: 0.05 }), 0.05, "floor");
    assert.equal(trailFromHistory(recs, T0 + 4 * MIN, { ...o, cap: 0.02 }), 0.02, "cap");
    assert.equal(trailFromHistory([], T0, o), 0.005, "no profitable close yet: the fallback");
    assert.equal(trailFromHistory(recs, T0, o), 0.005, "no close before t: the fallback");
  });
});

describe("quantiles", () => {
  it("interpolate linearly between the nearest ranks", () => {
    assert.equal(quantileOf([1, 2, 3, 4, 5], 0.5), 3);
    assert.equal(quantileOf([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(quantileOf([1, 2, 3, 4], 0), 1);
    assert.equal(quantileOf([1, 2, 3, 4], 1), 4);
    assert.ok(Number.isNaN(quantileOf([], 0.5)));
  });
});

describe("the 1-minute exit follows simulate on the same path", () => {
  // a deterministic set of cases: random walks with 1-minute volatility, several protects (fixed trail, trail free, step)
  const cases: Array<{
    seed: number;
    tp: number;
    sl: number;
    trail: number;
    trailStep?: number;
    trailFree?: boolean;
    hold: number;
    side: 1 | -1;
    at: number;
  }> = [];
  for (let k = 0; k < 120; k++) {
    cases.push({
      seed: 1000 + k,
      tp: [0.004, 0.008, 0.015][k % 3],
      sl: [0.003, 0.006][k % 2],
      trail: [0, 0.002, 0.004][k % 3],
      trailStep: k % 4 === 0 ? 0.5 : undefined,
      trailFree: k % 5 === 0,
      hold: [30, 90, 240][k % 3],
      side: k % 2 === 0 ? 1 : -1,
      at: 5 + (k % 40),
    });
  }

  for (const c of cases) {
    it(`case ${c.seed}: ${c.side > 0 ? "long" : "short"}, tp ${c.tp} sl ${c.sl} trail ${c.trail} hold ${c.hold}`, () => {
      const bars = barsFrom(walk(c.seed, 400, 0.002));
      const sig = new Int8Array(bars.n);
      sig[c.at] = c.side;
      const protect = {
        tp: c.tp,
        sl: c.sl,
        trail: c.trail,
        trailStep: c.trailStep,
        trailFree: c.trailFree,
        hold: c.hold,
      };
      const ref = simulate("ref", bars, sig, protect as never, { cost: 0 });
      const mine = exitOn1m(bars, c.side as 1 | -1, c.at + 1, protect);
      if (ref.trades.length === 0) {
        assert.equal(mine, null, "simulate closes nothing, so the walk does not exit either");
        return;
      }
      const x = ref.trades[0];
      assert.ok(mine, "an exit");
      assert.equal(bars.t[mine.exitI] + MIN, x.exitT, "exit bar");
      assert.equal(mine.exit, x.exit, "exit price");
      assert.equal(mine.reason, x.reason, "exit reason");
    });
  }

  it("a gap through the stop fills at the open, as simulate does", () => {
    const bars = barsFrom([100, 100, 100, 100]);
    bars.o.set([100, 100, 90, 90]);
    bars.h.set([100.1, 100.1, 90.5, 90.5]);
    bars.l.set([99.9, 99.9, 89.5, 89.5]);
    const x = exitOn1m(bars, 1, 0, { tp: 0.05, sl: 0.01, trail: 0, hold: 10 });
    assert.ok(x);
    assert.equal(x.reason, "sl");
    assert.equal(x.exit, 90, "the open of the gap bar, not the stop");
  });
});
