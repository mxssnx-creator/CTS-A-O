// Bybit V5 linear-USDT primitives. This module is not connected to the live executor yet.
// An order acknowledgement is deliberately only an acknowledgement, never a fill.
import { createHmac } from "node:crypto";
import { sharedBybitBudget, type BybitRequestBudget } from "./bybit-budget.server.ts";
import type { Candle } from "../domain/types.ts";
import type { Ticker } from "../market/bingx.ts";

export type BybitNetwork = "mainnet" | "testnet";
export const BYBIT_HOSTS: Record<BybitNetwork, string> = {
  mainnet: "https://api.bybit.com",
  testnet: "https://api-testnet.bybit.com",
};

type Scalar = string | number | boolean;
type Params = Record<string, Scalar | undefined>;
type Json = Record<string, unknown>;

/** A venue reply that explicitly rejected a request; no retry is performed here. */
export class BybitRejected extends Error {
  readonly code: number;
  constructor(code: number, method: string, path: string) {
    super(`Bybit rejected ${method} ${path} (code ${code})`);
    this.name = "BybitRejected";
    this.code = code;
  }
}

/** The request may have reached the venue. Resolve it by its orderLinkId before any retry. */
export class BybitOutcomeUnknown extends Error {
  constructor(method: string, path: string) {
    super(`Bybit ${method} ${path}: outcome unknown; reconcile before retry`);
    this.name = "BybitOutcomeUnknown";
  }
}

/** No network request was sent. A fresh control step may try again after the budget deadline. */
export class BybitNotSent extends Error {
  constructor(readonlyUntil: number) {
    super(`Bybit request deferred before dispatch until ${readonlyUntil}`);
    this.name = "BybitNotSent";
    this.until = readonlyUntil;
  }
  readonly until: number;
}

export function bybitSignature(secret: string, timestamp: string, apiKey: string, window: string, payload: string): string {
  return createHmac("sha256", secret).update(timestamp + apiKey + window + payload).digest("hex");
}

function queryOf(params: Params): string {
  const q = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined) q.append(key, String(value));
  }
  return q.toString();
}

function object(value: unknown, label: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid Bybit ${label}`);
  return value as Json;
}

function nonempty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid Bybit ${label}`);
  return value;
}

function numberOf(value: unknown): number | null {
  if ((typeof value !== "string" && typeof value !== "number") || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function bybitSymbol(input: string): string {
  const symbol = input.trim().toUpperCase().replace(/-/g, "");
  if (!/^[A-Z0-9]+USDT$/.test(symbol) || symbol === "USDT") throw new Error("Bybit requires a linear USDT symbol");
  return symbol;
}

/** Bounded, ordered read batching; one failed symbol never hides another symbol's result. Do not use for writes. */
export async function batchBybitReads<T, R>(items: readonly T[], concurrency: number, read: (item: T) => Promise<R>): Promise<Array<
  { ok: true; value: R } | { ok: false; error: unknown }
>> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Invalid Bybit read concurrency");
  const results: Array<{ ok: true; value: R } | { ok: false; error: unknown }> = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await read(items[i]) }; }
      catch (error) { results[i] = { ok: false, error }; }
    }
  }));
  return results;
}

/** Exact decimal floor/ceiling to a venue step, without binary floating-point rounding. */
export function snapBybitDecimal(value: string, step: string, direction: "down" | "up"): string {
  const parse = (s: string) => {
    if (!/^\d+(?:\.\d+)?$/.test(s)) throw new Error("Invalid decimal");
    const [whole, frac = ""] = s.split(".");
    if (frac.length > 18 || whole.length > 30) throw new Error("Decimal out of range");
    return { whole, frac };
  };
  const a = parse(value), b = parse(step), precision = Math.max(a.frac.length, b.frac.length);
  const units = (p: { whole: string; frac: string }) => BigInt(p.whole + p.frac.padEnd(precision, "0"));
  const n = units(a), s = units(b);
  if (s === 0n) throw new Error("Invalid zero step");
  let q = n / s;
  if (direction === "up" && n % s !== 0n) q++;
  const digits = (q * s).toString().padStart(precision + 1, "0");
  if (!precision) return digits;
  return `${digits.slice(0, -precision)}.${digits.slice(-precision)}`.replace(/\.?0+$/, "");
}

export interface BybitInstrument {
  symbol: string;
  qtyStep: string;
  tickSize: string;
  minQty: string;
  maxMarketQty: string;
  minNotional: string;
}

export interface BybitPosition {
  symbol: string;
  side: "long" | "short";
  positionIdx: 0 | 1 | 2;
  qty: number;
  entry: number | null;
  mark: number | null;
  unrealized: number | null;
}

export interface BybitOpenOrder {
  orderId: string;
  orderLinkId: string | null;
  symbol: string;
  side: "Buy" | "Sell";
  positionIdx: 0 | 1 | 2;
  remainingQty: number;
  reduceOnly: boolean;
  triggerPrice: number | null;
  stopOrderType: string | null;
}

export interface BybitOrderRequest {
  symbol: string;
  side: "Buy" | "Sell";
  positionIdx: 0 | 1 | 2;
  qty: string;
  orderLinkId: string;
  reduceOnly: boolean;
  /** Explicit trigger direction/price are required together for a conditional market order. */
  trigger?: { price: string; direction: 1 | 2; by: "LastPrice" | "MarkPrice" | "IndexPrice" };
}

export interface BybitExecution {
  execId: string;
  orderId: string;
  orderLinkId: string;
  symbol: string;
  qty: number;
  price: number;
  fee: number | null;
  feeCurrency: string | null;
  at: number;
}

export class BybitRest {
  readonly network: BybitNetwork;
  private readonly host: string;
  private readonly fetcher: typeof fetch;
  private readonly clock: () => number;
  private readonly timeoutMs: number;
  private readonly window: string;
  private readonly apiKey: string;
  private readonly secret: string;
  private readonly budget: BybitRequestBudget;

  constructor(network: BybitNetwork, opts: {
    apiKey?: string; secret?: string; fetcher?: typeof fetch; clock?: () => number;
    timeoutMs?: number; recvWindowMs?: number; budget?: BybitRequestBudget;
  } = {}) {
    this.network = network;
    this.host = BYBIT_HOSTS[network];
    if (!this.host) throw new Error("Unknown Bybit network");
    this.fetcher = opts.fetcher ?? fetch;
    this.clock = opts.clock ?? Date.now;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    const window = opts.recvWindowMs ?? 10_000;
    if (!Number.isSafeInteger(window) || window < 1 || window > 60_000 ||
        !Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 60_000)
      throw new Error("Invalid Bybit timeout or receive window");
    this.window = String(window);
    this.apiKey = opts.apiKey?.trim() ?? "";
    this.secret = opts.secret?.trim() ?? "";
    this.budget = opts.budget ?? sharedBybitBudget();
  }

  private async request(method: "GET" | "POST", path: string, params: Params, authenticated: boolean): Promise<Json> {
    if (authenticated && (!this.apiKey || !this.secret)) throw new Error("No Bybit API credentials");
    const endpoint = `${method} ${path}`;
    const budgetDeadline = Date.now() + 3_000;
    for (;;) {
      const now = Date.now();
      const slot = this.budget.take(endpoint, now, method === "POST" && path === "/v5/order/create" && params.reduceOnly === false);
      if (!slot.until) break;
      // Writes cannot wait in a stale queue. A long or unavailable read budget also returns promptly.
      if (method === "POST" || slot.unavailable || slot.until - now > 2_000 || slot.until > budgetDeadline) throw new BybitNotSent(slot.until);
      await new Promise(resolve => setTimeout(resolve, Math.max(1, slot.until - now)));
    }
    const query = method === "GET" ? queryOf(params) : "";
    const payload = method === "GET" ? query : JSON.stringify(params);
    const headers: Record<string, string> = { accept: "application/json" };
    if (method === "POST") headers["content-type"] = "application/json";
    if (authenticated) {
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid Bybit request time");
      const timestamp = String(now);
      headers["X-BAPI-API-KEY"] = this.apiKey;
      headers["X-BAPI-TIMESTAMP"] = timestamp;
      headers["X-BAPI-RECV-WINDOW"] = this.window;
      headers["X-BAPI-SIGN"] = bybitSignature(this.secret, timestamp, this.apiKey, this.window, payload);
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let response: Response;
    let raw: unknown;
    try {
      const read = (async () => {
        const res = await this.fetcher(`${this.host}${path}${query ? `?${query}` : ""}`, {
          method, headers, signal: controller.signal, ...(method === "POST" ? { body: payload } : {}),
        });
        const now = Date.now();
        // 403 has several possible causes, including the IP ban. Conservatively stop all HTTP traffic for 10 min.
        if (res.status === 403) this.budget.pause("*", now + 10 * 60_000);
        if (res.status === 429) this.budget.pause(endpoint, now + 1_100);
        const remaining = numberOf(res.headers.get("X-Bapi-Limit-Status"));
        const reset = numberOf(res.headers.get("X-Bapi-Limit-Reset-Timestamp"));
        if (remaining === 0 && reset !== null && reset > now) this.budget.pause(endpoint, Math.ceil(reset));
        return { response: res, raw: await res.json() };
      })();
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, this.timeoutMs);
      });
      ({ response, raw } = await Promise.race([read, deadline]));
    } catch {
      if (method === "POST") throw new BybitOutcomeUnknown(method, path);
      throw new Error(`Bybit ${method} ${path}: read failed`);
    } finally {
      if (timer) clearTimeout(timer);
      controller.abort();
    }
    let body: Json;
    try { body = object(raw, "response"); } catch {
      if (method === "POST") throw new BybitOutcomeUnknown(method, path);
      throw new Error(`Bybit ${method} ${path}: invalid response`);
    }
    const code = numberOf(body.retCode);
    if (code === 10006) this.budget.pause(endpoint, Date.now() + 1_100);
    // Duplicate client ids may name an earlier successful submission. Timeout/processing codes cannot prove no fill.
    const ambiguous = code === null || response.status >= 500 || response.status === 429 ||
      [429, 10000, 10014, 10016, 110072, 110079, 170141, 170146, 170147].includes(code);
    if (ambiguous) {
      if (method === "POST") throw new BybitOutcomeUnknown(method, path);
      throw new Error(`Bybit ${method} ${path}: unavailable`);
    }
    if (code !== 0) throw new BybitRejected(code, method, path);
    if (!response.ok) {
      if (method === "POST") throw new BybitOutcomeUnknown(method, path);
      throw new Error(`Bybit ${method} ${path}: HTTP ${response.status}`);
    }
    try { return object(body.result, "result"); } catch {
      if (method === "POST") throw new BybitOutcomeUnknown(method, path);
      throw new Error(`Bybit ${method} ${path}: invalid result`);
    }
  }

  private async pages(path: string, params: Params, authenticated: boolean): Promise<Json[]> {
    const rows: Json[] = [], seen = new Set<string>();
    let cursor = "";
    for (let page = 0; page < 200; page++) {
      const result = await this.request("GET", path, { ...params, ...(cursor ? { cursor } : {}) }, authenticated);
      if (!Array.isArray(result.list)) throw new Error(`Invalid Bybit page ${path}`);
      rows.push(...result.list.map((r) => object(r, "page row")));
      const next = result.nextPageCursor;
      if (next === "" || next === undefined || next === null) return rows;
      if (typeof next !== "string" || seen.has(next)) throw new Error(`Invalid Bybit cursor ${path}`);
      seen.add(next);
      cursor = next;
    }
    throw new Error(`Bybit pagination limit exceeded ${path}`);
  }

  async instruments(): Promise<Map<string, BybitInstrument>> {
    const rows = await this.pages("/v5/market/instruments-info", { category: "linear", limit: 1000 }, false);
    const out = new Map<string, BybitInstrument>();
    for (const r of rows) {
      if (r.contractType !== "LinearPerpetual" || r.status !== "Trading" || r.settleCoin !== "USDT") continue;
      const symbol = bybitSymbol(nonempty(r.symbol, "instrument symbol"));
      const lot = object(r.lotSizeFilter, "lot filter"), price = object(r.priceFilter, "price filter");
      const item = { symbol, qtyStep: nonempty(lot.qtyStep, "quantity step"), tickSize: nonempty(price.tickSize, "tick size"),
        minQty: nonempty(lot.minOrderQty, "minimum quantity"), maxMarketQty: nonempty(lot.maxMktOrderQty, "maximum market quantity"),
        minNotional: nonempty(lot.minNotionalValue, "minimum notional") };
      for (const value of [item.qtyStep, item.tickSize, item.minQty, item.maxMarketQty, item.minNotional])
        if (!/^\d+(?:\.\d+)?$/.test(value) || !(Number(value) > 0)) throw new Error("Invalid Bybit instrument limits");
      if (out.has(symbol)) throw new Error("Duplicate Bybit instrument");
      out.set(symbol, item);
    }
    return out;
  }

  async tickers(): Promise<Ticker[]> {
    const result = await this.request("GET", "/v5/market/tickers", { category: "linear" }, false);
    if (!Array.isArray(result.list)) throw new Error("Invalid Bybit tickers");
    const out: Ticker[] = [];
    for (const raw of result.list) {
      const r = object(raw, "ticker"), sym = String(r.symbol ?? "");
      if (!/^[A-Z0-9]+USDT$/.test(sym)) continue;
      const last = numberOf(r.lastPrice), quoteVol = numberOf(r.turnover24h), change = numberOf(r.price24hPcnt);
      if (last === null || last <= 0 || quoteVol === null || quoteVol < 0 || change === null) continue;
      out.push({ sym: `${sym.slice(0, -4)}-USDT`, last, quoteVol, changePct: change * 100 });
    }
    return out;
  }

  async klines(sym: string, tfMin: number, opt: { startT?: number; endT?: number; limit?: number; nowT?: number } = {}): Promise<Candle[]> {
    if (![1, 3, 5, 15, 30, 60, 120, 240, 360, 720].includes(tfMin)) throw new Error("Unsupported Bybit timeframe");
    const limit = opt.limit ?? 1000;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid Bybit kline limit");
    const result = await this.request("GET", "/v5/market/kline", { category: "linear", symbol: bybitSymbol(sym),
      interval: tfMin, limit, start: opt.startT, end: opt.endT }, false);
    if (!Array.isArray(result.list)) throw new Error("Invalid Bybit candles");
    const now = opt.nowT ?? this.clock(), byTime = new Map<number, Candle>();
    for (const raw of result.list) {
      if (!Array.isArray(raw) || raw.length < 6) throw new Error("Invalid Bybit candle");
      const [t, o, h, l, c, v] = raw.map(numberOf);
      if (t === null || !Number.isSafeInteger(t) || t < 0 || o === null || h === null || l === null || c === null ||
          v === null || v < 0 || Math.min(o, h, l, c) <= 0 || h < Math.max(o, c, l) || l > Math.min(o, c, h))
        throw new Error("Invalid Bybit candle values");
      if (t + tfMin * 60_000 > now || (opt.startT !== undefined && t < opt.startT) || (opt.endT !== undefined && t > opt.endT)) continue;
      const candle = { t, o, h, l, c, v }, prior = byTime.get(t);
      if (prior && JSON.stringify(prior) !== JSON.stringify(candle)) throw new Error("Conflicting Bybit candles");
      byTime.set(t, candle);
    }
    return [...byTime.values()].sort((a, b) => a.t - b.t);
  }

  async history(sym: string, tfMin: number, bars: number, now = this.clock()): Promise<Candle[]> {
    if (!Number.isSafeInteger(bars) || bars < 0) throw new Error("Invalid Bybit history length");
    if (![1, 3, 5, 15, 30, 60, 120, 240, 360, 720].includes(tfMin)) throw new Error("Unsupported Bybit timeframe");
    if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid Bybit history time");
    if (!bars) return [];
    const tf = tfMin * 60_000, pages: Candle[] = [];
    let end = Math.floor(now / tf) * tf - 1;
    for (let page = 0; page < Math.max(20, Math.ceil(bars / 1000) + 2) && pages.length < bars; page++) {
      const limit = Math.min(1000, bars - pages.length);
      const rows = await this.klines(sym, tfMin, { endT: end, limit, nowT: now });
      if (!rows.length) break;
      pages.unshift(...rows);
      end = rows[0].t - 1;
    }
    return pages.slice(-bars);
  }

  async book(): Promise<{ positions: BybitPosition[]; orders: BybitOpenOrder[] }> {
    const [pos, ord] = await Promise.all([
      this.pages("/v5/position/list", { category: "linear", settleCoin: "USDT", limit: 200 }, true),
      this.pages("/v5/order/realtime", { category: "linear", settleCoin: "USDT", openOnly: 0, limit: 50 }, true),
    ]);
    const positions: BybitPosition[] = [];
    for (const r of pos) {
      const qty = numberOf(r.size);
      if (qty === null || qty < 0) throw new Error("Invalid Bybit position size");
      if (qty === 0) continue;
      const idx = numberOf(r.positionIdx), side = r.side;
      if (![0, 1, 2].includes(idx ?? -1) || (side !== "Buy" && side !== "Sell") ||
          (idx === 1 && side !== "Buy") || (idx === 2 && side !== "Sell")) throw new Error("Invalid Bybit position identity");
      positions.push({ symbol: bybitSymbol(nonempty(r.symbol, "position symbol")), side: side === "Buy" ? "long" : "short",
        positionIdx: idx as 0 | 1 | 2, qty, entry: numberOf(r.avgPrice), mark: numberOf(r.markPrice), unrealized: numberOf(r.unrealisedPnl) });
    }
    const orders: BybitOpenOrder[] = [], ids = new Set<string>();
    for (const r of ord) {
      const id = nonempty(r.orderId, "order id"), idx = numberOf(r.positionIdx), remaining = numberOf(r.leavesQty), side = r.side;
      if (ids.has(id) || ![0, 1, 2].includes(idx ?? -1) || remaining === null || remaining < 0 ||
          (side !== "Buy" && side !== "Sell") || typeof r.reduceOnly !== "boolean") throw new Error("Invalid Bybit open order");
      ids.add(id);
      orders.push({ orderId: id, orderLinkId: typeof r.orderLinkId === "string" && r.orderLinkId ? r.orderLinkId : null,
        symbol: bybitSymbol(nonempty(r.symbol, "order symbol")), side, positionIdx: idx as 0 | 1 | 2,
        remainingQty: remaining, reduceOnly: r.reduceOnly, triggerPrice: numberOf(r.triggerPrice),
        stopOrderType: typeof r.stopOrderType === "string" && r.stopOrderType ? r.stopOrderType : null });
    }
    return { positions, orders };
  }

  async placeMarket(order: BybitOrderRequest): Promise<{ orderId: string; orderLinkId: string; status: "accepted" }> {
    const symbol = bybitSymbol(order.symbol);
    if (!/^[A-Za-z0-9_-]{1,36}$/.test(order.orderLinkId) || !/^\d+(?:\.\d+)?$/.test(order.qty) || !(Number(order.qty) > 0) ||
        ![0, 1, 2].includes(order.positionIdx) || !["Buy", "Sell"].includes(order.side) || typeof order.reduceOnly !== "boolean" ||
        (order.positionIdx === 1 && order.side !== (order.reduceOnly ? "Sell" : "Buy")) ||
        (order.positionIdx === 2 && order.side !== (order.reduceOnly ? "Buy" : "Sell")))
      throw new Error("Invalid Bybit order");
    if (order.trigger && (!order.reduceOnly || !/^\d+(?:\.\d+)?$/.test(order.trigger.price) || !(Number(order.trigger.price) > 0) ||
        ![1, 2].includes(order.trigger.direction) || !["LastPrice", "MarkPrice", "IndexPrice"].includes(order.trigger.by)))
      throw new Error("Invalid Bybit conditional order");
    const result = await this.request("POST", "/v5/order/create", { category: "linear", symbol, side: order.side,
      orderType: "Market", qty: order.qty, positionIdx: order.positionIdx, orderLinkId: order.orderLinkId,
      reduceOnly: order.reduceOnly, ...(order.trigger ? { triggerPrice: order.trigger.price,
        triggerDirection: order.trigger.direction, triggerBy: order.trigger.by } : {}) }, true);
    if (typeof result.orderId !== "string" || !result.orderId || result.orderLinkId !== order.orderLinkId)
      throw new BybitOutcomeUnknown("POST", "/v5/order/create");
    return { orderId: result.orderId, orderLinkId: order.orderLinkId, status: "accepted" };
  }

  async cancel(symbol: string, orderId: string): Promise<void> {
    const id = nonempty(orderId, "order id");
    const result = await this.request("POST", "/v5/order/cancel", { category: "linear", symbol: bybitSymbol(symbol), orderId: id }, true);
    if (result.orderId !== id) throw new BybitOutcomeUnknown("POST", "/v5/order/cancel");
  }

  /** A submitted order can be absent from realtime after a venue restart; query history before declaring it missing. */
  private async findOrder(symbol: string, selector: { orderId?: string; orderLinkId?: string }): Promise<{
    orderId: string; orderLinkId: string | null; status: string; executedQty: number | null; avgPrice: number | null;
  } | null> {
    const sym = bybitSymbol(symbol);
    if ((!selector.orderId && !selector.orderLinkId) || (selector.orderId && selector.orderLinkId)) throw new Error("Invalid Bybit order selector");
    const params = { category: "linear", symbol: sym, ...selector, limit: 50 };
    const live = await this.pages("/v5/order/realtime", params, true);
    const rows = live.length ? live : await this.pages("/v5/order/history", params, true);
    if (!rows.length) return null;
    if (rows.length !== 1 || (selector.orderId && rows[0].orderId !== selector.orderId) ||
        (selector.orderLinkId && rows[0].orderLinkId !== selector.orderLinkId) ||
        bybitSymbol(nonempty(rows[0].symbol, "order symbol")) !== sym)
      throw new Error("Invalid Bybit order identity");
    const row = rows[0], executedQty = numberOf(row.cumExecQty), avgPrice = numberOf(row.avgPrice);
    if ((executedQty !== null && executedQty < 0) || (avgPrice !== null && avgPrice < 0)) throw new Error("Invalid Bybit order execution");
    return { orderId: nonempty(row.orderId, "order id"), orderLinkId: typeof row.orderLinkId === "string" && row.orderLinkId ? row.orderLinkId : null,
      status: nonempty(row.orderStatus, "order status"), executedQty, avgPrice: avgPrice && avgPrice > 0 ? avgPrice : null };
  }

  async orderStatus(symbol: string, orderId: string) {
    return this.findOrder(symbol, { orderId: nonempty(orderId, "order id") });
  }

  /** Use the original client id to reconcile a timed-out submission before considering a retry. */
  async orderByLink(symbol: string, orderLinkId: string) {
    if (!/^[A-Za-z0-9_-]{1,36}$/.test(orderLinkId)) throw new Error("Invalid Bybit client order id");
    return this.findOrder(symbol, { orderLinkId });
  }

  /** USDT coin amounts only. Unified-account available collateral is not necessarily USDT and is not inferred. */
  async usdtBalance(): Promise<{ wallet: number | null; equity: number | null; unrealized: number | null; realized: number | null } | null> {
    const data = await this.request("GET", "/v5/account/wallet-balance", { accountType: "UNIFIED", coin: "USDT" }, true);
    if (!Array.isArray(data.list) || data.list.length > 1) throw new Error("Invalid Bybit account response");
    if (!data.list.length) return null;
    const account = object(data.list[0], "account");
    if (!Array.isArray(account.coin)) throw new Error("Invalid Bybit account coins");
    const rows = account.coin.map(r => object(r, "account coin")).filter(r => r.coin === "USDT");
    if (rows.length > 1) throw new Error("Duplicate Bybit account coin");
    if (!rows.length) return null;
    const row = rows[0];
    return { wallet: numberOf(row.walletBalance), equity: numberOf(row.equity), unrealized: numberOf(row.unrealisedPnl),
      realized: numberOf(row.cumRealisedPnl) };
  }

  async executions(symbol: string, orderId: string): Promise<BybitExecution[]> {
    const id = nonempty(orderId, "order id"), sym = bybitSymbol(symbol);
    const rows = await this.pages("/v5/execution/list", { category: "linear", symbol: sym, orderId: id, limit: 100 }, true);
    const byId = new Map<string, BybitExecution>();
    for (const r of rows) {
      if (r.execType !== "Trade") continue;
      const execId = nonempty(r.execId, "execution id"), gotId = nonempty(r.orderId, "execution order"),
        gotSym = bybitSymbol(nonempty(r.symbol, "execution symbol"));
      const qty = numberOf(r.execQty), price = numberOf(r.execPrice), fee = numberOf(r.execFee), at = numberOf(r.execTime);
      if (gotId !== id || gotSym !== sym || qty === null || qty <= 0 || price === null || price <= 0 ||
          at === null || !Number.isSafeInteger(at) || at < 0) throw new Error("Invalid Bybit execution identity");
      const fill: BybitExecution = { execId, orderId: id, orderLinkId: typeof r.orderLinkId === "string" ? r.orderLinkId : "",
        symbol: sym, qty, price, fee, feeCurrency: typeof r.feeCurrency === "string" && r.feeCurrency ? r.feeCurrency : null, at };
      const old = byId.get(execId);
      if (old && JSON.stringify(old) !== JSON.stringify(fill)) throw new Error("Conflicting Bybit execution");
      byId.set(execId, fill);
    }
    return [...byId.values()].sort((a, b) => a.at - b.at || a.execId.localeCompare(b.execId));
  }
}

/** Fee is unknown unless every trade names an actual USDT fee; do not invent zero fees. */
export function summarizeBybitExecutions(fills: readonly BybitExecution[]): { qty: number; avgPrice: number; feeUsdt: number | null } | null {
  if (!fills.length) return null;
  const ids = new Set<string>();
  let qty = 0, value = 0, fee = 0, feesKnown = true;
  for (const f of fills) {
    if (ids.has(f.execId) || !(f.qty > 0 && Number.isFinite(f.qty) && f.price > 0 && Number.isFinite(f.price)))
      throw new Error("Invalid or duplicate Bybit execution");
    if (f.orderId !== fills[0].orderId || f.symbol !== fills[0].symbol || f.orderLinkId !== fills[0].orderLinkId)
      throw new Error("Mixed Bybit execution identities");
    ids.add(f.execId);
    qty += f.qty;
    value += f.qty * f.price;
    if (f.fee === null || !Number.isFinite(f.fee) || f.feeCurrency !== "USDT") feesKnown = false;
    else fee += f.fee;
  }
  if (!Number.isFinite(qty) || !Number.isFinite(value) || !Number.isFinite(fee)) throw new Error("Bybit execution overflow");
  return { qty, avgPrice: value / qty, feeUsdt: feesKnown ? fee : null };
}
