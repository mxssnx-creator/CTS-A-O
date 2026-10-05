// Market reference of a universe: per timeframe, an equal-weight market index and a market activity series built
// from every series of that timeframe, so an indication can read what the symbol does RELATIVE to the market (a
// symbol lagging a market move, a residual stretch, an idiosyncratic volume spike) — information a single-symbol
// indication cannot see.
//
//   ret[g]  market log return of grid bar g: the mean, over the series with a bar at that open time and a previous
//           bar, of log(c / c_prev) (NaN when no series has both)
//   idx[g]  cumulative market log index: Σ ret up to g (0 at the grid's first bar, a NaN return adds nothing)
//   act[g]  market activity: the mean, over the series with a bar at g, of v / its own rolling 60-bar SMA of v
//           (the SMA includes the bar; NaN until some series has 60 bars)
//
// The grid is the union of the open times of the timeframe's series, so every series aligns to it by time; a
// series without gaps is a contiguous run of the grid and its aligned arrays are views (no copy). Strictly causal:
// grid bar g reads only bars with open time ≤ t[g] (bars that close with it at the latest), so a universe cut at
// any time gives the same values up to the cut. A series alone in its timeframe is its own market (the relation
// indications are then neutral).
//
// Built lazily, once per timeframe (and per higher-view factor, from completed higher bars) per universe: 4 Float64
// arrays of the grid's length — for 50 symbols × 28 800 1m bars ≈ 0.9 MB per timeframe, while every series reads
// views into it. The worker threads build their universe from the same full bars: identical values everywhere.
import type { Bars } from "../domain/types.ts";
import { htfBars } from "./cache.ts";

/** Rolling window (bars) of each series' own volume SMA in the market activity. */
export const MARKET_ACT_P = 60;

export interface MarketRef {
  /** market log return of each bar (NaN: no constituent had a previous bar, or the bar is not on the grid) */
  ret: Float64Array;
  /** cumulative market log index */
  idx: Float64Array;
  /** market activity: mean of v / SMA60(v) over the constituents */
  act: Float64Array;
  /** number of series the market is built from (1: the series alone — relations are neutral) */
  syms: number;
}

interface Grid {
  t: Float64Array;
  ret: Float64Array;
  idx: Float64Array;
  act: Float64Array;
  syms: number;
}

/** first index of sorted `t` with t[i] ≥ x */
function lowerBound(t: Float64Array, x: number): number {
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The equal-weight market of a set of series of one timeframe, on the union of their open times. */
export function buildMarket(series: readonly Bars[]): Grid {
  let tot = 0;
  for (const b of series) tot += b.n;
  // the union grid: every open time once, ascending (one series, or series on one grid: no sort needed)
  let t: Float64Array;
  const f = series[0];
  const onOne = (b: Bars) => {
    if (b.n !== f.n) return false;
    for (let i = 0; i < b.n; i++) if (b.t[i] !== f.t[i]) return false;
    return true;
  };
  if (f && series.every(onOne)) t = f.t.slice(0, f.n);
  else {
    const all = new Float64Array(tot);
    let o = 0;
    for (const b of series) {
      all.set(b.t.subarray(0, b.n), o);
      o += b.n;
    }
    all.sort();
    let u = 0;
    for (let i = 0; i < all.length; i++) if (i === 0 || all[i] !== all[u - 1]) all[u++] = all[i];
    t = all.slice(0, u);
  }
  const G = t.length;
  const ret = new Float64Array(G);
  const act = new Float64Array(G);
  const nr = new Uint32Array(G);
  const na = new Uint32Array(G);
  const P = MARKET_ACT_P;
  for (const b of series) {
    if (!b.n) continue;
    let j = lowerBound(t, b.t[0]);
    let vs = 0;
    for (let i = 0; i < b.n; i++) {
      while (t[j] < b.t[i]) j++;
      if (i >= 1) {
        const r = Math.log(b.c[i] / b.c[i - 1]);
        if (Number.isFinite(r)) {
          ret[j] += r;
          nr[j]++;
        }
      }
      // the series' own rolling volume SMA (its last P bars, this one included)
      const v = Number.isFinite(b.v[i]) ? b.v[i] : 0;
      vs += v;
      if (i >= P) vs -= Number.isFinite(b.v[i - P]) ? b.v[i - P] : 0;
      if (i >= P - 1 && vs > 0) {
        act[j] += v / (vs / P);
        na[j]++;
      }
    }
  }
  const idx = new Float64Array(G);
  let cum = 0;
  for (let g = 0; g < G; g++) {
    ret[g] = nr[g] ? ret[g] / nr[g] : NaN;
    act[g] = na[g] ? act[g] / na[g] : NaN;
    if (Number.isFinite(ret[g])) cum += ret[g];
    idx[g] = cum;
  }
  return { t, ret, idx, act, syms: series.length };
}

/** A grid's values at a series' bars, matched by open time (views when the series is a contiguous run of it). */
export function alignMarket(g: Grid, b: Bars): MarketRef {
  const n = b.n;
  const s0 = n ? lowerBound(g.t, b.t[0]) : 0;
  let run = s0 + n <= g.t.length;
  for (let i = 0; run && i < n; i++) if (g.t[s0 + i] !== b.t[i]) run = false;
  if (run)
    return {
      ret: g.ret.subarray(s0, s0 + n),
      idx: g.idx.subarray(s0, s0 + n),
      act: g.act.subarray(s0, s0 + n),
      syms: g.syms,
    };
  const ret = new Float64Array(n).fill(NaN);
  const idx = new Float64Array(n).fill(NaN);
  const act = new Float64Array(n).fill(NaN);
  for (let i = 0, j = s0; i < n; i++) {
    while (j < g.t.length && g.t[j] < b.t[i]) j++;
    if (j < g.t.length && g.t[j] === b.t[i]) {
      ret[i] = g.ret[j];
      idx[i] = g.idx[j];
      act[i] = g.act[j];
    }
  }
  return { ret, idx, act, syms: g.syms };
}

/**
 * The market reference of a universe: the grids are built on first use, one per timeframe (and per higher-view
 * factor: the timeframe's series aggregated to completed higher bars, as SeriesCache.htf does), and kept.
 */
export class MarketSource {
  private readonly bars: readonly Bars[];
  private grids = new Map<string, Grid>();
  constructor(bars: readonly Bars[]) {
    this.bars = bars;
  }
  grid(tf: number, factor = 1): Grid {
    const key = `${tf}x${factor}`;
    let g = this.grids.get(key);
    if (!g) {
      const members = this.bars.filter((b) => b.tfMin === tf && b.n > 0);
      g = buildMarket(factor === 1 ? members : members.map((b) => htfBars(b, factor).hb));
      this.grids.set(key, g);
    }
    return g;
  }
  /** the market at the bars of `b` (a series of timeframe tf, or its `factor` × higher view) */
  ref(b: Bars, tf: number, factor = 1): MarketRef {
    return alignMarket(this.grid(tf, factor), b);
  }
}
