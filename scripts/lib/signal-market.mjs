// Public OHLCV protocol validation. This module never imports a runtime or account client.
export const SIGNAL_MARKET_ENDPOINT = "https://open-api.bingx.com/openApi/swap/v3/quote/klines";
const M = 60_000;

export function validateSignalMarketProtocol(p) {
  if (p?.schema !== "cts-signal-six-hour-protocol-v1" || p.endpoint !== SIGNAL_MARKET_ENDPOINT)
    throw new Error("Unexpected public market protocol/endpoint");
  if (!Array.isArray(p.symbols) || p.symbols.length !== 12 || new Set(p.symbols).size !== 12 ||
    p.symbols.some((s) => !/^[A-Z0-9]+-USDT$/.test(s))) throw new Error("Expected twelve unique fixed USDT symbols");
  if (![p.startT, p.tradeStartT, p.endT].every((t) => Number.isSafeInteger(t) && t % M === 0) ||
    p.tradeStartT - p.startT !== 6 * 60 * M || p.endT - p.tradeStartT !== 6 * 60 * M)
    throw new Error("Expected exactly six hours prehistory and six hours trading");
  if (p.acquisition?.credentials !== false || p.acquisition.method !== "GET" || p.acquisition.requestBody !== null ||
    p.acquisition.interval !== "1m" || p.acquisition.limit !== 1440 || p.acquisition.expectedBarsPerSymbol !== 720 ||
    p.acquisition.maxAttempts !== 2 || p.acquisition.minRequestStartIntervalMs < 1100)
    throw new Error("Unexpected public-only request contract");
  return p;
}

export function signalMarketUrl(p, sym) {
  validateSignalMarketProtocol(p);
  if (!p.symbols.includes(sym)) throw new Error("Symbol was not frozen in the protocol");
  return `${SIGNAL_MARKET_ENDPOINT}?${new URLSearchParams({ symbol: sym, interval: "1m", startTime: String(p.startT), endTime: String(p.endT - 1), limit: "1440" })}`;
}

export function validateSignalCandles(raw, p) {
  const byTime = new Map();
  let identicalDuplicates = 0;
  if (!Array.isArray(raw)) throw new Error("OHLCV data is not an array");
  for (const r of raw) {
    if (!r || ["time", "open", "high", "low", "close", "volume"].some((k) => r[k] === null || r[k] === undefined || String(r[k]).trim() === ""))
      throw new Error("Missing OHLCV field");
    const c = { t: Number(r.time), o: Number(r.open), h: Number(r.high), l: Number(r.low), c: Number(r.close), v: Number(r.volume) };
    if (!Object.values(c).every(Number.isFinite) || !Number.isSafeInteger(c.t) || c.t % M ||
      c.t < p.startT || c.t + M > p.endT || c.l <= 0 || c.l > Math.min(c.o, c.c) ||
      c.h < Math.max(c.o, c.c) || c.v < 0) throw new Error(`Invalid OHLCV candle at ${r.time}`);
    const old = byTime.get(c.t);
    if (old) {
      if (JSON.stringify(old) !== JSON.stringify(c)) throw new Error(`Conflicting duplicate at ${c.t}`);
      identicalDuplicates++;
    } else byTime.set(c.t, c);
  }
  const candles = [...byTime.values()].sort((a, b) => a.t - b.t);
  const expected = (p.endT - p.startT) / M;
  if (candles.length !== expected) throw new Error(`Expected ${expected} completed candles, received ${candles.length}`);
  for (let i = 0; i < expected; i++) if (candles[i].t !== p.startT + i * M) throw new Error(`Candle gap at ${p.startT + i * M}`);
  return { candles, identicalDuplicates };
}

/** Ranking metadata uses prehistory only; all symbols remain forced and are never selected by these values. */
export function signalTicker(sym, candles, tradeStartT) {
  const pre = candles.filter((c) => c.t + M <= tradeStartT);
  if (!pre.length) throw new Error("No prehistory for ticker metadata");
  return { sym, last: pre.at(-1).c, quoteVol: pre.reduce((n, c) => n + c.v * c.c, 0), changePct: (pre.at(-1).c / pre[0].o - 1) * 100 };
}

/** Merge validated cached public arrays, checking every overlap rather than preferring a newer source. */
export function mergeSignalMarketCaches(sources, p) {
  const startT = p.indicatorWarmupStartT;
  if (p.schema !== "cts-signal-six-hour-protocol-v2" || !Number.isSafeInteger(startT) ||
    p.startT !== p.evaluationFromT || p.tradeStartT - p.startT !== 6 * 60 * M || p.endT - p.tradeStartT !== 6 * 60 * M ||
    p.startT - startT !== p.indicatorWarmupBars30m * 30 * M || p.acquisition.newRequests !== 0)
    throw new Error("Unexpected warmup-only cached protocol");
  const feed = { tickers: [], candles: {} }, quality = {};
  for (const sym of p.symbols) {
    const all = new Map(); let identicalOverlaps = 0;
    for (const source of sources) {
      const rows = source?.candles?.[`${sym}|1`] ?? source?.[sym] ?? [];
      if (!Array.isArray(rows)) throw new Error(`Invalid cache series for ${sym}`);
      for (const r of rows) {
        if (r.t < startT || r.t >= p.endT) continue;
        const c = Object.fromEntries(["t", "o", "h", "l", "c", "v"].map((k) => [k, r[k]]));
        if (!Object.values(c).every((x) => typeof x === "number" && Number.isFinite(x)) ||
          !Number.isSafeInteger(c.t) || c.t % M || c.l <= 0 || c.l > Math.min(c.o, c.c) || c.h < Math.max(c.o, c.c) || c.v < 0)
          throw new Error(`Invalid cached OHLCV for ${sym} at ${r.t}`);
        const old = all.get(c.t);
        if (old) {
          if (JSON.stringify(old) !== JSON.stringify(c)) throw new Error(`Conflicting cached overlap for ${sym} at ${c.t}`);
          identicalOverlaps++;
        } else all.set(c.t, c);
      }
    }
    const cs = [...all.values()].sort((a, b) => a.t - b.t), expected = (p.endT - startT) / M;
    if (cs.length !== expected) throw new Error(`Expected ${expected} cached candles for ${sym}, received ${cs.length}`);
    for (let i = 0; i < cs.length; i++) if (cs[i].t !== startT + i * M) throw new Error(`Cached gap for ${sym} at ${startT + i * M}`);
    feed.candles[`${sym}|1`] = cs;
    feed.tickers.push(signalTicker(sym, cs.filter((c) => c.t >= p.evaluationFromT), p.tradeStartT));
    quality[sym] = { bars: cs.length, first: cs[0].t, last: cs.at(-1).t, gaps: 0, identicalOverlaps };
  }
  return { feed, quality };
}
