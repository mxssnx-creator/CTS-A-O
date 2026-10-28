#!/usr/bin/env node
// Streaming independent inventory, distance-floor and aggregation check for a completed research run.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { configId } from "../src/core/pipeline/pipeline.ts";
import { sessionStudySourceFiles, studyExactJson, studySha256 } from "./lib/session-study.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("Expected the completed run directory");
const p = JSON.parse(readFileSync(`${dir}/protocol.json`));
const r = JSON.parse(readFileSync(`${dir}/results.json`));
assert.equal(r.status, "completed");
const sha = (x) => createHash("sha256").update(x).digest("hex");
assert.equal(sha(readFileSync("src/core/indications/low-range-research.ts")), p.hashes.source);
const runner = p.schema === "cts-low-range-24h-breakout-crosscheck-v1"
  ? "scripts/low-range-breakout-crosscheck.mjs"
  : p.schema === "cts-low-range-past-move-24h-research-v1"
    ? "scripts/low-range-past-move-24h-research.mjs"
  : p.schema === "cts-low-range-short-detail-24h-research-v1"
    ? "scripts/low-range-short-detail-24h-research.mjs"
  : p.schema === "cts-low-range-short-24h-research-v1"
    ? "scripts/low-range-short-24h-research.mjs" : "scripts/low-range-24h-research.mjs";
assert.equal(sha(readFileSync(runner)), p.hashes.runner);
assert.equal(sha(readFileSync(p.feed.path)), p.hashes.feed);
if (p.hashes.economicSources) assert.equal(studySha256(studyExactJson(sessionStudySourceFiles())), p.hashes.economicSources);
const ledgerHash = createHash("sha256");
for await (const chunk of createReadStream(`${dir}/cells.jsonl.gz`)) ledgerHash.update(chunk);
assert.equal(ledgerHash.digest("hex"), r.ledgerSha256);
const blank = () => ({ cells: 0, basePassed: 0, contexts: 0, validated: 0, historicalGp: 0, historicalGl: 0,
  settled: 0, long: 0, short: 0, openAtEnd: 0, gp: 0, gl: 0 });
const totals = blank(), steps = {}, seen = new Set();
const add = (xs, k, n = 1) => { for (const x of xs) x[k] += n; };
for await (const line of createInterface({ input: createReadStream(`${dir}/cells.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line) continue;
  const row = JSON.parse(line), step = String(row.step), s = steps[step] ??= blank(), all = [totals, s];
  assert.ok(p.policy.steps.includes(row.step));
  assert.ok(p.tfs.includes(row.tf));
  assert.ok(p.policy.tags.includes(row.tag));
  assert.ok(p.methods.includes(row.method) && p.relations.includes(row.relation) && p.windows.includes(row.window));
  const id = configId("follow", row.ind, row.protect);
  assert.ok(!seen.has(id), `duplicate config ${id}`); seen.add(id);
  assert.equal(row.protect.tag, row.tag);
  assert.ok(Math.abs(row.protect.tp - (p.policy.cost + row.step * p.policy.step)) < 1e-6);
  assert.ok(row.protect.sl + 1e-12 >= p.policy.cost + p.policy.step);
  assert.ok(!row.protect.trail || row.protect.trail * (row.protect.trailStep ?? 1) + 1e-12 >= p.policy.cost + 2 * p.policy.step);
  add(all, "cells");
  if (!row.base.passed) { assert.equal(row.directions.length, 0); continue; }
  add(all, "basePassed"); assert.equal(row.directions.length, 2);
  assert.deepEqual(row.directions.map((x) => x.side), [1, -1]);
  for (const d of row.directions) {
    add(all, "contexts");
    if (d.initial.passed) { add(all, "validated"); add(all, "historicalGp", d.initial.gp); add(all, "historicalGl", d.initial.gl); }
    if (p.schema === "cts-low-range-past-move-24h-research-v1" && !d.initial.passed) {
      assert.equal(d.forward.settled, 0); assert.equal(d.forward.openAtEnd, 0);
      assert.equal(d.forward.gp, 0); assert.equal(d.forward.gl, 0);
    }
    add(all, "settled", d.forward.settled); add(all, d.side === 1 ? "long" : "short", d.forward.settled);
    add(all, "openAtEnd", d.forward.openAtEnd); add(all, "gp", d.forward.gp); add(all, "gl", d.forward.gl);
  }
}
const same = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
for (const [label, actual, expected] of [["total", totals, r.total], ...Object.keys(steps).map((k) => [k, steps[k], r.byStep[k]])]) {
  for (const key of Object.keys(actual)) assert.ok(same(actual[key], expected[key]), `${label}: ${key}`);
}
assert.equal(totals.cells, p.totalCells);
for (const step of p.policy.steps) {
  const row = r.byStep[String(step)], hours = Object.entries(r.byStepHour).filter(([k]) => k.startsWith(`${step}|`)).map(([, v]) => v);
  for (const key of ["settled", "long", "short", "gp", "gl"])
    assert.ok(same(hours.reduce((sum, h) => sum + h[key], 0), row[key]), `hour aggregation ${step}: ${key}`);
  if (r.byStepSymbol && r.byStepSymbolHour) {
    for (const key of ["settled", "long", "short", "gp", "gl", "openAtEnd"]) {
      const symbols = p.symbols.map((sym) => r.byStepSymbol[`${step}|${sym}`] ?? blank());
      assert.ok(same(symbols.reduce((sum, x) => sum + x[key], 0), row[key]), `symbol aggregation ${step}: ${key}`);
    }
    for (const sym of p.symbols) for (const key of ["settled", "long", "short", "gp", "gl"]) {
      const symbol = r.byStepSymbol[`${step}|${sym}`] ?? blank();
      const hours = Array.from({ length: 24 }, (_, i) => r.byStepSymbolHour[`${step}|${sym}|${p.start + i * 3600000}`] ?? blank());
      assert.ok(same(hours.reduce((sum, x) => sum + x[key], 0), symbol[key]), `symbol-hour aggregation ${step}/${sym}: ${key}`);
    }
  }
}
if (p.schema === "cts-low-range-past-move-24h-research-v1") {
  assert.equal(Object.keys(r.byStepSymbol).length, p.policy.steps.length * p.symbols.length);
  assert.equal(Object.keys(r.byStepSymbolHour).length, p.policy.steps.length * p.symbols.length * 24);
  for (const relation of p.relations) for (const key of Object.keys(totals)) {
    const steps = p.policy.steps.map((step) => r.byStepRelation[`${step}|${relation}`] ?? blank());
    const frames = p.tfs.map((tf) => r.byTfRelation[`${tf}|${relation}`] ?? blank());
    assert.ok(same(steps.reduce((sum, x) => sum + x[key], 0), r.byRelation[relation][key]), `relation-step ${relation}: ${key}`);
    assert.ok(same(frames.reduce((sum, x) => sum + x[key], 0), r.byRelation[relation][key]), `relation-timeframe ${relation}: ${key}`);
  }
}
const receipt = { status: "passed", cells: totals.cells, distinctConfigIds: seen.size, basePassed: totals.basePassed,
  directionContexts: totals.contexts, validated: totals.validated, ledgerSha256: r.ledgerSha256,
  limitations: "Does not prove runtime integration, venue execution, account funding, or independent performance." };
writeFileSync(`${dir}/audit.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt));
