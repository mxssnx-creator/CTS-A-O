#!/usr/bin/env node
// Cross-check independently generated allocation, progression and step receipts.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const dir = process.argv[2]; if (!dir) throw new Error("Expected completed capped run directory");
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`));
const allocation = read("audit.json"), progression = read("progression-audit.json"), steps = read("runtime-step-detail.json"),
  session = read("session.json"), comparison = read("preallocation-comparison.json");
assert.equal(allocation.checksOk, true); assert.equal(progression.status, "passed");
assert.equal(steps.status, "passed"); assert.equal(comparison.status, "passed");
assert.equal(progression.violationCount, 0); assert.equal(progression.missingScalarStepChecks, 0);
assert.equal(progression.unknownAllocations, 0); assert.equal(progression.endpointUnknownAllocations, 0);
const groups = Object.values(steps.byStep), sum = (key) => groups.reduce((n, group) => n + group[key], 0);
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const n = allocation.total.closes;
for (const found of [progression.totalSettled.n, progression.matchedSourceTapeCloses, progression.entryDirectionChecks,
  sum("settled"), session.total.fundedOrders]) assert.equal(found, n, "funded-settled count mismatch");
for (const found of [progression.totalSettled.gp, sum("gp"), session.total.gpR]) assert.ok(near(found, allocation.total.unitGp));
for (const found of [progression.totalSettled.gl, sum("gl"), session.total.glR]) assert.ok(near(found, allocation.total.unitGl));
for (const found of [progression.totalSettled.pf, session.total.pfR]) assert.ok(near(found, allocation.total.exactPf));
for (const found of [sum("cash"), session.total.net]) assert.ok(near(found, allocation.total.sizedNetUsd));
for (const found of [progression.knownZeroAllocated, steps.zeroAllocated, session.total.zeroAllocatedOrders])
  assert.equal(found, allocation.account.zeroAllocations, "known-zero settled count mismatch");
assert.equal(progression.endpointHeldOrders, session.total.openEnd.fundedOrders);
assert.equal(progression.endpointZeroAllocated, session.total.openEnd.zeroAllocatedOrders);
assert.equal(progression.provenance.protocolSha256, allocation.provenance.study.protocolSha256);
assert.equal(progression.provenance.runSourceSha256, allocation.provenance.study.sourceSha256);
const result = { status: "passed", fundedSettled: n, knownZeroSettled: steps.zeroAllocated, unknownSettled: 0,
  fundedHeld: progression.endpointHeldOrders, knownZeroHeld: progression.endpointZeroAllocated, unknownHeld: 0,
  unitGp: allocation.total.unitGp, unitGl: allocation.total.unitGl, unitPf: allocation.total.exactPf,
  sizedCashNet: allocation.total.sizedNetUsd, scalarStepChecks: progression.scalarStepChecks,
  marginExceedanceMinutes: session.total.marginOver.minutes,
  protocolSha256: progression.provenance.protocolSha256, sourceSha256: progression.provenance.runSourceSha256,
  inputs: Object.fromEntries(["audit.json", "progression-audit.json", "runtime-step-detail.json", "session.json", "preallocation-comparison.json"]
    .map((name) => [name, createHash("sha256").update(readFileSync(`${dir}/${name}`)).digest("hex")])),
  scope: "Offline funded modeled allocations only; no live execution claim." };
writeFileSync(`${dir}/capped-reconciliation.json`, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
