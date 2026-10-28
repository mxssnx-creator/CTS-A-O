#!/usr/bin/env node
// Partition an already-audited funded modeled cohort by each config's initial validation verdict.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const near = (a, b, label) => assert.ok(Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), `${label}: ${a} != ${b}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const blank = () => ({ initialConfigs: 0, executedConfigs: 0, settled: 0, gp: 0, gl: 0 });
const pack = (x) => ({ ...x, pf: x.settled && x.gl > 0 ? x.gp / x.gl : null,
  pfState: !x.settled ? "empty" : x.gl === 0 ? "no-loss" : "measured" });

export function verifyFrozenSettings(protocol, raw, reconciliation) {
  assert.equal(raw.study?.protocolSha256, reconciliation.protocolSha256, "raw protocol mismatch");
  assert.equal(raw.study?.sourceSha256, reconciliation.sourceSha256, "raw source mismatch");
  assert.equal(protocol.source?.sha256, reconciliation.sourceSha256, "protocol source mismatch");
  assert.equal(protocol.actualSettings?.exitStrategy?.enabled, false, "protocol Historic Exit is not off");
  assert.equal(raw.settings?.effective?.exitStrategy?.enabled, false, "raw Historic Exit is not off");
  assert.equal(protocol.actualSettings?.signals?.enabled, false); assert.equal(raw.settings.effective.signals?.enabled, false);
  for (const key of ["exit", "block", "blockActive", "dca", "dcaActive", "axis"]) {
    assert.equal(protocol.actualSettings.toggles?.[key], false, `protocol ${key} enabled`);
    assert.equal(protocol.actualWf?.toggles?.[key], false, `walk-forward ${key} enabled`);
    assert.equal(raw.settings.effective.toggles?.[key], false, `raw ${key} enabled`);
  }
  for (const key of ["normal", "trailing"]) {
    assert.equal(protocol.actualSettings.toggles?.[key], true);
    assert.equal(protocol.actualWf?.toggles?.[key], true);
    assert.equal(raw.settings.effective.toggles?.[key], true);
  }
  assert.equal(protocol.actualSettings.cost, .0015); assert.equal(raw.settings.effective.cost, .0015);
  assert.equal(raw.symbols?.length, 20); assert.deepEqual(raw.symbols, protocol.symbols);
  assert.equal(protocol.lane, 5); assert.equal(protocol.sourceCount, 195);
  assert.equal(protocol.window?.tradeStartT, raw.window?.startT);
  assert.equal(protocol.window?.endT, raw.window?.endT);
  return { historicExit: false, signals: false, block: false, dca: false, axis: false,
    normal: true, trailing: true, modeledRoundTripCost: .0015, symbols: 20 };
}

export function partition(progression, reconciliation) {
  assert.equal(progression.status, "passed");
  assert.equal(reconciliation.status, "passed");
  assert.equal(progression.provenance?.protocolSha256, reconciliation.protocolSha256, "protocol mismatch");
  assert.equal(progression.provenance?.runSourceSha256, reconciliation.sourceSha256, "source mismatch");
  assert.ok(Array.isArray(progression.hours) && progression.hours.length > 0 && Array.isArray(progression.configs));
  assert.equal(progression.configs.length, progression.evaluatedDistinctConfigs);
  const start = progression.startT, first = progression.hours[0];
  assert.equal(first.t, start);
  const groups = { initialPassed: blank(), initialFailed: blank() }, seen = new Set();
  let initialGp = 0, initialGl = 0;
  for (const config of progression.configs) {
    assert.ok(typeof config.id === "string" && config.id.length && !seen.has(config.id), "missing or duplicate config");
    seen.add(config.id);
    assert.equal(config.checks.length, progression.hours.length, `${config.id}: incomplete decisions`);
    for (let i = 0; i < config.checks.length; i++) {
      const check = config.checks[i];
      assert.equal(check[0], progression.hours[i].t, `${config.id}: decision clock`);
      assert.ok(check[1] === 0 || check[1] === 1, `${config.id}: unknown decision`);
    }
    const initial = config.checks[0], row = config.settled;
    assert.ok(Number.isFinite(initial[3]) && initial[3] >= 0 && Number.isFinite(initial[4]) && initial[4] >= 0);
    assert.ok(Number.isSafeInteger(row.n) && row.n >= 0 && Number.isFinite(row.gp) && row.gp >= 0 &&
      Number.isFinite(row.gl) && row.gl >= 0, `${config.id}: invalid settled totals`);
    if (row.n === 0) assert.ok(row.gp === 0 && row.gl === 0, `${config.id}: gain or loss without settlements`);
    const g = initial[1] === 1 ? groups.initialPassed : groups.initialFailed;
    g.initialConfigs++;
    if (row.n > 0) g.executedConfigs++;
    g.settled += row.n; g.gp += row.gp; g.gl += row.gl;
    if (initial[1] === 1) { initialGp += initial[3]; initialGl += initial[4]; }
  }
  assert.equal(first.evaluated, seen.size);
  assert.equal(first.passed, groups.initialPassed.initialConfigs);
  near(initialGp, first.historicalGp, "initial passed gross gains");
  near(initialGl, first.historicalGl, "initial passed gross losses");
  near(initialGp / initialGl, first.historicalPf, "initial historical PF");
  const n = groups.initialPassed.settled + groups.initialFailed.settled;
  const gp = groups.initialPassed.gp + groups.initialFailed.gp, gl = groups.initialPassed.gl + groups.initialFailed.gl;
  assert.equal(n, progression.totalSettled.n);
  assert.equal(n, reconciliation.fundedSettled);
  near(gp, progression.totalSettled.gp, "progression gains"); near(gl, progression.totalSettled.gl, "progression losses");
  near(gp, reconciliation.unitGp, "funded gains"); near(gl, reconciliation.unitGl, "funded losses");
  near(gp / gl, reconciliation.unitPf, "funded PF");
  assert.equal(progression.knownZeroAllocated, reconciliation.knownZeroSettled);
  assert.equal(progression.unknownAllocations, 0); assert.equal(reconciliation.unknownSettled, 0);
  return { status: "passed", scope: "Previously examined simulated funded settled orders, grouped by exact config's initial recorded post-Base verdict; later dynamic validation and entry gates still apply. Not independent trade observations or live fills.",
    startT: start, endT: progression.endT, initial: { evaluated: seen.size, passed: first.passed,
      pct: 100 * first.passed / seen.size, historicalGp: initialGp, historicalGl: initialGl, historicalPf: initialGp / initialGl },
    initialPassed: pack(groups.initialPassed), initialFailed: pack(groups.initialFailed),
    total: { settled: n, gp, gl, pf: gp / gl, zeroAllocated: progression.knownZeroAllocated, unknownAllocated: 0 },
    everPassedDistinctConfigs: progression.everPassedDistinctConfigs, protocolSha256: reconciliation.protocolSha256,
    sourceSha256: reconciliation.sourceSha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  assert.ok(dir, "audit-low-range-cohort-turnover.mjs STUDY_DIR [OUTPUT_JSON] [EXACT_TAPE_PARITY_JSON]");
  const progressionBytes = readFileSync(resolve(dir, "progression-audit.json"));
  const reconciliationBytes = readFileSync(resolve(dir, "capped-reconciliation.json"));
  const protocolBytes = readFileSync(resolve(dir, "protocol.json")), rawBytes = readFileSync(resolve(dir, "raw.json"));
  const progression = JSON.parse(progressionBytes), reconciliation = JSON.parse(reconciliationBytes);
  assert.equal(sha(progressionBytes), reconciliation.inputs?.["progression-audit.json"], "progression audit hash mismatch");
  assert.equal(sha(protocolBytes), reconciliation.protocolSha256, "protocol hash mismatch");
  const frozen = verifyFrozenSettings(JSON.parse(protocolBytes), JSON.parse(rawBytes), reconciliation);
  const result = { ...partition(progression, reconciliation), frozenSettings: frozen, inputs: { progressionAuditSha256: sha(progressionBytes),
    cappedReconciliationSha256: sha(reconciliationBytes), rawHeaderSha256: sha(rawBytes),
    auditScriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))) } };
  if (process.argv[4]) {
    const bytes = readFileSync(resolve(process.argv[4])), parity = JSON.parse(bytes);
    assert.equal(resolve(parity.sourceDump), resolve(dir, "raw.json"), "parity refers to a different session");
    assert.equal(parity.ok, true); assert.equal(parity.totalExecutions, result.total.settled);
    assert.equal(parity.matched, result.total.settled); assert.equal(parity.missingCount, 0); assert.equal(parity.mismatchCount, 0);
    assert.equal(parity.funding.zeroAllocatedCloses, result.total.zeroAllocated);
    near(parity.execution.gp, result.total.gp, "parity funded gains"); near(parity.execution.gl, result.total.gl, "parity funded losses");
    result.exactTapeParity = { matched: parity.matched, configTapes: parity.examinedConfigTapes,
      missing: parity.missingCount, mismatched: parity.mismatchCount, range: parity.ranges };
    // Canonicalize the local path so the receipt is reproducible in another checkout.
    result.inputs.exactTapeParityCanonicalSha256 = sha(Buffer.from(JSON.stringify({ ...parity, sourceDump: "raw.json" })));
  }
  if (process.argv[3]) writeFileSync(resolve(process.argv[3]), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}
