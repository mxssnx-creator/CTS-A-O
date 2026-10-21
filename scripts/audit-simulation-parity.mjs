#!/usr/bin/env node
// Exact-cohort reconciliation: a reported simulated execution must retain its source tape return.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { iterateSessionTapeTrades } from "./lib/session-dump.mjs";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
export const tradeMatchKey = (t) => JSON.stringify([t.sym, t.side, t.entryT, t.exitT]);
export function reconcileReturns(tapeRows, executions, tolerance = 1e-10) {
  const expected = new Map();
  for (const t of executions) {
    const k = tradeMatchKey(t);
    const xs = expected.get(k) ?? [];
    xs.push(t);
    expected.set(k, xs);
  }
  const result = { matched: [], missing: [], mismatched: [] };
  for (const row of tapeRows) {
    const [sym, side, entryT, exitT, r] = row;
    const k = tradeMatchKey({ sym, side, entryT, exitT }),
      xs = expected.get(k);
    if (!xs?.length) continue;
    const at = xs.findIndex((t) => Math.abs(modeledUnitReturn(t) - r) <= tolerance);
    const t = xs.splice(at >= 0 ? at : 0, 1)[0];
    const executionR = modeledUnitReturn(t);
    if (!(
      Number.isFinite(r) &&
      Number.isFinite(executionR) &&
      Math.abs(executionR - r) <= tolerance
    ))
      result.mismatched.push({ cfg: t.cfg, sym, side, entryT, exitT, tapeR: r, executionR });
    else result.matched.push({ t, executionR, tapeR: r });
  }
  for (const xs of expected.values())
    result.missing.push(
      ...xs.map((t) => ({
        cfg: t.cfg,
        sym: t.sym,
        side: t.side,
        entryT: t.entryT,
        exitT: t.exitT,
        executionR: modeledUnitReturn(t),
      })),
    );
  return result;
}
const cohort = () => ({ closes: 0, gp: 0, gl: 0 });
const add = (x, r) => {
  x.closes++;
  x.gp += Math.max(r, 0);
  x.gl += Math.max(-r, 0);
};
const finish = (x) => ({
  ...x,
  pf: x.closes && x.gl ? x.gp / x.gl : null,
  pfState: !x.closes ? "empty" : !x.gl ? "no-loss-gate-score-4" : "measured",
});
export async function auditSimulationParity(file, reportFile) {
  file = resolve(file);
  const { trades, funding } = await readFundedSession(file, reportFile),
    byCfg = new Map();
  for (const t of trades) {
    const xs = byCfg.get(t.cfg) ?? [];
    xs.push(t);
    byCfg.set(t.cfg, xs);
  }
  const tape = cohort(),
    execution = cohort(),
    hours = new Map(),
    ranges = new Map(),
    missing = [],
    mismatched = [];
  let examined = 0;
  for await (const row of iterateSessionTapeTrades(file)) {
    const xs = byCfg.get(row.id);
    if (!xs) continue;
    byCfg.delete(row.id);
    examined++;
    const r = reconcileReturns(row.trades, xs);
    missing.push(...r.missing);
    mismatched.push(...r.mismatched);
    for (const x of r.matched) {
      add(tape, x.tapeR);
      add(execution, x.executionR);
      const h = settledHourT(x.t.exitT),
        s = hours.get(h) ?? { t: h, tape: cohort(), execution: cohort() };
      hours.set(h, s);
      add(s.tape, x.tapeR);
      add(s.execution, x.executionR);
      const k = x.t.cfg.match(/\|(mc|mn|sh|gn|lg|mp)(?:\||$)/)?.[1] ?? "wide",
        z = ranges.get(k) ?? { range: k, tape: cohort(), execution: cohort() };
      ranges.set(k, z);
      add(z.tape, x.tapeR);
      add(z.execution, x.executionR);
    }
  }
  for (const xs of byCfg.values())
    missing.push(
      ...xs.map((t) => ({
        cfg: t.cfg,
        sym: t.sym,
        side: t.side,
        entryT: t.entryT,
        exitT: t.exitT,
        missingTape: true,
      })),
    );
  const view = (x) => ({ ...x, tape: finish(x.tape), execution: finish(x.execution) });
  return {
    schema: "cts-exact-simulation-parity-v1",
    basis:
      "Identical funded settled simulation cohort: cfg × symbol × side × entry timestamp × exit timestamp; one modeled round trip; external execution factors removed once from execution only.",
    sourceDump: file,
    totalExecutions: trades.length,
    funding,
    examinedConfigTapes: examined,
    matched: tape.closes,
    missingCount: missing.length,
    mismatchCount: mismatched.length,
    missing: missing.slice(0, 100),
    mismatched: mismatched.slice(0, 100),
    tape: finish(tape),
    execution: finish(execution),
    hours: [...hours.values()].sort((a, b) => a.t - b.t).map(view),
    ranges: [...ranges.values()].map(view),
    ok: missing.length === 0 && mismatched.length === 0 && tape.closes === trades.length,
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  assert.ok(file, "audit-simulation-parity.mjs RAW_JSON [OUT_JSON]");
  const result = await auditSimulationParity(file, process.argv[4]);
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  assert.ok(result.ok, "exact simulation cohort differs from its source tapes");
}
