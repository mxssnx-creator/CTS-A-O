// The live record: every config's closed orders as the EXCHANGE executed them, not as the simulation or the paper
// book priced them. The control desk merges every config's lane into one position per symbol × side, so the exchange
// knows no configs; each lane is attributed here: it joins at the fill price of the order that grew its position in
// that step (or the market price when the position already covered it), and leaves at the fill of the order that
// shrank it (or the market price when no order was needed), or at the position's own stop when the exchange closed it.
// Its return is the exchange's price move minus the measured fees and slippage of a round trip.
//
// The record decides wherever the desk has one: a config's live validation (its last N closes), its group's pooled
// last N, and the auto-adjuster's set windows read the exchange record once it holds that many closes, and the
// simulated forward tape (the closes the engine computes causally on the live bars) only until then.
import type { LiveGate } from "./live-validation.ts";

/** A lane of a held exchange position: one paper position of one config (its Block legs folded in). */
export interface LaneOpen {
  cfg: string;
  sym: string;
  side: 1 | -1;
  /** when the lane joined the exchange position, and at what exchange price */
  t: number;
  px: number;
}

export interface LaneTrade {
  /** lane id: `${cfg}|${sym}|${paper entryT}` */
  id: string;
  cfg: string;
  sym: string;
  side: 1 | -1;
  entryT: number;
  exitT: number;
  entry: number;
  exit: number;
  /** side × exit / entry − 1, minus the round-trip cost */
  r: number;
  /** how the lane left: "exit" (the desk moved the position), "stop" (the exchange closed it) */
  reason: "exit" | "stop";
}

export interface LaneStepInput {
  /** the lanes that asked for volume on the exchange this step (after every filter): id, cfg, sym, side */
  lanes: ReadonlyArray<{ id?: string; cfg: string; sym: string; side: 1 | -1 }>;
  /** control keys (`sym|side`) held on the exchange after this step's orders */
  heldAfter: ReadonlySet<string>;
  /** fill price of this step's open / increase per key, and of its reduce / close */
  grew: ReadonlyMap<string, number>;
  shrank: ReadonlyMap<string, number>;
  /** keys the exchange closed outside this step (stop-out or by hand) → the stop price when known */
  external: ReadonlyMap<string, number | null>;
  /** market prices */
  prices: ReadonlyMap<string, number>;
  /** measured round-trip cost (fees + adverse slippage, fraction); 0 when not measured yet */
  cost: number;
  now: number;
}

/** Block legs (`…|blk:src`) are the same lane: one config's paper position. */
export function laneIdOf(id: string): string {
  const i = id.indexOf("|blk:");
  return i < 0 ? id : id.slice(0, i);
}

/**
 * One control step of attribution. `open` is the state after the previous step (lane id → open lane). Returns the
 * next state and the lanes that closed this step.
 */
export function attributeLanes(
  open: Readonly<Record<string, LaneOpen>>,
  x: LaneStepInput,
): { open: Record<string, LaneOpen>; closed: LaneTrade[] } {
  const next: Record<string, LaneOpen> = {};
  const closed: LaneTrade[] = [];
  const live = new Map<string, { cfg: string; sym: string; side: 1 | -1 }>();
  for (const l of x.lanes) {
    if (!l.id) continue;
    const key = `${l.sym}|${l.side}`;
    if (!x.heldAfter.has(key)) continue;
    live.set(laneIdOf(l.id), { cfg: l.cfg, sym: l.sym, side: l.side });
  }
  const close = (id: string, o: LaneOpen, px: number, reason: LaneTrade["reason"]) => {
    if (!(px > 0) || !(o.px > 0)) return;
    closed.push({
      id,
      cfg: o.cfg,
      sym: o.sym,
      side: o.side,
      entryT: o.t,
      exitT: x.now,
      entry: o.px,
      exit: px,
      r: (o.side * (px - o.px)) / o.px - x.cost,
      reason,
    });
  };
  for (const [id, o] of Object.entries(open)) {
    const key = `${o.sym}|${o.side}`;
    if (x.external.has(key)) {
      close(id, o, x.external.get(key) ?? x.prices.get(o.sym) ?? 0, "stop");
      continue;
    }
    if (live.has(id)) {
      next[id] = o;
      continue;
    }
    close(id, o, x.shrank.get(key) ?? x.prices.get(o.sym) ?? 0, "exit");
  }
  for (const [id, l] of live) {
    if (next[id]) continue;
    const key = `${l.sym}|${l.side}`;
    const px = x.grew.get(key) ?? x.prices.get(l.sym) ?? 0;
    if (px > 0) next[id] = { cfg: l.cfg, sym: l.sym, side: l.side, t: x.now, px };
  }
  return { open: next, closed };
}

/** A config's exchange closes, shaped like a tape for the gates: exit times ascending and gain / loss prefix sums. */
export interface LiveRecord {
  id: string;
  exitT: Float64Array;
  gp: Float64Array;
  gl: Float64Array;
}

export function liveRecords(rows: ReadonlyArray<{ cfg: string; exitT: number; r: number }>): Map<string, LiveRecord> {
  const by = new Map<string, Array<{ t: number; r: number }>>();
  for (const x of rows) (by.get(x.cfg) ?? by.set(x.cfg, []).get(x.cfg)!).push({ t: x.exitT, r: x.r });
  const out = new Map<string, LiveRecord>();
  for (const [id, xs] of by) {
    xs.sort((a, b) => a.t - b.t);
    const exitT = new Float64Array(xs.length);
    const gp = new Float64Array(xs.length + 1);
    const gl = new Float64Array(xs.length + 1);
    xs.forEach((v, i) => {
      exitT[i] = v.t;
      gp[i + 1] = gp[i] + Math.max(0, v.r);
      gl[i + 1] = gl[i] + Math.max(0, -v.r);
    });
    out.set(id, { id, exitT, gp, gl });
  }
  return out;
}

/** The exchange record's verdict once it holds N closes; the simulated one until then. */
export function preferExchange(exchange: LiveGate | null | undefined, sim: LiveGate): LiveGate {
  return exchange && exchange.pf !== null ? { ...exchange, source: "exchange" } : { ...sim, source: "sim" };
}
