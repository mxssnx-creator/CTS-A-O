// Shared helpers of the test suites (no behaviour of their own): a simulated hedge-mode exchange, a minimal runtime
// for the live step, a seeded random source and the pinned synthetic end. The control suites import these instead
// of carrying their own copies, so a fix to the simulated venue applies to every suite.
import { CoreDb } from "./server/db.server.ts";
import type { ExchangeClient } from "./server/live.server.ts";
import { DEFAULT_SETTINGS, type CoreSettings } from "./config.ts";
import { ExchangeRejected, type AccountSnapshot } from "./exchange/bingx.server.ts";
import type { Trade } from "./domain/types.ts";
import { unitStatsOf } from "./metrics/stats.ts";
import { minPfOf, rangeOfId } from "./minimal-coord.ts";
import { isSignalInd } from "./indications/registry.ts";
import { executionRecordKey, ownedPaperExecutionRecords, postBaseExecutionRecords, type OwnedPaperClose } from "./live-record.ts";
import { ENGINE_PROOF_PF, promotionGate, type LiveGate } from "./live-validation.ts";

export const H = 3_600_000;

/** The synthetic market's end in tests: a fixed UTC hour, so every run sees the same bars, buckets and windows. */
export const PINNED_END = Date.UTC(2026, 8, 30, 12);

/** Pin the synthetic end unless the file pinned its own (call before a runtime is constructed). */
export function pinSyntheticEnd(end = PINNED_END) {
  process.env.CTS_CORE_SYNTHETIC_END ??= String(end);
  return Number(process.env.CTS_CORE_SYNTHETIC_END);
}

/** The part of a CoreRuntime the tracker releases (structural: this module does not load the runtime). */
export interface Disposable {
  stop(): void;
  dispose(): void;
  backtestsSettled?(): Promise<void>;
}

/**
 * The runtimes a test file builds, released together: dispose/cancel → drain owned preset tasks → close the shared
 * pool. Cancellation must precede worker shutdown so an ordinary worker exit cannot start a local fallback.
 * Track every runtime a test constructs, started or not: the stall watch starts in the constructor.
 */
export function trackRuntimes() {
  const rts = new Set<Disposable>();
  return {
    track<T extends Disposable>(rt: T): T {
      rts.add(rt);
      return rt;
    },
    async disposeAll() {
      if (!rts.size) return;
      const all = [...rts];
      rts.clear();
      await releaseAll(all);
    },
    /** one runtime now (a test that is done with it before it builds the next) */
    async release(rt: Disposable) {
      rts.delete(rt);
      await releaseAll([rt]);
    },
  };
}

async function releaseAll(all: readonly Disposable[]) {
  for (const r of all) { r.stop(); r.dispose(); }
  const { closePool } = await import("./server/pool.server.ts");
  try {
    await Promise.all(all.map((r) => r.backtestsSettled?.()));
  } finally {
    await closePool();
  }
}

/**
 * The preset comparison on for one test (npm run test:core runs with CTS_CORE_COMPARE=0, as desks and sessions do:
 * every test compute packed and replayed the tapes once per preset). Call it before the runtime computes; the returned
 * function restores the previous value. The runtime reads the variable at each compute.
 */
export function compareOn(): () => void {
  const prev = process.env.CTS_CORE_COMPARE;
  process.env.CTS_CORE_COMPARE = "1";
  return () => {
    if (prev === undefined) delete process.env.CTS_CORE_COMPARE;
    else process.env.CTS_CORE_COMPARE = prev;
  };
}

/** A seeded linear congruential source in [0, 1). */
export function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

export type SimOrder = {
  id: string;
  venueSymbol: string;
  symbol: string;
  clientOrderId?: string;
  positionSide?: "LONG" | "SHORT";
  type?: string;
  stopPrice?: number;
  /** a partial order's quantity (closePosition: the whole side) */
  qty?: number;
  closePosition?: boolean;
};

/**
 * A simulated BingX hedge-mode venue: positions per symbol and position side, resting orders, an order log, and the
 * failure modes the live step must survive (rejects, time-outs after a fill, hidden positions, refused symbols, a
 * contracts outage, the one-stop-per-position-side rule).
 */
export class SimExchange implements ExchangeClient {
  /** `${sym}|LONG|SHORT` → qty */
  positions = new Map<string, number>();
  orders: SimOrder[] = [];
  /** every order request as sent */
  log: Array<Record<string, string | number>> = [];
  sent = 0;
  rejectRate = 0;
  timeoutAfterFillRate = 0;
  key = "key-A";
  emptyContracts = false;
  /**
   * BingX keeps one close-position stop (and take-profit) per position side (the live rule x01 ran into); partial
   * stops and take-profits rest beside it (VST, 7 Oct)
   */
  oneStopPerSide = false;
  /** positions the book read does not show (the exchange lags right after an open) */
  hide = new Set<string>();
  /** the liquidation price the venue reports per position (`${sym}|LONG|SHORT`) */
  liq = new Map<string, number>();
  /** the account's cap on open TP/SL (conditional) orders, every symbol together (BingX: 200); unset = none */
  tpslCap?: number;
  /** orders that left the book: filled (at their trigger) or cancelled — what orderStatus answers */
  done = new Map<string, { status: "FILLED" | "CANCELLED"; px?: number; qty?: number }>();
  /** the account's order history as the venue reports it (allOrders rows, every order): what ordersSince answers */
  history: Array<Record<string, unknown>> = [];
  private hist(o: SimOrder | { venueSymbol: string; positionSide?: string; clientOrderId?: string; type?: string }, status: string, px?: number, qty?: number, side?: string) {
    const ps = o.positionSide ?? "LONG";
    this.history.push({
      symbol: o.venueSymbol,
      positionSide: ps,
      // a close order sells a long and buys back a short
      side: side ?? (ps === "LONG" ? "SELL" : "BUY"),
      type: o.type ?? "MARKET",
      status,
      avgPrice: px ?? 0,
      executedQty: qty ?? 0,
      clientOrderId: o.clientOrderId ?? "",
      updateTime: Date.now(),
    });
  }
  /** symbols whose market opens the exchange refuses */
  refuse = new Set<string>();
  /** fills by symbol and side with their price, for P&L reconciliation */
  fills: Array<{
    sym: string;
    ps: "LONG" | "SHORT";
    into: boolean;
    qty: number;
    px: number;
    t: number;
  }> = [];
  /** price per venue symbol used for fills (set by the test) */
  px = new Map<string, number>();
  equityUsd: number | null = null;
  symbols = 12;
  /** contract names: `${prefix}${i}-USDT` (S0-USDT…; a synthetic runtime trades SYN0-USDT…) */
  prefix = "S";
  private seq = 0;
  r: () => number;
  constructor(
    r: () => number = rng(1),
    opts: Partial<Pick<SimExchange, "oneStopPerSide" | "symbols" | "key" | "prefix">> = {},
  ) {
    this.r = r;
    Object.assign(this, opts);
  }
  hasKeys() {
    return true;
  }
  fingerprint() {
    return `bingx-vst-02|testnet|sim|${this.key}`;
  }
  async book() {
    return {
      positions: [...this.positions.entries()]
        .filter(([k]) => !this.hide.has(k))
        .map(([k, qty]) => {
          const [venueSymbol, ps] = k.split("|");
          return {
            symbol: venueSymbol,
            venueSymbol,
            side: ps === "LONG" ? ("long" as const) : ("short" as const),
            qty,
            ...(this.liq.has(k) ? { liq: this.liq.get(k) } : {}),
          };
        }),
      orders: this.orders.map((o) => ({ ...o })),
    };
  }
  async contracts() {
    const m = new Map();
    if (this.emptyContracts) return m;
    for (let i = 0; i < this.symbols; i++) {
      const sym = `${this.prefix}${i}-USDT`;
      m.set(sym, { symbol: sym, minQty: 0.001, step: 0.001, qtyPrec: 3, pxPrec: 4, minUsdt: 2 });
    }
    return m;
  }
  async setMarginMode(_sym: string, _mode: "cross" | "isolated") {}
  account?: () => Promise<AccountSnapshot | null>;
  leverage?: ExchangeClient["leverage"];
  setLeverage?: ExchangeClient["setLeverage"];
  async order(p: Record<string, string | number>): Promise<unknown> {
    this.sent++;
    this.log.push(p);
    // A venue rejection proves no execution. Keep transport timeouts below as unknown outcomes: their fills
    // must be recovered from order history rather than guessed or retried as though nothing executed.
    if (this.r() < this.rejectRate) throw new ExchangeRejected("simulated reject", 1);
    const sym = String(p.symbol);
    const ps = String(p.positionSide) as "LONG" | "SHORT";
    const key = `${sym}|${ps}`;
    let marketReply: unknown;
    if (p.type === "MARKET") {
      const into = (ps === "LONG" && p.side === "BUY") || (ps === "SHORT" && p.side === "SELL");
      if (into && this.refuse.has(sym)) throw new ExchangeRejected("simulated refusal", 1);
      const q = Number(p.quantity);
      const cur = this.positions.get(key) ?? 0;
      const next = +(into ? cur + q : Math.max(0, cur - q)).toFixed(6);
      this.fills.push({
        sym,
        ps,
        into,
        qty: into ? q : cur - next,
        px: this.px.get(sym) ?? NaN,
        t: Date.now(),
      });
      const executed = into ? q : cur - next;
      this.hist({ venueSymbol: sym, positionSide: ps, clientOrderId: p.clientOrderID === undefined ? "" : String(p.clientOrderID) }, "FILLED", this.px.get(sym) ?? NaN, executed, String(p.side));
      // Synthetic exchange explicitly confirms filled quantity; production must never infer it from an empty reply.
      marketReply = { order: { status: "FILLED", executedQty: executed, avgPrice: this.px.get(sym) ?? 0 } };
      if (next > 0) this.positions.set(key, next);
      else this.positions.delete(key);
    } else {
      if (
        this.oneStopPerSide &&
        p.type === "STOP_MARKET" &&
        String(p.closePosition) === "true" &&
        this.orders.some(
          (o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "STOP_MARKET" && o.closePosition !== false,
        )
      )
        throw new ExchangeRejected("Position SL order already exists", 109400);
      // and one close-position take-profit
      if (
        this.oneStopPerSide &&
        p.type === "TAKE_PROFIT_MARKET" &&
        String(p.closePosition) === "true" &&
        this.orders.some(
          (o) =>
            o.venueSymbol === sym && o.positionSide === ps && o.type === "TAKE_PROFIT_MARKET" && o.closePosition !== false,
        )
      )
        throw new ExchangeRejected("Position TP order already exists", 109400);
      if (this.tpslCap !== undefined && this.orders.length >= this.tpslCap)
        throw new ExchangeRejected("The number of your TP/SL orders has exceeded the limit.", 101400);
      const id = `o${++this.seq}`;
      this.orders.push({
        id,
        venueSymbol: sym,
        symbol: sym,
        clientOrderId: String(p.clientOrderID),
        positionSide: ps,
        type: String(p.type),
        stopPrice: p.stopPrice === undefined ? undefined : Number(p.stopPrice),
        qty: Number(p.quantity),
        closePosition: String(p.closePosition) === "true",
      });
      if (this.r() < this.timeoutAfterFillRate) throw new Error("simulated timeout after fill");
      return { order: { orderId: id } };
    }
    if (this.r() < this.timeoutAfterFillRate) throw new Error("simulated timeout after fill");
    return marketReply;
  }
  async cancel(_sym: string, id: string) {
    const o = this.orders.find((x) => x.id === id);
    this.orders = this.orders.filter((x) => x.id !== id);
    if (o) {
      this.done.set(id, { status: "CANCELLED" });
      this.hist(o, "CANCELLED");
    }
    return !!o;
  }
  async ordersSince(sym: string, from: number) {
    return { orders: this.history.filter((h) => h.symbol === sym && Number(h.updateTime) >= from) };
  }
  async orderStatus(_sym: string, id: string) {
    const d = this.done.get(id);
    if (d) return { order: { orderId: id, status: d.status, avgPrice: d.px ?? 0, executedQty: d.qty ?? 0 } };
    return this.orders.some((o) => o.id === id) ? { order: { orderId: id, status: "NEW" } } : null;
  }
  /**
   * One resting order triggers: a partial one reduces its side by its quantity at its trigger price, a closePosition
   * one closes the side; it leaves the book filled (the venue cancels nothing else with a partial fill)
   */
  triggerOrder(id: string) {
    const o = this.orders.find((x) => x.id === id);
    if (!o) return;
    const k = `${o.venueSymbol}|${o.positionSide}`;
    const cur = this.positions.get(k) ?? 0;
    const q = o.closePosition ? cur : Math.min(cur, o.qty ?? 0);
    const next = +(cur - q).toFixed(6);
    this.fills.push({ sym: o.venueSymbol, ps: o.positionSide as "LONG" | "SHORT", into: false, qty: q, px: o.stopPrice ?? NaN, t: Date.now() });
    if (next > 0) this.positions.set(k, next);
    else this.positions.delete(k);
    this.orders = this.orders.filter((x) => x !== o);
    this.done.set(id, { status: "FILLED", px: o.stopPrice, qty: q });
    this.hist(o, "FILLED", o.stopPrice, q);
  }
  /** a stop triggers: the position and its stop disappear */
  triggerRandomStop() {
    const own = [...this.positions.keys()].filter((k) =>
      this.orders.some(
        (o) => o.venueSymbol === k.split("|")[0] && o.clientOrderId?.startsWith("CTSB"),
      ),
    );
    if (!own.length) return;
    this.triggerStop(own[Math.floor(this.r() * own.length)]);
  }
  /** the stop of this position (`sym|LONG|SHORT`) triggers: it closes at the stop price and its stop is gone */
  triggerStop(k: string, type = "STOP_MARKET") {
    const [sym, ps] = k.split("|") as [string, "LONG" | "SHORT"];
    const stop = this.orders.find(
      (o) => o.venueSymbol === sym && o.positionSide === ps && o.type === type,
    );
    const qty = this.positions.get(k) ?? 0;
    if (qty > 0)
      this.fills.push({
        sym,
        ps,
        into: false,
        qty,
        px: stop?.stopPrice ?? this.px.get(sym) ?? NaN,
        t: Date.now(),
      });
    this.positions.delete(k);
    if (stop) this.hist(stop, "FILLED", stop.stopPrice, qty);
    for (const o of this.orders)
      if (o !== stop && o.venueSymbol === sym && o.positionSide === ps && o.clientOrderId?.startsWith("CTSB"))
        this.hist(o, "CANCELLED");
    this.orders = this.orders.filter(
      (o) =>
        !(o.venueSymbol === sym && o.positionSide === ps && o.clientOrderId?.startsWith("CTSB")),
    );
  }
  /**
   * a close by hand in the venue's app (or another system's order): the position (`sym|LONG|SHORT`) closes at the
   * market by an order that is not ours, and the venue cancels every stop and take-profit of the side with it (BingX,
   * x02 7 Oct 13:50: a close-all cancelled the backstops and the lane orders)
   */
  closeByHand(k: string, px = this.px.get(k.split("|")[0]) ?? NaN) {
    const [sym, ps] = k.split("|") as [string, "LONG" | "SHORT"];
    const qty = this.positions.get(k) ?? 0;
    if (!(qty > 0)) return;
    this.fills.push({ sym, ps, into: false, qty, px, t: Date.now() });
    this.positions.delete(k);
    this.hist({ venueSymbol: sym, positionSide: ps }, "FILLED", px, qty);
    // every conditional order on the side goes with it: the position's stop and take-profit and the partial ones
    const cond = (o: SimOrder) => o.venueSymbol === sym && o.positionSide === ps && /^(STOP|TAKE_PROFIT)/.test(o.type ?? "");
    for (const o of this.orders)
      if (cond(o)) {
        this.done.set(o.id, { status: "CANCELLED" });
        this.hist(o, "CANCELLED");
      }
    this.orders = this.orders.filter((o) => !cond(o));
  }
  /**
   * the take-profit of this position triggers: it closes at that price. `keepStop`: the venue leaves the position's
   * stop resting (else it cancels every close order of the position with it, as triggerStop does)
   */
  triggerTarget(k: string, keepStop = false) {
    const [sym, ps] = k.split("|") as [string, "LONG" | "SHORT"];
    if (!keepStop) return this.triggerStop(k, "TAKE_PROFIT_MARKET");
    const tp = this.orders.find(
      (o) => o.venueSymbol === sym && o.positionSide === ps && o.type === "TAKE_PROFIT_MARKET",
    );
    const qty = this.positions.get(k) ?? 0;
    if (qty > 0) this.fills.push({ sym, ps, into: false, qty, px: tp?.stopPrice ?? NaN, t: Date.now() });
    this.positions.delete(k);
    if (tp) this.hist(tp, "FILLED", tp.stopPrice, qty);
    this.orders = this.orders.filter((o) => o !== tp);
  }
  withEquity(eq: number) {
    this.equityUsd = eq;
    this.account = async () => ({
      equity: this.equityUsd,
      wallet: this.equityUsd,
      unrealized: 0,
      realized: 0,
      usedMargin: 0,
      availableMargin: this.equityUsd,
    });
    return this;
  }
  /** the market opens sent for this symbol */
  opens(sym: string) {
    return this.log.filter(
      (p) =>
        p.type === "MARKET" &&
        p.symbol === sym &&
        (p.side === "BUY") === (p.positionSide === "LONG"),
    );
  }
}

export type FakePaperPosition = {
  cfg: string;
  sym: string;
  side: 1 | -1;
  entry: number;
  stop: number;
  vol: number;
  /** Intrinsic ladder weight, independent of the external execution multiple. */
  w?: number;
  level?: number;
  legs?: Partial<Record<"config" | "overall" | "symbol" | "direction" | "indication" | "type", number>>;
  entryT?: number;
  /** the lane's target price (unset: none) */
  target?: number;
  trailOn?: boolean;
};

type SyntheticLane = Pick<FakePaperPosition, "cfg" | "sym" | "side">;
type SyntheticTrade = Trade & { unitR?: number | null };

/** Actual settled synthetic outcomes, rather than a summary that merely claims a known PF. */
export function syntheticExecutionRun(
  lanes: readonly SyntheticLane[],
  returns: readonly (number | null)[] = [-0.01, 0.015],
  n = 50,
  now = Date.now(),
) {
  if (!returns.length) throw new RangeError("synthetic returns must not be empty");
  const trades: SyntheticTrade[] = [];
  for (const lane of lanes) for (let i = 0; i < n; i++) {
    const r = returns[i % returns.length];
    const exitT = now - (n - i) * 1_000;
    trades.push({ ...lane, entryT: exitT - 1_000, exitT, entry: 100,
      exit: 100 * (1 + lane.side * (r ?? 0)), r: r ?? 0, unitR: r,
      reason: "time", bars: 1, mfe: Math.max(0, r ?? 0), mae: Math.min(0, r ?? 0) });
  }
  trades.sort((a, b) => a.exitT - b.exitT);
  const stats = unitStatsOf(trades, now);
  return { trades, openAtEnd: [] as Trade[], startT: now - (n + 2) * 1_000, endT: now,
    stats, stable: stats.unknownReturns === 0 && stats.net > 0 && stats.pf >= 1.1 };
}

interface SyntheticFixtureRuntime {
  settings: Pick<CoreSettings, "gates" | "live">;
  sim: ReturnType<typeof syntheticExecutionRun>;
  livePromotionGate?: (lane: SyntheticLane, now?: number) => LiveGate;
}
type SyntheticEvidenceOptions = {
  modelReturns?: readonly (number | null)[];
  ownedReturns?: readonly (number | null)[];
  ownedNotionalUsd?: number | null;
};
const syntheticEvidence = new WeakMap<SyntheticFixtureRuntime, {
  lanes: Map<string, { lane: SyntheticLane; options: SyntheticEvidenceOptions }>;
  managedSim: SyntheticFixtureRuntime["sim"];
  owned: OwnedPaperClose[];
}>();

/**
 * Authorize only identities explicitly declared by a synthetic fixture. Model outcomes and funded owned-paper
 * outcomes are independent records and are judged by the production strict gate. No venue fills are invented.
 * An explicitly replaced model (including negative/unknown fixtures) is preserved on later lane declarations.
 */
export function authorizeSyntheticLanes(
  rt: SyntheticFixtureRuntime,
  lanes: readonly SyntheticLane[],
  options?: SyntheticEvidenceOptions,
) {
  let evidence = syntheticEvidence.get(rt);
  if (!evidence) {
    evidence = { lanes: new Map(), managedSim: rt.sim, owned: [] };
    syntheticEvidence.set(rt, evidence);
  }
  for (const lane of lanes) {
    const key = executionRecordKey(lane.cfg, lane.sym, lane.side);
    evidence.lanes.set(key, { lane: { ...lane }, options: options ?? evidence.lanes.get(key)?.options ?? {} });
  }
  const n = Math.max(50, 2 * Math.max(1, rt.settings.gates.minTrades ?? 0,
    rt.settings.live.liveLastN ?? 25, rt.settings.live.engineProofN ?? 0));
  const now = Date.now();
  const trades: SyntheticTrade[] = [];
  const owned: OwnedPaperClose[] = [];
  for (const { lane, options: opt } of evidence.lanes.values()) {
    trades.push(...syntheticExecutionRun([lane], opt.modelReturns, n, now).trades);
    const ownedReturns = opt.ownedReturns ?? [-0.008, 0.012];
    if (!ownedReturns.length) throw new RangeError("synthetic owned returns must not be empty");
    for (let i = 0; i < n; i++) owned.push({ ...lane, exitT: now - (n - i) * 1_000,
      unitR: ownedReturns[i % ownedReturns.length], ownedNotionalUsd: opt.ownedNotionalUsd === undefined ? 10 : opt.ownedNotionalUsd });
  }
  trades.sort((a, b) => a.exitT - b.exitT);
  if (rt.sim === evidence.managedSim) {
    const stats = unitStatsOf(trades, now);
    rt.sim = { trades, openAtEnd: [], startT: now - (n + 2) * 1_000, endT: now,
      stats, stable: stats.unknownReturns === 0 && stats.net > 0 && stats.pf >= 1.1 };
    evidence.managedSim = rt.sim;
  }
  evidence.owned = owned;
  const execution = ownedPaperExecutionRecords(owned);
  let modelTrades: Trade[] | undefined;
  let model: ReturnType<typeof postBaseExecutionRecords> = new Map();
  rt.livePromotionGate = (lane, at = Date.now()) => {
    const key = executionRecordKey(lane.cfg, lane.sym, lane.side);
    if (modelTrades !== rt.sim.trades) {
      modelTrades = rt.sim.trades;
      model = Array.isArray(modelTrades) ? postBaseExecutionRecords(modelTrades) : new Map();
    }
    const minN = Math.max(1, rt.settings.gates.minTrades ?? 0,
      rt.settings.live.liveLastN ?? 25, rt.settings.live.engineProofN ?? 0);
    const ind = lane.cfg.split("|")[1] ?? "";
    const minPf = Math.max(minPfOf(rt.settings.gates, rangeOfId(lane.cfg), ind),
      rt.settings.live.liveMinPf ?? 0,
      (rt.settings.live.engineProofN ?? 0) > 0 && !isSignalInd(ind) ? rt.settings.live.engineProofPf ?? ENGINE_PROOF_PF : 0);
    return promotionGate(model.get(key), execution.get(key), 0, at, minN, minPf);
  };
}

/**
 * The part of a runtime the live step reads, in Overall mode with explicit notionals (equity-% sizing is tested
 * separately). Prices: S0 10, S1 17, S2 24, S3 31, … (10 + 7·i).
 */
export function fakeRt(db: CoreDb = new CoreDb(":memory:"), symbols = 12) {
  const prices = Array.from({ length: symbols }, (_, i) => ({
    sym: `S${i}-USDT`,
    last: 10 + i * 7,
  }));
  let positions: FakePaperPosition[] = [];
  const rt = {
    generation: 1,
    db,
    settings: {
      ...DEFAULT_SETTINGS,
      sizing: { mode: "fixed" as const, pct: 0.02 },
      live: {
        ...DEFAULT_SETTINGS.live,
        enabled: true,
        mode: "overall" as const,
        notionalUsd: 10,
        maxPositions: 100,
        maxNotionalUsd: 40,
        ratio: 1,
        rebalancePct: 0.25,
      } as typeof DEFAULT_SETTINGS.live,
    },
    sim: syntheticExecutionRun([]),
    livePromotionGate: undefined as SyntheticFixtureRuntime["livePromotionGate"],
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: {
      // Declaring a lane in this synthetic runtime authorizes exactly that fixture identity. Array pushes are
      // declarations too; arbitrary queried siblings still have neither model nor owned execution evidence.
      get positions(): FakePaperPosition[] { return positions; },
      set positions(next: FakePaperPosition[]) {
        positions = new Proxy(next, { set(target, property, value) {
          const result = Reflect.set(target, property, value);
          if (property !== "length") authorizeSyntheticLanes(rt, target);
          return result;
        } });
        authorizeSyntheticLanes(rt, next);
      },
    },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
  authorizeSyntheticLanes(rt, []);
  return { rt, prices };
}
export type FakeRt = ReturnType<typeof fakeRt>["rt"];

/** One paper lane at price px with a stop stopFrac away on its own side. */
export const lane = (
  cfg: string,
  sym: string,
  side: 1 | -1,
  px: number,
  vol = 1,
  stopFrac = 0.04,
): FakePaperPosition => ({
  cfg,
  sym,
  side,
  entry: px,
  stop: px * (1 - side * stopFrac),
  vol,
});
