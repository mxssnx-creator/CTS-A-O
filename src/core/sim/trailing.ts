// Shared stop policy: configured values are fractions, stop prices are absolute.
import type { Protect } from "../domain/types.ts";

/** Signal hard-stop, activation and peak-gap ceilings; fees and gap slippage are separate. */
export const SIGNAL_STOP_MAX = 0.02; // legacy identities retain their original ceiling
export const SIGNAL_STOP_LIMIT = 0.03;

export function signalTrailMax(p: { cfg?: string; trailMax?: number }): number {
  const token = p.cfg && /\|tm([\d.]+)(?=\||$)/.exec(p.cfg);
  const max = p.trailMax ?? (token ? Number(token[1]) / 100 : SIGNAL_STOP_MAX);
  if (!(Number.isFinite(max) && max >= 0.002 && max <= SIGNAL_STOP_LIMIT))
    throw new RangeError("Signal trailing ceiling must be between 0.2% and 3%");
  return max;
}

export function isSignalConfig(cfg?: string): boolean {
  if (!cfg) return false;
  const first = cfg.indexOf("|");
  return first >= 0 && cfg.startsWith("sig-", first + 1);
}

export function isBoundedTrailingPosition(p: TrailingPosition): boolean {
  return isSignalConfig(p.cfg) || !!p.trailOnly || /\|to(?=\||$)/.test(p.cfg ?? "");
}

export function positionTrailMax(p: TrailingPosition): number {
  return isSignalConfig(p.cfg) ? signalTrailMax(p) : signalTrailMax({ ...p, trailMax: p.trailMax ?? SIGNAL_STOP_LIMIT });
}

/** Ordinary Trailing-only sets have the same hard 3% ceiling; ordinary TP/trailing sets keep their policy. */
export function capTrailingOnlyProtect(p: Protect): Protect {
  return p.trailOnly ? capSignalProtect({ ...p, tp: 0, trailFree: false, trailMax: p.trailMax ?? SIGNAL_STOP_LIMIT }) : p;
}

/** Canonical independent no-TP siblings, shared by Base and executable grids. */
export function trailingOnlyProtects(protects: readonly Protect[]): Protect[] {
  const out: Protect[] = [], seen = new Set<string>();
  for (const p of protects) {
    if (!(p.trail > 0) || p.trailOnly) continue;
    const q = capTrailingOnlyProtect({ ...p, tp: 0, trailOnly: true, trailFree: false, trailMax: SIGNAL_STOP_LIMIT });
    // Reference-bar holds can coincide while their minute caps produce different faster-lane holds. Keep both
    // until laneProtect resolves each actual hold; only identical economic caps may share this candidate.
    const key = `${q.sl}|${q.trail}|${q.trailStep}|${q.hold}|${q.maxHoldMin ?? ""}|${q.tag ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Apply after lane scaling, ATR resolution and feedback; never widen a tighter configured distance. */
export function capSignalProtect(p: Protect): Protect {
  if (!(Number.isFinite(p.sl) && p.sl > 0 && Number.isFinite(p.trail) && p.trail >= 0))
    throw new RangeError("Signal protection requires a finite positive SL and nonnegative activation");
  const max = signalTrailMax(p);
  const sl = Math.min(p.sl, max);
  if (!(p.trail > 0)) return sl === p.sl ? p : { ...p, sl };
  const step = p.trailStep ?? 1;
  if (!(Number.isFinite(step) && step > 0)) throw new RangeError("Signal trail ratio must be positive and finite");
  const trail = Math.min(p.trail, max);
  if (p.atr) return sl === p.sl && trail === p.trail ? p : { ...p, sl, trail };
  const gap = Math.min(p.trail * step, max);
  const trailStep = gap / trail;
  return sl === p.sl && trail === p.trail && trailStep === step
    ? p : { ...p, sl, trail, trailStep };
}

/** Conservative absolute stop; a missing legacy stop is repaired, a tighter stop is never loosened. */
export function signalStopAt(entry: number, side: number, stop: number, max = SIGNAL_STOP_MAX): number {
  if (!(Number.isFinite(entry) && entry > 0 && (side === 1 || side === -1))) return stop;
  const limit = entry * (1 - side * Math.min(max, SIGNAL_STOP_LIMIT));
  if (!(Number.isFinite(stop) && stop > 0)) return limit;
  return side === 1 ? Math.max(stop, limit) : Math.min(stop, limit);
}

export interface TrailingPosition {
  cfg?: string;
  side: number;
  entry: number;
  stop: number;
  peak: number;
  trailOn: boolean;
  trail?: number;
  trailDist?: number;
  trailMax?: number;
  trailOnly?: boolean;
  trailFree?: boolean;
  target?: number;
}

/** Restore/tick defense applies even before trailing arms; report every protection repair to live controls. */
export function enforceSignalPosition(p: TrailingPosition): boolean {
  if (!isBoundedTrailingPosition(p)) return false;
  const stop = p.stop, target = p.target, trail = p.trail, gap = p.trailDist,
    only = p.trailOnly, free = p.trailFree;
  const max = positionTrailMax(p);
  p.stop = signalStopAt(p.entry, p.side, p.stop, max);
  if (p.trail !== undefined && Number.isFinite(p.trail)) p.trail = Math.min(p.trail, max);
  if (p.trailDist !== undefined && Number.isFinite(p.trailDist)) p.trailDist = Math.min(p.trailDist, max);
  if (p.trailOnly || /\|to(?=\||$)/.test(p.cfg ?? "")) { p.trailOnly = true; p.target = 0; p.trailFree = false; }
  return !Object.is(p.stop, stop) || !Object.is(p.target, target) || !Object.is(p.trail, trail) ||
    !Object.is(p.trailDist, gap) || p.trailOnly !== only || p.trailFree !== free;
}

/**
 * A completed bar ratchets only the next bar's stop, independently of TP mode.
 * Ratios multiply the activation distance to give the fractional peak gap. Signal gaps also stay within
 * the configured ceiling (at most 3%) of ENTRY in absolute price units, even after a large rise in the favorable peak. No intrabar lookahead.
 */
export function ratchetTrail(p: TrailingPosition, activation: number, gap: number, high: number, low: number): boolean {
  const before = p.stop;
  enforceSignalPosition(p);
  if (!(Number.isFinite(p.entry) && p.entry > 0 && (p.side === 1 || p.side === -1) &&
    Number.isFinite(activation) && activation > 0 && Number.isFinite(gap) && gap > 0 &&
    Number.isFinite(high) && Number.isFinite(low) && high >= low && low > 0)) return p.stop !== before;
  const signal = isBoundedTrailingPosition(p);
  const max = signal ? positionTrailMax(p) : Infinity;
  const arm = signal ? Math.min(activation, max) : activation;
  const distance = signal ? Math.min(gap, max) : gap;
  const priorPeak = Number.isFinite(p.peak) && p.peak > 0 ? p.peak : p.entry;
  p.peak = p.side === 1 ? Math.max(p.entry, priorPeak, high) : Math.min(p.entry, priorPeak, low);
  if ((p.side * (p.peak - p.entry)) / p.entry >= arm) {
    p.trailOn = true;
    const priceGap = signal ? Math.min(p.peak * distance, p.entry * max) : p.peak * distance;
    // Preserve the established arithmetic for ordinary configurations, bit for bit.
    const next = signal ? p.peak - p.side * priceGap : p.peak * (1 - p.side * distance);
    if (Number.isFinite(next) && next > 0)
      p.stop = p.side === 1 ? Math.max(p.stop, next) : Math.min(p.stop, next);
  }
  return p.stop !== before;
}
