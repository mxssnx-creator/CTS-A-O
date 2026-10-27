#!/usr/bin/env node
// Audit the recorded, post-Base progression and funded settled model orders.
// This does not substitute a pooled PF for each config's own direction gate.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { settledHourT } from "../src/core/metrics/stats.ts";
import { scalarDirectionEval, scalarEval } from "../.github/audits/hourly-progress.mjs";
import { readSessionDump } from "./lib/session-dump.mjs";

const H = 3_600_000;
const pf = (gp, gl, n) => !n ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
const addReturn = (b, r) => {
  b.n++;
  b.gp += Math.max(0, r);
  b.gl += Math.max(0, -r);
};
const blankReturn = () => ({ n: 0, gp: 0, gl: 0 });

export function auditProgression(raw, report, protocol) {
  const start = protocol.window.tradeStartT, end = protocol.window.endT;
  const duration = (protocol.actualWf.stepH ?? 1) * H;
  assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start && duration > 0);
  const violations = [];
  let violationCount = 0;
  const fail = (reason, detail) => {
    violationCount++;
    if (violations.length < 30) violations.push({ reason, ...detail });
  };
  const steps = raw.validation.map((s) => ({ ...s, checksMap: new Map(s.checks.map((c) => [c[0], c])), realSet: new Set(s.real) }));
  const tapes = new Map(raw.tapeTrades.map((t) => [t.id, t]));
  if (tapes.size !== raw.tapeTrades.length) fail("duplicate tape identity", {});
  const configs = new Map(), hours = [];
  let scalarStepChecks = 0, missingScalarStepChecks = 0;
  let previous = new Set();
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.t !== start + i * duration || s.t >= end) fail("missing or out-of-order validation step", { t: s.t, i });
    if (s.checksMap.size !== s.checks.length || s.realSet.size !== s.real.length)
      fail("duplicate validation or seat identity", { t: s.t });
    const passed = new Set();
    let historicalGp = 0, historicalGl = 0;
    for (const c of s.checks) {
      const [id, ok, , , gp, gl] = c;
      if ((ok !== 0 && ok !== 1) || !Number.isFinite(gp) || !Number.isFinite(gl) || gp < 0 || gl < 0) {
        fail("invalid validation record", { t: s.t, id });
        continue;
      }
      const config = configs.get(id) ?? { id, evaluated: 0, passed: 0, checks: [], settled: blankReturn() };
      configs.set(id, config);
      config.evaluated++;
      config.checks.push([s.t, ok, c[2], gp, gl]);
      const tape = tapes.get(id), parsed = parseConfigId(id);
      if (!tape || !parsed?.ind) {
        missingScalarStepChecks++;
        if (raw.tapeTradesScope === "all-built-configs") fail("missing tape in full scalar inventory", { t: s.t, id });
      } else {
        const ev = scalarEval(tape.trades, s.t, protocol.actualWf, tape.protect, tape.kind, parsed.ind);
        scalarStepChecks++;
        if (Number(ev.ok) !== ok || (ev.ok && (ev.n !== c[2] || Math.abs(ev.gp - gp) > 1e-7 || Math.abs(ev.gl - gl) > 1e-7)))
          fail("recorded validation differs from independent own-direction scalar check", { t: s.t, id });
      }
      if (ok) {
        config.passed++;
        passed.add(id);
        historicalGp += gp;
        historicalGl += gl;
      }
    }
    for (const id of s.realSet) if (!passed.has(id)) fail("seated config lacks a passing recorded check", { t: s.t, id });
    const gained = [...passed].filter((id) => !previous.has(id)).length;
    const dropped = [...previous].filter((id) => !passed.has(id)).length;
    hours.push({ t: s.t, evaluated: s.checks.length, passed: passed.size,
      validatedPct: s.checks.length ? 100 * passed.size / s.checks.length : null,
      historicalGp, historicalGl, historicalPf: pf(historicalGp, historicalGl, passed.size),
      seated: s.realSet.size, gained, dropped, enteredSettled: 0, settled: blankReturn() });
    previous = passed;
  }
  if (steps.length !== Math.ceil((end - start) / duration)) fail("incomplete validation timeline", { count: steps.length });
  const keys = new Set(), scalarCache = new Map();
  let directionChecked = 0, matchedTape = 0, knownZeroAllocated = 0, unknownAllocations = 0, fundedSettled = 0;
  for (const tr of report.sizedOrders) {
    const key = JSON.stringify([tr.cfg, tr.sym, tr.side, tr.entryT, tr.exitT, tr.closeIndex]);
    if (keys.has(key)) fail("duplicate funded close", { key });
    keys.add(key);
    if (!Number.isFinite(tr.allocatedNotional) || tr.allocatedNotional < 0) {
      unknownAllocations++;
      fail("unknown or invalid allocation", { key });
      continue;
    }
    if (tr.allocatedNotional === 0) { knownZeroAllocated++; continue; }
    fundedSettled++;
    if (!Number.isFinite(tr.unitR) || !(tr.entryT >= start && tr.entryT < end) || !(tr.exitT >= tr.entryT && tr.exitT <= end)) {
      fail("invalid funded close", { key });
      continue;
    }
    const index = Math.floor((tr.entryT - start) / duration), step = steps[index], hour = hours[index];
    if (!step?.checksMap.get(tr.cfg)?.[1]) fail("entry was not validated at its recorded step", { key });
    if (!step?.realSet.has(tr.cfg)) fail("entry was not seated at its recorded step", { key });
    if (hour) hour.enteredSettled++;
    const conf = configs.get(tr.cfg);
    if (!conf) fail("funded close has no validation identity", { key });
    else addReturn(conf.settled, tr.unitR);
    const closeIndex = Math.floor((settledHourT(tr.exitT) - start) / duration);
    if (!hours[closeIndex]) fail("settlement outside reporting window", { key });
    else addReturn(hours[closeIndex].settled, tr.unitR);
    const tape = tapes.get(tr.cfg), id = parseConfigId(tr.cfg);
    if (!tape || !id?.ind) {
      fail("missing exact source tape or config identity", { key });
      continue;
    }
    const matches = tape.trades.filter((x) => x[0] === tr.sym && x[1] === tr.side && x[2] === tr.entryT && x[3] === tr.exitT && Math.abs(x[4] - tr.unitR) < 1e-9);
    if (matches.length !== 1) fail("funded close does not match exactly one source-tape return", { key, matches: matches.length });
    else matchedTape++;
    const evKey = JSON.stringify([tr.cfg, tr.side, tr.entryT]);
    let ev = scalarCache.get(evKey);
    if (!ev) {
      ev = scalarDirectionEval(tape.trades.filter((x) => x[1] === tr.side), tr.entryT,
        protocol.actualWf, tape.protect, tape.kind, id.ind);
      scalarCache.set(evKey, ev);
    }
    directionChecked++;
    if (!ev.ok) fail("own direction fails independent entry-time scalar evaluation", { key, failure: ev.fail });
  }
  const configRows = [...configs.values()];
  for (const h of hours) h.settled.pf = pf(h.settled.gp, h.settled.gl, h.settled.n);
  for (const c of configRows) c.settled.pf = pf(c.settled.gp, c.settled.gl, c.settled.n);
  const settled = hours.reduce((a, h) => ({ n: a.n + h.settled.n, gp: a.gp + h.settled.gp, gl: a.gl + h.settled.gl }), blankReturn());
  settled.pf = pf(settled.gp, settled.gl, settled.n);
  if (settled.n !== fundedSettled) fail("settled-hour accounting does not conserve funded closes", { found: settled.n, expected: fundedSettled });
  let endpointHeldOrders = 0, endpointZeroAllocated = 0, endpointUnknownAllocations = 0;
  for (const op of report.sizedOpenOrders ?? []) {
    if (!Number.isFinite(op.allocatedNotional) || op.allocatedNotional < 0) {
      endpointUnknownAllocations++;
      fail("unknown or invalid endpoint allocation", { cfg: op.cfg, sym: op.sym });
    } else if (op.allocatedNotional === 0) endpointZeroAllocated++;
    else endpointHeldOrders++;
  }
  return {
    status: violationCount ? "failed" : "passed",
    scope: "Recorded Base-admitted config selections by evaluation step, plus funded modeled settled orders. Historical PF pools only passing config windows for that step; the per-config checks and entry-time direction checks remain separate. Overlapping histories are not independent evidence. Scalar coverage of each recorded evaluation is shown explicitly; a partial tape dump leaves missing checks unknown. This audit does not prove venue fills, unrecorded candidates or live profitability.",
    startT: start, endT: end, stepMs: duration,
    evaluatedDistinctConfigs: configs.size,
    everPassedDistinctConfigs: configRows.filter((c) => c.passed).length,
    totalSettled: settled,
    knownZeroAllocated, unknownAllocations,
    endpointHeldOrders: report.sizedOpenOrders ? endpointHeldOrders : null,
    endpointZeroAllocated: report.sizedOpenOrders ? endpointZeroAllocated : null,
    endpointUnknownAllocations: report.sizedOpenOrders ? endpointUnknownAllocations : null,
    matchedSourceTapeCloses: matchedTape, entryDirectionChecks: directionChecked,
    uniqueEntryDirectionChecks: scalarCache.size, scalarStepChecks, missingScalarStepChecks,
    hours, configs: configRows, violationCount, violations,
  };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage: audit-low-range-progression.mjs RUN_DIR [OUTPUT_JSON]");
  const rawPath = `${dir}/raw.json`, reportPath = `${dir}/report/data.json`;
  const protocolBytes = readFileSync(`${dir}/protocol.json`), protocol = JSON.parse(protocolBytes);
  const [raw, report] = await Promise.all([
    readSessionDump(rawPath, { fields: ["validation", "tapeTrades"] }),
    readSessionDump(reportPath, { fields: ["sizedOrders", "sizedOpenOrders"] }),
  ]);
  const result = auditProgression(raw, report, protocol);
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  result.provenance = { protocolSha256: sha(protocolBytes), runSourceSha256: protocol.source.sha256,
    scalarReferenceSha256: sha(readFileSync(new URL("../.github/audits/hourly-progress.mjs", import.meta.url))),
    auditSha256: sha(readFileSync(new URL(import.meta.url))) };
  const target = process.argv[3] ?? `${dir}/progression-audit.json`;
  writeFileSync(target, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: result.status, evaluated: result.evaluatedDistinctConfigs,
    everPassed: result.everPassedDistinctConfigs, settled: result.totalSettled,
    matched: result.matchedSourceTapeCloses, directionChecks: result.entryDirectionChecks,
    scalarStepChecks: result.scalarStepChecks, missingScalarStepChecks: result.missingScalarStepChecks,
    violationCount: result.violationCount }));
  if (result.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
