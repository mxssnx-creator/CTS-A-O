#!/usr/bin/env node
// Isolated UNSIGNED PUBLIC GET acquisition only. No environment, credentials, runtime or order client reads.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { signalMarketUrl, signalTicker, validateSignalCandles, validateSignalMarketProtocol } from "./lib/signal-market.mjs";

const protocolFile = process.argv[2];
if (!protocolFile || process.argv.length !== 3) throw new Error("Usage: node scripts/core-signal-market.mjs frozen-protocol.json");
const p = validateSignalMarketProtocol(JSON.parse(await readFile(protocolFile, "utf8")));
const dir = dirname(resolve(protocolFile));
const sha = (s) => createHash("sha256").update(s).digest("hex");
const atomic = async (name, value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const path = join(dir, name);
  await writeFile(path + ".tmp", text); await rename(path + ".tmp", path);
  return { bytes: Buffer.byteLength(text), sha256: sha(text) };
};
await mkdir(join(dir, "raw-public"), { recursive: true });
const requests = [];
const feed = { tickers: [], candles: {} };
const quality = {};
let nextRequestAt = 0;
try {
  for (const sym of p.symbols) {
    const url = signalMarketUrl(p, sym);
    let data;
    for (let attempt = 0; attempt < p.acquisition.maxAttempts; attempt++) {
      const pause = Math.max(0, nextRequestAt - Date.now());
      if (pause) await new Promise((r) => setTimeout(r, pause));
      nextRequestAt = Date.now() + p.acquisition.minRequestStartIntervalMs;
      const began = new Date().toISOString();
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), p.acquisition.timeoutMs);
      try {
        // An explicit URL, GET, constant Accept header, no body, no credentials, and redirects refused.
        const res = await fetch(url, { method: "GET", headers: { accept: "application/json" }, credentials: "omit", redirect: "error", signal: ctl.signal });
        const text = await res.text();
        const body = JSON.parse(text);
        const rawFile = `raw-public/${sym}.json`;
        if (!res.ok || body.code !== 0 || !Array.isArray(body.data)) throw new Error(`HTTP ${res.status}; public OHLCV code ${body.code}`);
        data = validateSignalCandles(body.data, p);
        const raw = await atomic(rawFile, text);
        requests.push({ sym, url, method: "GET", credentials: false, body: null, at: began, attempt: attempt + 1, http: res.status, rows: body.data.length, rawFile, ...raw });
        break;
      } catch (e) {
        requests.push({ sym, url, method: "GET", credentials: false, body: null, at: began, attempt: attempt + 1, error: String(e) });
        if (attempt + 1 === p.acquisition.maxAttempts) throw e;
      } finally { clearTimeout(timer); }
    }
    feed.candles[`${sym}|1`] = data.candles;
    feed.tickers.push(signalTicker(sym, data.candles, p.tradeStartT));
    quality[sym] = { bars: data.candles.length, first: data.candles[0].t, last: data.candles.at(-1).t, gaps: 0, identicalDuplicates: data.identicalDuplicates };
    console.log(`${sym}: ${data.candles.length} completed public 1m candles validated`);
    await atomic("requests.json", requests);
  }
  const feedMeta = await atomic("feed.json", feed);
  await atomic("market-manifest.json", { schema: "cts-signal-six-hour-market-v1", completedAt: new Date().toISOString(), protocolSha256: sha(await readFile(protocolFile)), source: p.endpoint, credentials: false, startT: p.startT, endT: p.endT, symbols: p.symbols, quality, feed: { path: "feed.json", ...feedMeta }, requests: requests.length });
  console.log(JSON.stringify({ complete: true, symbols: p.symbols.length, bars: Object.values(quality).reduce((n, x) => n + x.bars, 0), ...feedMeta }));
} catch (e) {
  await atomic("requests.json", requests);
  await atomic("acquisition-failure.json", { at: new Date().toISOString(), error: String(e), completeSymbols: Object.keys(quality), quality });
  throw e;
}
