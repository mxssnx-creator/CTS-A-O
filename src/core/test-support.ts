// Shared helpers of the test suites (no behaviour of their own): a simulated hedge-mode exchange, a minimal runtime
// for the live step, a seeded random source and the pinned synthetic end. The control suites import these instead
// of carrying their own copies, so a fix to the simulated venue applies to every suite.
import { CoreDb } from "./server/db.server.ts";
import type { ExchangeClient } from "./server/live.server.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { ExchangeRejected, type AccountSnapshot } from "./exchange/bingx.server.ts";

export const H = 3_600_000;

/** The synthetic market's end in tests: a fixed UTC hour, so every run sees the same bars, buckets and windows. */
export const PINNED_END = Date.UTC(2026, 8, 30, 12);

/** Pin the synthetic end unless the file pinned its own (call before a runtime is constructed). */
export function pinSyntheticEnd(end = PINNED_END) {
  process.env.CTS_CORE_SYNTHETIC_END ??= String(end);
  return Number(process.env.CTS_CORE_SYNTHETIC_END);
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
  /** orders that left the book: filled (at their trigger) or cancelled — what orderStatus answers */
  done = new Map<string, { status: "FILLED" | "CANCELLED"; px?: number; qty?: number }>();
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
    if (this.r() < this.rejectRate) throw new Error("simulated reject");
    const sym = String(p.symbol);
    const ps = String(p.positionSide) as "LONG" | "SHORT";
    const key = `${sym}|${ps}`;
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
    return undefined;
  }
  async cancel(_sym: string, id: string) {
    const n = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== id);
    if (this.orders.length < n) this.done.set(id, { status: "CANCELLED" });
    return this.orders.length < n;
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
    this.orders = this.orders.filter(
      (o) =>
        !(o.venueSymbol === sym && o.positionSide === ps && o.clientOrderId?.startsWith("CTSB")),
    );
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
  entryT?: number;
  /** the lane's target price (unset: none) */
  target?: number;
  trailOn?: boolean;
};

/**
 * The part of a runtime the live step reads, in Overall mode with explicit notionals (equity-% sizing is tested
 * separately). Prices: S0 10, S1 17, S2 24, S3 31, … (10 + 7·i).
 */
export function fakeRt(db: CoreDb = new CoreDb(":memory:"), symbols = 12) {
  const prices = Array.from({ length: symbols }, (_, i) => ({
    sym: `S${i}-USDT`,
    last: 10 + i * 7,
  }));
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
        maxPositions: 8,
        maxNotionalUsd: 40,
        ratio: 1,
        rebalancePct: 0.25,
      } as typeof DEFAULT_SETTINGS.live,
    },
    sim: { stats: { pf: 1.5, n: 50 }, stable: true },
    status: { lastBarT: Math.floor(Date.now() / H) * H },
    paper: { positions: [] as FakePaperPosition[] },
    tickersAt: 0,
    freshTickers: async () => {
      rt.tickersAt = Date.now();
      return prices;
    },
  };
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
