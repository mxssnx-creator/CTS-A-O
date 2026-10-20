#!/usr/bin/env node
// Verify the sealed sensitivity study; empty/losing cohorts remain evidence, never winners.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readSessionDump } from "./lib/session-dump.mjs";
import { validateFrozenSessionResult } from "./lib/session-study.mjs";

const out = path.resolve(process.argv[2] ?? "research/runs/strategy-defaults-20261020/v5");
const read = p => JSON.parse(fs.readFileSync(p));
const protocol = read(path.join(out, "protocol.json"));
const progress = read(path.join(out, "progress.json"));
assert.equal(progress.length, protocol.jobs.length);
assert.equal(progress.length, 16);
assert.ok(progress.every(x => x.code === 0));
const reports = [], evaluations = [];
for (const job of protocol.jobs) {
  const raw = await readSessionDump(path.join(job.dir, "raw.json"));
  validateFrozenSessionResult(raw, path.join(job.dir, "protocol.json"));
  const report = read(path.join(job.dir, "session.json"));
  const ownProtocol = read(path.join(job.dir, "protocol.json"));
  const s = ownProtocol.actualSettings, wf = ownProtocol.actualWf;
  assert.equal(s.dca.levels, 1); assert.equal(s.dca.addRatio, 2.5);
  assert.equal(wf.validLastN, 25); assert.equal(wf.lastN, 25);
  assert.equal(wf.lastNMinPf, 1.5); assert.equal(s.gates.minPf, 1.5);
  assert.equal(report.configEvaluationHistoryH, 336);
  assert.equal(raw.engine.coverage.expectedCombos, 42);
  assert.equal(raw.engine.coverage.evaluated, 42);
  assert.equal(report.total.unknownAllocations, 0);
  assert.equal(report.total.unknownReturns, 0);
  assert.equal(report.evidence.actualExecution, false);
  assert.equal(raw.validation.length, 6);
  for (const step of raw.validation) {
    assert.ok(step.t >= ownProtocol.window.tradeStartT && step.t <= ownProtocol.window.endT);
    const ids = new Set();
    for (const check of step.checks) {
      assert.ok(!ids.has(check[0]), "duplicate config verdict in one hourly step"); ids.add(check[0]);
      evaluations.push({ scenario:job.scenario, fold:job.fold, t:step.t, check });
    }
  }
  reports.push({ scenario:job.scenario, fold:job.fold,
    baseEvaluated:report.engine.baseEvaluated, basePassed:report.engine.basePassed,
    configs:report.engine.tapes, configEvals:report.evalStats.evaluated,
    configPasses:report.evalStats.passed, fundedCloses:report.total.fundedOrders,
    virtualCloses:report.total.virtual.n, returnPf:report.total.pf,
    equityDrawdownPct:report.total.equityMaxDdPct, feasible:report.total.feasible,
    positiveHours:report.total.greenHours, negativeHours:report.total.redHours,
    flatHours:report.total.flatHours, postBase:report.evalAfterBase,
    protocolSha256:createHash("sha256").update(fs.readFileSync(path.join(job.dir,"protocol.json"))).digest("hex") });
}
const eligible = reports.filter(r => r.fold === "development" && r.fundedCloses >= 25 &&
  Number.isFinite(r.returnPf) && r.returnPf >= 1.5 && r.equityDrawdownPct <= 10 && r.feasible);
eligible.sort((a,b) => b.returnPf-a.returnPf || a.equityDrawdownPct-b.equityDrawdownPct || a.scenario.localeCompare(b.scenario));
const selected = eligible[0] ?? null;
const summary = { schema:"cts-strategy-defaults-verified-v1", sourceHash:protocol.sourceHash,
  selectionRule:protocol.selection, selectedScenario:selected?.scenario ?? null,
  confirmation:selected ? reports.find(r => r.scenario === selected.scenario && r.fold === "confirmation") : null,
  reports, hourlyConfigChecks:evaluations.length,
  limitation:"Retrospective, reused public feed; six representative indications across four lanes, bounded Wide grid. All-range routing and Signals are separate tests. Zero exposure is not proof of low-risk profitability." };
fs.writeFileSync(path.join(out,"verified-summary.json"), JSON.stringify(summary,null,2)+"\n");
fs.writeFileSync(path.join(out,"verified-config-checks.json"), JSON.stringify(evaluations)+"\n");
console.log(JSON.stringify({runs:reports.length, checks:evaluations.length, selected:summary.selectedScenario,
  fundedCloses:reports.reduce((n,r)=>n+r.fundedCloses,0), sourceHash:summary.sourceHash}));
