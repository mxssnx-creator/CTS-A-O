#!/usr/bin/env node
// Preserve the 75 original Low-Range state series across source extensions.
// This is a deterministic compatibility audit, not a profitability test.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { LOW_RANGE_LEGACY_WINDOWS, LOW_RANGE_METHODS, lowRangeState } from "../src/core/indications/low-range-research.ts";

const originalRelations = ["standalone", "trend", "breakout", "activity", "trend-breakout"];
const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const feedBytes = readFileSync(feedPath), feed = JSON.parse(gunzipSync(feedBytes));
const symbols = feed.tickers.map((ticker) => ticker.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("Expected 20 distinct symbols");
const warm = Date.parse("2026-10-07T12:00:00Z"), end = Date.parse("2026-10-10T12:00:00Z");
const hash = createHash("sha256");
let series = 0, observations = 0;
for (const sym of symbols) {
  const minutes = feed.candles[`${sym}|1`]?.filter((c) => c.t >= warm && c.t < end) ?? [];
  if (minutes.length !== 72 * 60 || minutes.some((c, i) => c.t !== warm + i * 60_000))
    throw new Error(`Incomplete minute feed: ${sym}`);
  for (const tf of [1, 5, 15]) {
    const bars = barsFromCandles(sym, tf, tf === 1 ? minutes : resample(minutes, 1, tf));
    const cache = new SeriesCache(bars);
    for (const window of LOW_RANGE_LEGACY_WINDOWS) for (const method of LOW_RANGE_METHODS) for (const relation of originalRelations) {
      const values = lowRangeState(cache, window, method, relation);
      hash.update(`${sym}|${tf}|${window}|${method}|${relation}|${values.length}\n`);
      hash.update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
      series++; observations += values.length;
    }
  }
}
const result = { feedSha256: createHash("sha256").update(feedBytes).digest("hex"), symbols: symbols.length,
  tfMin: [1, 5, 15], from: new Date(warm).toISOString(), endExclusive: new Date(end).toISOString(),
  series, observations, stateSha256: hash.digest("hex") };
if (process.argv[2] && process.argv[2] !== result.stateSha256) throw new Error(`Signal compatibility mismatch: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result));
