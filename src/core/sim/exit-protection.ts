// Causal, bounded protection updates for the independently fitted Historic Exit sets.
// A completed bar changes only the next bar's protection; anchors remain the qualified config's distances.
import type { ExitConfigSet, ExitProtectionState, Protect } from "../domain/types.ts";

export interface ExitProtectionPosition {
  side: number;
  entry: number;
  stop: number;
  target?: number;
  peak: number;
  trailOn: boolean;
  trail?: number;
  trailDist?: number;
  exitProtection?: ExitProtectionState;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Legacy Historic Exit ids without a tactic retain their original fixed protection behavior. */
export function createExitProtection(p: Protect, entry: number): ExitProtectionState | undefined {
  if (p.exitType !== "historic" || !p.exitSet || !(entry > 0 && p.tp > 0 && p.sl > 0)) return;
  return {
    set: p.exitSet,
    baseTp: p.tp,
    baseSl: p.sl,
    baseTrail: p.trail,
    baseTrailDist: p.trail * (p.trailStep ?? 1),
    previousClose: entry,
    rangeEma: p.sl,
    moveEma: 0,
    samples: 0,
    lastBarT: -1,
  };
}

/**
 * One completed observed lane bar, once. O(1) state and no retrospective fills.
 * TP follows bounded volatility/trend changes (0.75–1.5× its fitted anchor). Adaptive SL only locks earned profit;
 * static-SL never moves. The trailing set also adapts its gap within 0.65–1.35× and ratchets from the completed peak.
 * This is an explicit deterministic heuristic; every resulting tactic still needs its own held-out PF qualification.
 */
export function advanceExitProtection(
  p: ExitProtectionPosition,
  bar: { t: number; high: number; low: number; close: number },
): boolean {
  const s = p.exitProtection;
  if (
    !s ||
    !(p.entry > 0) ||
    !Number.isFinite(bar.t) ||
    bar.t <= s.lastBarT ||
    !(bar.high > 0 && bar.low > 0 && bar.close > 0) ||
    bar.high < bar.low ||
    !Number.isFinite(bar.high + bar.low + bar.close)
  )
    return false;
  const stop0 = p.stop;
  const target0 = p.target;
  const trail0 = p.trail;
  const gap0 = p.trailDist;
  const on0 = p.trailOn;
  const range =
    Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - s.previousClose),
      Math.abs(bar.low - s.previousClose),
    ) / p.entry;
  const move = (p.side * (bar.close - s.previousClose)) / p.entry;
  s.rangeEma = 0.8 * s.rangeEma + 0.2 * range;
  s.moveEma = 0.75 * s.moveEma + 0.25 * move;
  s.previousClose = bar.close;
  s.samples++;
  s.lastBarT = bar.t;
  const volatility = clamp(s.rangeEma / s.baseSl, 0.25, 2);
  const trend = clamp(s.moveEma / Math.max(s.rangeEma, 1e-9), -1, 1);
  const distance = s.baseTp * clamp(1 + 0.2 * (volatility - 1) + 0.25 * trend, 0.75, 1.5);
  const desired = p.entry * (1 + p.side * distance);
  // Never place a freshly tightened target behind the just-completed close: preserve the previous reachable target.
  if (p.side > 0 ? desired > bar.close : desired < bar.close) p.target = desired;
  if (p.side > 0) p.peak = Math.max(p.peak, bar.high);
  else p.peak = Math.min(p.peak, bar.low);
  const profit = (p.side * (bar.close - p.entry)) / p.entry;
  if (s.set !== "static-sl" && profit >= s.baseTp * 0.25) {
    const lock = Math.min(s.baseTp * 0.5, profit * 0.35);
    const stop = p.entry * (1 + p.side * lock);
    p.stop = p.side > 0 ? Math.max(p.stop, stop) : Math.min(p.stop, stop);
  }
  if (s.set === "trailing" && s.baseTrail > 0) {
    p.trail = s.baseTrail * clamp(0.9 + 0.1 * volatility, 0.75, 1.25);
    p.trailDist = s.baseTrailDist * clamp(0.8 + 0.2 * volatility, 0.65, 1.35);
    if ((p.side * (p.peak - p.entry)) / p.entry >= p.trail) {
      p.trailOn = true;
      const stop = p.peak * (1 - p.side * p.trailDist);
      p.stop = p.side > 0 ? Math.max(p.stop, stop) : Math.min(p.stop, stop);
    }
  }
  return (
    p.stop !== stop0 ||
    p.target !== target0 ||
    p.trail !== trail0 ||
    p.trailDist !== gap0 ||
    p.trailOn !== on0
  );
}

/** Used by persisted-state validation and future policy migrations. */
export const isExitConfigSet = (set: unknown): set is ExitConfigSet =>
  set === "static-sl" || set === "adaptive-sl" || set === "trailing";
