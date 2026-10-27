#!/usr/bin/env node
// Independently recompute every reported qualified context using ONLY bars available at the selection cut.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState } from "../src/core/indications/low-range-research.ts";
import { configId } from "../src/core/pipeline/pipeline.ts";
import { compareTapeTrades, configDirectionEval, defaultWalkForward, makeTape } from "../src/core/sim/walkforward.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: audit-low-range-research.mjs RUN_DIRECTORY");
const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
const result = JSON.parse(readFileSync(`${dir}/results.json`));
const sha = (x) => createHash("sha256").update(x).digest("hex");
assert.equal(sha(readFileSync("src/core/indications/low-range-research.ts")), protocol.sourceSha256);
assert.equal(sha(readFileSync("scripts/low-range-research.mjs")), protocol.runnerSha256);
const input = readFileSync(protocol.feed.path);
assert.equal(sha(input), protocol.feed.sha256);
const source = JSON.parse(gunzipSync(input));
const options = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: protocol.preH, simH: 6, longH: protocol.longH };
assert.deepEqual(options.gates, protocol.gates);
assert.deepEqual(options.rangeGate, protocol.rangeGate);
const M = 60000;
const bars = protocol.symbols.map((sym) => {
  const cs = source.candles[`${sym}|1`].filter((c) => c.t >= protocol.warm && c.t < protocol.start);
  assert.equal(cs.length, (protocol.start - protocol.warm) / M);
  return barsFromCandles(sym, 1, cs);
});
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
for (const row of result.rows) {
  const match = /^low-range-(12|24|48)-(edge-turn|failed-break|breakout)-(standalone|trend|breakout)@m1$/.exec(row.ind);
  assert.ok(match, row.ind);
  const [, window, method, relation] = match;
  const id = configId("follow", row.ind, row.protect), trades = [];
  for (const b of bars) {
    const state = lowRangeState(new SeriesCache(b), Number(window), method, relation);
    const onset = new Int8Array(b.n);
    for (let i = 1; i < b.n; i++) if (b.t[i] + M >= protocol.evalFrom && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
    for (const side of [1, -1]) trades.push(...simulate(id, b, sideSignal(onset, side), row.protect, { cost: protocol.cost }).trades);
  }
  trades.sort(compareTapeTrades);
  const tape = makeTape(id, "follow", row.ind, row.protect, row.protect.trail ? "trailing" : "normal", protocol.symbols, trades, [], []);
  const ev = configDirectionEval(tape, protocol.start, options, row.side);
  assert.ok(ev.ok, `${id}/${row.side}`);
  for (const key of ["n", "pf", "gp", "gl"]) assert.ok(close(ev[key], row.historical[key]), `${id}/${row.side} ${key}`);
}
assert.equal(result.rows.length, result.stage.directionContextsPassed);
assert.equal(result.hourly.reduce((n, h) => n + h.count, 0), result.outcomes.settled);
assert.ok(close(result.hourly.reduce((n, h) => n + h.gp, 0), result.outcomes.gp));
assert.ok(close(result.hourly.reduce((n, h) => n + h.gl, 0), result.outcomes.gl));
assert.ok(close(result.stage.gp / result.stage.gl, result.stage.pf));
assert.ok(close(100 * result.stage.directionContextsPassed / result.stage.directionContextsEvaluated, result.stage.validatedPct));
const receipt = { passed: true, selectionBarsOnly: true, contextsRecomputed: result.rows.length,
  feedSha256: protocol.feed.sha256, inputResultsSha256: sha(readFileSync(`${dir}/results.json`)) };
writeFileSync(`${dir}/audit.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt));
