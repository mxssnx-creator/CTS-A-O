#!/usr/bin/env node
// Independent accounting and causal-evidence audit for study-causal-processed-sets.mjs output.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const dir = process.argv[2];
if (!dir) throw new Error("usage: verify-causal-processed-sets.mjs OUTPUT_DIRECTORY");
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const jsonl = (p) => readFileSync(p, "utf8").split("\n").filter(Boolean).map(JSON.parse);
const protocol = json(`${dir}/protocol.json`), samples = protocol.samples;
const near = (a, b) => {
  if (a === null || b === null) return assert.equal(a, b);
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
};
for (const [path, expected] of Object.entries(protocol.sourceSha256)) {
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  assert.equal(actual, expected, `study source mismatch: ${path}`);
}
const empty = () => ({ insufficient: 0, unknown: 0, failed: 0, qualified: 0 });
const total = (x) => Object.values(x).reduce((a, n) => a + n, 0);
const percent = (x) => total(x) ? 100 * x.qualified / total(x) : null;
const windowVerdict = (rows, n) => {
  assert.ok(rows.length <= n);
  if (rows.some((x) => x.unitReturn === null || !Number.isFinite(x.unitReturn))) return { state: "unknown", n: rows.length, pf: null };
  if (rows.length < n) return { state: "insufficient", n: rows.length, pf: null };
  const gp = rows.reduce((a, x) => a + Math.max(0, x.unitReturn), 0), gl = rows.reduce((a, x) => a + Math.max(0, -x.unitReturn), 0);
  const pf = gl ? gp / gl : gp ? 4 : 0;
  return { state: gp > gl && pf >= protocol.minPf ? "qualified" : "failed", n: rows.length, pf };
};
const compareVerdict = (actual, expected) => {
  assert.equal(actual.state, expected.state); assert.equal(actual.n, expected.n); near(actual.pf, expected.pf);
};
const independentlyCountPositions = (rows) => {
  const groups = new Map(), openKeys = new Set();
  let settledOrders = 0;
  for (const r of rows) {
    const k = JSON.stringify([r.sym, r.side]), trade = r.trade;
    const a = groups.get(k) ?? [];
    a.push([trade.entryT, r.closed ? trade.exitT : Infinity]); groups.set(k, a);
    if (r.closed) settledOrders++; else openKeys.add(k);
  }
  let openedPositions = 0, closedPositions = 0;
  for (const intervals of groups.values()) {
    intervals.sort((a, b) => a[0] - b[0]);
    let end = -Infinity, exists = false;
    for (const [a, b] of intervals) {
      if (a >= end) { if (exists && Number.isFinite(end)) closedPositions++; openedPositions++; end = b; exists = true; }
      else end = Math.max(end, b);
    }
    if (exists && Number.isFinite(end)) closedPositions++;
  }
  return { openedPositions, closedPositions, openPositions: openKeys.size, openedOrders: rows.length,
    settledOrders, openOrders: rows.length - settledOrders };
};
const verifyStage = (stage, rows) => {
  assert.deepEqual(stage.positionsAndOrders, independentlyCountPositions(rows));
  const closed = rows.filter((x) => x.closed), gp = closed.reduce((a, x) => a + Math.max(0, x.trade.r), 0),
    gl = closed.reduce((a, x) => a + Math.max(0, -x.trade.r), 0);
  near(stage.grossProfit, gp); near(stage.grossLoss, gl);
  near(stage.returnPf, closed.length && gl > 0 ? gp / gl : null);
  assert.equal(stage.noLoss, closed.length > 0 && gp > 0 && gl === 0);
  near(stage.meanDurationMinutes, closed.length ? closed.reduce((a, x) => a + (x.trade.exitT - x.trade.entryT) / 60_000, 0) / closed.length : null);
  const reasons = {}; for (const x of closed) reasons[x.trade.reason] = (reasons[x.trade.reason] ?? 0) + 1;
  assert.deepEqual(stage.byReason, reasons);
};
for (const history of protocol.histories) {
  const results = json(`${dir}/history-${history}-results.json`), contexts = jsonl(`${dir}/history-${history}-contexts.jsonl`),
    entries = jsonl(`${dir}/history-${history}-postbase-entries.jsonl`);
  assert.equal(contexts.length, 4800); assert.equal(results.completedContexts, 4800); assert.equal(results.cases.length, samples.length ** 2);
  const keys = new Set();
  for (const c of contexts) {
    const k = JSON.stringify([c.cfg, c.sym, c.side, c.kind, c.relation]); assert.ok(!keys.has(k)); keys.add(k);
    assert.ok(c.base.n <= protocol.baseN && (c.side === 1 || c.side === -1));
  }
  const orderKeys = new Set();
  for (const e of entries) {
    const t = e.trade.entryT, k = JSON.stringify([e.cfg, e.sym, e.side, t]);
    assert.ok(!orderKeys.has(k)); orderKeys.add(k);
    assert.ok(t >= protocol.start && t < protocol.end && e.trade.cfg === e.cfg && e.trade.sym === e.sym && e.trade.side === e.side);
    assert.equal(e.closed, !e.trade.markedOpen);
    if (e.closed) assert.ok(Number.isFinite(e.trade.r) && e.trade.exitT >= t && e.trade.exitT <= protocol.end);
    for (const row of [...e.evidence.validationSource, ...e.evidence.realSource]) {
      assert.ok(row.exitT < t && row.entryT <= row.exitT && String(row.entryT) === row.entryId && Number.isFinite(row.unitReturn));
    }
    compareVerdict(e.validation[12].verdict, windowVerdict(e.evidence.validationSource, 12));
    if (e.validation[12].real[12]) compareVerdict(e.validation[12].real[12], windowVerdict(e.evidence.realSource, 12));
  }
  for (const c of results.cases) {
    const val = c.validationN, real = c.realN;
    const startValidation = empty(), startReal = empty(); let base = 0, gp = 0, gl = 0, rgp = 0, rgl = 0;
    for (const row of contexts) if (row.base.ok) {
      base++; const q = row.validations[val]; startValidation[q.verdict.state]++;
      if (q.verdict.state === "qualified") {
        gp += q.sourceGross.gp; gl += q.sourceGross.gl;
        const r = q.real[real]; startReal[r.state]++;
        if (r.state === "qualified") { rgp += q.realGross[real].gp; rgl += q.realGross[real].gl; }
      }
    }
    assert.equal(c.atStart.contexts, contexts.length); assert.equal(c.atStart.basePassed, base);
    assert.deepEqual(c.atStart.validation, startValidation); assert.deepEqual(c.atStart.real, startReal);
    near(c.atStart.historicalGp, gp); near(c.atStart.historicalGl, gl); near(c.atStart.realGp, rgp); near(c.atStart.realGl, rgl);
    near(c.atStart.validationPctOfBase, base ? 100 * startValidation.qualified / base : null);
    const vEval = empty(), rEval = empty(), accepted = [], active = [];
    for (const e of entries) {
      const v = e.validation[val]; vEval[v.verdict.state]++;
      if (v.verdict.state === "qualified") {
        accepted.push(e); const r = v.real[real]; rEval[r.state]++;
        if (r.state === "qualified") active.push(e);
      }
    }
    assert.deepEqual(c.duringWindow.evaluations, { validation: vEval, real: rEval });
    near(c.duringWindow.validationPctOfPostBaseOrders, percent(vEval)); near(c.duringWindow.realPctOfValidatedOrders, percent(rEval));
    verifyStage(c.duringWindow.stages.postBase, entries); verifyStage(c.duringWindow.stages.validated, accepted);
    verifyStage(c.duringWindow.stages.active, active);
    for (const [key, group] of Object.entries(c.duringWindow.groups)) {
      const [kind, tf] = key.split("|"); const match = (x) => x.kind === kind && x.tf === Number(tf);
      verifyStage(group.postBase, entries.filter(match)); verifyStage(group.validated, accepted.filter(match));
      verifyStage(group.active, active.filter(match));
    }
  }
  console.log(JSON.stringify({ historyHours: history, contexts: contexts.length, postBaseEntries: entries.length,
    validationRealCases: results.cases.length, evidenceWindowsVerified: entries.length * 2 }));
}
