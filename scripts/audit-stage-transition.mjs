#!/usr/bin/env node
// Reconcile recorded rolling config decisions with own historical tapes, then trace actual entry/exit cohorts.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  iterateSessionValidation,
  iterateSessionTapeTrades,
  readSessionDump,
} from "./lib/session-dump.mjs";
import { configEval, makeTape } from "../src/core/sim/walkforward.ts";
import { kindOfId, parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
const dir = resolve(process.argv[2] ?? "runs/micro-inverse-general-20x12h-v7"),
  out = process.argv[3] ?? `${dir}/stage-transition.json`;
const p = JSON.parse(readFileSync(`${dir}/protocol.json`)),
  raw = await readSessionDump(`${dir}/raw.json`, { fields: ["trades"] });
const recorded = [];
let initial;
for await (const s of iterateSessionValidation(`${dir}/raw.json`)) {
  if (!initial) initial = new Set(s.real);
  recorded.push({
    t: s.t,
    byId: new Map(s.checks.filter((c) => initial.has(c[0])).map((c) => [c[0], c])),
    evaluated: s.checks.length,
    passed: s.checks.filter((c) => c[1]).length,
    seated: s.real.length,
  });
}
assert.ok(initial?.size, "No recorded causal validation steps");
const steps = recorded.map((s) => ({
  t: s.t,
  evaluated: s.evaluated,
  passed: s.passed,
  seated: s.seated,
  initialStillPassed: 0,
  initialFirstFailures: {},
  newlyDroppedFirstFailures: {},
}));
const seen = new Set(),
  mismatches = [];
let decisions = 0;
for await (const row of iterateSessionTapeTrades(`${dir}/raw.json`)) {
  if (!initial.has(row.id)) continue;
  seen.add(row.id);
  const cfg = parseConfigId(row.id);
  assert.ok(cfg);
  const trades = row.trades.map(([sym, side, entryT, exitT, r]) => ({
    cfg: row.id,
    sym,
    side,
    entryT,
    exitT,
    r,
    entry: 1,
    exit: 1,
    reason: "time",
    bars: 1,
    mfe: 0,
    mae: 0,
  }));
  const tp = makeTape(
    row.id,
    cfg.bot,
    cfg.ind,
    cfg.protect,
    kindOfId(row.id),
    [...new Set(trades.map((t) => t.sym))],
    trades,
    [],
    [],
  );
  let previous = true;
  for (let i = 0; i < recorded.length; i++) {
    const s = recorded[i],
      expected = s.byId.get(row.id);
    assert.ok(expected);
    const ev = configEval(tp, s.t, p.actualWf);
    decisions++;
    if (ev.ok !== !!expected[1] || ev.n !== expected[2] || Math.abs(ev.pf - expected[3]) > 1e-8) {
      if (mismatches.length < 30) mismatches.push({ id: row.id, t: s.t, expected, actual: ev });
    }
    const x = steps[i];
    if (ev.ok) x.initialStillPassed++;
    else {
      x.initialFirstFailures[ev.fail] = (x.initialFirstFailures[ev.fail] ?? 0) + 1;
      if (previous)
        x.newlyDroppedFirstFailures[ev.fail] = (x.newlyDroppedFirstFailures[ev.fail] ?? 0) + 1;
    }
    previous = ev.ok;
  }
}
const empty = () => ({ n: 0, gp: 0, gl: 0, configs: new Set() }),
  byEntry = new Map(),
  byExit = new Map();
let winHold = 0,
  lossHold = 0,
  wins = 0,
  losses = 0;
for (const t of raw.trades) {
  const r = modeledUnitReturn(t);
  assert.ok(Number.isFinite(r));
  const h = Math.floor(t.entryT / 3600000) * 3600000,
    e = settledHourT(t.exitT);
  for (const [m, k] of [
    [byEntry, h],
    [byExit, e],
  ]) {
    const x = m.get(k) ?? empty();
    m.set(k, x);
    x.n++;
    x.configs.add(t.cfg);
    x.gp += Math.max(r, 0);
    x.gl += Math.max(-r, 0);
  }
  const hold = (t.exitT - t.entryT) / 60000;
  if (r > 0) {
    wins++;
    winHold += hold;
  } else if (r < 0) {
    losses++;
    lossHold += hold;
  }
}
const view = (m) =>
  [...m]
    .sort((a, b) => a[0] - b[0])
    .map(([t, x]) => ({
      t,
      n: x.n,
      configs: x.configs.size,
      gp: x.gp,
      gl: x.gl,
      pf: x.gl ? x.gp / x.gl : null,
    }));
const result = {
  schema: "cts-own-gate-transition-v1",
  sourceSha256: p.source.sha256,
  window: p.window,
  initialSets: initial.size,
  verifiedInitialTapes: seen.size,
  replayedDecisions: decisions,
  decisionMismatches: mismatches,
  steps,
  closedOutcomesByEntryHour: view(byEntry),
  closedOutcomesByExitHour: view(byExit),
  settledHoldMinutes: {
    wins,
    winnersAverage: winHold / wins,
    losses,
    losersAverage: lossHold / losses,
  },
  entryStageCounts: raw.stepsByRange.map((s) => ({
    t: s.t,
    candidates: Object.values(s.byRange).reduce((n, x) => n + x.candidates, 0),
    taken: Object.values(s.byRange).reduce((n, x) => n + x.taken, 0),
  })),
  firstEntryRejectionCounts: raw.engine.skips,
  firstEntryRejectionReturnsIncludingEndpointMarks: raw.engine.skipPf,
  notes: [
    "Rolling own-config decisions use only closes available at each recorded step. The archived same-identity gate arithmetic is replayed independently of source signal generation.",
    "First-failure codes are ordered gate failures, not independent or additive marginal causes. Initial-set counts exclude later newly eligible configs.",
    "Entry-hour outcomes use hindsight to locate delayed losses; never use these outcomes to qualify the original entries. Exit-hour PF is a different clock.",
    "Entry/rejection counters include endpoint-marked candidates; the outcome rows are settled closes only.",
  ],
};
writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    initial: result.initialSets,
    seen: result.verifiedInitialTapes,
    decisions,
    mismatches: mismatches.length,
    steps,
    holds: result.settledHoldMinutes,
  }),
);
assert.equal(seen.size, initial.size);
assert.equal(mismatches.length, 0, "recorded config decisions do not replay");
