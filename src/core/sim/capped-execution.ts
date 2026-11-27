import type { Bars, OpenPosition, Protect } from "../domain/types.ts";
import type { Universe } from "../pipeline/pipeline.ts";

const M = 60_000;
interface Projection {
  source: Bars;
  bars: Bars;
  signal: Int8Array;
  series: (values: Float64Array) => Float64Array;
  sourceTfMin: number;
}
export interface CappedExecution extends Projection { protect: Protect; cooldown: number; minute: boolean }
export function stampCappedOpen(open: OpenPosition | null | undefined, view: CappedExecution): void {
  if (!view.minute || !open) return;
  open.executionTfMin = view.bars.tfMin;
  open.holdEndT = open.entryT + view.protect.hold * view.bars.tfMin * M;
}
interface ExecutionClock {
  /** Source bar index to the minute index that completes it. A missing minute is −1. */
  closedAt: Int32Array;
  series: Projection["series"];
}
const minuteBooks = new WeakMap<Universe, Map<string, Bars>>();
const executionClocks = new WeakMap<Universe, WeakMap<Bars, ExecutionClock>>();
const projections = new WeakMap<Universe, WeakMap<Int8Array, Projection>>();
/** Job/pair boundaries release expanded signal/ATR arrays; immutable price inputs stay shared. */
export const clearCappedProjections = (u: Universe): void => { projections.delete(u); };
function minutesOf(u: Universe): Map<string, Bars> {
  let hit = minuteBooks.get(u);
  if (hit) return hit;
  hit = new Map();
  for (const b of u.bars) if (b.tfMin === 1) {
    if (hit.has(b.sym)) throw new Error(`duplicate minute execution series: ${b.sym}`);
    for (let i = 0; i < b.n; i++) {
      if (!Number.isFinite(b.t[i]) || i > 0 && b.t[i] !== b.t[i - 1] + M ||
          ![b.o[i], b.h[i], b.l[i], b.c[i], b.v[i]].every(Number.isFinite) || b.l[i] <= 0 || b.v[i] < 0 ||
          b.h[i] < Math.max(b.o[i], b.c[i], b.l[i]) || b.l[i] > Math.min(b.o[i], b.c[i]))
        throw new Error(`incomplete/invalid minute execution prices: ${b.sym}`);
    }
    hit.set(b.sym, b);
  }
  minuteBooks.set(u, hit);
  return hit;
}
export const hasMinutePrices = (u: Universe): boolean => minutesOf(u).size > 0;
/** Evidence cannot start before this config's own execution prices, even with longer indication warmup. */
export function cappedPriceStart(u: Universe, sourceIndices: readonly number[]): number {
  let first = Infinity;
  for (const s of sourceIndices) {
    const b = minutesOf(u).get(u.bars[s].sym);
    if (b?.n) first = Math.min(first, b.t[0]);
  }
  return first;
}

function executionClock(u: Universe, source: Bars, prices: Bars): ExecutionClock {
  let clocks = executionClocks.get(u);
  if (!clocks) {
    clocks = new WeakMap();
    executionClocks.set(u, clocks);
  }
  const previous = clocks.get(source);
  if (previous) return previous;
  const minuteToSource = new Int32Array(prices.n);
  const closedAt = new Int32Array(source.n).fill(-1);
  const duration = source.tfMin * M;
  let j = -1;
  for (let i = 0; i < prices.n; i++) {
    const closeT = prices.t[i] + M;
    while (j + 1 < source.n && source.t[j + 1] + duration <= closeT) j++;
    minuteToSource[i] = j;
    if (j >= 0 && source.t[j] + duration === closeT) closedAt[j] = i;
  }
  const numeric = new WeakMap<Float64Array, Float64Array>();
  const clock: ExecutionClock = {
    closedAt,
    series(values) {
      if (values.length !== source.n) throw new Error("source numeric series/price length mismatch");
      let out = numeric.get(values);
      if (!out) {
        out = new Float64Array(prices.n).fill(NaN);
        for (let i = 0; i < prices.n; i++) if (minuteToSource[i] >= 0) out[i] = values[minuteToSource[i]];
        numeric.set(values, out);
      }
      return out;
    },
  };
  clocks.set(source, clock);
  return clock;
}

/** Minute caps use completed indication bars but independent minute execution prices. Native research stays explicit. */
export function cappedExecution(u: Universe, sourceIndex: number, signal: Int8Array, p: Protect, cooldown = 0): CappedExecution {
  const source = u.bars[sourceIndex];
  if (!(p.maxHoldMin !== undefined && source.tfMin >= 1 && hasMinutePrices(u)))
    return { source, bars: source, signal, protect: p, cooldown, minute: false, sourceTfMin: source.tfMin, series: (v) => v };
  if (!Number.isFinite(p.maxHoldMin) || p.maxHoldMin < 1) throw new RangeError("minute execution hold must be at least one minute");
  const prices = minutesOf(u).get(source.sym);
  if (!prices) throw new Error(`missing own minute execution prices: ${source.sym}`);
  if (source.tfMin === 1) return { source, bars: source, signal, protect: { ...p, hold: Math.floor(p.maxHoldMin) },
    cooldown, minute: true, sourceTfMin: 1, series: (v) => v };
  if (source.n && prices.n && source.t[source.n - 1] + source.tfMin * M > prices.t[prices.n - 1] + M)
    throw new Error(`stale minute execution prices: ${source.sym}`);
  if (signal.length !== source.n) throw new Error("source signal/price length mismatch");
  let cache = projections.get(u);
  if (!cache) projections.set(u, (cache = new WeakMap()));
  let view = cache.get(signal);
  if (view && (view.bars !== prices || view.source !== source)) throw new Error("source signal reused across execution contexts");
  if (!view) {
    const { closedAt, series } = executionClock(u, source, prices);
    const projected = new Int8Array(prices.n);
    for (let j = 0; j < source.n; j++) if (closedAt[j] >= 0) projected[closedAt[j]] = signal[j];
    view = { source, bars: prices, signal: projected, sourceTfMin: source.tfMin, series };
    cache.set(signal, view);
  }
  return { ...view, protect: { ...p, hold: Math.floor(p.maxHoldMin) },
    cooldown: Math.ceil(cooldown * source.tfMin), minute: true };
}
