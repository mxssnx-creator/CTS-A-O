#!/usr/bin/env node
// Retrospective, read-only Last-N diagnostic on the actual frozen source/funded-model cohorts.
// This is a fixed-order filter comparison, not a new stage simulation or a venue-order claim.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { iterateSessionTapeTrades, readSessionDump } from "./lib/session-dump.mjs";
import { auditSimulationParity } from "./audit-simulation-parity.mjs";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { parseConfigId } from "../src/core/pipeline/pipeline.ts";
import { minPfOf } from "../src/core/minimal-coord.ts";
import { positionOrderCounts } from "../src/core/positions.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./lib/book-notional.mjs";

export const WINDOWS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
export const identity = (cfg, sym, side) => JSON.stringify([cfg, sym, side]);
export function evaluateWindow(rows, n, floor) {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(floor) || floor <= 1) throw new Error("Invalid policy");
  const prior = rows.slice(-n), seen = prior.length;
  if (prior.some(r => !Number.isFinite(r))) return { n: seen, state: "unknown", pf: null, gp: null, gl: null };
  if (seen < n) return { n: seen, state: "insufficient", pf: null, gp: null, gl: null };
  let gp = 0, gl = 0;
  for (const r of prior) { if (r > 0) gp += r; else gl -= r; }
  const pf = gl > 0 ? gp / gl : null, noLoss = gl === 0 && gp > 0;
  if (![gp, gl].every(Number.isFinite) || (gl > 0 && !Number.isFinite(pf)))
    return { n: seen, state: "unknown", pf: null, gp: null, gl: null };
  if (gp === 0 && gl === 0) return { n: seen, state: "flat", pf: null, gp, gl };
  return { n: seen, state: gp > gl && (noLoss || pf >= floor) ? "qualified" : "failed", pf, gp, gl, noLoss };
}
/** Source events are sorted by observed exit; an equal-time exit cannot qualify the new entry. */
export function causalWindow(events, before, n, floor) {
  let lo = 0, hi = events.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (events[m][0] < before) lo = m + 1; else hi = m; }
  return evaluateWindow(events.slice(Math.max(0, lo - n), lo).map(x => x[1]), n, floor);
}
function aggregate(orders) {
  let gp = 0, gl = 0, unknown = 0;
  for (const t of orders) { const r = modeledUnitReturn(t); if (!Number.isFinite(r)) unknown++; else { gp += Math.max(0, r); gl += Math.max(0, -r); } }
  const pf = !unknown && gl > 0 ? gp / gl : null;
  return { n: orders.length, gp, gl, pf: Number.isFinite(pf) ? pf : null,
    noLoss: !unknown && orders.length > 0 && gp > 0 && gl === 0, unknown };
}
const blank = () => ({ contexts: 0, qualified: 0, failed: 0, insufficient: 0, flat: 0, unknown: 0,
  qualifiedFinite: 0, qualifiedNoLoss: 0, finitePfSum: 0, historyGp: 0, historyGl: 0, orders: [] });
const addWindow = (a, context, n, ordersByContext) => {
  const w = context.windows[n]; a.contexts++; a[w.state]++;
  if (w.state !== "qualified") return;
  if (w.noLoss) a.qualifiedNoLoss++; else { a.qualifiedFinite++; a.finitePfSum += w.pf; }
  a.historyGp += w.gp; a.historyGl += w.gl;
  a.orders.push(...(ordersByContext.get(identity(context.cfg, context.sym, context.side)) ?? []));
};
const finish = a => ({ contexts: a.contexts, qualified: a.qualified, failed: a.failed,
  insufficient: a.insufficient, flat: a.flat, unknown: a.unknown,
  validatedPct: a.contexts ? 100 * a.qualified / a.contexts : null,
  finiteMeanPf: a.qualifiedFinite ? a.finitePfSum / a.qualifiedFinite : null,
  qualifiedFinite: a.qualifiedFinite, qualifiedNoLoss: a.qualifiedNoLoss,
  pooledHistoricalPf: a.historyGl > 0 ? a.historyGp / a.historyGl : null,
  laterExistingFunded: aggregate(a.orders) });

export async function auditIndependentLastN(rawFile, reportFile) {
  const parity = await auditSimulationParity(rawFile, reportFile);
  assert.ok(parity.ok, "Funded source/execution parity is required");
  const { raw, book, trades, funding } = await readFundedSession(rawFile, reportFile);
  const initialAudit = JSON.parse(readFileSync(resolve(dirname(rawFile), "main-processing.json"), "utf8"));
  assert.ok(initialAudit.ok && initialAudit.issues.length === 0);
  assert.equal(initialAudit.study.protocolSha256, raw.study.protocolSha256);
  assert.equal(initialAudit.study.id, raw.study.id);
  assert.equal(raw.tapeTradesScope, "all-built-configs", "Missing never-selected histories cannot be counted");
  const t0 = raw.window.startT, end = raw.window.endT, from = raw.study.window.evaluationFromT;
  assert.ok(end - from <= 48 * 3_600_000 && from < t0 && t0 < end, "Study scope must stay bounded");
  const first = new Set(raw.engine.realFirstStep.ids), symbols = [...new Set(raw.symbols)];
  assert.equal(first.size, raw.engine.realFirstStep.engineConfigs);
  assert.equal(first.size, book.evalStats.passed);
  assert.equal(initialAudit.initialSelection.passing, first.size);
  assert.equal(symbols.length, 8);
  const ordersByContext = new Map();
  const ordersByCfg = new Map(), orderEvidence = new Map();
  for (const t of trades) {
    assert.ok(Number.isFinite(modeledUnitReturn(t)));
    assert.ok(t.entryT >= t0 && t.entryT < end && t.exitT <= end && t.exitT >= t.entryT);
    const key = identity(t.cfg, t.sym, t.side), xs = ordersByContext.get(key) ?? [];
    xs.push(t); ordersByContext.set(key, xs);
    const own = ordersByCfg.get(t.cfg) ?? []; own.push(t); ordersByCfg.set(t.cfg, own);
  }
  const openBook = await readSessionDump(reportFile, { fields: ["sizedOpenOrders"] });
  const positions = raw.openEnd ?? [], allocations = openBook.sizedOpenOrders;
  assert.equal(allocations.length, positions.length, "Held allocations must be individually known");
  const allocatedOpen = [], seenOpen = new Set();
  for (const a of allocations) {
    assert.ok(Number.isInteger(a.openIndex) && !seenOpen.has(a.openIndex)); seenOpen.add(a.openIndex);
    const op = positions[a.openIndex]; assert.ok(op);
    for (const k of ["cfg", "sym", "side", "entryT"]) assert.equal(a[k], op[k]);
    assert.ok(Number.isFinite(a.allocatedNotional) && a.allocatedNotional >= 0);
    if (a.allocatedNotional > BOOK_NOTIONAL_EPS_USD) allocatedOpen.push(op);
  }
  assert.equal(allocatedOpen.length, book.total.fundedCounts.openOrders);
  const contexts = [], found = new Set(), fundedFound = new Set();
  for await (const source of iterateSessionTapeTrades(rawFile)) {
    const initial = first.has(source.id), ownTrades = ordersByCfg.get(source.id) ?? [];
    if (!initial && !ownTrades.length) continue;
    if (initial) { assert.ok(!found.has(source.id), "Duplicate config source"); found.add(source.id); }
    if (ownTrades.length) { assert.ok(!fundedFound.has(source.id)); fundedFound.add(source.id); }
    const parsed = parseConfigId(source.id); assert.ok(parsed);
    const group = new Map();
    for (const sym of symbols) for (const side of [1, -1]) group.set(identity(source.id, sym, side), []);
    let previousExit = -Infinity;
    for (const [sym, side, , exitT, r] of source.trades) {
      assert.ok(Number.isFinite(exitT) && exitT >= previousExit, "Source closes must be chronologically ordered");
      previousExit = exitT;
      if (!(exitT >= Math.max(from, source.fromT ?? from) && exitT <= end)) continue;
      const k = identity(source.id, sym, side); assert.ok(group.has(k), "Source contains an unknown context");
      group.get(k).push([exitT, r]);
    }
    const tag = source.protect.tag ?? "wide", floor = minPfOf(raw.settings.effectiveWf.gates, source.protect.tag, parsed.ind);
    if (initial) for (const sym of symbols) for (const side of [1, -1]) {
      const rs = group.get(identity(source.id, sym, side));
      const prior = rs.filter(row => row[0] < t0);
      const windows = Object.fromEntries(WINDOWS.map(n => [n, causalWindow(rs, t0, n, floor)]));
      contexts.push({ cfg: source.id, sym, side, kind: source.kind, range: tag, lane: parsed.ind.split("@").at(-1),
        floor, prehistoryCloses: prior.length, windows,
        later: aggregate(ordersByContext.get(identity(source.id, sym, side)) ?? []) });
    }
    for (const t of ownTrades) {
      const k = JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT]);
      assert.ok(!orderEvidence.has(k), "Duplicate funded execution identity");
      const rs = group.get(identity(t.cfg, t.sym, t.side)); assert.ok(rs);
      orderEvidence.set(k, { range: tag, lane: parsed.ind.split("@").at(-1), floor,
        windows: Object.fromEntries(WINDOWS.map(n => [n, causalWindow(rs, t.entryT, n, floor)])) });
    }
  }
  assert.equal(found.size, first.size, "An initially selected configuration has no source tape");
  assert.equal(fundedFound.size, ordersByCfg.size, "A funded configuration has no source tape");
  assert.equal(orderEvidence.size, trades.length);
  assert.equal(contexts.length, first.size * symbols.length * 2);
  const byWindow = {}, byTypeRange = {};
  for (const n of WINDOWS) {
    const total = blank(), groups = new Map();
    for (const c of contexts) {
      const k = `${c.kind}|${c.range}|${c.side > 0 ? "long" : "short"}`;
      const g = groups.get(k) ?? blank(); groups.set(k, g);
      addWindow(total, c, n, ordersByContext); addWindow(g, c, n, ordersByContext);
    }
    const selected = new Set(contexts.filter(c => c.windows[n].state === "qualified").map(c => identity(c.cfg, c.sym, c.side)));
    const closed = trades.filter(t => selected.has(identity(t.cfg, t.sym, t.side)));
    const held = allocatedOpen.filter(t => selected.has(identity(t.cfg, t.sym, t.side)));
    const out = finish(total);
    assert.equal(out.laterExistingFunded.n, closed.length);
    byWindow[n] = { ...out, counts: positionOrderCounts(closed, held) };
    byTypeRange[n] = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([group, value]) => ({ group, ...finish(value) }));
  }
  const rolling = Object.fromEntries(WINDOWS.map(n => [n, { evaluated: 0, qualified: 0, failed: 0,
    insufficient: 0, flat: 0, unknown: 0, qualifiedReturns: [] }]));
  const reportOrders = trades.map(t => {
    const proof = orderEvidence.get(JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT])); assert.ok(proof);
    for (const n of WINDOWS) { const s = rolling[n], w = proof.windows[n]; s.evaluated++; s[w.state]++;
      if (w.state === "qualified") s.qualifiedReturns.push(t); }
    return { cfg: t.cfg, sym: t.sym, side: t.side, kind: t.kind, range: proof.range, lane: proof.lane, floor: proof.floor,
      entryT: t.entryT, exitT: t.exitT, reason: t.reason, unitReturn: modeledUnitReturn(t),
      initialConfigSelected: first.has(t.cfg), windows: proof.windows };
  });
  const rollingSummary = Object.fromEntries(WINDOWS.map(n => { const { qualifiedReturns, ...s } = rolling[n];
    assert.equal(s.evaluated, trades.length); return [n, { ...s, qualifiedPct: s.evaluated ? 100 * s.qualified / s.evaluated : null,
      laterExistingFunded: aggregate(qualifiedReturns) }]; }));
  return { schema: "cts-independent-lastn-diagnostic-v1", scope: "Observed 405 initially selected engine configs × eight symbols × both directions. Exact context windows are diagnostic calculations on original source closes; they are not new production sets, live gates, resimulated orders, or venue fills.",
    study: { id: raw.study.id, window: raw.window, evaluationFrom: from, cost: raw.settings.effective.cost,
      sourceSha256: raw.study.sourceSha256, feedSha256: raw.study.feedSha256, rawSha256: createHash("sha256").update(readFileSync(rawFile)).digest("hex"), symbols },
    original: { basePassed: raw.engine.basePassed, baseEvaluated: raw.engine.baseEvaluated,
      initialValidated: first.size, evaluated: book.evalStats.evaluated,
      validationPct: 100 * first.size / book.evalStats.evaluated,
      finiteHistoricalMeanPf: initialAudit.initialSelection.finiteMeanPf,
      finiteSets: initialAudit.initialSelection.finiteSets, noLossSets: initialAudit.initialSelection.noLossSets,
      execution: aggregate(trades), counts: book.total.fundedCounts, funding, parity: { matched: parity.matched, missing: parity.missingCount, mismatched: parity.mismatchCount } },
    windows: WINDOWS, byWindow, byTypeRange, rolling: rollingSummary, contexts, orders: reportOrders,
    limits: "The fixed original funded orders are filtered by pre-run diagnostics without rerunning decisions, account funding or position occupancy. Real/Active derived-set execution is unavailable because the production adapter is unfinished. Historical windows overlap and are not execution PF. DCA/Axis retain intrinsic ladder returns. The 0.15% recorded cost is already included once." };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [raw, report, out] = process.argv.slice(2);
  if (!raw || !report || !out) throw new Error("Usage: audit-independent-lastn RAW_JSON REPORT_JSON OUT_JSON");
  const result = await auditIndependentLastN(raw, report);
  writeFileSync(out, JSON.stringify(result));
  console.log(JSON.stringify({ contexts: result.contexts.length, baseline: result.original,
    windows: result.byWindow, output: out }));
}
