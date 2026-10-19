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
   * (at its take-profit), "hand" (an order that is not ours closed it: by hand in the venue, or another system),
   * "liq" (the venue liquidated or auto-deleveraged the position: an own loss), "unverified" (the venue's history could
   * not say what closed it and the bars proved neither level: booked at the price then, never counted as an own close)
   */
  reason: "exit" | "stop" | "target" | "hand" | "liq" | "unverified";
  /**
   * where the exit price comes from: "fill" (the fill of our own order), "history" (the venue's order history),
   * "bar" (the stop / target level the 1m bars proved reached), "ticker" (the market price when the desk saw it).
   * Unset: a row from before the source was recorded.
   */
  pxSrc?: PxSrc;
}

/** The source of a lane's exit price (live_lane_trades.px_src). */
export type PxSrc = "fill" | "history" | "bar" | "ticker";

/** How the exchange closed a side outside the desk's own step (live-record's `externalWhy`; unset = by its stop). */
export type OutsideWhy = "stop" | "target" | "hand" | "liq" | "unverified";

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
  externalWhy?: ReadonlyMap<string, OutsideWhy>;
  /** of those, where a known price comes from (unset: not recorded); an unknown price is the ticker's */
  externalSrc?: ReadonlyMap<string, PxSrc>;
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
  const close = (id: string, o: LaneOpen, px: number, reason: LaneTrade["reason"], pxSrc: PxSrc | undefined) => {
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
      ...(pxSrc ? { pxSrc } : {}),
    });
  };
  for (const [id, o] of Object.entries(open)) {
    const key = `${o.sym}|${o.side}`;
    const own = x.laneExit?.get(id);
    if (own) {
      close(id, o, own.px, own.reason, "fill");
      continue;
    }
    if (x.external.has(key)) {
      const px = x.external.get(key);
      const why = x.externalWhy?.get(key) ?? "stop";
      if (px !== null && px !== undefined && px > 0) close(id, o, px, why, x.externalSrc?.get(key));
      else close(id, o, x.prices.get(o.sym) ?? 0, why, "ticker");
      continue;
    }
    if (live.has(id)) {
      next[id] = o;
      continue;
    }
    const sp = x.shrank.get(key);
    close(id, o, sp ?? x.prices.get(o.sym) ?? 0, "exit", sp !== undefined ? "fill" : "ticker");
  }
  for (const [id, l] of live) {
    if (next[id]) continue;
    const key = `${l.sym}|${l.side}`;
    const px = x.grew.get(key) ?? x.prices.get(l.sym) ?? 0;
    if (px > 0) next[id] = { cfg: l.cfg, sym: l.sym, side: l.side, t: x.now, px };
  }
  return { open: next, closed };
}

/**
 * A config's exchange closes, shaped like a tape for the gates: exit times ascending and gain / loss prefix sums.
 * `id` is the config; `side` is set on a record kept per side (liveRecords bySide).
 */
export interface LiveRecord {
  id: string;
  side?: 1 | -1;
  exitT: Float64Array;
  gp: Float64Array;
  gl: Float64Array;
}

/** A record's key in a map: the config alone, or the config and its side (live.sideGates: each side's own record). */
export function recordKeyOf(cfg: string, side?: 1 | -1): string {
  return side === undefined ? cfg : `${cfg}|${side}`;
}

/**
 * The config and the side of a per-side record key (recordKeyOf with a side): the side is the part after the last "|",
 * so a config id that contains "|" is split correctly. Only for keys of the per-side path (live.sideGates).
 */
export function splitRecordKey(key: string): { cfg: string; side: 1 | -1 } {
  const i = key.lastIndexOf("|");
  return { cfg: key.slice(0, i), side: key.slice(i + 1) === "1" ? 1 : -1 };
}

/**
 * The side of a close, a lane or an entry on the per-side path (live.sideGates): +1 (LONG) or -1 (SHORT). Any other
 * value (0, null, undefined) belongs to neither side.
 */
export function sideOfRow(s: number | null | undefined): 1 | -1 | undefined {
  return s === 1 || s === -1 ? s : undefined;
}

/**
 * The records of the closes, by config. With `bySide` (live.sideGates) one record per config and side, keyed
 * cfg|1 / cfg|-1; a close with no side of its own (sideOfRow: not +1 or -1) belongs to neither side and is left out.
 */
export function liveRecords(
  rows: ReadonlyArray<{ cfg: string; exitT: number; r: number; side?: number | null }>,
  o?: { bySide?: boolean },
): Map<string, LiveRecord> {
  const bySide = o?.bySide === true;
  const by = new Map<string, { cfg: string; side?: 1 | -1; xs: Array<{ t: number; r: number }> }>();
  for (const x of rows) {
    const side = bySide ? sideOfRow(x.side) : undefined;
    if (bySide && side === undefined) continue;
    const key = recordKeyOf(x.cfg, side);
    let b = by.get(key);
    if (!b) by.set(key, (b = { cfg: x.cfg, side, xs: [] }));
    b.xs.push({ t: x.exitT, r: x.r });
  }
  const out = new Map<string, LiveRecord>();
  for (const [key, { cfg, side, xs }] of by) {
    xs.sort((a, b) => a.t - b.t);
    const exitT = new Float64Array(xs.length);
    const gp = new Float64Array(xs.length + 1);
    const gl = new Float64Array(xs.length + 1);
    xs.forEach((v, i) => {
      exitT[i] = v.t;
      gp[i + 1] = gp[i] + Math.max(0, v.r);
      gl[i + 1] = gl[i] + Math.max(0, -v.r);
    });
    out.set(key, side === undefined ? { id: cfg, exitT, gp, gl } : { id: cfg, side, exitT, gp, gl });
  }
  return out;
}

/** The exchange record's verdict once it holds N closes; the simulated one until then. */
export function preferExchange(exchange: LiveGate | null | undefined, sim: LiveGate): LiveGate {
  return exchange && exchange.pf !== null ? { ...exchange, source: "exchange" } : { ...sim, source: "sim" };
}

/**
 * The exchange closes as acceptance groups: a signal close enters its signal × symbol × side group and its side's pooled
 * group, an engine close its type family × range × side group — the keys the simulation's acceptance judges. A group
 * sees the closes before t only (exit < t).
 */
export function exchangeAcceptIndex(
  closes: ReadonlyArray<{ cfg: string; sym: string; side: number; exitT: number; r: number; entryT?: number }>,
): ExchangeAccept & { size: number } {
  // one sample per entry, as the simulation counts it: the exchange closes of one entry (its lanes, netted into one
  // position) are one trade — r is their sum, and the sample exits when its last close does. Without an entry time
  // each close stands alone.
  const entries = new Map<string, { cfg: string; sym: string; side: number; exitT: number; r: number }>();
  let anon = 0;
  for (const x of closes) {
    const k = x.entryT === undefined ? `#${anon++}` : `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`;
    const e = entries.get(k);
    if (!e) entries.set(k, { cfg: x.cfg, sym: x.sym, side: x.side, exitT: x.exitT, r: x.r });
    else {
      e.r += x.r;
      e.exitT = Math.max(e.exitT, x.exitT);
    }
  }
  const rows = [...entries.values()];
  const by = new Map<string, Array<{ t: number; r: number }>>();
  const add = (k: string, t: number, r: number) => (by.get(k) ?? by.set(k, []).get(k)!).push({ t, r });
  for (const x of rows) {
    const ind = x.cfg.split("|")[1] ?? "";
    const kind = kindOfId(x.cfg);
    if (isSignalInd(ind)) {
      add(acceptKey(ind, x.sym, x.side, kind), x.exitT, x.r);
      add(sideAcceptKey(x.side), x.exitT, x.r);
    } else {
      const tag = rangeOfId(x.cfg) || undefined;
      add(engineSideKey(kind, tag, x.side), x.exitT, x.r);
      add(engineSideKey(kind, tag, x.side, ind), x.exitT, x.r);
    }
  }
  for (const l of by.values()) l.sort((a, b) => a.t - b.t);
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
        if (x.t >= t) continue;
        if (x.t <= from) break;
        n++;
        if (x.r > 0) gp += x.r;
        else gl -= x.r;
      }
      return { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
    },
  };
}
