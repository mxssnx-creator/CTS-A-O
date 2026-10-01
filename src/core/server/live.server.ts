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
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import type { CoreDb } from "./db.server.ts";
import * as bx from "../exchange/bingx.server.ts";
import type { LiveSettings } from "../config.ts";
import {
  controlOwnership,
  capHeldToOwn,
  controlTargets,
  externalCloses,
  isOwnCoid,
  lanesByKey,
  liveNetwork,
  entryCoidKind,
  makeCoid,
  ownSymbols,
  planControl,
  planLive,
  stateHash,
  type BookView,
  type ControlAction,
  type ControlContribution,
  type ControlTarget,
} from "./live.ts";

/** Everything the executor needs from an exchange. The default is BingX; tests inject a simulated exchange. */
export interface ExchangeClient {
  hasKeys(): boolean;
  /** identity of the connection: conn id, network, host and a one-way fingerprint of the API key (never the key) */
  fingerprint(): string;
  book(): Promise<BookView>;
  contracts(): Promise<Map<string, bx.ContractSpec>>;
  order(p: Record<string, string | number>): Promise<unknown>;
  cancel(venueSymbol: string, orderId: string): Promise<boolean>;
  setPositionMode?(mode: "hedge" | "oneway"): Promise<void>;
  setMarginMode?(venueSymbol: string, mode: "cross" | "isolated"): Promise<void>;
  /** account equity (USDT) for fixed-%-of-equity sizing; absent / null = use the paper balance */
  equity?(): Promise<number | null>;
  /** balance snapshot (open PnL, realized, margin); absent on a simulated exchange */
  account?(): Promise<bx.AccountSnapshot | null>;
}

/** Fill price / commission from an order reply (BingX: data.order.{avgPrice, commission}); null when absent. */
export function parseFill(resp: unknown): { px: number; fee: number } | null {
  const o = ((resp as { order?: unknown })?.order ?? resp) as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const px = Number(o.avgPrice ?? o.price ?? 0);
  const fee = Math.abs(Number(o.commission ?? o.fee ?? 0)) || 0;
  return px > 0 ? { px, fee } : null;
}

/** "already in that mode" replies are success */
const alreadySet = (msg: string) => /no need|already|not modified|same|repeat/i.test(msg);

/**
 * The exchange book is re-read over REST at most every `syncMs` (the live step runs every tick, 100 ms); an own
 * order or cancel forces the next read, so decisions never act on a book that predates our own change.
 * Contract specs change rarely: cached 10 minutes.
 */
const bookCache = new Map<string, { at: number; book: BookView; dirty: boolean }>();
const contractCache = new Map<string, { at: number; specs: Map<string, bx.ContractSpec> }>();
export function cachedClient(ex: ExchangeClient, syncMs: number): ExchangeClient {
  const key = () => ex.fingerprint();
  const touch = () => {
    const c = bookCache.get(key());
    if (c) c.dirty = true;
  };
  return {
    ...ex,
    book: async () => {
      const c = bookCache.get(key());
      if (c && !c.dirty && Date.now() - c.at < syncMs) return c.book;
      const book = await ex.book();
      bookCache.set(key(), { at: Date.now(), book, dirty: false });
      return book;
    },
    contracts: async () => {
      const c = contractCache.get(key());
      if (c && Date.now() - c.at < 600_000) return c.specs;
      const specs = await ex.contracts();
      contractCache.set(key(), { at: Date.now(), specs });
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
    book: () => bx.fetchBook(network, connId),
    contracts: () => bx.fetchContracts(network),
    order: (p) => bx.signed(network, connId, "POST", "/openApi/swap/v2/trade/order", p),
    cancel: (sym, id) => bx.cancelOrder(network, connId, sym, id),
    setPositionMode: (mode) => bx.setPositionMode(network, connId, mode),
    setMarginMode: (sym, mode) => bx.setMarginMode(network, connId, sym, mode),
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
  if (sz.mode === "fixed") return s.notionalUsd;
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

/** The unit the control preview shows: the last equity read for the connection (no exchange call), else the paper balance. */
export function liveUnitPeek(rt: CoreRuntime): {
  unit: number;
  from: "equity" | "paper" | "fixed";
} {
  const s = rt.settings.live;
  const sz = sizingSettings(rt.settings.sizing);
  if (sz.mode === "fixed") return { unit: s.notionalUsd, from: "fixed" };
  for (const [k, c] of equityCache)
    if (k.startsWith(`${s.connId}|`) && c.eq !== null)
      return { unit: unitNotional(sz, c.eq, s.notionalUsd), from: "equity" };
  return { unit: unitNotional(sz, rt.settings.paperBalance, s.notionalUsd), from: "paper" };
}

/** The control sizing of the live settings for one lane unit — shared by the live step and the preview. */
export function controlSettingsOf(s: LiveSettings, unit: number, signalMaxPositions = 0) {
  return {
    notionalUsd: unit,
    ratio: s.ratio ?? 1,
    maxNotionalUsd: s.maxNotionalUsd ?? s.notionalUsd * 5,
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
/** foreign excess already reported (one event per position size) */
const warnedExcess = new Set<string>();
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
let rateLimitLogged = 0;
export function resetLiveBackoff() {
  backoff.clear();
  equityCache.clear();
  entriesSent.clear();
  rateLimitLogged = 0;
  bx.clearRateLimit();
}
const OPEN_BACKOFF = [60_000, 30 * 60_000] as const;
const EXIT_BACKOFF = [5_000, 60_000] as const;
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
  /** lane order ids per control key (to recognise a position closed outside this system) */
  lanes?: Record<string, string[]>;
  /** lane orders held back after an external close (kept at 0: a manual close does not stop processing) */
  suppressed?: number;
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

async function stampAccount(status: LiveStatus, ex: ExchangeClient, book: BookView) {
  let snap: bx.AccountSnapshot | null = null;
  if (ex.account) {
    try {
      snap = await ex.account();
    } catch {
      /* the position sums still describe the open book */
    }
  }
  status.account = liveAccount(book, snap);
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

let running: Promise<unknown> | null = null;

/** Serialised entry point: overlapping calls wait for the running step instead of racing it. */
export function stepLive(
  rt: CoreRuntime,
  intents: LiveIntent[],
  gen: number,
  client?: ExchangeClient,
): Promise<LiveStatus> {
  // the live state is persisted at most once a second: the runtime flushes it on shutdown
  rt.flushLive ??= () => flushLiveKv(rt.db);
  const next: Promise<LiveStatus> = (running ?? Promise.resolve(null)).then(() =>
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
      if (running === tail) running = null;
    });
  running = tail;
  return next;
}

let lastEntries: { at: number; status: LiveStatus } | null = null;
/** entry keys already recorded (sent or tried): an intent stays pending for its whole bar but is sent once */
const entriesSent = new Set<string>();
const intentKey = (i: { cfg: string; sym: string; barT: number }) => `${i.cfg}|${i.sym}|${i.barT}`;

async function runStep(rt: CoreRuntime, intents: LiveIntent[], gen: number): Promise<LiveStatus> {
  const s = rt.settings.live;
  // entries mode reads the book over REST: with nothing new to send it runs at most every syncMs, not every tick
  const fresh = intents.filter((i) => !entriesSent.has(intentKey(i)));
  if (!fresh.length && lastEntries && Date.now() - lastEntries.at < (s.syncMs ?? 1000))
    return lastEntries.status;
  const st = await runStepNow(rt, intents, gen);
  lastEntries = { at: Date.now(), status: st };
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
  const alive = () => rt.generation === gen;
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
    rt.db.run(
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
    // every intent ever recorded (pending, ok or error) is never sent again
    const sent = new Set(
      rt.db.all<{ k: string }>("SELECT msg AS k FROM live_orders WHERE kind = 'E'").map((r) => r.k),
    );
    for (const i of intents) if (sent.has(intentKey(i))) entriesSent.add(intentKey(i));
    if (entriesSent.size > 20_000) entriesSent.clear();
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

    // clean-up: own stop/target orders on symbols that are flat now
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId)) continue;
      if (!o.id || book.positions.some((p) => p.venueSymbol === o.venueSymbol)) continue;
      if (await bx.cancelOrder(network, s.connId, o.venueSymbol, o.id)) status.cancelled++;
    }

    // protection pass: an own position without own stop (e.g. an entry whose reply timed out) gets a
    // protective close at market — entries mode never leaves a position unprotected across steps
    for (const p of book.positions) {
      if (!alive()) break;
      if (!own.has(p.venueSymbol)) continue;
      if (
        book.orders.some(
          (o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, s.connId),
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
    const unit = Math.min(raw, s.maxNotionalUsd ?? s.notionalUsd * 5);
    for (const e of plan.entries) {
      if (!alive()) break;
      const spec = specs.get(e.sym) ?? null;
      const px = fresh.get(e.sym) ?? 0;
      if (!(px > 0)) {
        status.skipped.push({ sym: e.sym, why: "no fresh price" });
        continue;
      }
      const minNotional = bx.exchangeMinNotional(spec, px);
      if (minNotional > unit) {
        status.skipped.push({
          sym: e.sym,
          why: `exchange minimum $${minNotional.toFixed(2)} > notional $${unit.toFixed(2)}`,
        });
        continue;
      }
      const sized = bx.snapQtyExchange(unit / px, px, spec);
      const qty = sized.qty;
      if (!(qty > 0) || (qty * px > unit * 1.0001 && !sized.raised)) {
        status.skipped.push({ sym: e.sym, why: "size rounds outside the notional cap" });
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
      entriesSent.add(key);
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
      const sl = bx.snapPx(e.side === 1 ? px * (1 - e.sl) : px * (1 + e.sl), spec);
      const tp = bx.snapPx(e.side === 1 ? px * (1 + e.tp) : px * (1 - e.tp), spec);
      let protectedOk = true;
      for (const [kind, type, stopPrice] of [
        ["S", "STOP_MARKET", sl],
        ["T", "TAKE_PROFIT_MARKET", tp],
      ] as const) {
        const c = makeCoid(s.connId, kind);
        try {
          await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym,
            side: exitSide,
            positionSide,
            type,
            quantity: qty,
            stopPrice,
            closePosition: "true",
            workingType: "MARK_PRICE",
            clientOrderID: c,
          });
          record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "ok", key);
        } catch (err) {
          protectedOk = false;
          record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "error", key);
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
export function laneContributions(rt: CoreRuntime): ControlContribution[] {
  // a lane whose stop was crossed at tick time no longer asks for its volume (its stop executes live now)
  return rt.paper.positions
    .filter((p) => !p.stopHit)
    .map((p) => ({
      id: `${p.cfg}|${p.sym}|${p.entryT}`,
      cfg: p.cfg,
      sym: p.sym,
      side: p.side,
      vol: (p as { vol?: number }).vol ?? 1,
      sl: Math.abs(p.entry - p.stop) / p.entry || 0.05,
    }));
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
  const alive = () => rt.generation === gen;
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
  ) =>
    rt.db.run(
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
      Date.now(),
    );
  try {
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    if (!s.enabled) return done(rt, status, "live disabled in settings");
    if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host");
    if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`);
    const banned = bx.rateLimitedUntil();
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
    const book = await ex.book();
    await stampAccount(status, ex, book);
    // positions we opened in the last 10 minutes may not carry their stop yet (also a fill whose reply timed out)
    const recent = new Set(
      rt.db
        .all<{ k: string }>(
          "SELECT DISTINCT substr(cfg, 9) AS k FROM live_orders WHERE cfg LIKE 'control|%' AND kind IN ('O', 'I') AND status IN ('ok', 'pending') AND at > ?",
          Date.now() - 600_000,
        )
        .map((r) => r.k),
    );
    const { held, foreign } = controlOwnership(book, s.connId, recent);
    // only what this system opened: a larger exchange position (someone else added to the same symbol and
    // direction) is partly foreign — its excess is never reduced, closed or rebalanced
    const ledger = new Map<string, number>(
      rt.db
        .all<{ k: string; q: number }>(
          `SELECT substr(cfg, 9) AS k,
                  SUM(CASE WHEN kind IN ('O', 'I') AND status IN ('ok', 'pending') THEN qty
                           WHEN kind IN ('X', 'R') AND status = 'ok' THEN -qty ELSE 0 END) AS q
             FROM live_orders WHERE cfg LIKE 'control|%' GROUP BY k`,
        )
        .map((r) => [r.k, r.q] as const),
    );
    for (const x of capHeldToOwn(held, ledger)) {
      const mk = `foreign-excess|${x.key}|${x.exchange}`;
      if (!warnedExcess.has(mk)) {
        warnedExcess.add(mk);
        if (warnedExcess.size > 500) warnedExcess.clear();
        rt.db.event(
          "warn",
          `live: ${x.key} holds ${x.exchange} on the exchange but this system opened ${x.own} — the excess is not ours and is never touched`,
        );
      }
    }
    const specs = await ex.contracts();
    const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last] as const));
    // stale prices: never open or increase (closing / reducing stays allowed)
    const pricesFresh = Date.now() - rt.tickersAt <= 30_000;
    // a position closed outside this system (manually, or by its stop) does not stop processing.
    // the lanes that still hold it in the simulation stay targets, so the next step puts it back.
    const suppressed: Record<string, { key: string; at: number }> = {};
    if (!reconnected)
      for (const x of externalCloses(prev, held)) {
        rt.db.event(
          "info",
          `live: ${x.key} was closed outside CTS-A-O — processing continues (${x.lanes.length} lane order(s) stay active)`,
        );
      }
    const allLanes = laneContributions(rt);
    liveKvSet(rt.db, "controlSuppressed", suppressed);
    const lanes = allLanes;
    // one lane volume unit: fixed % of the account equity (or the fixed notional); unknown equity → nothing is
    // sized: held positions are kept as they are (closes of lanes that ended still run), nothing opens or grows
    const unit = await liveUnit(rt, ex);
    const { targets, skipped } = controlTargets(
      lanes,
      prices,
      controlSettingsOf(s, unit ?? 0, rt.settings.signals.maxPositions),
      (sym, q, px) => bx.snapQtyExchange(q, px, specs.get(sym) ?? null),
    );
    const keep = new Set(skipped.flatMap((x) => (x.keep ? [x.keep] : [])));
    if (unit === null) for (const l of lanes) keep.add(`${l.sym}|${l.side}`);
    const openBlock = notReady ?? (unit === null ? "account equity unknown — not sizing" : null);
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
    });
    status.enabled = true;
    status.reason = openBlock
      ? `armed — opening blocked: ${openBlock}`
      : "armed (overall control orders)";
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
      held: [...held.entries()].map(([key, qty]) => ({ key, qty })),
      actions: [],
      lanes: lanesByKey(lanes),
      suppressed: Object.keys(suppressed).length,
    };
    status.control = control;

    // account modes: position mode once per connection + mode; margin mode once per symbol. A mode the exchange
    // refuses blocks opening (closing stays possible) — never trade in a mode other than the configured one.
    const posMode = s.positionMode ?? "hedge";
    const marginMode = s.marginMode ?? "cross";
    const oneway = posMode === "oneway";
    const modes = rt.db.kvGet<{ key: string; margin: Record<string, string> }>("liveModes") ?? {
      key: "",
      margin: {},
    };
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
          cleared(modeWait);
        } catch (err) {
          const msg = errText(err);
          if (alreadySet(msg)) {
            modes.key = modeKey;
            modes.margin = {};
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
    if (modeError) status.reason = `armed — opening blocked: ${modeError}`;
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

    // own orders left on a (symbol, side) that is flat now: cancel
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      const flat = !book.positions.some(
        (p) =>
          p.venueSymbol === o.venueSymbol &&
          (!o.positionSide || (p.side === "long") === (o.positionSide === "LONG")),
      );
      if (flat && (await ex.cancel(o.venueSymbol, o.id))) status.cancelled++;
    }

    // repair: every own position must carry its protective stop (e.g. a fill whose reply timed out before the stop)
    const closing = new Set(plan.actions.filter((a) => a.kind === "close").map((a) => a.key));
    for (const [key, qty] of held) {
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
      const dist = plan.targets.find((t) => t.key === key)?.stopDist ?? 0.05;
      const a = { key, sym, side };
      const repairKey = `${connHash}|repair|${key}`;
      if (waiting(repairKey)) continue;
      const sc = makeCoid(s.connId, "S");
      try {
        if (!(px > 0)) throw new Error("no fresh price");
        const stopPrice = bx.snapPx(side === 1 ? px * (1 - dist) : px * (1 + dist), spec);
        if (!(qty > 0) || !(stopPrice > 0)) throw new Error("stop needs a quantity and a price");
        await ex.order({
          symbol: sym,
          side: side === 1 ? "SELL" : "BUY",
          positionSide,
          type: "STOP_MARKET",
          quantity: qty,
          stopPrice,
          closePosition: "true",
          workingType: "MARK_PRICE",
          clientOrderID: sc,
        });
        record(sc, a, "S", qty, stopPrice, "ok", "repair");
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

    for (const a of plan.actions) {
      if (!alive()) break;
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
        continue;
      }
      // the order sent in this action (its row turns to "error" when the exchange refuses it)
      let sent: { coid: string; kind: string; qty: number; px: number } | null = null;
      try {
        if (grows) {
          if (!pricesFresh) throw holdOn("prices older than 30 s — not opening / increasing");
          if (openBlock) throw holdOn(openBlock);
          if (modeError) throw holdOn(modeError);
          if (specs.size > 0 && !specs.has(a.sym))
            throw holdOn(`${a.sym} is not listed — not opening`);
          await ensureMargin(a.sym);
          if (!(px > 0)) throw new Error("no fresh price");
          // the plan quantity is already exchange-valid; never floor it again (that drops under the minimum)
          let qty = bx.snapQtyExchange(a.qty, px, spec).qty;
          if (!(qty > 0) || qty * px < bx.exchangeMinNotional(spec, px) - 1e-9)
            throw new Error("below the exchange minimum");
          const ek = entryCoidKind("cfg" in a ? a.cfg : undefined);
          const coid = makeCoid(s.connId, ek);
          // the range is in the client id (ek); the ledger kind stays open / increase, so the own-quantity
          // ledger and the recent-entry check count range positions as ours
          sent = { coid, kind: a.kind === "open" ? "O" : "I", qty, px };
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
            const up = named != null ? bx.snapQtyExchange(Math.max(qty, named), px, spec).qty : 0;
            if (!(err instanceof bx.ExchangeRejected) || !(up > qty)) throw err;
            record(coid, a, sent.kind, qty, px, "error", err.message);
            qty = up;
            const retry = makeCoid(s.connId, ek);
            sent = { coid: retry, kind: sent.kind, qty, px };
            record(retry, a, sent.kind, qty, px, "pending");
            resp = await place(retry, qty);
          }
          record(sent.coid, a, sent.kind, qty, px, "ok");
          fill(sent.coid, a, sent.kind, qty, px, resp);
          sent = null;
          status.placed++;
          if (a.kind === "open") {
            const stopPrice = bx.snapPx(
              a.side === 1 ? px * (1 - a.stopDist) : px * (1 + a.stopDist),
              spec,
            );
            const sc = makeCoid(s.connId, "S");
            try {
              if (!(qty > 0) || !(stopPrice > 0))
                throw new Error("stop needs a quantity and a price");
              await ex.order({
                symbol: a.sym,
                side: out,
                positionSide,
                type: "STOP_MARKET",
                // BingX still requires quantity even when closePosition closes the whole side
                quantity: qty,
                stopPrice,
                closePosition: "true",
                workingType: "MARK_PRICE",
                clientOrderID: sc,
              });
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
          const qty = a.kind === "close" ? a.qty : bx.snapQtyDown(a.qty, spec);
          if (!(qty > 0)) throw new Error("reduce rounds to zero");
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
          record(coid, a, sent.kind, qty, px, "ok");
          fill(coid, a, sent.kind, qty, px, resp);
          sent = null;
          if (a.kind === "close") {
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
        // refused by the exchange: nothing executed, the row is an error (a time-out stays pending: it may have filled)
        if (sent && err instanceof bx.ExchangeRejected)
          record(sent.coid, a, sent.kind, sent.qty, sent.px, "error", res.msg);
        // conditions that clear by themselves (stale prices, not ready, unknown equity, a mode waiting for its
        // retry) are not failures of this action
        if (!(err as { hold?: boolean }).hold) {
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
      if (rateLimitLogged !== until) {
        rateLimitLogged = until;
        rt.db.event("warn", `live control paused: ${status.reason}`);
      }
    } else rt.db.event("error", `live control step: ${status.error}`);
  }
  liveKvSet(rt.db, "liveStatus", status);
  return status;
}

function done(rt: CoreRuntime, status: LiveStatus, reason: string): LiveStatus {
  status.reason = reason;
  liveKvSet(rt.db, "liveStatus", status);
  return status;
}
