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

/** Rolling percentile rank (0..1) of x[i] within the previous `p` values (causal). */
function pctRank(k: SeriesCache, key: string, x: Float64Array, p: number): Float64Array {
  return k.memo(`rank:${key}:${p}`, () => {
    const out = new Float64Array(x.length).fill(Number.NaN);
    for (let i = p; i < x.length; i++) {
      const v = x[i];
      if (!Number.isFinite(v)) continue;
      let below = 0;
      let cnt = 0;
      for (let j = i - p; j < i; j++) {
        const w = x[j];
        if (!Number.isFinite(w)) continue;
        cnt++;
        if (w < v) below++;
      }
      if (cnt > p / 2) out[i] = below / cnt;
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
/** Completed bars of the indication's own lane (336 hours only on a 1h series). */
export const VOL_RANK_BARS = 336;

export const FILTERS: Record<string, FilterFn> = {
  none: (s) => s,
  // trend strength
  adx20: (s, k) => { const adx = k.dmi(14).adx; return keep(s, (i) => adx[i] >= 20); },
  adx25: (s, k) => { const adx = k.dmi(14).adx; return keep(s, (i) => adx[i] >= 25); },
  adxLo20: (s, k) => { const adx = k.dmi(14).adx; return keep(s, (i) => adx[i] < 20); },
  // higher-timeframe trend (EMA200 ≈ the 4h EMA50 on 1h bars) and its slope
  htf: (s, k) => { const e = k.ema(200), c = k.b.c; return keep(s, (i, d) => (c[i] - e[i]) * d > 0); },
  htfAgainst: (s, k) => { const e = k.ema(200), c = k.b.c; return keep(s, (i, d) => (c[i] - e[i]) * d < 0); },
  slope50: (s, k) => { const e = k.ema(50); return keep(s, (i, d) => i >= 10 && (e[i] - e[i - 10]) * d > 0); },
  // volatility regime (ATR% percentile over ~2 weeks of bars)
  volHi: (s, k) => keep(s, (i) => pctRank(k, "natr", natr(k), VOL_RANK_BARS)[i] >= 0.5),
  volLo: (s, k) => keep(s, (i) => pctRank(k, "natr", natr(k), VOL_RANK_BARS)[i] < 0.5),
  // choppiness regime: not in a range (CHOP(14) under the 61.8 range line; unknown = kept out)
  chop: (s, k) => {
    const ch = k.memo("chop14", () => choppiness(k.b.h, k.b.l, k.b.c, 14));
    return keep(s, (i) => ch[i] < 61.8);
  },
  // participation
  volume: (s, k) => { const v = k.b.v, m = k.volSma(20); return keep(s, (i) => v[i] > 1.5 * m[i]); },
  quiet: (s, k) => { const v = k.b.v, m = k.volSma(20); return keep(s, (i) => v[i] < m[i]); },
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
  stretch2: (s, k) => { const c = k.b.c, e = k.ema(50), a = k.atr(14); return keep(s, (i) => Math.abs(c[i] - e[i]) < 2 * a[i]); },
  // RSI room: long not overbought, short not oversold
  rsiRoom: (s, k) => { const r = k.rsi(14); return keep(s, (i, d) => (d > 0 ? r[i] < 65 : r[i] > 35)); },
  // market (reference symbol) regime
  btc: (s, k, ref) => (ref ? keep(s, (i, d) => refTrend(k, ref, 50)[i] === d) : s),
  btcAgainst: (s, k, ref) => (ref ? keep(s, (i, d) => refTrend(k, ref, 50)[i] === -d) : s),
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

/**
 * Indications whose own rule fixes a low-ADX regime (they fire only below ADX 12–25). Relate adaptive variants also
 * include ranging turns. The trend-strength tactic
 * (ADX ≥ 20) removed every one of their entries (audit, 13 Oct: act-chop@x4, a default focus pair, and mc-qrsi2-5 never
 * traded), so it is not applied to them; the other tactics still are.
 */
export const LOW_ADX_INDS: ReadonlySet<string> = new Set([
  "act-chop",
  "mc-qrsi2-5",
  "r-bb-adx",
  "r-bb-adx-m",
  "sig-r-bb-adx-s",
  "sig-r-bb-adx-m",
  // Tactic's own regime logic deliberately includes low-ADX mean reversion and adaptive ranging entries.
  "tactic-mean-reversion-s",
  "tactic-mean-reversion-m",
  "tactic-adaptive-s",
  "tactic-adaptive-m",
]);

/** The tactics key for one indication: without trend strength for a low-ADX indication (LOW_ADX_INDS). */
export function tacticKeyFor(t: Tactics | null | undefined, base: string): string {
  const key = tacticKey(t);
  const relateAdaptive = base.startsWith("relate-") && base.includes("-adaptive-");
  return key && (LOW_ADX_INDS.has(base) || relateAdaptive)
    ? key.split("+").filter((x) => x !== "adx20").join("+")
    : key;
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
