// Signals: the trailing distance from pre-history, measured on 1-minute prices (9 Oct, operator: "calculated best trailing
// ranges related to pre-historic calculations"). A unit's trail is a quantile of the give-back of its own profitable closes
// before the entry: how far the price fell from its best point to the exit, measured bar by bar on the 1-minute candles.
// Causal: a distance at entry time t reads only the closes that exited at or before t, and only the 1-minute bars inside
// those closes. The exit of a trailing position is checked on the same 1-minute bars, following `simulate`.
import type { Bars, Side } from "../domain/types.ts";
import { trailBar } from "./backtest.ts";

/** The first bar index whose open time is at or after t (bars are sorted by time). */
function firstBarAt(t: Float64Array, time: number): number {
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t[mid] < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The give-back of one profitable close, as a fraction of its entry price: a long's best high between the entry and the
 * exit less the exit, a short's exit less its best low. Measured on the 1-minute bars whose open lies in [entryT, exitT).
 * Never negative (0 when the price never moved against the trade from its best point).
 */
export function giveBackOf(
  bars1: Bars,
  side: Side,
  entry: number,
  entryT: number,
  exitT: number,
  exit: number,
): number {
  if (!(entry > 0)) return 0;
  const a = firstBarAt(bars1.t, entryT);
  const b = firstBarAt(bars1.t, exitT);
  if (b <= a) return 0;
  if (side === 1) {
    let best = -Infinity;
    for (let i = a; i < b; i++) if (bars1.h[i] > best) best = bars1.h[i];
    return Math.max(0, (best - exit) / entry);
  }
  let best = Infinity;
  for (let i = a; i < b; i++) if (bars1.l[i] < best) best = bars1.l[i];
  return Math.max(0, (exit - best) / entry);
}

/** One profitable close of a unit: its exit time and give-back (a fraction of its entry). Records are in exit order. */
export interface GiveBackRecord {
  exitT: number;
  gb: number;
}

/** The q-quantile of a list (linear interpolation between the two nearest ranks); NaN for an empty list. */
export function quantileOf(xs: readonly number[], q: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = Math.min(1, Math.max(0, q)) * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export interface TrailHistoryOptions {
  /** the quantile of the give-back (0 to 1) */
  q: number;
  /** the number of the most recent profitable closes judged */
  window: number;
  /** the trailing distance is never below this (a noise floor, fraction of entry) */
  floor: number;
  /** the trailing distance is never above this (fraction of entry: the target's distance) */
  cap: number;
  /** the distance with no profitable close before the entry yet */
  fallback: number;
}

/**
 * The trailing distance of a unit at time t, from its own records: the q-quantile of the give-back of its last `window`
 * profitable closes that exited at or before t, clamped to [floor, cap]. Causal by construction: records after t are
 * never read. With no record yet the fallback applies.
 */
export function trailFromHistory(
  recs: readonly GiveBackRecord[],
  t: number,
  o: TrailHistoryOptions,
): number {
  // the records before t: exit times are sorted, so the count is a binary search
  let lo = 0;
  let hi = recs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (recs[mid].exitT <= t) lo = mid + 1;
    else hi = mid;
  }
  const from = Math.max(0, lo - Math.max(1, o.window));
  const gbs: number[] = [];
  for (let i = from; i < lo; i++) gbs.push(recs[i].gb);
  if (gbs.length === 0) return Math.min(o.cap, Math.max(o.floor, o.fallback));
  return Math.min(o.cap, Math.max(o.floor, quantileOf(gbs, o.q)));
}

export interface Trail1mParams {
  /** target and stop as fractions of the entry price */
  tp: number;
  sl: number;
  /** the trailing distance (fraction of entry) and its step, as `Protect` (0 = no trail) */
  trail: number;
  trailStep?: number;
  /** the target is dropped once the trail is armed (let winners run) */
  trailFree?: boolean;
  /** the hold in 1-minute bars (the position closes at the close of its last bar) */
  hold: number;
}

export interface Exit1m {
  /** the bar the position closes on */
  exitI: number;
  /** the exit price */
  exit: number;
  reason: "tp" | "sl" | "trail" | "time";
}

/**
 * One position on 1-minute bars, exited as `simulate` exits a position: it enters at the open of bar `entryI`; each bar's
 * range is checked against the stop and the target (a gap fills at the open), the trail ratchets after the bar's check
 * (`trailBar`), and the hold closes at the bar's close. Returns null when the bars run out before an exit.
 */
export function exitOn1m(bars1: Bars, side: Side, entryI: number, p: Trail1mParams): Exit1m | null {
  const { n, o, h, l, c } = bars1;
  if (entryI < 0 || entryI >= n) return null;
  const entry = o[entryI];
  const st = {
    side,
    entry,
    stop: side === 1 ? entry * (1 - p.sl) : entry * (1 + p.sl),
    peak: entry,
    trailOn: false,
  };
  const target = side === 1 ? entry * (1 + p.tp) : entry * (1 - p.tp);
  const dist = p.trail * (p.trailStep ?? 1);
  for (let i = entryI; i < n; i++) {
    const gap = i > entryI;
    if (side === 1) {
      if (l[i] <= st.stop)
        return {
          exitI: i,
          exit: gap ? Math.min(o[i], st.stop) : st.stop,
          reason: st.trailOn ? "trail" : "sl",
        };
      if (h[i] >= target && !(st.trailOn && p.trailFree))
        return { exitI: i, exit: gap ? Math.max(o[i], target) : target, reason: "tp" };
    } else {
      if (h[i] >= st.stop)
        return {
          exitI: i,
          exit: gap ? Math.max(o[i], st.stop) : st.stop,
          reason: st.trailOn ? "trail" : "sl",
        };
      if (l[i] <= target && !(st.trailOn && p.trailFree))
        return { exitI: i, exit: gap ? Math.min(o[i], target) : target, reason: "tp" };
    }
    if (i - entryI + 1 >= p.hold) return { exitI: i, exit: c[i], reason: "time" };
    trailBar(st, p.trail, dist, h[i], l[i]);
  }
  return null;
}
