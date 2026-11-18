// BingX perpetual-swap PUBLIC market data (no keys). Used for real historical and live bars.
import type { Candle } from "../domain/types.ts";

export const BINGX_HOSTS = {
  mainnet: "https://open-api.bingx.com",
  testnet: "https://open-api-vst.bingx.com",
} as const;

export interface Ticker {
  sym: string; // venue symbol, e.g. BTC-USDT
  last: number;
  quoteVol: number;
  changePct: number;
}

const TF: Record<number, string> = { 1: "1m", 3: "3m", 5: "5m", 15: "15m", 30: "30m", 60: "1h" };

/**
 * BingX answers 100410 ("retry later") when public market calls come faster than about 100 per 10 s per IP, and the
 * engine then pauses EVERY call (the live step included) for 60 s at a time. A 100-symbol desk asks for every symbol's
 * new bar at each minute rollover, on top of its boot traffic: all public calls share this spacing gate, so the burst
 * is spread (5 calls a second by default; at 7 a second from this sandbox's shared IP BingX still answered 100410 — 68 klines
 * calls in 10 s) instead of refused. CTS_BINGX_PUBLIC_GAP_MS sets the gap (0 = off); node's
 * own test runs have none.
 */
export function reserveSlot(next: number, now: number, gapMs: number): { at: number; next: number } {
  if (!(gapMs > 0)) return { at: now, next };
  const at = Math.max(now, next);
  return { at, next: at + gapMs };
}
/**
 * The gap adapts: every ban (BingX 100410) doubles it, up to 8× the base, and 5 minutes without a ban halve it again —
 * the right pace depends on who else sends from this IP, which no setting knows in advance.
 */
export const BOOST_MAX = 8;
export const BOOST_DECAY_MS = 300_000;
export function nextBoost(boost: number, event: "ban" | "quiet"): number {
  return event === "ban" ? Math.min(BOOST_MAX, boost * 2) : Math.max(1, boost / 2);
}
let gapBoost = 1;
let boostAt = 0;
/** A rate-limit ban was seen: slow the public calls (one step per 5 s, however many ban lines arrive at once). */
export function noteRateBan(now = Date.now()): void {
  if (now - boostAt < 5_000) return;
  gapBoost = nextBoost(gapBoost, "ban");
  boostAt = now;
}
export const publicGapBoost = () => gapBoost;
let publicNext = 0;
const publicGapMs = () => {
  const e = process.env.CTS_BINGX_PUBLIC_GAP_MS;
  if (e !== undefined && e !== "") return Math.max(0, Number(e) || 0) * gapBoost;
  if (process.env.NODE_TEST_CONTEXT) return 0;
  const now = Date.now();
  if (gapBoost > 1 && now - boostAt >= BOOST_DECAY_MS) {
    gapBoost = nextBoost(gapBoost, "quiet");
    boostAt = now;
  }
  return 200 * gapBoost;
};
const recentPublicCalls: Array<{ t: number; path: string }> = [];
/** The public calls sent in the last windowMs, counted per path (a ban line names who was sending). */
export function recentPublic(windowMs = 10_000, now = Date.now()): string {
  while (recentPublicCalls.length && recentPublicCalls[0].t < now - 60_000) recentPublicCalls.shift();
  const by = new Map<string, number>();
  for (const c of recentPublicCalls) if (c.t >= now - windowMs) by.set(c.path, (by.get(c.path) ?? 0) + 1);
  return [...by].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join(", ") || "none";
}
async function pacePublic(): Promise<void> {
  const r = reserveSlot(publicNext, Date.now(), publicGapMs());
  publicNext = r.next;
  const wait = r.at - Date.now();
  if (wait > 0) await new Promise((res) => setTimeout(res, wait));
}

async function getJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  await pacePublic();
  recentPublicCalls.push({ t: Date.now(), path: url.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "") });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let late: ReturnType<typeof setTimeout> | undefined;
  try {
    // raced against a hard deadline as well: the abort alone did not always settle a read (x01, 6 Oct: the live
    // step waited on tickers past its 180 s watchdog)
    const read = (async () => {
      const res = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
      const text = await res.text();
      const body = JSON.parse(text) as { code?: number; msg?: string; data?: unknown };
      if (body.code !== 0) throw new Error(`BingX ${body.code}: ${body.msg || res.status}`);
      return body.data;
    })();
    const deadline = new Promise<never>((_, reject) => {
      late = setTimeout(
        () => reject(new Error(`${url.replace(/\?.*$/, "")}: no answer within ${Math.round((timeoutMs + 2_000) / 1000)} s`)),
        timeoutMs + 2_000,
      );
    });
    return await Promise.race([read, deadline]);
  } finally {
    clearTimeout(timer);
    clearTimeout(late);
    ctl.abort();
  }
}

export async function fetchTickers(host: string = BINGX_HOSTS.mainnet): Promise<Ticker[]> {
  const data = (await getJson(`${host}/openApi/swap/v2/quote/ticker`)) as Array<
    Record<string, string>
  >;
  return data
    .filter((r) => /-USDT$/.test(r.symbol))
    .map((r) => ({
      sym: r.symbol,
      last: Number(r.lastPrice),
      quoteVol: Number(r.quoteVolume),
      changePct: Number(r.priceChangePercent),
    }))
    .filter((t) => Number.isFinite(t.last) && t.last > 0 && Number.isFinite(t.quoteVol));
}

/** Top symbols by 24h quote volume (skips stable/stable pairs and index-like tickers). */
export function pickUniverse(tickers: readonly Ticker[], n: number): string[] {
  const skip = /^(USDC|FDUSD|TUSD|DAI|BUSD|USDE|NCCO|NCSK|NCFX|NCSI)/;
  return [...tickers]
    .filter((t) => !skip.test(t.sym))
    .sort((a, b) => b.quoteVol - a.quoteVol)
    .slice(0, n)
    .map((t) => t.sym);
}

export type SymbolRank = "volatility1h" | "volume" | "market" | "gainers" | "losers";
export const SYMBOL_RANKS: ReadonlyArray<{ id: SymbolRank; label: string }> = [
  { id: "volatility1h", label: "1H volatility" },
  { id: "volume", label: "24h volume" },
  { id: "market", label: "Market (majors first)" },
  { id: "gainers", label: "24h gainers" },
  { id: "losers", label: "24h losers" },
];
/** Market leaders, in order, for the "market" ranking. */
export const MAJORS = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "XRP-USDT",
  "BNB-USDT",
  "DOGE-USDT",
  "ADA-USDT",
  "TRX-USDT",
  "LINK-USDT",
  "AVAX-USDT",
  "SUI-USDT",
  "TON-USDT",
  "LTC-USDT",
  "BCH-USDT",
  "DOT-USDT",
  "NEAR-USDT",
  "APT-USDT",
  "UNI-USDT",
  "AAVE-USDT",
  "ETC-USDT",
];

/** "xrp", "XRPUSDT", "xrp-usdt" → "XRP-USDT" */
export const normSymbol = (s: string) => {
  const u = s.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!u) return "";
  return u.includes("-") ? u : `${u.replace(/USDT$/, "")}-USDT`;
};

/**
 * The universe with forced symbols: the forced ones first (always traded, whatever their rank), then the ranking
 * without them, n in all (never fewer than the forced ones).
 */
/** The ranking without the excluded symbols (a replacement moves up into the freed place). */
export function dropExcluded(ranked: readonly string[], excluded: readonly string[] | undefined): string[] {
  const ex = new Set((excluded ?? []).map(normSymbol).filter(Boolean));
  return ranked.filter((x) => !ex.has(x));
}

export function forceSymbols(ranked: readonly string[], forced: readonly string[] | undefined, n: number): string[] {
  const f = [...new Set((forced ?? []).map(normSymbol).filter(Boolean))];
  if (!f.length) return ranked.slice(0, n);
  const set = new Set(f);
  return [...f, ...ranked.filter((x) => !set.has(x))].slice(0, Math.max(n, f.length));
}

/**
 * Symbols for the universe by the chosen ranking. Only liquid pairs (≥ $2M 24h volume, among the 150 most
 * traded) are candidates, so a ranking never picks an untradeable coin. "volatility1h" = mean high-low range of the
 * last 3 closed hours (falls back to |24h change| for a symbol whose klines are unavailable).
 */
export async function rankUniverse(
  tickers: readonly Ticker[],
  n: number,
  rank: SymbolRank,
  klines: typeof fetchKlines = fetchKlines,
): Promise<string[]> {
  const skip = /^(USDC|FDUSD|TUSD|DAI|BUSD|USDE|NCCO|NCSK|NCFX|NCSI)/;
  const liquid = [...tickers]
    .filter((t) => !skip.test(t.sym))
    .sort((a, b) => b.quoteVol - a.quoteVol);
  const pool = liquid
    .filter((t, i) => i < 150 && (t.quoteVol >= 2e6 || i < n))
    .slice(0, Math.max(150, n));
  const take = (xs: readonly Ticker[]) => xs.slice(0, n).map((t) => t.sym);
  switch (rank) {
    case "volume":
      return take(pool);
    case "market": {
      const by = new Map(pool.map((t) => [t.sym, t]));
      const majors = MAJORS.map((s) => by.get(s)).filter((t): t is Ticker => !!t);
      return take([...majors, ...pool.filter((t) => !MAJORS.includes(t.sym))]);
    }
    case "gainers":
      return take([...pool].sort((a, b) => b.changePct - a.changePct));
    case "losers":
      return take([...pool].sort((a, b) => a.changePct - b.changePct));
    case "volatility1h": {
      const vol = new Map<string, number>();
      let i = 0;
      const now = Date.now();
      await Promise.all(
        Array.from({ length: Math.min(8, pool.length) }, async () => {
          while (i < pool.length) {
            const t = pool[i++];
            try {
              const cs = (await klines(t.sym, 60, { limit: 4, nowT: now })).slice(-3);
              if (cs.length)
                vol.set(t.sym, cs.reduce((a, c) => a + (c.h - c.l) / c.c, 0) / cs.length);
            } catch {
              /* fallback below */
            }
          }
        }),
      );
      const score = (t: Ticker) => vol.get(t.sym) ?? Math.abs(t.changePct) / 100 / 24;
      return take([...pool].sort((a, b) => score(b) - score(a)));
    }
  }
}

/** One kline page (max 1440), ascending by time. Only CLOSED bars are returned. */
export async function fetchKlines(
  sym: string,
  tfMin: number,
  opt: { startT?: number; endT?: number; limit?: number; host?: string; nowT?: number } = {},
): Promise<Candle[]> {
  const iv = TF[tfMin];
  if (!iv) throw new Error(`unsupported timeframe ${tfMin}m`);
  const q = new URLSearchParams({
    symbol: sym,
    interval: iv,
    limit: String(Math.min(opt.limit ?? 1440, 1440)),
  });
  if (opt.startT) q.set("startTime", String(opt.startT));
  if (opt.endT) q.set("endTime", String(opt.endT));
  const data = (await getJson(
    `${opt.host ?? BINGX_HOSTS.mainnet}/openApi/swap/v3/quote/klines?${q}`,
  )) as Array<Record<string, string | number>>;
  const now = opt.nowT ?? Date.now();
  const tfMs = tfMin * 60_000;
  const out: Candle[] = [];
  for (const r of data) {
    const t = Number(r.time);
    if (!(t + tfMs <= now)) continue; // still forming
    const c: Candle = {
      t,
      o: Number(r.open),
      h: Number(r.high),
      l: Number(r.low),
      c: Number(r.close),
      // a missing or bad volume is 0, never NaN: one NaN made every running volume sum NaN for the whole history
      v: Number.isFinite(Number(r.volume)) && Number(r.volume) >= 0 ? Number(r.volume) : 0,
    };
    if ([c.o, c.h, c.l, c.c].every((x) => Number.isFinite(x) && x > 0)) out.push(c);
  }
  out.sort((a, b) => a.t - b.t);
  return dedupe(out);
}

function dedupe(xs: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (const x of xs) if (!out.length || out[out.length - 1].t !== x.t) out.push(x);
  return out;
}

/** Backfill `bars` closed bars ending now, paging backwards. */
export async function fetchHistory(
  sym: string,
  tfMin: number,
  bars: number,
  opt: { host?: string; nowT?: number; pauseMs?: number } = {},
): Promise<Candle[]> {
  const tfMs = tfMin * 60_000;
  const now = opt.nowT ?? Date.now();
  let endT = Math.floor(now / tfMs) * tfMs - 1;
  const pages: Candle[][] = [];
  let got = 0;
  for (let guard = 0; guard < 20 && got < bars; guard++) {
    const need = Math.min(1440, bars - got);
    const startT = endT - need * tfMs + 1;
    const page = await fetchKlines(sym, tfMin, {
      startT,
      endT,
      limit: need,
      host: opt.host,
      nowT: now,
    });
    if (!page.length) break;
    pages.unshift(page);
    got += page.length;
    endT = page[0].t - 1;
    if (opt.pauseMs) await new Promise((r) => setTimeout(r, opt.pauseMs));
  }
  const all = dedupe(pages.flat().sort((a, b) => a.t - b.t));
  return all.slice(Math.max(0, all.length - bars));
}
