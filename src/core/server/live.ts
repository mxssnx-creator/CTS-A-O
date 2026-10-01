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
export const RANGE_COID: Record<RangeTag, "U" | "M" | "N" | "H"> = { mc: "U", mp: "M", mn: "N", sh: "H" };
export type EntryKind = "E" | "U" | "M" | "N" | "H";

export function entryCoidKind(cfg: string | undefined): EntryKind {
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
  }>;
  orders: Array<{
    id?: string;
    symbol: string;
    venueSymbol: string;
    clientOrderId?: string;
    positionSide?: "LONG" | "SHORT";
    type?: string;
  }>;
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
  let open = [...input.ownSyms].filter((s) =>
    book.positions.some((p) => p.venueSymbol === s),
  ).length;
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
    if (input.ownSyms.has(it.sym) || seen.has(it.sym)) {
      skipped.push({ sym: it.sym, why: "already holding symbol" });
      continue;
    }
    if (settings.maxPositions > 0 && open >= settings.maxPositions) {
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
  /** identity of the lane order (cfg|sym|entryT) */
  id?: string;
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
  /** catastrophic stop distance for the control position (widest lane stop × 1.2, min stop … 20 %) */
  stopDist: number;
  /** the exchange minimum raised the order above the lanes' size */
  raised?: boolean;
  /** volume actually held in lane units (notional / (notionalUsd × ratio)) */
  volEff?: number;
  /** set when every contributing lane is the same tracked range ("|mp", "|mc", "|mn" or "|sh") */
  cfg?: string;
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
  /** oneway: one net position per symbol (long and short lanes offset each other) */
  positionMode?: "hedge" | "oneway";
}

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
    engine?: boolean;
    tag?: "" | RangeTag | "mix";
  };
  const note = (a: Agg, cfg: string) => {
    const tag = rangeOfId(cfg);
    a.tag = a.tag === undefined || a.tag === tag ? tag : "mix";
  };
  let agg = new Map<string, Agg>();
  for (const l of lanes) {
    const key = `${l.sym}|${l.side}`;
    const a = agg.get(key) ?? { sym: l.sym, side: l.side, lanes: 0, vol: 0, sl: 0 };
    note(a, l.cfg);
    // a position with any engine lane is an engine position; only signal lanes on it: a signal position
    if (!sigCfg(l.cfg)) a.engine = true;
    a.lanes++;
    a.vol += Math.max(0, l.vol);
    a.sl = Math.max(a.sl, l.sl);
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
      const tags = [L?.tag, S?.tag].filter((t) => t !== undefined);
      net.set(`${sym}|${side}`, {
        sym,
        side,
        lanes: (L?.lanes ?? 0) + (S?.lanes ?? 0),
        vol: Math.abs(v),
        sl: Math.max(L?.sl ?? 0, S?.sl ?? 0),
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
  // strongest first, so the position cap keeps the best-supported positions
  for (const [key, a] of [...agg.entries()].sort(
    (x, y) => y[1].vol - x[1].vol || (x[0] < y[0] ? -1 : 1),
  )) {
    const px = prices.get(a.sym) ?? 0;
    if (!(px > 0)) {
      // no price is no reason to close: a held position on this key stays as it is
      skipped.push({ sym: a.sym, why: "no fresh price", keep: key });
      continue;
    }
    // positions (symbol × direction) are capped per class: the engine's by maxPositions, the signals' by
    // signalMaxPositions (orders — the lane orders on a position — are not limited)
    const isSig = !a.engine;
    const cap = isSig ? (cs.signalMaxPositions ?? 0) : cs.maxPositions;
    if (cap > 0 && (isSig ? sigTargets : engTargets) >= cap) {
      skipped.push({
        sym: a.sym,
        why: isSig ? "max signal control positions" : "max control positions",
      });
      continue;
    }
    const notional = Math.min(cs.maxNotionalUsd, cs.notionalUsd * a.vol * cs.ratio);
    const sn = snap(a.sym, notional / px, px);
    const qty = typeof sn === "number" ? sn : sn.qty;
    const raised = typeof sn === "number" ? false : sn.raised;
    if (!(qty > 0)) {
      skipped.push({ sym: a.sym, why: "size rounds to zero" });
      continue;
    }
    // raised to the exchange minimum: never beyond the per-position cap
    if (raised && qty * px > cs.maxNotionalUsd * 1.0001) {
      skipped.push({
        sym: a.sym,
        why: `exchange minimum ${(qty * px).toFixed(2)} USD above the position cap`,
      });
      continue;
    }
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
      stopDist: Math.min(0.2, Math.max(cs.minStopPct ?? 0.01, a.sl * 1.2)),
      raised,
      // the volume actually held, in lane units (> vol when the exchange minimum raised the order)
      volEff: (qty * px) / Math.max(1e-9, cs.notionalUsd * cs.ratio),
    });
    if (isSig) sigTargets++;
    else engTargets++;
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
  /** keys whose target is unknown (no price, equity unknown): a held position there is neither closed nor resized */
  keep?: ReadonlySet<string>;
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
      // measured against the target: the held size stays within ±rebalancePct of what the lanes ask for
      if (Math.abs(diff) / want <= input.rebalancePct) continue;
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
 * (`recent`). A symbol with any foreign order, or a position we do not own, is foreign and never touched.
 */
export function controlOwnership(
  book: BookView,
  connId: LiveSettings["connId"],
  recent: ReadonlySet<string>,
): { held: Map<string, number>; foreign: Set<string> } {
  const held = new Map<string, number>();
  const foreign = new Set<string>();
  for (const o of book.orders) if (!isOwnCoid(o.clientOrderId, connId)) foreign.add(o.venueSymbol);
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
    if (tagged || recent.has(key)) held.set(key, (held.get(key) ?? 0) + p.qty);
    else foreign.add(p.venueSymbol);
  }
  for (const k of [...held.keys()]) if (foreign.has(k.split("|")[0])) held.delete(k);
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
  }
  return out;
}

/**
 * The quantity this system opened on a (symbol, direction) key: opens and increases minus reduces and closes, from
 * its own order ledger. When the exchange position is larger (someone else added to the same symbol and
 * direction, which merges into one position), only the own part is held: the excess is never reduced, closed or
 * rebalanced. No ledger entry (a lost database, an adopted position) leaves the exchange quantity as it is.
 */
export function capHeldToOwn(
  held: Map<string, number>,
  ledger: ReadonlyMap<string, number>,
  tolerance = 0.05,
): Array<{ key: string; exchange: number; own: number }> {
  const excess: Array<{ key: string; exchange: number; own: number }> = [];
  for (const [key, qty] of held) {
    const own = ledger.get(key);
    if (own === undefined || !(own > 0)) continue;
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
  /** lane order ids per control key at that step */
  lanes?: Record<string, string[]>;
}

export function externalCloses(
  prev: ControlMemory | null | undefined,
  held: ReadonlyMap<string, number>,
): Array<{ key: string; lanes: string[] }> {
  if (!prev) return [];
  // what we held AFTER the previous step: its starting book plus our successful opens / increases
  const had = new Set(prev.held.filter((h) => h.qty > 0).map((h) => h.key));
  for (const a of prev.actions)
    if (a.ok && (a.kind === "open" || a.kind === "increase")) had.add(a.key);
  const ours = new Set(
    prev.actions
      .filter((a) => a.ok && (a.kind === "close" || a.kind === "reduce"))
      .map((a) => a.key),
  );
  const out: Array<{ key: string; lanes: string[] }> = [];
  for (const key of had) {
    if ((held.get(key) ?? 0) > 0 || ours.has(key)) continue;
    out.push({ key, lanes: prev.lanes?.[key] ?? [] });
  }
  return out;
}

/** Lane order ids per control key (sym|side) of the contributions that are used. */
export function lanesByKey(contribs: readonly ControlContribution[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const c of contribs) if (c.id) (out[`${c.sym}|${c.side}`] ??= []).push(c.id);
  return out;
}
