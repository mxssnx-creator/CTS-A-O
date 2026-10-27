#!/usr/bin/env node
// Group reconciled funded-model closes and run-start validation by actual target step.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { settledHourT } from "../src/core/metrics/stats.ts";
import { readSessionDump } from "./lib/session-dump.mjs";

const dir = process.argv[2]; if (!dir) throw new Error("Expected a completed runtime study");
const p = JSON.parse(readFileSync(`${dir}/protocol.json`)), audit = JSON.parse(readFileSync(`${dir}/audit.json`));
const baseAudit = JSON.parse(readFileSync(`${dir}/base-cell-audit.json`));
assert.equal(audit.checksOk, true); assert.equal(baseAudit.status, "passed");
const raw = await readSessionDump(`${dir}/raw.json`, { fields: ["validation"] });
const data = await readSessionDump(`${dir}/report/data.json`, { fields: ["sizedOrders"] });
const groups = ["2", "3", "4", "5", "6", "noTP"];
const stepOf = (cfg) => {
  const q = parseConfigId(cfg)?.protect; assert.ok(q);
  if (q.trailOnly) return "noTP";
  const step = Math.round((q.tp - p.actualSettings.cost) / p.actualSettings.grid.lowRange.step);
  assert.ok(groups.includes(String(step)) && Math.abs(q.tp - (p.actualSettings.cost + step * p.actualSettings.grid.lowRange.step)) < 1e-6, cfg);
  return String(step);
};
const blank = () => ({ evaluated: 0, validated: 0, historicalGp: 0, historicalGl: 0,
  settled: 0, long: 0, short: 0, wins: 0, losses: 0, flat: 0, gp: 0, gl: 0, cash: 0 });
const byStep = Object.fromEntries(groups.map((x) => [x, blank()])), byStepSymbol = {}, byStepSymbolHour = {}, byStepHour = {};
const get = (map, key) => map[key] ??= blank();
const first = raw.validation.find((x) => x.t === p.window.tradeStartT); assert.ok(first);
for (const [id, ok, , , gp, gl] of first.checks) {
  const x = byStep[stepOf(id)]; x.evaluated++;
  if (ok) { x.validated++; x.historicalGp += gp; x.historicalGl += gl; }
}
assert.equal(first.checks.length, data.engine.configEvalPhase.evaluated);
assert.equal(groups.reduce((n, k) => n + byStep[k].validated, 0), data.engine.configEvalPhase.passed);
let zeroAllocated = 0;
for (const tr of data.sizedOrders) {
  assert.ok(Number.isFinite(tr.allocatedNotional) && tr.allocatedNotional >= 0, "unknown allocation cannot be classified as funded or zero");
  if (tr.allocatedNotional === 0) { zeroAllocated++; continue; }
  assert.ok(Number.isFinite(tr.unitR) && Number.isFinite(tr.sizedPnl));
  assert.ok(p.symbols.includes(tr.sym));
  const step = stepOf(tr.cfg), hour = settledHourT(tr.exitT);
  assert.ok(hour >= p.window.tradeStartT && hour < p.window.endT);
  const xs = [byStep[step], get(byStepSymbol, `${step}|${tr.sym}`), get(byStepHour, `${step}|${hour}`),
    get(byStepSymbolHour, `${step}|${tr.sym}|${hour}`)];
  for (const x of xs) {
    x.settled++; x[tr.side === 1 ? "long" : "short"]++;
    x[tr.unitR > 0 ? "wins" : tr.unitR < 0 ? "losses" : "flat"]++;
    x.gp += Math.max(0, tr.unitR); x.gl += Math.max(0, -tr.unitR); x.cash += tr.sizedPnl;
  }
}
const pf = (gp, gl, n) => !n ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
for (const x of [...Object.values(byStep), ...Object.values(byStepSymbol), ...Object.values(byStepHour), ...Object.values(byStepSymbolHour)]) {
  x.validatedPct = x.evaluated ? 100 * x.validated / x.evaluated : null;
  x.historicalPf = pf(x.historicalGp, x.historicalGl, x.validated);
  x.forwardPf = pf(x.gp, x.gl, x.settled);
}
const sum = (key) => groups.reduce((n, x) => n + byStep[x][key], 0);
assert.equal(sum("settled"), audit.total.closes);
assert.ok(Math.abs(sum("gp") - audit.total.unitGp) < 1e-9);
assert.ok(Math.abs(sum("gl") - audit.total.unitGl) < 1e-9);
assert.ok(Math.abs(sum("cash") - audit.total.sizedNetUsd) < 1e-9);
const out = { status: "passed", scope: "Funded-modeled settled orders, grouped by actual target step; no-TP siblings have no unique originating step.",
  sourceSha256: p.source.sha256, symbols: p.symbols, startT: p.window.tradeStartT, endT: p.window.endT,
  groups, byStep, byStepSymbol, byStepHour, byStepSymbolHour, zeroAllocated };
writeFileSync(`${dir}/runtime-step-detail.json`, JSON.stringify(out, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: out.status, steps: byStep, settled: sum("settled") }));
