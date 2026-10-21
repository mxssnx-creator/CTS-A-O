// The incremental cycle's state (runtime.cycle "incremental"): the tail universe of the last heavy compute, grown by
// the bars that closed since, and the resumable tapes of the validated set continued over them. Pure data and
// functions (no runtime, no workers): src/core/server/incremental.test.ts compares it with a full recompute.
import type { Bars, Tactics } from "../domain/types.ts";
import { makeUniverse, type Universe } from "../pipeline/pipeline.ts";
import { barsOfSeries, resampleTailBars, type CandleSeries } from "../market/candle-series.ts";
import { extendTape, isResumable, seedTape, type TapeResume } from "../sim/tape-extend.ts";
import type { ConfigTape } from "../sim/walkforward.ts";

/**
 * `old` grown by the lane bars that closed since its last bar, read from the 1m (srcMin) candles: the same series
 * resampling everything from the same first bar gives (closed bars never change; the bucket still forming is not a
 * bar). Null when the candles no longer reach back to the stored last bar (the stored series cannot be continued).
 */
export function growBars(old: Bars, cs: CandleSeries, srcMin: number): Bars | null {
  const N = cs.n;
  if (!N || !old.n) return null;
  const tfMs = old.tfMin * 60_000;
  const lastOld = old.t[old.n - 1];
  const lastCs = cs.t[N - 1];
  if (lastCs < lastOld) return null;
  const add =
    old.tfMin === srcMin
      ? barsOfSeries(old.sym, old.tfMin, cs, cs.lowerBound(lastOld + tfMs), N)
      : resampleTailBars(old.sym, cs, srcMin, old.tfMin, Math.ceil((lastCs - lastOld) / tfMs) + 1);
  let from = 0;
  while (from < add.n && add.t[from] <= lastOld) from++;
  const m = add.n - from;
  if (m === 0) return old;
  // the first new bar follows the last stored one on the grid (a gap in the candles is a gap in the lane as well)
  const n = old.n + m;
  const cat = (a: Float64Array, b: Float64Array) => {
    const out = new Float64Array(n);
    out.set(a.subarray(0, old.n));
    out.set(b.subarray(from), old.n);
    return out;
  };
  const grown: Bars = {
    sym: old.sym,
    tfMin: old.tfMin,
    n,
    t: cat(old.t, add.t),
    o: cat(old.o, add.o),
    h: cat(old.h, add.h),
    l: cat(old.l, add.l),
    c: cat(old.c, add.c),
    v: cat(old.v, add.v),
  };
  if (old.lanes) grown.lanes = old.lanes;
  return grown;
}

/** One validated tape with its resumable state. */
interface Entry {
  tape: ConfigTape;
  resume: TapeResume;
}

/**
 * The incremental state: the tail universe of the last heavy compute (`base`, the window the tapes were built on) and
 * the tapes of the validated set. `step` grows the universe by the new closed bars and continues the resumable tapes;
 * what it cannot continue (a tape of another kind, a series whose stored bars changed) is reported, never guessed.
 */
export class IncrementalState {
  /** the tail universe the tapes are continued on: the heavy compute's, then grown by every step */
  universe: Universe;
  readonly entries = new Map<string, Entry>();
  /** the heavy compute's end (close time of the newest bar then) and the number of steps since */
  readonly seededNowT: number;
  steps = 0;

  readonly cost: number;
  readonly tactics: Tactics | null | undefined;
  readonly srcMin: number;

  constructor(universe: Universe, cost: number, tactics: Tactics | null | undefined, srcMin: number) {
    this.universe = universe;
    this.cost = cost;
    this.tactics = tactics;
    this.srcMin = srcMin;
    this.seededNowT = universe.nowT;
  }

  /**
   * Take the resumable tapes among `tapes` (the validated set: seated, held, signal) into the state, each re-run from
   * scratch on the universe (one full simulation per config, at heavy-compute time). A tape whose re-run does not give
   * the very tape it was built as is not taken (it stays with the heavy path). Returns the ids not taken.
   */
  seed(tapes: Iterable<ConfigTape>): { taken: number; skipped: string[] } {
    let taken = 0;
    const skipped: string[] = [];
    for (const tp of tapes) {
      if (!isResumable(tp)) {
        skipped.push(tp.id);
        continue;
      }
      const s = seedTape(tp, this.universe, this.cost, this.tactics);
      if (!s || !sameTape(s.tape, tp)) {
        skipped.push(tp.id);
        continue;
      }
      this.entries.set(tp.id, s);
      taken++;
    }
    return { taken, skipped };
  }

  /**
   * One step: the universe grown by the candles' new closed bars, then every taken tape continued on it. Null when the
   * universe cannot be grown (a symbol or lane gone, candles that no longer reach the stored bars): the caller falls back
   * to the full compute. `broken` lists the tapes that could not be continued (dropped from the state).
   */
  step(candles: ReadonlyMap<string, CandleSeries>): { tapes: Map<string, ConfigTape>; broken: string[] } | null {
    const grown: Bars[] = [];
    for (const b of this.universe.series) {
      const cs = candles.get(b.sym);
      if (!cs) return null;
      const g = growBars(b, cs, this.srcMin);
      if (!g) return null;
      grown.push(g);
    }
    const u = makeUniverse(grown, this.universe.evaluationFromT);
    const tapes = new Map<string, ConfigTape>();
    const broken: string[] = [];
    for (const [id, e] of this.entries) {
      const nx = extendTape(e.tape, e.resume, u, this.cost, this.tactics);
      if (!nx) {
        broken.push(id);
        continue;
      }
      this.entries.set(id, nx);
      tapes.set(id, nx.tape);
    }
    for (const id of broken) this.entries.delete(id);
    this.universe = u;
    this.steps++;
    return { tapes, broken };
  }
}

/** The very same tape: trades, open positions and pending entries. */
function sameTape(a: ConfigTape, b: ConfigTape): boolean {
  if (a.n !== b.n || a.id !== b.id) return false;
  if (a.n && (a.exitT[a.n - 1] !== b.exitT[b.n - 1] || a.rs[a.n] !== b.rs[b.n] || a.r2[a.n] !== b.r2[b.n])) return false;
  if (a.open.length !== b.open.length || a.pending.length !== b.pending.length) return false;
  for (let i = 0; i < a.open.length; i++) {
    const x = a.open[i];
    const y = b.open[i];
    if (x.sym !== y.sym || x.side !== y.side || x.entryT !== y.entryT || x.entry !== y.entry || x.stop !== y.stop || x.target !== y.target) return false;
  }
  return true;
}
