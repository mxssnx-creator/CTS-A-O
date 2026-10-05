// Micro indications ("mc-…"): fast reversal entries for the Micro range (net targets 0.1–0.4 % after the round-trip
// cost, price targets 0.3–0.6 % at the 0.2 % cost). A Micro target is one to three times the cost, so only entries
// with a high hit rate on a short pullback can clear it: each fires on the one bar its stretch shows (RSI(2) extreme,
// a close outside a wide Bollinger band that turns back, a rejected spike, a run of same-direction closes, a large
// distance from the rolling VWAP or mean) and points back against the stretch.
//
// Trend-aligned variants ("mc-t…", "mc-turn-…"): the same stretch taken only in the direction of the 4× timeframe's
// trend (its close against its EMA(50), from completed higher bars) — a dip bought in an uptrend, a rip sold in a
// downtrend — and the turn variants only once the next bar closes beyond the stretched bar (the confirmation, not the
// extreme bar). Measured on 50 BingX symbols × 20 days (14 Sep – 4 Oct 2026, every Micro cell, engine simulation,
// 0.2 % cost): the plain events have no gross edge (the move after them is symmetric: 15m RSI(2) MFE 0.33 % vs MAE
// 0.33 % over 15 minutes), Micro's Base cell (0.45 % / 0.9 %) PF 0.27–0.50 on every lane; the trend-aligned ones
// lift it to 0.35–0.58 and the best cell of a lane to 0.87 (30m), still below PF 1 — a 0.3–0.6 % target needs a win
// rate of 80–90 % against a 1–2 % stop after the cost. What edge they have shows at larger distances: 1.5–2 ATR
// (15m / 30m) targets PF 1.15–1.2 in each of the three weeks (every signal, overlapping); in the engine with fixed
// targets the best is z 2.5 with the trend on 30m at 1.6 % / 2× (PF 1.15; weeks 1.68 / 1.10 / 1.04).
//
// Quiet-market variant ("mc-qrsi2-5"): RSI(2) 5 / 95 only while ADX(14) < 12 and the Bollinger width is below its
// 100-bar median — the closest of ~190 tested Micro entries to break-even at Micro's distances: 15m, 0.6 % / 3.5×
// PF 1.11 (204 trades, weeks 0.98 / 1.13 / 1.22, win rate 85 %), but an isolated peak (ADX < 10: 0.76, < 14: 0.96,
// without the width filter 1.00; 2 of its 273 cells ≥ 1.05), so Base decides per window.
//
// Causal: bar i reads bars 0..i only. With grid.micro.ownInds (default on) the Micro range trades only these, and
// they trade only Micro cells.
import type { SeriesCache } from "./cache.ts";
import type { IndicationSpec } from "./registry.ts";

const fin = (...xs: number[]) => xs.every((x) => Number.isFinite(x));

/** one-bar event series: f returns +1 / −1 on the firing bar, 0 otherwise (NaN in warm-up = 0) */
function events(n: number, f: (i: number) => number): Int8Array {
  const out = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const v = f(i);
    out[i] = v > 0 ? 1 : v < 0 ? -1 : 0;
  }
  return out;
}

const spec = (id: string, label: string, params: Record<string, number>, fn: (k: SeriesCache) => Int8Array) =>
  ({ id, kind: "active", label, params, fn }) as IndicationSpec;

export const isMicroInd = (base: string) => base.startsWith("mc-");

// ── the stretch events (memoized per series: the trend variants reuse them) ─────────────────────────────────────

/** RSI(2) below lo (+1) / above 100 − lo (−1) */
const rsi2Ev = (k: SeriesCache, lo: number) =>
  k.memo(`mc:rsi2:${lo}`, () => {
    const r = k.rsi(2);
    return events(k.b.n, (i) => (fin(r[i]) ? (r[i] < lo ? 1 : r[i] > 100 - lo ? -1 : 0) : 0));
  });

/** a close outside Bollinger(20, m) and the next bar turning back */
const bbxEv = (k: SeriesCache, m: number) =>
  k.memo(`mc:bbx:${m}`, () => {
    const { up, lo } = k.bb(20, m);
    const c = k.b.c;
    return events(k.b.n, (i) => {
      if (i < 1 || !fin(up[i - 1], lo[i - 1])) return 0;
      if (c[i - 1] < lo[i - 1] && c[i] > c[i - 1]) return 1;
      if (c[i - 1] > up[i - 1] && c[i] < c[i - 1]) return -1;
      return 0;
    });
  });

/** a spike bar (range ≥ x × the prior 20-bar average) rejected: it closes in its opposite third */
const spikeEv = (k: SeriesCache, x: number) =>
  k.memo(`mc:spike:${x}`, () => {
    const rs = k.rangeSma(20);
    const { o, h, l, c } = k.b;
    return events(k.b.n, (i) => {
      if (i < 1 || !fin(rs[i - 1])) return 0;
      const r = h[i] - l[i];
      if (!(r >= x * rs[i - 1]) || !(r > 0)) return 0;
      const pos = (c[i] - l[i]) / r;
      if (c[i] < o[i] && pos > 0.6) return 1;
      if (c[i] > o[i] && pos < 0.4) return -1;
      return 0;
    });
  });

/** n closes in a row the same way: fade the run on its n-th bar */
const streakEv = (k: SeriesCache, n: number) =>
  k.memo(`mc:streak:${n}`, () => {
    const c = k.b.c;
    return events(k.b.n, (i) => {
      if (i < n) return 0;
      let up = 0;
      let dn = 0;
      for (let j = i - n + 1; j <= i; j++) {
        if (c[j] > c[j - 1]) up++;
        else if (c[j] < c[j - 1]) dn++;
      }
      return dn === n ? 1 : up === n ? -1 : 0;
    });
  });

/** distance from the rolling 60-bar VWAP beyond d × ATR(14) */
const vwapdEv = (k: SeriesCache, d: number) =>
  k.memo(`mc:vwapd:${d}`, () => {
    const vw = k.vwap(60);
    const a = k.atr(14);
    const c = k.b.c;
    return events(k.b.n, (i) => {
      if (!fin(vw[i], a[i]) || !(a[i] > 0)) return 0;
      const z = (c[i] - vw[i]) / a[i];
      return z < -d ? 1 : z > d ? -1 : 0;
    });
  });

/** z-score of the close over 30 bars beyond z */
const zEv = (k: SeriesCache, z: number) =>
  k.memo(`mc:z:${z}`, () => {
    const zs = k.z(30);
    return events(k.b.n, (i) => (fin(zs[i]) ? (zs[i] < -z ? 1 : zs[i] > z ? -1 : 0) : 0));
  });

// ── trend and confirmation ───────────────────────────────────────────────────────────────────────────────────────

/** Higher-timeframe factor and EMA period of the Micro trend filter. */
export const MICRO_TREND = { factor: 4, ema: 50 } as const;

/**
 * Trend of the 4× timeframe at each bar: +1 when the last COMPLETED higher bar closed above its EMA(50), −1 below,
 * 0 before the first one (or warm-up). Causal: a higher bar counts only from the lane bar it closes with.
 */
export function microTrend(k: SeriesCache): Int8Array {
  return k.memo(`mc:trend:${MICRO_TREND.factor}:${MICRO_TREND.ema}`, () => {
    const { k: hk, map } = k.htf(MICRO_TREND.factor);
    const e = hk.ema(MICRO_TREND.ema);
    const hc = hk.b.c;
    const out = new Int8Array(k.b.n);
    for (let i = 0; i < k.b.n; i++) {
      const j = map[i];
      if (j < 0 || !fin(e[j])) continue;
      out[i] = hc[j] > e[j] ? 1 : hc[j] < e[j] ? -1 : 0;
    }
    return out;
  });
}

/** the stretch event only where it points with the trend */
function withTrend(k: SeriesCache, ev: Int8Array): Int8Array {
  const tr = microTrend(k);
  return events(k.b.n, (i) => (ev[i] !== 0 && ev[i] === tr[i] ? ev[i] : 0));
}

/**
 * The turn after a stretch, with the trend: the stretch fired on the previous bar, this bar closes beyond the
 * stretched bar's high (long) / low (short), and the trend points the same way.
 */
function turnWithTrend(k: SeriesCache, ev: Int8Array): Int8Array {
  const tr = microTrend(k);
  const { h, l, c } = k.b;
  return events(k.b.n, (i) => {
    if (i < 1) return 0;
    const d = ev[i - 1];
    if (!d || tr[i] !== d) return 0;
    return d > 0 && c[i] > h[i - 1] ? 1 : d < 0 && c[i] < l[i - 1] ? -1 : 0;
  });
}

/** Quiet-market filter of the Micro range reversion: ADX(14) below this and the Bollinger width below its median. */
export const MICRO_QUIET = { adx: 12, widthRank: 0.5, lookback: 100 } as const;

/**
 * Rank of the Bollinger(20, 2) width at each bar among the previous `lookback` widths (0 = the narrowest, NaN in
 * warm-up). Causal: bar i compares with bars i − lookback … i − 1.
 */
export function bbWidthRank(k: SeriesCache, lookback: number = MICRO_QUIET.lookback): Float64Array {
  return k.memo(`mc:wrank:${lookback}`, () => {
    const { width } = k.bb(20, 2);
    const out = new Float64Array(k.b.n).fill(NaN);
    for (let i = lookback; i < k.b.n; i++) {
      if (!Number.isFinite(width[i])) continue;
      let below = 0;
      let cnt = 0;
      for (let j = i - lookback; j < i; j++)
        if (Number.isFinite(width[j])) {
          cnt++;
          if (width[j] < width[i]) below++;
        }
      if (cnt > lookback / 2) out[i] = below / cnt;
    }
    return out;
  });
}

/** the stretch event only in a quiet, trendless market (ADX(14) < 12 and the band narrower than its median) */
function inQuiet(k: SeriesCache, ev: Int8Array): Int8Array {
  const { adx } = k.dmi(14);
  const wr = bbWidthRank(k);
  return events(k.b.n, (i) => (ev[i] !== 0 && fin(adx[i], wr[i]) && adx[i] < MICRO_QUIET.adx && wr[i] < MICRO_QUIET.widthRank ? ev[i] : 0));
}

export function microSpecs(): IndicationSpec[] {
  return [
    // RSI(2) at an extreme: the last two bars stretched one way
    ...([5, 10] as const).map((lo) =>
      spec(`mc-rsi2-${lo}`, `Micro RSI2 ${lo}/${100 - lo}`, { p: 2, lo }, (k) => rsi2Ev(k, lo)),
    ),
    // a close outside Bollinger(20, k) and the next bar turning back
    ...([2, 2.5] as const).map((m) => spec(`mc-bbx-${m * 10}`, `Micro BB ${m} turn`, { p: 20, m }, (k) => bbxEv(k, m))),
    // a spike bar (range ≥ x × the prior 20-bar average) rejected: it closes in its opposite third
    ...([2, 2.5] as const).map((x) => spec(`mc-spike-${x}`, `Micro spike ${x}× fade`, { p: 20, x }, (k) => spikeEv(k, x))),
    // n closes in a row the same way: fade the run on its n-th bar
    ...([4, 6] as const).map((n) => spec(`mc-streak-${n}`, `Micro streak ${n} fade`, { n }, (k) => streakEv(k, n))),
    // distance from the rolling 60-bar VWAP in ATR(14) units
    ...([2, 3] as const).map((d) => spec(`mc-vwapd-${d}`, `Micro VWAP ${d} ATR`, { p: 60, d }, (k) => vwapdEv(k, d))),
    // z-score of the close over 30 bars
    ...([2, 2.5] as const).map((z) => spec(`mc-z-${z * 10}`, `Micro z ${z}`, { p: 30, z }, (k) => zEv(k, z))),
    // ── with the 4× timeframe's trend (a dip in an uptrend, a rip in a downtrend) ──
    spec("mc-trsi2-10", "Micro RSI2 10/90 with the trend", { p: 2, lo: 10, htf: 4, ema: 50 }, (k) =>
      withTrend(k, rsi2Ev(k, 10)),
    ),
    spec("mc-tbbx-25", "Micro BB 2.5 turn with the trend", { p: 20, m: 2.5, htf: 4, ema: 50 }, (k) =>
      withTrend(k, bbxEv(k, 2.5)),
    ),
    spec("mc-tvwapd-3", "Micro VWAP 3 ATR with the trend", { p: 60, d: 3, htf: 4, ema: 50 }, (k) =>
      withTrend(k, vwapdEv(k, 3)),
    ),
    spec("mc-tz-25", "Micro z 2.5 with the trend", { p: 30, z: 2.5, htf: 4, ema: 50 }, (k) => withTrend(k, zEv(k, 2.5))),
    // ── the turn bar after the stretch, with the trend (the confirmation, not the extreme bar) ──
    spec("mc-turn-10", "Micro RSI2 10/90 turn with the trend", { p: 2, lo: 10, htf: 4, ema: 50 }, (k) =>
      turnWithTrend(k, rsi2Ev(k, 10)),
    ),
    spec("mc-tstreak-4", "Micro streak 4 turn with the trend", { n: 4, htf: 4, ema: 50 }, (k) =>
      turnWithTrend(k, streakEv(k, 4)),
    ),
    // ── reversion only in a quiet, trendless market (the closest to break-even at Micro's distances) ──
    spec("mc-qrsi2-5", "Micro RSI2 5/95 in a quiet market", { p: 2, lo: 5, adx: 12, wq: 0.5 }, (k) =>
      inQuiet(k, rsi2Ev(k, 5)),
    ),
  ];
}
