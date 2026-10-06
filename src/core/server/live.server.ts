// Live stage executor (BingX perpetual swap, self-contained client in ../exchange). Own CTSB tags only, so other
// sessions on the same account (e.g. CTSA) never see these tickets as theirs and this adapter never touches theirs.
//
// Safety:
//  - one live step at a time (module mutex); abandoned when the runtime generation changes (stop / watchdog)
//  - every request has a timeout; an entry is recorded as `pending` BEFORE it is sent, so a hung / retried
//    cycle can never send the same intent twice
//  - size never exceeds the configured notional (entry skipped if the exchange minimum is larger)
//  - SL/TP are priced from a fresh ticker; if protection cannot be placed, the position is closed at market
//  - own stop/target orders left behind on a flat symbol are cancelled
import { sizingSettings, unitNotional } from "../sizing.ts";
import { createHash } from "node:crypto";
import { isSignalInd } from "../indications/registry.ts";
import { sigActiveKey } from "../signals.ts";
import { rangeOfId } from "../minimal-coord.ts";
import { kindOfId } from "../pipeline/pipeline.ts";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import type { CoreDb } from "./db.server.ts";
import * as bx from "../exchange/bingx.server.ts";
import type { LiveSettings } from "../config.ts";
import {
  controlOwnership,
  capHeldToOwn,
  ownLedger,
  controlTargets,
  externalCloses,
  isForeign,
  isOwnCoid,
  laneCountsByKey,
  liveNetwork,
  entryCoidKind,
  makeCoid,
  MIN_RAISE_X,
  ownSymbols,
  planControl,
  planLive,
  scaleToExposure,
  scaleToRisk,
  positionCapFor,
  topConfigLanes,
  stateHash,
  type BookView,
  type ControlAction,
  type ControlContribution,
  type ControlTarget,
} from "./live.ts";

/**
 * Whether live.excludeRanges leaves this lane's config out. A range is a target band of the engine's Normal and
 * Trailing configs: "wide" is the untagged default-protect grid. Signal configs, and the untagged Axis / DCA ladders,
 * carry no range tag either but are not the Wide grid — signals are narrowed by live.source, Axis / DCA by
 * live.kinds — so excluding "wide" never stops them (it did: x01's "wide" exclusion silenced every signal lane).
 */
export function rangeExcluded(cfg: string, exRanges: ReadonlySet<string>): boolean {
  const tag = rangeOfId(cfg);
  if (tag) return exRanges.has(tag);
  if (isSignalInd(cfg.split("|")[1] ?? "")) return false;
  const kind = kindOfId(cfg);
  if (kind !== "normal" && kind !== "trailing") return false;
  return exRanges.has("wide");
}

/**
 * What the operator lets reach the exchange, and which lanes ask for volume — shared by the live step and the
 * control preview. `sendable`: the strategy kinds of live.kinds (unset / empty = every kind), live.excludeRanges,
 * live.plainOnly (only lanes Block did not raise) and live.source. `validLane`: sendable, and a validated config —
 * an engine config of the current selection, or a signal active on its symbol (no selection yet = every lane).
 */
export function liveLaneFilter(
  s: Pick<LiveSettings, "kinds" | "source" | "excludeRanges" | "plainOnly">,
  selected: ReadonlySet<string> | null,
  sigActive: { has(k: string): boolean } | null | undefined,
): {
  sendable: (l: Pick<ControlContribution, "cfg" | "vol">) => boolean;
  validLane: (l: Pick<ControlContribution, "cfg" | "vol" | "sym" | "side">) => boolean;
} {
  const liveKinds = s.kinds?.length ? new Set<string>(s.kinds) : null;
  const src = s.source ?? "all";
  // ranges left out of live ("wide" = the default-protect grid, whose id carries no range tag)
  const exRanges = s.excludeRanges?.length ? new Set<string>(s.excludeRanges) : null;
  const sendable = (l: Pick<ControlContribution, "cfg" | "vol">) => {
    if (liveKinds && !liveKinds.has(kindOfId(l.cfg))) return false;
    if (exRanges && rangeExcluded(l.cfg, exRanges)) return false;
    if (s.plainOnly && (l.vol ?? 1) > 1 + 1e-9) return false;
    if (src !== "all" && isSignalInd(l.cfg.split("|")[1] ?? "") !== (src === "signals")) return false;
    return true;
  };
  const validLane = (l: Pick<ControlContribution, "cfg" | "vol" | "sym" | "side">) => {
    if (!sendable(l)) return false;
    if (!selected) return true;
    const [bot, ind] = l.cfg.split("|");
    // the active signal set is keyed per side: a source's longs and shorts are activated on their own records
    return isSignalInd(ind ?? "")
      ? !sigActive || sigActive.has(sigActiveKey(bot, ind ?? "", l.sym, l.side))
      : selected.has(l.cfg);
  };
  return { sendable, validLane };
}

/** Everything the executor needs from an exchange. The default is BingX; tests inject a simulated exchange. */
export interface ExchangeClient {
  hasKeys(): boolean;
  /** identity of the connection: conn id, network, host and a one-way fingerprint of the API key (never the key) */
  fingerprint(): string;
  /** `fresh`: a book shared with other processes is only reused when read after `notBefore` and within `maxAgeMs` */
  book(fresh?: { notBefore: number; maxAgeMs: number }): Promise<BookView>;
  contracts(): Promise<Map<string, bx.ContractSpec>>;
  order(p: Record<string, string | number>): Promise<unknown>;
  cancel(venueSymbol: string, orderId: string): Promise<boolean>;
  setPositionMode?(mode: "hedge" | "oneway"): Promise<void>;
  setMarginMode?(venueSymbol: string, mode: "cross" | "isolated"): Promise<void>;
  /** current and maximum leverage of a symbol (absent on a simulated exchange) */
  leverage?(venueSymbol: string): Promise<bx.LeverageInfo | null>;
  setLeverage?(
    venueSymbol: string,
    side: "LONG" | "SHORT" | "BOTH",
    leverage: number,
  ): Promise<void>;
  /** account equity (USDT) for fixed-%-of-equity sizing; absent / null = use the paper balance */
  equity?(): Promise<number | null>;
  /** balance snapshot (open PnL, realized, margin); absent on a simulated exchange */
  account?(): Promise<bx.AccountSnapshot | null>;
}

/**
 * Fill price / commission / executed quantity from an order reply (BingX: data.order.{avgPrice, commission,
 * executedQty}); null when the reply carries no fill price. `qty` is 0 when the reply does not say how much
 * executed — the caller then keeps the quantity it sent (what the exchange accepted in full).
 */
export function parseFill(resp: unknown): { px: number; fee: number; qty: number } | null {
  const o = ((resp as { order?: unknown })?.order ?? resp) as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const px = Number(o.avgPrice ?? o.price ?? 0);
  const fee = Math.abs(Number(o.commission ?? o.fee ?? 0)) || 0;
  const q = Number(o.executedQty ?? o.executedVolume ?? 0);
  return px > 0 ? { px, fee, qty: Number.isFinite(q) && q > 0 ? q : 0 } : null;
}

/**
 * What the exchange really executed of an order we sent: the reply's executed quantity when it names one (a
 * partial fill), else the quantity sent. Never more than sent — the ledger must not count what we do not hold.
 */
export function executedQty(resp: unknown, sentQty: number): number {
  const f = parseFill(resp);
  return f && f.qty > 0 ? Math.min(sentQty, f.qty) : sentQty;
}

/** isolated margin: leverage at most this, so liquidation (≈ 1 / leverage away) stays behind the widest stop (20 %) */
export const ISOLATED_MAX_LEVERAGE = 4;

/** "already in that mode" replies are success */
const alreadySet = (msg: string) => /no need|already|not modified|same|repeat/i.test(msg);

/**
 * The exchange book is re-read over REST at most every `syncMs` (the live step runs every tick, 100 ms); an own
 * order or cancel forces the next read, so decisions never act on a book that predates our own change.
 * Contract specs change rarely: cached 10 minutes.
 */
const bookCache = new Map<
  string,
  { at: number; book: BookView; dirty: boolean; touchedAt: number }
>();
const contractCache = new Map<string, { at: number; specs: Map<string, bx.ContractSpec> }>();
const accountCache = new Map<string, { at: number; snap: bx.AccountSnapshot | null }>();
/** the account balance (sizing, status) is re-read at most once a minute */
const ACCOUNT_MS = 60_000;
export function cachedClient(ex: ExchangeClient, syncMs: number): ExchangeClient {
  const key = () => ex.fingerprint();
  const touch = () => {
    const c = bookCache.get(key());
    if (c) {
      c.dirty = true;
      c.touchedAt = Date.now();
    }
  };
  return {
    ...ex,
    book: async () => {
      const c = bookCache.get(key());
      if (c && !c.dirty && Date.now() - c.at < syncMs) return c.book;
      // a book another process read is fine when it was read after our own last order or cancel
      const touchedAt = c?.touchedAt ?? 0;
      const book = await ex.book({ notBefore: touchedAt, maxAgeMs: syncMs });
      bookCache.set(key(), { at: Date.now(), book, dirty: false, touchedAt });
      return book;
    },
    ...(ex.account
      ? {
          account: async () => {
            const c = accountCache.get(key());
            if (c && Date.now() - c.at < ACCOUNT_MS) return c.snap;
            const snap = await ex.account!();
            accountCache.set(key(), { at: Date.now(), snap });
            return snap;
          },
        }
      : {}),
    contracts: async () => {
      const c = contractCache.get(key());
      if (c && Date.now() - c.at < 600_000) return c.specs;
      const specs = await ex.contracts();
      // an empty list is an outage (every host failed), not "no contracts": never cached, the last good list serves
      if (specs.size) contractCache.set(key(), { at: Date.now(), specs });
      else if (c) return c.specs;
      return specs;
    },
    order: async (p) => {
      touch();
      try {
        return await ex.order(p);
      } finally {
        touch();
      }
    },
    cancel: async (sym, id) => {
      touch();
      try {
        return await ex.cancel(sym, id);
      } finally {
        touch();
      }
    },
  };
}

export function bingxClient(connId: LiveSettings["connId"]): ExchangeClient {
  const network = liveNetwork(connId);
  return {
    hasKeys: () => {
      const k = bx.keysFor(connId);
      return !!(k.apiKey && k.secret);
    },
    fingerprint: () => {
      const k = bx.keysFor(connId).apiKey;
      const fp = k ? createHash("sha256").update(k).digest("hex").slice(0, 10) : "nokey";
      return `${connId}|${network}|${bx.HOSTS[network][0]}|${fp}`;
    },
    book: (fresh) => bx.fetchBook(network, connId, fresh),
    contracts: () => bx.fetchContracts(network),
    order: (p) => bx.signed(network, connId, "POST", "/openApi/swap/v2/trade/order", p),
    cancel: (sym, id) => bx.cancelOrder(network, connId, sym, id),
    setPositionMode: (mode) => bx.setPositionMode(network, connId, mode),
    setMarginMode: (sym, mode) => bx.setMarginMode(network, connId, sym, mode),
    leverage: (sym) => bx.fetchLeverage(network, connId, sym),
    setLeverage: (sym, side, lev) => bx.setLeverage(network, connId, sym, side, lev),
    equity: () => bx.fetchEquity(network, connId),
    account: () => bx.fetchAccount(network, connId),
  };
}

/**
 * Notional of one live order unit: fixed % of the account equity (read at most every 30 s; a failed read keeps the
 * last known equity), or the fixed notional. null in the %-of-equity mode while the equity is unknown (never read,
 * or the exchange reports none): nothing opens or grows then — never sized from the paper balance on a real
 * account. A client without an equity read (paper / simulated exchange) sizes from the paper balance.
 * The per-position cap (maxNotionalUsd) still applies.
 */
const equityCache = new Map<string, { at: number; eq: number | null }>();
export async function liveUnit(rt: CoreRuntime, ex: ExchangeClient): Promise<number | null> {
  const s = rt.settings.live;
  const sz = sizingSettings(rt.settings.sizing);
  if (sz.mode !== "equityPct") return s.notionalUsd;
  if (!ex.equity) return unitNotional(sz, rt.settings.paperBalance, s.notionalUsd);
  const k = ex.fingerprint();
  let c = equityCache.get(k);
  if (!c || Date.now() - c.at > 30_000) {
    let eq: number | null = null;
    try {
      eq = (await ex.equity()) ?? null;
    } catch {
      eq = c?.eq ?? null; // keep the last known equity through a failed read
    }
    c = { at: Date.now(), eq };
    equityCache.set(k, c);
  }
  return c.eq === null ? null : unitNotional(sz, c.eq, s.notionalUsd);
}

/**
 * The unit the control preview shows: the last equity read for the connection (no exchange call), else the paper
 * balance; minimum-quantity sizing sizes each symbol at its exchange minimum lot (`unit` is then only the fallback).
 * `equity`: the last equity read of the connection (null before the first one).
 */
export function liveUnitPeek(rt: CoreRuntime): {
  unit: number;
  from: "equity" | "paper" | "fixed" | "minQty";
  equity: number | null;
} {
  const s = rt.settings.live;
  const sz = sizingSettings(rt.settings.sizing);
  let equity: number | null = null;
  for (const [k, c] of equityCache)
    if (k.startsWith(`${s.connId}|`) && c.eq !== null) {
      equity = c.eq;
      break;
    }
  if (sz.mode === "minQty") return { unit: s.notionalUsd, from: "minQty", equity };
  if (sz.mode !== "equityPct") return { unit: s.notionalUsd, from: "fixed", equity };
  if (equity !== null) return { unit: unitNotional(sz, equity, s.notionalUsd), from: "equity", equity };
  return { unit: unitNotional(sz, rt.settings.paperBalance, s.notionalUsd), from: "paper", equity };
}

/** The control sizing of the live settings for one lane unit — shared by the live step and the preview. */
/** The per-position notional cap: 0 = none (volume from the factors and relations alone). */
export function positionCapOf(s: Pick<LiveSettings, "maxNotionalUsd" | "notionalUsd">): number {
  return s.maxNotionalUsd === 0 ? Infinity : (s.maxNotionalUsd ?? s.notionalUsd * 5);
}

export function controlSettingsOf(s: LiveSettings, unit: number, signalMaxPositions = 0) {
  return {
    notionalUsd: unit,
    ratio: s.ratio ?? 1,
    signalWeight: s.signalWeight ?? 1,
    maxNotionalUsd: positionCapOf(s),
    maxPositions: s.maxPositions,
    signalMaxPositions,
    rebalancePct: s.rebalancePct ?? 0.25,
    positionMode: s.positionMode ?? "hedge",
    minStopPct: s.minStopPct ?? 0.01,
  } as const;
}

// ── failure backoff ────────────────────────────────────────────────────────────────────────────────────────
// A request the exchange refuses (or that times out) is not re-sent on the next 100 ms tick: each key waits
// base × 2^(failures − 1), up to max. Success clears it. Opens after a protective close wait the same way, so a
// stop the exchange keeps refusing never turns into buy-sell-repeat.
const backoff = new Map<string, { n: number; until: number; msg: string }>();
/**
 * Live state of ONE runtime (one connection): the serialised step chain, the entries already sent, the last
 * entries-mode status and the warnings already reported. Each connection's runtime has its own, so parallel
 * connections never wait on each other's steps or suppress each other's entries.
 */
interface LiveLocal {
  running: Promise<unknown> | null;
  /** the live epoch of the step `running` belongs to: a step of an older (abandoned) epoch holds up nothing */
  runningEpoch?: number;
  lastEntries: { at: number; status: LiveStatus } | null;
  /** entry keys already recorded (sent or tried): an intent stays pending for its whole bar but is sent once */
  entriesSent: Set<string>;
  /** foreign excess already reported (one event per position size) */
  warnedExcess: Set<string>;
  rateLimitLogged: number;
  /** margin of own opens the account snapshot may not show yet (free-margin floor): USDT, time */
  marginSpent: Array<{ at: number; usd: number }>;
  /** leverage in force per symbol × side (LONG / SHORT / BOTH), as set or read */
  levVal: Map<string, number>;
  /**
   * the control rows of live_orders in memory (coid → row, in write order like ORDER BY at, rowid): the
   * own-quantity ledger is rebuilt from them every step without a SQL read per tick; re-read from the table
   * every minute (the trim drops only rows before a flat marker, which never change the ledger)
   */
  ctl: { at: number; rows: Map<string, ControlRow> } | null;
  /** last backstop re-pricing per control key (RESTOP_MIN_MS apart) */
  restopAt: Map<string, number>;
  /** last "volume factor has no effect" warning (at most hourly) */
  sizingWarnAt: number;
  /**
   * keys whose open the free-margin floor refused moments ago (until when, why): left out of the targets before the
   * position cap for FLOOR_WAIT_MS, so the slot goes to the next (possibly smaller) target
   */
  floorRefused: Map<string, { until: number; msg: string }>;
  /**
   * minimums the VENUE itself named, per symbol: `qty` in base units ("The minimum order amount is 476.53 SOLV"),
   * `stop` as a stop distance fraction that was refused for being too close. Our contract snapshot can sit a hair
   * under the live minimum, and a minimum learned once must not be re-learned by paying another rejection, so these
   * are loaded from `controlVenueMin` on first use and written back whenever one changes.
   */
  venueMin: Map<string, { qty?: number; stop?: number }> | null;
}
export interface ControlRow {
  k: string;
  kind: string;
  status: string;
  qty: number;
  /** order price (a stop row: its stop price) */
  px?: number;
  at: number;
}
const CTL_RELOAD_MS = 60_000;
/** The control rows (memory mirror of live_orders, re-read every minute). */
export function controlRows(rt: { db: CoreDb }): Map<string, ControlRow> {
  const L = local(rt);
  if (!L.ctl || Date.now() - L.ctl.at > CTL_RELOAD_MS) {
    const rows = new Map<string, ControlRow>();
    for (const r of rt.db.all<ControlRow & { coid: string }>(
      "SELECT coid, substr(cfg, 9) AS k, kind, status, qty, px, at FROM live_orders WHERE cfg LIKE 'control|%' ORDER BY at, rowid",
    ))
      rows.set(r.coid, { k: r.k, kind: r.kind, status: r.status, qty: r.qty, px: r.px, at: r.at });
    L.ctl = { at: Date.now(), rows };
  }
  return L.ctl.rows;
}
/** A control row written: the mirror follows the table (INSERT OR REPLACE moves the row to the end). */
function noteControlRow(rt: { db: CoreDb }, coid: string, row: ControlRow) {
  const L = local(rt);
  if (!L.ctl) return;
  L.ctl.rows.delete(coid);
  L.ctl.rows.set(coid, row);
}
const locals = new WeakMap<object, LiveLocal>();
const allLocals = new Set<LiveLocal>();
function local(rt: object): LiveLocal {
  let l = locals.get(rt);
  if (!l) {
    l = {
      running: null,
      lastEntries: null,
      entriesSent: new Set(),
      warnedExcess: new Set(),
      rateLimitLogged: 0,
      marginSpent: [],
      levVal: new Map(),
      ctl: null,
      restopAt: new Map(),
      sizingWarnAt: 0,
      floorRefused: new Map(),
      venueMin: null,
    };
    locals.set(rt, l);
    allLocals.add(l);
  }
  return l;
}
/**
 * The minimums the venue has named for a symbol, as a map that is read from `controlVenueMin` once per process and
 * written back on every change. Learning them matters because each one was paid for with a rejected order.
 */
function venueMins(rt: { db: CoreDb }): Map<string, { qty?: number; stop?: number }> {
  const L = local(rt);
  if (!L.venueMin) {
    L.venueMin = new Map();
    const kv = liveKv<Record<string, { qty?: number; stop?: number }>>(rt.db, "controlVenueMin");
    if (kv && typeof kv === "object") for (const [k, v] of Object.entries(kv)) L.venueMin.set(k, v);
  }
  return L.venueMin;
}
/** The quantity minimum the venue has named for a symbol (0 = none learned): every sizing snap floors at it. */
export function venueMinQty(rt: { db: CoreDb }, sym: string): number {
  return venueMins(rt).get(sym)?.qty ?? 0;
}
/** Remember a minimum the venue named. Only ever raises: a minimum is not forgotten because one order was smaller. */
function learnVenueMin(rt: { db: CoreDb }, sym: string, what: "qty" | "stop", v: number) {
  if (!(v > 0)) return;
  const m = venueMins(rt);
  const cur = m.get(sym) ?? {};
  if ((cur[what] ?? 0) >= v) return;
  m.set(sym, { ...cur, [what]: v });
  liveKvSet(rt.db, "controlVenueMin", Object.fromEntries(m));
  rt.db.event("info", `live: ${sym} venue minimum ${what} learned: ${v} (from the exchange's own refusal)`);
}

function waiting(k: string): string | null {
  const b = backoff.get(k);
  return b && Date.now() < b.until ? b.msg : null;
}
function failed(k: string, msg: string, baseMs: number, maxMs: number) {
  const n = (backoff.get(k)?.n ?? 0) + 1;
  backoff.set(k, { n, until: Date.now() + Math.min(maxMs, baseMs * 2 ** (n - 1)), msg });
}
const cleared = (k: string) => backoff.delete(k);
/** tests: forget every backoff */
export function resetLiveBackoff() {
  backoff.clear();
  equityCache.clear();
  for (const l of allLocals) {
    l.entriesSent.clear();
    l.rateLimitLogged = 0;
    l.lastEntries = null;
    l.restopAt.clear();
    l.floorRefused.clear();
  }
  bx.clearRateLimit();
}
const OPEN_BACKOFF = [60_000, 30 * 60_000] as const;
/** an own open this recent that the position read does not show yet is held-unknown (the read lags) */
const LAG_MS = 15_000;
/** lane orders held back after an exchange stop fill count again after this at the latest */
const SUPPRESS_MAX_MS = 60 * 60_000;
/** a backstop is re-priced at most this often per position (a price wiggling at the band edge never churns it) */
const RESTOP_MIN_MS = 60_000;
/** backstop re-pricing band, in shares of the target stop distance: tighter by more / wider by more → re-placed */
const RESTOP_INSIDE = 0.05;
const RESTOP_BEYOND = 0.25;
const EXIT_BACKOFF = [5_000, 60_000] as const;
/** a key the free-margin floor refused stays out of the targets this long (its slot goes to the next target) */
const FLOOR_WAIT_MS = 60_000;
/** an action held back by a condition that clears by itself (not a failure: no backoff, no error event) */
const holdOn = (msg: string) => Object.assign(new Error(msg), { hold: true });
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export interface ControlStatus {
  at: number;
  connHash: string;
  targetsHash: string;
  bookHash: string;
  planHash: string;
  /** set when the connection identity changed since the previous step (keys rotated, other account / network) */
  reconnected: boolean;
  /** the targets and the book were unchanged since the last successful step: nothing sent */
  unchanged: boolean;
  steps: number;
  changes: number;
  targets: ControlTarget[];
  held: Array<{ key: string; qty: number }>;
  actions: Array<ControlAction & { ok: boolean; msg?: string }>;
  /** lane orders per control key (reported with a position closed outside this system) */
  laneCounts?: Record<string, number>;
  /** (older states: the lane order ids themselves) */
  lanes?: Record<string, string[]>;
  /**
   * lane orders held back after their position was closed by its exchange stop (no reopen until each exits, at most
   * SUPPRESS_MAX_MS); a manual close does not hold anything back
   */
  suppressed?: number;
  /** lane orders the live kind list / plain-only filter does not send to the exchange (they keep paper-trading) */
  notSent?: number;
}

export interface LiveAccount {
  /** unrealized PnL of the positions actually open, USDT */
  openNet: number;
  /** margin those positions are using, USDT */
  margin: number;
  /** realized + open, USDT; null until a balance read */
  overall: number | null;
  positions: number;
  orders: number;
  at: number;
}

export function liveAccount(book: BookView, snap: bx.AccountSnapshot | null): LiveAccount {
  let openNet = 0;
  let margin = 0;
  for (const p of book.positions) {
    openNet += p.upnl ?? 0;
    margin += p.margin ?? 0;
  }
  if (snap) {
    openNet = snap.unrealized;
    margin = snap.usedMargin;
  }
  return {
    openNet,
    margin,
    overall: snap ? snap.realized + snap.unrealized : null,
    positions: book.positions.length,
    orders: book.orders.length,
    at: Date.now(),
  };
}

async function stampAccount(
  status: LiveStatus,
  ex: ExchangeClient,
  book: BookView,
): Promise<bx.AccountSnapshot | null> {
  let snap: bx.AccountSnapshot | null = null;
  if (ex.account) {
    try {
      snap = await ex.account();
    } catch {
      /* the position sums still describe the open book */
    }
  }
  status.account = liveAccount(book, snap);
  return snap;
}

export interface LiveStatus {
  at: number;
  enabled: boolean;
  reason: string;
  placed: number;
  closed: number;
  cancelled: number;
  skipped: Array<{ sym: string; why: string }>;
  error: string | null;
  mode?: "overall" | "entries";
  control?: ControlStatus;
  account?: LiveAccount;
}

/** Serialised entry point (per runtime): overlapping calls wait for that runtime's running step instead of racing it. */
export function stepLive(
  rt: CoreRuntime,
  intents: LiveIntent[],
  gen: number,
  client?: ExchangeClient,
): Promise<LiveStatus> {
  // the live state is persisted at most once a second: the runtime flushes it on shutdown
  rt.flushLive ??= () => flushLiveKv(rt.db);
  const L = local(rt);
  // steps never overlap — except behind a step the watchdog abandoned (its epoch is gone): that one may never return
  // (an await without its own limit), and every later step queued behind it would wait forever ("waiting on: start");
  // it checks alive() before every order, so it sends nothing more and the new step runs at once
  const epoch = rt.liveEpoch ?? 0;
  const prev = L.running && L.runningEpoch === epoch ? L.running : Promise.resolve(null);
  const next: Promise<LiveStatus> = prev.then(() =>
    (rt.settings.live.mode ?? "overall") === "overall"
      ? runControl(
          rt,
          gen,
          client ??
            cachedClient(bingxClient(rt.settings.live.connId), rt.settings.live.syncMs ?? 1000),
        )
      : runStep(rt, intents, gen),
  );
  // the chain itself never rejects (callers get `next`, which may); no unhandled rejection can end the process
  const tail: Promise<unknown> = next
    .then(
      () => undefined,
      () => undefined,
    )
    .finally(() => {
      if (L.running === tail) L.running = null;
    });
  L.running = tail;
  L.runningEpoch = epoch;
  return next;
}

const intentKey = (i: { cfg: string; sym: string; barT: number }) => `${i.cfg}|${i.sym}|${i.barT}`;

async function runStep(rt: CoreRuntime, intents: LiveIntent[], gen: number): Promise<LiveStatus> {
  const s = rt.settings.live;
  // entries mode reads the book over REST: with nothing new to send it runs at most every syncMs, not every tick
  const L = local(rt);
  const fresh = intents.filter((i) => !L.entriesSent.has(intentKey(i)));
  if (!fresh.length && L.lastEntries && Date.now() - L.lastEntries.at < (s.syncMs ?? 1000))
    return L.lastEntries.status;
  const st = await runStepNow(rt, intents, gen);
  L.lastEntries = { at: Date.now(), status: st };
  return st;
}

async function runStepNow(
  rt: CoreRuntime,
  intents: LiveIntent[],
  gen: number,
): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = {
    at: Date.now(),
    enabled: false,
    reason: "",
    placed: 0,
    closed: 0,
    cancelled: 0,
    skipped: [],
    error: null,
  };
  // the step's epoch: abandoned by the watchdog (stuck too long), it sends nothing more
  const epoch = rt.liveEpoch ?? 0;
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch;
  const phase = (p: string) => {
    if (alive()) rt.livePhase = p;
  };
  const record = (
    coid: string,
    cfg: string,
    sym: string,
    side: number,
    kind: string,
    qty: number,
    px: number,
    st: string,
    key: string,
  ) =>
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      cfg,
      sym,
      side,
      kind,
      qty,
      px,
      st,
      key,
      Date.now(),
    );
  try {
    const network = liveNetwork(s.connId);
    // one-way accounts: one BOTH position per symbol, exits reduce-only (hedge: LONG / SHORT sides)
    const oneway = (s.positionMode ?? "hedge") === "oneway";
    const reduceOnly: Record<string, string> = oneway ? { reduceOnly: "true" } : {};
    const keys = bx.keysFor(s.connId);
    const hasKeys = !!(keys.apiKey && keys.secret);
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    let book: BookView | null = null;
    if (s.enabled && envArmed && hasKeys) {
      try {
        book = await bx.fetchBook(network, s.connId);
        await stampAccount(status, bingxClient(s.connId), book);
      } catch (err) {
        rt.db.event("warn", `live book: ${err instanceof Error ? err.message : err}`);
      }
    }
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    const ready = !sim
      ? { ok: false, why: "no simulated run yet" }
      : s.requireReady === false
        ? { ok: true, why: "" }
        : sim.stats.pf < minPf || !sim.stable
          ? {
              ok: false,
              why: `simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}`,
            }
          : { ok: true, why: "" };
    const dayAgo = Date.now() - 24 * 3_600_000;
    const recent = new Set(
      rt.db
        .all<{ sym: string }>(
          "SELECT DISTINCT sym FROM live_orders WHERE kind = 'E' AND status IN ('ok', 'pending') AND at > ?",
          dayAgo,
        )
        .map((r) => r.sym),
    );
    const own = book ? ownSymbols(book, s.connId, recent) : new Set<string>();
    // the (symbol, side) keys of those recent own entries: in hedge mode a position is only ours to protect on a side
    // we entered — the other side of an own symbol may be someone else's
    const recentKeys = new Set(
      rt.db
        .all<{ sym: string; side: number }>(
          "SELECT DISTINCT sym, side FROM live_orders WHERE kind = 'E' AND status IN ('ok', 'pending') AND at > ?",
          dayAgo,
        )
        .map((r) => `${r.sym}|${Number(r.side) === 1 ? 1 : -1}`),
    );
    // every intent ever recorded (pending, ok or error) is never sent again
    const sent = new Set(
      rt.db.all<{ k: string }>("SELECT msg AS k FROM live_orders WHERE kind = 'E'").map((r) => r.k),
    );
    const L = local(rt);
    for (const i of intents) if (sent.has(intentKey(i))) L.entriesSent.add(intentKey(i));
    if (L.entriesSent.size > 20_000) L.entriesSent.clear();
    const plan = planLive({
      ready,
      settings: s,
      envArmed,
      hasKeys,
      book,
      ownSyms: own,
      sent,
      newestBarT: rt.status.lastBarT,
      intents: intents.map((i) => ({
        cfg: i.cfg,
        sym: i.sym,
        side: i.side,
        tp: i.protect.tp,
        // never a stop closer than the minimum (a lane's scaled stop on 1m can be a fraction of a percent)
        sl: Math.max(i.protect.sl, s.minStopPct ?? 0.01),
        barT: i.barT,
        managed: i.protect.trail > 0 || (i.kind !== undefined && i.kind !== "normal"),
      })),
    });
    status.enabled = plan.enabled;
    status.reason = plan.reason;
    status.skipped = plan.skipped;
    if (!plan.enabled || !book) return status;

    // an own order belongs to the position on its position side (hedge mode); one without a side, or in one-way
    // mode, to the symbol's position
    const sameSide = (o: { positionSide?: "LONG" | "SHORT" }, p: { side: "long" | "short" }) =>
      oneway || !o.positionSide || (o.positionSide === "LONG") === (p.side === "long");
    // clean-up: own stop/target orders on a (symbol, side) that is flat now
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId)) continue;
      if (!o.id || book.positions.some((p) => p.venueSymbol === o.venueSymbol && sameSide(o, p))) continue;
      if (await bx.cancelOrder(network, s.connId, o.venueSymbol, o.id)) status.cancelled++;
    }

    // protection pass: an own position without own stop (e.g. an entry whose reply timed out) gets a
    // protective close at market — entries mode never leaves a position unprotected across steps
    for (const p of book.positions) {
      if (!alive()) break;
      if (!own.has(p.venueSymbol)) continue;
      // protected only by an own order on THIS position's side: a stop on the other side does not cover it. A side
      // without an own order that we did not enter recently is not ours (hedge mode): never closed here.
      if (!oneway && !recentKeys.has(`${p.venueSymbol}|${p.side === "long" ? 1 : -1}`)) continue;
      if (
        book.orders.some(
          (o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, s.connId) && sameSide(o, p),
        )
      )
        continue;
      const c = makeCoid(s.connId, "C");
      try {
        await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
          symbol: p.venueSymbol,
          side: p.side === "long" ? "SELL" : "BUY",
          positionSide: oneway ? "BOTH" : p.side === "long" ? "LONG" : "SHORT",
          type: "MARKET",
          quantity: p.qty,
          clientOrderID: c,
          ...reduceOnly,
        });
        record(
          c,
          "protect",
          p.venueSymbol,
          p.side === "long" ? 1 : -1,
          "C",
          p.qty,
          0,
          "ok",
          "unprotected position closed",
        );
        status.closed++;
      } catch (err) {
        rt.db.event(
          "error",
          `live protective close ${p.venueSymbol} FAILED: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (!plan.entries.length || !alive()) return status;
    const specs = await bx.fetchContracts(network);
    const ticks = await rt.freshTickers();
    if (Date.now() - rt.tickersAt > 30_000) {
      status.skipped.push({ sym: "*", why: "prices older than 30 s — no entries this step" });
      return status;
    }
    const fresh = new Map(ticks.map((t) => [t.sym, t.last]));
    // equity-% sizing, never above the per-position real-money cap; unknown equity → no entries
    const raw = await liveUnit(rt, bingxClient(s.connId));
    if (raw === null) {
      status.skipped.push({ sym: "*", why: "account equity unknown — no entries this step" });
      return status;
    }
    const unit = Math.min(raw, positionCapOf(s));
    for (const e of plan.entries) {
      if (!alive()) break;
      const spec = specs.get(e.sym) ?? null;
      const px = fresh.get(e.sym) ?? 0;
      if (!(px > 0)) {
        status.skipped.push({ sym: e.sym, why: "no fresh price" });
        continue;
      }
      // the exchange minimum above our notional is not a reason to skip the entry: it IS the smallest tradable
      // size, so the entry is sent at it. Only a minimum MIN_RAISE_X times our notional is refused — at that point
      // the symbol is too large for this account, not merely rounded up.
      const minNotional = bx.exchangeMinNotional(spec, px);
      if (minNotional > unit * MIN_RAISE_X) {
        status.skipped.push({
          sym: e.sym,
          why: `exchange minimum $${minNotional.toFixed(2)} is over ${MIN_RAISE_X}x the notional $${unit.toFixed(2)}`,
        });
        continue;
      }
      const sized = bx.snapQtyExchange(unit / px, px, spec, venueMins(rt).get(e.sym)?.qty ?? 0);
      const qty = sized.qty;
      if (!(qty > 0)) {
        status.skipped.push({ sym: e.sym, why: "size rounds to zero" });
        continue;
      }
      const side = e.side === 1 ? "BUY" : "SELL";
      const exitSide = e.side === 1 ? "SELL" : "BUY";
      const positionSide = oneway ? "BOTH" : e.side === 1 ? "LONG" : "SHORT";
      const key = `${e.cfg}|${e.sym}|${e.barT}`;
      const ek = entryCoidKind(e.cfg);
      const coid = makeCoid(s.connId, ek);
      // ledger kind "E" for every entry (the range is in the client id): sent / recent entries are read by it
      record(coid, e.cfg, e.sym, e.side, "E", qty, px, "pending", key);
      L.entriesSent.add(key);
      try {
        await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
          symbol: e.sym,
          side,
          positionSide,
          type: "MARKET",
          quantity: qty,
          clientOrderID: coid,
        });
        record(coid, e.cfg, e.sym, e.side, "E", qty, px, "ok", key);
        status.placed++;
      } catch (err) {
        // refused by the exchange: nothing filled. Otherwise it may still have filled (time-out after fill): keep it
        // "pending" so the symbol stays ours; the next step protects any position found on it (protection pass)
        record(
          coid,
          e.cfg,
          e.sym,
          e.side,
          "E",
          qty,
          px,
          err instanceof bx.ExchangeRejected ? "error" : "pending",
          key,
        );
        rt.db.event(
          "error",
          `live entry ${e.sym}: ${err instanceof Error ? err.message : err} — state unknown, re-checked next step`,
        );
        continue;
      }
      // the stop at a distance the venue accepts (its own tick, at least), the target by precision alone
      const sl = bx.stopPxExchange(px, e.side, e.sl, spec, venueMins(rt).get(e.sym)?.stop ?? 0);
      const tp = bx.snapPx(e.side === 1 ? px * (1 + e.tp) : px * (1 - e.tp), spec);
      let protectedOk = true;
      for (const [kind, type, stopPrice] of [
        ["S", "STOP_MARKET", sl],
        ["T", "TAKE_PROFIT_MARKET", tp],
      ] as const) {
        let c = makeCoid(s.connId, kind);
        let sp = stopPrice;
        const placeExit = (cc: string, p: number) =>
          bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym,
            side: exitSide,
            positionSide,
            type,
            quantity: qty,
            stopPrice: p,
            closePosition: "true",
            workingType: "MARK_PRICE",
            clientOrderID: cc,
          });
        try {
          try {
            await placeExit(c, sp);
          } catch (err) {
            // too close to the mark: widen once. Below, a failed protective order closes the position we have just
            // opened, so one retry here is the difference between a protected entry and a round trip paid for nothing.
            const msg = err instanceof Error ? err.message : String(err);
            if (kind !== "S" || !bx.stopTooClose(msg)) throw err;
            const wider = bx.widenStopDist(e.sl, px, spec);
            learnVenueMin(rt, e.sym, "stop", wider);
            record(c, e.cfg, e.sym, e.side, kind, qty, sp, "error", key);
            sp = bx.stopPxExchange(px, e.side, wider, spec, wider);
            c = makeCoid(s.connId, kind);
            await placeExit(c, sp);
            rt.db.event(
              "warn",
              `live S ${e.sym}: stop was too close — placed at ${sp} (${(wider * 100).toFixed(2)} %)`,
            );
          }
          record(c, e.cfg, e.sym, e.side, kind, qty, sp, "ok", key);
        } catch (err) {
          protectedOk = false;
          record(c, e.cfg, e.sym, e.side, kind, qty, sp, "error", key);
          rt.db.event(
            "error",
            `live ${kind} ${e.sym}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
      if (!protectedOk) {
        // never leave an unprotected position: close it at market (own qty only)
        const c = makeCoid(s.connId, "C");
        try {
          await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym,
            side: exitSide,
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: c,
            ...reduceOnly,
          });
          record(c, e.cfg, e.sym, e.side, "C", qty, px, "ok", key);
          status.closed++;
        } catch (err) {
          record(c, e.cfg, e.sym, e.side, "C", qty, px, "error", key);
          rt.db.event(
            "error",
            `live protective close ${e.sym} FAILED: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
  }
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}

// ── live state: in memory, persisted at most once a second ─────────────────────────────────────────────────
// The live step runs every 100 ms tick; parsing and rewriting its state (control memory, suppressed lane orders,
// status) as JSON in SQLite on every tick cost more than the decision itself at scale. Readers in this process
// get the newest value from memory (liveKv); the database copy is at most ~1 s behind and flushed on shutdown.
const liveMem = new WeakMap<CoreDb, Map<string, { v: unknown; wroteAt: number; dirty: boolean }>>();
const flushTimers = new WeakMap<CoreDb, ReturnType<typeof setTimeout>>();
function memOf(db: CoreDb) {
  let m = liveMem.get(db);
  if (!m) liveMem.set(db, (m = new Map()));
  return m;
}
/** Newest live state value (memory first, else the persisted copy). */
export function liveKv<T>(db: CoreDb, key: string): T | null {
  const e = memOf(db).get(key);
  // a copy, like a database read: the caller may change it freely
  if (e) return structuredClone(e.v) as T;
  const v = db.kvGet<T>(key) ?? null;
  if (v !== null) memOf(db).set(key, { v: structuredClone(v), wroteAt: Date.now(), dirty: false });
  return v;
}
function liveKvSet(db: CoreDb, key: string, v0: unknown) {
  // a snapshot, like a database write: later changes to the caller's objects never leak into the stored state
  const v = structuredClone(v0);
  const m = memOf(db);
  const e = m.get(key);
  const now = Date.now();
  if (!e || now - e.wroteAt >= 1_000) {
    db.kvSet(key, v);
    m.set(key, { v, wroteAt: now, dirty: false });
    return;
  }
  m.set(key, { v, wroteAt: e.wroteAt, dirty: true });
  if (!flushTimers.has(db)) {
    const t = setTimeout(() => {
      flushTimers.delete(db);
      flushLiveKv(db);
    }, 1_000);
    (t as { unref?: () => void }).unref?.();
    flushTimers.set(db, t);
  }
}
/** Persist every live state value changed since its last write (shutdown, snapshot). */
export function flushLiveKv(db: CoreDb) {
  const m = liveMem.get(db);
  if (!m) return;
  for (const [k, e] of m)
    if (e.dirty) {
      db.kvSet(k, e.v);
      m.set(k, { v: e.v, wroteAt: Date.now(), dirty: false });
    }
}

// ── Overall control orders ─────────────────────────────────────────────────────

/** Paper positions of every lane → contributions (one per lane position, with its Block volume). */
export function laneContributions(
  rt: CoreRuntime,
  prices?: ReadonlyMap<string, number>,
): ControlContribution[] {
  // a lane whose stop was crossed at tick time no longer asks for its volume (its stop executes live now)
  const out: ControlContribution[] = [];
  for (const p of rt.paper.positions) {
    if (p.stopHit) continue;
    const id = `${p.cfg}|${p.sym}|${p.entryT}`;
    const vol = p.vol ?? 1;
    // the backstop sits at the current price minus this distance: measure it from the current price, so a stop
    // trailed far past the entry does not widen the backstop by its whole run (|entry − stop| did)
    const px = prices?.get(p.sym) ?? 0;
    const sl =
      px > 0 && p.stop > 0
        ? Math.max(0.001, (p.side * (px - p.stop)) / px)
        : Math.abs(p.entry - p.stop) / p.entry || 0.05;
    // the loss still open to the stop: a stop trailed past the entry risks nothing (|entry − stop| counted it)
    const risk = p.entry > 0 && p.stop > 0 ? Math.max(0, (p.side * (p.entry - p.stop)) / p.entry) : sl;
    const legs = Object.entries(p.legs ?? {}).filter(([, v]) => (v ?? 0) > 0) as Array<
      [string, number]
    >;
    if (!legs.length) {
      out.push({ id, cfg: p.cfg, sym: p.sym, side: p.side, vol, sl, risk });
      continue;
    }
    // Block type overall: every raising source is its own lane order (own id), beside the base position;
    // together they ask for exactly the position's volume
    const scale = vol / (1 + legs.reduce((a, [, v]) => a + v, 0));
    out.push({ id, cfg: p.cfg, sym: p.sym, side: p.side, vol: scale, sl, risk });
    for (const [src, v] of legs)
      out.push({
        id: `${id}|blk:${src}`,
        cfg: p.cfg,
        sym: p.sym,
        side: p.side,
        vol: scale * v,
        sl,
        risk,
      });
  }
  return out;
}

async function runControl(rt: CoreRuntime, gen: number, ex: ExchangeClient): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = {
    at: Date.now(),
    enabled: false,
    reason: "",
    placed: 0,
    closed: 0,
    cancelled: 0,
    skipped: [],
    error: null,
    mode: "overall",
  };
  // the step's epoch: abandoned by the watchdog (stuck too long), it sends nothing more
  const epoch = rt.liveEpoch ?? 0;
  const alive = () => rt.generation === gen && (rt.liveEpoch ?? 0) === epoch;
  const phase = (p: string) => {
    if (alive()) rt.livePhase = p;
  };
  const prev = liveKv<ControlStatus>(rt.db, "controlStatus");
  // the real cost of every control fill: reference price at sending vs fill price, plus commission
  const fill = (
    coid: string,
    a: { sym: string; side: number },
    kind: string,
    qty: number,
    refPx: number,
    resp: unknown,
  ) => {
    const f = parseFill(resp);
    if (!f || !(refPx > 0)) return;
    rt.db.run(
      "INSERT OR REPLACE INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      a.sym,
      a.side,
      kind,
      qty,
      refPx,
      f.px,
      f.fee,
      Date.now(),
    );
  };
  const record = (
    coid: string,
    a: { key: string; sym: string; side: number },
    kind: string,
    qty: number,
    px: number,
    st: string,
    msg = "",
  ) => {
    const at = Date.now();
    rt.db.runDurable(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid,
      `control|${a.key}`,
      a.sym,
      a.side,
      kind,
      qty,
      px,
      st,
      msg,
      at,
    );
    noteControlRow(rt, coid, { k: a.key, kind, status: st, qty, px, at });
  };
  try {
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    if (!s.enabled) return done(rt, status, "live disabled in settings");
    if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host");
    if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`);
    const banned = bx.blockingBanUntil();
    if (banned)
      return done(rt, status, `exchange rate limit until ${new Date(banned).toISOString()}`);
    // readiness (rolling simulated run PF ≥ min and stable) can be waived per connection, e.g. on a testnet. Not
    // ready only blocks opening and increasing: positions already held are still closed, reduced and protected.
    const notReady =
      !sim || (s.requireReady !== false && (sim.stats.pf < minPf || !sim.stable))
        ? !sim
          ? "not ready: no simulated run yet"
          : `not ready: simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}`
        : null;
    const connHash = stateHash([ex.fingerprint()]);
    const reconnected = !!prev && prev.connHash !== connHash;
    if (reconnected)
      rt.db.event(
        "warn",
        `live connection changed (${prev!.connHash} → ${connHash}): full re-sync from the exchange book`,
      );
    phase("book");
    const book = await ex.book();
    phase("account");
    const acct = await stampAccount(status, ex, book);
    // positions we opened in the last 10 minutes may not carry their stop yet (also a fill whose reply timed out);
    // with open orders from an earlier read (rate limited), every position opened since that read
    const ordersStale = book.ordersAt !== undefined;
    const recentFrom = Math.min(Date.now() - 600_000, book.ordersAt ?? Infinity);
    const ctlRows = controlRows(rt);
    // the exchange returns client order ids in lower case (BingX): the ledger is matched case-insensitively — an exact
    // lookup missed every resting stop, so no backstop was ever re-priced on x01
    let ctlUpper: Map<string, ControlRow> | null = null;
    const ctlByUpper = () => (ctlUpper ??= new Map([...ctlRows].map(([k, v]) => [k.toUpperCase(), v])));
    const recent = new Set<string>();
    for (const r of ctlRows.values())
      if ((r.kind === "O" || r.kind === "I") && (r.status === "ok" || r.status === "pending") && r.at > recentFrom)
        recent.add(r.k);
    // only what this system opened: a larger exchange position (someone else added to the same symbol and
    // direction) is partly foreign — its excess is never reduced, closed or rebalanced
    const ledger = ownLedger([...ctlRows.values()]);
    // hedge mode: foreignness is per (symbol, side) — a foreign position on one side never freezes our other side
    const posOneway = (s.positionMode ?? "hedge") === "oneway";
    const { held, foreign } = controlOwnership(
      book,
      s.connId,
      recent,
      new Set([...ledger].filter(([, q]) => q > 0).map(([k]) => k)),
      posOneway ? "oneway" : "hedge",
    );
    // flat markers: a key the ledger still counts as ours, flat on the exchange and not opened recently (a stop-out,
    // a manual close, an open that never filled) — the ledger restarts from 0 there, so it never only grows
    const onExchange = new Set(
      book.positions.map((p) => `${p.venueSymbol}|${p.side === "long" ? 1 : -1}`),
    );
    for (const [k, q] of ledger)
      if (q > 0 && !onExchange.has(k) && !recent.has(k)) {
        const [sym, sd] = k.split("|");
        // a local row (never sent): an id outside the own tag, so no exchange-id check ever looks for it
        const fid = `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        record(fid, { key: k, sym, side: Number(sd) }, "F", 0, 0, "ok", "flat on the exchange");
        ledger.set(k, 0);
      }
    // held-unknown: the newest ledger row of a key is an own open / increase of the last LAG_MS, its own stop rests on
    // the exchange, but the position read does not show it yet (the exchange lags right after an open). Never opened
    // a second time, and its fresh stop is never cancelled as left behind on a flat side — until the read shows the
    // position, or the window passes (then a flat key is an external close like any other). A gone stop is not a lag.
    const lastRow = new Map<string, ControlRow>();
    for (const r of ctlRows.values())
      if (r.kind === "O" || r.kind === "I" || r.kind === "X" || r.kind === "R" || r.kind === "F")
        lastRow.set(r.k, r);
    const lagging = new Set<string>();
    if (!ordersStale)
      for (const [k, r] of lastRow) {
        if (
          (r.kind !== "O" && r.kind !== "I") ||
          (r.status !== "ok" && r.status !== "pending") ||
          !(r.at > Date.now() - LAG_MS) ||
          onExchange.has(k)
        )
          continue;
        const [lsym, lsd] = k.split("|");
        if (
          book.orders.some(
            (o) =>
              o.venueSymbol === lsym &&
              isOwnCoid(o.clientOrderId, s.connId) &&
              (!o.positionSide || (o.positionSide === "LONG") === (Number(lsd) === 1)),
          )
        )
          lagging.add(k);
      }
    for (const x of capHeldToOwn(held, ledger)) {
      // nothing of it is ours (our part closed): that side (one-way: the symbol) is someone else's this step — never
      // touched; our position on the other side of a hedge-mode symbol is still managed
      if (x.own === 0) foreign.add(posOneway ? x.key.split("|")[0] : x.key);
      const mk = `foreign-excess|${x.key}|${x.exchange}`;
      const W = local(rt).warnedExcess;
      if (!W.has(mk)) {
        W.add(mk);
        if (W.size > 500) W.clear();
        rt.db.event(
          "warn",
          `live: ${x.key} holds ${x.exchange} on the exchange but this system opened ${x.own} — the excess is not ours and is never touched`,
        );
      }
    }
    phase("contracts");
    const specs = await ex.contracts();
    phase("tickers");
    const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last] as const));
    // stale prices: never open or increase (closing / reducing stays allowed)
    const pricesFresh = Date.now() - rt.tickersAt <= 30_000;
    // A position closed outside this system — by its exchange stop, or by hand — never stops processing, and is
    // never put back. The lane orders that held it at that moment are held back, so the SAME position is not
    // reopened: reopening at market while those lanes are still active only pays a round trip and the slippage
    // again, and on a close by hand it also undoes the operator's own decision. Each held-back lane order counts
    // again once it exits (its id leaves the paper book) or after SUPPRESS_MAX_MS at most, and a lane order that
    // joins the key AFTERWARDS is a new decision that opens and sizes it on its own — so new positions keep
    // arriving on the same symbol and side while the closed one stays closed. Everything else is untouched: the
    // engine keeps computing, the paper book keeps the lane, every other position is still managed. The own stop
    // a close by hand leaves resting is cancelled further down ("own orders left on a (symbol, side) that is flat
    // now"), so it can never catch a later position. With open orders of an earlier read the stop's fate is
    // unknown, which changes only the wording of the event, not the decision.
    const allLanes = laneContributions(rt, prices);
    const nowSup = Date.now();
    const laneIds = new Set(allLanes.flatMap((l) => (l.id ? [l.id] : [])));
    const suppressed: Record<string, { key: string; at: number }> = {};
    for (const [id, x] of Object.entries(
      liveKv<Record<string, { key: string; at: number }>>(rt.db, "controlSuppressed") ?? {},
    ))
      if (laneIds.has(id) && nowSup - x.at < SUPPRESS_MAX_MS) suppressed[id] = x;
    if (!reconnected)
      for (const x of externalCloses(prev, held)) {
        if (lagging.has(x.key)) continue; // just opened: the position read lags, it is not closed
        const [xsym, xsd] = x.key.split("|");
        const stopLeft =
          !ordersStale &&
          book.orders.some(
            (o) =>
              o.venueSymbol === xsym &&
              isOwnCoid(o.clientOrderId, s.connId) &&
              (!o.positionSide || (o.positionSide === "LONG") === (Number(xsd) === 1)),
          );
        let n = 0;
        for (const l of allLanes)
          if (l.id && `${l.sym}|${l.side}` === x.key) {
            suppressed[l.id] = { key: x.key, at: nowSup };
            n++;
          }
        // the own stop still resting means the position went by hand (or by a target), not by our backstop
        rt.db.event(
          stopLeft ? "info" : "warn",
          `live: ${x.key} was closed ${stopLeft ? "by hand (its own stop was still resting)" : "by its exchange stop"}` +
            ` — processing continues; ${n} lane order(s) held back so the same position is not reopened, until they` +
            ` exit (at most ${SUPPRESS_MAX_MS / 60_000} min). A new lane order on ${x.key} opens it again.`,
        );
      }
    liveKvSet(rt.db, "controlSuppressed", suppressed);
    // only validated configs ask for volume: a config the current selection dropped (or a signal no longer
    // active) keeps its lane only while its position is held — it is never reopened or opened anew
    const selected = rt.paper.selected ? new Set(rt.paper.selected) : null;
    const sigActive = rt.wf?.signalActive;
    // what the operator lets reach the exchange: the strategy kinds of live.kinds (unset / empty = every kind) and,
    // with live.plainOnly, only lanes Block did not raise. The engine keeps computing and paper-trading everything;
    // a held position is still managed and closed below, whatever its kind, so the list never orphans one.
    const { sendable, validLane } = liveLaneFilter(s, selected, sigActive);
    let notSent = 0;
    const lanes = allLanes.filter((l) => {
      if (l.id && suppressed[l.id]) return false;
      if (validLane(l)) return true;
      if (!sendable(l)) notSent++;
      return held.has(`${l.sym}|${l.side}`);
    });
    // one lane volume unit: fixed % of the account equity (or the fixed notional); unknown equity → nothing is
    // sized: held positions are kept as they are (closes of lanes that ended still run), nothing opens or grows
    phase("sizing");
    const unitRaw = await liveUnit(rt, ex);
    // the equity caps (per-position, exposure, risk budget) need the equity: unknown equity sizes nothing (a failed
    // balance read must not lift every cap at once — held positions stay, nothing opens or grows)
    // the exposure scaler switched off: maxExposureX bounds nothing (neither the fill budget nor the targets)
    const maxExposureX = s.exposureScaler === false ? 0 : (s.maxExposureX ?? 0);
    const eqCapped = (s.maxPositionX ?? 0) > 0 || maxExposureX > 0 || (s.maxRiskPct ?? 0) > 0;
    const unit = eqCapped && !((acct?.equity ?? 0) > 0) ? null : unitRaw;
    // symbols / sides with a foreign position or order are never touched: their lanes take no share of the budgets
    const lanesOwn = lanes.filter((l) => !isForeign(foreign, `${l.sym}|${l.side}`));
    // minimum-quantity sizing: one unit = the symbol's exchange minimum (its lot), the Block volume in whole lots
    const minQty = sizingSettings(rt.settings.sizing).mode === "minQty";
    // top configs: only the best-ranked engine configs (and every active signal) go to the exchange — as many as
    // the account exposure budget carries ("fill") or a fixed number; the paper book keeps every config
    let liveLanes = lanesOwn;
    const top = s.top;
    if (top === "fill" || (typeof top === "number" && top > 0)) {
      const eq = acct?.equity ?? 0;
      // the budget the scalers will allow: the exposure cap, and the risk budget at the lanes' mean planned loss
      // (a fill to the exposure cap alone kept ~8× more configs than the risk budget funds, all squeezed to minimums)
      let lw = 0;
      let lr = 0;
      let ls = 0;
      const minStop = s.minStopPct ?? 0.01;
      for (const l of lanesOwn) {
        const w = Math.max(0, l.vol) * (isSignalInd(l.cfg.split("|")[1] ?? "") ? Math.max(0, s.signalWeight ?? 1) : 1);
        lw += w;
        lr += w * Math.max(0, l.risk ?? l.sl);
        // the backstop distance controlTargets gives the position (widest lane stop × 1.2, min stop … 20 %)
        ls += w * Math.min(0.2, Math.max(minStop, l.sl * 1.2));
      }
      const meanRisk = Math.max(minStop, lw > 0 ? lr / lw : 0.01);
      const meanStop = Math.max(minStop, lw > 0 ? ls / lw : 0.012);
      // (the worst-case budget too: left out, the fill overshot it and its scaler squeezed every position back down)
      const budget = Math.min(
        maxExposureX > 0 && eq > 0 ? maxExposureX * eq : Infinity,
        s.maxRiskPct && s.maxRiskPct > 0 && eq > 0 ? (s.maxRiskPct * eq) / meanRisk : Infinity,
        s.maxBackstopLossPct && s.maxBackstopLossPct > 0 && eq > 0 ? (s.maxBackstopLossPct * eq) / meanStop : Infinity,
      );
      const ratio = s.ratio ?? 1;
      // a position never costs more than the per-position cap: past it, the budget goes to further configs
      const posCap = positionCapFor(positionCapOf(s), eq, s.maxPositionX);
      // the configs kept last step come first: a reshuffled ranking (every compute) must not churn the book
      const prev = liveKv<string[]>(rt.db, "controlTopKept");
      const r = topConfigLanes(lanesOwn, (c) => rt.paper.scores?.get(c), {
        top,
        budget,
        prefer: new Set(Array.isArray(prev) ? prev : []),
        signalWeight: s.signalWeight ?? 1,
        signalsByScore: s.signalsByScore === true,
        posCost: (sym, v) => {
          const px = prices.get(sym) ?? 0;
          const spec = specs.get(sym) ?? null;
          const u = minQty ? bx.minQtyExchange(px, spec) * px : (unit ?? 0);
          return Math.max(bx.exchangeMinNotional(spec, px), Math.min(posCap, v * ratio * u));
        },
      });
      liveLanes = r.lanes;
      liveKvSet(rt.db, "controlTopKept", r.cfgs);
      liveKvSet(rt.db, "controlTop", { at: Date.now(), top, kept: r.kept, of: r.of, budget, lanes: r.lanes.length });
    }
    const posCapNow = positionCapFor(positionCapOf(s), acct?.equity ?? null, s.maxPositionX);
    // held now, and the keys opened moments ago that the position read does not show yet (lagging): a fresh open is
    // ranked as held, so the position cap or a budget scaler never displaces it (and closes it the next step)
    const heldNow = new Set<string>(held.keys());
    for (const k of lagging) if (!isForeign(foreign, k)) heldNow.add(k);
    // a quantity the venue has already named as its minimum is never undercut again — by the sizing or by a scaler
    const venueQty = (sym: string) => venueMinQty(rt, sym);
    const snapVenue = (sym: string, q: number, px: number) =>
      bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueQty(sym)).qty;
    // a key that cannot open this step takes no slot under the position cap: its open is waiting after a refusal
    // (open / margin-mode / leverage backoff — an offline symbol waits hours), or the free-margin floor refused it
    // moments ago. Its slot goes to the next target instead.
    const Lb = local(rt);
    const openBlocked = (key: string): string | null => {
      const sym = key.split("|")[0];
      const w =
        waiting(`${connHash}|open|${key}`) ??
        waiting(`${connHash}|margin|${sym}`) ??
        waiting(`${connHash}|leverage|${sym}`);
      if (w) return `open waiting after a failure: ${w}`;
      const m = Lb.floorRefused.get(key);
      if (m && m.until > Date.now()) return `open waiting: ${m.msg}`;
      if (m) Lb.floorRefused.delete(key);
      return null;
    };
    // targets dropped by a budget scaler (risk / worst case) are left out of the next pass BEFORE the position cap, so
    // the slot they took goes to the next target; held positions are never dropped. Passes repeat until no scaler
    // drops anything new (bounded: a key once dropped stays out, so each pass removes at least one).
    const budgetDrop = new Map<string, string>();
    const slotCapped = (s.maxPositions ?? 0) > 0 || (rt.settings.signals.maxPositions ?? 0) > 0;
    let targets: ControlTarget[] = [];
    let skipped: ReturnType<typeof controlTargets>["skipped"] = [];
    let exposure: ReturnType<typeof scaleToExposure> = null;
    let risk: ReturnType<typeof scaleToRisk> = null;
    let worst: ReturnType<typeof scaleToRisk> = null;
    for (let pass = 0; ; pass++) {
      ({ targets, skipped } = controlTargets(
        liveLanes,
        prices,
        {
          ...controlSettingsOf(s, unit ?? 0, rt.settings.signals.maxPositions),
          maxNotionalUsd: posCapNow,
          ...(minQty
            ? {
                unitOf: (sym: string, px: number) =>
                  bx.minQtyExchange(px, specs.get(sym) ?? null) * px,
              }
            : {}),
          heldKeys: heldNow,
          blocked: (k: string) => budgetDrop.get(k) ?? openBlocked(k),
          // the venue's own floor under our minStopPct, per symbol and per price (its price tick plus clearance)
          minStopOf: (sym: string, px: number) =>
            bx.minStopDist(px, specs.get(sym) ?? null, venueMins(rt).get(sym)?.stop ?? 0),
        },
        (sym, q, px) => bx.snapQtyExchange(q, px, specs.get(sym) ?? null, venueQty(sym)),
      ));
      // live.maxSymbols: the exchange sees at most this many distinct symbols. Symbols already held come first, so
      // the cap never closes a held position and never reshuffles which symbols trade between steps; the targets
      // are already ranked, so the rest join in that order. The engine keeps the whole universe in Base and on paper.
      const maxSyms = s.maxSymbols ?? 0;
      if (maxSyms > 0) {
        const heldSyms = new Set([...heldNow].map((k) => k.split("|")[0]));
        const allowed = new Set(heldSyms);
        for (const t of targets) {
          if (allowed.size >= maxSyms) break;
          allowed.add(t.sym);
        }
        const before = targets.length;
        const keep = targets.filter((t) => allowed.has(t.sym));
        if (keep.length < before) {
          targets = keep;
          liveKvSet(rt.db, "controlSymbolCap", {
            at: Date.now(),
            max: maxSyms,
            symbols: allowed.size,
            held: heldSyms.size,
            dropped: before - keep.length,
          });
        }
      }
      // account exposure factor: one factor for every target when the gross notional (long and short both counted
      // in full) exceeds the multiple of equity — gross exposure is one account-level bound, so the relations
      // between positions (long vs short among them) stay as they are
      exposure = scaleToExposure(targets, acct?.equity ?? null, maxExposureX, snapVenue);
      // stop-risk budget: what every stop hit at once would cost stays within maxRiskPct of the equity
      risk = scaleToRisk(targets, acct?.equity ?? null, s.maxRiskPct, snapVenue, heldNow);
      // worst case: every exchange backstop filled at once (gaps aside) stays within maxBackstopLossPct of the
      // equity — the cap that keeps a high volume factor from risking the account
      worst = scaleToRisk(
        targets,
        acct?.equity ?? null,
        s.maxBackstopLossPct,
        snapVenue,
        heldNow,
        (t) => t.stopDist,
      );
      const fresh: Array<[string, string]> = [
        ...(risk?.dropped ?? []).map((k) => [k, "risk budget"] as [string, string]),
        ...(worst?.dropped ?? []).map((k) => [k, "worst-case budget"] as [string, string]),
      ];
      for (const [k, why] of fresh) budgetDrop.set(k, why);
      // no slot cap: a drop frees nothing for another target — one pass is the answer
      if (!fresh.length || !slotCapped || pass >= 8) {
        // dropped in this (last) pass: shown like every other skipped target
        for (const [k, why] of fresh) skipped.push({ sym: k.split("|")[0], why });
        break;
      }
    }
    if (exposure && exposure.factor < 1)
      liveKvSet(rt.db, "controlExposure", { at: Date.now(), ...exposure });
    const droppedBy = (why: string) => [...budgetDrop].filter(([, w]) => w === why).map(([k]) => k);
    if (risk) liveKvSet(rt.db, "controlRisk", { at: Date.now(), ...risk, dropped: droppedBy("risk budget") });
    if (worst)
      liveKvSet(rt.db, "controlWorstCase", { at: Date.now(), ...worst, dropped: droppedBy("worst-case budget") });
    // volume factor at work: how many positions the per-position cap cut (there a higher factor sizes nothing up)
    // and the size spread after every scaler — all positions at one size means the factor has no effect
    let ratioHint: string | null = null;
    if (targets.length) {
      const ns = targets.map((t) => t.notional).sort((a, b) => a - b);
      const capped = targets.filter((t) => t.capped).length;
      const ratio = s.ratio ?? 1;
      // the factor below which a position is sized by its volume instead of the cap: posCap / (unit × weighted
      // volume), and the largest of those over the targets is where the factor starts to matter at all
      let starts = 0;
      for (const t of targets) {
        const px = t.qty > 0 ? t.notional / t.qty : 0;
        const u = minQty ? bx.minQtyExchange(px, specs.get(t.sym) ?? null) * px : (unit ?? 0);
        if (u > 0 && t.vol > 0) starts = Math.max(starts, posCapNow / (u * t.vol));
      }
      const sizing = {
        at: Date.now(),
        ratio,
        posCap: posCapNow,
        equity: acct?.equity ?? null,
        targets: targets.length,
        capped,
        raised: targets.filter((t) => t.raised).length,
        min: ns[0],
        median: ns[ns.length >> 1],
        max: ns[ns.length - 1],
        ...(capped === targets.length && starts > 0 ? { ratioMatters: starts } : {}),
      };
      liveKvSet(rt.db, "controlSizing", sizing);
      if (capped === targets.length && starts > 0 && starts < ratio)
        ratioHint = `volume factor ${ratio} has no effect: every position sits at the per-position cap ${posCapNow.toFixed(2)} USD — it sizes positions only below ${starts < 0.1 ? starts.toPrecision(2) : starts.toFixed(2)} (or with a higher cap)`;
      const Ls = local(rt);
      if (targets.length >= 3 && capped === targets.length && Date.now() - Ls.sizingWarnAt > 3_600_000) {
        Ls.sizingWarnAt = Date.now();
        rt.db.event(
          "warn",
          `live: volume factor ${sizing.ratio} has no effect — all ${capped} positions sit at the per-position cap ${sizing.posCap.toFixed(2)} USD (raise maxPositionX / maxNotionalUsd or lower the factor to size by volume${starts > 0 ? `; it starts to matter below ${starts.toFixed(2)}` : ""})`,
        );
      }
    }
    const keep = new Set(skipped.flatMap((x) => (x.keep ? [x.keep] : [])));
    if (unit === null) for (const l of lanes) keep.add(`${l.sym}|${l.side}`);
    // no contract specs (an outage): nothing can be sized or rounded — every held position is kept as it is
    const noSpecs = specs.size === 0;
    if (noSpecs) for (const k of held.keys()) keep.add(k);
    // free-margin floor: an unknown free margin counts as below it (never open blind on a guarded account)
    const floor = s.minFreeMargin ?? 0;
    const free = acct?.availableMargin ?? null;
    const marginLow =
      floor > 0 && (free === null || free < floor)
        ? `free margin ${free === null ? "unknown" : `${free.toFixed(2)} USDT`} below the ${floor} USDT floor`
        : null;
    const paused = s.openPaused
      ? `opening paused${typeof s.openPaused === "string" ? `: ${s.openPaused}` : ""}`
      : null;
    const openBlock =
      notReady ?? (unit === null ? "account equity unknown — not sizing" : null) ?? marginLow ?? paused;
    // the room above the floor for this step: the account snapshot can be up to ~75 s old (client cache + exchange
    // read cache), so the margin of own opens in that time is taken off as well (counted twice at worst — safe side)
    const Lm = local(rt);
    Lm.marginSpent = Lm.marginSpent.filter((x) => Date.now() - x.at < ACCOUNT_MS + 15_000);
    let marginRoom =
      floor > 0 && free !== null
        ? free - floor - Lm.marginSpent.reduce((a, x) => a + x.usd, 0)
        : Infinity;
    const bookParts = [
      ...[...held.entries()].sort().map(([k, q]) => `P:${k}:${q}`),
      ...book.orders
        .filter((o) => isOwnCoid(o.clientOrderId, s.connId))
        .map((o) => `O:${o.clientOrderId}`)
        .sort(),
    ];
    const plan = planControl({
      targets,
      held,
      foreign,
      rebalancePct: s.rebalancePct ?? 0.25,
      bookParts,
      keep,
      lots: new Map([...specs].map(([sym, spec]) => [sym, spec.step] as const)),
    });
    // one index for the whole step: the stop repair and the backstop re-price each looked a target up with a linear
    // scan per held key (O(held × targets) — hundreds × hundreds since the caps came off)
    const targetOf = new Map(plan.targets.map((t) => [t.key, t] as const));
    status.enabled = true;
    status.reason =
      (openBlock ? `armed — opening blocked: ${openBlock}` : "armed (overall control orders)") +
      (ratioHint ? ` · ${ratioHint}` : "");
    status.skipped = [...skipped, ...plan.skipped];
    const unchanged =
      !reconnected &&
      !!prev &&
      prev.targetsHash === plan.hashes.targets &&
      prev.bookHash === plan.hashes.book &&
      plan.actions.length === 0;
    const control: ControlStatus = {
      at: Date.now(),
      connHash,
      targetsHash: plan.hashes.targets,
      bookHash: plan.hashes.book,
      planHash: plan.hashes.plan,
      reconnected,
      unchanged,
      steps: (prev?.steps ?? 0) + 1,
      changes: (prev?.changes ?? 0) + (unchanged ? 0 : 1),
      targets: plan.targets,
      // (a held-unknown key counts as held: once the read shows it flat after the window, it is an external close)
      held: [
        ...[...held.entries()].map(([key, qty]) => ({ key, qty })),
        ...[...lagging]
          .filter((k) => !held.has(k) && !isForeign(foreign, k))
          .map((key) => ({ key, qty: ledger.get(key) ?? 0 })),
      ],
      actions: [],
      laneCounts: laneCountsByKey(lanes),
      ...(notSent ? { notSent } : {}),
      suppressed: Object.keys(suppressed).length,
    };
    status.control = control;

    // account modes: position mode once per connection + mode; margin mode once per symbol. A mode the exchange
    // refuses blocks opening (closing stays possible) — never trade in a mode other than the configured one.
    const posMode = s.positionMode ?? "hedge";
    const marginMode = s.marginMode ?? "cross";
    const oneway = posMode === "oneway";
    const modes = rt.db.kvGet<{
      key: string;
      margin: Record<string, string>;
      lev?: Record<string, string>;
    }>("liveModes") ?? {
      key: "",
      margin: {},
    };
    modes.lev ??= {};
    let modeError: string | null = null;
    const modeKey = `${connHash}|${posMode}`;
    // a refused mode change (e.g. while positions are open) is retried with backoff, not every tick
    const modeWait = `${connHash}|mode`;
    if (modes.key !== modeKey) {
      modeError = waiting(modeWait);
      if (!modeError) {
        try {
          await ex.setPositionMode?.(posMode);
          modes.key = modeKey;
          modes.margin = {};
          modes.lev = {};
          cleared(modeWait);
        } catch (err) {
          const msg = errText(err);
          if (alreadySet(msg)) {
            modes.key = modeKey;
            modes.margin = {};
            modes.lev = {};
            cleared(modeWait);
          } else {
            modeError = `position mode ${posMode} not applied: ${msg}`;
            failed(modeWait, modeError, ...OPEN_BACKOFF);
            rt.db.event("error", `live: ${modeError}`);
          }
        }
        rt.db.kvSet("liveModes", modes);
      }
    }
    if (modeError) status.reason = `armed — opening blocked: ${modeError}${ratioHint ? ` · ${ratioHint}` : ""}`;
    const ensureMargin = async (sym: string) => {
      if (modes.margin[sym] === marginMode) return;
      const k = `${connHash}|margin|${sym}`;
      const w = waiting(k);
      if (w) throw holdOn(w);
      try {
        await ex.setMarginMode?.(sym, marginMode);
      } catch (err) {
        const msg = errText(err);
        if (!alreadySet(msg)) {
          const offline = /offline currently|not a valid/i.test(msg);
          const m = offline
            ? `${sym} is offline — not opening`
            : `margin mode ${marginMode} not applied: ${msg}`;
          failed(k, m, ...(offline ? ([30 * 60_000, 6 * 60 * 60_000] as const) : OPEN_BACKOFF));
          if (offline) rt.db.event("warn", `live: ${m}`);
          throw offline ? holdOn(m) : new Error(m);
        }
      }
      cleared(k);
      modes.margin[sym] = marginMode;
      rt.db.kvSet("liveModes", modes);
    };
    // leverage once per symbol (and setting): "max" = each side's exchange maximum, so a position at the minimum
    // quantity ties up the least margin. Set before the first open; a refusal blocks opening only.
    const levSetting = s.leverage ?? "max";
    const ensureLeverage = async (sym: string, ourSide: 1 | -1) => {
      if (!ex.leverage || !ex.setLeverage) return;
      // hedge mode: a side another system holds (or has orders on) is never touched — not even its leverage, which
      // would change that position's margin. Only our side is set then, and remembered per side.
      const otherSide = (-ourSide) as 1 | -1;
      const otherForeign = !oneway && foreign.has(`${sym}|${otherSide}`);
      const ourPs = ourSide === 1 ? "LONG" : "SHORT";
      // isolated margin: the margin is all a position can lose, so its liquidation sits about 1 / leverage away —
      // at an exchange maximum (50–125×) well inside the protective stop (up to 20 %). Capped so liquidation stays
      // behind the widest stop; cross margin backs a position with the whole account.
      const isoCap = marginMode === "isolated" ? ISOLATED_MAX_LEVERAGE : Infinity;
      const want = `${levSetting}${isoCap < Infinity ? `|iso${isoCap}` : ""}`;
      if (modes.lev?.[sym] === want) return;
      const levKey = otherForeign ? `${sym}|${ourPs}` : sym;
      if (modes.lev?.[levKey] === want) return;
      const k = `${connHash}|leverage|${sym}`;
      const w = waiting(k);
      if (w) throw holdOn(w);
      try {
        const info = await ex.leverage(sym);
        if (!info) throw new Error("no leverage info");
        const target = (max: number) =>
          Math.min(isoCap, levSetting === "max" ? max : Math.min(max, Math.max(1, levSetting)));
        const sides: Array<["LONG" | "SHORT" | "BOTH", number, number]> = oneway
          ? [["BOTH", info.long, Math.min(info.maxLong, info.maxShort)]]
          : ([
              ["LONG", info.long, info.maxLong],
              ["SHORT", info.short, info.maxShort],
            ] as Array<["LONG" | "SHORT" | "BOTH", number, number]>).filter(([ps]) => !otherForeign || ps === ourPs);
        for (const [side, cur, max] of sides) {
          const lev = target(max);
          if (cur !== lev)
            try {
              await ex.setLeverage(sym, side, lev);
            } catch (err) {
              if (!alreadySet(errText(err))) throw err;
            }
          local(rt).levVal.set(`${sym}|${side}`, lev);
        }
      } catch (err) {
        const m = `leverage ${want} not applied on ${sym}: ${errText(err)}`;
        failed(k, m, ...OPEN_BACKOFF);
        throw new Error(m);
      }
      cleared(k);
      modes.lev![levKey] = want;
      rt.db.kvSet("liveModes", modes);
    };
    // the leverage in force on a side (set this process, else read once); unknown → 1 (the margin is the notional)
    const levOf = async (sym: string, side: 1 | -1): Promise<number> => {
      const ps = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const L = local(rt).levVal;
      const hit = L.get(`${sym}|${ps}`);
      if (hit) return hit;
      try {
        const info = ex.leverage ? await ex.leverage(sym) : null;
        const v = info ? (ps === "BOTH" ? info.long : ps === "LONG" ? info.long : info.short) : 0;
        if (v > 0) {
          L.set(`${sym}|${ps}`, v);
          return v;
        }
      } catch {
        /* unknown: counted at 1× */
      }
      return 1;
    };

    // own orders left on a (symbol, side) that is flat now: cancel (not from open orders of an earlier read)
    for (const o of ordersStale ? [] : book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      // the fresh stop of a position the read does not show yet: not left behind
      const onLagging = ([1, -1] as const).some(
        (sd) =>
          lagging.has(`${o.venueSymbol}|${sd}`) &&
          (!o.positionSide || (o.positionSide === "LONG") === (sd === 1)),
      );
      if (onLagging) continue;
      const flat = !book.positions.some(
        (p) =>
          p.venueSymbol === o.venueSymbol &&
          (!o.positionSide || (p.side === "long") === (o.positionSide === "LONG")),
      );
      if (flat && (await ex.cancel(o.venueSymbol, o.id))) status.cancelled++;
    }

    // keys the repair closed this step: the plan built before it no longer applies to them
    const repairClosed = new Set<string>();
    // repair: every own position must carry its protective stop (e.g. a fill whose reply timed out before the stop)
    // (a close waiting after a failure does not count: the position stays open meanwhile and needs its stop)
    const closing = new Set(
      plan.actions
        .filter((a) => a.kind === "close" && !waiting(`${connHash}|exit|${a.key}`))
        .map((a) => a.key),
    );
    // (open orders of an earlier read do not show the stops placed since: no repair until they are read again)
    for (const [key, qty] of ordersStale ? [] : held) {
      if (!alive()) break;
      if (closing.has(key)) continue;
      const [sym, sd] = key.split("|");
      const side = (Number(sd) === 1 ? 1 : -1) as 1 | -1;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      if (
        book.orders.some(
          (o) =>
            o.venueSymbol === sym &&
            isOwnCoid(o.clientOrderId, s.connId) &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        )
      )
        continue;
      const px = prices.get(sym) ?? 0;
      const spec = specs.get(sym) ?? null;
      const dist = targetOf.get(key)?.stopDist ?? 0.05;
      const a = { key, sym, side };
      const repairKey = `${connHash}|repair|${key}`;
      if (waiting(repairKey)) continue;
      // a stop priced from a stale ticker can land on the wrong side of the mark: refused, and the fallback
      // below would close the position at market. Wait for fresh prices (the next step retries). No price at all
      // (the symbol is missing from the tickers) waits the same way: a missing price is never a reason to close.
      if (!(px > 0) || !pricesFresh) {
        status.skipped.push({ sym, why: px > 0 ? "stop repair waits for fresh prices" : "stop repair waits for a price" });
        continue;
      }
      const sc = makeCoid(s.connId, "S");
      try {
        let stopPrice = bx.stopPxExchange(px, side, dist, spec, venueMins(rt).get(sym)?.stop ?? 0);
        if (!(qty > 0) || !(stopPrice > 0)) throw new Error("stop needs a quantity and a price");
        const placeRepair = (c: string, sp: number) =>
          ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "STOP_MARKET",
            quantity: qty,
            stopPrice: sp,
            closePosition: "true",
            workingType: "MARK_PRICE",
            clientOrderID: c,
          });
        let sc2 = sc;
        try {
          await placeRepair(sc2, stopPrice);
        } catch (err) {
          // too close to the mark: widen once. The fallback below closes the position, so a retry here is the
          // difference between a protected position and a closed one.
          const msg = err instanceof Error ? err.message : String(err);
          if (!bx.stopTooClose(msg)) throw err;
          const wider = bx.widenStopDist(dist, px, spec);
          learnVenueMin(rt, sym, "stop", wider);
          record(sc2, a, "S", qty, stopPrice, "error", msg);
          stopPrice = bx.stopPxExchange(px, side, wider, spec, wider);
          sc2 = makeCoid(s.connId, "S");
          await placeRepair(sc2, stopPrice);
        }
        record(sc2, a, "S", qty, stopPrice, "ok", "repair");
        cleared(repairKey);
        rt.db.event("warn", `control ${key}: protective stop was missing — re-placed`);
      } catch (err) {
        record(sc, a, "S", qty, 0, "error", "repair");
        try {
          const cc = makeCoid(s.connId, "C");
          await ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: cc,
            ...(oneway ? { reduceOnly: "true" } : {}),
          });
          record(cc, a, "X", qty, px, "ok", "protective close (stop repair failed)");
          status.closed++;
          held.delete(key);
          repairClosed.add(key);
          // the lanes would reopen it next tick: opening on this key waits (the stop may keep failing)
          failed(`${connHash}|open|${key}`, `stop repair failed: ${errText(err)}`, ...OPEN_BACKOFF);
          cleared(repairKey);
        } catch (e2) {
          failed(repairKey, errText(e2), ...EXIT_BACKOFF);
          rt.db.event(
            "error",
            `control ${key}: UNPROTECTED — stop repair and close failed: ${e2 instanceof Error ? e2.message : e2} (${err instanceof Error ? err.message : err})`,
          );
        }
      }
    }

    // backstop re-pricing: the stop placed at the open (or by the repair) follows the lanes' widest stop (the target's
    // stopDist). Without it, lanes that join with wider stops sat behind the older, tighter backstop, which filled
    // first (AT-USDT), and the risk guards priced the position at a stop distance it did not carry. A resting stop
    // tighter than the target by more than RESTOP_INSIDE of its distance, or wider by more than RESTOP_BEYOND, is
    // replaced: the off stops are cancelled first and the new one placed right after (BingX keeps one close-position
    // stop per position side: placed first, the new stop was refused every time — "Position SL order already
    // exists" — and x01 sat on stale stops); a new stop the exchange refuses is replaced by one at the old price at
    // once (and the stop repair above covers the next step should that fail too), then retried after a backoff.
    // (open orders of an earlier read do not show the stops placed since; stale prices could misplace the stop)
    for (const [key, qty] of ordersStale || !pricesFresh || noSpecs ? [] : held) {
      if (!alive()) break;
      if (closing.has(key) || repairClosed.has(key)) continue;
      const t = targetOf.get(key);
      const sym = key.split("|")[0];
      const px = prices.get(sym) ?? 0;
      if (!t || !(px > 0) || !(qty > 0)) continue;
      const side = t.side;
      const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
      const spec = specs.get(sym) ?? null;
      const want = bx.stopPxExchange(px, side, t.stopDist, spec, venueMins(rt).get(sym)?.stop ?? 0);
      const dist = Math.abs(px - want);
      if (!(want > 0) || !(dist > 0)) continue;
      const stops = book.orders
        .filter(
          (o) =>
            o.id &&
            o.venueSymbol === sym &&
            isOwnCoid(o.clientOrderId, s.connId) &&
            (oneway || !o.positionSide || o.positionSide === positionSide),
        )
        .map((o) => ({ id: o.id!, sp: ctlByUpper().get((o.clientOrderId ?? "").toUpperCase())?.px ?? 0 }));
      // none: the repair above places it; a stop of unknown price (no ledger row): left as it is, never guessed
      if (!stops.length || stops.some((x) => !(x.sp > 0))) continue;
      const fits = (sp: number) => {
        const d = side * (sp - want); // > 0: tighter than the target
        return d <= RESTOP_INSIDE * dist && -d <= RESTOP_BEYOND * dist;
      };
      const off = stops.filter((x) => !fits(x.sp));
      if (!off.length) continue;
      if (!stops.some((x) => fits(x.sp))) {
        const reKey = `${connHash}|restop|${key}`;
        const Lr = local(rt).restopAt;
        if (waiting(reKey) || Date.now() - (Lr.get(key) ?? 0) < RESTOP_MIN_MS) continue;
        Lr.set(key, Date.now());
        if (Lr.size > 2_000) Lr.clear();
        const a = { key, sym, side };
        const sc = makeCoid(s.connId, "S");
        const from = off.map((x) => x.sp).join(", ");
        const place = async (coid: string, stopPrice: number) =>
          ex.order({
            symbol: sym,
            side: side === 1 ? "SELL" : "BUY",
            positionSide,
            type: "STOP_MARKET",
            quantity: qty,
            stopPrice,
            closePosition: "true",
            workingType: "MARK_PRICE",
            clientOrderID: coid,
          });
        // the old stops go first (one close-position stop per side on the exchange)
        let gone = 0;
        for (const x of off) {
          if (!alive()) break;
          if (await ex.cancel(sym, x.id)) {
            status.cancelled++;
            gone++;
          }
        }
        if (!gone) continue;
        // pending first: a reply that times out may still have placed it (its row then carries its price)
        record(sc, a, "S", qty, want, "pending", "re-price");
        try {
          await place(sc, want);
          record(sc, a, "S", qty, want, "ok", `re-priced from ${from}`);
          cleared(reKey);
          rt.db.event(
            "info",
            `control ${key}: backstop re-priced ${from} → ${want} (${(t.stopDist * 100).toFixed(2)} % from ${px})`,
          );
        } catch (err) {
          const msg = errText(err);
          if (err instanceof bx.ExchangeRejected) record(sc, a, "S", qty, want, "error", msg);
          failed(reKey, msg, 30_000, 10 * 60_000);
          // refused for being too close: a WIDER stop is tried before the old one goes back. The old price is where
          // the stop already was, so restoring it is the fallback, not the answer — and when the mark has walked onto
          // it, the restore is refused for the same reason and the position is left bare until the repair next step.
          if (bx.stopTooClose(msg)) {
            const wider = bx.widenStopDist(t.stopDist, px, spec);
            learnVenueMin(rt, sym, "stop", wider);
            const wide = bx.stopPxExchange(px, side, wider, spec, wider);
            const wc = makeCoid(s.connId, "S");
            record(wc, a, "S", qty, wide, "pending", "re-price widened");
            try {
              await place(wc, wide);
              record(wc, a, "S", qty, wide, "ok", `re-priced wider after a too-close refusal (from ${from})`);
              cleared(reKey);
              rt.db.event(
                "warn",
                `control ${key}: backstop re-price to ${want} was too close — placed at ${wide} (${(wider * 100).toFixed(2)} %)`,
              );
              continue;
            } catch (e3) {
              const m3 = errText(e3);
              if (e3 instanceof bx.ExchangeRejected) record(wc, a, "S", qty, wide, "error", m3);
            }
          }
          // the position is without its stop now: one at the old price goes straight back
          const back = off[0].sp;
          const bc = makeCoid(s.connId, "S");
          record(bc, a, "S", qty, back, "pending", "re-price restore");
          try {
            await place(bc, back);
            record(bc, a, "S", qty, back, "ok", "restored after a refused re-price");
            rt.db.event("warn", `control ${key}: backstop re-price to ${want} failed (old stop ${back} restored): ${msg}`);
          } catch (e2) {
            const m2 = errText(e2);
            if (e2 instanceof bx.ExchangeRejected) record(bc, a, "S", qty, back, "error", m2);
            rt.db.event(
              "error",
              `control ${key}: backstop re-price to ${want} failed and the old stop ${back} could not be restored (stop repair next step): ${msg} / ${m2}`,
            );
          }
          if (bx.noteRateLimit(msg)) break;
          continue;
        }
        continue;
      }
      // a stop that fits rests on the position: the others go
      for (const x of off) {
        if (!alive()) break;
        if (await ex.cancel(sym, x.id)) status.cancelled++;
      }
    }

    // one-way: symbols whose close / reduce did not go through this step — an open of the other side there would
    // net through zero into the wrong position (closes run first in the plan)
    const exitBlocked = new Set<string>();
    for (const a of plan.actions) {
      if (!alive()) break;
      phase(`${a.kind} ${a.key}`);
      const spec = specs.get(a.sym) ?? null;
      const px = prices.get(a.sym) ?? 0;
      const positionSide = oneway ? "BOTH" : a.side === 1 ? "LONG" : "SHORT";
      const into = a.side === 1 ? "BUY" : "SELL";
      const out = a.side === 1 ? "SELL" : "BUY";
      const reduceOnly: Record<string, string> = oneway ? { reduceOnly: "true" } : {};
      const res: ControlAction & { ok: boolean; msg?: string } = { ...a, ok: false };
      control.actions.push(res);
      const grows = a.kind === "open" || a.kind === "increase";
      const waitKey = `${connHash}|${grows ? "open" : "exit"}|${a.key}`;
      const w = waiting(waitKey);
      if (w) {
        res.msg = `waiting after a failure: ${w}`;
        if (!grows) exitBlocked.add(a.sym);
        continue;
      }
      if (repairClosed.has(a.key)) {
        res.msg = "closed by the stop repair this step";
        continue;
      }
      if (
        a.kind === "open" &&
        (lagging.has(a.key) || (oneway && (lagging.has(`${a.sym}|1`) || lagging.has(`${a.sym}|-1`))))
      ) {
        res.msg = "opened moments ago — the position read lags; not opened again";
        continue;
      }
      if (grows && oneway && exitBlocked.has(a.sym)) {
        res.msg = "the other side is not closed yet — not opening";
        continue;
      }
      // the order sent in this action (its row turns to "error" when the exchange refuses it)
      let sent: { coid: string; kind: string; qty: number; px: number } | null = null;
      try {
        if (grows) {
          if (!pricesFresh) throw holdOn("prices older than 30 s — not opening / increasing");
          if (openBlock) throw holdOn(openBlock);
          if (modeError) throw holdOn(modeError);
          if (noSpecs) throw holdOn("contract specs unavailable — not opening");
          if (!specs.has(a.sym)) throw holdOn(`${a.sym} is not listed — not opening`);
          await ensureMargin(a.sym);
          await ensureLeverage(a.sym, a.side);
          if (!(px > 0)) throw new Error("no fresh price");
          const vmin = venueMins(rt).get(a.sym)?.qty ?? 0;
          const minUsd = bx.exchangeMinNotional(spec, px);
          let qty: number;
          if (a.kind === "increase") {
            // an increase is a DELTA: snapped down, never raised. Raised to the exchange minimum, a small delta was
            // sent as a whole minimum, the position ended above its target (and its cap), and the reduce that
            // followed was under the minimum — so the overshoot was kept forever. A delta under the minimum is not
            // sent: the position is kept as it is (never closed for it).
            qty = bx.snapQtyDown(a.qty, spec);
            const have = held.get(a.key) ?? 0;
            const capUsd = positionCapFor(positionCapOf(s), acct?.equity ?? null, s.maxPositionX);
            if (!(qty > 0) || qty < Math.max(spec?.minQty ?? 0, vmin) - 1e-12 || qty * px < minUsd - 1e-9)
              throw holdOn("increase under the exchange minimum — kept");
            if ((have + qty) * px > Math.max(capUsd, minUsd) * 1.0001)
              throw holdOn("increase would take the position past its cap — kept");
          } else {
            // the plan quantity is already exchange-valid; never floor it again (that drops under the minimum)
            qty = bx.snapQtyExchange(a.qty, px, spec, vmin).qty;
            // holdOn, not Error: this is a sizing fact about the symbol, not a failed order — an Error here armed
            // the open backoff for the key and kept it out of the book long after the price moved
            if (!(qty > 0) || qty * px < minUsd - 1e-9)
              throw holdOn(`${a.sym} cannot be sized to the exchange minimum at ${px}`);
          }
          // free-margin floor within the step: each open takes its margin off the room before it is sent
          const marginNeed =
            marginRoom === Infinity ? 0 : (qty * px) / (await levOf(a.sym, a.side));
          if (marginNeed > marginRoom) {
            const m = `free-margin floor: ${marginNeed.toFixed(2)} USDT needed, ${Math.max(0, marginRoom).toFixed(2)} left`;
            // an open the floor refuses leaves the targets for a while: its position-cap slot goes to the next one
            if (a.kind === "open") {
              const F = local(rt).floorRefused;
              F.set(a.key, { until: Date.now() + FLOOR_WAIT_MS, msg: m });
              if (F.size > 2_000) F.clear();
            }
            throw holdOn(m);
          }
          const ek = entryCoidKind("cfg" in a ? a.cfg : undefined);
          const coid = makeCoid(s.connId, ek);
          // the range is in the client id (ek); the ledger kind stays open / increase, so the own-quantity
          // ledger and the recent-entry check count range positions as ours
          sent = { coid, kind: a.kind === "open" ? "O" : "I", qty, px };
          // an open means the key holds nothing of ours: whatever the ledger still counts there (a stop-out just
          // now) is gone — it restarts from this open
          if (a.kind === "open" && (ledger.get(a.key) ?? 0) > 0) {
            record(
              `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
              a,
              "F",
              0,
              0,
              "ok",
              "reopened",
            );
            ledger.set(a.key, 0);
          }
          record(coid, a, sent.kind, qty, px, "pending");
          const place = (c: string, q: number) =>
            ex.order({
              symbol: a.sym,
              side: into,
              positionSide,
              type: "MARKET",
              quantity: q,
              clientOrderID: c,
            });
          let resp: unknown;
          try {
            resp = await place(coid, qty);
          } catch (err) {
            // the cached contract spec can sit a hair under the live minimum ("minimum order amount is X")
            const named = bx.minQtyFromReject(err instanceof Error ? err.message : String(err));
            // the named minimum goes into the snap as a floor, so the retry cannot come back a lot step under the
            // number the exchange just gave us — which is exactly how SOLV was refused twice in a row
            const up = named != null ? bx.snapQtyExchange(qty, px, spec, named).qty : 0;
            // never more than 10× what was asked: a misread amount (USDT read as coins) must not size up.
            // The per-position cap gives way to the CONTRACT's minimum notional — that is the smallest tradable size,
            // so refusing it would mean never trading the symbol — but no further: a named amount past that is a
            // number we cannot corroborate, and a misread must not open a position the cap would never allow. When
            // the contract's own minimum really has moved, the next spec refresh carries it and the target path
            // sizes to it (bounded by MIN_RAISE_X) instead.
            const cap = positionCapFor(positionCapOf(s), acct?.equity ?? null, s.maxPositionX);
            const after = (a.kind === "increase" ? (held.get(a.key) ?? 0) : 0) + up;
            if (
              !(err instanceof bx.ExchangeRejected) ||
              !(up > qty) ||
              up > qty * 10 ||
              after * px > Math.max(cap, bx.exchangeMinNotional(spec, px)) * 1.0001
            )
              throw err;
            if (named != null) learnVenueMin(rt, a.sym, "qty", named);
            record(coid, a, sent.kind, qty, px, "error", err.message);
            qty = up;
            const retry = makeCoid(s.connId, ek);
            sent = { coid: retry, kind: sent.kind, qty, px };
            record(retry, a, sent.kind, qty, px, "pending");
            resp = await place(retry, qty);
          }
          // what executed, not what was asked: a partial entry must not be counted as ours in full, and the
          // stop and the margin that follow are sized to what we actually hold
          const got = executedQty(resp, qty);
          const partMsg = got < qty - 1e-12 ? `partial: ${got} of ${qty}` : "";
          qty = got;
          record(sent.coid, a, sent.kind, qty, px, "ok", partMsg);
          fill(sent.coid, a, sent.kind, qty, px, resp);
          sent = null;
          status.placed++;
          if (marginRoom !== Infinity) {
            const used = (qty * px) / (await levOf(a.sym, a.side));
            marginRoom -= used;
            Lm.marginSpent.push({ at: Date.now(), usd: used });
          }
          if (a.kind === "open") {
            // from the fill, not the reference ticker: a slipped fill would otherwise move the stop by the slip
            const fpx = parseFill(resp)?.px ?? px;
            const learned = () => venueMins(rt).get(a.sym)?.stop ?? 0;
            // snapped AND at least the venue's minimum distance away on the right side of the mark: a stop that
            // lands on the wrong side is refused, and the refusal below closes the position we just opened
            let stopPrice = bx.stopPxExchange(fpx, a.side, a.stopDist, spec, learned());
            let sc = makeCoid(s.connId, "S");
            const placeStop = (c: string, sp: number) =>
              ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "STOP_MARKET",
                // BingX still requires quantity even when closePosition closes the whole side
                quantity: qty,
                stopPrice: sp,
                closePosition: "true",
                workingType: "MARK_PRICE",
                clientOrderID: c,
              });
            try {
              if (!(qty > 0) || !(stopPrice > 0))
                throw new Error("stop needs a quantity and a price");
              try {
                await placeStop(sc, stopPrice);
              } catch (err) {
                // refused for being too close to the mark: widen once and try again. Closing the position is the
                // last resort, not the first answer — a refused stop used to cost the whole position.
                const msg = err instanceof Error ? err.message : String(err);
                if (!bx.stopTooClose(msg)) throw err;
                const wider = bx.widenStopDist(a.stopDist, fpx, spec);
                learnVenueMin(rt, a.sym, "stop", wider);
                record(sc, a, "S", qty, stopPrice, "error", msg);
                stopPrice = bx.stopPxExchange(fpx, a.side, wider, spec, wider);
                sc = makeCoid(s.connId, "S");
                await placeStop(sc, stopPrice);
                rt.db.event(
                  "warn",
                  `control ${a.key}: stop refused as too close — re-placed at ${(wider * 100).toFixed(2)} % (${stopPrice})`,
                );
              }
              record(sc, a, "S", qty, stopPrice, "ok");
            } catch (err) {
              // never leave a control position without its protective stop: close it again
              record(
                sc,
                a,
                "S",
                qty,
                stopPrice,
                "error",
                String(err instanceof Error ? err.message : err),
              );
              const cc = makeCoid(s.connId, "C");
              await ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "MARKET",
                quantity: qty,
                clientOrderID: cc,
                ...reduceOnly,
              });
              record(cc, a, "X", qty, px, "ok", "protective close");
              status.closed++;
              throw new Error(
                `stop failed, position closed: ${err instanceof Error ? err.message : err}`,
              );
            }
          }
        } else {
          // a close sends the whole held size: snapped to the lot step so a float sum (0.30000000000000004) never
          // exceeds the quantity precision, and never to zero while something is held (dust below the step is
          // sent at the precision instead, so the position still gets its close attempt)
          const down = bx.snapQtyDown(a.qty, spec);
          const qty =
            a.kind === "close"
              ? down > 0
                ? down
                : Number(a.qty.toFixed(Math.max(0, spec?.qtyPrec ?? 8)))
              : down;
          if (!(qty > 0)) throw holdOn(`${a.kind} of ${a.qty} is under the lot step — nothing to send`);
          // a reduce under the exchange minimum is refused every step forever (and each refusal blocks this
          // symbol's opens): the position is already within one exchange lot of its target, so it is held as it
          // is. A full close is never held back this way — it is sent whatever its size.
          if (a.kind === "reduce" && px > 0 && qty * px < bx.exchangeMinNotional(spec, px) - 1e-9)
            throw holdOn(
              `reduce of ${(qty * px).toFixed(2)} USDT is under the exchange minimum — the position is kept as it is`,
            );
          const coid = makeCoid(s.connId, "C");
          sent = { coid, kind: a.kind === "close" ? "X" : "R", qty, px };
          record(coid, a, sent.kind, qty, px, "pending");
          const resp = await ex.order({
            symbol: a.sym,
            side: out,
            positionSide,
            type: "MARKET",
            quantity: qty,
            clientOrderID: coid,
            ...reduceOnly,
          });
          // the ledger counts what executed, not what was asked: a partial close that recorded the full size
          // would zero our own quantity and hand the residual to the foreign-position guard, unprotected
          const got = executedQty(resp, qty);
          const part = got < qty - 1e-12;
          record(coid, a, sent.kind, got, px, "ok", part ? `partial: ${got} of ${qty}` : "");
          fill(coid, a, sent.kind, got, px, resp);
          sent = null;
          if (a.kind === "close" && part) {
            // the rest is still open and still ours: its stop stays where it is and the next step closes the
            // remainder (the plan reads the book again)
            rt.db.event("warn", `partial close ${a.key}: ${got} of ${qty} — the rest is closed next step`);
          } else if (a.kind === "close") {
            status.closed++;
            for (const o of book.orders)
              if (
                o.id &&
                o.venueSymbol === a.sym &&
                isOwnCoid(o.clientOrderId, s.connId) &&
                (oneway || !o.positionSide || o.positionSide === positionSide) &&
                (await ex.cancel(o.venueSymbol, o.id))
              )
                status.cancelled++;
          }
        }
        res.ok = true;
        cleared(waitKey);
      } catch (err) {
        res.msg = errText(err);
        // the side is already flat: a stop filled, or a close of ours landed after the book read this step used.
        // The exit it asked for has happened — the row is recorded as done and the ledger restarts from flat, so
        // the step does not back off and retry a close against nothing.
        if (!grows && err instanceof bx.ExchangeRejected && bx.alreadyFlat(res.msg)) {
          if (sent) record(sent.coid, a, sent.kind, sent.qty, sent.px, "ok", "already flat");
          record(
            `flat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
            a,
            "F",
            0,
            0,
            "ok",
            "already flat",
          );
          ledger.set(a.key, 0);
          if (a.kind === "close") status.closed++;
          res.ok = true;
          res.msg = "already flat";
          cleared(waitKey);
          continue;
        }
        const holding = !!(err as { hold?: boolean }).hold;
        // a refused exit leaves the position where it was: in one-way mode the opposite side waits until it is
        // gone. A hold ("nothing to send this step") is not a refusal and never blocks this symbol's opens.
        if (!grows && !holding) exitBlocked.add(a.sym);
        // refused by the exchange: nothing executed, the row is an error (a time-out stays pending: it may have filled)
        if (sent && err instanceof bx.ExchangeRejected)
          record(sent.coid, a, sent.kind, sent.qty, sent.px, "error", res.msg);
        // conditions that clear by themselves (stale prices, not ready, unknown equity, a mode waiting for its
        // retry) are not failures of this action
        if (!holding) {
          const [base, max] = grows ? OPEN_BACKOFF : EXIT_BACKOFF;
          failed(waitKey, res.msg, base, max);
          rt.db.event("error", `control ${a.kind} ${a.key}: ${res.msg}`);
        }
      }
    }
    liveKvSet(rt.db, "controlStatus", control);
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    const until = bx.noteRateLimit(status.error);
    if (until) {
      status.reason = `exchange rate limit until ${new Date(until).toISOString()}`;
      const L = local(rt);
      if (L.rateLimitLogged !== until) {
        L.rateLimitLogged = until;
        rt.db.event("warn", `live control paused: ${status.reason}`);
      }
    } else rt.db.event("error", `live control step: ${status.error}`);
  }
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}

function done(rt: CoreRuntime, status: LiveStatus, reason: string): LiveStatus {
  status.reason = reason;
  liveKvSet(rt.db, "liveStatus", status);
  rt.emit?.("live");
  return status;
}
