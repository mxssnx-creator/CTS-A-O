// The live record: every config's closed orders as the EXCHANGE executed them, not as the simulation or the paper
// book priced them. The control desk merges every config's lane into one position per symbol × side, so the exchange
// knows no configs; each lane is attributed here: it joins at the fill price of the order that grew its position in
// that step (or the market price when the position already covered it), and leaves at the fill of the order that
// shrank it (or the market price when no order was needed), or at the order that closed the position when the exchange
// closed it (its stop, its take-profit, or an order not ours: by hand).
// Its return is the exchange's price move minus the measured fees and slippage of a round trip.
//
// The record decides wherever the desk has one: a config's live validation (its last N closes), its group's pooled
// last N, and the auto-adjuster's set windows read the exchange record once it holds that many closes, and the
// simulated forward tape (the closes the engine computes causally on the live bars) only until then.
import type { LiveGate } from "./live-validation.ts";
import { acceptKey, engineSideKey, sideAcceptKey, type ExchangeAccept } from "./signals.ts";
import { isSignalInd } from "./indications/registry.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { rangeOfId } from "./minimal-coord.ts";

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
  /** the paper position's identity: `${cfg}|${sym}|${side 1 / -1}|${paper entryT}` (long and short apart) */
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
  /**
   * how the lane left: "exit" (the desk moved the position), "stop" (the exchange closed it at its stop), "target"
   * (at its take-profit), "hand" (an order that is not ours closed it: by hand in the venue, or another system)
   */
  reason: "exit" | "stop" | "target" | "hand";
}

export interface LaneStepInput {
  /** the lanes that asked for volume on the exchange this step (after every filter): id, cfg, sym, side */
  lanes: ReadonlyArray<{ id?: string; cfg: string; sym: string; side: 1 | -1; key?: string; lk?: string }>;
  /** control keys (`sym|side`) held on the exchange after this step's orders */
  heldAfter: ReadonlySet<string>;
  /** fill price of this step's open / increase per key, and of its reduce / close */
  grew: ReadonlyMap<string, number>;
  shrank: ReadonlyMap<string, number>;
  /** keys the exchange closed outside this step (stop-out or by hand) → the price they closed at when known */
  external: ReadonlyMap<string, number | null>;
  /** of those, the keys its take-profit or an order not ours closed; unset = by its stop */
  externalWhy?: ReadonlyMap<string, "stop" | "target" | "hand">;
  /** lanes the venue closed by their own order (lane orders: laneKeyOf id → its fill price and kind) */
  laneExit?: ReadonlyMap<string, { px: number; reason: "stop" | "target" }>;
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
 * A lane's position identity with its direction (the runtime's posId): long and short of one config on one symbol
 * run independently and can enter on the same bar, so the lane order id (cfg|sym|entryT) alone would merge them.
 */
export function laneKeyOf(l: { id: string; cfg: string; sym: string; side: number }): string {
  const base = laneIdOf(l.id);
  return `${l.cfg}|${l.sym}|${l.side > 0 ? 1 : -1}|${base.slice(base.lastIndexOf("|") + 1)}`;
}

/**
 * The paper entry time a lane id carries (its last segment, as laneKeyOf reads it). live_lane_trades.entry_t is not
 * this: it is the exchange join time of the lane. undefined when the id carries no number.
 */
export function laneEntryTOf(id: string): number | undefined {
  const base = laneIdOf(id);
  const s = base.slice(base.lastIndexOf("|") + 1);
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : undefined;
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
    // (the lane's key strings when the control built them once per position; else built here)
    const key = l.key ?? `${l.sym}|${l.side}`;
    if (!x.heldAfter.has(key)) continue;
    live.set(l.lk ?? laneKeyOf({ id: l.id, cfg: l.cfg, sym: l.sym, side: l.side }), l);
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
    const own = x.laneExit?.get(id);
    if (own) {
      close(id, o, own.px, own.reason);
      continue;
    }
    if (x.external.has(key)) {
      close(id, o, x.external.get(key) ?? x.prices.get(o.sym) ?? 0, x.externalWhy?.get(key) ?? "stop");
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

/**
 * The exchange closes as acceptance groups: a signal close enters its signal × symbol × side group and its side's pooled
 * group, an engine close its type family × range × side group — the keys the simulation's acceptance judges. A signal
 * group sees the closes in (t − hours, t], as SignalAcceptIndex does (a close exactly at t counts); an engine group sees
 * the closes before t (exit < t), as the engine side does.
 */
export function exchangeAcceptIndex(
  rows: ReadonlyArray<{ cfg: string; sym: string; side: number; exitT: number; r: number; entryT?: number }>,
): ExchangeAccept & { size: number } {
  const by = new Map<string, Array<{ t: number; r: number; sig: boolean; on?: string; o?: false }>>();
  const add = (k: string, t: number, r: number, sig: boolean, on?: string) =>
    (by.get(k) ?? by.set(k, []).get(k)!).push({ t, r, sig, on });
  for (const x of rows) {
    const ind = x.cfg.split("|")[1] ?? "";
    const kind = kindOfId(x.cfg);
    if (isSignalInd(ind)) {
      // a signal entry (indication × symbol × direction × entry time) counts once in its groups, as the simulation's
      // (signals.ts feedBooks); its k configs' lanes share it. A row without an entry time counts as its own close.
      const on = x.entryT !== undefined ? `${ind}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}` : undefined;
      add(acceptKey(ind, x.sym, x.side, kind), x.exitT, x.r, true, on);
      add(sideAcceptKey(x.side), x.exitT, x.r, true, on);
    } else {
      const tag = rangeOfId(x.cfg) || undefined;
      add(engineSideKey(kind, tag, x.side), x.exitT, x.r, false);
      add(engineSideKey(kind, tag, x.side, ind), x.exitT, x.r, false);
    }
  }
  for (const l of by.values()) {
    l.sort((a, b) => a.t - b.t);
    // an entry counts at its first close in exit order (causal); its later closes add to the PF only
    const seen = new Set<string>();
    for (const x of l) {
      if (x.on === undefined) continue;
      if (seen.has(x.on)) x.o = false;
      else seen.add(x.on);
    }
  }
  return {
    size: rows.length,
    stats(key, t, hours) {
      const l = by.get(key);
      if (!l) return { n: 0, pf: 0 };
      const from = t - hours * 3_600_000;
      let n = 0;
      let gp = 0;
      let gl = 0;
      for (let i = l.length - 1; i >= 0; i--) {
        const x = l[i];
        // a signal group: the closes up to t (SignalAcceptIndex); an engine group: the closes before t
        if (x.sig ? x.t > t : x.t >= t) continue;
        if (x.t <= from) break;
        if (x.o !== false) n++;
        if (x.r > 0) gp += x.r;
        else gl -= x.r;
      }
      return { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
    },
  };
}
