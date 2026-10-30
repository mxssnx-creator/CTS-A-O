import type { Bars, Trade, OpenPosition, Protect, Side } from "../domain/types.ts";
import type { Universe } from "../pipeline/pipeline.ts";
const PROFILE = typeof process !== "undefined" && process.env.CTS_CORE_PROFILE_REALTIME === "1";

export interface CursorResult {
  trades: Trade[];
  open?: OpenPosition | null;
  pending: Side | 0;
  pendingProtect?: Protect;
  /** Captured only when this signal was simulated on a minute-projected execution series. */
  pendingExecution?: PendingExecution;
}

export interface PendingExecution { tfMin: number; holdMin: number }
export interface PendingTapeEntry {
  sym: string;
  side: Side;
  protect?: Protect;
  execution?: PendingExecution;
}

/** Preserve the simulator's own pending entry, including its execution-clock provenance. */
export function pendingFromResult(sym: string, result: CursorResult): PendingTapeEntry | null {
  if (!result.pending) return null;
  return { sym, side: result.pending,
    ...(result.pendingProtect ? { protect: result.pendingProtect } : {}),
    ...(result.pendingExecution ? { execution: { ...result.pendingExecution } } : {}) };
}

/** A private, append-only simulator continuation. Revisit one boundary bar so its pending signal can enter
 * at the newly known next open. Previously emitted closes are suppressed, never re-counted or re-priced. */
export class SimulationCursor {
  private state: unknown;
  private count = 0;
  private firstT = 0;
  private lastT = 0;
  private sym = "";
  private tfMin = 0;
  private throughT = -Infinity;
  private captured = false;
  private cached: unknown;
  start = 0;
  closed = 0;

  run<R extends { trades: Trade[] }>(b: Bars, next: () => R): R {
    if (
      this.cached &&
      b.n === this.count &&
      b.sym === this.sym &&
      b.tfMin === this.tfMin &&
      b.t[0] === this.firstT &&
      b.t[b.n - 1] === this.lastT
    )
      return { ...(this.cached as R), trades: [] };
    const result = next();
    this.cached = { ...result, trades: [] };
    return result;
  }

  begin(b: Bars) {
    if (
      this.count &&
      (b.sym !== this.sym ||
        b.tfMin !== this.tfMin ||
        b.n <= this.count ||
        b.t[0] !== this.firstT ||
        b.t[this.count - 1] !== this.lastT)
    )
      throw new Error("simulator cursor requires unchanged history and strictly appended bars");
    this.start = this.count ? this.count - 1 : 0;
    this.captured = false;
  }

  restore<S>(initial: S): S {
    // The saved state is private and consumed by this serialized call. Only the next boundary needs a copy;
    // cloning two complete object graphs per config × symbol × side dominated the candle cycle.
    return this.state === undefined ? initial : (this.state as S);
  }

  private copyState<S>(state: S): S {
    const value = state as Record<string, unknown>;
    const out = { ...value };
    // Protect recipes, rung definitions and primitive state are immutable. Only active legs and the live
    // trailing/protection objects can change while replaying the boundary bar. Preserve their shared aliases.
    if (Array.isArray(value.legs) && value.legs.length)
      out.legs = value.legs.map((x) => (typeof x === "object" && x !== null ? { ...x } : x));
    if (Array.isArray(value.weights)) out.weights = value.weights.slice();
    if (value.inPos) {
      if (value.exitProtection) out.exitProtection = { ...(value.exitProtection as object) };
      if (value.exitPosition)
        out.exitPosition = {
          ...(value.exitPosition as object),
          exitProtection: out.exitProtection,
        };
      if (value.trailPosition) out.trailPosition = { ...(value.trailPosition as object) };
    }
    return out as S;
  }

  checkpoint<S>(i: number, n: number, state: () => S) {
    if (i !== n - 1) return;
    this.state = this.copyState(state());
    this.captured = true;
  }

  /** A flat scanner can jump directly past the last signal; its unchanged flat state is the boundary state. */
  finish<S>(b: Bars, trades: Trade[], state: () => S): Trade[] {
    if (!this.captured) this.state = this.copyState(state());
    const fresh = this.count ? trades.filter((t) => t.exitT > this.throughT) : trades;
    this.closed += fresh.length;
    this.count = b.n;
    this.sym = b.sym;
    this.tfMin = b.tfMin;
    this.firstT = b.t[0];
    this.lastT = b.t[b.n - 1];
    this.throughT = b.n ? this.lastT + b.tfMin * 60_000 : -Infinity;
    return fresh;
  }
}

/** Kept only by one realtime worker generation; configurations and sides never share position state. */
export class TapeContinuations {
  private configs = new Map<string, Map<string, SimulationCursor>>();
  private plans = new Map<
    SimulationCursor,
    { id: string; sym: string; tf: number; run: (u: Universe) => CursorResult }
  >();
  profile: Record<string, number> = { sourceMs: 0, simulationMs: 0, streams: 0 };
  measure<R>(field: "sourceMs" | "simulationMs", run: () => R, label?: string): R {
    if (!PROFILE) return run();
    const t = performance.now();
    try {
      return run();
    } finally {
      const elapsed = performance.now() - t;
      this.profile[field] += elapsed;
      if (label) this.profile[label] = (this.profile[label] ?? 0) + elapsed;
    }
  }
  bind(cursor: SimulationCursor, id: string, b: Bars, run: (u: Universe) => CursorResult) {
    if (!this.plans.has(cursor)) this.plans.set(cursor, { id, sym: b.sym, tf: b.tfMin, run });
  }
  *advance(u: Universe, changedTfs: ReadonlySet<number>) {
    this.profile = { sourceMs: 0, simulationMs: 0, streams: 0 };
    const touched = new Set<string>();
    for (const plan of this.plans.values()) if (changedTfs.has(plan.tf)) touched.add(plan.id);
    for (const plan of this.plans.values())
      if (touched.has(plan.id)) {
        this.profile.streams++;
        yield { id: plan.id, sym: plan.sym, result: plan.run(u) };
      }
  }
  cursor(id: string, b: Bars, side: number): SimulationCursor {
    let streams = this.configs.get(id);
    if (!streams) this.configs.set(id, (streams = new Map()));
    const key = `${b.sym}|${b.tfMin}|${side}`;
    let cursor = streams.get(key);
    if (!cursor) streams.set(key, (cursor = new SimulationCursor()));
    return cursor;
  }
  closed(id: string) {
    let n = 0;
    for (const cursor of this.configs.get(id)?.values() ?? []) n += cursor.closed;
    return n;
  }
}
