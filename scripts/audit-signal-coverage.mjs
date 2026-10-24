#!/usr/bin/env node
// Full-catalog, bounded-memory coverage audit. Empty contexts stay in every denominator.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { iterateSessionTapeTrades, readSessionDump } from "./lib/session-dump.mjs";
import { readSessionStudy, validateFrozenSessionResult } from "./lib/session-study.mjs";
import { signalConfigDetails, signalProgressInventory } from "./lib/signal-progress.mjs";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { auditSettledHours } from "./lib/postbase-hourly.mjs";
import { auditSimulationParity } from "./audit-simulation-parity.mjs";
import { makeTape, configEval, signalConfigEval, signalValidationOk } from "../src/core/sim/walkforward.ts";
import { signalActiveHas } from "../src/core/signals.ts";
import { parseConfigId, configId, kindOfId } from "../src/core/pipeline/pipeline.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./lib/book-notional.mjs";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { auditSignalDerivedCatalog } from "./audit-signal-derived-catalog.mjs";
import { positionOrderCounts, positionOrderLedger } from "../src/core/positions.ts";

const H = 3_600_000;
const near = (a, b, why) => assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)), why);
const pf = (gp, gl, n) => ({ pf: n && gl > 0 ? gp / gl : null, pfState: !n ? "empty" : gl > 0 ? "ratio" : gp > 0 ? "no-loss" : "flat" });
export function signalEntrySelection(tp, rows, steps, wf, startT, endT) {
  if (!steps?.length) return null;
  const result = { settledCandidates: 0, selected: 0, ownValidAtEntry: 0, selectedOwnValid: 0,
    unselectedOwnValid: 0, newlyValidWithinStep: 0, selectedFailures: {}, unselectedExamples: [] };
  for (const [sym, side, entryT, exitT] of rows) {
    if (entryT < startT || entryT >= endT || exitT > endT) continue;
    let lo = 0, hi = steps.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (steps[mid].t <= entryT) lo = mid + 1; else hi = mid; }
    assert.ok(lo, "Missing selection state at candidate entry");
    const step = steps[lo - 1], selected = signalActiveHas(step.keys, tp.bot, tp.ind, sym, side, tp.kind, tp.id);
    const ev = signalConfigEval(tp, entryT, wf, sym, side), valid = ev.ok && signalValidationOk(tp, entryT, wf, sym, side);
    result.settledCandidates++; result.selected += selected; result.ownValidAtEntry += valid;
    if (selected && valid) result.selectedOwnValid++;
    if (selected && !valid) { const why = ev.ok ? "entry-lastN" : ev.fail; result.selectedFailures[why] = (result.selectedFailures[why] ?? 0) + 1; }
    if (!selected && valid) {
      const newlyValid = !signalConfigEval(tp, step.t, wf, sym, side).ok;
      result.unselectedOwnValid++; result.newlyValidWithinStep += newlyValid;
      if (result.unselectedExamples.length < 3) result.unselectedExamples.push({ cfg: tp.id, sym, side, entryT, selectionT: step.t, newlyValid });
    }
  }
  return result;
}
export function scalarCoverage(rows, t, historyH, lastN) {
  const past = rows.filter(x => x[3] < t), window = past.filter(x => x[3] >= t - historyH * H);
  const recent = lastN > 0 ? past.slice(-lastN) : [];
  let gp = 0, gl = 0, sum = 0, peak = 0, mdd = 0, peakT = window[0]?.[2] ?? t, ddtH = 0, dipped = false;
  for (const x of window) {
    const r = x[4]; assert.ok(Number.isFinite(r), "Unknown historical return");
    if (r > 0) gp += r; else gl -= r;
    sum += r;
    if (sum < peak) { dipped = true; mdd = Math.max(mdd, peak - sum); }
    else { if (dipped) ddtH = Math.max(ddtH, (x[3] - peakT) / H); dipped = false; peak = sum; peakT = x[3]; }
  }
  if (dipped) ddtH = Math.max(ddtH, (t - peakT) / H);
  return { n: window.length, pastN: past.length, lastNReady: lastN <= 0 || recent.length >= lastN, recentN: recent.length,
    gp, gl, net: gp - gl, ...pf(gp, gl, window.length), ddtH, mdd };
}

export function coverageTape(row, symbols) {
  const cfg = parseConfigId(row.id);
  assert.ok(cfg && cfg.ind.startsWith("sig-"), "Signal catalog required");
  assert.ok(row.protect && row.kind && Object.hasOwn(row, "fromT") && typeof row.heldOnly === "boolean" && Array.isArray(row.symbols),
    "Missing exact tape metadata; legacy dumps cannot certify full gate coverage");
  assert.deepEqual([...row.symbols].sort(), [...symbols].sort(), "Tape universe differs");
  assert.equal(row.kind, kindOfId(row.id), "Tape type differs from its identity");
  assert.equal(configId(cfg.bot, cfg.ind, row.protect, row.kind), row.id, "Tape protection differs from its identity");
  const tp = makeTape(row.id, cfg.bot, cfg.ind, row.protect, row.kind, symbols,
    row.trades.map(([sym, side, entryT, exitT, r]) => ({ cfg: row.id, sym, side, entryT, exitT, r, unitR: r, mult: 1, entry: 1, exit: 1, bars: 1, reason: "time", mfe: 0, mae: 0 })), [], []);
  if (row.fromT !== null) { assert.ok(Number.isFinite(row.fromT)); tp.fromT = row.fromT; }
  tp.heldOnly = row.heldOnly;
  return tp;
}

function bucket(t) { return { t, contexts: 0, empty: 0, lastNReady: 0, warmupSampleReady: 0, minimumSampleReady: 0, passed: 0,
  configs: 0, configsLastNReady: 0, configsPassed: 0, historyCloses: 0, passedCloses: 0, passedGp: 0, passedGl: 0, maxPassedDdtH: 0, failures: {} }; }
function addContext(b, s, ev, minTrades, floor) {
  b.contexts++; b.empty += s.n === 0; b.lastNReady += s.lastNReady; b.warmupSampleReady += s.lastNReady || (floor > 0 && s.recentN >= floor);
  b.minimumSampleReady += s.n >= minTrades; b.historyCloses += s.n;
  if (ev.ok) { b.passed++; b.passedCloses += s.n; b.passedGp += s.gp; b.passedGl += s.gl; b.maxPassedDdtH = Math.max(b.maxPassedDdtH, s.ddtH); }
  else b.failures[ev.fail] = (b.failures[ev.fail] ?? 0) + 1;
}
const finish = b => ({ ...b, lastNReadyPct: b.contexts ? 100 * b.lastNReady / b.contexts : null,
  minimumSampleReadyPct: b.contexts ? 100 * b.minimumSampleReady / b.contexts : null,
  passedPct: b.contexts ? 100 * b.passed / b.contexts : null, qualifiedHistory: { n: b.passedCloses, gp: b.passedGp, gl: b.passedGl, ...pf(b.passedGp, b.passedGl, b.passedCloses) } });
function riskAdd(r, p, tf) {
  const add = (key, v) => { if (Number.isFinite(v)) { r[key] ??= { min: v, max: v }; r[key].min = Math.min(r[key].min, v); r[key].max = Math.max(r[key].max, v); } };
  add("holdHours", p.hold * (tf ?? 15) / 60);
  if (p.atr) { r.atrConfigs = (r.atrConfigs ?? 0) + 1; add("atrSlMultiple", p.atr.sl); add("atrTpToSl", p.atr.tpRatio); if (p.atr.trail) add("atrTrailMultiple", p.atr.trail); add("atrSlFloor", p.atr.minSl); add("atrTrailFloor", p.atr.minTrail); }
  else { add("slFraction", p.sl); if (p.tp > 0) { add("tpFraction", p.tp); add("slToTp", p.sl / p.tp); }
    if (p.trail > 0) { add("trailActivationFraction", p.trail); add("trailGapFraction", p.trail * (p.trailStep ?? 1)); add("trailGapToActivation", p.trailStep ?? 1); } }
  if (p.trailMax !== undefined) add("signalCeilingFraction", p.trailMax);
}

export async function auditSignalCoverage(dir, out = resolve(dir, "coverage")) {
  const started = performance.now(), { protocol, protocolSha256 } = readSessionStudy(resolve(dir, "protocol.json"));
  const rawPath = resolve(dir, "raw.json"), raw = await readSessionDump(rawPath, { fields: ["trades", "openEnd"] });
  validateFrozenSessionResult(raw, resolve(dir, "protocol.json"));
  assert.equal(raw.tapeTradesScope, "all-built-configs");
  const { symbols, actualWf: wf, actualSettings: settings } = protocol;
  const times = Array.from({ length: protocol.window.runH + 1 }, (_, i) => protocol.window.tradeStartT + i * H);
  const { configured, requestedConfigs, combos } = signalProgressInventory({ settings, wf });
  const requested = requestedConfigs.length, expected = new Set(configured.keys());
  requestedConfigs.length = 0; configured.clear();
  const groups = new Map(), hourly = times.map(bucket);
  const get = (dimension, label) => { const id = JSON.stringify([dimension, label]); if (!groups.has(id)) groups.set(id, { dimension, label, configs: 0, symbols: new Set(), sources: new Set(), start: bucket(times[0]), end: bucket(times.at(-1)), protection: {}, execution: { n: 0, gp: 0, gl: 0, configs: new Set(), open: 0 } }); return groups.get(id); };
  const identities = new Set(), sourceIds = new Set();
  const selectionSteps = raw.engine.signalSteps?.map(s => ({ t: s.t, keys: new Set(s.keys) }));
  const entries = { settledCandidates: 0, selected: 0, ownValidAtEntry: 0, selectedOwnValid: 0,
    unselectedOwnValid: 0, newlyValidWithinStep: 0, selectedFailures: {}, unselectedExamples: [] };
  const executions = new Map(), opens = new Map();
  const funded = await readFundedSession(rawPath), book = funded.book;
  assert.ok(book.checksOk, JSON.stringify(book.checks.filter(c => !c.ok)));
  for (const x of funded.trades) { if (!executions.has(x.cfg)) executions.set(x.cfg, []); executions.get(x.cfg).push(x); }
  const openBook = await readSessionDump(resolve(dir, "report/data.json"), { fields: ["sizedOpenOrders"] });
  assert.equal(openBook.sizedOpenOrders.length, raw.openEnd.length, "Missing open funding evidence");
  const openAllocations = new Map(openBook.sizedOpenOrders.map(x => [x.openIndex, x]));
  assert.equal(openAllocations.size, raw.openEnd.length, "Duplicate open allocation");
  for (const [i, x] of raw.openEnd.entries()) {
    const a = openAllocations.get(i); assert.ok(a && Number.isFinite(a.allocatedNotional) && a.allocatedNotional >= 0, "Unknown open allocation");
    for (const k of ["cfg", "sym", "side", "entryT"]) assert.equal(a[k], x[k], "Open allocation identity");
    if (a.allocatedNotional <= BOOK_NOTIONAL_EPS_USD) continue;
    if (!opens.has(x.cfg)) opens.set(x.cfg, []); opens.get(x.cfg).push(x);
  }
  mkdirSync(dirname(out), { recursive: true });
  const configFile = out + ".configs.jsonl", stream = createWriteStream(configFile);
  let tapes = 0, closes = 0, comparisons = 0, peakRssMb = 0, additions = 0;
  try {
    for await (const row of iterateSessionTapeTrades(rawPath)) {
      assert.ok(!identities.has(row.id), "Duplicate config tape"); identities.add(row.id);
      if (!expected.delete(row.id)) additions++;
      const tp = coverageTape(row, symbols), info = signalConfigDetails(tp.id, tp.protect, tp.kind); sourceIds.add(info.source);
      const own = new Map();
      for (const x of row.trades) { const key = JSON.stringify([x[0], x[1]]); if (!own.has(key)) own.set(key, []); own.get(key).push(x); }
      const baseGroups = [["type", info.kind], ["parameterRange", info.range], ["strategyRange", info.strategyRange], ["protectionRange", info.protectionRange],
        ["lane", String(info.lane)], ["source", info.source], ["typeRange", `${info.kind} / ${info.range} / ${info.protectionRange}`]].map(([d, l]) => get(d, l));
      const symbolGroups = new Map(symbols.map(sym => [sym, get("symbol", sym)]));
      for (const g of [...baseGroups, ...symbolGroups.values()]) { g.configs++; g.sources.add(info.source); riskAdd(g.protection, tp.protect, info.lane); }
      const configSnapshots = [];
      for (let ti = 0; ti < times.length; ti++) {
        const t = times[ti], ev = configEval(tp, t, wf), h = hourly[ti]; h.configs++;
        let ready = false, passed = false;
        const edge = ti === 0 ? "start" : ti === times.length - 1 ? "end" : null;
        const state = { t, contexts: 0, lastNReady: 0, minimumSampleReady: 0, passed: 0, n: 0, gp: 0, gl: 0, failures: {} };
        const bySymbol = new Map();
        for (const { sym, side, evaluation } of ev.contexts) {
          const targetN = wf.rangeOpts?.sig?.validLastN ?? wf.signalValidLastN ?? wf.validLastN ?? 0;
          const minTrades = Math.max(3, tp.kind === "exit" ? wf.exitMinTrades ?? wf.gates.minTrades ?? 0 : wf.gates.minTrades ?? 0);
          const s = scalarCoverage(own.get(JSON.stringify([sym, side])) ?? [], t, wf.signalLongH, targetN);
          assert.equal(evaluation.n, s.n, `Own window count ${row.id} ${sym} ${side} ${t}`);
          near(evaluation.gp, s.gp * 100, "Own gross gain"); near(evaluation.gl, s.gl * 100, "Own gross loss"); near(evaluation.net, s.net * 100, "Own net");
          near(evaluation.pf, s.gl > 0 ? s.gp / s.gl : s.gp > 0 ? 4 : 0, "Own PF");
          if (evaluation.ok) near(evaluation.ddt, s.ddtH, "Qualified own DDT");
          comparisons++; ready ||= s.lastNReady; passed ||= evaluation.ok;
          addContext(h, s, evaluation, minTrades, wf.gates.lastNFloor ?? 0);
          if (edge) {
            for (const g of [...baseGroups, symbolGroups.get(sym)]) { addContext(g[edge], s, evaluation, minTrades, wf.gates.lastNFloor ?? 0); g.symbols.add(sym); }
            const flags = bySymbol.get(sym) ?? { ready: false, passed: false }; flags.ready ||= s.lastNReady; flags.passed ||= evaluation.ok; bySymbol.set(sym, flags);
            state.contexts++; state.lastNReady += s.lastNReady; state.minimumSampleReady += s.n >= minTrades; state.passed += evaluation.ok;
            if (evaluation.ok) { state.n += s.n; state.gp += s.gp; state.gl += s.gl; } else state.failures[evaluation.fail] = (state.failures[evaluation.fail] ?? 0) + 1;
          }
        }
        h.configsLastNReady += ready; h.configsPassed += passed;
        if (edge) {
          for (const g of baseGroups) { g[edge].configs++; g[edge].configsLastNReady += ready; g[edge].configsPassed += passed; }
          for (const [sym, flags] of bySymbol) { const b = symbolGroups.get(sym)[edge]; b.configs++; b.configsLastNReady += flags.ready; b.configsPassed += flags.passed; }
          configSnapshots.push({ ...state, qualifiedHistory: { n: state.n, gp: state.gp, gl: state.gl, ...pf(state.gp, state.gl, state.n) } });
        }
      }
      for (const x of executions.get(row.id) ?? []) {
        const r = modeledUnitReturn(x); assert.ok(Number.isFinite(r));
        for (const g of [...baseGroups, symbolGroups.get(x.sym)]) { g.execution.n++; g.execution.configs.add(row.id); if (r > 0) g.execution.gp += r; else g.execution.gl -= r; }
      }
      for (const x of opens.get(row.id) ?? []) for (const g of [...baseGroups, symbolGroups.get(x.sym)]) g.execution.open++;
      const entrySelection = signalEntrySelection(tp, row.trades, selectionSteps, wf, times[0], times.at(-1));
      if (entrySelection) {
        for (const k of ["settledCandidates", "selected", "ownValidAtEntry", "selectedOwnValid", "unselectedOwnValid", "newlyValidWithinStep"]) entries[k] += entrySelection[k];
        for (const [k, n] of Object.entries(entrySelection.selectedFailures)) entries.selectedFailures[k] = (entries.selectedFailures[k] ?? 0) + n;
        if (entries.unselectedExamples.length < 30) entries.unselectedExamples.push(...entrySelection.unselectedExamples.slice(0, 30 - entries.unselectedExamples.length));
      }
      const line = JSON.stringify({ ...info, snapshots: configSnapshots, entrySelection, executed: executions.get(row.id)?.length ?? 0, open: opens.get(row.id)?.length ?? 0 }) + "\n";
      if (!stream.write(line)) await once(stream, "drain");
      tapes++; closes += row.trades.length;
      if (tapes % 5000 === 0) { peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1e6); console.log(JSON.stringify({ tapes, comparisons, elapsedS: (performance.now() - started) / 1000, peakRssMb })); }
    }
  } finally { stream.end(); await once(stream, "finish"); }
  assert.equal(tapes, raw.engine.tapes); assert.equal(tapes, raw.tapeTradesSidecar.tapes);
  assert.equal(closes, raw.tapeTradesSidecar.rows);
  for (const h of hourly) { assert.equal(h.contexts, tapes * symbols.length * 2); assert.equal(h.passed + Object.values(h.failures).reduce((a,b)=>a+b,0), h.contexts); }
  for (const id of executions.keys()) assert.ok(identities.has(id), "Executed config missing its tape");
  const parity = await auditSimulationParity(rawPath, resolve(dir, "report/data.json")); assert.ok(parity.ok);
  const session = JSON.parse(readFileSync(resolve(dir, "session.json"), "utf8"));
  const settled = auditSettledHours(funded.trades, raw.window.startT, raw.window.endT,
    session.hours.map(h => ({ t: h.t, n: h.orders, pf: h.pf, net: h.orders ? 100 * (h.gpR - h.glR) : 0 })));
  const fundedOpen = [...opens.values()].flat();
  for (const id of opens.keys()) assert.ok(identities.has(id), "Open config missing its tape");
  const orderIds = new Set();
  for (const x of [...funded.trades, ...fundedOpen]) {
    const key = JSON.stringify([x.cfg, x.sym, x.side, x.entryT]);
    assert.ok(!orderIds.has(key), `Duplicate modeled parent or both open and closed: ${key}`);orderIds.add(key);
  }
  const counts = positionOrderCounts(funded.trades, fundedOpen);
  assert.equal(counts.openedOrders, counts.settledOrders + counts.openOrders);
  assert.equal(counts.openedPositions, counts.closedPositions + counts.openPositions);
  assert.deepEqual(counts, Object.fromEntries(Object.keys(counts).map(k => [k, book.total.fundedCounts[k]])), "Report/funded ledger counts");
  const ledger = { counts, hourly: positionOrderLedger(funded.trades, fundedOpen, times[0], times.at(-1), H),
    orphanedOrders: 0, duplicateParents: 0, scope: "Funded modeled parent orders; actual venue partial fills are verified separately in native control fixtures." };
  for (let i = 0; i < ledger.hourly.length; i++) assert.deepEqual(ledger.hourly[i], session.hours[i].fundedCounts, "Hourly report/funded ledger");
  const belongs = (x, g) => {
    if (g.dimension === "symbol") return x.sym === g.label;
    const c = parseConfigId(x.cfg), info = signalConfigDetails(x.cfg, c.protect, kindOfId(x.cfg));
    const labels = { type: info.kind, parameterRange: info.range, strategyRange: info.strategyRange,
      protectionRange: info.protectionRange, lane: String(info.lane), source: info.source,
      typeRange: `${info.kind} / ${info.range} / ${info.protectionRange}` };
    return labels[g.dimension] === g.label;
  };
  const finalized = [...groups.values()].map(g => ({ ...g, symbols: g.symbols.size, sources: g.sources.size, start: finish(g.start), end: finish(g.end),
    execution: { ...g.execution, configs: g.execution.configs.size, ...pf(g.execution.gp, g.execution.gl, g.execution.n),
      counts: positionOrderCounts(funded.trades.filter(x => belongs(x,g)), fundedOpen.filter(x => belongs(x,g))) } }));
  for (const dimension of ["type", "parameterRange", "strategyRange", "protectionRange", "lane", "source", "symbol", "typeRange"]) {
    const gs = finalized.filter(g => g.dimension === dimension);
    assert.equal(gs.reduce((n,g)=>n+g.execution.n,0), funded.trades.length, `Funded membership ${dimension}`);
    assert.equal(gs.reduce((n,g)=>n+g.start.contexts,0), hourly[0].contexts, `Coverage denominator ${dimension}`);
  }
  const builtExit = finalized.find(g => g.dimension === "type" && g.label === "exit")?.configs ?? 0;
  const expectedExit = raw.engine.independentExit?.configs ?? 0;
  const complete = expected.size === 0 && builtExit === expectedExit;
  const result = { schema: "cts-signal-coverage-v1", ok: complete, protocolSha256, sourceSha256: protocol.source.sha256, window: protocol.window, symbols,
    policy: { historyH: wf.signalLongH, validLastN: wf.rangeOpts?.sig?.validLastN ?? wf.signalValidLastN, fullWindowMinTrades: wf.gates.minTrades,
      exitMinTrades: wf.exitMinTrades, lastNFloor: wf.gates.lastNFloor, toggles: settings.toggles, signalSettings: settings.signals, gates: wf.gates, exitSettings: settings.exitStrategy },
    catalog: { sources: sourceIds.size, sourceLanes: combos.length, requestedCells: requested, expectedEffectiveConfiguredCells: tapes - additions + expected.size,
      builtConfigs: tapes, fittedOrRetainedConfigs: additions, missingConfiguredCells: expected.size, missingExamples: [...expected].slice(0,50), expectedExit, builtExit, closes },
    definitions: { context: "One exact config × symbol × direction; zero-trade contexts remain in the denominator.",
      lastNReady: "At least the full configured Last-N closes strictly before each clock. The separate full-window minTrades and all PF/DDT/DDR/stability gates still apply.",
      qualifiedHistory: "Only exact contexts passing all config gates at this clock. Overlapping configurations are not independent market observations; this PF is not later execution PF.",
      execution: "Funded settled modeled closes after all execution gates, verified against exact source tapes; endpoint marks excluded.",
      protection: "Effective percent protections after lane scaling/floors/caps. ATR multiples and floors are separate from resolved per-entry prices.",
      ddt: "Context history DDT uses unit-return running peaks; account equity DDT includes minute open-position marks and is separately reported." },
    hourly: hourly.map(finish), groups: finalized, funding: funded.funding, settled, ledger, account: book.total,
    entrySelection: selectionSteps?.length ? { ...entries, scope: "Settled tape candidates only; own config validation is not complete admission. Ranking, shared guards, funding and endpoint-open candidates are separate." } : null,
    exactTape: { ok: parity.ok, matched: parity.matched, missing: parity.missingCount, mismatched: parity.mismatchCount },
    reportChecks: book.checks, engine: { computeMs: raw.engine.computeMs, rssMaxMb: raw.engine.rssMaxMb, mem: raw.engine.mem, phases: raw.engine.phases,
      baseByRange: raw.engine.baseByRange, signals: raw.engine.signals, independentExit: raw.engine.independentExit, skips: raw.engine.skips, skipsByRange: raw.engine.skipsByRange, signalFunnel: raw.engine.signalFunnel },
    audit: { comparisons, elapsedMs: performance.now() - started, peakRssMb }, configFile };
  writeFileSync(out + ".json", JSON.stringify(result,null,2) + "\n");
  assert.ok(complete, `Incomplete primary/Exit catalog: ${JSON.stringify(result.catalog)}`);
  if (out === resolve(dir, "coverage")) await auditSignalDerivedCatalog(dir);
  console.log(JSON.stringify({ ok: true, catalog: result.catalog, start: result.hourly[0], end: result.hourly.at(-1), funding: result.funding, audit: result.audit }));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], "audit-signal-coverage.mjs REPLAY_DIRECTORY [OUTPUT_PREFIX]");
  await auditSignalCoverage(resolve(process.argv[2]), process.argv[3] && resolve(process.argv[3]));
}
