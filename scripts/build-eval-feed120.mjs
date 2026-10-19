#!/usr/bin/env node
// Extends the causal evaluation feed to 120 symbols (docs/evaluation-2026-10/PROTOCOL-7.md, step 2). Reads the 60-symbol
// runs/eval/feed.json, adds the next symbols by the exchange's 24 h quote volume with 18 days of public 1 m klines each (the same
// span), trims them to the feed's 25,920 bars, resamples 5/15/30 m with the engine's resample(), and writes runs/eval/feed120.json.
// Symbols the exchange rate-limits (BingX 100410) are retried with back-off, then replaced by the next by volume.
//
//   node --experimental-strip-types scripts/build-eval-feed120.mjs [120]
// Prints the symbol count and the span; the feed's SHA-256 is printed by sha256sum (runs/ is not committed).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const bx = await import("../src/core/market/bingx.ts");
const { resample } = await import("../src/core/market/bars.ts");
const TARGET = Number(process.argv[2] ?? 120);
const NOW = Date.parse("2026-10-11T12:55:00Z"); // one minute past the existing feed's last bar (12:54)
const BARS = 26000; // ~18 days of 1 m bars, the same span as the desk's feed
const old = JSON.parse(readFileSync("runs/eval/feed.json", "utf8"));
const have = new Set(Object.keys(old.candles).map((k) => k.split("|")[0]));
const tickers = await bx.fetchTickers();
const ranked = tickers.filter((t) => /-USDT$/.test(t.sym) && t.quoteVol > 0).sort((a, b) => b.quoteVol - a.quoteVol);
const candles = { ...old.candles };
const need = TARGET - have.size;
const TRIM = 25920; // the existing feed's span: 2026-09-23 12:55 to 10-11 12:54 (18 days of 1 m bars)
let done = 0, failed = [];
// one symbol: back off and retry on the exchange's rate limit (BingX 100410), then give up and take the next by volume
const fetchOne = async (sym) => {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const c1 = await bx.fetchHistory(sym, 1, BARS, { nowT: NOW, pauseMs: 30 });
      if (c1.length < 5000) return `short ${c1.length}`;
      return c1.slice(-TRIM);
    } catch (e) {
      if (attempt === 4) return String(e).slice(0, 60);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
};
for (const t of ranked) {
  if (done >= need) break;
  if (have.has(t.sym)) continue;
  const r = await fetchOne(t.sym);
  if (typeof r === "string") { failed.push(`${t.sym}:${r}`); continue; }
  candles[`${t.sym}|1`] = r;
  for (const tf of [5, 15, 30]) candles[`${t.sym}|${tf}`] = resample(r, 1, tf);
  done++;
  if (done % 10 === 0) console.log(`fetched ${done}/${need}`);
  await new Promise((r) => setTimeout(r, 1000)); // pause between symbols, to stay under the rate limit
}
console.log(`existing ${have.size}, added ${done} from the exchange's volume ranking (needed ${need}), failed ${failed.length}`);
const keepTickers = ranked.filter((t) => candles[`${t.sym}|1`]).slice(0, TARGET);
const feed = { ...old, tickers: keepTickers.map((t) => ({ sym: t.sym, last: t.last, quoteVol: t.quoteVol, changePct: t.changePct })), candles, source: { ...(old.source ?? {}), extendedFrom: "exchange klines", symbols: TARGET, built: new Date().toISOString() } };
writeFileSync("runs/eval/feed120.json", JSON.stringify(feed));
const sha = createHash("sha256").update(readFileSync("runs/eval/feed120.json")).digest("hex");
console.log(`symbols ${Object.keys(candles).length / 4}, failed ${failed.length} ${failed.slice(0, 5).join(" ")}`);
console.log(`sha256 ${sha.slice(0, 16)}`);
