// Causal entry filters ("adjustments") applied on top of a combo signal. Every filter reads bars 0..i only;
// the entry still happens at the open of bar i+1. A filter keeps or drops a signal — it never adds or flips one.
import type { Tactics } from "../domain/types.ts";
import type { SeriesCache } from "./cache.ts";
import { choppiness } from "./research3.ts";

export type FilterFn = (
  sig: Int8Array,
  k: SeriesCache,
  ref?: SeriesCache | null,
  scope?: string,
) => Int8Array;

function keep(
  sig: Int8Array,
  pass: (i: number, side: number) => boolean,
  k?: SeriesCache,
  key?: string,
): Int8Array {
  if (k?.streamMath && key)
    return k.streamMath.run<{ value: Int8Array }, number>(
      `filter:${key}`,
      sig.length,
      ["value"],
      () => 0,
      (i, out) => {
        if (sig[i] !== 0 && pass(i, sig[i])) out.value[i] = sig[i];
      },
      ["value"],
    ).value;
  const out = new Int8Array(sig.length);
  for (let i = 0; i < sig.length; i++) if (sig[i] !== 0 && pass(i, sig[i])) out[i] = sig[i];
  return out;
}

/** Rolling percentile rank (0..1) of x[i] within the previous `p` values (causal). */
function pctRank(k: SeriesCache, key: string, x: Float64Array, p: number): Float64Array {
  return k.memo(`rank:${key}:${p}`, () => {
    if (k.streamMath)
      return k.streamMath.vector(
        `rank:${key}:${p}`,
        x.length,
        () => 0,
        (i, out) => {
          if (i < p || !Number.isFinite(x[i])) return;
          let below = 0,
            count = 0;
          for (let j = i - p; j < i; j++) {
            const value = x[j];
            if (!Number.isFinite(value)) continue;
            count++;
            if (value < x[i]) below++;
          }
          if (count > p / 2) out[i] = below / count;
        },
      );
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
    if (k.streamMath)
      return k.streamMath.vector(
        "natr14",
        a.length,
        () => 0,
        (i, out) => {
          out[i] = a[i] / k.b.c[i];
        },
      );
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
  adx20: (s, k, _ref, scope) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] >= 20, k, scope);
  },
  adx25: (s, k, _ref, scope) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] >= 25, k, scope);
  },
  adxLo20: (s, k, _ref, scope) => {
    const adx = k.dmi(14).adx;
    return keep(s, (i) => adx[i] < 20, k, scope);
  },
  // higher-timeframe trend (EMA200 ≈ the 4h EMA50 on 1h bars) and its slope
  htf: (s, k, _ref, scope) => {
    const e = k.ema(200),
      c = k.b.c;
    return keep(s, (i, d) => (c[i] - e[i]) * d > 0, k, scope);
  },
  htfAgainst: (s, k, _ref, scope) => {
    const e = k.ema(200),
      c = k.b.c;
    return keep(s, (i, d) => (c[i] - e[i]) * d < 0, k, scope);
  },
  slope50: (s, k, _ref, scope) => {
    const e = k.ema(50);
    return keep(s, (i, d) => i >= 10 && (e[i] - e[i - 10]) * d > 0, k, scope);
  },
  // volatility regime (ATR% percentile over ~2 weeks of bars)
  volHi: (s, k, _ref, scope) => { const r = pctRank(k, "natr", natr(k), VOL_RANK_BARS); return keep(s, (i) => r[i] >= 0.5, k, scope); },
  volLo: (s, k, _ref, scope) => { const r = pctRank(k, "natr", natr(k), VOL_RANK_BARS); return keep(s, (i) => r[i] < 0.5, k, scope); },
  // choppiness regime: not in a range (CHOP(14) under the 61.8 range line; unknown = kept out)
  chop: (s, k, _ref, scope) => {
    const ch = k.memo("chop14", () => choppiness(k.b.h, k.b.l, k.b.c, 14));
    return keep(s, (i) => ch[i] < 61.8, k, scope);
  },
  // participation
  volume: (s, k, _ref, scope) => {
    const v = k.b.v,
      m = k.volSma(20);
    return keep(s, (i) => v[i] > 1.5 * m[i], k, scope);
  },
  quiet: (s, k, _ref, scope) => {
    const v = k.b.v,
      m = k.volSma(20);
    return keep(s, (i) => v[i] < m[i], k, scope);
  },
  // session (UTC hour of the bar that closes the signal)
  euUs: (s, k, _ref, scope) =>
    keep(
      s,
      (i) => {
        const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
        return h >= 7 && h < 21;
      },
      k,
      scope,
    ),
  asia: (s, k, _ref, scope) =>
    keep(
      s,
      (i) => {
        const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
        return h < 7 || h >= 21;
      },
      k,
      scope,
    ),
  // not overextended: within 2 ATR of EMA50
  stretch2: (s, k, _ref, scope) => {
    const c = k.b.c,
      e = k.ema(50),
      a = k.atr(14);
    return keep(s, (i) => Math.abs(c[i] - e[i]) < 2 * a[i], k, scope);
  },
  // RSI room: long not overbought, short not oversold
  rsiRoom: (s, k, _ref, scope) => {
    const r = k.rsi(14);
    return keep(s, (i, d) => (d > 0 ? r[i] < 65 : r[i] > 35), k, scope);
  },
  // market (reference symbol) regime
  btc: (s, k, ref, scope) => { if (!ref) return s; const r = refTrend(k, ref, 50); return keep(s, (i, d) => r[i] === d, k, scope); },
  btcAgainst: (s, k, ref, scope) => { if (!ref) return s; const r = refTrend(k, ref, 50); return keep(s, (i, d) => r[i] === -d, k, scope); },
};

export const FILTER_IDS = Object.keys(FILTERS);

export function applyFilter(
  id: string,
  sig: Int8Array,
  k: SeriesCache,
  ref?: SeriesCache | null,
  streamKey?: string,
): Int8Array {
  const f = FILTERS[id];
  if (!f) throw new Error(`unknown filter ${id}`);
  return f(sig, k, ref, streamKey ? `${streamKey}:${id}` : undefined);
}

// ── Tactics (engine-wide, switchable in Settings) ─────────────────────────────

/** The four signal tactics' ids in key order (tacticKey joins the active ones with "+"). */
const TACTIC_IDS = ["euUs", "volHi", "adx20", "chop"] as const;
/** tacticKey by the bit set of the active tactics (bit order = TACTIC_IDS): no array, filter or join per call */
const TACTIC_KEYS: readonly string[] = Array.from({ length: 16 }, (_, m) =>
  TACTIC_IDS.filter((_, b) => m & (1 << b)).join("+"),
);
const ADX_BIT = 4;
const tacticBits = (t: Tactics) => (t.session ? 1 : 0) | (t.volRegime ? 2 : 0) | (t.trendStrength ? 4 : 0) | (t.chopRegime ? 8 : 0);

/** Stable key of the active signal tactics ("" = none) — part of every memo key. */
export function tacticKey(t?: Tactics | null): string {
  return t ? TACTIC_KEYS[tacticBits(t)] : "";
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
  if (!t) return "";
  const bits = tacticBits(t);
  // a relate-adaptive indication skips the trend-strength tactic too (main's rule)
  const relateAdaptive = base.startsWith("relate-") && base.includes("-adaptive-");
  return TACTIC_KEYS[LOW_ADX_INDS.has(base) || relateAdaptive ? bits & ~ADX_BIT : bits];
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
  /** `tac:${key}:${memoKey}` when the caller keeps it (the same string object every call: its hash is computed once) */
  fullKey?: string,
): Int8Array {
  if (!key) return sig;
  return k.memo(fullKey ?? `tac:${key}:${memoKey}`, () =>
    key.split("+").reduce((x, id) => applyFilter(id, x, k, undefined, `${key}:${memoKey}`), sig),
  );
}
