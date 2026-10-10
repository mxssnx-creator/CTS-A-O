// Signals: the market's short-term move as a side rule (10 Oct). The market is the median return over `hours` of the
// symbols in the universe. A long opens only when that median is not up, a short only when it is not down: the signals
// that buy a bounce in a falling market and sell a bounce in a rising one are refused. Causal: the median at time t reads
// only the bars whose close is known at t (a bar is known one bar length after its open).
import type { Bars } from "../domain/types.ts";

const MS_PER_MIN = 60_000;

/** the market's median return at a time, NaN when the market is not known yet */
export interface MarketTrend {
  at(t: number): number;
}

/** the close of the last bar known at time t (the bar opened at or before t - one bar), NaN when there is none */
export function closeKnownAt(b: Bars, t: number): number {
  const step = b.tfMin * MS_PER_MIN;
  let lo = 0;
  let hi = b.n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (b.t[mid] + step <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 ? Number.NaN : b.c[lo - 1];
}

/** the median of a list (the average of the two middle values for an even count); NaN for an empty list */
function medianOf(xs: number[]): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The market's median return over `hours` at time t, from every symbol with a close known at t and at t - hours. The
 * market is not known (NaN) when fewer than three symbols, or fewer than three quarters of them, have both prices: the
 * rule then refuses the side rather than passing it.
 */
export function marketTrendOf(bars: readonly Bars[], hours: number): MarketTrend {
  const span = hours * 60 * MS_PER_MIN;
  const need = Math.max(3, Math.ceil(bars.length * 0.75));
  const memo = new Map<number, number>();
  return {
    at(t: number): number {
      const known = memo.get(t);
      if (known !== undefined) return known;
      const rets: number[] = [];
      for (const b of bars) {
        const p1 = closeKnownAt(b, t);
        const p0 = closeKnownAt(b, t - span);
        if (p1 > 0 && p0 > 0) rets.push(p1 / p0 - 1);
      }
      const m = rets.length >= need ? medianOf(rets) : Number.NaN;
      memo.set(t, m);
      return m;
    },
  };
}

/**
 * The side rule: a long is allowed only when the market's median return is not up (<= 0), a short only when it is not
 * down (>= 0). An unknown market (NaN) refuses both sides.
 */
export function marketSideAllows(side: 1 | -1, market: number): boolean {
  if (!Number.isFinite(market)) return false;
  return side > 0 ? market <= 0 : market >= 0;
}
