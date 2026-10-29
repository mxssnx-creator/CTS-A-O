#!/usr/bin/env node
// Read-only audit. Preserve the actual funding cohort; never reclassify a losing admitted order.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { iterateSessionTapeTrades } from './lib/session-dump.mjs';
import { parseConfigId } from '../src/core/pipeline/pipeline.ts';
import { baseAllowsTape, configEval, configDirectionEval, configContextEval, makeTape } from '../src/core/sim/walkforward.ts';
import { modeledUnitReturn } from '../src/core/metrics/stats.ts';

const totals = () => ({ n: 0, gp: 0, gl: 0, unknown: 0 });
function add(s, r) { s.n++; if (!Number.isFinite(r)) s.unknown++; else { s.gp += Math.max(0, r); s.gl += Math.max(0, -r); } }
const finish = s => ({ ...s, pf: !s.unknown && s.n && s.gl ? s.gp / s.gl : null,
  noLoss: !s.unknown && s.n > 0 && s.gp > 0 && s.gl === 0 });
export function simpleCostCheck(t, cost, tolerance = 1e-6) {
  if (['axis', 'dca', 'dca-active'].includes(t.kind)) return { state: 'intrinsic-ladder', error: null };
  if (!['normal', 'trailing', 'trailing-only', 'exit'].includes(t.kind) ||
      !Number.isFinite(cost) || cost < 0 || !Number.isFinite(t.entry) || t.entry <= 0 ||
      !Number.isFinite(t.exit) || t.exit <= 0 || (t.side !== 1 && t.side !== -1))
    return { state: 'failed', error: null };
  const actual = modeledUnitReturn(t), expected = t.side * (t.exit - t.entry) / t.entry - cost;
  const error = Math.abs(actual - expected);
  return { state: Number.isFinite(error) && error <= tolerance ? 'matched' : 'failed', error, expected, actual };
}
export async function auditMainProcessing(rawFile, bookFile, protocolFile, outPrefix) {
  const p = JSON.parse(readFileSync(protocolFile, 'utf8'));
  const { raw, trades, book, funding } = await readFundedSession(rawFile, bookFile);
  const settings = raw.settings.effective, wf = structuredClone(raw.settings.effectiveWf);
  for (const k of ['basePassed', 'exitBasePassed', 'signalBasePassed', 'baseWideLadderPairs', 'paused', 'validated'])
    if (Array.isArray(wf[k])) wf[k] = new Set(wf[k]);
  assert.equal(raw.settings.effective.cost, p.actualSettings.cost);
  assert.equal(raw.window.startT, p.window.tradeStartT); assert.equal(raw.window.endT, p.window.endT);
  const byCfg = new Map(), configs = [], rows = [], issues = [];
  const byReason = new Map(), byKind = new Map(), byRange = new Map(), byHour = new Map();
  const index = (m, k) => { let v = m.get(k); if (!v) m.set(k, v = totals()); return v; };
  for (const t of trades) { let a = byCfg.get(t.cfg); if (!a) byCfg.set(t.cfg, a = []); a.push(t); }
  const firstIds = new Set(raw.engine.realFirstStep?.ids ?? []);
  const sourceSeen = new Set(); let sourceFrom = Infinity, lastSourceExit = -Infinity;
  let entryChecks = 0, ordinaryCostChecked = 0, maxCostError = 0, beforeGp = 0, beforeGl = 0;
  for await (const src of iterateSessionTapeTrades(rawFile)) {
    sourceFrom = Math.min(sourceFrom, src.fromT ?? Infinity);
    if (src.trades.length) lastSourceExit = Math.max(lastSourceExit, src.trades.at(-1)[3]);
    const xs = byCfg.get(src.id), initiallySelected = firstIds.has(src.id);
    assert.ok(!sourceSeen.has(src.id), 'Duplicate source config evidence'); sourceSeen.add(src.id);
    const cfg = parseConfigId(src.id); assert.ok(cfg, `Unknown config ${src.id}`);
    const tapeTrades = src.trades.map(([sym, side, entryT, exitT, r]) => ({ cfg: src.id, sym, side, entryT, exitT, r,
      entry: 1, exit: 1, reason: 'time', bars: 1, mfe: 0, mae: 0, mult: 1 }));
    const tp = makeTape(src.id, cfg.bot, cfg.ind, src.protect, src.kind, src.symbols, tapeTrades, [], []);
    tp.fromT = src.fromT; tp.heldOnly = src.heldOnly;
    const initial = configEval(tp, raw.window.startT, wf), subsequent = totals();
    for (const t of xs ?? []) {
      entryChecks++;
      const ev = configEval(tp, t.entryT, wf), direction = configDirectionEval(tp, t.entryT, wf, t.side),
        context = configContextEval(tp, t.entryT, wf, t.sym, t.side), base = baseAllowsTape(tp, wf);
      const cost = simpleCostCheck(t, settings.cost), r = modeledUnitReturn(t);
      if (cost.state !== 'intrinsic-ladder') { ordinaryCostChecked++; maxCostError = Math.max(maxCostError, cost.error ?? Infinity); }
      const failures = [];
      if (!base) failures.push('base'); if (!ev.ok) failures.push(`config:${ev.fail}`);
      if (!direction.ok) failures.push(`direction:${direction.fail}`); if (!context.ok) failures.push(`context:${context.fail}`);
      if (cost.state === 'failed') failures.push('cost');
      if (failures.length) issues.push({ cfg: t.cfg, sym: t.sym, side: t.side, entryT: t.entryT, failures });
      const gross = t.side * (t.exit - t.entry) / t.entry;
      // Gross price diagnostics exclude intrinsic ladder semantics; do not present this as total strategy PF.
      if (cost.state !== 'intrinsic-ladder') { beforeGp += Math.max(0, gross); beforeGl += Math.max(0, -gross); }
      add(subsequent, r); add(index(byReason, t.reason), r); add(index(byKind, t.kind), r);
      add(index(byRange, src.protect.tag ?? 'wide'), r); add(index(byHour, Math.floor((t.exitT - 1) / 3_600_000) * 3_600_000), r);
      rows.push({ cfg: t.cfg, symbol: t.sym, side: t.side, kind: t.kind, range: src.protect.tag ?? 'wide',
        entryT: t.entryT, exitT: t.exitT, holdMinutes: (t.exitT - t.entryT) / 60_000, reason: t.reason,
        unitReturn: Number.isFinite(r) ? r : null, externalMultiplier: t.mult ?? null,
        beforeEntryConfigN: ev.n, beforeEntryConfigPfScore: ev.pf, beforeEntryDirectionN: direction.n,
        beforeEntryDirectionPfScore: direction.pf, beforeEntryContextN: context.n, beforeEntryContextPfScore: context.pf,
        baseAllowed: base, configAllowed: ev.ok, directionAllowed: direction.ok, contextAllowed: context.ok,
        ordinaryCostCheck: cost.state, ordinaryCostError: cost.error, failures });
    }
    configs.push({ cfg: src.id, kind: src.kind, range: src.protect.tag ?? 'wide', initiallySelected,
      initialBaseAllowed: baseAllowsTape(tp, wf), sourceCloses: src.trades.length,
      initial: { ...initial, measuredPf: initial.gl > 0 ? initial.gp / initial.gl : null }, subsequent: finish(subsequent) });
  }
  const missing = [...new Set([...byCfg.keys(), ...firstIds])].filter(x => !sourceSeen.has(x));
  const first = configs.filter(x => x.initiallySelected), finite = first.filter(x => x.initial.ok && x.initial.gl > 0);
  const firstMean = finite.length ? finite.reduce((n, x) => n + x.initial.measuredPf, 0) / finite.length : null;
  const result = { schema: 'cts-main-processing-audit-v1', study: raw.study, funding, window: raw.window,
    sourceFrom, lastSourceExit, cost: settings.cost, entryChecks, missingSourceConfigs: missing, issues,
    ordinaryCostChecked, maxCostError, ordinaryGrossPricePf: beforeGl ? beforeGp / beforeGl : null,
    initialSelection: { sets: first.length, passing: first.filter(x => x.initial.ok).length,
      finiteSets: finite.length, noLossSets: first.filter(x => x.initial.ok && x.initial.gl === 0 && x.initial.gp > 0).length,
      finiteMeanPf: firstMean },
    sourceOwnConfigReadiness: { contextClosesBelow9: rows.filter(x => x.beforeEntryContextN < 9).length,
      minimumDirectionCloses: Math.min(...rows.map(x => x.beforeEntryDirectionN)), minimumContextCloses: Math.min(...rows.map(x => x.beforeEntryContextN)) },
    counts: book.total.fundedCounts, total: book.total,
    byReason: [...byReason].map(([key, s]) => ({ key, ...finish(s) })),
    byKind: [...byKind].map(([key, s]) => ({ key, ...finish(s) })),
    byRange: [...byRange].map(([key, s]) => ({ key, ...finish(s) })),
    byHour: [...byHour].sort((a,b)=>a[0]-b[0]).map(([key,s])=>({ t:key,...finish(s) })), configs,
    ok: missing.length === 0 && issues.length === 0 && entryChecks === trades.length,
    scope: 'Historical raw-tape admission and exact funded closed execution. This does not certify the pending persistent derived-set adapter, source price path intrabar ordering, or venue fills.' };
  if (outPrefix) {
    writeFileSync(`${outPrefix}.json`, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(`${outPrefix}-orders.jsonl`, rows.map(x=>JSON.stringify(x)).join('\n') + '\n');
  }
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await auditMainProcessing(...process.argv.slice(2));
  console.log(JSON.stringify({ok:result.ok,entryChecks:result.entryChecks,issues:result.issues.length,
    missing:result.missingSourceConfigs.length,ordinaryCostChecked:result.ordinaryCostChecked,maxCostError:result.maxCostError,
    initialSelection:result.initialSelection,readiness:result.sourceOwnConfigReadiness}));
  if (!result.ok) process.exitCode = 1;
}
