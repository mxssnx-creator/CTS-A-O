#!/usr/bin/env node
// Offline cached-public-OHLCV merge only. No network or runtime imports.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { mergeSignalMarketCaches } from "./lib/signal-market.mjs";
const file = process.argv[2];
if (!file || process.argv.length !== 3) throw new Error("Usage: node scripts/core-signal-market-merge.mjs frozen-warmup-protocol.json");
const p = JSON.parse(await readFile(file, "utf8")), dir = dirname(resolve(file));
const hash = (s) => createHash("sha256").update(s).digest("hex");
const sources = [], provenance = [];
for (const path of p.acquisition.sources) {
  const bytes = await readFile(resolve(path));
  sources.push(JSON.parse(bytes)); provenance.push({ path, bytes: bytes.length, sha256: hash(bytes) });
}
const { feed, quality } = mergeSignalMarketCaches(sources, p);
const bytes = JSON.stringify(feed);
await writeFile(join(dir, "feed.json"), bytes);
const manifest = { schema: "cts-signal-warmup-market-v1", completedAt: new Date().toISOString(), newNetworkRequests: 0,
  protocolSha256: hash(await readFile(file)), startT: p.indicatorWarmupStartT, evaluationFromT: p.evaluationFromT, tradeStartT: p.tradeStartT, endT: p.endT,
  sources: provenance, symbols: p.symbols, quality, feed: { path: "feed.json", bytes: Buffer.byteLength(bytes), sha256: hash(bytes) } };
await writeFile(join(dir, "market-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ symbols: p.symbols.length, bars: Object.values(quality).reduce((n, x) => n + x.bars, 0), newNetworkRequests: 0, feed: manifest.feed }));
