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

/**
 * JSON with every integer of 16 digits or more kept as a string: BingX order and position ids are 19-digit integers,
 * which a JSON number rounds (…2168000 for …2167937) — a cancel by that id then names an order that does not exist.
 * Prices, quantities and millisecond times have fewer digits.
 */
export function parseExact(text: string): unknown {
  return JSON.parse(text.replace(/([:,[]\s*)(-?\d{16,})(?=\s*[,}\]])/g, '$1"$2"'));
}

async function timedFetch(url: string, init: RequestInit = {}): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // the abort alone did not always settle a request (x01, 6 Oct: a contracts read stayed pending for hours under
    // memory pressure and every live step waited on it): the read is also raced against a hard deadline
    return await deadline(
      (async () => {
        const res = await fetch(url, { ...init, signal: ctl.signal });
        return parseExact(await res.text());
      })(),
      TIMEOUT_MS + 2_000,
      url.replace(/\?.*$/, ""),
    );
  } finally {
    clearTimeout(timer);
    ctl.abort();
  }
}

/** `p`, or a rejection once `ms` passed — whatever `p` does (it is left to settle on its own). */
export function deadline<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: no answer within ${Math.round(ms / 1000)} s`)), ms);
  });
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
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
  let body: { code?: number; msg?: string; data?: unknown };
  for (let attempt = 0; ; attempt++) {
    const url = signedUrl(HOSTS[network][0], path, secret, {
      ...params,
      recvWindow: 5000,
      timestamp: Date.now(),
    });
    body = (await timedFetch(url, { method, headers: { "X-BX-APIKEY": apiKey } })) as typeof body;
    signedCalls.set(`${method} ${path}`, (signedCalls.get(`${method} ${path}`) ?? 0) + 1);
    // refused as stale (the request left this process seconds after it was signed, e.g. behind a blocked event
    // loop): the exchange executed nothing, so it is signed again with a fresh timestamp and sent once more
    if (Number(body?.code) !== 0 && body?.code != null && attempt === 0 && staleTimestamp(body?.msg)) {
      staleResigned++;
      continue;
    }
    break;
  }
  // a reply without a code (a gateway / proxy body) is no refusal: the outcome is unknown, as after a time-out —
  // an order the exchange did execute must not be taken for "nothing executed" and sent again
  if (body?.code == null || body.code === ("" as never) || !Number.isFinite(Number(body.code)))
    throw new Error(`BingX reply without a code (outcome unknown) [${method} ${path}]`);
  if (Number(body.code) !== 0) {
    // the endpoint travels with the message: a ban names the call that triggered it (and holds back only that one)
    const msg = `${body?.msg || `BingX ${body?.code}`} [${method} ${path}]`;
    if (noteRateLimit(msg)) signedBans.set(`${method} ${path}`, (signedBans.get(`${method} ${path}`) ?? 0) + 1);
    throw new ExchangeRejected(msg, Number(body.code));
  }
  return body.data;
}

/** BingX refusing a signed request for its timestamp ("timestamp is invalid", outside the receive window). */
export const staleTimestamp = (msg: string | undefined) => /timestamp/i.test(msg ?? "");
/** Signed requests sent again after a stale-timestamp refusal, in this process (diagnostics). */
export let staleResigned = 0;

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
export const CANCEL = "DELETE /openApi/swap/v2/trade/order";
/** The order history: read by reports, loss checks and watchdogs, never by the live step. */
export const HISTORY = "GET /openApi/swap/v2/trade/allOrders";
/**
 * The pause of the live step: any ban except one on the open orders (the book then carries the last ones read), on
 * cancels (a refused cancel leaves an own order that the next complete read cleans up) or on the order history (a
 * report's busy read must not stop trading).
 */
export function blockingBanUntil(now = Date.now()): number {
  const s = sharedBans(now);
  let until = 0;
  for (const k of new Set([...banned.keys(), ...Object.keys(s)])) {
    if (k === OPEN_ORDERS || k === CANCEL || k === HISTORY) continue;
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
const contractsLoading = new Map<Network, { at: number; p: Promise<Map<string, ContractSpec>> }>();
/** a shared load older than this is dropped: every host's deadline has passed, it can only be stuck */
const CONTRACTS_LOAD_MS = (TIMEOUT_MS + 2_000) * 3;
export async function fetchContracts(network: Network): Promise<Map<string, ContractSpec>> {
  const c = contracts.get(network);
  if (c && Date.now() - c.at < 600_000) return c.map;
  // one request in flight per network — but never one that stopped settling: every caller after it waited on the
  // same pending promise (x01, 6 Oct: the live step "waiting on: contracts" for 2.5 h)
  const busy = contractsLoading.get(network);
  if (busy && Date.now() - busy.at < CONTRACTS_LOAD_MS) return deadline(busy.p, CONTRACTS_LOAD_MS, "contracts");
  const p = loadContracts(network).finally(() => {
    if (contractsLoading.get(network)?.p === p) contractsLoading.delete(network);
  });
  contractsLoading.set(network, { at: Date.now(), p });
  return deadline(p, CONTRACTS_LOAD_MS, "contracts");
}
/**
 * One contract of /quote/contracts. The lot step is the quantity precision: `size` (the contract's face value) is
 * coarser on a few contracts — SOL 1 with 2 decimals, ETH 0.01 with 3, UMA 0.1 with 3 — and the venue takes
 * quantities at the precision (its own minimum, 0.02 SOL, is one; test orders of 0.02 / 0.03 SOL, 0.001 ETH and
 * 1.5 INJ validate, 7 Oct). Taken as the step, `size` raised SOL's minimum to 1 SOL — 50 × the venue's. `size` is
 * the step only for a contract that names no precision.
 */
export function contractSpecOf(r: Record<string, unknown>): ContractSpec | null {
  const symbol = String(r.symbol ?? "");
  if (!symbol) return null;
  const hasPrec = r.quantityPrecision !== undefined && r.quantityPrecision !== null && r.quantityPrecision !== "";
  const qtyPrec = n(r.quantityPrecision);
  const precStep = 10 ** -Math.max(0, qtyPrec);
  const step = hasPrec ? precStep : n(r.size) || precStep;
  return {
    symbol,
    qtyPrec,
    step: step > 0 ? step : 1,
    minQty: Math.max(n(r.tradeMinQuantity), n(r.tradeMinVolume), n(r.minQty), step, 0),
    pxPrec: n(r.pricePrecision),
    minUsdt: Math.max(n(r.tradeMinUSDT), n(r.minNotional), 0) || 2,
  };
}

async function loadContracts(network: Network): Promise<Map<string, ContractSpec>> {
  const map = new Map<string, ContractSpec>();
  for (const host of HOSTS[network]) {
    try {
      const body = (await timedFetch(`${host}/openApi/swap/v2/quote/contracts`)) as {
        data?: Array<Record<string, unknown>>;
      };
      for (const r of body?.data ?? []) {
        const spec = contractSpecOf(r);
        if (spec) map.set(spec.symbol, spec);
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

/**
 * Floor to the lot step (never larger than qty).
 *
 * The epsilon is RELATIVE to the magnitude, not a fixed 1e-12: `476.53 / 0.01` is `47652.99999999999` in IEEE 754
 * and one ULP there is already 7.3e-12, so a fixed 1e-12 could not lift it over the boundary and the floor dropped
 * a whole step — returning 476.52 for a venue minimum of 476.53. That cost 26 rejected orders across 16 symbols in
 * three days ("The minimum order amount is 476.53 SOLV."), because the quantity we raised to the minimum came back
 * one step under it.
 */
export function snapQtyDown(qty: number, spec?: ContractSpec | null): number {
  if (!(qty > 0)) return 0;
  if (!spec) return qty;
  const n = qty / spec.step;
  const q = Math.floor(n + Math.max(1e-12, Math.abs(n) * 1e-9)) * spec.step;
  // printed at the step's own decimals when they exceed the quantity precision: rounding a floored 1.5 (step 0.5)
  // to precision 0 gave 2 — more than asked, and not flagged as raised
  return Number(Math.max(0, q).toFixed(Math.max(0, spec.qtyPrec, stepDecimals(spec.step))));
}

/** decimals of a lot step (0.001 → 3, 0.5 → 1, 10 → 0) */
function stepDecimals(step: number): number {
  if (!(step > 0) || Number.isInteger(step)) return 0;
  const t = String(step);
  const e = /e-(\d+)$/.exec(t);
  if (e) return Number(e[1]) + (t.split("e")[0].split(".")[1]?.length ?? 0);
  return Math.min(12, t.split(".")[1]?.length ?? 0);
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
  /**
   * A minimum the VENUE itself named (from a reject message, via `minQtyFromReject`), in base units. The result is
   * never below it: our own `minQty` / `minUsdt` view of the contract can be a snapshot taken at another price, so
   * when the exchange has told us the number, that number wins.
   */
  minNamed = 0,
): { qty: number; raised: boolean } {
  if (!(qty > 0) || !(px > 0)) return { qty: 0, raised: false };
  if (!spec) return { qty, raised: false };
  const down = snapQtyDown(qty, spec);
  const minNotional = exchangeMinNotional(spec, px);
  const floor = Math.max(spec.minQty, minNamed);
  if (down >= floor && down * px >= minNotional - 1e-9) return { qty: down, raised: false };
  const need = Math.max(floor, minNotional / px);
  const up = Math.ceil(need / spec.step - Math.max(1e-12, Math.abs(need / spec.step) * 1e-9)) * spec.step;
  const out = Number(up.toFixed(Math.max(0, spec.qtyPrec)));
  // the rounding must never land under what the venue requires: one more step rather than a certain rejection
  return {
    qty: out < need - 1e-12 ? Number((out + spec.step).toFixed(Math.max(0, spec.qtyPrec))) : out,
    raised: true,
  };
}

export function snapPx(px: number, spec?: ContractSpec | null): number {
  if (!(px > 0)) return 0;
  return Number(px.toFixed(Math.max(0, Math.min(8, spec?.pxPrec ?? 4))));
}

/** the smallest price move the venue can represent for this contract (one unit of its price precision) */
export function pxTick(spec?: ContractSpec | null): number {
  return 10 ** -Math.max(0, Math.min(8, spec?.pxPrec ?? 4));
}

/**
 * Clearance, in ticks, between a stop and the mark. One tick is not enough: the mark moves between our read and the
 * venue's check, and a stop that lands on the wrong side of it is refused ("Stop Loss price should be lower than the
 * current price") — which in live x01 closed the position at market instead.
 */
export const STOP_TICK_BUFFER = 4;
/**
 * A floor under the tick-derived distance. Contracts with many price decimals have a tick that is a rounding error
 * of the price (SOLV at 0.0042 with `pxPrec 6` ticks at 0.024 %), and a stop that close is hit by spread alone.
 */
export const VENUE_MIN_STOP_FRAC = 0.0005;

/**
 * The smallest stop distance, as a fraction of the price, that the venue will accept here. Per symbol and per price,
 * because it is derived from the contract's price tick; `VENUE_MIN_STOP_FRAC` floors it, and a distance the venue has
 * already refused (`learned`, kept per symbol by the caller) raises it.
 */
export function minStopDist(px: number, spec?: ContractSpec | null, learned = 0): number {
  if (!(px > 0)) return VENUE_MIN_STOP_FRAC;
  const tickFrac = (pxTick(spec) * STOP_TICK_BUFFER) / px;
  return Math.max(tickFrac, VENUE_MIN_STOP_FRAC, learned);
}

/**
 * Stop price for a position: snapped to the venue's price precision AND at least `minStopDist` away from the mark on
 * the side a stop belongs on (below a long, above a short). Snapping alone is not enough — `snapPx` of a distance
 * tighter than one tick returns the mark itself, and the venue refuses it.
 */
export function stopPxExchange(
  px: number,
  side: 1 | -1,
  dist: number,
  spec?: ContractSpec | null,
  learned = 0,
): number {
  if (!(px > 0)) return 0;
  const d = Math.max(dist, minStopDist(px, spec, learned));
  const tick = pxTick(spec);
  const prec = Math.max(0, Math.min(8, spec?.pxPrec ?? 4));
  // round AWAY from the mark, so the snap never gives back the clearance the distance just bought
  const raw = side === 1 ? px * (1 - d) : px * (1 + d);
  const out = Number((side === 1 ? Math.floor(raw / tick) * tick : Math.ceil(raw / tick) * tick).toFixed(prec));
  if (out <= 0) return 0;
  // a price whose precision cannot hold the clearance (a sub-tick price): one whole tick off the mark
  const need = side === 1 ? px - tick * STOP_TICK_BUFFER : px + tick * STOP_TICK_BUFFER;
  if (side === 1 && out >= px) return Number(Math.max(tick, need).toFixed(prec));
  if (side === -1 && out <= px) return Number(need.toFixed(prec));
  return out;
}

/**
 * The venue refused a stop for sitting on the wrong side of the mark — "Stop Loss price should be lower than the
 * current price" and its family. Unlike the quantity refusal this message names NO number, which is why there is no
 * value to parse: the caller widens (`widenStopDist`) and remembers the distance that was refused.
 */
export function stopTooClose(msg: string): boolean {
  const m = msg.toLowerCase();
  if (/(stop|trigger)\s*(loss\s*)?price should be (lower|higher|greater|less)/.test(m)) return true;
  return /(stop|trigger).{0,24}(too close|immediately|current price)/.test(m);
}

/**
 * The distance to try after the venue refused one for being too close: a real step wider (never a hair, which would
 * just buy another rejection), bounded so a refusal cannot walk the stop out to a meaningless distance.
 */
export function widenStopDist(dist: number, px: number, spec?: ContractSpec | null): number {
  const floor = minStopDist(px, spec);
  return Math.min(0.2, Math.max(dist * 2, floor * 2, floor + pxTick(spec) * STOP_TICK_BUFFER * 2));
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

/**
 * "there is no position to close" refusals: that side is already flat (its stop filled, or an earlier close of
 * ours landed after the book read this step used). The exit already happened, so it is not an error.
 */
/**
 * The side already carries a close-position stop (BingX keeps one per position side): a leftover of ours (a close
 * whose cancels failed, a manual close) refused the new position's stop, and the protective close then undid the
 * open — a full round trip for nothing.
 */
export function stopAlreadyExists(msg: string): boolean {
  return /(sl|stop).{0,24}order already exists|109400/i.test(msg);
}

export function alreadyFlat(msg: string): boolean {
  return /no position|position not exist|position does not exist|positions? is zero|position size is 0/i.test(
    msg,
  );
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
  /** the liquidation price the exchange reports for it (0 / unset: none reported) */
  liq?: number;
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
      const book = { positions, orders: last.book.orders, ordersAt: last.book.ordersAt ?? last.startedAt };
      share(file, startedAt, book);
      return book;
    }
  }
  const book = await readBook(network, conn);
  lastBook.set(conn, { startedAt, book });
  share(file, startedAt, book);
  return book;
}
/** the book for the other processes on the account (CTS_BINGX_BOOK_FILE) */
function share(file: string, startedAt: number, book: Book) {
  if (file)
    try {
      writeFileSync(`${file}.${process.pid}`, JSON.stringify({ startedAt, book }));
      renameSync(`${file}.${process.pid}`, file);
    } catch {
      // best effort
    }
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
      liq: n(r.liquidationPrice),
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

/** Leverage of one symbol: the current long / short leverage and the maximum the exchange allows per side. */
export interface LeverageInfo {
  long: number;
  short: number;
  maxLong: number;
  maxShort: number;
}

export function parseLeverage(raw: unknown): LeverageInfo | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (k: string) => Number(r[k]);
  const out = {
    long: n("longLeverage"),
    short: n("shortLeverage"),
    maxLong: n("maxLongLeverage"),
    maxShort: n("maxShortLeverage"),
  };
  return out.maxLong > 0 && out.maxShort > 0 ? out : null;
}

export async function fetchLeverage(network: Network, conn: ConnId, venueSymbol: string): Promise<LeverageInfo | null> {
  return parseLeverage(await signed(network, conn, "GET", "/openApi/swap/v2/trade/leverage", { symbol: venueSymbol }));
}

/** Leverage of one symbol and side (LONG / SHORT in hedge mode, BOTH in one-way mode). */
export async function setLeverage(
  network: Network,
  conn: ConnId,
  venueSymbol: string,
  side: "LONG" | "SHORT" | "BOTH",
  leverage: number,
): Promise<void> {
  await signed(network, conn, "POST", "/openApi/swap/v2/trade/leverage", {
    symbol: venueSymbol,
    side,
    leverage: Math.max(1, Math.floor(leverage)),
  });
}
