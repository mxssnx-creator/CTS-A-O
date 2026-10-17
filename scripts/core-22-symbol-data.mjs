#!/usr/bin/env node
// Frozen, unsigned public OHLCV acquisition only. No credentials, account clients, runtime or order APIs.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const M = 60_000, H = 60 * M;
const endpoint = "https://open-api.bingx.com/openApi/swap/v3/quote/klines";
const symbols = ["AVAX-USDT", "LINK-USDT", "LTC-USDT", "SUI-USDT", "NEAR-USDT", "DOT-USDT", "ATOM-USDT", "APT-USDT", "BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT", "BNB-USDT", "DOGE-USDT", "ADA-USDT", "BCH-USDT", "TRX-USDT", "ETC-USDT", "OP-USDT", "ARB-USDT", "FIL-USDT", "UNI-USDT"];
const endT = Date.parse("2026-10-17T21:00:00Z");
const tradeStartT = endT - 24 * H, evaluationFromT = tradeStartT - 7 * 24 * H;
const startT = evaluationFromT - 205 * H;
const dir = resolve(process.argv[2] ?? "runs/symbols22-24h-20261017-v2");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const atomic = async (path, value) => {
  const bytes = typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n";
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path + ".tmp", bytes); await rename(path + ".tmp", path);
  return { bytes: Buffer.byteLength(bytes), sha256: hash(bytes) };
};
const contract = {
  schema: "cts-public-22-symbol-24h-market-v1", endpoint, symbols,
  startT, indicatorWarmupStartT: startT, indicatorWarmupHours: 205, evaluationFromT,
  evaluatedPrehistoryHours: 168, tradeStartT, simulatedHours: 24, endT,
  bounds: "1m candle-open timestamps in [startT,endT); only completed candles; older warmup excluded from performance via evaluationFromT",
  acquisition: { method: "GET", credentials: false, requestBody: null, interval: "1m", limit: 1440, minRequestStartIntervalMs: 1100, timeoutMs: 15000, maxAttempts: 3 },
  selection: "Fixed original eight research symbols plus fourteen liquid USDT contracts, frozen before scoring; no performance-based replacement. TON-USDT was unavailable (public API 109425) and replaced by available ETC-USDT before scoring; the original failed acquisition and availability-only amendment remain retained. First twenty retain the same fixed order as the twenty-symbol subset.",
  usage: "Public market evidence only; no account, settings, order or live-promotion action. Freeze config/gates independently before simulation scoring.",
};
await mkdir(dir, { recursive: true });
const protocolFile = join(dir, "protocol.json");
let protocol;
if (existsSync(protocolFile)) {
  protocol = JSON.parse(await readFile(protocolFile, "utf8"));
  const { frozenAt: _frozenAt, ...saved } = protocol;
  if (JSON.stringify(saved) !== JSON.stringify(contract)) throw new Error("Existing frozen acquisition protocol differs");
} else {
  protocol = { frozenAt: new Date().toISOString(), ...contract };
  await atomic(protocolFile, protocol);
}
console.log(JSON.stringify({ frozen: true, dir, symbols: symbols.length, start: new Date(startT).toISOString(), evaluationFrom: new Date(evaluationFromT).toISOString(), tradeStart: new Date(tradeStartT).toISOString(), end: new Date(endT).toISOString(), barsPerSymbol: (endT - startT) / M }));

function candlesOf(raw, from, to) {
  if (raw?.code !== 0 || !Array.isArray(raw.data)) throw new Error(`Public OHLCV response code ${raw?.code}: ${raw?.msg}`);
  const map = new Map();
  for (const r of raw.data) {
    if (["time", "open", "high", "low", "close", "volume"].some((k) => r[k] === undefined || r[k] === null || String(r[k]).trim() === "")) throw new Error("Missing OHLCV value");
    const c = { t: Number(r.time), o: Number(r.open), h: Number(r.high), l: Number(r.low), c: Number(r.close), v: Number(r.volume) };
    if (!Object.values(c).every(Number.isFinite) || !Number.isSafeInteger(c.t) || c.t % M || c.t < from || c.t >= to || Math.min(c.o, c.h, c.l, c.c) <= 0 || c.h < Math.max(c.o, c.c) || c.l > Math.min(c.o, c.c) || c.v < 0) throw new Error(`Invalid OHLCV at ${r.time}`);
    const old = map.get(c.t);
    if (old && JSON.stringify(old) !== JSON.stringify(c)) throw new Error(`Conflicting duplicate at ${c.t}`);
    map.set(c.t, c);
  }
  const cs = [...map.values()].sort((a, b) => a.t - b.t);
  if (cs.length !== (to - from) / M) throw new Error(`Expected ${(to - from) / M} candles, received ${cs.length}`);
  for (let i = 0; i < cs.length; i++) if (cs[i].t !== from + i * M) throw new Error(`Candle gap at ${from + i * M}`);
  return cs;
}

const requestsFile = join(dir, "requests.json");
const requests = existsSync(requestsFile) ? JSON.parse(await readFile(requestsFile, "utf8")) : [];
let nextRequestAt = 0;
const feed = { tickers: [], candles: {} }, quality = {};
try {
  for (const sym of symbols) {
    const all = [];
    let page = 0;
    for (let from = startT; from < endT; from += 1440 * M, page++) {
      const to = Math.min(endT, from + 1440 * M);
      const rawFile = join(dir, "raw-public", sym, `${page}.json`);
      let raw;
      if (existsSync(rawFile)) raw = JSON.parse(await readFile(rawFile, "utf8"));
      else {
        const url = `${endpoint}?${new URLSearchParams({ symbol: sym, interval: "1m", startTime: String(from), endTime: String(to - 1), limit: "1440" })}`;
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise((r) => setTimeout(r, Math.max(0, nextRequestAt - Date.now())));
          nextRequestAt = Date.now() + 1100;
          const at = new Date().toISOString();
          try {
            const res = await fetch(url, { method: "GET", headers: { accept: "application/json" }, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000) });
            const text = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            raw = JSON.parse(text); candlesOf(raw, from, to);
            const meta = await atomic(rawFile, text);
            requests.push({ sym, page, from, to, at, attempt, url, method: "GET", credentials: false, http: res.status, ...meta });
            await atomic(requestsFile, requests);
            break;
          } catch (e) {
            requests.push({ sym, page, from, to, at, attempt, url, method: "GET", credentials: false, error: String(e) });
            await atomic(requestsFile, requests);
            if (attempt === 3) throw e;
            await new Promise((r) => setTimeout(r, attempt * 2000));
          }
        }
      }
      all.push(...candlesOf(raw, from, to));
    }
    if (all.length !== (endT - startT) / M) throw new Error(`Incomplete assembled symbol ${sym}`);
    feed.candles[`${sym}|1`] = all;
    const hourly = [];
    for (let i = 0; i < all.length; i += 60) {
      const rows = all.slice(i, i + 60);
      if (rows.length !== 60 || rows[0].t % H) throw new Error(`Incomplete aligned hourly bucket ${sym}`);
      hourly.push({ t: rows[0].t, o: rows[0].o, h: Math.max(...rows.map((c) => c.h)), l: Math.min(...rows.map((c) => c.l)), c: rows.at(-1).c, v: rows.reduce((n, c) => n + c.v, 0) });
    }
    feed.candles[`${sym}|60`] = hourly;
    const pre = all.filter((c) => c.t >= tradeStartT - 24 * H && c.t < tradeStartT);
    feed.tickers.push({ sym, last: pre.at(-1).c, quoteVol: pre.reduce((n, c) => n + c.v * c.c, 0), changePct: (pre.at(-1).c / pre[0].o - 1) * 100 });
    quality[sym] = { bars: all.length, hourlyBars: hourly.length, first: all[0].t, last: all.at(-1).t, gaps: 0, futureBars: 0 };
    console.log(`${sym}: ${all.length} completed 1m bars, ${hourly.length} aligned 60m bars validated (${Object.keys(quality).length}/${symbols.length})`);
  }
  const feedMeta = await atomic(join(dir, "feed.json"), JSON.stringify(feed));
  const priorFile = join(dir, "availability-amendment.json");
  const priorAcquisition = existsSync(priorFile) ? { amendmentPath: "availability-amendment.json", amendmentSha256: hash(await readFile(priorFile)) } : null;
  const manifest = { schema: "cts-public-22-symbol-24h-market-manifest-v1", completedAt: new Date().toISOString(), protocolSha256: hash(await readFile(protocolFile)), scriptSha256: hash(await readFile(fileURLToPath(import.meta.url))), feed: { path: "feed.json", ...feedMeta }, symbols, quality, acquisition: { endpoint, method: "GET", credentials: false, requests: requests.length, priorAcquisition }, startT, evaluationFromT, tradeStartT, endT };
  await atomic(join(dir, "market-manifest.json"), manifest);
  console.log(JSON.stringify({ complete: true, dir, symbols: symbols.length, ...feedMeta }));
} catch (e) {
  await atomic(join(dir, "acquisition-failure.json"), { at: new Date().toISOString(), error: String(e), completeSymbols: Object.keys(quality), quality });
  throw e;
}
