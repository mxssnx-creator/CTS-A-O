#!/usr/bin/env node
// Offline paired benchmark: node --expose-gc scripts/perf/benchmark-fixed-tapes.mjs BEFORE_ROOT AFTER_ROOT
// FEED_JSON SYMBOL EVALUATION_FROM_ISO [HOLD_BARS]. FEED_JSON is a candle array or a session feed object.
// Prints alternating, warmed CPU/wall medians and exact tape digests. No network or exchange access is needed.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";

const [before, after, feed, symbol, fromArg, holdArg = "480"] = process.argv.slice(2);
const from = Date.parse(fromArg), hold = Number(holdArg);
if (!before || !after || !feed || !symbol || !Number.isFinite(from) || !Number.isInteger(hold) || hold < 1)
  throw new Error("expected BEFORE_ROOT AFTER_ROOT FEED_JSON SYMBOL EVALUATION_FROM_ISO [HOLD_BARS]");
const load = (root, path) => import(pathToFileURL(`${root}/${path}`).href);
const modules = await Promise.all([before, after].map(async (root) => ({
  ...(await load(root, "src/core/market/bars.ts")),
  ...(await load(root, "src/core/pipeline/pipeline.ts")),
  ...(await load(root, "src/core/sim/walkforward.ts")),
})));
const data = JSON.parse(readFileSync(feed, "utf8"));
const candles = Array.isArray(data) ? data : data.candles?.[`${symbol}|1`];
if (!Array.isArray(candles) || candles.length < 120) throw new Error("missing one-minute candle history");
const protects = [];
for (const tp of [.003, .005, .008, .012, .02, .03, .04])
  for (const ratio of [.2, .4, .6, .8, 1, 1.2]) protects.push({ tp, sl: tp * ratio, trail: 0, hold });
const times = [[], []], hashes = [new Set(), new Set()];
let tapes = 0, closes = 0;
for (let i = 0; i < 16; i++) for (const ix of (i % 2 ? [1, 0] : [0, 1])) {
  const m = modules[ix], bars = m.barsFromCandles(symbol, 1, candles), u = m.makeUniverse([bars], from);
  global.gc?.();
  const start = performance.now(), cpuStart = process.cpuUsage();
  const result = m.buildTapes(u, protects, .0015, undefined, new Set(["follow|ema-9-21@m1"]),
    null, undefined, { minSl: 0, minTrail: 0 });
  const cpu = process.cpuUsage(cpuStart), elapsed = performance.now() - start, hash = createHash("sha256");
  let n = 0;
  for (const tape of result) {
    hash.update(tape.id);
    for (const key of ["entryT", "exitT", "r", "entry", "exit", "symI", "side", "reason", "bars"]) {
      const values = tape[key]; hash.update(Buffer.from(values.buffer, values.byteOffset, values.byteLength));
    }
    hash.update(JSON.stringify([tape.open, tape.pending])); n += tape.n;
  }
  tapes = result.length; closes = n; hashes[ix].add(hash.digest("hex"));
  if (i >= 4) times[ix].push({ ms: elapsed, cpuMs: (cpu.user + cpu.system) / 1000 });
}
const median = (values) => { const x = values.toSorted((a, b) => a - b); return (x[5] + x[6]) / 2; };
console.log(JSON.stringify({ symbol, from, hold, tapes, closes, samplesPerVersion: times[0].length,
  before: { medianMs: median(times[0].map(x => x.ms)), medianCpuMs: median(times[0].map(x => x.cpuMs)) },
  after: { medianMs: median(times[1].map(x => x.ms)), medianCpuMs: median(times[1].map(x => x.cpuMs)) },
  digests: hashes.map(x => [...x]) }));
