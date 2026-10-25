import { modeledPriceReturn } from "../model-cost.ts";
// Pure price/protection math shared by the realtime thread and its sliced recovery path.
import type { OpenPosition } from "../domain/types.ts";
import { trailBar } from "../sim/backtest.ts";
import { enforceSignalPosition } from "../sim/trailing.ts";
import { advanceExitProtection } from "../sim/exit-protection.ts";
import { isSignalInd, laneOf } from "../indications/registry.ts";

export type TickPosition = OpenPosition &
  TickTrail & { stopHit?: number; hitPx?: number; vol?: number };
export type TickPatch = { index: number; values: Partial<TickPosition> };
export interface TickMathResult {
  open: number;
  hits: Record<string, { at: number; stop: number; px?: number }> | null;
  trailMoved: boolean;
  patches: TickPatch[];
}

/** Price changes touch only that symbol. The worker retains its book and lane-bar state between frames. */
export class TickMathBook {
  private groups: Array<{
    sym: string;
    indices: number[];
    px: number;
    sum: number;
    nextBarT: number;
  }>;
  private lanes = new Map<string, number>();
  private positions: TickPosition[];
  private units: Float64Array;
  private cost: number;
  private baseTfMin: number;
  private trailFree: boolean;
  constructor(
    positions: TickPosition[],
    units: Float64Array,
    cost: number,
    baseTfMin: number,
    trailFree: boolean,
  ) {
    this.positions = positions;
    this.units = units;
    this.cost = cost;
    this.baseTfMin = baseTfMin;
    this.trailFree = trailFree;
    const by = new Map<string, number[]>();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      let indices = by.get(p.sym);
      if (!indices) by.set(p.sym, (indices = []));
      indices.push(i);
    }
    this.groups = [...by].map(([sym, indices]) => ({
      sym,
      indices,
      px: NaN,
      // A missing quote leaves the held mark in equity, including before this book receives its first price.
      sum: indices.reduce((sum, i) => sum + positions[i].mtm * (positions[i].vol ?? 1) * units[i], 0),
      nextBarT: Infinity,
    }));
  }

  *advanceGen(
    prices: Readonly<Record<string, number>>,
    now: number,
    patches = true,
  ): Generator<number, TickMathResult> {
    const result: TickMathResult = { open: 0, hits: null, trailMoved: false, patches: [] };
    let visited = 0;
    for (const g of this.groups) {
      const px = prices[g.sym];
      if (!(Number.isFinite(px) && px > 0)) {
        result.open += g.sum;
        continue;
      }
      const changed = px !== g.px;
      if (changed || now >= g.nextBarT) {
        let sum = 0;
        g.nextBarT = Infinity;
        for (const index of g.indices) {
          if (++visited % 128 === 0) yield visited;
          const p = this.positions[index];
          if (!(p.entry > 0)) continue;
          let laneMs = this.lanes.get(p.cfg);
          if (laneMs === undefined) {
            laneMs = (laneOf(p.cfg.split("|")[1] ?? "").tf ?? this.baseTfMin) * 60_000;
            this.lanes.set(p.cfg, laneMs);
          }
          const protectTf = !p.stopHit && (p.exitProtection || (p.trail ?? 0) > 0) ? laneMs : 0;
          const barDue =
            protectTf > 0 && (p.tkBar === undefined || now >= (p.tkBar + 1) * protectTf);
          if (changed || barDue) {
            if (enforceSignalPosition(p)) result.trailMoved = true;
            if (!p.stopHit && (p.trail || p.exitProtection))
              if (tickTrail(p, px, now, protectTf || laneMs)) result.trailMoved = true;
            if (!p.stopHit) {
              const level = crossedExit(
                p,
                px,
                isSignalInd(p.cfg.split("|")[1] ?? "") ? false : this.trailFree,
              );
              if (level > 0) {
                p.stopHit = now;
                p.hitPx = level;
                const key = `${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`;
                (result.hits ??= {})[key] = { at: now, stop: p.stop, px: level };
              }
            }
            const at = p.stopHit ? (p.hitPx ?? p.stop) : px;
            p.mtm = modeledPriceReturn(p.side, p.entry, at, this.cost);
            if (patches)
              result.patches.push({
                index,
                values: {
                  stop: p.stop,
                  target: p.target,
                  peak: p.peak,
                  trailOn: p.trailOn,
                  trail: p.trail,
                  trailDist: p.trailDist,
                  trailOnly: p.trailOnly,
                  trailFree: p.trailFree,
                  trailMax: p.trailMax,
                  // The local recovery book survives across frames; published nested state must not alias it.
                  exitProtection: p.exitProtection ? { ...p.exitProtection } : undefined,
                  mtm: p.mtm,
                  tkBar: p.tkBar,
                  tkHi: p.tkHi,
                  tkLo: p.tkLo,
                  tkClose: p.tkClose,
                  stopHit: p.stopHit,
                  hitPx: p.hitPx,
                },
              });
          }
          if (protectTf > 0 && !p.stopHit)
            g.nextBarT = Math.min(
              g.nextBarT,
              ((p.tkBar ?? Math.floor(now / protectTf)) + 1) * protectTf,
            );
          sum += p.mtm * (p.vol ?? 1) * this.units[index];
        }
        g.px = px;
        g.sum = sum;
      }
      result.open += g.sum;
    }
    return result;
  }

  advance(prices: Readonly<Record<string, number>>, now: number): TickMathResult {
    const g = this.advanceGen(prices, now);
    for (;;) {
      const next = g.next();
      if (next.done) return next.value;
    }
  }
}

/** true when `px` is at or through the position's stop (long: at or below, short: at or above) */
export function crossedStop(p: { side: number; stop: number }, px: number): boolean {
  if (!(p.stop > 0) || !(px > 0)) return false;
  return p.side === 1 ? px <= p.stop : px >= p.stop;
}

/**
 * The exit level a tick price reached (0 = none): the stop, else the target — as the simulation exits (a target
 * reached exits there, unless the position trails free with its trail armed). Only the stop was checked at tick
 * time: a target reached intrabar kept the lane's volume on the exchange until the bar-closed compute (1.5–2 min
 * on x01) while the paper book had already taken its profit.
 */
/** A paper position's trail state while the tick follows it (its lane bar, and that bar's high and low so far). */
export interface TickTrail {
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
  trailMax?: number;
  target?: number;
  exitProtection?: OpenPosition["exitProtection"];
  tkBar?: number;
  tkHi?: number;
  tkLo?: number;
  tkClose?: number;
}

/**
 * The tick's trailing between computes: the prices of the position's lane bar (5 / 15 / 30 min …) are followed, and
 * when that bar closes the simulation's own rule advances the peak and the trailing stop (trailBar). Without it a
 * trailing stop stood where the last paper step left it until the next compute (minutes on x02, 7 Oct) — the tick
 * then exited a reversal at an old level. Returns whether the stop moved.
 */
export function tickTrail(p: TickTrail, px: number, now: number, tfMs: number): boolean {
  const repaired = enforceSignalPosition(p);
  if (
    (!p.exitProtection && !(p.trail && p.trail > 0)) ||
    !(Number.isFinite(px) && px > 0) ||
    !(Number.isFinite(tfMs) && tfMs > 0) ||
    !Number.isFinite(now)
  )
    return repaired;
  const bar = Math.floor(now / tfMs);
  if (p.tkBar === undefined) {
    p.tkBar = bar;
    p.tkHi = px;
    p.tkLo = px;
    p.tkClose = px;
    return repaired;
  }
  if (bar < p.tkBar) return repaired;
  if (bar > p.tkBar) {
    const moved = p.exitProtection
      ? advanceExitProtection(p, {
          t: p.tkBar * tfMs,
          high: p.tkHi ?? px,
          low: p.tkLo ?? px,
          close: p.tkClose ?? px,
        })
      : trailBar(p, p.trail!, p.trailDist ?? p.trail!, p.tkHi ?? px, p.tkLo ?? px);
    p.tkBar = bar;
    p.tkHi = px;
    p.tkLo = px;
    p.tkClose = px;
    return moved || repaired;
  }
  if (px > (p.tkHi ?? px)) p.tkHi = px;
  if (px < (p.tkLo ?? px)) p.tkLo = px;
  p.tkClose = px;
  return repaired;
}

/**
 * A rebuilt paper position (a new compute's tape) keeps what the tick advanced since: the tape stops at its data
 * end, the tick saw the bars after it — the stop and peak are only ever carried further (long up, short down), and
 * the bar being followed continues. Same position only (posId); a non-trailing position keeps the tape's.
 */
export function carryTrail(
  op: TickTrail,
  prev: TickTrail | undefined,
): Partial<
  Pick<
    TickTrail,
    | "stop"
    | "peak"
    | "trailOn"
    | "trail"
    | "trailDist"
    | "target"
    | "exitProtection"
    | "tkBar"
    | "tkHi"
    | "tkLo"
    | "tkClose"
  >
> {
  if (!prev || (!op.exitProtection && !(op.trail && op.trail > 0))) return {};
  const long = op.side === 1;
  return {
    stop: long ? Math.max(op.stop, prev.stop) : Math.min(op.stop, prev.stop),
    peak: long ? Math.max(op.peak, prev.peak) : Math.min(op.peak, prev.peak),
    trailOn: op.trailOn || prev.trailOn,
    ...(op.exitProtection &&
    prev.exitProtection &&
    prev.exitProtection.lastBarT > op.exitProtection.lastBarT
      ? {
          target: prev.target,
          trail: prev.trail,
          trailDist: prev.trailDist,
          exitProtection: { ...prev.exitProtection },
        }
      : {}),
    ...(op.exitProtection && prev.exitProtection &&
      prev.exitProtection.lastBarT <= op.exitProtection.lastBarT &&
      op.exitProtection.cost !== prev.exitProtection.cost
      ? { exitProtection: { ...op.exitProtection, cost: prev.exitProtection.cost ?? 0 } }
      : {}),
    ...(prev.tkBar !== undefined
      ? {
          tkBar: prev.tkBar,
          tkHi: prev.tkHi,
          tkLo: prev.tkLo,
          ...(prev.tkClose !== undefined ? { tkClose: prev.tkClose } : {}),
        }
      : {}),
  };
}

export function crossedExit(
  p: {
    side: number;
    stop: number;
    target?: number;
    trailOn?: boolean;
    trailOnly?: boolean;
    trailFree?: boolean;
  },
  px: number,
  trailFree = false,
): number {
  if (crossedStop(p, px)) return p.stop;
  const t = p.target ?? 0;
  if (!(t > 0) || !(px > 0) || p.trailOnly || ((p.trailFree ?? trailFree) && p.trailOn)) return 0;
  return (p.side === 1 ? px >= t : px <= t) ? t : 0;
}
