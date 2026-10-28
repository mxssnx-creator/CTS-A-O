#!/usr/bin/env node
// Offline, bounded research probe. Not the full runtime, live execution or a release check.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { LOW_RANGE_WINDOWS, LOW_RANGE_METHODS, LOW_RANGE_RELATIONS, lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from "../src/core/indications/low-range-research.ts";
import { rangeCellPass, configId, laneProtect } from "../src/core/pipeline/pipeline.ts";
import { compareTapeTrades, configDirectionEval, defaultWalkForward, makeTape } from "../src/core/sim/walkforward.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { statsOf, settledHourT } from "../src/core/metrics/stats.ts";

const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const output = process.argv[2] ?? "runs/low-range-research-20261027";
if (existsSync(`${output}/protocol.json`) || existsSync(`${output}/results.json`)) throw new Error("Use a fresh output directory");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const H = 3600000, M = 60000;
const evalFrom = Date.parse("2026-10-10T00:00:00Z"), start = evalFrom + 6 * H, end = start + 6 * H, warm = evalFrom - 24 * H;
const policy = { ...DEFAULT_LOW_RANGE_POLICY, steps: [2, 4, 6], slRatios: [0.5, 1.5, 3.5], trailRatios: [0, 0.5] };
const input = readFileSync(feedPath);
const source = JSON.parse(gunzipSync(input));
const symbols = source.tickers.map((x) => x.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("The frozen probe needs exactly 20 distinct symbols");
const protects = lowRangeProtects(policy);
const options = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 6, simH: 6, longH: 6 };
const protocol = {
  version: 1, purpose: "isolated Low-Range research probe; not a runtime integration or funded execution",
  sourceSha256: sha(readFileSync("src/core/indications/low-range-research.ts")),
  testSha256: sha(readFileSync("src/core/indications/low-range-research.test.ts")),
  runnerSha256: sha(readFileSync("scripts/low-range-research.mjs")),
  feed: { path: feedPath, sha256: sha(input), provider: "previously examined historical feed, not a fresh holdout" },
  symbols, warm, evalFrom, start, end, cost: policy.cost, step: policy.step,
  windows: LOW_RANGE_WINDOWS, methods: LOW_RANGE_METHODS, relations: LOW_RANGE_RELATIONS,
  representativeSubset: { steps: policy.steps, slRatios: policy.slRatios, trailRatios: policy.trailRatios, tags: policy.tags },
  gridCounts: { requestedPerSignal: policy.steps.length * policy.slRatios.length * policy.trailRatios.length * policy.tags.length, distinctPerSignal: protects.length },
  gates: options.gates, validLastN: options.validLastN, rangeGate: options.rangeGate,
  preH: options.preH, longH: options.longH,
};
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });

const bars = symbols.map((sym) => {
  const rows = source.candles[`${sym}|1`]?.filter((x) => x.t >= warm && x.t < end) ?? [];
  if (rows.length !== 36 * 60 || rows.some((c, i) => c.t !== warm + i * M)) throw new Error(`Incomplete minute coverage: ${sym}`);
  return barsFromCandles(sym, 1, rows);
});
const signalBook = new Map();
for (const window of LOW_RANGE_WINDOWS) for (const method of LOW_RANGE_METHODS) for (const relation of LOW_RANGE_RELATIONS) {
  const ind = `low-range-${window}-${method}-${relation}@m1`;
  const signals = bars.map((b) => {
    const state = lowRangeState(new SeriesCache(b), window, method, relation);
    const onset = new Int8Array(b.n);
    for (let i = 1; i < b.n; i++) if (b.t[i] + M >= evalFrom && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
    return [sideSignal(onset, 1), sideSignal(onset, -1)];
  });
  signalBook.set(ind, signals);
}
const stage = { evaluatedCells: 0, basePassedCells: 0, directionContextsEvaluated: 0, directionContextsPassed: 0,
  gp: 0, gl: 0, failureReasons: {}, byRange: {}, byMethod: {} };
const buckets = (container, key) => container[key] ??= { cells: 0, basePassed: 0, contexts: 0, passed: 0 };
const hourly = Array.from({ length: 6 }, (_, i) => ({ from: start + i * H, count: 0, long: 0, short: 0, gp: 0, gl: 0 }));
const outcomes = { settled: 0, long: 0, short: 0, openAtEnd: 0, gp: 0, gl: 0, byRange: {} };
const started = performance.now();
const rows = [];
for (const [ind, signals] of signalBook) {
  for (const ref of protects) {
    const p = laneProtect(ref, ind), id = configId("follow", ind, p), trades = [], open = [];
    for (let s = 0; s < bars.length; s++) for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const res = simulate(id, bars[s], signals[s][sideIndex], p, { cost: policy.cost });
      trades.push(...res.trades);
      if (res.open) open.push(res.open);
    }
    trades.sort(compareTapeTrades);
    const tape = makeTape(id, "follow", ind, p, p.trail ? "trailing" : "normal", symbols, trades, open, []);
    const pre = trades.filter((t) => t.entryT >= evalFrom && t.exitT < start);
    const base = statsOf(pre, start);
    const basePass = rangeCellPass(options.gates, ind)(p.tag, base);
    const range = buckets(stage.byRange, p.tag), method = buckets(stage.byMethod, ind.split("-").slice(3, -1).join("-"));
    stage.evaluatedCells++; range.cells++; method.cells++;
    if (!basePass) continue;
    stage.basePassedCells++; range.basePassed++; method.basePassed++;
    for (const side of [1, -1]) {
      stage.directionContextsEvaluated++; range.contexts++; method.contexts++;
      const ev = configDirectionEval(tape, start, options, side);
      if (!ev.ok) { stage.failureReasons[ev.fail] = (stage.failureReasons[ev.fail] ?? 0) + 1; continue; }
      stage.directionContextsPassed++; range.passed++; method.passed++;
      stage.gp += ev.gp ?? 0; stage.gl += ev.gl ?? 0;
      const selected = trades.filter((t) => t.side === side && t.entryT >= start && t.exitT <= end);
      const held = open.filter((t) => t.side === side && t.entryT >= start);
      outcomes.openAtEnd += held.length;
      const outRange = outcomes.byRange[p.tag] ??= { count: 0, gp: 0, gl: 0 };
      for (const t of selected) {
        outcomes.settled++; if (side === 1) outcomes.long++; else outcomes.short++;
        const gain = Math.max(0, t.r), loss = Math.max(0, -t.r);
        outcomes.gp += gain; outcomes.gl += loss;
        outRange.count++; outRange.gp += gain; outRange.gl += loss;
        const i = Math.round((settledHourT(t.exitT) - start) / H);
        if (i < 0 || i >= hourly.length) throw new Error("Forward close outside declared hourly bins");
        const h = hourly[i]; h.count++; if (side === 1) h.long++; else h.short++; h.gp += gain; h.gl += loss;
      }
      rows.push({ ind, tag: p.tag, side, protect: p, historical: { n: ev.n, pf: ev.pf, gp: ev.gp, gl: ev.gl }, forwardSettled: selected.length, openAtEnd: held.length });
    }
  }
  process.stderr.write(`${ind}: ${stage.evaluatedCells} cells, ${stage.directionContextsPassed} contexts qualified\n`);
}
const pf = (gp, gl, n) => !n ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
stage.pf = pf(stage.gp, stage.gl, stage.directionContextsPassed);
stage.validatedPct = stage.directionContextsEvaluated ? 100 * stage.directionContextsPassed / stage.directionContextsEvaluated : null;
outcomes.pf = pf(outcomes.gp, outcomes.gl, outcomes.settled);
for (const h of hourly) h.pf = pf(h.gp, h.gl, h.count);
const result = { scope: "research-only initial qualified contexts; overlapping unallocated candidate tapes, not runtime execution", stage, outcomes, hourly, rows,
  elapsedMs: performance.now() - started, rssBytes: process.memoryUsage().rss };
writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ stage, outcomes, hourly, elapsedMs: result.elapsedMs, rssBytes: result.rssBytes }));
