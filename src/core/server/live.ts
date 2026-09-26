// Live stage planner (pure). The adapter (live.server.ts) executes its plan.
// Rules:
//   - OFF unless settings.live.enabled AND env CTS_CORE_LIVE=1 AND keys exist
//   - own tickets carry the CTSB tag of this connection; nothing else is ever cancelled or closed
//   - a symbol with any foreign position or order is skipped entirely
//   - caps: max own positions, fixed notional per entry
import type { LiveSettings } from "../config.ts";

export const LIVE_TAG: Record<LiveSettings["connId"], string> = {
  "bingx-x01": "CTSBX1_",
  "bingx-vst-01": "CTSBV1_",
  "bingx-vst-02": "CTSBV2_",
};

export function liveNetwork(connId: LiveSettings["connId"]): "mainnet" | "testnet" {
  return connId === "bingx-x01" ? "mainnet" : "testnet";
}

export function makeCoid(connId: LiveSettings["connId"], kind: "E" | "S" | "T" | "C", now = Date.now()): string {
  return `${LIVE_TAG[connId]}${kind}${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 40);
}

export function isOwnCoid(coid: string | undefined, connId: LiveSettings["connId"]): boolean {
  return !!coid && coid.toUpperCase().startsWith(LIVE_TAG[connId]);
}

/** Symbols we own on the exchange: own-tagged open orders, or a position that one of our recent entries opened. */
export function ownSymbols(book: BookView, connId: LiveSettings["connId"], recentEntrySyms: ReadonlySet<string>): Set<string> {
  const own = new Set<string>();
  for (const o of book.orders) if (isOwnCoid(o.clientOrderId, connId)) own.add(o.venueSymbol);
  for (const p of book.positions) if (recentEntrySyms.has(p.venueSymbol) && !book.orders.some((o) => o.venueSymbol === p.venueSymbol && !isOwnCoid(o.clientOrderId, connId))) own.add(p.venueSymbol);
  return own;
}

export interface BookView {
  positions: Array<{ symbol: string; venueSymbol: string; side: "long" | "short"; qty: number }>;
  orders: Array<{ id?: string; symbol: string; venueSymbol: string; clientOrderId?: string; positionSide?: "LONG" | "SHORT"; type?: string }>;
}

export interface LiveIntentLite {
  cfg: string;
  sym: string; // venue symbol, e.g. BTC-USDT
  side: 1 | -1;
  tp: number;
  sl: number;
  /** open time of the bar the signal was decided on (the symbol's own newest bar) */
  barT: number;
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
  for (const o of book.orders) if (!isOwnCoid(o.clientOrderId, settings.connId)) foreign.add(o.venueSymbol);
  for (const p of book.positions) if (!input.ownSyms.has(p.venueSymbol)) foreign.add(p.venueSymbol);
  let open = [...input.ownSyms].filter((s) => book.positions.some((p) => p.venueSymbol === s)).length;
  const entries: LiveIntentLite[] = [];
  const skipped: LivePlan["skipped"] = [];
  const seen = new Set<string>();
  for (const it of intents) {
    const key = `${it.cfg}|${it.sym}|${it.barT}`;
    if (input.sent.has(key)) continue;
    if (input.newestBarT !== undefined && it.barT < input.newestBarT) {
      skipped.push({ sym: it.sym, why: "stale signal (symbol not updated)" });
      continue;
    }
    if (foreign.has(it.sym)) {
      skipped.push({ sym: it.sym, why: "foreign position/order on symbol" });
      continue;
    }
    if (input.ownSyms.has(it.sym) || seen.has(it.sym)) {
      skipped.push({ sym: it.sym, why: "already holding symbol" });
      continue;
    }
    if (open >= settings.maxPositions) {
      skipped.push({ sym: it.sym, why: "max positions" });
      continue;
    }
    seen.add(it.sym);
    entries.push(it);
    open++;
  }
  return { enabled: true, reason: "armed", entries, skipped };
}

// ── Overall control orders ─────────────────────────────────────────────────────
// Every lane (bot × indication × protect × sub-strategy) that holds a paper position contributes to ONE control
// position per (symbol, direction). The planner compares that target with the exchange position and emits the
// minimal actions: open, increase, reduce, close. Opposite directions on a symbol are separate positions (hedge
// mode). Nothing on a symbol with foreign positions / orders is ever touched.

export interface ControlContribution {
  cfg: string;
  sym: string;
  side: 1 | -1;
  /** Block volume multiple of this lane's position (1 = plain) */
  vol: number;
  /** stop distance of the lane's protect (fraction) */
  sl: number;
}

export interface ControlTarget {
  key: string; // `${sym}|${side}`
  sym: string;
  side: 1 | -1;
  lanes: number;
  vol: number;
  notional: number;
  qty: number;
  /** catastrophic stop distance for the control position (widest lane stop × 1.2, 1 %…20 %) */
  stopDist: number;
}

export type ControlAction =
  | { kind: "open"; key: string; sym: string; side: 1 | -1; qty: number; stopDist: number }
  | { kind: "increase"; key: string; sym: string; side: 1 | -1; qty: number }
  | { kind: "reduce"; key: string; sym: string; side: 1 | -1; qty: number }
  | { kind: "close"; key: string; sym: string; side: 1 | -1; qty: number };

export interface ControlSettings {
  notionalUsd: number;
  /** control volume per contributing lane volume unit */
  ratio: number;
  /** cap per (symbol, direction) position, USD */
  maxNotionalUsd: number;
  /** max simultaneous control positions */
  maxPositions: number;
  /** only adjust an existing position when the target differs by more than this share */
  rebalancePct: number;
}

export interface ControlPlan {
  targets: ControlTarget[];
  actions: ControlAction[];
  skipped: Array<{ sym: string; why: string }>;
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
  snap: (sym: string, qty: number) => number = (_s, q) => q,
): { targets: ControlTarget[]; skipped: ControlPlan["skipped"] } {
  const agg = new Map<string, { sym: string; side: 1 | -1; lanes: number; vol: number; sl: number }>();
  for (const l of lanes) {
    const key = `${l.sym}|${l.side}`;
    const a = agg.get(key) ?? { sym: l.sym, side: l.side, lanes: 0, vol: 0, sl: 0 };
    a.lanes++;
    a.vol += Math.max(0, l.vol);
    a.sl = Math.max(a.sl, l.sl);
    agg.set(key, a);
  }
  const targets: ControlTarget[] = [];
  const skipped: ControlPlan["skipped"] = [];
  // strongest first, so the position cap keeps the best-supported positions
  for (const [key, a] of [...agg.entries()].sort((x, y) => y[1].vol - x[1].vol || (x[0] < y[0] ? -1 : 1))) {
    const px = prices.get(a.sym) ?? 0;
    if (!(px > 0)) {
      skipped.push({ sym: a.sym, why: "no fresh price" });
      continue;
    }
    if (targets.length >= cs.maxPositions) {
      skipped.push({ sym: a.sym, why: "max control positions" });
      continue;
    }
    const notional = Math.min(cs.maxNotionalUsd, cs.notionalUsd * a.vol * cs.ratio);
    const qty = snap(a.sym, notional / px);
    if (!(qty > 0)) {
      skipped.push({ sym: a.sym, why: "size rounds to zero" });
      continue;
    }
    targets.push({ key, sym: a.sym, side: a.side, lanes: a.lanes, vol: a.vol, notional: qty * px, qty, stopDist: Math.min(0.2, Math.max(0.01, a.sl * 1.2)) });
  }
  return { targets, skipped };
}

/**
 * Minimal actions that bring the own control positions to the targets.
 * `held` = own positions per key (sym|side → qty). `foreign` = symbols that must not be touched.
 */
export function planControl(input: {
  targets: readonly ControlTarget[];
  held: ReadonlyMap<string, number>;
  foreign: ReadonlySet<string>;
  rebalancePct: number;
  bookParts?: readonly string[];
}): ControlPlan {
  const actions: ControlAction[] = [];
  const skipped: ControlPlan["skipped"] = [];
  const tmap = new Map(input.targets.map((t) => [t.key, t]));
  const keys = [...new Set([...tmap.keys(), ...input.held.keys()])].sort();
  for (const key of keys) {
    const [sym, s] = key.split("|");
    const side = (Number(s) === 1 ? 1 : -1) as 1 | -1;
    if (input.foreign.has(sym)) {
      skipped.push({ sym, why: "foreign position/order on symbol" });
      continue;
    }
    const t = tmap.get(key);
    const have = input.held.get(key) ?? 0;
    const want = t?.qty ?? 0;
    if (want <= 0 && have > 0) actions.push({ kind: "close", key, sym, side, qty: have });
    else if (want > 0 && have <= 0) actions.push({ kind: "open", key, sym, side, qty: want, stopDist: t!.stopDist });
    else if (want > 0 && have > 0) {
      const diff = want - have;
      // measured against the target: the held size stays within ±rebalancePct of what the lanes ask for
      if (Math.abs(diff) / want <= input.rebalancePct) continue;
      actions.push(diff > 0 ? { kind: "increase", key, sym, side, qty: diff } : { kind: "reduce", key, sym, side, qty: -diff });
    }
  }
  const targetsHash = stateHash(input.targets.map((t) => `${t.key}:${t.qty}`));
  const bookHash = stateHash(input.bookParts ?? [...input.held.entries()].sort().map(([k, q]) => `${k}:${q}`));
  return { targets: [...input.targets], actions, skipped, hashes: { targets: targetsHash, book: bookHash, plan: stateHash(actions.map((a) => `${a.kind}:${a.key}:${a.qty}`)) } };
}

/**
 * Ownership in Overall mode, restart-safe: a (symbol, direction) position is ours when an own-tagged order rests on
 * that symbol and position side (every control position carries an own protective stop), or when we just opened it
 * (`recent`). A symbol with any foreign order, or a position we do not own, is foreign and never touched.
 */
export function controlOwnership(book: BookView, connId: LiveSettings["connId"], recent: ReadonlySet<string>): { held: Map<string, number>; foreign: Set<string> } {
  const held = new Map<string, number>();
  const foreign = new Set<string>();
  for (const o of book.orders) if (!isOwnCoid(o.clientOrderId, connId)) foreign.add(o.venueSymbol);
  for (const p of book.positions) {
    const side = p.side === "long" ? 1 : -1;
    const key = `${p.venueSymbol}|${side}`;
    const ps = p.side === "long" ? "LONG" : "SHORT";
    const tagged = book.orders.some((o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, connId) && (!o.positionSide || o.positionSide === ps));
    if (tagged || recent.has(key)) held.set(key, (held.get(key) ?? 0) + p.qty);
    else foreign.add(p.venueSymbol);
  }
  for (const k of [...held.keys()]) if (foreign.has(k.split("|")[0])) held.delete(k);
  return { held, foreign };
}
