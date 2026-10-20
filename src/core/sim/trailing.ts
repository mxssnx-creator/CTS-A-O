// Shared stop policy: configured values are fractions, stop prices are absolute.
import type { Protect } from "../domain/types.ts";

/** Signal hard-stop, activation and peak-gap ceilings; fees and gap slippage are separate. */
export const SIGNAL_STOP_MAX = 0.02;

export function isSignalConfig(cfg?: string): boolean {
  if (!cfg) return false;
  const first = cfg.indexOf("|");
  return first >= 0 && cfg.startsWith("sig-", first + 1);
}

/** Apply after lane scaling, ATR resolution and feedback; never widen a tighter configured distance. */
export function capSignalProtect(p: Protect): Protect {
  if (!(Number.isFinite(p.sl) && p.sl > 0 && Number.isFinite(p.trail) && p.trail >= 0))
    throw new RangeError("Signal protection requires a finite positive SL and nonnegative activation");
  const sl = Math.min(p.sl, SIGNAL_STOP_MAX);
  if (!(p.trail > 0)) return sl === p.sl ? p : { ...p, sl };
  const step = p.trailStep ?? 1;
  if (!(Number.isFinite(step) && step > 0)) throw new RangeError("Signal trail ratio must be positive and finite");
  const trail = Math.min(p.trail, SIGNAL_STOP_MAX);
  if (p.atr) return sl === p.sl && trail === p.trail ? p : { ...p, sl, trail };
  const gap = Math.min(p.trail * step, SIGNAL_STOP_MAX);
  const trailStep = gap / trail;
  return sl === p.sl && trail === p.trail && trailStep === step
    ? p : { ...p, sl, trail, trailStep };
}

/** Conservative absolute stop; a missing legacy stop is repaired, a tighter stop is never loosened. */
export function signalStopAt(entry: number, side: number, stop: number): number {
  if (!(Number.isFinite(entry) && entry > 0 && (side === 1 || side === -1))) return stop;
  const limit = entry * (1 - side * SIGNAL_STOP_MAX);
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
  trailOnly?: boolean;
  trailFree?: boolean;
  target?: number;
}

/** Restore/tick defense applies even before trailing arms and even on fixed-SL Signal positions. */
export function enforceSignalPosition(p: TrailingPosition): boolean {
  if (!isSignalConfig(p.cfg)) return false;
  const before = p.stop;
  p.stop = signalStopAt(p.entry, p.side, p.stop);
  if (p.trail !== undefined && Number.isFinite(p.trail)) p.trail = Math.min(p.trail, SIGNAL_STOP_MAX);
  if (p.trailDist !== undefined && Number.isFinite(p.trailDist)) p.trailDist = Math.min(p.trailDist, SIGNAL_STOP_MAX);
  if (p.trailOnly) { p.target = 0; p.trailFree = false; }
  return p.stop !== before;
}

/**
 * A completed bar ratchets only the next bar's stop, independently of TP mode.
 * Ratios multiply the activation distance to give the fractional peak gap. Signal gaps also stay within
 * 2% of ENTRY in absolute price units, even after a large rise in the favorable peak. No intrabar lookahead.
 */
export function ratchetTrail(p: TrailingPosition, activation: number, gap: number, high: number, low: number): boolean {
  const before = p.stop;
  enforceSignalPosition(p);
  if (!(Number.isFinite(p.entry) && p.entry > 0 && (p.side === 1 || p.side === -1) &&
    Number.isFinite(activation) && activation > 0 && Number.isFinite(gap) && gap > 0 &&
    Number.isFinite(high) && Number.isFinite(low) && high >= low && low > 0)) return p.stop !== before;
  const signal = isSignalConfig(p.cfg);
  const arm = signal ? Math.min(activation, SIGNAL_STOP_MAX) : activation;
  const distance = signal ? Math.min(gap, SIGNAL_STOP_MAX) : gap;
  const priorPeak = Number.isFinite(p.peak) && p.peak > 0 ? p.peak : p.entry;
  p.peak = p.side === 1 ? Math.max(p.entry, priorPeak, high) : Math.min(p.entry, priorPeak, low);
  if ((p.side * (p.peak - p.entry)) / p.entry >= arm) {
    p.trailOn = true;
    const priceGap = signal ? Math.min(p.peak * distance, p.entry * SIGNAL_STOP_MAX) : p.peak * distance;
    // Preserve the established arithmetic for ordinary configurations, bit for bit.
    const next = signal ? p.peak - p.side * priceGap : p.peak * (1 - p.side * distance);
    if (Number.isFinite(next) && next > 0)
      p.stop = p.side === 1 ? Math.max(p.stop, next) : Math.min(p.stop, next);
  }
  return p.stop !== before;
}
