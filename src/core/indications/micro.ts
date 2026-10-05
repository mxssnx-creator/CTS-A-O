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
// Market relations ("mc-lag-…", "mc-rsrev-…", "mc-mturn-…", "mc-act-…"): the events above see one symbol, and its
// stretch is mostly the market's own move (crypto symbols move together: the same RSI(2) dip on every symbol is a
// market dip, with nothing to revert to). These read the universe's equal-weight market of the same timeframe
// (market.ts: mean bar log return over the symbols, its cumulative index and the mean activity v / SMA60(v)) and
// fire on what the symbol does AGAINST it — the part a single-symbol event cannot separate. Beta and volatilities
// over the last 60 bars (microRel); a move over n bars is measured from the window that ends where it starts.
//   mc-lag-m        lead-lag catch-up: the market moved ≥ 2 of its volatilities over m bars (3 / 6 / 12) while the
//                   symbol's residual (its return − beta × the market's) lagged ≥ 1.5 residual volatilities: enter
//                   in the market's direction — a slower symbol follows a broad move with a delay (arbitrage,
//                   index and basket flows reach it last).
//   mc-rsrev-n      relative-strength reversion: the residual over n bars (3 / 6 / 12) beyond ±2.5 of its
//                   volatility, faded — an idiosyncratic overshoot without the market behind it mean-reverts
//                   (liquidity-driven, not news-driven, on most bars).
//   mc-mturn-lo     market turn: the market's RSI(2) was below lo (5 / 10; above 100 − lo) and the market turns
//                   back on this bar, the symbol's bar with it: enter with the turn — the market's reversal is the
//                   broad, persistent one, the symbol confirms it is taking part.
//   mc-act-idio-x   idiosyncratic activity: the symbol's activity is > x (2 / 3) × the market's on a bar beyond 2
//                   of its volatilities: fade the bar — a symbol-only burst (one large order, a liquidation) is
//                   absorbed and gives back part of its move.
//   mc-act-mkt-y    market-wide surge: the market's activity > y (1.8 / 2.5) × normal and its bar moves ≥ 1
//                   volatility while the symbol's bar goes the other way: enter with the market — a broad flow
//                   reaches the stragglers.
// AND combinations of a stretch with a relation filter: "mc-irsi2-10" RSI(2) 10 / 90 only while the market's RSI(2)
// is not beyond 25 / 75 the same way (an idiosyncratic stretch, not a market dip); "mc-mrsi2-10" RSI(2) 10 / 90
// with the market's bar already pointing the fade's way; "mc-iz-25" the 30-bar z 2.5 only when the symbol's 6-bar
// residual is ≥ 1 volatility the same way; "mc-ivwapd-2" the 2 ATR VWAP distance only on the symbol's own flow
// (its activity > 2 × the market's). Not yet measured on the exchange: Base decides per window like the others.
// Without a market reference (a series computed on its own) or alone in its timeframe they are neutral (no event).
//
// Causal: bar i reads bars 0..i only (the market at bar i: the universe's bars with open time ≤ its own). With grid.micro.ownInds (default on) the Micro range trades only these, and
// they trade only Micro cells.
import type { SeriesCache } from "./cache.ts";
import { MARKET_ACT_P, type MarketRef } from "./market.ts";
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

// ── market relations (the universe's market reference: market.ts) ──────────────────────────────────────────────

/** Rolling window (bars) of the beta and the volatilities of the market relations, and the pairs it needs. */
export const MICRO_REL = { win: 60, min: 40 } as const;

export interface MicroRel {
  /** the market at this series' bars */
  m: MarketRef;
  /** beta of the symbol's bar log returns on the market's over the last win bars (bar i included) */
  beta: Float64Array;
  /** volatility (sd) of the market's bar log returns over the same bars */
  sdm: Float64Array;
  /** volatility of the symbol's bar log returns */
  sds: Float64Array;
  /** volatility of the symbol's residual bar returns (symbol − beta × market) */
  sde: Float64Array;
}

/** the symbol's log return into bar i */
const lr = (c: Float64Array, i: number) => (i >= 1 ? Math.log(c[i] / c[i - 1]) : NaN);

/**
 * The series' relation to its market: rolling beta and volatilities over the last MICRO_REL.win bars (pairs where
 * both returns exist; NaN until MICRO_REL.min of them). null without a market reference, or with a market of one
 * series (the series itself): every relation indication is then neutral.
 */
export function microRel(k: SeriesCache): MicroRel | null {
  const m = k.market();
  if (!m || m.syms < 2) return null;
  return k.memo(`mc:rel:${MICRO_REL.win}`, () => {
    const n = k.b.n;
    const c = k.b.c;
    const W = MICRO_REL.win;
    const beta = new Float64Array(n).fill(NaN);
    const sdm = new Float64Array(n).fill(NaN);
    const sds = new Float64Array(n).fill(NaN);
    const sde = new Float64Array(n).fill(NaN);
    let cnt = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    const add = (i: number, s: number) => {
      const x = m.ret[i];
      const y = lr(c, i);
      if (!fin(x, y)) return;
      cnt += s;
      sx += s * x;
      sy += s * y;
      sxx += s * x * x;
      syy += s * y * y;
      sxy += s * x * y;
    };
    for (let i = 0; i < n; i++) {
      add(i, 1);
      if (i >= W) add(i - W, -1);
      if (cnt < MICRO_REL.min) continue;
      const mx = sx / cnt;
      const my = sy / cnt;
      const vx = sxx / cnt - mx * mx;
      const vy = syy / cnt - my * my;
      const cv = sxy / cnt - mx * my;
      if (!(vx > 0) || !(vy > 0)) continue;
      beta[i] = cv / vx;
      sdm[i] = Math.sqrt(vx);
      sds[i] = Math.sqrt(vy);
      sde[i] = Math.sqrt(Math.max(0, vy - (cv * cv) / vx));
    }
    return { m, beta, sdm, sds, sde };
  });
}

// (the relation values below are computed per bar from microRel's arrays, not stored: a stored series per window
// length cost 8 bytes × bars × series each, and these are O(1) per bar)

/**
 * The symbol's residual return over the last n bars (log(c_i / c_{i−n}) − beta × the market's), in units of its
 * residual volatility × √n; beta and volatility from the window that ends where the move starts (bar i − n), so the
 * move does not explain itself. + = the symbol outperformed its market. NaN in warm-up.
 */
function residZ(k: SeriesCache, r: MicroRel, n: number, i: number): number {
  const j = i - n;
  if (j < 0 || !fin(r.beta[j], r.sde[j], r.m.idx[i], r.m.idx[j]) || !(r.sde[j] > 1e-12)) return NaN;
  return (Math.log(k.b.c[i] / k.b.c[j]) - r.beta[j] * (r.m.idx[i] - r.m.idx[j])) / (r.sde[j] * Math.sqrt(n));
}

/** The market's move over the last n bars in units of its bar volatility × √n (volatility from bar i − n). */
function marketZ(r: MicroRel, n: number, i: number): number {
  const j = i - n;
  if (j < 0 || !fin(r.sdm[j], r.m.idx[i], r.m.idx[j]) || !(r.sdm[j] > 1e-12)) return NaN;
  return (r.m.idx[i] - r.m.idx[j]) / (r.sdm[j] * Math.sqrt(n));
}

/**
 * RSI(2) of the market index (Wilder, on the market's bar log returns; a bar without a market return counts as no
 * move). Mirrors exactly: the mirrored market's RSI is 100 − RSI. NaN in warm-up or without a relation.
 */
export function marketRsi2(k: SeriesCache): Float64Array {
  return k.memo("mc:mrsi2", () => {
    const n = k.b.n;
    const out = new Float64Array(n).fill(NaN);
    const r = microRel(k);
    if (!r) return out;
    const p = 2;
    let su = 0;
    let sd = 0;
    let au = 0;
    let ad = 0;
    for (let i = 1; i < n; i++) {
      const x = Number.isFinite(r.m.ret[i]) ? r.m.ret[i] : 0;
      const u = x > 0 ? x : 0;
      const d = x < 0 ? -x : 0;
      if (i <= p) {
        su += u;
        sd += d;
        if (i < p) continue;
        au = su / p;
        ad = sd / p;
      } else {
        au = (au * (p - 1) + u) / p;
        ad = (ad * (p - 1) + d) / p;
      }
      out[i] = ad === 0 ? (au === 0 ? 50 : 100) : 100 - 100 / (1 + au / ad);
    }
    return out;
  });
}

/** the symbol's activity over the market's at bar i: (v / SMA60(v)) ÷ the market activity (NaN in warm-up) */
function relActivity(k: SeriesCache, r: MicroRel, i: number): number {
  const vs = k.volSma(MARKET_ACT_P)[i];
  const a = r.m.act[i];
  return fin(vs, a) && vs > 0 && a > 0 ? k.b.v[i] / vs / a : NaN;
}

/**
 * Lead-lag catch-up: the market moved ≥ z0 of its volatility over the last m bars while the symbol lagged it (its
 * residual ≤ −r0 against an up-market, ≥ r0 against a down-market): enter in the market's direction.
 */
function lagEv(k: SeriesCache, m: number, z0: number, r0: number): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  return events(k.b.n, (i) => {
    const mz = marketZ(r, m, i);
    if (!(Math.abs(mz) > z0)) return 0;
    const rz = residZ(k, r, m, i);
    return mz > 0 && rz < -r0 ? 1 : mz < 0 && rz > r0 ? -1 : 0;
  });
}

/** Relative-strength reversion: the residual return over n bars beyond ±z0 of its volatility — fade it. */
function rsrevEv(k: SeriesCache, n: number, z0: number): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  return events(k.b.n, (i) => {
    const rz = residZ(k, r, n, i);
    return rz > z0 ? -1 : rz < -z0 ? 1 : 0;
  });
}

/**
 * Market turn: the market's RSI(2) was below lo (above 100 − lo) on the previous bar and the market turns up (down)
 * on this one, the symbol's bar turning with it: enter with the turn.
 */
function mturnEv(k: SeriesCache, lo: number): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  const mr = marketRsi2(k);
  const c = k.b.c;
  return events(k.b.n, (i) => {
    if (i < 1 || !fin(mr[i - 1], r.m.ret[i])) return 0;
    const s = lr(c, i);
    if (mr[i - 1] < lo && r.m.ret[i] > 0 && s > 0) return 1;
    if (mr[i - 1] > 100 - lo && r.m.ret[i] < 0 && s < 0) return -1;
    return 0;
  });
}

/**
 * Idiosyncratic activity spike: the symbol's activity is > x × the market's while its bar is stretched (its return
 * beyond zb of its own bar volatility before it): a symbol-only flow — fade the bar.
 */
function actIdioEv(k: SeriesCache, x: number, zb: number): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  const c = k.b.c;
  return events(k.b.n, (i) => {
    if (i < 1 || !(relActivity(k, r, i) > x) || !(r.sds[i - 1] > 1e-12)) return 0;
    const z = lr(c, i) / r.sds[i - 1];
    return z > zb ? -1 : z < -zb ? 1 : 0;
  });
}

/**
 * Market-wide activity surge: the market's activity is > y × normal and its bar moves ≥ 1 volatility while the
 * symbol's bar goes the other way: enter with the market (the symbol's counter-move is the lag of a broad flow).
 */
function actMktEv(k: SeriesCache, y: number): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  const c = k.b.c;
  return events(k.b.n, (i) => {
    if (i < 1 || !fin(r.m.act[i], r.m.ret[i], r.sdm[i - 1]) || !(r.m.act[i] > y) || !(r.sdm[i - 1] > 1e-12)) return 0;
    const z = r.m.ret[i] / r.sdm[i - 1];
    const s = lr(c, i);
    return z > 1 && s < 0 ? 1 : z < -1 && s > 0 ? -1 : 0;
  });
}

/** a stretch event kept only where `keep(i, dir)` holds (the relation filter of an AND combination) */
function relFilter(
  k: SeriesCache,
  ev: Int8Array,
  keep: (r: MicroRel, i: number, d: number) => boolean,
): Int8Array {
  const r = microRel(k);
  if (!r) return new Int8Array(k.b.n);
  return events(k.b.n, (i) => (ev[i] !== 0 && keep(r, i, ev[i]) ? ev[i] : 0));
}

/** Market-relation thresholds of the AND combinations. */
export const MICRO_REL_AND = { mrsi: 25, rz: 1, rzN: 6, act: 2 } as const;

/** ids of the Micro indications that read the market reference (neutral on a series without one) */
export const isMicroRelation = (base: string) => /^mc-(lag|rsrev|mturn|act|irsi2|mrsi2|iz|ivwapd)-/.test(base);

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
    // ── market relations: the symbol against its timeframe's equal-weight market (market.ts) ──
    // lead-lag: the market moved ≥ 2 volatilities over m bars, the symbol lagged by ≥ 1.5 residual volatilities
    ...([3, 6, 12] as const).map((m) =>
      spec(`mc-lag-${m}`, `Micro lag ${m} catch-up`, { m, z: 2, r: 1.5, win: MICRO_REL.win }, (k) => lagEv(k, m, 2, 1.5)),
    ),
    // relative-strength reversion: the residual return over n bars beyond 2.5 residual volatilities, faded
    ...([3, 6, 12] as const).map((n) =>
      spec(`mc-rsrev-${n}`, `Micro residual ${n} fade`, { n, z: 2.5, win: MICRO_REL.win }, (k) => rsrevEv(k, n, 2.5)),
    ),
    // market turn: the market's RSI(2) extreme turning back, the symbol turning with it
    ...([5, 10] as const).map((lo) =>
      spec(`mc-mturn-${lo}`, `Micro market RSI2 ${lo}/${100 - lo} turn`, { p: 2, lo }, (k) => mturnEv(k, lo)),
    ),
    // idiosyncratic activity spike (symbol activity ÷ market activity > x) on a bar beyond 2 volatilities: fade it
    ...([2, 3] as const).map((x) =>
      spec(`mc-act-idio-${x}`, `Micro own activity ${x}× market fade`, { p: MARKET_ACT_P, x, zb: 2 }, (k) =>
        actIdioEv(k, x, 2),
      ),
    ),
    // market-wide activity surge (> y × normal) with the symbol's bar against the market's: enter with the market
    ...([1.8, 2.5] as const).map((y) =>
      spec(`mc-act-mkt-${y * 10}`, `Micro market activity ${y}× catch-up`, { p: MARKET_ACT_P, y }, (k) => actMktEv(k, y)),
    ),
    // ── a stretch AND a market relation ──
    // an RSI(2) stretch the market does not share (its RSI(2) not beyond 25 / 75 the same way): idiosyncratic
    spec("mc-irsi2-10", "Micro RSI2 10/90, market not stretched", { p: 2, lo: 10, mlo: MICRO_REL_AND.mrsi }, (k) => {
      const mr = marketRsi2(k);
      const lo = MICRO_REL_AND.mrsi;
      return relFilter(k, rsi2Ev(k, 10), (_, i, d) => fin(mr[i]) && (d > 0 ? mr[i] > lo : mr[i] < 100 - lo));
    }),
    // an RSI(2) stretch while the market's bar already points the fade's way
    spec("mc-mrsi2-10", "Micro RSI2 10/90, market bar turning", { p: 2, lo: 10 }, (k) => {
      return relFilter(k, rsi2Ev(k, 10), (r, i, d) => d * r.m.ret[i] > 0);
    }),
    // a 30-bar z 2.5 stretch that is the symbol's own: its 6-bar residual ≥ 1 residual volatility the same way
    spec("mc-iz-25", "Micro z 2.5, residual stretch", { p: 30, z: 2.5, n: MICRO_REL_AND.rzN, rz: MICRO_REL_AND.rz }, (k) => {
      const t = MICRO_REL_AND.rz;
      return relFilter(k, zEv(k, 2.5), (r, i, d) => {
        const rz = residZ(k, r, MICRO_REL_AND.rzN, i);
        return d > 0 ? rz < -t : rz > t;
      });
    }),
    // a 2 ATR distance from the rolling VWAP made on the symbol's own flow: its activity > 2 × the market's
    spec("mc-ivwapd-2", "Micro VWAP 2 ATR, own activity", { p: 60, d: 2, act: MICRO_REL_AND.act }, (k) => {
      return relFilter(k, vwapdEv(k, 2), (r, i) => relActivity(k, r, i) > MICRO_REL_AND.act);
    }),
  ];
}
