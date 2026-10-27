#!/usr/bin/env node
// Independently regroup an audited cell ledger by effective SL ratio and trailing-floor category.
import assert from "node:assert/strict";
import { readFileSync, createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
const dir = process.argv[2];
if (!dir) throw new Error("Expected a completed research directory");
const p = JSON.parse(readFileSync(`${dir}/protocol.json`)), r = JSON.parse(readFileSync(`${dir}/results.json`));
const audit = JSON.parse(readFileSync(`${dir}/audit.json`));
assert.equal(audit.status, "passed"); assert.equal(r.status, "completed");
const empty = () => ({ cells: 0, basePassed: 0, contexts: 0, validated: 0, historicalGp: 0, historicalGl: 0,
  settled: 0, long: 0, short: 0, openAtEnd: 0, gp: 0, gl: 0 });
const byStepSl = {}, byStepTrail = {}, byStepRelation = {}, byStepWindow = {}, get = (obj, key) => obj[key] ??= empty();
const bump = (a, key, n = 1) => { for (const x of a) x[key] += n; };
for await (const line of createInterface({ input: createReadStream(`${dir}/cells.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line) continue;
  const row = JSON.parse(line), unit = row.step * p.policy.step;
  const rawRatio = (row.protect.sl - p.policy.cost) / unit;
  const ratio = Math.round(rawRatio * 4) / 4;
  assert.ok(ratio >= 0.5 && ratio <= 3.5 && Math.abs(ratio - rawRatio) < 1e-6, "SL identity is not reconstructible");
  const trail = !row.protect.trail ? "plain" : row.protect.trail <= p.policy.cost + 2 * p.policy.step + 1e-9 ? "minimum" : "above-minimum";
  const groups = [get(byStepSl, `${row.step}|${ratio}`), get(byStepTrail, `${row.step}|${trail}`),
    get(byStepRelation, `${row.step}|${row.relation}`), get(byStepWindow, `${row.step}|${row.window}`)];
  bump(groups, "cells");
  if (!row.base.passed) continue;
  bump(groups, "basePassed");
  for (const d of row.directions) {
    bump(groups, "contexts");
    if (d.initial.passed) { bump(groups, "validated"); bump(groups, "historicalGp", d.initial.gp); bump(groups, "historicalGl", d.initial.gl); }
    bump(groups, "settled", d.forward.settled); bump(groups, d.side === 1 ? "long" : "short", d.forward.settled);
    bump(groups, "openAtEnd", d.forward.openAtEnd); bump(groups, "gp", d.forward.gp); bump(groups, "gl", d.forward.gl);
  }
}
const same = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
for (const step of p.policy.steps) for (const map of [byStepSl, byStepTrail, byStepRelation, byStepWindow]) for (const k of Object.keys(empty())) {
  const sum = Object.entries(map).filter(([key]) => key.startsWith(`${step}|`)).reduce((n, [, v]) => n + v[k], 0);
  assert.ok(same(sum, r.byStep[String(step)][k]), `${step}: ${k} aggregate mismatch`);
}
const pf = (gp, gl, count) => !count ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
for (const x of [...Object.values(byStepSl), ...Object.values(byStepTrail), ...Object.values(byStepRelation), ...Object.values(byStepWindow)]) {
  x.validatedPct = x.contexts ? 100 * x.validated / x.contexts : null;
  x.historicalPf = pf(x.historicalGp, x.historicalGl, x.validated);
  x.forwardPf = pf(x.gp, x.gl, x.settled);
}
const output = { schema: "cts-low-range-stratified-v1", ledgerSha256: r.ledgerSha256, byStepSl, byStepTrail, byStepRelation, byStepWindow,
  note: "SL ratio reconstructed from actual cost-inclusive prices; trailing groups describe effective peak gaps after floors, not requested aliases." };
writeFileSync(process.argv[3] ?? `${dir}/stratified.json`, JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: "passed", slBuckets: Object.keys(byStepSl).length, trailBuckets: Object.keys(byStepTrail).length }));
