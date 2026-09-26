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
import { createHash } from "node:crypto";
import type { CoreRuntime, LiveIntent } from "./runtime.server.ts";
import * as bx from "../exchange/bingx.server.ts";
import type { LiveSettings } from "../config.ts";
import {
  controlOwnership,
  controlTargets,
  isOwnCoid,
  liveNetwork,
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
  };
}

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
}

let running: Promise<LiveStatus> | null = null;

/** Serialised entry point: overlapping calls wait for the running step instead of racing it. */
export function stepLive(rt: CoreRuntime, intents: LiveIntent[], gen: number, client?: ExchangeClient): Promise<LiveStatus> {
  const next = (running ?? Promise.resolve(null as unknown as LiveStatus)).then(() =>
    (rt.settings.live.mode ?? "overall") === "overall" ? runControl(rt, gen, client ?? bingxClient(rt.settings.live.connId)) : runStep(rt, intents, gen),
  );
  running = next.finally(() => {
    if (running === next) running = null;
  });
  return next;
}

async function runStep(rt: CoreRuntime, intents: LiveIntent[], gen: number): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = { at: Date.now(), enabled: false, reason: "", placed: 0, closed: 0, cancelled: 0, skipped: [], error: null };
  const alive = () => rt.generation === gen;
  const record = (coid: string, cfg: string, sym: string, side: number, kind: string, qty: number, px: number, st: string, key: string) =>
    rt.db.run(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid, cfg, sym, side, kind, qty, px, st, key, Date.now(),
    );
  try {
    const network = liveNetwork(s.connId);
    const keys = bx.keysFor(s.connId);
    const hasKeys = !!(keys.apiKey && keys.secret);
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    let book: BookView | null = null;
    if (s.enabled && envArmed && hasKeys) {
      try {
        book = await bx.fetchBook(network, s.connId);
      } catch (err) {
        rt.db.event("warn", `live book: ${err instanceof Error ? err.message : err}`);
      }
    }
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    const ready = !sim
      ? { ok: false, why: "no simulated run yet" }
      : sim.stats.pf < minPf || !sim.stable
        ? { ok: false, why: `simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}` }
        : { ok: true, why: "" };
    const dayAgo = Date.now() - 24 * 3_600_000;
    const recent = new Set(rt.db.all<{ sym: string }>("SELECT DISTINCT sym FROM live_orders WHERE kind = 'E' AND status IN ('ok', 'pending') AND at > ?", dayAgo).map((r) => r.sym));
    const own = book ? ownSymbols(book, s.connId, recent) : new Set<string>();
    // every intent ever recorded (pending, ok or error) is never sent again
    const sent = new Set(rt.db.all<{ k: string }>("SELECT msg AS k FROM live_orders WHERE kind = 'E'").map((r) => r.k));
    const plan = planLive({
      ready,
      settings: s,
      envArmed,
      hasKeys,
      book,
      ownSyms: own,
      sent,
      newestBarT: rt.status.lastBarT,
      intents: intents.map((i) => ({ cfg: i.cfg, sym: i.sym, side: i.side, tp: i.protect.tp, sl: i.protect.sl, barT: i.barT })),
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

    if (!plan.entries.length || !alive()) return status;
    const specs = await bx.fetchContracts(network);
    const fresh = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last]));
    for (const e of plan.entries) {
      if (!alive()) break;
      const spec = specs.get(e.sym) ?? null;
      const px = fresh.get(e.sym) ?? 0;
      if (!(px > 0)) {
        status.skipped.push({ sym: e.sym, why: "no fresh price" });
        continue;
      }
      const minNotional = bx.exchangeMinNotional(spec, px);
      if (minNotional > s.notionalUsd) {
        status.skipped.push({ sym: e.sym, why: `exchange minimum $${minNotional.toFixed(2)} > notional $${s.notionalUsd}` });
        continue;
      }
      const qty = bx.snapQtyDown(s.notionalUsd / px, spec);
      if (!(qty > 0) || qty * px > s.notionalUsd * 1.0001) {
        status.skipped.push({ sym: e.sym, why: "size rounds outside the notional cap" });
        continue;
      }
      const side = e.side === 1 ? "BUY" : "SELL";
      const exitSide = e.side === 1 ? "SELL" : "BUY";
      const positionSide = e.side === 1 ? "LONG" : "SHORT";
      const key = `${e.cfg}|${e.sym}|${e.barT}`;
      const coid = makeCoid(s.connId, "E");
      record(coid, e.cfg, e.sym, e.side, "E", qty, px, "pending", key);
      try {
        await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", { symbol: e.sym, side, positionSide, type: "MARKET", quantity: qty, clientOrderID: coid });
        record(coid, e.cfg, e.sym, e.side, "E", qty, px, "ok", key);
        status.placed++;
      } catch (err) {
        record(coid, e.cfg, e.sym, e.side, "E", qty, px, "error", key);
        rt.db.event("error", `live entry ${e.sym}: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      const sl = bx.snapPx(e.side === 1 ? px * (1 - e.sl) : px * (1 + e.sl), spec);
      const tp = bx.snapPx(e.side === 1 ? px * (1 + e.tp) : px * (1 - e.tp), spec);
      let protectedOk = true;
      for (const [kind, type, stopPrice] of [["S", "STOP_MARKET", sl], ["T", "TAKE_PROFIT_MARKET", tp]] as const) {
        const c = makeCoid(s.connId, kind);
        try {
          await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
            symbol: e.sym, side: exitSide, positionSide, type, stopPrice, closePosition: "true", workingType: "MARK_PRICE", clientOrderID: c,
          });
          record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "ok", key);
        } catch (err) {
          protectedOk = false;
          record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "error", key);
          rt.db.event("error", `live ${kind} ${e.sym}: ${err instanceof Error ? err.message : err}`);
        }
      }
      if (!protectedOk) {
        // never leave an unprotected position: close it at market (own qty only)
        const c = makeCoid(s.connId, "C");
        try {
          await bx.signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", { symbol: e.sym, side: exitSide, positionSide, type: "MARKET", quantity: qty, clientOrderID: c });
          record(c, e.cfg, e.sym, e.side, "C", qty, px, "ok", key);
          status.closed++;
        } catch (err) {
          record(c, e.cfg, e.sym, e.side, "C", qty, px, "error", key);
          rt.db.event("error", `live protective close ${e.sym} FAILED: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
  }
  rt.db.kvSet("liveStatus", status);
  return status;
}

// ── Overall control orders ─────────────────────────────────────────────────────

/** Paper positions of every lane → contributions (one per lane position, with its Block volume). */
export function laneContributions(rt: CoreRuntime): ControlContribution[] {
  return rt.paper.positions.map((p) => ({
    cfg: p.cfg,
    sym: p.sym,
    side: p.side,
    vol: (p as { vol?: number }).vol ?? 1,
    sl: Math.abs(p.entry - p.stop) / p.entry || 0.05,
  }));
}

async function runControl(rt: CoreRuntime, gen: number, ex: ExchangeClient): Promise<LiveStatus> {
  const s = rt.settings.live;
  const status: LiveStatus = { at: Date.now(), enabled: false, reason: "", placed: 0, closed: 0, cancelled: 0, skipped: [], error: null, mode: "overall" };
  const alive = () => rt.generation === gen;
  const prev = rt.db.kvGet<ControlStatus>("controlStatus");
  const record = (coid: string, a: { key: string; sym: string; side: number }, kind: string, qty: number, px: number, st: string, msg = "") =>
    rt.db.run(
      "INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      coid, `control|${a.key}`, a.sym, a.side, kind, qty, px, st, msg, Date.now(),
    );
  try {
    const envArmed = process.env.CTS_CORE_LIVE === "1";
    const sim = rt.sim;
    const minPf = rt.settings.gates.minPf;
    if (!s.enabled) return done(rt, status, "live disabled in settings");
    if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host");
    if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`);
    if (!sim || sim.stats.pf < minPf || !sim.stable)
      return done(rt, status, !sim ? "not ready: no simulated run yet" : `not ready: simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}`);
    const connHash = stateHash([ex.fingerprint()]);
    const reconnected = !!prev && prev.connHash !== connHash;
    if (reconnected) rt.db.event("warn", `live connection changed (${prev!.connHash} → ${connHash}): full re-sync from the exchange book`);
    const book = await ex.book();
    // positions we opened in the last 10 minutes may not carry their stop yet (also a fill whose reply timed out)
    const recent = new Set(rt.db.all<{ k: string }>("SELECT DISTINCT substr(cfg, 9) AS k FROM live_orders WHERE cfg LIKE 'control|%' AND kind IN ('O', 'I') AND status IN ('ok', 'pending') AND at > ?", Date.now() - 600_000).map((r) => r.k));
    const { held, foreign } = controlOwnership(book, s.connId, recent);
    const specs = await ex.contracts();
    const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last] as const));
    const { targets, skipped } = controlTargets(laneContributions(rt), prices, { notionalUsd: s.notionalUsd, ratio: s.ratio ?? 1, maxNotionalUsd: s.maxNotionalUsd ?? s.notionalUsd * 5, maxPositions: s.maxPositions, rebalancePct: s.rebalancePct ?? 0.25 }, (sym, q) => bx.snapQtyDown(q, specs.get(sym) ?? null));
    const bookParts = [
      ...[...held.entries()].sort().map(([k, q]) => `P:${k}:${q}`),
      ...book.orders.filter((o) => isOwnCoid(o.clientOrderId, s.connId)).map((o) => `O:${o.clientOrderId}`).sort(),
    ];
    const plan = planControl({ targets, held, foreign, rebalancePct: s.rebalancePct ?? 0.25, bookParts });
    status.enabled = true;
    status.reason = "armed (overall control orders)";
    status.skipped = [...skipped, ...plan.skipped];
    const unchanged = !reconnected && !!prev && prev.targetsHash === plan.hashes.targets && prev.bookHash === plan.hashes.book && plan.actions.length === 0;
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
    };
    status.control = control;

    // own orders left on a (symbol, side) that is flat now: cancel
    for (const o of book.orders) {
      if (!alive()) break;
      if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
      const flat = !book.positions.some((p) => p.venueSymbol === o.venueSymbol && (!o.positionSide || (p.side === "long") === (o.positionSide === "LONG")));
      if (flat && (await ex.cancel(o.venueSymbol, o.id))) status.cancelled++;
    }

    // repair: every own position must carry its protective stop (e.g. a fill whose reply timed out before the stop)
    const closing = new Set(plan.actions.filter((a) => a.kind === "close").map((a) => a.key));
    for (const [key, qty] of held) {
      if (!alive()) break;
      if (closing.has(key)) continue;
      const [sym, sd] = key.split("|");
      const side = (Number(sd) === 1 ? 1 : -1) as 1 | -1;
      const positionSide = side === 1 ? "LONG" : "SHORT";
      if (book.orders.some((o) => o.venueSymbol === sym && isOwnCoid(o.clientOrderId, s.connId) && (!o.positionSide || o.positionSide === positionSide))) continue;
      const px = prices.get(sym) ?? 0;
      const spec = specs.get(sym) ?? null;
      const dist = plan.targets.find((t) => t.key === key)?.stopDist ?? 0.05;
      const a = { key, sym, side };
      const sc = makeCoid(s.connId, "S");
      try {
        if (!(px > 0)) throw new Error("no fresh price");
        const stopPrice = bx.snapPx(side === 1 ? px * (1 - dist) : px * (1 + dist), spec);
        await ex.order({ symbol: sym, side: side === 1 ? "SELL" : "BUY", positionSide, type: "STOP_MARKET", stopPrice, closePosition: "true", workingType: "MARK_PRICE", clientOrderID: sc });
        record(sc, a, "S", qty, stopPrice, "ok", "repair");
        rt.db.event("warn", `control ${key}: protective stop was missing — re-placed`);
      } catch (err) {
        record(sc, a, "S", qty, 0, "error", "repair");
        try {
          const cc = makeCoid(s.connId, "C");
          await ex.order({ symbol: sym, side: side === 1 ? "SELL" : "BUY", positionSide, type: "MARKET", quantity: qty, clientOrderID: cc });
          record(cc, a, "X", qty, px, "ok", "protective close (stop repair failed)");
          status.closed++;
          held.delete(key);
        } catch (e2) {
          rt.db.event("error", `control ${key}: UNPROTECTED — stop repair and close failed: ${e2 instanceof Error ? e2.message : e2} (${err instanceof Error ? err.message : err})`);
        }
      }
    }

    for (const a of plan.actions) {
      if (!alive()) break;
      const spec = specs.get(a.sym) ?? null;
      const px = prices.get(a.sym) ?? 0;
      const positionSide = a.side === 1 ? "LONG" : "SHORT";
      const into = a.side === 1 ? "BUY" : "SELL";
      const out = a.side === 1 ? "SELL" : "BUY";
      const res: ControlAction & { ok: boolean; msg?: string } = { ...a, ok: false };
      control.actions.push(res);
      try {
        if (a.kind === "open" || a.kind === "increase") {
          const qty = bx.snapQtyDown(a.qty, spec);
          if (!(px > 0)) throw new Error("no fresh price");
          if (!(qty > 0) || qty * px < bx.exchangeMinNotional(spec, px)) throw new Error("below the exchange minimum");
          const coid = makeCoid(s.connId, "E");
          record(coid, a, a.kind === "open" ? "O" : "I", qty, px, "pending");
          await ex.order({ symbol: a.sym, side: into, positionSide, type: "MARKET", quantity: qty, clientOrderID: coid });
          record(coid, a, a.kind === "open" ? "O" : "I", qty, px, "ok");
          status.placed++;
          if (a.kind === "open") {
            const stopPrice = bx.snapPx(a.side === 1 ? px * (1 - a.stopDist) : px * (1 + a.stopDist), spec);
            const sc = makeCoid(s.connId, "S");
            try {
              await ex.order({ symbol: a.sym, side: out, positionSide, type: "STOP_MARKET", stopPrice, closePosition: "true", workingType: "MARK_PRICE", clientOrderID: sc });
              record(sc, a, "S", qty, stopPrice, "ok");
            } catch (err) {
              // never leave a control position without its protective stop: close it again
              record(sc, a, "S", qty, stopPrice, "error", String(err instanceof Error ? err.message : err));
              const cc = makeCoid(s.connId, "C");
              await ex.order({ symbol: a.sym, side: out, positionSide, type: "MARKET", quantity: qty, clientOrderID: cc });
              record(cc, a, "X", qty, px, "ok", "protective close");
              status.closed++;
              throw new Error(`stop failed, position closed: ${err instanceof Error ? err.message : err}`);
            }
          }
        } else {
          const qty = a.kind === "close" ? a.qty : bx.snapQtyDown(a.qty, spec);
          if (!(qty > 0)) throw new Error("reduce rounds to zero");
          const coid = makeCoid(s.connId, "C");
          record(coid, a, a.kind === "close" ? "X" : "R", qty, px, "pending");
          await ex.order({ symbol: a.sym, side: out, positionSide, type: "MARKET", quantity: qty, clientOrderID: coid });
          record(coid, a, a.kind === "close" ? "X" : "R", qty, px, "ok");
          if (a.kind === "close") {
            status.closed++;
            for (const o of book.orders)
              if (o.id && o.venueSymbol === a.sym && isOwnCoid(o.clientOrderId, s.connId) && (!o.positionSide || o.positionSide === positionSide) && (await ex.cancel(o.venueSymbol, o.id))) status.cancelled++;
          }
        }
        res.ok = true;
      } catch (err) {
        res.msg = err instanceof Error ? err.message : String(err);
        rt.db.event("error", `control ${a.kind} ${a.key}: ${res.msg}`);
      }
    }
    rt.db.kvSet("controlStatus", control);
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    rt.db.event("error", `live control step: ${status.error}`);
  }
  rt.db.kvSet("liveStatus", status);
  return status;
}

function done(rt: CoreRuntime, status: LiveStatus, reason: string): LiveStatus {
  status.reason = reason;
  rt.db.kvSet("liveStatus", status);
  return status;
}
