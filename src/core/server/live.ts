// Live stage planner (pure). The adapter (live.server.ts) executes its plan.
// Rules:
//   - OFF unless settings.live.enabled AND env CTS_CORE_LIVE=1 AND keys exist
//   - own tickets carry the CTSB tag of this connection; nothing else is ever cancelled or closed
//   - a symbol with any foreign position or order is skipped entirely
//   - caps: max own positions, fixed notional per entry
import type { LiveSettings } from "../config.ts";
import { sigCfg } from "../sim/walkforward.ts";
import { rangeOfId } from "../minimal-coord.ts";
import type { RangeTag } from "../domain/types.ts";

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
  if (cfg && sigCfg(cfg)) return "Q";
  const r = rangeOfId(cfg);
  return r ? RANGE_COID[r] : "E";
}

export function makeCoid(
  connId: LiveSettings["connId"],
  kind: EntryKind | "S" | "T" | "C",
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
  }>;
  orders: Array<{
    id?: string;
    symbol: string;
    venueSymbol: string;
    clientOrderId?: string;
    positionSide?: "LONG" | "SHORT";
    type?: string;
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
  /**
   * the simulation manages the exit (trailing stop, DCA / Axis legs, …): a static exchange SL / TP cannot mirror
   * it, so entries mode skips it (overall mode mirrors every paper exit)
   */
  managed?: boolean;
}

export interface LivePlan {
  enabled: boolean;
  reason: string;
  entries: LiveIntentLite[];
  skipped: Array<{ sym: string; why: string }>;
}

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
  const foreign = new Set<string>();
  for (const o of book.orders)
    if (!isOwnCoid(o.clientOrderId, settings.connId)) foreign.add(o.venueSymbol);
  for (const p of book.positions) if (!input.ownSyms.has(p.venueSymbol)) foreign.add(p.venueSymbol);
  // hedge mode: a long and a short on one symbol are separate positions, so "already holding" is per
  // (symbol, direction) — an own long never blocks the short entry. One-way: one position per symbol.
  const oneway = (settings.positionMode ?? "hedge") === "oneway";
  const keyOf = (sym: string, side: 1 | -1) => (oneway ? sym : `${sym}|${side}`);
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
  let open = ownKeys.size;
  const entries: LiveIntentLite[] = [];
  const skipped: LivePlan["skipped"] = [];
  const seen = new Set<string>();
  for (const it of intents) {
    const key = `${it.cfg}|${it.sym}|${it.barT}`;
    if (input.sent.has(key)) continue;
    if (it.managed) {
      skipped.push({ sym: it.sym, why: "managed exit (trailing / DCA / Axis) needs overall mode" });
      continue;
    }
    if (input.newestBarT !== undefined && it.barT < input.newestBarT) {
      skipped.push({ sym: it.sym, why: "stale signal (symbol not updated)" });
      continue;
    }
    if (foreign.has(it.sym)) {
      skipped.push({ sym: it.sym, why: "foreign position/order on symbol" });
      continue;
    }
    const k = keyOf(it.sym, it.side);
    if (held.has(k) || seen.has(k)) {
      skipped.push({ sym: it.sym, why: oneway ? "already holding symbol" : "already holding symbol and direction" });
      continue;
    }
    if (settings.maxPositions > 0 && open >= settings.maxPositions) {
      skipped.push({ sym: it.sym, why: "max positions" });
      continue;
    }
    seen.add(k);
    entries.push(it);
    open++;
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
  /** stop distance of the lane's protect (fraction) */
  sl: number;
  /**
   * what the lane still loses at its stop (fraction of the entry, ≥ 0): a trailed stop past the entry risks nothing.
   * Unset = sl.
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
  lanes: number;
  vol: number;
  notional: number;
  qty: number;
  /** catastrophic stop distance for the control position (widest lane stop × 1.2, min stop … 20 %) */
  stopDist: number;
  /**
   * planned loss distance: the volume-weighted mean of the lanes' own stops (min stop … stopDist) — what the position
   * loses when every lane exits at its own stop; the risk budget is measured on it (the backstop only fires when the
   * desk does not manage the position)
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
   * this position up — only a higher cap (maxPositionX / maxNotionalUsd) does
   */
  capped?: boolean;
  /** set when every contributing lane is the same tracked range ("|mp", "|mc", "|mn" or "|sh") */
  cfg?: string;
}

/**
 * Account exposure factor: when the targets' gross notional (long and short counted apart, both in full) exceeds
 * `maxX` × equity, every target is scaled by the same factor — the relations between positions (volume factors,
 * Block multiples, ratios, long vs short) stay as they are. A scaled quantity is snapped to the exchange (never
 * below its minimum for a target that was open). No equity or maxX ≤ 0: unchanged.
 */
export function scaleToExposure(
  targets: ControlTarget[],
  equity: number | null | undefined,
  maxX: number | undefined,
  snap: (sym: string, qty: number, px: number) => number,
): { factor: number; gross: number; cap: number } | null {
  if (!(maxX && maxX > 0) || !(equity && equity > 0)) return null;
  const gross = targets.reduce((a, t) => a + Math.abs(t.notional), 0);
  const cap = maxX * equity;
  if (!(gross > cap)) return { factor: 1, gross, cap };
  const factor = cap / gross;
  for (const t of targets) {
    const px = t.qty > 0 ? t.notional / t.qty : 0;
    if (!(px > 0)) continue;
    const q = snap(t.sym, t.qty * factor, px);
    t.qty = q > 0 ? q : t.qty;
    t.notional = t.qty * px;
    if (t.volEff !== undefined) t.volEff *= factor;
  }
  return { factor, gross, cap };
}

/**
 * Stop-risk budget: when the targets' summed notional × planned loss distance (every lane at its own stop at once;
 * `riskDist`, else the backstop `stopDist`) exceeds maxRiskPct × equity, the targets are scaled by one factor
 * (relations between positions kept).
 *
 * Positions at the exchange minimum cannot shrink, so the drops are decided FIRST: the weakest new targets (the list
 * is ranked held first, then by volume) are left out while the survivors' risk at their minimum size alone is over
 * the budget. The factor is then computed on the survivors only — a survivor is never shrunk to make room for a
 * position that is dropped anyway. A survivor whose scaled size would fall under its minimum stays at the minimum and
 * the factor of the others is solved again around it (water-fill), so the total lands on the budget.
 */
export function scaleToRisk(
  targets: ControlTarget[],
  equity: number | null | undefined,
  maxRiskPct: number | undefined,
  snap: (sym: string, qty: number, px: number) => number,
  /** keys held now: never dropped (a position at the exchange minimum that cannot shrink stays) */
  held?: ReadonlySet<string>,
  /** the loss priced per position: its lanes' own stops (default) or the exchange backstop (the worst case) */
  dist: (t: ControlTarget) => number = (t) => t.riskDist ?? t.stopDist,
): { factor: number; risk: number; cap: number; dropped: string[] } | null {
  if (!(maxRiskPct && maxRiskPct > 0) || !(equity && equity > 0)) return null;
  const riskOf = (t: ControlTarget) => Math.abs(t.notional) * dist(t);
  const risk = targets.reduce((a, t) => a + riskOf(t), 0);
  const cap = maxRiskPct * equity;
  const dropped: string[] = [];
  if (!(risk > cap)) return { factor: 1, risk, cap, dropped };
  const pxOf = (t: ControlTarget) => (t.qty > 0 ? t.notional / t.qty : 0);
  // the smallest size each target can take: the exchange minimum (a snap of a sliver raises to it), never above now
  const minRisk = targets.map((t) => {
    const px = pxOf(t);
    if (!(px > 0)) return riskOf(t);
    const q = snap(t.sym, t.qty * 1e-9, px);
    return q > 0 ? Math.min(t.qty, q) * px * dist(t) : 0;
  });
  // 1) drops: the weakest new ones go while the survivors cannot fit even at their minimum (a running total, so it
  // stays O(n) at hundreds of targets)
  let floor = minRisk.reduce((a, b) => a + b, 0);
  const drop = new Set<number>();
  for (let i = targets.length - 1; i >= 0 && floor > cap * 1.0001; i--) {
    if (held?.has(targets[i].key)) continue;
    drop.add(i);
    dropped.push(targets[i].key);
    floor -= minRisk[i];
  }
  const keepIdx = targets.map((_, i) => i).filter((i) => !drop.has(i));
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
  if (drop.size) {
    const keep = keepIdx.map((i) => targets[i]);
    targets.length = 0;
    for (const t of keep) targets.push(t);
  }
  return { factor, risk, cap, dropped };
}

/** The per-position cap: the fixed USD cap and the equity multiple, the smaller one (Infinity when neither). */
export function positionCapFor(fixed: number, equity: number | null | undefined, maxPositionX: number | undefined): number {
  const x = maxPositionX && maxPositionX > 0 && equity && equity > 0 ? maxPositionX * equity : Infinity;
  return Math.min(fixed, x);
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
  /** max simultaneous control positions of the engine (symbol × direction); every lane order on one counts once */
  maxPositions: number;
  /**
   * max simultaneous control positions that only signal lanes hold (symbol × direction, long and short apart);
   * capped apart from the engine's — 0 / unset = no limit
   */
  signalMaxPositions?: number;
  /** only adjust an existing position when the target differs by more than this share */
  rebalancePct: number;
  /** every position `ratio` units whatever its lanes' volume (live.positionSize "min") */
  minSize?: boolean;
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
 * How far past the per-position cap the EXCHANGE MINIMUM may take a position. The venue minimum is not negotiable:
 * either the position is opened at it or the symbol cannot be traded at all, so the cap gives way to it rather than
 * dropping the target. The multiple is the bound on that: a minimum this far above the cap is a symbol this account
 * is too small to trade, and the position is refused — but a held one is kept, never closed for being too large.
 */
export const MIN_RAISE_X = 4;

/** The skip reason above, as a predicate: the simulator counts these, and matching on the prose broke silently. */
export const isMinAboveCapSkip = (why: string) => why.startsWith("exchange minimum ");

export interface ControlPlan {
  targets: ControlTarget[];
  actions: ControlAction[];
  /** keep: the (symbol, direction) key whose held position stays untouched (its target is unknown, not zero) */
  skipped: Array<{ sym: string; why: string; keep?: string }>;
  hashes: { targets: string; book: string; plan: string };
}

/** Small stable hash (FNV-1a, base36) for state fingerprints. */
export function stateHash(parts: readonly string[]): string {
  let h = 2166136261;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 10, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
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
    vol: number;
    sl: number;
    /** Σ weighted volume × lane stop (riskDist = rw / vol) */
    rw: number;
    engine?: boolean;
    tag?: "" | RangeTag | "mix";
    /** the farthest lane target (long: highest, short: lowest); noTgt: a lane without one */
    tgt?: number;
    noTgt?: boolean;
    /** the widest lane stop (long: lowest, short: highest) */
    lw?: number;
  };
  const note = (a: Agg, cfg: string) => {
    const tag = rangeOfId(cfg);
    a.tag = a.tag === undefined || a.tag === tag ? tag : "mix";
  };
  let agg = new Map<string, Agg>();
  for (const l of lanes) {
    const key = `${l.sym}|${l.side}`;
    const a = agg.get(key) ?? { sym: l.sym, side: l.side, lanes: 0, vol: 0, sl: 0, rw: 0 };
    note(a, l.cfg);
    // a position with any engine lane is an engine position; only signal lanes on it: a signal position
    const sig = sigCfg(l.cfg);
    if (!sig) a.engine = true;
    a.lanes++;
    const w = Math.max(0, l.vol) * (sig ? Math.max(0, cs.signalWeight ?? 1) : 1);
    a.vol += w;
    a.rw += w * Math.max(0, l.risk ?? l.sl);
    a.sl = Math.max(a.sl, l.sl);
    if (l.stopPx !== undefined && l.stopPx > 0)
      a.lw = a.lw === undefined ? l.stopPx : l.side === 1 ? Math.min(a.lw, l.stopPx) : Math.max(a.lw, l.stopPx);
    if (!(l.tgt !== undefined && l.tgt > 0)) a.noTgt = true;
    else a.tgt = a.tgt === undefined ? l.tgt : l.side === 1 ? Math.max(a.tgt, l.tgt) : Math.min(a.tgt, l.tgt);
    agg.set(key, a);
  }
  if (cs.positionMode === "oneway") {
    // one net position per symbol: long volume minus short volume decides side and size
    const net = new Map<string, Agg>();
    const syms = new Set([...agg.values()].map((a) => a.sym));
    for (const sym of syms) {
      const L = agg.get(`${sym}|1`);
      const S = agg.get(`${sym}|-1`);
      const v = (L?.vol ?? 0) - (S?.vol ?? 0);
      if (Math.abs(v) < 1e-9) continue;
      const side = (v > 0 ? 1 : -1) as 1 | -1;
      // the stop and the risk come from the side that survives the netting (the other side's lanes are offset)
      const win = side > 0 ? L : S;
      const tags = [L?.tag, S?.tag].filter((t) => t !== undefined);
      net.set(`${sym}|${side}`, {
        sym,
        side,
        lanes: (L?.lanes ?? 0) + (S?.lanes ?? 0),
        vol: Math.abs(v),
        sl: win?.sl ?? 0,
        rw: win && win.vol > 0 ? (win.rw / win.vol) * Math.abs(v) : 0,
        tgt: win?.tgt,
        noTgt: win?.noTgt,
        lw: win?.lw,
        engine: !!(L?.engine || S?.engine),
        tag: tags.length && tags.every((t) => t === tags[0]) ? tags[0] : "mix",
      });
    }
    agg = net;
  }
  const targets: ControlTarget[] = [];
  const skipped: ControlPlan["skipped"] = [];
  let engTargets = 0;
  let sigTargets = 0;
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
    // positions (symbol × direction) are capped per class: the engine's by maxPositions, the signals' by
    // signalMaxPositions (orders — the lane orders on a position — are not limited)
    // one cap for every live position (engine and signal positions together); the signal cap, when set,
    // only narrows the signal share inside it
    const isSig = !a.engine;
    const sigCap = cs.signalMaxPositions ?? 0;
    // a target that cannot open this step takes no slot (a held one is always kept and counted)
    if (!isHeld(key) && cs.blocked) {
      const b = cs.blocked(key);
      if (b) {
        skipped.push({ sym: a.sym, why: typeof b === "string" ? b : "open waiting after a failure" });
        continue;
      }
    }
    if (
      (cs.maxPositions > 0 && engTargets + sigTargets >= cs.maxPositions) ||
      (isSig && sigCap > 0 && sigTargets >= sigCap)
    ) {
      skipped.push({
        sym: a.sym,
        why:
          cs.maxPositions > 0 && engTargets + sigTargets >= cs.maxPositions
            ? "max control positions (symbol × side)"
            : "max signal control positions (symbol × side)",
      });
      continue;
    }
    const unit = cs.unitOf ? cs.unitOf(a.sym, px) : cs.notionalUsd;
    const want = unit * (cs.minSize ? 1 : a.vol) * cs.ratio;
    const notional = Math.min(cs.maxNotionalUsd, want);
    const sn = snap(a.sym, notional / px, px);
    const qty = typeof sn === "number" ? sn : sn.qty;
    const raised = typeof sn === "number" ? false : sn.raised;
    // no spec, no price precision, nothing to round to: a held position stays as it is rather than being closed
    if (!(qty > 0)) {
      skipped.push({ sym: a.sym, why: "size rounds to zero", keep: key });
      continue;
    }
    // Raised to the exchange minimum: the minimum wins over the per-position cap, because the alternative is not
    // trading the symbol at all. Only a minimum MIN_RAISE_X times past the cap is refused — and then the held
    // position is kept, not closed.
    const atMin = raised && qty * px > cs.maxNotionalUsd * 1.0001;
    if (atMin && qty * px > cs.maxNotionalUsd * MIN_RAISE_X) {
      skipped.push({
        sym: a.sym,
        why: `exchange minimum ${(qty * px).toFixed(2)} USD is over ${MIN_RAISE_X}x the position cap ${cs.maxNotionalUsd.toFixed(2)} USD`,
        keep: key,
      });
      continue;
    }
    // our own floor, and under it the venue's: a stop the exchange refuses for being too close is not a stop
    const minStop = Math.max(cs.minStopPct ?? 0.01, cs.minStopOf?.(a.sym, px) ?? 0);
    const stopDist = Math.min(0.2, Math.max(minStop, a.sl * 1.2));
    targets.push({
      key,
      sym: a.sym,
      side: a.side,
      lanes: a.lanes,
      vol: a.vol,
      notional: qty * px,
      qty,
      ...(a.tag && a.tag !== "mix" ? { cfg: `|${a.tag}` } : {}),
      // the stop is never tighter than the configured minimum (default 1 %), never wider than 20 %
      stopDist,
      riskDist: Math.min(stopDist, Math.max(minStop, a.vol > 0 ? a.rw / a.vol : a.sl)),
      ...(!a.noTgt && a.tgt !== undefined && a.tgt > 0 ? { tpPx: a.tgt } : {}),
      ...(a.lw !== undefined && a.lw > 0 ? { stopPx: a.lw } : {}),
      raised,
      ...(atMin ? { atMin: true as const } : {}),
      // the volume actually held, in lane units (> vol when the exchange minimum raised the order)
      volEff: (qty * px) / Math.max(1e-9, unit * cs.ratio),
      ...(want > cs.maxNotionalUsd * 1.0001 ? { capped: true } : {}),
    });
    if (isSig) sigTargets++;
    else engTargets++;
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
 */
export function controlOwnership(
  book: BookView,
  connId: LiveSettings["connId"],
  recent: ReadonlySet<string>,
  /** keys the order ledger still counts as ours (> 0): ours even after their stop order is gone */
  ledgerOwn: ReadonlySet<string> = new Set(),
  positionMode: "hedge" | "oneway" = "hedge",
): { held: Map<string, number>; foreign: Set<string> } {
  const oneway = positionMode === "oneway";
  const held = new Map<string, number>();
  const foreign = new Set<string>();
  for (const o of book.orders) {
    if (isOwnCoid(o.clientOrderId, connId)) continue;
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
    else foreign.add(oneway ? p.venueSymbol : key);
  }
  for (const k of [...held.keys()]) if (isForeign(foreign, k)) held.delete(k);
  return { held, foreign };
}

/**
 * The own quantity per (symbol, direction) key from the order ledger, in time order: opens and increases add,
 * reduces and closes subtract, never below 0. A close of a position this ledger never opened (adopted after a
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

/**
 * The quantity this system opened on a (symbol, direction) key: opens and increases minus reduces and closes, from
 * its own order ledger. When the exchange position is larger (someone else added to the same symbol and
 * direction, which merges into one position), only the own part is held: the excess is never reduced, closed or
 * rebalanced. No ledger entry (a lost database, an adopted position) leaves the exchange quantity as it is; a
 * ledger at 0 (our part closed, a flat marker) means the whole exchange quantity is someone else's: not held.
 */
export function capHeldToOwn(
  held: Map<string, number>,
  ledger: ReadonlyMap<string, number>,
  tolerance = 0.05,
): Array<{ key: string; exchange: number; own: number }> {
  const excess: Array<{ key: string; exchange: number; own: number }> = [];
  for (const [key, qty] of held) {
    const own = ledger.get(key);
    if (own === undefined) continue;
    if (!(own > 0)) {
      held.delete(key);
      excess.push({ key, exchange: qty, own: 0 });
      continue;
    }
    if (qty > own * (1 + tolerance) + 1e-9) {
      held.set(key, own);
      excess.push({ key, exchange: qty, own });
    }
  }
  return excess;
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
