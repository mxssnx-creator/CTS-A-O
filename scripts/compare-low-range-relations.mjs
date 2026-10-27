#!/usr/bin/env node
// Reconcile the already-recorded 5m capped modeled orders by complete relation
// and direction. This analyzes a prior run; it never starts trading or replays.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { iterateSessionArray } from "./lib/session-dump.mjs";
import { RELATIONS, relationCatalog, relationOf, blankReturns, recordReturn, finishReturns, pf, assertNear } from "./lib/low-range-relation-comparison.mjs";

const [dirArg, pastArg, outArg, ...extra] = process.argv.slice(2);
if (!dirArg || !pastArg || !outArg || extra.length) throw new Error("Usage: node scripts/compare-low-range-relations.mjs RUN_DIR PAST_RESULTS OUTPUT_JSON");
const dir = resolve(dirArg), path = (name) => resolve(dir, name), read = (name) => JSON.parse(readFileSync(name, "utf8"));
const sha = (name) => createHash("sha256").update(readFileSync(name)).digest("hex");
const protocol = read(path("protocol.json")), audit = read(path("audit.json")), base = read(path("base-cell-audit.json"));
const data = read(path("report/data.json")), past = read(resolve(pastArg));
assert.equal(protocol.lane, 5); assert.equal(protocol.symbols.length, 20); assert.equal(protocol.window.runH, 24);
assert.equal(protocol.actualSettings.focus.length, 195); assert.equal(protocol.tacticMode, "off");
assert.equal(audit.checksOk, true); assert.equal(base.status, "passed"); assert.equal(base.sourceSha256, protocol.source.sha256);
assert.equal(past.status, "completed");
assert.equal(read(resolve(dirname(resolve(pastArg)), "audit.json")).status, "passed");
const catalog = relationCatalog(protocol.actualSettings.focus), start = protocol.window.tradeStartT, end = protocol.window.endT;
assert.equal(end - start, 24 * 3_600_000);
const blankValidation = () => ({ evaluated: 0, validated: 0, historicalGp: 0, historicalGl: 0 });
const relation = Object.fromEntries(RELATIONS.map((r) => [r, { start: blankValidation(),
  progression: { checks: 0, passingChecks: 0, evaluatedIds: new Set(), passedIds: new Set(), hours: 0 },
  long: blankReturns(), short: blankReturns(), bySymbol: {}, byHour: {}, zeroAllocated: 0, held: 0, zeroHeld: 0 }]));
let snapshots = 0, firstTime = null;
for await (const step of iterateSessionArray(path("raw.json"), "validation")) {
  assert.ok(Number.isSafeInteger(step.t) && step.t >= start && step.t < end);
  if (firstTime === null) firstTime = step.t;
  assert.equal(step.t, start + snapshots * 3_600_000, "unexpected evaluation schedule");
  const perSnapshot = new Set(), touched = new Set();
  for (const row of step.checks) {
    assert.ok(Array.isArray(row) && row.length >= 6 && (row[1] === 0 || row[1] === 1 || typeof row[1] === "boolean"));
    const [cfg, ok, , , gp, gl] = row, r = relationOf(cfg, catalog, 5), x = relation[r];
    assert.ok(!perSnapshot.has(cfg), `duplicate configuration ${cfg}`); perSnapshot.add(cfg); touched.add(r);
    x.progression.checks++; x.progression.evaluatedIds.add(cfg);
    if (ok) { x.progression.passingChecks++; x.progression.passedIds.add(cfg); }
    if (step.t === start) {
      x.start.evaluated++;
      if (ok) {
        assert.ok(Number.isFinite(gp) && gp >= 0 && Number.isFinite(gl) && gl >= 0);
        x.start.validated++; x.start.historicalGp += gp; x.start.historicalGl += gl;
      }
    }
  }
  for (const r of touched) relation[r].progression.hours++;
  snapshots++;
}
assert.equal(firstTime, start); assert.equal(snapshots, 24);
const sum = (f) => RELATIONS.reduce((n, r) => n + f(relation[r]), 0);
assert.equal(sum((x) => x.start.evaluated), data.engine.configEvalPhase.evaluated);
assert.equal(sum((x) => x.start.validated), data.engine.configEvalPhase.passed);

let zeroAllocated = 0, fundedSettled = 0;
for await (const tr of iterateSessionArray(path("report/data.json"), "sizedOrders")) {
  const r = relationOf(tr.cfg, catalog, 5), x = relation[r];
  assert.ok(protocol.symbols.includes(tr.sym));
  assert.ok(Number.isSafeInteger(tr.entryT) && Number.isSafeInteger(tr.exitT) && tr.entryT >= start && tr.exitT >= tr.entryT && tr.exitT <= end);
  const isLong = tr.side === 1; assert.ok(isLong || tr.side === -1);
  if (!recordReturn(x[isLong ? "long" : "short"], tr)) { x.zeroAllocated++; zeroAllocated++; continue; }
  fundedSettled++;
  recordReturn(x.bySymbol[tr.sym] ??= blankReturns(), tr);
  const hour = Math.floor((tr.exitT - 1) / 3_600_000) * 3_600_000;
  assert.ok(hour >= start && hour < end);
  recordReturn(x.byHour[hour] ??= blankReturns(), tr);
}
let held = 0, zeroHeld = 0;
for await (const tr of iterateSessionArray(path("report/data.json"), "sizedOpenOrders")) {
  const x = relation[relationOf(tr.cfg, catalog, 5)];
  assert.ok(Number.isFinite(tr.allocatedNotional) && tr.allocatedNotional >= 0);
  if (tr.allocatedNotional > 0) { x.held++; held++; } else { x.zeroHeld++; zeroHeld++; }
}
assert.equal(fundedSettled, audit.total.closes); assert.equal(zeroAllocated + fundedSettled, data.arraySidecars.sizedOrders.items);
assert.equal(held + zeroHeld, data.arraySidecars.sizedOpenOrders.items);
assertNear(sum((x) => x.long.gp + x.short.gp), audit.total.unitGp);
assertNear(sum((x) => x.long.gl + x.short.gl), audit.total.unitGl);
assertNear(sum((x) => x.long.cash + x.short.cash), audit.total.sizedNetUsd);
for (const x of Object.values(relation)) {
  x.start.validatedPct = x.start.evaluated ? 100 * x.start.validated / x.start.evaluated : null;
  x.start.historicalPf = pf(x.start.historicalGp, x.start.historicalGl, x.start.validated);
  x.progression.evaluatedConfigs = x.progression.evaluatedIds.size;
  x.progression.everPassingConfigs = x.progression.passedIds.size;
  delete x.progression.evaluatedIds; delete x.progression.passedIds;
  x.long = finishReturns(x.long); x.short = finishReturns(x.short);
  x.bySymbol = Object.fromEntries(Object.entries(x.bySymbol).map(([k, v]) => [k, finishReturns(v)]));
  x.byHour = Object.fromEntries(Object.entries(x.byHour).map(([k, v]) => [k, finishReturns(v)]));
}
const selected = ["trend-move-reverse", "trend-breakout-move-reverse"];
const out = { status: "passed", scope: "Pre-existing 19–20 October capped 5m modeled funded settled orders, grouped by complete source relation and direction. Initial validation is exact config, not direction. No venue orders.",
  limitations: ["Both windows were previously examined; this is not an untouched holdout.", "Earlier candidate-only study mixes 1m, 5m and 15m, with overlapping unallocated hypothetical records and different protection and gating. The later cohort is 5m funded-modeled execution with balance caps and trailing-only cells; the cohorts are not the same strategy or directly comparable.", "Zero later trades means performance is unavailable, not zero or a failure or success. Validation histories and later funded execution are different samples.", "Binance USD-M candles are not BingX execution or fill data."],
  startT: start, endT: end, symbols: protocol.symbols, sourceSha256: protocol.source.sha256,
  earlier: Object.fromEntries(selected.map((r) => [r, { pooled_1m_5m_15m: past.byRelation[r], fiveMinuteOnly: past.byTfRelation[`5|${r}`] }])),
  relation, reconciliation: { snapshots, evaluatedAtStart: sum((x) => x.start.evaluated), validatedAtStart: sum((x) => x.start.validated),
    fundedSettled, zeroAllocated, held, zeroHeld, gp: audit.total.unitGp, gl: audit.total.unitGl, unitPf: audit.total.exactPf, cash: audit.total.sizedNetUsd },
  hashes: { protocol: sha(path("protocol.json")), audit: sha(path("audit.json")), reportData: sha(path("report/data.json")), pastResults: sha(resolve(pastArg)),
    sizedOrdersSidecar: data.arraySidecars.sizedOrders.sha256, validationSidecar: read(path("raw.json")).validationSidecar.sha256 },
  provenance: "All validation and sized-order sidecars were exhausted and verified by the checksummed session reader. GP/GL, cash, counts, symbols and the run-start config denominator reconcile to the audited source." };
writeFileSync(resolve(outArg), JSON.stringify(out, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: out.status, reconciliation: out.reconciliation,
  selected: Object.fromEntries(selected.map((r) => [r, { start: relation[r].start, progression: relation[r].progression, long: relation[r].long, short: relation[r].short }])) }, null, 2));
