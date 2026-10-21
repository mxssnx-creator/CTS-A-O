#!/usr/bin/env node
// Paired market replay: prove which stage changed, preserving every losing and unfunded sample.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { iterateSessionValidation } from "./lib/session-dump.mjs";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
const [baseline, corrected, out, correctedReport] = process.argv.slice(2);
assert.ok(baseline && corrected && out, "BASE_DIR CORRECTED_DIR OUT_JSON [CORRECTED_REPORT]");
const a = await readFundedSession(`${baseline}/raw.json`), b = await readFundedSession(`${corrected}/raw.json`, correctedReport);
const pa = JSON.parse(readFileSync(`${baseline}/protocol.json`)), pb = JSON.parse(readFileSync(`${corrected}/protocol.json`));
assert.deepEqual(pa.window, pb.window);
assert.equal(pa.feed.sha256, pb.feed.sha256);
assert.deepEqual(pa.actualWf, pb.actualWf);
const expected = structuredClone(pa.actualSettings); expected.exitStrategy.includeMicro = false;
assert.deepEqual(expected, pb.actualSettings, "Only documented discovery restriction differs");
const ga = iterateSessionValidation(`${baseline}/raw.json`)[Symbol.asyncIterator](), gb = iterateSessionValidation(`${corrected}/raw.json`)[Symbol.asyncIterator]();
let decisions = 0;
const steps = [];
while (true) {
  const x = await ga.next(), y = await gb.next();
  assert.equal(x.done, y.done);
  if (x.done) break;
  assert.equal(x.value.t, y.value.t);
  assert.deepEqual([...x.value.real].sort(), [...y.value.real].sort(), "Selected sets changed");
  const old = new Map(x.value.checks.map((r) => [r[0], r]));
  assert.equal(old.size, y.value.checks.length);
  for (const r of y.value.checks) {
    const prior = old.get(r[0]); assert.ok(prior, `New gate ID ${r[0]}`);
    assert.equal(r.length, prior.length);
    for (let i = 1; i < r.length; i++) {
      if (typeof r[i] === "number" && typeof prior[i] === "number") assert.ok(Math.abs(r[i] - prior[i]) <= 1e-8, `Changed gate field ${r[0]}: ${i}`);
      else assert.equal(r[i], prior[i]);
    }
    decisions++;
  }
  steps.push({ t: x.value.t, evaluated: old.size, passedAndSeated: x.value.real.length });
}
const key = (t) => JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT]);
const bucket = (xs) => {
  let gp = 0, gl = 0;
  for (const t of xs) { const r = modeledUnitReturn(t); assert.ok(Number.isFinite(r)); gp += Math.max(0, r); gl += Math.max(0, -r); }
  return { closes: xs.length, gp, gl, pf: xs.length && gl ? gp / gl : null };
};
const old = new Map(a.virtualTrades.map((t) => [key(t), t])), next = new Map(b.virtualTrades.map((t) => [key(t), t]));
assert.equal(old.size, a.virtualTrades.length); assert.equal(next.size, b.virtualTrades.length);
let shared = 0;
const added = [], removed = [];
for (const [k, t] of next) {
  const prev = old.get(k);
  if (prev) { assert.ok(Math.abs(modeledUnitReturn(prev) - modeledUnitReturn(t)) <= 1e-10, `Changed shared return ${k}`); shared++; }
  else added.push(t);
}
for (const [k, t] of old) if (!next.has(k)) removed.push(t);
assert.equal(removed.length, 0, "Independent-order correction omitted previous virtual executions");
const result = {
  schema: "cts-micro-independent-order-market-comparison-v1", feedSha256: pa.feed.sha256, window: pa.window,
  baselineSourceSha256: pa.source.sha256, correctedSourceSha256: pb.source.sha256,
  gateDecisionsCompared: decisions, gateDecisionDifferences: 0, steps,
  identicalPreviousVirtualCloses: shared, previousVirtualClosesRemoved: removed.length, addedVirtualCloses: bucket(added),
  baseline: { virtual: bucket(a.virtualTrades), funded: bucket(a.trades), funding: a.funding, firstRejections: a.raw.engine.skips },
  corrected: { virtual: bucket(b.virtualTrades), funded: bucket(b.trades), funding: b.funding, firstRejections: b.raw.engine.skips },
  notes: ["Every recorded config decision and selected ID is compared at the same causal time. Set-count deterioration is unchanged by the order-identity repair.", "Shared prior virtual orders retain exactly the same unit returns. Additional independently admitted orders may lose; correctness cannot force PF positive.", "Funding is the actual report cohort. Known zero allocations and endpoint marks are excluded from funded settled PF."]
};
writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
