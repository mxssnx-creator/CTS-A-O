// Live stage planner (pure). The adapter (live.server.ts) executes its plan.
// Rules:
//   - OFF unless settings.live.enabled AND env CTS_CORE_LIVE=1 AND keys exist
//   - own tickets carry the CTSB tag of this connection; nothing else is ever cancelled or closed
//   - a foreign position or order freezes its own side (hedge mode), or the whole symbol (one-way mode, or an order
//     without a position side)
//   - the final live admission cap counts unique exchange positions (symbol × direction in hedge mode), foreign ones
//     included; fixed notional per entry
import { exchangePositionLimit, type LiveSettings } from "../config.ts";
import { sigCfg } from "../sim/walkforward.ts";
import { rangeOfId } from "../minimal-coord.ts";
import type { RangeTag } from "../domain/types.ts";
import { isSignalCoordinationInd } from "../signal-coordination.ts";

export const LIVE_TAG: Record<LiveSettings["connId"], string> = {
  "bingx-x01": "CTSBX1_",
  "bingx-vst-01": "CTSBV1_",
  "bingx-vst-02": "CTSBV2_",
};

/**
 * Tracking tag of a connection. CTS_CORE_LIVE_TAG (2–12 letters / digits, then "_") gives a test run its own
 * tag, so its orders and positions are told apart from another desk on the same account; each side treats the
 * other's symbols as foreign.
 */
export function liveTag(connId: LiveSettings["connId"], env: NodeJS.ProcessEnv = process.env): string {
  const own = (env.CTS_CORE_LIVE_TAG ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{2,12}_$/.test(own) ? own : LIVE_TAG[connId];
}

export function liveNetwork(connId: LiveSettings["connId"]): "mainnet" | "testnet" {
  return connId === "bingx-x01" ? "mainnet" : "testnet";
}

/** Entry tracking kind per range: U micro, M minimal plus, N minimal, H short; E the wide grid or a mix. */
export const RANGE_COID: Record<RangeTag, "U" | "M" | "N" | "H" | "G" | "L"> = {
  mc: "U",
  mp: "M",
  mn: "N",
  sh: "H",
  gn: "G",
  lg: "L",
};
export type EntryKind = "E" | "U" | "M" | "N" | "H" | "G" | "L" | "Q";

/**
 * Entry tracking kind of a config: its range letter, "Q" for a signal config (signals carry no range tag; without
 * their own letter their live closes landed in Wide), else "E" (the wide grid or a mix).
 */
export function entryCoidKind(cfg: string | undefined): EntryKind {
  const ind = cfg?.split("|")[1] ?? "";
  if (isSignalCoordinationInd(ind)) {
    const range = rangeOfId(cfg);
    if (range) return RANGE_COID[range];
  }
  if (cfg && sigCfg(cfg)) return "Q";
  const r = rangeOfId(cfg);
  return r ? RANGE_COID[r] : "E";
}

export function makeCoid(
  connId: LiveSettings["connId"],
  kind: EntryKind | "S" | "T" | "C" | "V" | "Y",
  now = Date.now(),
): string {
  return `${liveTag(connId)}${kind}${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(
    0,
    40,
  );
}

export function isOwnCoid(coid: string | undefined, connId: LiveSettings["connId"]): boolean {
  return !!coid && coid.toUpperCase().startsWith(liveTag(connId));
}

/**
 * The kind letter of an own order (makeCoid: S the protective stop, T the take-profit, C a close, an entry letter …);
 * "" for an order that is not ours. A position's stop and its take-profit rest side by side: whatever looks for one
 * must not take the other for it.
 */
export function ownCoidKind(coid: string | undefined, connId: LiveSettings["connId"]): string {
  if (!coid || !isOwnCoid(coid, connId)) return "";
  return coid.charAt(liveTag(connId).length).toUpperCase();
}

/** Symbols we own on the exchange: own-tagged open orders, or a position that one of our recent entries opened. */
export function ownSymbols(
  book: BookView,
  connId: LiveSettings["connId"],
  recentEntrySyms: ReadonlySet<string>,
): Set<string> {
  const own = new Set<string>();
  for (const o of book.orders) if (isOwnCoid(o.clientOrderId, connId)) own.add(o.venueSymbol);
  for (const p of book.positions)
    if (
      recentEntrySyms.has(p.venueSymbol) &&
      !book.orders.some(
        (o) => o.venueSymbol === p.venueSymbol && !isOwnCoid(o.clientOrderId, connId),
      )
    )
      own.add(p.venueSymbol);
  return own;
}

export interface BookView {
  positions: Array<{
    symbol: string;
    venueSymbol: string;
    side: "long" | "short";
    qty: number;
    upnl?: number;
    margin?: number;
    /** the liquidation price the exchange reports (0 / unset: none) */
    liq?: number;
    /** entry, mark and leverage as the exchange reports them (display only) */
    entry?: number;
    mark?: number;
    leverage?: number;
  }>;
  orders: Array<{
    id?: string;
    symbol: string;
    venueSymbol: string;
    clientOrderId?: string;
    positionSide?: "LONG" | "SHORT";
    type?: string;
    stopPrice?: number;
    remainingQty?: number;
  }>;
  /**
   * Set when the open orders could not be read (their endpoint is rate limited): positions are fresh, `orders` is
   * the last read from that time. Opening, closing and reducing go on; stop repairs and leftover cancels wait.
   */
  ordersAt?: number;
}

export interface LiveIntentLite {
  cfg: string;
  sym: string; // venue symbol, e.g. BTC-USDT
  side: 1 | -1;
  tp: number;
  sl: number;
  /** open time of the bar the signal was decided on (the symbol's own newest bar) */
  barT: number;
  /** Extra multiplier relative to a normal order; 1 = neutral. */
  volFactor?: number;
  /** Range multiplier captured by the validated Real entry. */
  rangeVol?: number;
  /**
   * the simulation manages the exit (trailing stop, DCA / Axis legs, …): a static exchange SL / TP cannot mirror
   * it, so entries mode skips it (overall mode mirrors every paper exit)
   */
  managed?: boolean;
  /** Stable-02 relation-volume multiplier captured by the runtime's validated intent. */
  coordVol?: number;
  /** Block's settled-order execution multiplier captured by the Real-stage decision. */
  blockVol?: number;
  /** Relate's settled-order execution multiplier captured by the Real-stage decision. */
  relateVol?: number;
  /** Real-stage maximum for the combined external execution multiplier. */
  maxStack?: number;
  /** This entry belongs to the negative-hour hedge-only Signal set. */
  hedge?: boolean;
  /** Hedge-only size multiplier captured with the intent. */
  hedgeVol?: number;
}

export interface LivePlan {
  enabled: boolean;
  reason: string;
  entries: LiveIntentLite[];
  skipped: Array<{ sym: string; why: string }>;
}

/** Side is part of an Entries intent: hedge-mode long and short can coexist on the same bar. */
export const entryIntentKey = (i: { cfg: string; sym: string; barT: number; side: 1 | -1 }): string =>
  `${i.cfg}|${i.sym}|${i.barT}|side=${i.side}`;
export const legacyEntryIntentKey = (i: { cfg: string; sym: string; barT: number }): string =>
  `${i.cfg}|${i.sym}|${i.barT}`;

export function planLive(input: {
  settings: LiveSettings;
  envArmed: boolean;
  hasKeys: boolean;
  intents: readonly LiveIntentLite[];
  book: BookView | null;
  /** venue symbols we currently hold via our own tagged entries */
  ownSyms: ReadonlySet<string>;
  /** intent keys already sent (cfg|sym|barT) */
  sent: ReadonlySet<string>;
  /** readiness: the rolling simulated run must be PF >= min and stable, otherwise Live stays off */
  ready?: { ok: boolean; why: string };
  /** newest bar open time across the universe: a signal on an older bar (lagging symbol) is stale */
  newestBarT?: number;
}): LivePlan {
  const { settings, intents, book } = input;
  const off = (reason: string): LivePlan => ({ enabled: false, reason, entries: [], skipped: [] });
  if (!settings.enabled) return off("live disabled in settings");
  if (!input.envArmed) return off("CTS_CORE_LIVE=1 not set on the host");
  if (!input.hasKeys) return off(`no API keys for ${settings.connId}`);
  if (input.ready && !input.ready.ok) return off(`not ready: ${input.ready.why}`);
  if (!book) return off("exchange book unavailable");
  // hedge mode: a long and a short on one symbol are separate positions, so "already holding" is per
  // (symbol, direction) — an own long never blocks the short entry. One-way: one position per symbol.
  const oneway = (settings.positionMode ?? "hedge") === "oneway";
  const keyOf = (sym: string, side: 1 | -1) => (oneway ? sym : `${sym}|${side}`);
  // foreignness per (symbol, direction), as controlOwnership marks it: a foreign position, or a foreign order that names
  // a LONG / SHORT position side, freezes only that side (the opposite entry stays allowed). A foreign order without a
  // position side, and anything foreign in one-way mode, freezes the whole symbol.
  const foreign = new Set<string>();
  for (const o of book.orders) {
    if (isOwnCoid(o.clientOrderId, settings.connId)) continue;
    if (o.positionSide === "LONG" || o.positionSide === "SHORT")
      foreign.add(keyOf(o.venueSymbol, o.positionSide === "LONG" ? 1 : -1));
    else foreign.add(o.venueSymbol);
  }
  for (const p of book.positions)
    if (!input.ownSyms.has(p.venueSymbol)) foreign.add(keyOf(p.venueSymbol, p.side === "long" ? 1 : -1));
  const ownKeys = new Set<string>();
  for (const p of book.positions)
    if (input.ownSyms.has(p.venueSymbol)) ownKeys.add(keyOf(p.venueSymbol, p.side === "long" ? 1 : -1));
  // an own order on a side without a visible position (an entry whose position the read does not show yet) holds
  // that side as well: never a second entry on it
  const held = new Set(ownKeys);
  for (const o of book.orders) {
    if (!input.ownSyms.has(o.venueSymbol) || !isOwnCoid(o.clientOrderId, settings.connId)) continue;
    if (oneway) held.add(o.venueSymbol);
    else for (const sd of [1, -1] as const)
      if (!o.positionSide || (o.positionSide === "LONG") === (sd === 1)) held.add(keyOf(o.venueSymbol, sd));
  }
  // All exchange positions consume account slots, including foreign positions. Own pending entries also reserve
  // their symbol-direction slot until the position read catches up.
  const occupied = new Set([
    ...ownKeys,
    ...held,
    ...book.positions.map((p) => keyOf(p.venueSymbol, p.side === "long" ? 1 : -1)),
  ]);
  const entries: LiveIntentLite[] = [];
  const skipped: LivePlan["skipped"] = [];
  const seen = new Set<string>();
  for (const it of intents) {
    if (it.side !== 1 && it.side !== -1) {
      skipped.push({ sym: it.sym, why: "invalid entry direction" });
      continue;
    }
    const key = entryIntentKey(it);
    // A legacy key has no direction. Callers without ledger-side evidence must conservatively dedupe both.
    if (input.sent.has(key) || input.sent.has(legacyEntryIntentKey(it))) continue;
    if (it.managed) {
      skipped.push({ sym: it.sym, why: "managed exit (trailing / DCA / Axis) needs overall mode" });
      continue;
    }
    if (input.newestBarT !== undefined && it.barT < input.newestBarT) {
      skipped.push({ sym: it.sym, why: "stale signal (symbol not updated)" });
      continue;
    }
    if (isForeign(foreign, keyOf(it.sym, it.side))) {
      skipped.push({ sym: it.sym, why: "foreign position/order on symbol" });
      continue;
    }
    const k = keyOf(it.sym, it.side);
    if (held.has(k) || seen.has(k)) {
      skipped.push({ sym: it.sym, why: oneway ? "already holding symbol" : "already holding symbol and direction" });
      continue;
    }
    if (!occupied.has(k) && occupied.size >= exchangePositionLimit(settings.maxPositions)) {
      skipped.push({ sym: it.sym, why: "max exchange positions (symbol × direction)" });
      continue;
    }
    seen.add(k);
    entries.push(it);
    occupied.add(k);
  }
  return { enabled: true, reason: "armed", entries, skipped };
}

// ── Overall control orders ─────────────────────────────────────────────────────
// Every lane (bot × indication × protect × sub-strategy) that holds a paper position contributes to ONE control
// position per (symbol, direction). The planner compares that target with the exchange position and emits the
// minimal actions: open, increase, reduce, close. Opposite directions on a symbol are separate positions (hedge
// mode). Nothing of another system is ever touched: a foreign position or order freezes its side (hedge mode) or
// its whole symbol (one-way mode, or a foreign order without a position side) — see controlOwnership.

export interface ControlContribution {
  /** identity of the lane order (cfg|sym|entryT) */
  id?: string;
  cfg: string;
  sym: string;
  side: 1 | -1;
  /** Block volume multiple of this lane's position (1 = plain) */
  vol: number;
  /**
   * the whole position's execution multiple (Block × relation volume, without an Axis ladder's weight; positionMult):
   * the same on every lane of a Block Overall position — live.plainOnly judges it. Unset (lanes built elsewhere) = vol.
   */
  mult?: number;
  /** The existing Block / relation volume with the additional indication factor removed. */
  blockVol?: number;
  /** Optional Block allocation in minimum-lane units; source children share their parent's bounded total. */
  laneUnits?: number;
  /** stop distance of the lane's protect (fraction) */
  sl: number;
  /**
   * Current account loss from the mark to this lane's stop (fraction of current notional, ≥ 0).
   * Unrealized profit given back at a trailing stop is included. Unset = sl.
   */
  risk?: number;
  /**
   * how far the price has run in the lane's direction since its paper entry, as a fraction of its target distance
   * (0 when it moved against it or the position has no target): what a late exchange entry would chase
   */
  chase?: number;
  /**
   * the lane's target price. Unset: the lane has no target (or trails free with its trail armed) — its position then
   * carries no exchange take-profit, which would cut the lane's run.
   */
  tgt?: number;
  /** the lane's stop price (trailed as the tick trails it); unset: none */
  stopPx?: number;
  /** Hard ceiling for a bounded lane's venue backstop. A mixed unbounded position retains its wider backstop. */
  stopMax?: number;
  /**
   * The lane's strings, built once per paper position (laneContributions) instead of on every control step: its
   * position key (symbol|side), its lane key (laneKeyOf) and its id under the former build (legacy held-back ids).
   * Unset (lanes built elsewhere): computed where needed.
   */
  key?: string;
  lk?: string;
  legacy?: string;
}

/**
 * Top configs for the live control: the exchange budget (the account exposure cap) cannot carry every selected
 * config — thousands of lanes scaled into it all land on the exchange minimum, long and short alike, and the live
 * book ends up hedged. Signal lanes always stay (weighted by `signalWeight`); engine configs are ranked by their
 * selection score and kept in that order — `top` configs, or ("fill") as many as the budget carries, every
 * (symbol, direction) position counted at least at its exchange minimum; a config that does not fit is skipped and
 * the next ones still fill the budget. The best config always stays.
 */
export function topConfigLanes(
  lanes: readonly ControlContribution[],
  scoreOf: (cfg: string) => number | undefined,
  opt: {
    top: number | "fill";
    /** USD the kept positions may take in all (fill) */
    budget: number;
    /** USD a (symbol, direction) position of `vol` lane units costs (its exchange minimum at least) */
    posCost: (sym: string, vol: number) => number;
    signalWeight?: number;
    /**
     * configs kept by the previous step: they come first (by score among themselves) while they are still offered,
     * so a reshuffled ranking never closes and reopens positions — each such swap pays the round trip
     */
    prefer?: ReadonlySet<string>;
    /**
     * signals ranked with the engine configs by score (each signal config one entry), instead of always kept and
     * costed first — the fill then funds the best-scored configs of both kinds
     */
    signalsByScore?: boolean;
  },
): { lanes: ControlContribution[]; kept: number; of: number; cfgs: string[] } {
  const w = (l: ControlContribution) => Math.max(0, l.vol) * (sigCfg(l.cfg) ? Math.max(0, opt.signalWeight ?? 1) : 1);
  const vol = new Map<string, number>();
  let used = 0;
  const add = (l: ControlContribution) => {
    const k = `${l.sym}|${l.side}`;
    const before = vol.get(k) ?? 0;
    const after = before + w(l);
    used += opt.posCost(l.sym, after) - (before > 0 ? opt.posCost(l.sym, before) : 0);
    vol.set(k, after);
  };
  const out: ControlContribution[] = [];
  const byCfg = new Map<string, ControlContribution[]>();
  const sigs: ControlContribution[] = [];
  for (const l of lanes) {
    if (sigCfg(l.cfg) && !opt.signalsByScore) {
      sigs.push(l);
      continue;
    }
    let xs = byCfg.get(l.cfg);
    if (!xs) byCfg.set(l.cfg, (xs = []));
    xs.push(l);
  }
  const pref = (c: string) => (opt.prefer?.has(c) ? 1 : 0);
  const ranked = [...byCfg.keys()].sort((a, b) => {
    const p = pref(b) - pref(a);
    if (p !== 0) return p;
    const d = (scoreOf(b) ?? -Infinity) - (scoreOf(a) ?? -Infinity);
    return d !== 0 && !Number.isNaN(d) ? d : a < b ? -1 : a > b ? 1 : 0;
  });
  let kept = 0;
  const cfgs: string[] = [];
  const take = (cfg: string) => {
    out.push(...byCfg.get(cfg)!);
    cfgs.push(cfg);
    kept++;
  };
  // what a config adds to the budget (positions it shares with kept ones cost only their growth); one that does not
  // fit is skipped, not the end: smaller ones further down still fill the budget. The best config always stays.
  const fits = (xs: readonly ControlContribution[]) => {
    // only the keys this candidate touches are saved (a full copy of `vol` per candidate was O(candidates × keys):
    // with thousands of lanes the fill spent most of its time copying the map). Identical results.
    const used0 = used;
    const save = new Map<string, number | undefined>();
    for (const l of xs) {
      const k = `${l.sym}|${l.side}`;
      if (!save.has(k)) save.set(k, vol.get(k));
      add(l);
    }
    if (used > opt.budget && kept > 0) {
      used = used0;
      for (const [k, v] of save) {
        if (v === undefined) vol.delete(k);
        else vol.set(k, v);
      }
      return false;
    }
    return true;
  };
  // the engine configs kept last step are costed before the signals: a new signal never evicts a held engine
  // position (its close and a later reopen each pay the round trip). They are held to the budget too, best score
  // first: a larger position size (volume factor, position cap) or a smaller budget drops the weakest of them —
  // kept whole, they overshot the budget many times over and the exposure scaler squeezed every position back to the
  // exchange minimum, so a higher volume factor never sized anything up
  if (opt.top === "fill") for (const cfg of ranked) if (pref(cfg) && fits(byCfg.get(cfg)!)) take(cfg);
  // every signal is still kept (unless ranked by score with the engine configs)
  for (const l of sigs) {
    out.push(l);
    add(l);
  }
  for (const cfg of ranked) {
    if (opt.top === "fill") {
      if (pref(cfg) || !fits(byCfg.get(cfg)!)) continue;
    } else if (kept >= opt.top) break;
    take(cfg);
  }
  return { lanes: out, kept, of: ranked.length, cfgs };
}

export interface ControlTarget {
  key: string; // `${sym}|${side}`
  sym: string;
  side: 1 | -1;
  /** the lanes on the key (a Block Overall position's legs fold into its lane: one config's position) */
  lanes: number;
  /**
   * lane orders: the key's size in minimum-lane (exchange-minimum) units — per lane its explicit `laneUnits` (Block /
   * ladder provenance, proportional Block additions included), else its volume rounded, at least one (a lane that Block
   * raised to 3 is 3 units, not one per contribution). The logical lane count stays `lanes`. Unset (a target built
   * elsewhere) = lanes.
   */
  laneUnits?: number;
  vol: number;
  notional: number;
  qty: number;
  /** catastrophic stop distance for the control position (widest lane stop × 1.2, min stop … 20 %) */
  stopDist: number;
  /** All lanes are bounded: the venue stop may never widen beyond this distance, including refusal retries. */
  stopMax?: number;
  /**
   * planned loss distance: the volume-weighted mean of the lanes' own stops, at least min stop — what the position
   * loses when every lane exits at its own stop; the risk budget is measured on it (the backstop only fires when the
   * desk does not manage the position). A closer bounded venue stop never discounts the lane's current giveback risk.
   */
  riskDist?: number;
  /**
   * the widest lane stop (a price; long: the lowest, short: the highest): an exchange stop beyond it closes no lane
   * before the lane's own stop, so a moving price never loosens it (the backstop re-price) — only a lane whose stop
   * lies beyond it does
   */
  stopPx?: number;
  /**
   * the farthest lane target (a price): the position's exchange take-profit sits beyond it (tpDistFor). The desk takes
   * each lane's profit at its own target first; the venue order closes the position when the desk cannot (down, or a
   * gap through every target). Unset: a lane of the position has no target.
   */
  tpPx?: number;
  /** the exchange minimum raised the order above the lanes' size */
  raised?: boolean;
  /**
   * the raise also took it past the per-position cap: the venue minimum is the position's size and nothing can make
   * it smaller, so the risk scalers must not expect this one to shrink
   */
  atMin?: true;
  /** volume actually held in lane units (notional / (notionalUsd × ratio)) */
  volEff?: number;
  /**
   * the per-position cap cut the lanes' size (unit × vol × ratio above it): a higher volume factor no longer sizes
   * this position up — only a higher explicit balance-relative maxPositionX does
   */
  capped?: boolean;
  /** set when every contributing lane is the same tracked range ("|mp", "|mc", "|mn" or "|sh") */
  cfg?: string;
}

/**
 * Account exposure factor: when the targets' gross notional (long and short counted apart, both in full) exceeds
 * `maxX` × account balance, every target is scaled by the same factor — the relations between positions (volume factors,
 * Block multiples, ratios, long vs short) stay as they are. A scaled quantity is snapped to the exchange (never
 * below its minimum for a target that was open). No account balance or maxX ≤ 0: unchanged.
 */
export function scaleToExposure(
  targets: ControlTarget[],
  balance: number | null | undefined,
  maxX: number | undefined,
  snap: (sym: string, qty: number, px: number) => number,
  /** keys held now: never dropped (a held position at the exchange minimum stays) */
  held?: ReadonlySet<string>,
): { factor: number; gross: number; cap: number; dropped: string[] } | null {
  // the exposure is the stop-risk budget with every unit of notional costing 1: the same drops (in rank order, a new
  // target whose exchange minimum no longer fits under the cap is left out) and the same water-fill as the risk
  // scalers — so a round-up to the venue minimum can never take the gross past maxX × balance
  const r = scaleToRisk(targets, balance, maxX, snap, held, () => 1);
  return r && { factor: r.factor, gross: r.risk, cap: r.cap, dropped: r.dropped };
}

/**
 * Stop-risk budget: when the targets' summed notional × planned loss distance (every lane at its own stop at once;
 * `riskDist`, else the backstop `stopDist`) exceeds maxRiskPct × account balance, the targets are scaled by one factor
 * (relations between positions kept).
 *
 * Positions at the exchange minimum cannot shrink, so the drops are decided FIRST: in rank order (the list is ranked
 * held first, then by volume) a new target is admitted while its risk at its minimum size fits what the budget has
 * left; one that does not fit is left out and the next is still tried (admitWithinBudgets — x01, 13 Oct: dropping
 * "the weakest while the survivors do not fit" emptied the book when the strongest target alone was over the budget).
 * The factor is then computed on the survivors only — a survivor is never shrunk to make room for a position that is
 * dropped anyway. A survivor whose scaled size would fall under its minimum stays at the minimum and the factor of the
 * others is solved again around it (water-fill), so the total lands on the budget.
 */
export function scaleToRisk(
  targets: ControlTarget[],
  balance: number | null | undefined,
  maxRiskPct: number | undefined,
  snap: (sym: string, qty: number, px: number) => number,
  /** keys held now: never dropped (a position at the exchange minimum that cannot shrink stays) */
  held?: ReadonlySet<string>,
  /** the loss priced per position: its lanes' own stops (default) or the exchange backstop (the worst case) */
  dist: (t: ControlTarget) => number = (t) => t.riskDist ?? t.stopDist,
): { factor: number; risk: number; cap: number; dropped: string[] } | null {
  if (!(maxRiskPct && maxRiskPct > 0) || !(balance && balance > 0)) return null;
  const riskOf = (t: ControlTarget) => Math.abs(t.notional) * dist(t);
  const risk = targets.reduce((a, t) => a + riskOf(t), 0);
  const cap = maxRiskPct * balance;
  if (!(risk > cap)) return { factor: 1, risk, cap, dropped: [] };
  // 1) drops: in rank order, a new target is admitted while its risk at its minimum fits what the budget has left
  // (the held ones take theirs first); one that does not fit is left out and the next is still tried
  const [dropped] = admitWithinBudgets(targets, [{ cap, dist }], snap, held);
  const pxOf = (t: ControlTarget) => (t.qty > 0 ? t.notional / t.qty : 0);
  const minRisk = targets.map((t) => minCostOf(t, dist, snap));
  const keepIdx = targets.map((_, i) => i);
  // 2) the factor on the survivors: f × risk for each, but never under its minimum — the ones pinned at the minimum
  // are taken out and f solved again for the rest until no further one pins
  const pinned = new Set<number>();
  let factor = 1;
  for (let pass = 0; pass <= keepIdx.length; pass++) {
    let fixed = 0;
    let free = 0;
    for (const i of keepIdx) {
      if (pinned.has(i)) fixed += minRisk[i];
      else free += riskOf(targets[i]);
    }
    factor = free > 0 ? Math.max(0, Math.min(1, (cap - fixed) / free)) : 0;
    let more = false;
    for (const i of keepIdx)
      if (!pinned.has(i) && riskOf(targets[i]) * factor < minRisk[i] - 1e-12) {
        pinned.add(i);
        more = true;
      }
    if (!more) break;
  }
  for (const i of keepIdx) {
    const t = targets[i];
    const px = pxOf(t);
    if (!(px > 0)) continue;
    const q = snap(t.sym, t.qty * (pinned.has(i) ? 1e-9 : factor), px);
    const next = q > 0 ? Math.min(t.qty, q) : t.qty;
    if (t.volEff !== undefined && t.qty > 0) t.volEff *= next / t.qty;
    t.qty = next;
    t.notional = t.qty * px;
  }
  return { factor, risk, cap, dropped };
}

/**
 * The cost of a target at the smallest size it can take: the exchange minimum (a snap of a sliver raises to it),
 * never above its size now.
 */
function minCostOf(
  t: ControlTarget,
  dist: (t: ControlTarget) => number,
  snap: (sym: string, qty: number, px: number) => number,
): number {
  const px = t.qty > 0 ? t.notional / t.qty : 0;
  if (!(px > 0)) return Math.abs(t.notional) * dist(t);
  const q = snap(t.sym, t.qty * 1e-9, px);
  return q > 0 ? Math.min(t.qty, q) * px * dist(t) : 0;
}

/**
 * The drops of the account budgets, decided together: in rank order (held first, then by volume) a new target is
 * admitted when its cost at its exchange minimum fits what EVERY budget has left; one that does not fit is left out
 * and the next is still tried. A held position takes its share first and is never dropped (a held one alone over a
 * budget leaves no room: every new target is then left out). The dropped targets are removed from `targets`; returned
 * per budget, weakest first, are the keys it dropped (a target over several budgets counts against the first).
 *
 * x01, 13 Oct 18:55Z: dropping "the weakest while the survivors do not fit", one budget after the other, kept the two
 * strongest keys under the gross cap and then dropped both under the risk budget (the weaker fit, the stronger did
 * not) — nothing was placed while 24 further keys were never tried against the risk budget at all.
 */
export function admitWithinBudgets(
  targets: ControlTarget[],
  budgets: ReadonlyArray<{ cap: number; dist: (t: ControlTarget) => number }>,
  snap: (sym: string, qty: number, px: number) => number,
  held?: ReadonlySet<string>,
): string[][] {
  // the held positions take their share first, wherever they sit in the list
  const isHeld = (t: ControlTarget) => held?.has(t.key) === true;
  const used = budgets.map((b) => targets.reduce((a, t) => a + (isHeld(t) ? minCostOf(t, b.dist, snap) : 0), 0));
  const dropped = budgets.map(() => [] as string[]);
  const keep: ControlTarget[] = [];
  for (const t of targets) {
    if (isHeld(t)) {
      keep.push(t);
      continue;
    }
    const costs = budgets.map((b) => minCostOf(t, b.dist, snap));
    const over = costs.findIndex((c, i) => used[i] + c > budgets[i].cap * 1.0001);
    if (over >= 0) {
      dropped[over].push(t.key);
      continue;
    }
    keep.push(t);
    for (let i = 0; i < costs.length; i++) used[i] += costs[i];
  }
  if (keep.length !== targets.length) {
    targets.length = 0;
    for (const t of keep) targets.push(t);
  }
  return dropped.map((d) => d.reverse());
}

/**
 * The three account budgets in the live step's order — gross exposure (maxExposureX), stop risk at the lanes' own
 * stops (maxRiskPct), worst case at the exchange backstops (maxBackstopLossPct) — with the drops decided across all
 * three at once (admitWithinBudgets) and then each scaler's factor on the survivors. A budget that is off (0) or an
 * unknown balance: that scaler is null (nothing dropped for it). Each result's `dropped` lists that budget's drops.
 */
export function scaleToBudgets(
  targets: ControlTarget[],
  balance: number | null | undefined,
  caps: { maxExposureX?: number; maxRiskPct?: number; maxBackstopLossPct?: number },
  snap: (sym: string, qty: number, px: number) => number,
  held?: ReadonlySet<string>,
): {
  exposure: ReturnType<typeof scaleToExposure>;
  risk: ReturnType<typeof scaleToRisk>;
  worst: ReturnType<typeof scaleToRisk>;
} {
  const eq = balance && balance > 0 ? balance : 0;
  const capOf = (pct: number | undefined) => (eq > 0 && pct && pct > 0 ? pct * eq : Infinity);
  const dropped =
    eq > 0
      ? admitWithinBudgets(
          targets,
          [
            { cap: capOf(caps.maxExposureX), dist: () => 1 },
            { cap: capOf(caps.maxRiskPct), dist: (t) => t.riskDist ?? t.stopDist },
            { cap: capOf(caps.maxBackstopLossPct), dist: (t) => t.stopDist },
          ],
          snap,
          held,
        )
      : [[], [], []];
  const exposure = scaleToExposure(targets, balance, caps.maxExposureX, snap, held);
  const risk = scaleToRisk(targets, balance, caps.maxRiskPct, snap, held);
  const worst = scaleToRisk(targets, balance, caps.maxBackstopLossPct, snap, held, (t) => t.stopDist);
  const withDrops = <R extends { dropped: string[] } | null>(r: R, d: string[]): R =>
    r ? { ...r, dropped: [...d, ...r.dropped] } : r;
  return { exposure: withDrops(exposure, dropped[0]), risk: withDrops(risk, dropped[1]), worst: withDrops(worst, dropped[2]) };
}

/**
 * The base every account budget and every equity-scaled cap is sized on: B = min(wallet, equity) from the account
 * read, so open profit never inflates a budget (an open loss still shrinks it). The positive one known when the other
 * is missing; null when neither is known (nothing equity-scaled opens then).
 */
export function budgetBase(a: { equity?: number | null; wallet?: number | null } | null | undefined): number | null {
  const eq = a?.equity != null && Number.isFinite(a.equity) && a.equity > 0 ? a.equity : null;
  const w = a?.wallet != null && Number.isFinite(a.wallet) && a.wallet > 0 ? a.wallet : null;
  if (eq === null) return w;
  if (w === null) return eq;
  return Math.min(eq, w);
}

/** Risk-based sizing (live.positionSize "risk"): the notional that risks base × pct × ratio at riskDist. */
export function riskNotional(base: number, pct: number, ratio: number, riskDist: number): number {
  return base > 0 && pct > 0 && ratio > 0 ? (base * pct * ratio) / Math.max(1e-9, riskDist) : 0;
}

/** The default risk per position of risk-based sizing: 1 % of B. */
export const RISK_PER_POSITION_DEFAULT = 0.01;

/**
 * Per symbol, the lanes' volume-weighted planned risk distance (each lane's own risk, else its stop; never under the
 * minimum stop) — what a risk-sized position of the symbol is costed at before its targets are built.
 */
export function symRiskDist(
  lanes: ReadonlyArray<{ sym: string; vol: number; sl: number; risk?: number }>,
  minStop: number,
): Map<string, number> {
  const acc = new Map<string, { w: number; r: number }>();
  for (const l of lanes) {
    const w = Math.max(1e-9, l.vol);
    const a = acc.get(l.sym) ?? { w: 0, r: 0 };
    a.w += w;
    a.r += w * Math.max(minStop, l.risk ?? l.sl);
    acc.set(l.sym, a);
  }
  return new Map([...acc].map(([k, a]) => [k, a.r / a.w]));
}

/** One exchange position as the account view shows it: own quantity apart from what is not ours. */
export interface AccountPosition {
  key: string;
  sym: string;
  side: 1 | -1;
  /** on the exchange, every owner */
  qty: number;
  /** Ledger-capped share; null when the owned share cannot be reconciled, 0 when known to be foreign. */
  ownQty: number | null;
  entry: number | null;
  mark: number | null;
  /** unrealized P&L / initial margin of the whole exchange position, USDT */
  upnl: number | null;
  margin: number;
  leverage: number | null;
  /** the trigger price of a stop resting on the position side (own or not), null when none is read */
  stop: number | null;
  /** no part of it is ours (a foreign position, or a side someone else trades) */
  foreign: boolean;
  /** The side is frozen or unverified and its own/foreign split cannot be reported safely. */
  ownershipUnknown?: true;
}

/**
 * The account's positions, own and foreign apart: the own sums take only the own share of a position (its uPnL and
 * margin pro rata to own / exchange quantity); a position with no own quantity is counted under `foreign`, never in
 * the own numbers. Manual quantity is never own (relation.ts).
 */
export function accountPositions(
  book: BookView,
  held: ReadonlyMap<string, number>,
  foreign: ReadonlySet<string>,
  unknown: ReadonlySet<string> = new Set(),
): {
  rows: AccountPosition[];
  own: { n: number; upnl: number; margin: number; notional: number };
  foreign: { n: number; upnl: number; margin: number };
  ownershipUnknown: { n: number };
  markUnknown: { own: number; foreign: number };
} {
  const rows: AccountPosition[] = [];
  const own = { n: 0, upnl: 0, margin: 0, notional: 0 };
  const fr = { n: 0, upnl: 0, margin: 0 };
  const ownershipUnknown = { n: 0 };
  const markUnknown = { own: 0, foreign: 0 };
  const rowCounts = new Map<string, number>();
  for (const p of book.positions) {
    const key = `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`;
    rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
  }
  for (const p of book.positions) {
    const side: 1 | -1 = p.side === "long" ? 1 : -1;
    const key = `${p.venueSymbol}|${side}`;
    const ps = side === 1 ? "LONG" : "SHORT";
    // A side-level ledger cannot allocate its quantity among multiple separate physical position rows. Keep
    // every venue row visible, but never apply the full side's own quantity to each row.
    const ownQty = isForeign(unknown, key) || (rowCounts.get(key) ?? 0) > 1
      ? null : isForeign(foreign, key) ? 0 : Math.min(p.qty, held.get(key) ?? 0);
    const stopO = book.orders.find(
      (o) =>
        o.venueSymbol === p.venueSymbol &&
        (!o.positionSide || o.positionSide === ps) &&
        /STOP/i.test(o.type ?? "") &&
        !/TAKE_PROFIT/i.test(o.type ?? "") &&
        (o.stopPrice ?? 0) > 0,
    );
    const upnl = typeof p.upnl === "number" && Number.isFinite(p.upnl) ? p.upnl : null;
    const margin = Number.isFinite(p.margin) ? (p.margin ?? 0) : 0;
    const row: AccountPosition = {
      key,
      sym: p.venueSymbol,
      side,
      qty: p.qty,
      ownQty,
      entry: p.entry && p.entry > 0 ? p.entry : null,
      mark: p.mark && p.mark > 0 ? p.mark : null,
      upnl,
      margin,
      leverage: p.leverage && p.leverage > 0 ? p.leverage : null,
      stop: stopO?.stopPrice ?? null,
      foreign: ownQty === 0,
      ...(ownQty === null ? { ownershipUnknown: true as const } : {}),
    };
    rows.push(row);
    if (ownQty === null) {
      ownershipUnknown.n++;
      continue;
    }
    if (ownQty > 0) {
      const share = p.qty > 0 ? ownQty / p.qty : 0;
      own.n++;
      if (upnl === null) markUnknown.own++;
      else own.upnl += upnl * share;
      own.margin += margin * share;
      own.notional += ownQty * (row.mark ?? row.entry ?? 0);
    }
    if (ownQty < p.qty) {
      const share = p.qty > 0 ? (p.qty - ownQty) / p.qty : 0;
      fr.n++;
      if (upnl === null) markUnknown.foreign++;
      else fr.upnl += upnl * share;
      fr.margin += margin * share;
    }
  }
  rows.sort((a, b) => Number(a.foreign) - Number(b.foreign) || (a.key < b.key ? -1 : 1));
  return { rows, own, foreign: fr, ownershipUnknown, markUnknown };
}

/**
 * Optional per-position limit: the legacy fixed amount and the balance multiple (the balance is the sizing base the
 * caller holds, B = min(wallet, equity) where it is known), the smaller one (Infinity if neither).
 */
export function positionCapFor(fixed: number, balance: number | null | undefined, maxPositionX: number | undefined): number {
  const x = maxPositionX && maxPositionX > 0 && balance && balance > 0 ? maxPositionX * balance : Infinity;
  return Math.min(fixed, x);
}

/** Actual owned exposure and unresolved entry remainders, priced at the current mark. Unknown is never zero. */
export interface AccountBudgetUse {
  notional: number | null;
  risk: number | null;
  worst: number | null;
}

/**
 * Admission after execution: a planned reduction does not release capacity until its quantity is confirmed.
 * This is separate from target scaling, which describes the desired final book rather than the book held now.
 */
export function accountGrowthBlock(
  used: readonly AccountBudgetUse[],
  addition: AccountBudgetUse,
  equity: number | null | undefined,
  caps: { maxExposureX?: number; maxRiskPct?: number; maxBackstopLossPct?: number },
): string | null {
  const checks = [
    [caps.maxExposureX, "gross exposure cap", "notional"],
    [caps.maxRiskPct, "risk budget", "risk"],
    [caps.maxBackstopLossPct, "worst-case budget", "worst"],
  ] as const;
  for (const [multiple, name, field] of checks) {
    if (!(multiple && multiple > 0)) continue;
    if (!(typeof equity === "number" && Number.isFinite(equity) && equity > 0))
      return `account ${name}: equity unknown — not increasing`;
    let total = 0;
    for (const item of [...used, addition]) {
      const value = item[field];
      if (value === null || !Number.isFinite(value) || value < 0)
        return `account ${name}: current owned / pending exposure unknown — not increasing`;
      total += value;
    }
    if (total > multiple * equity * 1.0001 + 1e-9)
      return `account ${name}: ${(total).toFixed(4)} USD would exceed ${(multiple * equity).toFixed(4)} USD — not increasing`;
  }
  return null;
}

export type ControlAction =
  | { kind: "open"; key: string; sym: string; side: 1 | -1; qty: number; stopDist: number; cfg?: string }
  | { kind: "increase"; key: string; sym: string; side: 1 | -1; qty: number; cfg?: string }
  | { kind: "reduce"; key: string; sym: string; side: 1 | -1; qty: number }
  | { kind: "close"; key: string; sym: string; side: 1 | -1; qty: number };

export interface ControlSettings {
  notionalUsd: number;
  /** minimum stop distance (fraction); default 1 % */
  minStopPct?: number;
  /** control volume per contributing lane volume unit */
  ratio: number;
  /**
   * signal lanes' volume weight against engine lanes (default 1): a signal lane contributes vol × signalWeight units
   * to its (symbol, direction) position — the signals that clear their hourly gate size up beside the engine
   */
  signalWeight?: number;
  /** cap per (symbol, direction) position, USD */
  maxNotionalUsd: number;
  /** max occupied exchange slots (symbol × direction); every lane order on one counts once */
  maxPositions: number;
  /** only adjust an existing position when the target differs by more than this share */
  rebalancePct: number;
  /** every position `ratio` units whatever its lanes' volume (live.positionSize "min") */
  minSize?: boolean;
  /**
   * risk-based sizing (live.positionSize "risk"): every position risks base × pct × ratio at its lanes' stop —
   * notional = base × pct × ratio / riskDist. `base` is B = min(wallet, equity) (budgetBase). The venue minimum is
   * taken only while its risk (minimum notional × riskDist) is at most 2 × that risk, else the target is skipped.
   */
  riskSizing?: { base: number; pct: number };
  /**
   * lane orders (live.laneOrders): every lane its own minimum-lane units — its explicit laneUnits (an independent base
   * config one unit, its Block additions their bounded extra weights), else its volume rounded, at least one (a plain
   * lane one unit); the position is the sum of its lanes' units × ratio
   */
  laneMode?: boolean;
  /** oneway: one net position per symbol (long and short lanes offset each other) */
  positionMode?: "hedge" | "oneway";
  /**
   * per-symbol unit notional (minimum-quantity sizing: the exchange minimum of the symbol at its price); unset =
   * notionalUsd for every symbol
   */
  unitOf?: (sym: string, px: number) => number;
  /** keys (symbol|side) held now: ranked first under the position cap */
  heldKeys?: ReadonlySet<string>;
  /**
   * A key (symbol|side) that cannot open this step — its open is waiting after a refusal, the symbol's margin mode or
   * leverage is backing off, the free-margin floor refused it moments ago, or a budget scaler dropped it. A key not
   * held is left out BEFORE the position cap is counted, so its slot goes to the next target instead of being spent
   * on a position that will not open. A string names the reason (default "open waiting after a failure"). A held
   * key is never left out here.
   */
  blocked?: (key: string) => string | boolean | null | undefined;
  /**
   * the smallest stop distance the VENUE accepts for this symbol at this price (its price tick, with clearance).
   * `minStopPct` is our own floor; this is the floor under it — a stop tighter than this is refused by the exchange,
   * and the refusal used to close the position. Unset = no venue floor known (offline, tests).
   */
  minStopOf?: (sym: string, px: number) => number;
}

/**
 * The exchange-minimum round-up rule, one rule for every path that sizes an order: a desired size below the venue's
 * minimum is rounded UP to it only while the rounded notional still fits the per-position cap. The caps are a backstop,
 * so the minimum does not take a position past them. Returns the skip reason when it does not fit, null when it does
 * or when there is no cap (0 / Infinity = none). The reason starts with "exchange minimum": the simulator counts it
 * (isMinAboveCapSkip), and a held position on that key is kept as it is, never closed for being too large.
 */
/** The entry path's own bound on a round-up: a minimum this many times the entry's notional is not an entry of this size. */
export const MIN_RAISE_UNIT_X = 4;

export function minRaiseBlock(raisedUsd: number, capUsd: number): string | null {
  if (!(capUsd > 0) || !Number.isFinite(capUsd) || raisedUsd <= capUsd * 1.0001 + 1e-9) return null;
  return `exchange minimum ${raisedUsd.toFixed(2)} USD is over the position cap ${capUsd.toFixed(2)} USD — not raised past it`;
}

/** The skip reason above, as a predicate: the simulator counts these, and matching on the prose broke silently. */
export const isMinAboveCapSkip = (why: string) => why.startsWith("exchange minimum ");

export interface ControlPlan {
  targets: ControlTarget[];
  actions: ControlAction[];
  /** keep: the (symbol, direction) key whose held position stays untouched (its target is unknown, not zero) */
  skipped: Array<{ sym: string; why: string; keep?: string }>;
  hashes: { targets: string; book: string; plan: string };
}

/**
 * The widest the exchange backstop may sit from the price (20 %). At the cap the backstop no longer follows the lanes'
 * stops, so it is never re-priced outward as the price moves against the position (see the backstop re-pricing).
 */
export const BACKSTOP_MAX_DIST = 0.2;

/** Small stable hash (FNV-1a, base36) for state fingerprints. */
export function stateHash(parts: readonly string[]): string {
  let h = 2166136261;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 10, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

/** A lane's identity without its Block Overall leg suffix (…|blk:src): the legs are one config's position. */
export function laneBaseId(id: string): string {
  const i = id.indexOf("|blk:");
  return i < 0 ? id : id.slice(0, i);
}

/** Lane orders: a lane's exchange-minimum units — its volume rounded, at least one. */
export function laneUnits(vol: number): number {
  return Math.max(1, Math.round(vol));
}

export function controlTargets(
  lanes: readonly ControlContribution[],
  prices: ReadonlyMap<string, number>,
  cs: ControlSettings,
  snap: (sym: string, qty: number, px: number) => number | { qty: number; raised: boolean } = (
    _s,
    q,
  ) => q,
): { targets: ControlTarget[]; skipped: ControlPlan["skipped"] } {
  type Agg = {
    sym: string;
    side: 1 | -1;
    lanes: number;
    /** lane orders: units (per lane its explicit laneUnits, else its volume, rounded, at least one) */
    laneUnits: number;
    /** per lane identity (Block Overall legs fold into their lane): its volume, and its explicit units when given */
    lv?: Map<string, { vol: number; units: number; explicit: boolean }>;
    vol: number;
    sl: number;
    /** Σ weighted volume × lane stop (riskDist = rw / vol) */
    rw: number;
    tag?: "" | RangeTag | "mix";
    /** the farthest lane target (long: highest, short: lowest); noTgt: a lane without one */
    tgt?: number;
    noTgt?: boolean;
    /** the widest lane stop (long: lowest, short: highest) */
    lw?: number;
    stopMax?: number;
    unbounded?: boolean;
  };
  const note = (a: Agg, cfg: string) => {
    const tag = rangeOfId(cfg);
    a.tag = a.tag === undefined || a.tag === tag ? tag : "mix";
  };
  let agg = new Map<string, Agg>();
  let anon = 0;
  for (const l of lanes) {
    const key = `${l.sym}|${l.side}`;
    const a = agg.get(key) ?? { sym: l.sym, side: l.side, lanes: 0, laneUnits: 0, vol: 0, sl: 0, rw: 0 };
    note(a, l.cfg);
    const sig = sigCfg(l.cfg);
    // the lane's identity: a Block Overall leg (…|blk:src) is part of its position's lane
    const lid = l.lk ?? (l.id ? laneBaseId(l.id) : `#${anon++}`);
    const lv = a.lv ?? (a.lv = new Map());
    const e = lv.get(lid) ?? { vol: 0, units: 0, explicit: false };
    if (l.laneUnits !== undefined) {
      // explicit minimum-lane units (fractional Block additions; NaN = units unknown, the target fails closed)
      e.units += l.laneUnits;
      e.explicit = true;
    } else e.vol += Math.max(0, l.vol);
    lv.set(lid, e);
    // lane orders weigh the funded units (equal units have equal weight in the mark-to-stop risk)
    const w = cs.laneMode
      ? Math.max(0, l.laneUnits ?? l.vol)
      : Math.max(0, l.vol) * (sig ? Math.max(0, cs.signalWeight ?? 1) : 1);
    a.vol += w;
    a.rw += w * Math.max(0, l.risk ?? l.sl);
    a.sl = Math.max(a.sl, l.sl);
    if (l.stopMax !== undefined && Number.isFinite(l.stopMax) && l.stopMax > 0)
      a.stopMax = Math.max(a.stopMax ?? 0, l.stopMax);
    else a.unbounded = true;
    if (l.stopPx !== undefined && l.stopPx > 0)
      a.lw = a.lw === undefined ? l.stopPx : l.side === 1 ? Math.min(a.lw, l.stopPx) : Math.max(a.lw, l.stopPx);
    if (!(l.tgt !== undefined && l.tgt > 0)) a.noTgt = true;
    else a.tgt = a.tgt === undefined ? l.tgt : l.side === 1 ? Math.max(a.tgt, l.tgt) : Math.min(a.tgt, l.tgt);
    agg.set(key, a);
  }
  for (const a of agg.values()) {
    a.lanes = a.lv?.size ?? 0;
    let u = 0;
    for (const v of a.lv?.values() ?? [])
      u += v.explicit ? v.units + (v.vol > 0 ? laneUnits(v.vol) : 0) : laneUnits(v.vol);
    a.laneUnits = u;
  }
  if (cs.positionMode === "oneway") {
    // one net position per symbol: long volume minus short volume decides side and size
    const net = new Map<string, Agg>();
    const syms = new Set([...agg.values()].map((a) => a.sym));
    for (const sym of syms) {
      const L = agg.get(`${sym}|1`);
      const S = agg.get(`${sym}|-1`);
      // Lane sizing nets the actual minimum-lane units, including fractional Block additions.
      // Raw intrinsic model volume must not choose a different side from the units being funded.
      const v = cs.laneMode
        ? (L?.laneUnits ?? 0) - (S?.laneUnits ?? 0)
        : (L?.vol ?? 0) - (S?.vol ?? 0);
      if (Math.abs(v) < 1e-9) continue;
      const side = (v > 0 ? 1 : -1) as 1 | -1;
      // the stop and the risk come from the side that survives the netting (the other side's lanes are offset)
      const win = side > 0 ? L : S;
      const tags = [L?.tag, S?.tag].filter((t) => t !== undefined);
      net.set(`${sym}|${side}`, {
        sym,
        side,
        lanes: (L?.lanes ?? 0) + (S?.lanes ?? 0),
        laneUnits: Math.abs((L?.laneUnits ?? 0) - (S?.laneUnits ?? 0)),
        vol: Math.abs(v),
        sl: win?.sl ?? 0,
        rw: win && win.vol > 0 ? (win.rw / win.vol) * Math.abs(v) : 0,
        tgt: win?.tgt,
        noTgt: win?.noTgt,
        lw: win?.lw,
        stopMax: win?.stopMax,
        unbounded: win?.unbounded,
        tag: tags.length && tags.every((t) => t === tags[0]) ? tags[0] : "mix",
      });
    }
    agg = net;
  }
  const targets: ControlTarget[] = [];
  const skipped: ControlPlan["skipped"] = [];
  const slotKey = (key: string) =>
    cs.positionMode === "oneway" ? key.slice(0, key.lastIndexOf("|")) : key;
  const occupied = new Set([...(cs.heldKeys ?? [])].map(slotKey));
  // held positions first, then the strongest: the position cap never closes a held position for a new one (that
  // may not even open — margin floor, mode refused — and every swap pays the round-trip cost)
  const isHeld = (k: string) => (cs.heldKeys?.has(k) ? 1 : 0);
  for (const [key, a] of [...agg.entries()].sort(
    (x, y) => isHeld(y[0]) - isHeld(x[0]) || y[1].vol - x[1].vol || (x[0] < y[0] ? -1 : 1),
  )) {
    const px = prices.get(a.sym) ?? 0;
    if (!(px > 0)) {
      // no price is no reason to close: a held position on this key stays as it is
      skipped.push({ sym: a.sym, why: "no fresh price", keep: key });
      continue;
    }
    // a target that cannot open this step takes no slot (a held one is always kept and counted)
    if (!isHeld(key) && cs.blocked) {
      const b = cs.blocked(key);
      if (b) {
        skipped.push({ sym: a.sym, why: typeof b === "string" ? b : "open waiting after a failure" });
        continue;
      }
    }
    const slot = slotKey(key);
    if (!occupied.has(slot) && occupied.size >= exchangePositionLimit(cs.maxPositions)) {
      skipped.push({ sym: a.sym, why: "max exchange positions (symbol × direction)" });
      continue;
    }
    // our own floor, and under it the venue's: a stop the exchange refuses for being too close is not a stop
    const minStop = Math.max(cs.minStopPct ?? 0.01, cs.minStopOf?.(a.sym, px) ?? 0);
    const stopMax = !a.unbounded ? a.stopMax : undefined;
    const stopDist = Math.min(BACKSTOP_MAX_DIST, stopMax ?? Infinity, Math.max(minStop, a.sl * 1.2));
    // Account budgets reserve the full current mark→planned-stop loss, even when a nearer native backstop exists.
    const riskDist = Math.max(minStop, a.vol > 0 ? a.rw / a.vol : a.sl);
    const rs = cs.riskSizing;
    // risk-based: what this position may lose at its stop (base × pct × ratio)
    const perRisk = rs ? rs.base * rs.pct * cs.ratio : 0;
    const unit = cs.unitOf ? cs.unitOf(a.sym, px) : cs.notionalUsd;
    const want = rs
      ? perRisk / Math.max(1e-9, riskDist)
      : unit * (cs.laneMode ? a.laneUnits : cs.minSize ? 1 : a.vol) * cs.ratio;
    const notional = Math.min(cs.maxNotionalUsd, want);
    const sn = snap(a.sym, notional / px, px);
    const qty = typeof sn === "number" ? sn : sn.qty;
    const raised = typeof sn === "number" ? false : sn.raised;
    // no spec, no price precision, nothing to round to: a held position stays as it is rather than being closed
    if (!(qty > 0)) {
      skipped.push({ sym: a.sym, why: "size rounds to zero", keep: key });
      continue;
    }
    // Raised to the exchange minimum: taken only while the raised size still fits the per-position cap (minRaiseBlock).
    // Past it the target is skipped with its reason; a held position on the key is kept as it is, never closed.
    const atMin = raised && qty * px > cs.maxNotionalUsd * 1.0001;
    // risk-based: the venue minimum is taken only while what it risks at the stop is at most 2 × the position's risk
    if (rs && raised && qty * px * riskDist > 2 * perRisk * 1.0001 + 1e-12) {
      skipped.push({
        sym: a.sym,
        why: `exchange minimum risk ${(qty * px * riskDist).toFixed(4)} USD over 2 × the per-position risk ${perRisk.toFixed(4)} USD — not raised`,
        keep: key,
      });
      continue;
    }
    const blocked = raised ? minRaiseBlock(qty * px, cs.maxNotionalUsd) : null;
    if (blocked) {
      skipped.push({ sym: a.sym, why: blocked, keep: key });
      continue;
    }
    targets.push({
      key,
      sym: a.sym,
      side: a.side,
      lanes: a.lanes,
      ...(cs.laneMode ? { laneUnits: a.laneUnits } : {}),
      vol: a.vol,
      notional: qty * px,
      qty,
      ...(a.tag && a.tag !== "mix" ? { cfg: `|${a.tag}` } : {}),
      // the stop is never tighter than the configured minimum (default 1 %), never wider than 20 %
      stopDist,
      ...(stopMax !== undefined ? { stopMax } : {}),
      riskDist,
      // (lane orders: each lane carries its own take-profit — no position-wide one)
      ...(!cs.laneMode && !a.noTgt && a.tgt !== undefined && a.tgt > 0 ? { tpPx: a.tgt } : {}),
      ...(a.lw !== undefined && a.lw > 0 ? { stopPx: a.lw } : {}),
      raised,
      ...(atMin ? { atMin: true as const } : {}),
      // the volume actually held, in lane units (> vol when the exchange minimum raised the order)
      // (risk-based: the lanes' volume at the planned risk, scaled by what the venue lot made of it)
      volEff: rs ? (a.vol * qty * px) / Math.max(1e-9, want) : (qty * px) / Math.max(1e-9, unit * cs.ratio),
      ...(want > cs.maxNotionalUsd * 1.0001 ? { capped: true } : {}),
    });
    occupied.add(slot);
  }
  return { targets, skipped };
}

/**
 * Whether a (symbol|side) key is someone else's: its whole symbol is foreign (a foreign order without a position side,
 * or one-way mode), or that side of it is (hedge mode: a foreign position or a foreign order on that position side).
 */
export function isForeign(foreign: ReadonlySet<string>, key: string): boolean {
  return foreign.has(key) || foreign.has(key.split("|")[0]);
}

/**
 * Minimal actions that bring the own control positions to the targets.
 * `held` = own positions per key (sym|side → qty). `foreign` = symbols, or (hedge mode) `sym|side` keys, that must
 * not be touched (see `isForeign`).
 */
export function planControl(input: {
  targets: readonly ControlTarget[];
  held: ReadonlyMap<string, number>;
  foreign: ReadonlySet<string>;
  rebalancePct: number;
  /**
   * the lanes' volume each key was last brought to: when a key's lanes changed since (a config joined or exited),
   * its resize is sent whatever the rebalance band — the band absorbs sizing drift (equity, price), never a
   * config's own entry or exit (5 lanes, one exits at its target: −20 % sat inside the 25 % band and that
   * config's share stayed open)
   */
  sizedVol?: ReadonlyMap<string, number>;
  bookParts?: readonly string[];
  /** keys whose target is unknown (no price, equity unknown): a held position there is neither closed nor resized */
  keep?: ReadonlySet<string>;
  /**
   * The exchange lot step per symbol: a resize of at most one lot is not made. At minimum volume the target is the
   * exchange minimum (min notional / price, rounded up to the lot), which moves by one lot as the price crosses a
   * lot boundary; without this an increase and a reduce of one lot alternated on every step.
   */
  lots?: ReadonlyMap<string, number>;
}): ControlPlan {
  const actions: ControlAction[] = [];
  const skipped: ControlPlan["skipped"] = [];
  const tmap = new Map(input.targets.map((t) => [t.key, t]));
  const keys = [...new Set([...tmap.keys(), ...input.held.keys()])].sort();
  for (const key of keys) {
    const [sym, s] = key.split("|");
    const side = (Number(s) === 1 ? 1 : -1) as 1 | -1;
    if (isForeign(input.foreign, key)) {
      skipped.push({ sym, why: "foreign position/order on symbol" });
      continue;
    }
    const t = tmap.get(key);
    const have = input.held.get(key) ?? 0;
    if (input.keep?.has(key) && have > 0) continue;
    const want = t?.qty ?? 0;
    if (want <= 0 && have > 0) actions.push({ kind: "close", key, sym, side, qty: have });
    else if (want > 0 && have <= 0)
      actions.push({
        kind: "open",
        key,
        sym,
        side,
        qty: want,
        stopDist: t!.stopDist,
        ...(t!.cfg ? { cfg: t!.cfg } : {}),
      });
    else if (want > 0 && have > 0) {
      const diff = want - have;
      // measured against the target: the held size stays within ±rebalancePct of what the lanes ask for — unless
      // the lanes themselves changed since the key was last sized
      const prevVol = input.sizedVol?.get(key);
      const lanesChanged = prevVol !== undefined && Math.abs(prevVol - t!.vol) > 1e-9 * Math.max(1, t!.vol);
      if (!lanesChanged && Math.abs(diff) / want <= input.rebalancePct) continue;
      const lot = input.lots?.get(sym) ?? 0;
      if (lot > 0 && Math.abs(diff) <= lot * (1 + 1e-9)) continue;
      actions.push(
        diff > 0
          ? { kind: "increase", key, sym, side, qty: diff, ...(t!.cfg ? { cfg: t!.cfg } : {}) }
          : { kind: "reduce", key, sym, side, qty: -diff },
      );
    }
  }
  // closes and reduces first: in one-way mode a position must be flat before its opposite opens
  const rank = { close: 0, reduce: 1, open: 2, increase: 3 } as const;
  actions.sort(
    (a, b) => rank[a.kind] - rank[b.kind] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const targetsHash = stateHash(input.targets.map((t) => `${t.key}:${t.qty}`));
  const bookHash = stateHash(
    input.bookParts ?? [...input.held.entries()].sort().map(([k, q]) => `${k}:${q}`),
  );
  return {
    targets: [...input.targets],
    actions,
    skipped,
    hashes: {
      targets: targetsHash,
      book: bookHash,
      plan: stateHash(actions.map((a) => `${a.kind}:${a.key}:${a.qty}`)),
    },
  };
}

/**
 * Ownership in Overall mode, restart-safe: a (symbol, direction) position is ours when an own-tagged order rests on
 * that symbol and position side (every control position carries an own protective stop), or when we just opened it
 * (`recent`). What is not ours is foreign and never touched. In hedge mode a long and a short on one symbol are
 * separate positions, so foreignness is per side (`sym|side`): a foreign position, or a foreign order carrying a
 * position side, freezes only that side — our position on the other side is still managed and closed. A foreign order
 * without a position side, and anything foreign in one-way mode (one position per symbol), freezes the whole symbol.
 * `independent` (live.foreignSides "independent", hedge mode only): someone else's position or order freezes nothing —
 * the desk trades its own quantity on that side beside it (quantity-bounded orders; capHeldToOwn keeps it to its own).
 * The quantity held per key is the exchange's here: capHeldToOwn bounds it to the own ledger.
 */
export function controlOwnership(
  book: BookView,
  connId: LiveSettings["connId"],
  recent: ReadonlySet<string>,
  /** keys the order ledger still counts as ours (> 0): ours even after their stop order is gone */
  ledgerOwn: ReadonlySet<string> = new Set(),
  positionMode: "hedge" | "oneway" = "hedge",
  independent = false,
): { held: Map<string, number>; foreign: Set<string> } {
  const oneway = positionMode === "oneway";
  const beside = independent && !oneway;
  const held = new Map<string, number>();
  const foreign = new Set<string>();
  for (const o of book.orders) {
    if (isOwnCoid(o.clientOrderId, connId)) continue;
    if (beside) continue;
    if (oneway || !o.positionSide) foreign.add(o.venueSymbol);
    else foreign.add(`${o.venueSymbol}|${o.positionSide === "LONG" ? 1 : -1}`);
  }
  for (const p of book.positions) {
    const side = p.side === "long" ? 1 : -1;
    const key = `${p.venueSymbol}|${side}`;
    const ps = p.side === "long" ? "LONG" : "SHORT";
    const tagged = book.orders.some(
      (o) =>
        o.venueSymbol === p.venueSymbol &&
        isOwnCoid(o.clientOrderId, connId) &&
        (!o.positionSide || o.positionSide === ps),
    );
    // an own position whose stop vanished (cancelled by hand, or swept on a book read that missed the position)
    // stays ours through the ledger: it is repaired and managed, never left unprotected as "foreign"
    if (tagged || recent.has(key) || ledgerOwn.has(key)) held.set(key, (held.get(key) ?? 0) + p.qty);
    else if (!beside) foreign.add(oneway ? p.venueSymbol : key);
  }
  for (const k of [...held.keys()]) if (isForeign(foreign, k)) held.delete(k);
  return { held, foreign };
}

/**
 * The own quantity per (symbol, direction) key from the order ledger, in time order: opens and increases add,
 * reduces, closes and outside reductions (H) subtract, never below 0. A close of a position this ledger never opened (adopted after a
 * restart that lost the database) then does not eat into the next open.
 */
export function ownLedger(
  rows: ReadonlyArray<{ k: string; kind: string; status: string; qty: number }>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const q = out.get(r.k) ?? 0;
    if ((r.kind === "O" || r.kind === "I") && (r.status === "ok" || r.status === "pending")) out.set(r.k, q + r.qty);
    else if ((r.kind === "X" || r.kind === "R") && r.status === "ok") out.set(r.k, Math.max(0, q - r.qty));
    // an outside reduction the desk attributed to its own quantity first (outsideReduction)
    else if (r.kind === "H" && r.status === "ok") out.set(r.k, Math.max(0, q - r.qty));
    // flat marker: the exchange showed the key flat (a stop-out, a manual close, an open that never filled)
    else if (r.kind === "F") out.set(r.k, 0);
  }
  return out;
}

/** the exchange take-profit's distance past the price: this many times the farthest lane target's (tpDistFor) */
export const TP_BEYOND = 1.2;
/** …and never further than this: a short's take-profit cannot reach 0 (a target further out gets none) */
export const TP_MAX_DIST = 0.9;

/**
 * The exchange take-profit's distance from the current price (fraction) for a position whose farthest lane target is
 * `tpPx`: TP_BEYOND × that target's distance — the desk takes every lane's profit at its own target first — at least
 * `minDist` (the stop floor, the venue's clearance), at most TP_MAX_DIST while that still lies beyond the target. 0:
 * nothing to place — the price is at or past the target (every lane is taking its profit now), or the target lies
 * TP_MAX_DIST away or further (a take-profit inside it would cut the lane's run).
 */
export function tpDistFor(side: 1 | -1, tpPx: number, px: number, minDist: number): number {
  if (!(px > 0) || !(tpPx > 0)) return 0;
  const d = (side * (tpPx - px)) / px;
  if (!(d > 0) || d >= TP_MAX_DIST) return 0;
  return Math.min(TP_MAX_DIST, Math.max(minDist, d * TP_BEYOND));
}

/**
 * Whether a resting take-profit at `r` still serves a position whose farthest lane target is `tpPx` and whose wanted
 * take-profit is `want` at price `px`: it lies beyond that target (one before it would close lanes short of their own
 * targets) and no more than its own distance again past the wanted price (one left far out when the farthest lane
 * exited). Between the two it stays where it is — a moving price never re-prices it.
 */
export function tpFits(side: 1 | -1, r: number, tpPx: number, want: number, px: number): boolean {
  if (!(r > 0) || !(tpPx > 0) || !(want > 0)) return false;
  if (side * (r - tpPx) < 0) return false;
  return side * (r - want) <= Math.abs(want - px);
}

/**
 * How a position the exchange closed outside this system went, from the own close orders still resting after it
 * (the one that filled is gone): the stop resting and the take-profit gone → by its take-profit; the take-profit
 * resting and the stop gone → by its stop; both resting → by hand, at the market; both gone (the venue cancels a
 * position's close orders with it, or the open orders were not read) → the level nearer to the price now, the stop
 * when only it is known. `tpPx` null: the position carried no take-profit.
 */
export function closedBy(x: {
  stopLeft: boolean;
  tpLeft: boolean;
  stopPx: number | null;
  tpPx: number | null;
  px: number;
}): { px: number | null; why: "stop" | "target" | "hand" } {
  const tp = x.tpPx !== null && x.tpPx > 0 ? x.tpPx : null;
  const sp = x.stopPx !== null && x.stopPx > 0 ? x.stopPx : null;
  if (x.stopLeft && (x.tpLeft || tp === null)) return { px: null, why: "hand" };
  if (x.stopLeft) return { px: tp, why: "target" };
  if (x.tpLeft || tp === null) return { px: sp, why: "stop" };
  if (sp === null) return { px: tp, why: "target" };
  return x.px > 0 && Math.abs(x.px - tp) < Math.abs(x.px - sp) ? { px: tp, why: "target" } : { px: sp, why: "stop" };
}

/** A venue order of the liquidation engine (a liquidation, or an auto-deleverage that took the position). */
export const isLiquidationType = (type: unknown) => /LIQUID|ADL|DELEVERAG/i.test(String(type ?? ""));

/**
 * What closed a side the desk found flat, read from the venue's order history of its symbol since the side was last
 * seen held (BingX allOrders rows): one of our own close orders that filled — the backstop (a stop) or the position's
 * take-profit — at its fill price; else a liquidation or auto-deleverage fill ("liq": the venue's engine took the
 * position — an own loss, counted like a stop); otherwise the closing fills of orders that are not ours (a close by hand
 * in the venue's app, another system) at their quantity-weighted price. null when the history shows none of them, and
 * the caller checks the levels against the bars (verifyClose). A close by hand makes the venue CANCEL the position's own
 * stop and take-profit, so a stop that left the book is no proof it filled (x02, 7 Oct 13:50: 20 positions a close-all
 * took in profit were booked at their stops — 1,210 lanes at −23 % to −30 % each). Lane stops and take-profits (V, Y)
 * are each lane's own exit and the desk's own market orders its own moves: neither is the side's outside close. A one-way
 * (BOTH) row is the symbol's one position and counts for the side its order closes.
 */
export function outsideCloseOf(
  orders: ReadonlyArray<Record<string, unknown>>,
  side: number,
  connId: LiveSettings["connId"],
  openedAt = 0,
): { why: "stop" | "target" | "hand" | "liq"; px: number } | null {
  const ps = side > 0 ? "LONG" : "SHORT";
  const closing = side > 0 ? "SELL" : "BUY";
  const at = (o: Record<string, unknown>) => Number(o.updateTime ?? o.time ?? 0) || 0;
  // a one-way (BOTH) row is the symbol's one position: it belongs to the side its order closes (the side checks)
  const onSide = (o: Record<string, unknown>) => {
    const pos = String(o.positionSide ?? "").toUpperCase();
    return pos === ps || pos === "BOTH";
  };
  // A history read spans beyond one position on a busy symbol. Never reuse the previous episode's stop / manual
  // close for a position opened after it; the exchange may return newest first or oldest first.
  let since = openedAt;
  for (const o of orders)
    if (
      onSide(o) &&
      String(o.side ?? "").toUpperCase() !== closing &&
      isOwnCoid(String(o.clientOrderId ?? ""), connId) &&
      Number(o.executedQty) > 0
    ) since = Math.max(since, at(o));
  let own: { why: "stop" | "target"; px: number; at: number } | null = null;
  const hand: Array<{ px: number; qty: number; at: number }> = [];
  const liq: Array<{ px: number; qty: number; at: number }> = [];
  for (const o of orders) {
    if (at(o) < since) continue;
    if (!onSide(o)) continue;
    if (String(o.side ?? "").toUpperCase() !== closing) continue;
    if (!String(o.status ?? "").toUpperCase().includes("FILLED")) continue;
    const px = Number(o.avgPrice);
    if (!(px > 0)) continue;
    const coid = String(o.clientOrderId ?? "");
    if (isOwnCoid(coid, connId)) {
      const kind = ownCoidKind(coid, connId);
      if (kind === "V" || kind === "Y") continue;
      const type = String(o.type ?? "").toUpperCase();
      if (!own || at(o) >= own.at) {
        if (type.startsWith("STOP")) own = { why: "stop", px, at: at(o) };
        else if (type.startsWith("TAKE_PROFIT")) own = { why: "target", px, at: at(o) };
      }
      continue;
    }
    const q = Number(o.executedQty);
    if (!(q > 0)) continue;
    // the liquidation engine's fill: an own loss (counted like a stop), never a close by hand
    (isLiquidationType(o.type) ? liq : hand).push({ px, qty: q, at: at(o) });
  }
  // the latest close decides: an own close after every other fill is the side's close; else the fills after it
  const lastOther = [...hand, ...liq].reduce((last, o) => Math.max(last, o.at), -Infinity);
  if (own && own.at >= lastOther) return { why: own.why, px: own.px };
  const vwap = (xs: ReadonlyArray<{ px: number; qty: number; at: number }>) => {
    let qty = 0;
    let notional = 0;
    for (const o of xs) {
      if (own && o.at < own.at) continue;
      qty += o.qty;
      notional += o.qty * o.px;
    }
    return qty > 0 ? notional / qty : null;
  };
  const liqPx = vwap(liq);
  if (liqPx !== null) return { why: "liq", px: liqPx };
  const handPx = vwap(hand);
  return handPx !== null ? { why: "hand", px: handPx } : null;
}

/** how far a bar may stay short of a stop or a target and still count as reaching it (0.1 % of the level) */
export const VERIFY_TOL = 0.001;

/**
 * How a side the venue closed went, when its order history cannot say: only a level the market reached is believed.
 * The 1m bars since the previous step (their highs and lows) and the price now — the stop alone reached → by its stop
 * at the stop price, the take-profit alone → by its take-profit at its price (px_src "bar"); both reached, neither, or
 * no bars → "unverified" at the price now (px_src "ticker"), which no reader counts as an own close. A level given as
 * null is no candidate (its order still rests: it did not fill). The 11 Oct 01:06 relaunch booked STRK at its stop
 * 0.08404 while the low was 0.10073 — −1002.9 % booked against −58.4 % at the market.
 */
export function verifyClose(x: {
  side: 1 | -1;
  stopPx: number | null;
  tpPx: number | null;
  bars: ReadonlyArray<{ h: number; l: number }>;
  /** the price now (0: unknown) */
  px: number;
  tol?: number;
}): { why: "stop" | "target" | "unverified"; px: number; src: "bar" | "ticker" } {
  const unverified = { why: "unverified" as const, px: x.px, src: "ticker" as const };
  if (!x.bars.length) return unverified;
  const tol = x.tol ?? VERIFY_TOL;
  let hi = x.px > 0 ? x.px : -Infinity;
  let lo = x.px > 0 ? x.px : Infinity;
  for (const b of x.bars) {
    if (b.h > hi) hi = b.h;
    if (b.l < lo) lo = b.l;
  }
  const down = (lvl: number) => lo <= lvl * (1 + tol);
  const up = (lvl: number) => hi >= lvl * (1 - tol);
  const sp = x.stopPx !== null && x.stopPx > 0 ? x.stopPx : null;
  const tp = x.tpPx !== null && x.tpPx > 0 ? x.tpPx : null;
  // a long's stop lies below the price and its take-profit above; a short's the other way round
  const stopHit = sp !== null && (x.side === 1 ? down(sp) : up(sp));
  const tpHit = tp !== null && (x.side === 1 ? up(tp) : down(tp));
  if (sp !== null && stopHit && !tpHit) return { why: "stop", px: sp, src: "bar" };
  if (tp !== null && tpHit && !stopHit) return { why: "target", px: tp, src: "bar" };
  return unverified;
}

/**
 * The quantity this system holds on a (symbol, direction) key: its own order ledger (opens and increases minus reduces,
 * closes and outside reductions) and never more than the exchange shows — held = min(ledger own, exchange quantity).
 * Whether a key is ours to manage (an own order resting on it, a recent open, the ledger) never decides how much of it
 * is ours: someone else's quantity merged into the same position is never reduced, closed, rebalanced or re-stopped.
 * Reported per key: the exchange holds more than the own quantity (merged: someone else's quantity beside ours, beyond
 * `tolerance` of ours), nothing of it is ours (own 0: the ledger closed our part), or the own quantity is unverified
 * (own null: an own order rests there but no ledger entry proves any quantity — a lost database, an adopted position).
 * Keys of the last two kinds leave `held`: not touched.
 */
export function capHeldToOwn(
  held: Map<string, number>,
  ledger: ReadonlyMap<string, number>,
  tolerance = MERGED_TOL,
): Array<{ key: string; exchange: number; own: number | null }> {
  const out: Array<{ key: string; exchange: number; own: number | null }> = [];
  for (const [key, qty] of held) {
    const own = ledger.get(key);
    if (own === undefined) {
      held.delete(key);
      out.push({ key, exchange: qty, own: null });
      continue;
    }
    if (!(own > 0)) {
      held.delete(key);
      out.push({ key, exchange: qty, own: 0 });
      continue;
    }
    if (qty > own) held.set(key, own);
    if (qty > own * (1 + tolerance) + 1e-9) out.push({ key, exchange: qty, own });
  }
  return out;
}

/** an exchange quantity beyond the own one by more than this share of it holds someone else's quantity (merged) */
export const MERGED_TOL = 0.005;

/**
 * The own close orders (backstop / take-profit, not lane orders) that filled on a side, the liquidation engine's fills
 * and the fills of orders that are not ours, from the venue's order history of the symbol (BingX allOrders rows):
 * quantity and quantity-weighted price of each. The desk's own market orders are in its ledger and are left out.
 */
export function closeFillsOf(
  orders: ReadonlyArray<Record<string, unknown>>,
  side: number,
  connId: LiveSettings["connId"],
): {
  own: { qty: number; px: number; why: "stop" | "target" };
  liq: { qty: number; px: number };
  foreign: { qty: number; px: number };
} {
  const ps = side > 0 ? "LONG" : "SHORT";
  const closing = side > 0 ? "SELL" : "BUY";
  const acc = { own: [0, 0], liq: [0, 0], foreign: [0, 0] };
  let why: "stop" | "target" = "stop";
  for (const o of orders) {
    // a one-way (BOTH) row is the symbol's one position: it belongs to the side its order closes (the side check below)
    const pos = String(o.positionSide ?? "").toUpperCase();
    if (pos !== ps && pos !== "BOTH") continue;
    if (String(o.side ?? "").toUpperCase() !== closing) continue;
    if (!String(o.status ?? "").toUpperCase().includes("FILLED")) continue;
    const px = Number(o.avgPrice);
    const q = Number(o.executedQty);
    if (!(px > 0) || !(q > 0)) continue;
    const coid = String(o.clientOrderId ?? "");
    let into: number[];
    if (isOwnCoid(coid, connId)) {
      const kind = ownCoidKind(coid, connId);
      const type = String(o.type ?? "").toUpperCase();
      if (kind === "V" || kind === "Y" || !/^(STOP|TAKE_PROFIT)/.test(type)) continue;
      if (type.startsWith("TAKE_PROFIT")) why = "target";
      into = acc.own;
    } else into = isLiquidationType(o.type) ? acc.liq : acc.foreign;
    into[0] += q;
    into[1] += q * px;
  }
  const of = (a: number[]) => ({ qty: a[0], px: a[0] > 0 ? a[1] / a[0] : 0 });
  return { own: { ...of(acc.own), why }, liq: of(acc.liq), foreign: of(acc.foreign) };
}

/**
 * How a key's own stops (or take-profits) — `pieces`, each with its quantity and price — come back to the own quantity
 * `want` (hedge mode: bounded exit orders), without ever leaving the key without one, and without ever resting for more
 * than ours where someone else's quantity sits beside it (`merged`):
 * - nobody else's quantity there: one new piece for the whole own quantity first (a moment of two cannot close anyone
 *   else's quantity), then every old piece — a key wholly ours keeps one stop;
 * - merged, more is ours: a top-up piece for the difference at the largest piece's price — nothing is cancelled;
 * - merged, less is ours: the largest pieces that still fit stay, the others go first, and the rest is topped up; only
 *   when no piece fits are they all cancelled before the new one goes out (`bare`: the one case a stop is briefly
 *   absent — the alternative would rest for more than ours on someone else's position).
 * null: within a lot of `want` already (or nothing to size).
 */
export function resizeExits(
  pieces: ReadonlyArray<{ id: string; qty: number; px: number }>,
  want: number,
  merged: boolean,
  lot = 0,
): { cancel: string[]; place: { qty: number; px: number } | null; placeFirst: boolean; bare: boolean } | null {
  if (!pieces.length || !(want > 0)) return null;
  const tol = Math.max(lot, 1e-12) * (1 + 1e-9);
  const total = pieces.reduce((a, p) => a + p.qty, 0);
  if (Math.abs(total - want) <= tol) return null;
  const big = pieces.reduce((a, p) => (p.qty > a.qty ? p : a));
  if (!merged) return { cancel: pieces.map((p) => p.id), place: { qty: want, px: big.px }, placeFirst: true, bare: false };
  if (want > total) return { cancel: [], place: { qty: want - total, px: big.px }, placeFirst: true, bare: false };
  let kept = 0;
  const cancel: string[] = [];
  for (const p of [...pieces].sort((a, b) => b.qty - a.qty))
    if (kept + p.qty <= want + tol) kept += p.qty;
    else cancel.push(p.id);
  const rest = want - kept;
  return { cancel, place: rest > tol ? { qty: rest, px: big.px } : null, placeFirst: false, bare: kept === 0 };
}

/**
 * Own-first attribution of a reduction the desk did not make on a key it holds (decision of 14 Oct: the operator's
 * quantity is never own). The exchange should hold the own quantity (the ledger, after the desk's own orders) plus the
 * quantity someone else held at the previous read; a shortfall beyond `tol` is first explained by the own close
 * orders that filled (`ownFilled`, from the venue's history; 0 when unreadable), and the unexplained rest reduces the
 * OWN quantity first — the desk never sells more than it could possibly own. Only what is left after the own quantity
 * is gone reduces the other part. null: no reduction (an increase only raises the other part's estimate).
 */
export function outsideReduction(x: {
  own: number;
  ex: number;
  prevForeign: number;
  tol: number;
  ownFilled: number;
}): { shortfall: number; explained: number; unexplained: number; own: number; foreign: number } | null {
  const own = Math.max(0, x.own);
  const shortfall = own + Math.max(0, x.prevForeign) - Math.max(0, x.ex);
  if (!(shortfall > x.tol) || !(own > 0)) return null;
  const explained = Math.min(shortfall, Math.max(0, x.ownFilled), own);
  let unexplained = Math.min(own - explained, shortfall - explained);
  let left = Math.max(0, own - explained - unexplained);
  // Quantity arithmetic can leave a few floating-point ulps after a measured full reduction (for example,
  // 0.294 beside 10). Avoid turning numerical dust into a forever-open side, but never round a meaningful lot.
  const ulps = Math.min(Math.max(0, x.tol) * 1e-6,
    Number.EPSILON * 8 * Math.max(1, own, Math.abs(x.ex), Math.abs(x.prevForeign)));
  if (left > 0 && left <= ulps) { unexplained = own - explained; left = 0; }
  return { shortfall, explained, unexplained, own: left, foreign: Math.max(0, x.ex - left) };
}

// ── positions closed outside CTS-A-O (manually on the exchange, or by a stop) ─────────────────────────────────
// A control position that was held at the previous step and is gone now, although this system neither closed
// nor reduced it, was closed externally. Processing stays ongoing: those lane orders are not held back, and
// the next control step puts the position back while the simulation still holds them.

export interface ControlMemory {
  held: Array<{ key: string; qty: number }>;
  actions: Array<{ kind: string; key: string; ok: boolean }>;
  /** lane orders per control key at that step */
  laneCounts?: Record<string, number>;
  /** (older states: the lane order ids) */
  lanes?: Record<string, string[]>;
}

export function externalCloses(
  prev: ControlMemory | null | undefined,
  held: ReadonlyMap<string, number>,
): Array<{ key: string; lanes: number }> {
  if (!prev) return [];
  // what we held AFTER the previous step: its starting book plus our successful opens / increases
  const had = new Set(prev.held.filter((h) => h.qty > 0).map((h) => h.key));
  for (const a of prev.actions)
    if (a.ok && (a.kind === "open" || a.kind === "increase")) had.add(a.key);
  // only our own close empties a side: a reduce leaves the position held, so a side flat after it was closed by the
  // exchange (its stop) — counted as ours, the lanes reopened the same position at market
  const ours = new Set(prev.actions.filter((a) => a.ok && a.kind === "close").map((a) => a.key));
  const out: Array<{ key: string; lanes: number }> = [];
  for (const key of had) {
    if ((held.get(key) ?? 0) > 0 || ours.has(key)) continue;
    out.push({ key, lanes: prev.laneCounts?.[key] ?? prev.lanes?.[key]?.length ?? 0 });
  }
  return out;
}

/**
 * Lane orders per control key (sym|side) of the contributions that are used. A count, not the order ids: with
 * every config its own seat the ids were 3.3 MB of control status, cloned on every 100 ms step and rewritten to
 * the state file every second — only their number is ever read.
 */
export function laneCountsByKey(contribs: readonly ControlContribution[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of contribs) if (c.id) out[`${c.sym}|${c.side}`] = (out[`${c.sym}|${c.side}`] ?? 0) + 1;
  return out;
}
