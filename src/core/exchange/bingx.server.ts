// Self-contained BingX perpetual-swap client for the Live stage (signing, contracts, book, orders).
// Keys come only from the host environment:
//   bingx-x01     BINGX_X01_API_KEY / BINGX_X01_SECRET          (mainnet)
//   bingx-vst-01  BINGX_V01_API_KEY / BINGX_V01_SECRET          (testnet)
//   bingx-vst-02  BINGX_X02_API_KEY / BINGX_X02_SECRET          (testnet)
// The demo connections (vst-01 / vst-02) fall back to the x01 keys (then BINGX_API_KEY / BINGX_SECRET): a BingX
// key belongs to the account and signs on the VST host too.
import { createHmac } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";

export type Network = "mainnet" | "testnet";
export type ConnId = "bingx-x01" | "bingx-vst-01" | "bingx-vst-02";

export const HOSTS: Record<Network, readonly string[]> = {
  mainnet: ["https://open-api.bingx.com", "https://open-api.bingx.pro"],
  testnet: ["https://open-api-vst.bingx.com", "https://open-api-vst.bingx.pro"],
};

const TIMEOUT_MS = 10_000;
const env = (k: string) => (process.env[k] ?? "").trim();

/**
 * Keys of a connection. A BingX API key belongs to the account, so the demo connections (VST, on the VST host)
 * use the x01 keys when they have none of their own — orders still go to the VST host, never to mainnet.
 * x01 (mainnet) only ever uses its own keys.
 */
export function keysFor(conn: ConnId): { apiKey: string; secret: string; source: KeySource } {
  const pair = (slot: string) => ({
    apiKey: env(`BINGX_${slot}_API_KEY`),
    secret: env(`BINGX_${slot}_SECRET`),
  });
  const ok = (k: { apiKey: string; secret: string }) => !!(k.apiKey && k.secret);
  if (conn === "bingx-x01") {
    const own = pair("X01");
    return { ...own, source: ok(own) ? "own" : "none" };
  }
  const own = pair(conn === "bingx-vst-02" ? "X02" : "V01");
  if (ok(own)) return { ...own, source: "own" };
  const x01 = pair("X01");
  if (ok(x01)) return { ...x01, source: "x01" };
  const generic = { apiKey: env("BINGX_API_KEY"), secret: env("BINGX_SECRET") };
  if (ok(generic)) return { ...generic, source: "generic" };
  return { apiKey: "", secret: "", source: "none" };
}

/** Where a connection's keys come from: its own, the x01 keys (demo connections), the generic pair, or none. */
export type KeySource = "own" | "x01" | "generic" | "none";

export function signedUrl(
  base: string,
  path: string,
  secret: string,
  params: Record<string, string | number>,
): string {
  const keys = Object.keys(params).sort();
  const canonical = keys.map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");
  const q = keys
    .map((k) => {
      const v = String(params[k]);
      return `${k}=${/[{}"\s,]/.test(v) ? encodeURIComponent(v) : v}`;
    })
    .join("&");
  return `${base}${path}?${q}&signature=${signature}`;
}

async function timedFetch(url: string, init: RequestInit = {}): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Signed request; throws with BingX's message on a non-zero code. */
export async function signed(
  network: Network,
  conn: ConnId,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number> = {},
): Promise<unknown> {
  const { apiKey, secret } = keysFor(conn);
  if (!apiKey || !secret) throw new Error(`no API keys for ${conn}`);
  // during a ban nothing is sent: calls made while banned keep the account's limit tripped
  const paused = rateLimitedUntil(Date.now(), `${method} ${path}`);
  if (paused)
    throw new ExchangeRejected(`frequency limit pause (${NOT_SENT}), unblocked after ${paused} [${method} ${path}]`, 100410);
  const url = signedUrl(HOSTS[network][0], path, secret, {
    ...params,
    recvWindow: 5000,
    timestamp: Date.now(),
  });
  const body = (await timedFetch(url, { method, headers: { "X-BX-APIKEY": apiKey } })) as {
    code?: number;
    msg?: string;
    data?: unknown;
  };
  signedCalls.set(`${method} ${path}`, (signedCalls.get(`${method} ${path}`) ?? 0) + 1);
  if (body?.code !== 0) {
    const msg = body?.msg || `BingX ${body?.code}`;
    if (noteRateLimit(msg)) signedBans.set(`${method} ${path}`, (signedBans.get(`${method} ${path}`) ?? 0) + 1);
    // the endpoint travels with the message: a ban names the call that triggered it
    throw new ExchangeRejected(`${msg} [${method} ${path}]`, body?.code);
  }
  return body.data;
}

/** The exchange answered and refused the request (nothing was executed) — unlike a time-out, whose outcome is unknown. */
export class ExchangeRejected extends Error {
  code: number | undefined;
  constructor(msg: string, code?: number) {
    super(msg);
    this.name = "ExchangeRejected";
    this.code = code;
  }
}

/** Signed calls and rate-limit bans per endpoint in this process (diagnostics). */
export const signedCalls = new Map<string, number>();
export const signedBans = new Map<string, number>();

/**
 * BingX 100410 / disabled-period: a ban names its endpoint ("[GET /path]" in the message); calls to that endpoint
 * are not sent until it ends, other endpoints stay usable. A ban without an endpoint (klines) pauses every call.
 */
const banned = new Map<string, number>();
const ANY = "*";
/**
 * Every process waits its own random extra 5–60 s after a ban: desks sharing one account then resume one by one
 * instead of all at the instant the ban lifts (that burst set off the next ban at once).
 */
const BAN_JITTER_MS = 5_000 + Math.floor(Math.random() * 55_000);
/** marks the local refusal of a call during a ban (it never reached the exchange and does not extend the ban) */
const NOT_SENT = "not sent";
const endpointOf = (msg: string) => /\[((?:GET|POST|DELETE) [^\]\s]+)\]/.exec(msg)?.[1] ?? ANY;
/**
 * Several processes on one account (live test desks, reports): with CTS_BINGX_BAN_FILE set, a ban one of them
 * receives is written to that file (endpoint → the exchange's end) and every other process pauses too, plus its own
 * jitter. Without it the pause stays in this process; the server runs every connection in one process.
 */
const banFile = () => env("CTS_BINGX_BAN_FILE");
let shared: { at: number; bans: Record<string, number> } = { at: 0, bans: {} };
function sharedBans(now: number): Record<string, number> {
  const f = banFile();
  if (!f) return {};
  if (now - shared.at >= 1_000) {
    let bans: Record<string, number> = {};
    try {
      const raw = JSON.parse(readFileSync(f, "utf8")) as unknown;
      if (raw && typeof raw === "object") bans = raw as Record<string, number>;
    } catch {
      // no ban recorded yet
    }
    shared = { at: now, bans };
  }
  return shared.bans;
}
function shareBan(endpoint: string, until: number, now: number) {
  const f = banFile();
  const bans = sharedBans(now);
  if (!f || until <= (bans[endpoint] ?? 0)) return;
  const next = { ...bans, [endpoint]: until };
  try {
    writeFileSync(`${f}.${process.pid}`, JSON.stringify(next));
    renameSync(`${f}.${process.pid}`, f);
    shared = { at: now, bans: next };
  } catch {
    // best effort: this process still pauses on its own
  }
}
export function noteRateLimit(msg: string, now = Date.now()): number {
  if (msg.includes(NOT_SENT)) return rateLimitedUntil(now);
  const m = /unblocked after\s+(\d{10,})/i.exec(msg);
  let end = 0;
  if (m) {
    const t = Number(m[1]);
    if (t > now) end = t;
  } else if (/100410|disabled period|trigger frequency limit/i.test(msg)) end = now + 60_000;
  if (end) {
    const ep = endpointOf(msg);
    shareBan(ep, end, now);
    if (end + BAN_JITTER_MS > (banned.get(ep) ?? 0)) banned.set(ep, end + BAN_JITTER_MS);
  }
  return rateLimitedUntil(now);
}
/**
 * The end of the pause (0 when none): for one endpoint ("GET /path") its own ban or a ban of every call; without an
 * endpoint any ban (the live step and klines pause on any of them).
 */
export function rateLimitedUntil(now = Date.now(), endpoint?: string): number {
  const s = sharedBans(now);
  const keys = endpoint ? [endpoint, ANY] : [...new Set([...banned.keys(), ...Object.keys(s)])];
  let until = 0;
  for (const k of keys) {
    until = Math.max(until, banned.get(k) ?? 0, s[k] ? s[k] + BAN_JITTER_MS : 0);
  }
  return now < until ? until : 0;
}
/** The pause of the live step: any ban except one on the open orders (the book then carries the last ones read). */
export function blockingBanUntil(now = Date.now()): number {
  const s = sharedBans(now);
  let until = 0;
  for (const k of new Set([...banned.keys(), ...Object.keys(s)])) {
    if (k === OPEN_ORDERS) continue;
    until = Math.max(until, banned.get(k) ?? 0, s[k] ? s[k] + BAN_JITTER_MS : 0);
  }
  return now < until ? until : 0;
}
export function clearRateLimit() {
  banned.clear();
  shared = { at: 0, bans: {} };
}

export interface ContractSpec {
  symbol: string;
  minQty: number;
  step: number;
  qtyPrec: number;
  pxPrec: number;
  minUsdt: number;
}

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** contract specs per network (mainnet and testnet runtimes run side by side); one request in flight per network */
const contracts = new Map<Network, { at: number; map: Map<string, ContractSpec> }>();
const contractsLoading = new Map<Network, Promise<Map<string, ContractSpec>>>();
export async function fetchContracts(network: Network): Promise<Map<string, ContractSpec>> {
  const c = contracts.get(network);
  if (c && Date.now() - c.at < 600_000) return c.map;
  const busy = contractsLoading.get(network);
  if (busy) return busy;
  const p = loadContracts(network).finally(() => contractsLoading.delete(network));
  contractsLoading.set(network, p);
  return p;
}
async function loadContracts(network: Network): Promise<Map<string, ContractSpec>> {
  const map = new Map<string, ContractSpec>();
  for (const host of HOSTS[network]) {
    try {
      const body = (await timedFetch(`${host}/openApi/swap/v2/quote/contracts`)) as {
        data?: Array<Record<string, unknown>>;
      };
      for (const r of body?.data ?? []) {
        const symbol = String(r.symbol ?? "");
        if (!symbol) continue;
        const qtyPrec = n(r.quantityPrecision);
        const step = n(r.size) || 10 ** -Math.max(0, qtyPrec);
        map.set(symbol, {
          symbol,
          qtyPrec,
          step: step > 0 ? step : 1,
          minQty: Math.max(n(r.tradeMinQuantity), n(r.tradeMinVolume), n(r.minQty), step, 0),
          pxPrec: n(r.pricePrecision),
          minUsdt: Math.max(n(r.tradeMinUSDT), n(r.minNotional), 0) || 2,
        });
      }
      if (map.size) break;
    } catch {
      /* next host */
    }
  }
  // an empty answer (all hosts down) is not cached: the next call asks again
  if (map.size) contracts.set(network, { at: Date.now(), map });
  return map;
}

/** Floor to the lot step (never larger than qty). */
export function snapQtyDown(qty: number, spec?: ContractSpec | null): number {
  if (!(qty > 0)) return 0;
  if (!spec) return qty;
  const q = Math.floor(qty / spec.step + 1e-12) * spec.step;
  return Number(Math.max(0, q).toFixed(Math.max(0, spec.qtyPrec)));
}

/**
 * Exchange-valid quantity for a wanted quantity at a price: floored to the lot step, and raised to the smallest
 * valid quantity when that is below the exchange minimum (min quantity or min USDT value). `raised` tells the
 * caller the order is larger than asked (the effective volume is recorded, and caps still apply).
 */
export function snapQtyExchange(
  qty: number,
  px: number,
  spec?: ContractSpec | null,
): { qty: number; raised: boolean } {
  if (!(qty > 0) || !(px > 0)) return { qty: 0, raised: false };
  if (!spec) return { qty, raised: false };
  const down = snapQtyDown(qty, spec);
  const minNotional = exchangeMinNotional(spec, px);
  if (down >= spec.minQty && down * px >= minNotional - 1e-9) return { qty: down, raised: false };
  const need = Math.max(spec.minQty, minNotional / px);
  const up = Math.ceil(need / spec.step - 1e-9) * spec.step;
  return { qty: Number(up.toFixed(Math.max(0, spec.qtyPrec))), raised: true };
}

export function snapPx(px: number, spec?: ContractSpec | null): number {
  if (!(px > 0)) return 0;
  return Number(px.toFixed(Math.max(0, Math.min(8, spec?.pxPrec ?? 4))));
}

/** Smallest exchange-valid quantity at this price (min qty and min USDT), rounded up to the lot step. */
export function minQtyExchange(px: number, spec?: ContractSpec | null): number {
  if (!(px > 0)) return 0;
  if (!spec) return 0;
  const need = Math.max(spec.minQty, exchangeMinNotional(spec, px) / px);
  const up = Math.ceil(need / spec.step - 1e-9) * spec.step;
  return Number(up.toFixed(Math.max(0, spec.qtyPrec)));
}

/**
 * Parse "The minimum order amount is 84.25 AIN" (BingX rejects a hair under its contract minimum).
 * Returns the number it named, or null when the message is a different refusal.
 */
export function minQtyFromReject(msg: string): number | null {
  const m = /minimum order amount is\s+([0-9]*\.?[0-9]+)/i.exec(msg);
  if (!m) return null;
  const x = Number(m[1]);
  return Number.isFinite(x) && x > 0 ? x : null;
}

export function exchangeMinNotional(spec: ContractSpec | null | undefined, px: number): number {
  return Math.max(spec?.minUsdt ?? 2, (spec?.minQty ?? 0) * Math.max(px, 0));
}

export interface BookPosition {
  symbol: string;
  venueSymbol: string;
  side: "long" | "short";
  qty: number;
  /** unrealized PnL of this position, USDT */
  upnl?: number;
  /** initial margin of this position, USDT */
  margin?: number;
}
export interface BookOrder {
  id: string;
  symbol: string;
  venueSymbol: string;
  clientOrderId?: string;
  /** LONG / SHORT (hedge mode) — tells which position an own stop belongs to */
  positionSide?: "LONG" | "SHORT";
  type?: string;
}

/** Account equity in USDT (swap wallet balance + unrealized P&L); null when the reply carries none. */
export interface AccountSnapshot {
  equity: number | null;
  wallet: number | null;
  /** open positions, mark to market */
  unrealized: number;
  /** realized PnL the account is carrying */
  realized: number;
  usedMargin: number;
  availableMargin: number | null;
}

/** USDT row of a BingX balance reply, or null when the reply has no balance object. */
export function parseAccount(raw: unknown): AccountSnapshot | null {
  const b = (raw as { balance?: unknown })?.balance ?? raw;
  if (!b || typeof b !== "object") return null;
  const rows = (Array.isArray(b) ? b : [b]) as Array<Record<string, unknown>>;
  const row = rows.find((r) => r && String(r.asset ?? "USDT").toUpperCase() === "USDT") ?? rows[0];
  if (!row || typeof row !== "object") return null;
  const eq = Number(row.equity ?? row.balance);
  const wallet = Number(row.balance);
  const avail = Number(row.availableMargin);
  return {
    equity: Number.isFinite(eq) && eq > 0 ? eq : null,
    wallet: Number.isFinite(wallet) ? wallet : null,
    unrealized: n(row.unrealizedProfit),
    realized: n(row.realisedProfit ?? row.realizedProfit),
    usedMargin: n(row.usedMargin),
    availableMargin: Number.isFinite(avail) ? avail : null,
  };
}

export function parseEquity(raw: unknown): number | null {
  return parseAccount(raw)?.equity ?? null;
}

const accountCache = new Map<string, { at: number; snap: AccountSnapshot }>();

/** Balance snapshot, reused for 15 s so the overview and the sizer share one read. */
export async function fetchAccount(network: Network, conn: ConnId): Promise<AccountSnapshot | null> {
  const k = `${network}|${conn}`;
  const hit = accountCache.get(k);
  if (hit && Date.now() - hit.at < 15_000) return hit.snap;
  const snap = parseAccount(await signed(network, conn, "GET", "/openApi/swap/v2/user/balance"));
  if (snap) accountCache.set(k, { at: Date.now(), snap });
  return snap;
}

export async function fetchEquity(network: Network, conn: ConnId): Promise<number | null> {
  return (await fetchAccount(network, conn))?.equity ?? null;
}

/** Positions and open orders of the account (all of them — ownership is decided by the planner). */
type Book = { positions: BookPosition[]; orders: BookOrder[]; ordersAt?: number };
export const OPEN_ORDERS = "GET /openApi/swap/v2/trade/openOrders";
/** the last complete book read in this process, per connection (open orders while their endpoint is rate limited) */
const lastBook = new Map<ConnId, { startedAt: number; book: Book }>();
function sharedBook(file: string): { startedAt: number; book: Book } | null {
  if (!file) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as { startedAt: number; book: Book };
  } catch {
    return null;
  }
}
/**
 * Several processes on one account (live test desks): with CTS_BINGX_BOOK_FILE set, a book one of them read is
 * shared through that file, and another reuses it when it was read after `notBefore` (its own last order or cancel)
 * and is at most `maxAgeMs` old. The account's positions and open orders are then read once for every desk.
 */
export async function fetchBook(
  network: Network,
  conn: ConnId,
  fresh?: { notBefore: number; maxAgeMs: number },
): Promise<Book> {
  const base = env("CTS_BINGX_BOOK_FILE");
  const file = base ? `${base}.${conn}` : "";
  if (file && fresh) {
    try {
      const c = JSON.parse(readFileSync(file, "utf8")) as { startedAt: number; book: Book };
      if (c.startedAt > fresh.notBefore && Date.now() - c.startedAt < fresh.maxAgeMs) return c.book;
    } catch {
      // nothing shared yet
    }
  }
  const startedAt = Date.now();
  // the open orders are rate limited, positions are not: fresh positions with the last open orders read
  if (rateLimitedUntil(startedAt, OPEN_ORDERS)) {
    const last = lastBook.get(conn) ?? sharedBook(file);
    if (last) {
      const positions = (await readBook(network, conn, false)).positions;
      return { positions, orders: last.book.orders, ordersAt: last.startedAt };
    }
  }
  const book = await readBook(network, conn);
  lastBook.set(conn, { startedAt, book });
  if (file)
    try {
      writeFileSync(`${file}.${process.pid}`, JSON.stringify({ startedAt, book }));
      renameSync(`${file}.${process.pid}`, file);
    } catch {
      // best effort
    }
  return book;
}
async function readBook(network: Network, conn: ConnId, withOrders = true): Promise<Book> {
  const [posRaw, ordRaw] = await Promise.all([
    signed(network, conn, "GET", "/openApi/swap/v2/user/positions"),
    withOrders ? signed(network, conn, "GET", "/openApi/swap/v2/trade/openOrders") : [],
  ]);
  const posRows = (
    Array.isArray(posRaw) ? posRaw : ((posRaw as { positions?: unknown[] })?.positions ?? [])
  ) as Array<Record<string, unknown>>;
  const positions: BookPosition[] = [];
  for (const r of posRows) {
    const venueSymbol = String(r.symbol ?? "");
    const amt = n(r.positionAmt ?? r.availableAmt ?? r.positionQty ?? r.volume);
    const qty = Math.abs(amt);
    if (!venueSymbol || !(qty > 0)) continue;
    const ps = String(r.positionSide ?? "").toUpperCase();
    // hedge mode names the side; one-way mode (BOTH) carries it in the sign of the amount
    const side = ps === "SHORT" ? "short" : ps === "LONG" ? "long" : amt < 0 ? "short" : "long";
    positions.push({
      symbol: venueSymbol.replace("-", ""),
      venueSymbol,
      side,
      qty,
      upnl: n(r.unrealizedProfit),
      margin: n(r.initialMargin),
    });
  }
  const ordRows = (
    Array.isArray(ordRaw) ? ordRaw : ((ordRaw as { orders?: unknown[] })?.orders ?? [])
  ) as Array<Record<string, unknown>>;
  const orders: BookOrder[] = ordRows
    .filter((r) => r.symbol)
    .map((r) => ({
      id: String(r.orderId ?? r.orderID ?? ""),
      symbol: String(r.symbol).replace("-", ""),
      venueSymbol: String(r.symbol),
      clientOrderId:
        String(r.clientOrderID ?? r.clientOrderId ?? r.clientOid ?? "").trim() || undefined,
      positionSide:
        String(r.positionSide ?? "").toUpperCase() === "SHORT"
          ? ("SHORT" as const)
          : String(r.positionSide ?? "").toUpperCase() === "LONG"
            ? ("LONG" as const)
            : undefined, // BOTH (one-way) → undefined = any
      type: r.type ? String(r.type) : undefined,
    }));
  return { positions, orders };
}

export async function cancelOrder(
  network: Network,
  conn: ConnId,
  venueSymbol: string,
  orderId: string,
): Promise<boolean> {
  try {
    await signed(network, conn, "DELETE", "/openApi/swap/v2/trade/order", {
      symbol: venueSymbol,
      orderId,
    });
    return true;
  } catch {
    return false;
  }
}

/** Position mode of the account: hedge (dual side) or one-way. */
export async function setPositionMode(
  network: Network,
  conn: ConnId,
  mode: "hedge" | "oneway",
): Promise<void> {
  await signed(network, conn, "POST", "/openApi/swap/v1/positionSide/dual", {
    dualSidePosition: mode === "hedge" ? "true" : "false",
  });
}

/** Margin type of one symbol: cross or isolated. */
export async function setMarginMode(
  network: Network,
  conn: ConnId,
  venueSymbol: string,
  mode: "cross" | "isolated",
): Promise<void> {
  await signed(network, conn, "POST", "/openApi/swap/v2/trade/marginType", {
    symbol: venueSymbol,
    marginType: mode === "cross" ? "CROSSED" : "ISOLATED",
  });
}
