#!/usr/bin/env node
// Cold shared calculations and warm lookup benchmark; not a live-cycle latency or execution-PF measurement.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { barsFromCandles, resample } from "../../src/core/market/bars.ts";
import { makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { indicationState } from "../../src/core/indications/registry.ts";
import { INVERSE_CONFIG_IDS } from "../../src/core/indications/inverse-config.ts";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const bytes = readFileSync(arg("feed"));
const feed = JSON.parse(bytes[0] === 31 ? gunzipSync(bytes) : bytes);
const symbolCount = Number(arg("symbols", 12));
if (!Number.isInteger(symbolCount) || symbolCount < 2 || symbolCount > 50) throw Error("symbols must be 2..50");
const symbols = feed.tickers
  .map((x) => x.sym ?? x.symbol)
  .sort()
  .slice(0, symbolCount);
if (symbols.length !== symbolCount) throw Error("requested symbol count must be available");
const end =
  Math.floor(Math.min(...symbols.map((s) => feed.candles[`${s}|1`].at(-1).t + 60000)) / 3600000) *
  3600000;
const bars = symbols.flatMap((s) =>
  [1, 5, 15].map((tf) =>
    barsFromCandles(
      s,
      tf,
      resample(
        feed.candles[`${s}|1`].filter((c) => c.t >= end - 120 * 3600000 && c.t < end),
        1,
        tf,
      ),
    ),
  ),
);
const catalog = arg("catalog", "all");
if (!["all", "legacy"].includes(catalog)) throw Error("catalog must be all or legacy");
const ids = catalog === "legacy" ? INVERSE_CONFIG_IDS.filter((id) =>
  id.startsWith("inverse-known-") || id.startsWith("inverse-turn-") ||
  (!id.startsWith("inverse-mc-") && !id.startsWith("inverse-pair-") && !id.includes("rsi2-turn-") && !id.includes("vwap-deviation-") && /-(20|40)$/.test(id))) : INVERSE_CONFIG_IDS;
const u = makeUniverse(bars);
const t = performance.now();
let cells = 0;
for (const k of u.caches)
  for (const id of ids) cells += indicationState(id, k).length;
const coldMs = performance.now() - t;
const t1 = performance.now();
let checksum = 0;
const passes = 100;
for (let n = 0; n < passes; n++)
  for (const k of u.caches)
    for (const id of ids) checksum += indicationState(id, k).length;
const warmMs = performance.now() - t1;
const digest = createHash("sha256");
for (const k of u.caches) for (const id of ids) digest.update(indicationState(id, k));
const result = {
  statesSha256: digest.digest("hex"),
  classification: "Retrospective calculation benchmark, no real-time or venue throughput claim",
  feedSha256: createHash("sha256").update(bytes).digest("hex"),
  symbols,
  historyHours: 120,
  timeframes: [1, 5, 15],
  variants: ids.length,
  catalog,
  series: bars.length,
  barValues: cells,
  coldMs,
  warm100PassesMs: warmMs,
  warmMeanPassMs: warmMs / passes,
  checksum,
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
};
if (arg("out")) writeFileSync(arg("out"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
