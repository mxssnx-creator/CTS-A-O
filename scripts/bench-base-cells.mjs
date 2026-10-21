#!/usr/bin/env node
// Microbenchmark of Base's inner loop: cellStats over every combo x a few protect cells, on the fixture's universe
// (lanes 1/5/15/30 m, the default tactics). Prints the time of pass 1 (cold caches: indicator series, signals) and pass 2
// (warm caches: what Base pays per extra range cell) and a digest of all results (a speedup must keep it).
//   MALLOC_ARENA_MAX=2 node --experimental-strip-types --no-warnings scripts/bench-base-cells.mjs [fixture.json] [--n 12]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { allCombos, cellStats, makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { CandleSeries, resampleTailBars, barsOfSeries } from "../src/core/market/candle-series.ts";

const argv = process.argv.slice(2);
const fixture =
  argv.find((a) => a.endsWith(".json")) ??
  "/tmp/claude-0/-home-user-CTS-A-O/a9de2a82-1211-5914-8bcf-81f9d4d9e162/scratchpad/cache1m.json";
const nAt = argv.indexOf("--n");
const NS = nAt >= 0 ? Number(argv[nAt + 1]) : 12;
const raw = JSON.parse(readFileSync(fixture, "utf8"));
const lanes = [1, 5, 15, 30];
const all = [];
for (const [sym, cs] of Object.entries(raw).slice(0, NS)) {
  const ser = CandleSeries.fromCandles(cs);
  for (const tf of lanes) {
    const b = tf === 1 ? barsOfSeries(sym, 1, ser, 0, ser.n) : resampleTailBars(sym, ser, 1, tf, 100000);
    b.lanes = lanes;
    all.push(b);
  }
}
const u = makeUniverse(all);
const combos = allCombos(undefined, undefined, DEFAULT_SETTINGS.tfs);
const tactics = DEFAULT_SETTINGS.tactics;
const cells = [
  { tp: 0.004, sl: 0.006, trail: 0, hold: 16 },
  { tp: 0.008, sl: 0.01, trail: 0.004, hold: 32 },
  { tp: 0.012, sl: 0.008, trail: 0, hold: 64, tag: "mn" },
];
const h = createHash("sha256");
const pass = () => {
  const t0 = performance.now();
  let k = 0;
  for (const c of combos)
    for (const p of cells) {
      const st = cellStats(u, c.bot, c.ind, p, 0.002, tactics);
      h.update(JSON.stringify(st) + "\n");
      k++;
    }
  return [performance.now() - t0, k];
};
const [t1, k] = pass();
const [t2] = pass();
const [t3] = pass();
console.log(`combos ${combos.length} cells ${k} | cold ${t1.toFixed(0)} ms | warm ${t2.toFixed(0)} ms, ${t3.toFixed(0)} ms | digest ${h.digest("hex").slice(0, 16)} | rss ${Math.round(process.memoryUsage().rss / 1048576)} MB`);
