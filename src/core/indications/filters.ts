// Causal entry filters ("adjustments") applied on top of a combo signal. Every filter reads bars 0..i only;
// the entry still happens at the open of bar i+1. A filter keeps or drops a signal — it never adds or flips one.
import type { Tactics } from "../domain/types.ts";
import type { SeriesCache } from "./cache.ts";
import { choppiness } from "./research3.ts";

export type FilterFn = (sig: Int8Array, k: SeriesCache, ref?: SeriesCache | null) => Int8Array;

function keep(sig: Int8Array, pass: (i: number, side: number) => boolean): Int8Array {
  const out = new Int8Array(sig.length);
  for (let i = 0; i < sig.length; i++) if (sig[i] !== 0 && pass(i, sig[i])) out[i] = sig[i];
  return out;
}

/**
 * Rolling percentile rank (0..1) of x[i] within the previous `p` values (causal): the share of the window's finite
 * values below x[i], when the window holds more than p / 2 of them.
 *
 * The window is slid bar by bar and its values are counted in a Fenwick tree over the ranks of the distinct finite
 * values, so the counts are the ones a scan of the window gives (−0 and +0 are one value, as in `<`) at O(n log n),
 * not O(n · p): the scan was 40 % of a Base run on the volatility-regime filters.
 */
export function pctRank(k: SeriesCache, key: string, x: Float64Array, p: number): Float64Array {
  return k.memo(`rank:${key}:${p}`, () => {
    const n = x.length;
    const out = new Float64Array(n).fill(Number.NaN);
    // the distinct finite values, sorted, so each value's rank is its 1-based position among them
    const vals = new Float64Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) if (Number.isFinite(x[i])) vals[m++] = x[i] === 0 ? 0 : x[i];
    const sorted = vals.slice(0, m).sort();
    let R = 0;
    for (let q = 0; q < m; q++) if (R === 0 || sorted[q] !== sorted[R - 1]) sorted[R++] = sorted[q];
    const rk = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(x[i])) continue;
      const v = x[i] === 0 ? 0 : x[i];
      let lo = 0;
      let hi = R - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < v) lo = mid + 1;
        else hi = mid;
      }
      rk[i] = lo + 1;
    }
    const tree = new Int32Array(R + 1);
    const add = (r: number, d: number) => {
      for (let q = r; q <= R; q += q & -q) tree[q] += d;
    };
    const below = (r: number) => {
      let s = 0;
      for (let q = r; q > 0; q -= q & -q) s += tree[q];
      return s;
    };
    // the window of bar i is bars [i − p, i − 1]: bar i − 1 joins it and bar i − 1 − p leaves it
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      if (i >= 1 && rk[i - 1] > 0) {
        add(rk[i - 1], 1);
        cnt++;
      }
      if (i - 1 - p >= 0 && rk[i - 1 - p] > 0) {
        add(rk[i - 1 - p], -1);
        cnt--;
      }
      if (i < p || rk[i] === 0) continue;
      if (cnt > p / 2) out[i] = below(rk[i] - 1) / cnt;
    }
    return out;
  });
}

function natr(k: SeriesCache): Float64Array {
  return k.memo("natr14", () => {
    const a = k.atr(14);
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] / k.b.c[i];
    return out;
  });
}

/** Reference (e.g. BTC) trend state aligned to this symbol's bars by time: +1 above EMA(p), -1 below. */
function refTrend(k: SeriesCache, ref: SeriesCache, p: number): Int8Array {
  return k.memo(`reftrend:${ref.b.sym}:${p}`, () => {
    const e = ref.ema(p);
    const out = new Int8Array(k.b.n);
    let j = 0;
    for (let i = 0; i < k.b.n; i++) {
      const t = k.b.t[i];
      while (j + 1 < ref.b.n && ref.b.t[j + 1] <= t) j++;
      if (ref.b.t[j] > t || !Number.isFinite(e[j])) continue;
      out[i] = ref.b.c[j] > e[j] ? 1 : ref.b.c[j] < e[j] ? -1 : 0;
    }
    return out;
  });
}

const HOUR = 3_600_000;
/** bars in the volatility-regime rank window (two weeks of 1h bars) */
export const VOL_RANK_BARS = 336;

export const FILTERS: Record<string, FilterFn> = {
  none: (s) => s,
  // trend strength
  // (each series is read once per filter, not per bar: a memo lookup builds its key string on every call)
  adx20: (s, k) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] >= 20);
  },
  adx25: (s, k) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] >= 25);
  },
  adxLo20: (s, k) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] < 20);
  },
  // higher-timeframe trend (EMA200 ≈ the 4h EMA50 on 1h bars) and its slope
  htf: (s, k) => {
    const e = k.ema(200);
    return keep(s, (i, d) => (k.b.c[i] - e[i]) * d > 0);
  },
  htfAgainst: (s, k) => {
    const e = k.ema(200);
    return keep(s, (i, d) => (k.b.c[i] - e[i]) * d < 0);
  },
  slope50: (s, k) => {
    const e = k.ema(50);
    return keep(s, (i, d) => i >= 10 && (e[i] - e[i - 10]) * d > 0);
  },
  // volatility regime (ATR% percentile over ~2 weeks of bars)
  volHi: (s, k) => {
    const r = pctRank(k, "natr", natr(k), VOL_RANK_BARS);
    return keep(s, (i) => r[i] >= 0.5);
  },
  volLo: (s, k) => {
    const r = pctRank(k, "natr", natr(k), VOL_RANK_BARS);
    return keep(s, (i) => r[i] < 0.5);
  },
  // choppiness regime: not in a range (CHOP(14) under the 61.8 range line; unknown = kept out)
  chop: (s, k) => {
    const ch = k.memo("chop14", () => choppiness(k.b.h, k.b.l, k.b.c, 14));
    return keep(s, (i) => ch[i] < 61.8);
  },
  // participation
  volume: (s, k) => {
    const vs = k.volSma(20);
    return keep(s, (i) => k.b.v[i] > 1.5 * vs[i]);
  },
  quiet: (s, k) => {
    const vs = k.volSma(20);
    return keep(s, (i) => k.b.v[i] < vs[i]);
  },
  // session (UTC hour of the bar that closes the signal)
  euUs: (s, k) =>
    keep(s, (i) => {
      const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
      return h >= 7 && h < 21;
    }),
  asia: (s, k) =>
    keep(s, (i) => {
      const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
      return h < 7 || h >= 21;
    }),
  // not overextended: within 2 ATR of EMA50
  stretch2: (s, k) => {
    const e = k.ema(50);
    const a = k.atr(14);
    return keep(s, (i) => Math.abs(k.b.c[i] - e[i]) < 2 * a[i]);
  },
  // RSI room: long not overbought, short not oversold
  rsiRoom: (s, k) => {
    const r = k.rsi(14);
    return keep(s, (i, d) => (d > 0 ? r[i] < 65 : r[i] > 35));
  },
  // market (reference symbol) regime
  btc: (s, k, ref) => {
    if (!ref) return s;
    const t = refTrend(k, ref, 50);
    return keep(s, (i, d) => t[i] === d);
  },
  btcAgainst: (s, k, ref) => {
    if (!ref) return s;
    const t = refTrend(k, ref, 50);
    return keep(s, (i, d) => t[i] === -d);
  },
};

export const FILTER_IDS = Object.keys(FILTERS);

export function applyFilter(
  id: string,
  sig: Int8Array,
  k: SeriesCache,
  ref?: SeriesCache | null,
): Int8Array {
  const f = FILTERS[id];
  if (!f) throw new Error(`unknown filter ${id}`);
  return f(sig, k, ref);
}

// ── Tactics (engine-wide, switchable in Settings) ─────────────────────────────

/** Stable key of the active signal tactics ("" = none) — part of every memo key. */
export function tacticKey(t?: Tactics | null): string {
  if (!t) return "";
  return [t.session && "euUs", t.volRegime && "volHi", t.trendStrength && "adx20", t.chopRegime && "chop"]
    .filter(Boolean)
    .join("+");
}

/** Extra history (bars) the active tactics need before their first valid signal. */
export function tacticWarmupBars(t?: Tactics | null): number {
  return t?.volRegime ? VOL_RANK_BARS + 20 : t?.trendStrength || t?.chopRegime ? 40 : 0;
}

/** Cooldown bars after an exit (0 = off). */
export function tacticCooldown(t?: Tactics | null): number {
  return t?.cooldown ? Math.max(0, Math.round(t.cooldownBars)) : 0;
}

/** A combo signal after the active tactics. Memoized per symbol cache. */
export function withTactics(
  sig: Int8Array,
  k: SeriesCache,
  key: string,
  memoKey: string,
): Int8Array {
  if (!key) return sig;
  return k.memo(`tac:${key}:${memoKey}`, () =>
    key.split("+").reduce((x, id) => applyFilter(id, x, k), sig),
  );
}
