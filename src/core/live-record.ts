// Nominal lane attribution at venue fill/market prices. The merged venue position has no per-config allocation,
// so these rows alone are NOT verified funded executions and cannot authorize strict live promotion.
// Each lane is attributed here: it joins at the fill price of the order that grew its position in
// that step (or the market price when the position already covered it), and leaves at the fill of the order that
// shrank it (or the market price when no order was needed), or at the order that closed the position when the exchange
// closed it (its stop, its take-profit, or an order not ours: by hand).
// Its return is the exchange's price move minus the measured fees and slippage of a round trip.
//
// This attribution remains a useful diagnostic and feedback input. Strict admission separately requires settled
// post-Base accepted returns and independently measured owned-paper or verified-venue execution evidence.
import type { LiveGate } from "./live-validation.ts";
import { acceptKey, engineSideKey, sideAcceptKey, type ExchangeAccept } from "./signals.ts";
import { isSignalInd } from "./indications/registry.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { rangeOfId } from "./minimal-coord.ts";
import { modeledUnitReturn } from "./metrics/stats.ts";
import type { Trade } from "./domain/types.ts";

/** Full protection/source/lane/type identity plus the independently traded symbol and direction. */
export const executionRecordKey = (cfg: string, sym: string, side: number): string =>
  JSON.stringify([cfg, sym, side]);

export interface OwnedPaperClose {
  cfg: string;
  sym: string;
  side: number;
  exitT: number;
  unitR: number | null;
  ownedNotionalUsd: number | null;
}

/** Settled, post-Base execution results only; callers must never pass open-at-end marks or raw config tapes. */
export function postBaseExecutionRecords(trades: readonly Trade[]): Map<string, LiveRecord> {
  return identityRecords(trades.map((t) => ({ cfg: t.cfg, sym: t.sym, side: t.side, exitT: t.exitT, r: modeledUnitReturn(t) })));
}

/** Legacy/dust/unallocated rows stay chronological unknowns; they cannot qualify older winning closes. */
export function ownedPaperExecutionRecords(rows: readonly OwnedPaperClose[]): Map<string, LiveRecord> {
  return identityRecords(rows.map((t) => ({ ...t,
    r: typeof t.ownedNotionalUsd === "number" && Number.isFinite(t.ownedNotionalUsd) && t.ownedNotionalUsd > 1e-9
      ? t.unitR : null,
  })));
}

function identityRecords(rows: ReadonlyArray<{ cfg: string; sym: string; side: number; exitT: number; r: number | null }>): Map<string, LiveRecord> {
  const cfgs = new Map<string, string>();
  const named = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
  // Ambiguous DB identities never alias a valid short or disappear in favor of earlier wins. A single latest
  // unknown marker per possible identity is sufficient to hold its current window without a corrupt-row fanout.
  const known = new Map<string, { cfg: string; sym: string; side: number }>();
  for (const r of rows) if (named(r.cfg) && named(r.sym)) {
    for (const side of r.side === 1 || r.side === -1 ? [r.side] : [1, -1])
      known.set(executionRecordKey(r.cfg, r.sym, side), { cfg: r.cfg, sym: r.sym, side });
  }
  const ambiguous = new Map<string, { cfg: string; sym: string; side: number; exitT: number; r: null }>();
  const exact = rows.filter((r) => named(r.cfg) && named(r.sym) && (r.side === 1 || r.side === -1));
  for (const r of rows) {
    if (named(r.cfg) && named(r.sym) && (r.side === 1 || r.side === -1)) continue;
    for (const [key, identity] of known) {
      if (named(r.cfg) && r.cfg !== identity.cfg || named(r.sym) && r.sym !== identity.sym ||
        (r.side === 1 || r.side === -1) && r.side !== identity.side) continue;
      const previous = ambiguous.get(key);
      if (!previous || !Number.isFinite(r.exitT) || (Number.isFinite(previous.exitT) && r.exitT > previous.exitT))
        ambiguous.set(key, { ...identity, exitT: r.exitT, r: null });
    }
  }
  exact.push(...ambiguous.values());
  const records = liveRecords(exact.map((r) => {
    const key = executionRecordKey(r.cfg, r.sym, r.side);
    cfgs.set(key, r.cfg);
    return { cfg: key, exitT: r.exitT, r: r.r };
  }));
  // Group reporting still derives the range from the actual config, never the serialized composite key.
  for (const [key, record] of records) record.id = cfgs.get(key)!;
  return records;
}

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
  /** Prefix count of unknown unit returns; retains chronological legacy rows instead of skipping losses. */
  unknown?: Uint32Array;
}

export function liveRecords(rows: ReadonlyArray<{ cfg: string; exitT: number; r: number | null }>): Map<string, LiveRecord> {
  const by = new Map<string, Array<{ t: number; r: number | null }>>();
  for (const x of rows) (by.get(x.cfg) ?? by.set(x.cfg, []).get(x.cfg)!).push({ t: x.exitT, r: x.r });
  const out = new Map<string, LiveRecord>();
  for (const [id, xs] of by) {
    xs.sort((a, b) => a.t - b.t);
    const exitT = new Float64Array(xs.length);
    const gp = new Float64Array(xs.length + 1);
    const gl = new Float64Array(xs.length + 1);
    const unknown = new Uint32Array(xs.length + 1);
    xs.forEach((v, i) => {
      exitT[i] = v.t;
      const r = typeof v.r === "number" && Number.isFinite(v.r) ? v.r : null;
      gp[i + 1] = gp[i] + (r === null ? 0 : Math.max(0, r));
      gl[i + 1] = gl[i] + (r === null ? 0 : Math.max(0, -r));
      unknown[i + 1] = unknown[i] + Number(r === null);
    });
    out.set(id, { id, exitT, gp, gl, ...(unknown[xs.length] ? { unknown } : {}) });
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
 * sees the closes before t only (exit < t). Parallel signal configs share one onset count; every settled close stays
 * in return PF, as in SignalAcceptIndex / SignalGuard.
 */
export function exchangeAcceptIndex(
  closes: ReadonlyArray<{
    cfg: string;
    sym: string;
    side: number;
    exitT: number;
    r: number;
    entryT?: number;
  }>,
): ExchangeAccept & { size: number } {
  // Engine acceptance keeps one net sample per config entry, completed at its last close. Signals instead keep
  // each settled close's return and count the source onset once across its parallel protect configs: pooling them
  // into a net episode would hide mixed-sign close slices, while counting configs would inflate minTrades.
  type Close = {
    cfg: string;
    sym: string;
    side: number;
    exitT: number;
    r: number;
    entryT?: number;
  };
  const entries = new Map<string, Close>();
  const signals: Close[] = [];
  let anon = 0;
  for (const x of closes) {
    if (isSignalInd(x.cfg.split("|")[1] ?? "")) {
      signals.push(x);
      continue;
    }
    const k = x.entryT === undefined ? `#${anon++}` : `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`;
    const e = entries.get(k);
    if (!e) entries.set(k, { cfg: x.cfg, sym: x.sym, side: x.side, exitT: x.exitT, r: x.r });
    else {
      e.r += x.r;
      e.exitT = Math.max(e.exitT, x.exitT);
    }
  }
  const rows = [...entries.values(), ...signals];
  const by = new Map<string, Array<{ t: number; r: number; onset?: string; count: number }>>();
  const add = (k: string, t: number, r: number, onset?: string) =>
    (by.get(k) ?? by.set(k, []).get(k)!).push({ t, r, onset, count: 1 });
  for (const x of rows) {
    const ind = x.cfg.split("|")[1] ?? "";
    const kind = kindOfId(x.cfg);
    if (isSignalInd(ind)) {
      const coordination = isSignalCoordinationInd(ind);
      const onset =
        x.entryT === undefined ? undefined : `${ind}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`;
      add(acceptKey(ind, x.sym, x.side, kind), x.exitT, x.r, onset);
      add(sideAcceptKey(x.side, coordination), x.exitT, x.r, onset);
    } else {
      const tag = rangeOfId(x.cfg) || undefined;
      add(engineSideKey(kind, tag, x.side), x.exitT, x.r);
      add(engineSideKey(kind, tag, x.side, ind), x.exitT, x.r);
    }
  }
  for (const l of by.values()) {
    l.sort((a, b) => a.t - b.t);
    const seen = new Set<string>();
    for (const x of l) {
      if (x.onset === undefined) continue;
      x.count = seen.has(x.onset) ? 0 : 1;
      seen.add(x.onset);
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
        if (x.t >= t) continue;
        if (x.t <= from) break;
        n += x.count;
        if (x.r > 0) gp += x.r;
        else gl -= x.r;
      }
      return { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
    },
  };
}
