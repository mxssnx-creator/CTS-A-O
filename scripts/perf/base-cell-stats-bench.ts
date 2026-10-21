import { RT_COST } from "../../src/core/model-cost.ts";
// Bounded, deterministic Base statistics microbenchmark. Ordinary Trade-mode simulations supply the runs;
// only collection/sorting/statistics are timed. It does not score or select a trading strategy.
// node --experimental-strip-types --no-warnings scripts/perf/base-cell-stats-bench.ts [--iterations 2000]
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BaseCellAccumulator } from "../../src/core/pipeline/base-cell-stats.ts";
import { makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../../src/core/market/bars.ts";
import { entrySignal } from "../../src/core/bots/bots.ts";
import { bothSides, simulate } from "../../src/core/sim/backtest.ts";
import { profitFactor } from "../../src/core/metrics/stats.ts";

type Row = [r: number, entryT: number, exitT: number];
const ai = process.argv.indexOf("--iterations");
const iterations = ai < 0 ? 2000 : Number(process.argv[ai + 1]);
assert.ok(Number.isInteger(iterations) && iterations >= 1 && iterations <= 10_000);
const end = Date.UTC(2026, 9, 17);
const u = makeUniverse(["A", "B", "C"].map((s, i) =>
  barsFromCandles(s, 15, syntheticCandles(s, 15, 1800, end, 3 + i))));
const cases: Row[][][] = [];
for (const bot of ["follow", "revert", "sandwich"] as const) {
  for (const tp of [0.008, 0.02, 0.05]) {
    const runs: Row[][] = [];
    for (let s = 0; s < u.bars.length; s++) {
      const sig = entrySignal(bot, "rsi-mid@m15", u.caches[s])!;
      bothSides(sig, (sg) => {
        const result = simulate("bench", u.bars[s], sg, { tp, sl: tp * 1.5, trail: 0, hold: 64 }, { cost: RT_COST });
        runs.push(result.trades.map((t) => [t.r, t.entryT, t.exitT]));
      });
    }
    cases.push(runs);
  }
}

// Previous cellStats collection and stable-sort arithmetic, retained here as the independent benchmark oracle.
const legacy = (runs: readonly (readonly Row[])[]) => {
  let rr = new Float64Array(256);
  let en = new Float64Array(256);
  let ex = new Float64Array(256);
  let n = 0;
  for (const run of runs) for (const [r, entryT, exitT] of run) {
    if (n === rr.length) {
      const grow = (a: Float64Array) => {
        const b = new Float64Array(a.length * 2);
        b.set(a);
        return b;
      };
      rr = grow(rr); en = grow(en); ex = grow(ex);
    }
    rr[n] = r; en[n] = entryT; ex[n] = exitT; n++;
  }
  if (!n) return { n: 0, pf: 0, net: 0, mdd: 0 };
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => ex[a] - ex[b] || en[a] - en[b]);
  let gp = 0, gl = 0, sum = 0, cum = 0, peak = 0, mdd = 0;
  for (const i of idx) {
    const r = rr[i];
    if (r > 0) gp += r; else gl -= r;
    sum += r; cum += r;
    if (cum < peak) { if (peak - cum > mdd) mdd = peak - cum; } else peak = cum;
  }
  return { n, pf: profitFactor(gp, gl), net: sum * 100, mdd: mdd * 100, gp: gp * 100, gl: gl * 100 };
};
const cell = new BaseCellAccumulator();
const merged = (runs: readonly (readonly Row[])[]) => {
  cell.reset();
  for (const run of runs) {
    cell.beginRun();
    for (const row of run) cell.push(...row);
  }
  return cell.stats();
};
const reference = cases.map(legacy);
assert.deepEqual(cases.map(merged), reference);
for (let i = 0; i < 50; i++) for (const runs of cases) { legacy(runs); merged(runs); }
const timed = (f: typeof legacy) => {
  const started = performance.now();
  let closes = 0;
  for (let i = 0; i < iterations; i++) for (const runs of cases) closes += f(runs).n;
  return { ms: performance.now() - started, cells: iterations * cases.length, closes };
};
// Alternate order to reduce first-run bias on a shared host, retaining both measured samples.
const samples = [
  { legacy: timed(legacy), merged: timed(merged) },
  { merged: timed(merged), legacy: timed(legacy) },
];
assert.deepEqual(cases.map(merged), reference);
const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
console.log(JSON.stringify({
  benchmark: "base-cell-stats", capturedAt: new Date().toISOString(), node: process.version,
  scope: "statistics-only; 3 symbols, 1800 15m bars, 9 fixed synthetic cells, no strategy scoring",
  iterations, cases: cases.length, tradesPerSweep: reference.reduce((n, s) => n + s.n, 0),
  exactParity: true, inputSha256: sha256(JSON.stringify(cases)), resultSha256: sha256(JSON.stringify(reference)),
  sourceSha256: sha256(readFileSync(new URL("../../src/core/pipeline/base-cell-stats.ts", import.meta.url))),
  samples, rss: process.memoryUsage().rss, maxRssKiB: process.resourceUsage().maxRSS,
}, null, 2));
