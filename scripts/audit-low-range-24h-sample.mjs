#!/usr/bin/env node
// Recompute a deterministic stratified sample using no candle closing after the selection clock.
import assert from "node:assert/strict";
import { readFileSync, createReadStream, writeFileSync } from "node:fs";
import { gunzipSync, createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState } from "../src/core/indications/low-range-research.ts";
import { configId, rangeCellPass } from "../src/core/pipeline/pipeline.ts";
import { compareTapeTrades, configDirectionEval, defaultWalkForward, makeTape } from "../src/core/sim/walkforward.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { statsOf } from "../src/core/metrics/stats.ts";

const dir = process.argv[2];
if (!dir) throw new Error("Expected completed run directory");
const p = JSON.parse(readFileSync(`${dir}/protocol.json`)), audit = JSON.parse(readFileSync(`${dir}/audit.json`));
assert.equal(audit.status, "passed");
const chosen = new Map();
for await (const line of createInterface({ input: createReadStream(`${dir}/cells.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line) continue;
  const row = JSON.parse(line);
  const category = !row.base.passed ? "base-failed" : row.directions.some((d) => d.initial.passed) ? "validated" : "base-only";
  const key = `${row.step}|${row.tf}|${category}`;
  if (!chosen.has(key)) chosen.set(key, row);
}
const feed = JSON.parse(gunzipSync(readFileSync(p.feed.path))), M = 60000;
const bars = new Map();
for (const sym of p.symbols) {
  const minute = feed.candles[`${sym}|1`].filter((c) => c.t >= p.warm && c.t < p.start);
  assert.equal(minute.length, (p.start - p.warm) / M);
  for (const tf of p.tfs) bars.set(`${sym}|${tf}`, barsFromCandles(sym, tf, tf === 1 ? minute : resample(minute, 1, tf)));
}
const options = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: p.preH, simH: 24, longH: p.longH };
assert.deepEqual(options.gates, p.gates);
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const categories = {};
for (const row of chosen.values()) {
  const id = configId("follow", row.ind, row.protect), trades = [];
  for (const sym of p.symbols) {
    const b = bars.get(`${sym}|${row.tf}`), state = lowRangeState(new SeriesCache(b), row.window, row.method, row.relation), onset = new Int8Array(b.n);
    for (let i = 1; i < b.n; i++) if (b.t[i] + row.tf * M >= p.evalFrom && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
    for (const side of [1, -1]) trades.push(...simulate(id, b, sideSignal(onset, side), row.protect, { cost: p.policy.cost }).trades);
  }
  trades.sort(compareTapeTrades);
  const stats = statsOf(trades.filter((t) => t.entryT >= p.evalFrom && t.exitT < p.start), p.start);
  const passed = rangeCellPass(options.gates, row.ind)(row.tag, stats);
  assert.equal(stats.n, row.base.n, `${id} Base n`);
  if (stats.n) assert.ok(eq(stats.pf, row.base.pf), `${id} Base PF`);
  assert.equal(passed, row.base.passed, `${id} Base decision`);
  if (passed) {
    const tape = makeTape(id, "follow", row.ind, row.protect, row.protect.trail ? "trailing" : "normal", p.symbols, trades, [], []);
    for (const d of row.directions) {
      const ev = configDirectionEval(tape, p.start, options, d.side);
      assert.equal(ev.ok, d.initial.passed, `${id} / ${d.side} validation`);
      assert.equal(ev.n, d.initial.n, `${id} / ${d.side} n`);
      if (ev.ok) for (const k of ["pf", "gp", "gl"]) assert.ok(eq(ev[k], d.initial[k]), `${id} / ${d.side} ${k}`);
      else assert.equal(ev.fail, d.initial.fail, `${id} / ${d.side} reason`);
    }
  }
  const category = !row.base.passed ? "base-failed" : row.directions.some((d) => d.initial.passed) ? "validated" : "base-only";
  categories[category] = (categories[category] ?? 0) + 1;
}
const receipt = { status: "passed", cellsRecomputed: chosen.size, categories, selectionBarsOnly: true,
  stratification: "first recorded cell per step, timeframe and decision category", symbols: p.symbols.length,
  limitations: "Sample check of qualification, not full runtime or funded execution." };
writeFileSync(`${dir}/sample-audit.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt));
