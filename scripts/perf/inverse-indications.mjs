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
const symbols = feed.tickers
  .map((x) => x.sym ?? x.symbol)
  .sort()
  .slice(0, 12);
if (symbols.length !== 12) throw Error("exactly twelve symbols required");
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
const u = makeUniverse(bars);
const t = performance.now();
let cells = 0;
for (const k of u.caches)
  for (const id of INVERSE_CONFIG_IDS) cells += indicationState(id, k).length;
const coldMs = performance.now() - t;
const t1 = performance.now();
let checksum = 0;
const passes = 100;
for (let n = 0; n < passes; n++)
  for (const k of u.caches)
    for (const id of INVERSE_CONFIG_IDS) checksum += indicationState(id, k).length;
const warmMs = performance.now() - t1;
const result = {
  classification: "Retrospective calculation benchmark, no real-time or venue throughput claim",
  feedSha256: createHash("sha256").update(bytes).digest("hex"),
  symbols,
  historyHours: 120,
  timeframes: [1, 5, 15],
  variants: INVERSE_CONFIG_IDS.length,
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
