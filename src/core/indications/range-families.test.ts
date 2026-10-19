// Range families (cfl-, htfpb-, rgm-, cmpx-, orb-, rel-): registered, causal, mirror-symmetric, and each fires on a
// hand-built pattern of its own and not on its absence.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cflBreak,
  cflTrend,
  compressionBreak,
  htfPullback,
  isRangeFamily,
  openingRangeBreak,
  ORB_SESSIONS,
  rangeFamilySpecs,
  regimeTactic,
  relDivergence,
  relStrength,
  rollingRank,
} from "./range-families.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { SeriesCache } from "./cache.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import type { Bars } from "../domain/types.ts";

const T0 = Date.UTC(2026, 8, 20);
const M15 = 15 * 60_000;

/** 15m bars from per-bar returns: open = previous close, a 0.02 % wick each side, volume 1000 unless given */
function fromReturns(rets: readonly number[], vol?: readonly number[], t0 = T0): Bars {
  const n = rets.length;
  const b: Bars = {
    sym: "P-USDT",
    tfMin: 15,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n),
  };
  let p = 100;
  for (let i = 0; i < n; i++) {
    const o = p;
    p = o * (1 + rets[i]);
    b.t[i] = t0 + i * M15;
    b.o[i] = o;
    b.c[i] = p;
    b.h[i] = Math.max(o, p) * 1.0002;
    b.l[i] = Math.min(o, p) * 0.9998;
    b.v[i] = vol?.[i] ?? 1000;
  }
  return b;
}
const k = (b: Bars) => new SeriesCache(b);
const last = (a: Int8Array) => a[a.length - 1];
const alt = (n: number, x: number) => Array.from({ length: n }, (_, i) => (i % 2 ? x : -x));
/** a sideways market of mixed bar sizes (a perfect ±x alternation is degenerate: equal highs / lows, constant width) */
const chop = (n: number) =>
  Array.from({ length: n }, (_, i) => 0.003 * Math.sin(i * 1.3) + 0.002 * Math.sin(i * 0.7) + 0.0015 * Math.sin(i * 2.9));

describe("range families", () => {
  it("17 indications, registered under their prefixes, ids [a-z0-9.-] with a horizon parameter", () => {
    const specs = rangeFamilySpecs();
    assert.equal(specs.length, 17);
    for (const s of specs) {
      assert.ok(INDICATION_BY_ID.get(s.id) === s || INDICATION_BY_ID.get(s.id)?.id === s.id, s.id);
      assert.match(s.id, /^[a-z0-9.-]+$/);
      assert.ok(isRangeFamily(s.id), s.id);
      assert.ok(["p", "n", "look"].some((x) => Number.isFinite(s.params[x])), `${s.id} horizon`);
    }
    assert.equal(isRangeFamily("rsi-mom-14-20"), false);
  });

  it("causal: the state at bar i is the same computed on bars 0..i only (15m, every family)", () => {
    const cs = syntheticCandles("A-USDT", 15, 2500, Date.UTC(2026, 9, 1), 7);
    const b = barsFromCandles("A-USDT", 15, cs);
    const u = makeUniverse([b, barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 2500, Date.UTC(2026, 9, 1), 8))]);
    const cut = 1700;
    const bc = barsFromCandles("A-USDT", 15, cs.slice(0, cut + 1));
    const uc = makeUniverse([bc, barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 2500, Date.UTC(2026, 9, 1), 8).slice(0, cut + 1))]);
    let firing = 0;
    for (const s of rangeFamilySpecs()) {
      const a = s.fn(u.caches[0]);
      const p = s.fn(uc.caches[0]);
      if (a.some((x) => x !== 0)) firing++;
      for (let i = 0; i <= cut; i++) assert.equal(p[i], a[i], `${s.id} bar ${i}`);
    }
    assert.ok(firing >= 14, `${firing} of 17 fire on synthetic bars`);
  });

  it("cfl-trend: an accelerating trend that EMA, MACD and ADX all confirm; nothing in a chop", () => {
    const up = Array.from({ length: 300 }, (_, i) => 0.0004 + i * 0.00001 + (i % 2 ? 0.0006 : -0.0006));
    assert.equal(last(cflTrend(k(fromReturns(up)), 20)), 1);
    assert.equal(last(cflTrend(k(fromReturns(up.map((x) => -x))), 20)), -1);
    // a sideways market: ADX stays under 20
    assert.ok(cflTrend(k(fromReturns(chop(400))), 20).slice(100).every((x) => x === 0));
  });

  it("cfl-break: a Donchian break on 1.5× volume closing at its high fires; light volume or a wick does not", () => {
    const base = alt(80, 0.001);
    const vol = [...Array(80).fill(1000), 3000];
    assert.equal(last(cflBreak(k(fromReturns([...base, 0.02], vol)), 20)), 1);
    assert.equal(last(cflBreak(k(fromReturns([...base, -0.02], vol)), 20)), -1);
    // 1.2× the average volume: not a break with participation
    assert.equal(last(cflBreak(k(fromReturns([...base, 0.02], [...Array(80).fill(1000), 1200])), 20)), 0);
    // the bar's high far above its close (a wick back into the range): close location under 70 %
    const w = fromReturns([...base, 0.02], vol);
    w.h[80] = w.c[80] * 1.03;
    assert.equal(last(cflBreak(k(w), 20)), 0);
  });

  it("htfpb: pullbacks in a higher-timeframe uptrend give longs only; the mirrored market shorts only", () => {
    // an uptrend with a three-bar dip every 20 bars, the fourth bar turning up
    const rets = Array.from({ length: 1200 }, (_, i) => {
      const ph = i % 20;
      return ph >= 16 && ph <= 18 ? -0.004 : ph === 19 ? 0.004 : 0.0012;
    });
    const a = htfPullback(k(fromReturns(rets)), 4);
    const m = htfPullback(k(fromReturns(rets.map((x) => -x / (1 + x)))), 4);
    assert.ok(a.filter((x) => x === 1).length >= 10, "longs on the dips");
    assert.equal(a.filter((x) => x === -1).length, 0);
    assert.ok(m.filter((x) => x === -1).length >= 10, "shorts on the mirrored rallies");
    assert.equal(m.filter((x) => x === 1).length, 0);
    // before 50 completed 4× bars (the higher EMA's warm-up): nothing
    assert.ok(a.slice(0, 4 * 50 - 1).every((x) => x === 0));
  });

  it("rolling rank: ties count half, the newest extreme ranks at the end", () => {
    const flat = rollingRank(new Float64Array(10).fill(2), 5);
    assert.equal(flat[9], 0.5);
    const rising = rollingRank(Float64Array.from({ length: 10 }, (_, i) => i), 5);
    assert.equal(rising[9], 0.9);
    assert.ok(Number.isNaN(rising[3]));
  });

  it("rgm: in quiet markets a z-stretch that turns back is faded; in loud ones a Donchian break is followed", () => {
    // loud, then quiet (ATR in the bottom quarter of the last 200 bars), then five down bars and an up bar
    const quietStretch = [...alt(300, 0.01), ...alt(60, 0.0005), -0.003, -0.003, -0.003, -0.003, -0.003, 0.002];
    assert.equal(last(regimeTactic(k(fromReturns(quietStretch)), 20)), 1);
    assert.equal(last(regimeTactic(k(fromReturns(quietStretch.map((x) => -x / (1 + x)))), 20)), -1);
    // quiet, then loud (ATR in the top quarter) and a bar above the 20-bar high: with the move
    const loudBreak = [...alt(300, 0.0005), ...alt(30, 0.01), 0.04];
    assert.equal(last(regimeTactic(k(fromReturns(loudBreak)), 20)), 1);
    // a sideways market of steady volatility, no stretch and no break: nothing
    assert.equal(last(regimeTactic(k(fromReturns([...chop(400), 0.002])), 20)), 0);
  });

  it("cmpx: a squeeze (BB width in its lowest fifth) and a close outside the band; no squeeze, no signal", () => {
    const squeeze = [...alt(200, 0.005), ...alt(40, 0.0002), 0.01];
    assert.equal(last(compressionBreak(k(fromReturns(squeeze)), 100)), 1);
    assert.equal(last(compressionBreak(k(fromReturns(squeeze.map((x) => -x / (1 + x)))), 100)), -1);
    // the same close outside the band after widening bars (the width at its highest, no squeeze)
    const widening = Array.from({ length: 240 }, (_, i) => (i % 2 ? 1 : -1) * (0.002 + i * 0.00003));
    assert.equal(last(compressionBreak(k(fromReturns([...widening, 0.03])), 100)), 0);
  });

  it("orb: the first close beyond the Asia opening range within 6 h, once per side; nothing after the window", () => {
    // 15m bars from 00:00 UTC: the first four (00:00–01:00) are the range
    const day = Date.UTC(2026, 8, 21);
    const rets = [0.002, -0.004, 0.003, 0, 0.001, 0.01, 0.005, -0.03, -0.001, ...Array(40).fill(0)];
    const b = fromReturns(rets, undefined, day);
    const a = openingRangeBreak(k(b), ORB_SESSIONS.asia);
    // bar 5 (01:15) closes above the range high: long; bar 6 above it again: no second event; bar 7 below the low: short
    assert.deepEqual([...a.slice(0, 9)], [0, 0, 0, 0, 0, 1, 0, -1, 0]);
    // a close beyond the range after 07:00 (6 h after the range) is outside the window
    const late = fromReturns([0.002, -0.004, 0.003, 0, ...Array(24).fill(0), 0.05], undefined, day);
    assert.equal(last(openingRangeBreak(k(late), ORB_SESSIONS.asia)), 0);
    // a lane slower than the range (2 h bars) never forms one
    const slow = { ...fromReturns(rets, undefined, day), tfMin: 120 };
    assert.ok(openingRangeBreak(k(slow), ORB_SESSIONS.asia).every((x) => x === 0));
  });

  it("rel-str / rel-div: a leader with the market, a straggler against it; neutral without a market", () => {
    // six symbols: a shared market move with their own noise, then 12 bars of a broad rally
    const N = 260;
    const noise = (s: number, i: number) => 0.002 * Math.sin(i * 1.7 + s * 2.3) + 0.0015 * Math.sin(i * 0.37 + s);
    const common = (i: number) => 0.002 * Math.sin(i * 0.9);
    const series = (s: number, tail: (i: number) => number) =>
      Array.from({ length: N }, (_, i) => (i < N - 12 ? common(i) + noise(s, i) : tail(i)));
    const leader = series(0, () => 0.01);
    const straggler = series(1, () => -0.002);
    const others = [2, 3, 4, 5].map((s) => series(s, () => 0.005));
    const bars = [leader, straggler, ...others].map((r, s) => ({ ...fromReturns(r), sym: `S${s}-USDT` }));
    const u = makeUniverse(bars);
    assert.equal(last(relStrength(u.caches[0], 12)), 1, "the leader of the rally");
    assert.equal(last(relStrength(u.caches[1], 12)), 0, "the straggler is no leader");
    const d = relDivergence(u.caches[1], 12);
    assert.equal(d.slice(N - 12).filter((x) => x === 1).length, 1, "one catch-up long on the divergence's first bar");
    assert.equal(d.slice(N - 12).filter((x) => x === -1).length, 0);
    assert.ok(relDivergence(u.caches[0], 12).slice(N - 12).every((x) => x === 0), "the leader does not diverge");
    // a series on its own (no market reference): neutral
    assert.ok(relStrength(k(fromReturns(leader)), 12).every((x) => x === 0));
    assert.ok(relDivergence(k(fromReturns(straggler)), 12).every((x) => x === 0));
  });
});
