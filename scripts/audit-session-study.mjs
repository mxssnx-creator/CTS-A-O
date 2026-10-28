#!/usr/bin/env node
// Independent, read-only reconciliation of frozen session raw dumps and their allocation report.
import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readSessionDump, writeJsonFile } from './lib/session-dump.mjs';

const H = 3_600_000;
const EPS_USD = 1e-9;
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const hash = (x) => createHash('sha256').update(x).digest('hex');
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical(x[k])])) : x;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const indOf = (x) => x.cfg.split('|')[1] ?? '';
const cohortOf = (x) => indOf(x).includes('sig-') ? 'Signals' : 'Engine';
const rangeOf = (x) => cohortOf(x) === 'Signals' ? 'Signals' : ({ mc: 'Micro', mn: 'Minimal', mp: 'Minimal plus', sh: 'Short', gn: 'General', lg: 'Long' }[/\|(mc|mn|mp|sh|gn|lg)(?:\||$)/.exec(x.cfg)?.[1]] ?? 'Wide');
const sideOf = (x) => x.side === 1 ? 'Long' : x.side === -1 ? 'Short' : 'Unknown';
const identity = (x) => JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT]);
const iso = (t) => new Date(t).toISOString();

function summarize(rows, gateScore = 4) {
  let gp = 0, gl = 0, cashGp = 0, cashGl = 0, unknownReturns = 0, unknownCash = 0;
  for (const x of rows) {
    if (!finite(x.unitR)) unknownReturns++;
    else if (x.unitR > 0) gp += x.unitR; else gl -= x.unitR;
    if (!finite(x.sizedPnl)) unknownCash++;
    else if (x.sizedPnl > 0) cashGp += x.sizedPnl; else cashGl -= x.sizedPnl;
  }
  const available = !unknownReturns && finite(gp + gl);
  const noLoss = available && gp > 0 && gl === 0;
  const state = !rows.length ? 'empty' : !available ? 'unknown' : noLoss ? 'no-loss' : gp + gl === 0 ? 'flat' : 'measured';
  return { closes: rows.length, symbols: new Set(rows.map((x) => x.sym)).size,
    configs: new Set(rows.map((x) => x.cfg)).size, unknownReturns, unknownCash, state,
    unitGp: available ? gp : null, unitGl: available ? gl : null, unitNet: available ? gp - gl : null,
    exactPf: state === 'measured' ? gp / gl : state === 'flat' ? 0 : null,
    noLoss, noLossGateScore: noLoss ? gateScore : null,
    sizedNetUsd: unknownCash ? null : cashGp - cashGl,
    sizedPfDiagnostic: !rows.length || unknownCash || !cashGl ? null : cashGp / cashGl,
    sizedNoLoss: !!rows.length && !unknownCash && cashGp > 0 && cashGl === 0 };
}
function partition(rows, key, gateScore) {
  const groups = new Map();
  for (const x of rows) { const k = key(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, xs]) => ({ key, ...summarize(xs, gateScore) }));
}
function modeledUnit(x) {
  if (x.unitR !== undefined) return finite(x.unitR) ? x.unitR : null;
  return finite(x.r) && finite(x.mult) && x.mult > 0 ? x.r / x.mult : null;
}

export function auditSessionStudy(raw, data, { purpose = 'development', protocol = null, protocolSha256 = null } = {}) {
  if (raw.arraySidecars?.trades || data.arraySidecars?.sizedOrders)
    throw new Error('Load execution and allocation sidecars before auditing; unloaded arrays are not empty results');
  if (!['development', 'selection', 'final'].includes(purpose)) throw new Error('Purpose must be development, selection or final');
  const startT = raw.window?.startT, endT = raw.window?.endT;
  if (!finite(startT) || !finite(endT) || endT <= startT) throw new Error('Missing raw execution window');
  if (!same(raw.symbols, data.symbols) || data.window?.startT !== startT || data.window?.endT !== endT)
    throw new Error('Raw and allocation report have different symbol/time scope');
  const checks = [];
  const check = (name, ok, actual = null, expected = null) => checks.push({ name, ok, actual, expected });
  const gateScore = raw.qualification?.noLossGateScore ?? data.evidence?.qualification?.noLossGateScore ?? 4;
  const allocations = data.sizedOrders;
  const funded = [], excluded = { zeroAllocations: 0, unknownAllocations: 0, dustAllocations: 0 };
  let unitMismatches = 0, cashMismatches = 0, reportedReasonRows = 0, reasonMismatches = 0,
    reportedKindRows = 0, kindMismatches = 0;
  if (Array.isArray(allocations)) {
    check('all virtual closes retain exact allocation rows', allocations.length === (raw.trades?.length ?? 0), allocations.length, raw.trades?.length ?? 0);
    const indices = new Set();
    for (const a of allocations) {
      const tr = raw.trades?.[a.closeIndex];
      if (!tr || !Number.isInteger(a.closeIndex) || indices.has(a.closeIndex) || identity(tr) !== identity(a))
        throw new Error('Allocation closeIndex/identity is missing, duplicated or mismatched');
      indices.add(a.closeIndex);
      if (a.reason !== undefined) { reportedReasonRows++; if (a.reason !== tr.reason) reasonMismatches++; }
      if (a.kind !== undefined) { reportedKindRows++; if (a.kind !== tr.kind) kindMismatches++; }
      if (!finite(a.allocatedNotional)) { excluded.unknownAllocations++; continue; }
      if (a.allocatedNotional === 0) { excluded.zeroAllocations++; continue; }
      if (a.allocatedNotional <= EPS_USD) { excluded.dustAllocations++; continue; }
      if (tr.entryT < startT || tr.entryT >= endT || tr.exitT < tr.entryT || tr.exitT > endT || !raw.symbols.includes(tr.sym))
        throw new Error('Funded settled row lies outside the execution sample');
      const unitR = modeledUnit(tr);
      if (!((unitR === null && a.unitR === null) || (finite(unitR) && finite(a.unitR) && Math.abs(unitR - a.unitR) <= 1e-12))) unitMismatches++;
      const sizedPnl = finite(a.unitNotional) && finite(tr.r) ? tr.r * a.unitNotional : null;
      if (!(finite(sizedPnl) && finite(a.sizedPnl) && Math.abs(sizedPnl - a.sizedPnl) <= 1e-12)) cashMismatches++;
      funded.push({ ...tr, unitR, sizedPnl, allocatedNotional: a.allocatedNotional });
    }
  } else check('exact allocation rows recorded (--signal-progress)', false);
  check('all unit returns agree with exact allocation rows', unitMismatches === 0, unitMismatches, 0);
  check('cash is weighted exactly once on every funded close', cashMismatches === 0, cashMismatches, 0);
  check('reported close reasons match the raw tape when present',
    (reportedReasonRows === 0 || (reportedReasonRows === allocations.length && reasonMismatches === 0)),
    { reportedRows: reportedReasonRows, totalRows: allocations?.length ?? null, mismatches: reasonMismatches });
  check('reported strategy kinds match the raw tape when present',
    (reportedKindRows === 0 || (reportedKindRows === allocations.length && kindMismatches === 0)),
    { reportedRows: reportedKindRows, totalRows: allocations?.length ?? null, mismatches: kindMismatches });
  const fundingKnown = Array.isArray(allocations) && !excluded.unknownAllocations && !excluded.dustAllocations;
  const sampleSummary = (xs) => fundingKnown ? summarize(xs, gateScore) : { ...summarize(xs, gateScore), closes: null, state: 'unknown', exactPf: null, unitGp: null, unitGl: null, unitNet: null };
  const total = sampleSummary(funded);
  check('funded close count reconciles to report', Array.isArray(allocations) && total.closes === data.total?.fundedOrders, total.closes, data.total?.fundedOrders ?? null);
  check('no unknown/dust funding ownership', !excluded.unknownAllocations && !excluded.dustAllocations, excluded);
  check('all funded returns known', total.unknownReturns === 0, total.unknownReturns, 0);
  // The report deliberately stores null gross returns for an empty sample, not numeric zero. Accept only a
  // proven empty funded cohort; a missing or unknown return in a nonempty cohort must still fail reconciliation.
  const emptyGross = (reported, measured) => total.state === 'empty' && total.closes === 0 &&
    data.total?.fundedOrders === 0 && reported === null && measured === 0;
  check('gross unit gains reconcile to report', emptyGross(data.total?.gpR, total.unitGp) ||
    (finite(data.total?.gpR) && finite(total.unitGp) && Math.abs(total.unitGp - data.total.gpR) <= 2e-6), total.unitGp, data.total?.gpR ?? null);
  check('gross unit losses reconcile to report', emptyGross(data.total?.glR, total.unitGl) ||
    (finite(data.total?.glR) && finite(total.unitGl) && Math.abs(total.unitGl - data.total.glR) <= 2e-6), total.unitGl, data.total?.glR ?? null);
  check('cash net reconciles to report', finite(data.total?.net) && finite(total.sizedNetUsd) && Math.abs(total.sizedNetUsd - data.total.net) <= 2e-6, total.sizedNetUsd, data.total?.net ?? null);
  const engineRows = funded.filter((x) => cohortOf(x) === 'Engine');
  const basePairs = new Map((raw.basePairs ?? []).map((x) => [x.pair, x]));
  const baseProof = { tested: engineRows.length, passed: 0, failed: 0, missing: 0 };
  for (const x of engineRows) {
    const pair = x.cfg.split('|').slice(0, 2).join('|'), row = basePairs.get(pair);
    if (!row) baseProof.missing++; else if (!row.passed) baseProof.failed++; else baseProof.passed++;
  }
  check('funded engine orders belong to recorded Base-passed pairs', !baseProof.missing && !baseProof.failed, baseProof);
  const metadataMatches = !!raw.study && ['sourceSha256', 'feedSha256', 'protocolSha256'].every((k) => /^[a-f0-9]{64}$/.test(raw.study[k] ?? '')) && same(raw.study, data.study);
  check('raw/report frozen study provenance agrees', metadataMatches);
  if (protocol) {
    if (protocolSha256) check('protocol file checksum matches frozen study', raw.study?.protocolSha256 === protocolSha256);
    check('protocol identity and source match', metadataMatches && protocol.id === raw.study.id && protocol.feed?.sha256 === raw.study.feedSha256 && protocol.source?.sha256 === raw.study.sourceSha256);
    check('protocol exact symbols match', same([...(protocol.symbols ?? [])].sort(), [...raw.symbols].sort()));
    check('protocol execution window matches', protocol.window?.tradeStartT === startT && protocol.window?.endT === endT);
  }
  const hours = [];
  for (let t = startT; t < endT; t += H) {
    const to = Math.min(t + H, endT), xs = funded.filter((x) => x.exitT > t && x.exitT <= to);
    const account = data.hours?.find((x) => x.t === t) ?? null;
    hours.push({ t, from: iso(t), to: iso(to), fullHour: to - t === H,
      combined: sampleSummary(xs), engine: sampleSummary(xs.filter((x) => cohortOf(x) === 'Engine')),
      signals: sampleSummary(xs.filter((x) => cohortOf(x) === 'Signals')),
      account: account ? { balance: account.balance, equityEnd: account.equity, netUsd: account.net,
        equityDdPct: account.ddEndPct, equityDdtH: account.ddtNowH, marginMax: account.marginMax } : null });
  }
  // Close exactly at start belongs to no trading-hour cohort and is invalid for a new entry sample.
  check('hourly funded count reconciles', hours.reduce((n, x) => n + x.combined.closes, 0) === total.closes);
  const mem = raw.engine?.mem;
  const fullCoverage = !!raw.engine?.coverage && same([...(raw.engine?.universe ?? [])].sort(), [...raw.symbols].sort()) && !!mem && (mem.computeLevel ?? 0) === 0 && (mem.fallback ?? 0) === 0 && (mem.aborts ?? 0) === 0 && data.checksOk === true;
  const selectionComplete = purpose === 'selection' && raw.symbols.length === 22 && endT - startT === 24 * H && metadataMatches && fullCoverage && checks.every((x) => x.ok);
  const middle = startT + (endT - startT) / 2;
  const cellGroups = new Map();
  for (const x of funded) { const key = JSON.stringify([x.cfg, x.side]); if (!cellGroups.has(key)) cellGroups.set(key, []); cellGroups.get(key).push(x); }
  const cells = [...cellGroups].sort(([a], [b]) => a.localeCompare(b)).map(([key, xs]) => {
    const [cfg, side] = JSON.parse(key), row = { key, ...sampleSummary(xs) };
    const firstHalf = summarize(xs.filter((x) => x.exitT <= middle), gateScore), secondHalf = summarize(xs.filter((x) => x.exitT > middle), gateScore);
    // A conservative persistence diagnostic; it never changes the strategy or fits individual clock hours.
    const lossPersistsBothHalves = firstHalf.unitNet < 0 && secondHalf.unitNet < 0;
    const minimumEvidence = row.closes >= 50 && row.symbols >= 3 && row.state === 'measured';
    return { ...row, cfg, side, cohort: cohortOf(xs[0]), range: rangeOf(xs[0]), firstHalf, secondHalf,
      minimumEvidence, lossPersistsBothHalves,
      researchPruningCandidate: selectionComplete && minimumEvidence && row.exactPf < 1 && row.unitNet < 0 && lossPersistsBothHalves };
  });
  const runStart = raw.tapeAgg?.evalStats ?? {};
  return { schema: 'cts-session-study-audit-v1', generatedAt: new Date().toISOString(), purpose,
    provenance: { study: raw.study ?? null, provider: raw.settings?.marketDataDetails ?? null, sourceMode: raw.settings?.marketDataSource ?? null,
      actualExecution: false, scope: 'Funded settled engine orders after Base/config validation; exact-qualified Signals reported separately',
      selectionUsesFutureHours: false, missingAllocationRows: !Array.isArray(allocations) },
    window: { startT, endT, hours: (endT - startT) / H, symbols: raw.symbols },
    total, cohorts: ['Engine', 'Signals'].map((key) => ({ key, ...sampleSummary(funded.filter((x) => cohortOf(x) === key)) })),
    byType: (() => {
      const got = new Map(partition(funded, (x) => `${cohortOf(x)} · ${x.kind ?? 'unknown type'}`, gateScore).map((x) => [x.key, x]));
      for (const cohort of ['Engine', 'Signals']) for (const kind of ['normal', 'trailing', 'trailing-only', 'dca', 'dca-active', 'axis']) {
        const key = `${cohort} · ${kind}`; if (!got.has(key)) got.set(key, { key, ...sampleSummary([]) });
      }
      return [...got.values()];
    })(),
    byRange: (() => {
      const got = new Map(partition(funded, rangeOf, gateScore).map((x) => [x.key, x]));
      for (const key of ['Micro', 'Minimal', 'Minimal plus', 'Short', 'General', 'Long', 'Wide', 'Signals'])
        if (!got.has(key)) got.set(key, { key, ...sampleSummary([]) });
      return [...got.values()];
    })(), byDirection: ['Long', 'Short'].map((key) => ({ key, ...sampleSummary(funded.filter((x) => sideOf(x) === key)) })),
    hours, cells,
    eligibility: { base: { evaluated: raw.engine?.baseEvaluated ?? null, passed: raw.engine?.basePassed ?? null, byRange: raw.engine?.baseByRange ?? [], firstFailure: raw.engine?.baseWhy ?? [], fundedEngineMembership: baseProof },
      configuredInventory: { engineTapes: raw.engine?.coverage?.engineTapes ?? null, signalTapes: raw.engine?.coverage?.signalTapes ?? null, buildSets: raw.engine?.coverage?.sets ?? null },
      configRunStart: { t: startT, evaluated: runStart.evaluated ?? null, passed: runStart.passed ?? null, firstFailureByRange: raw.tapeAgg?.evalFails ?? {}, afterBase: raw.tapeAgg?.evalAfterBase ?? {} },
      gateProofLimitation: 'Arithmetic and Base pair membership independently checked. Later exact config verdicts are runtime-recorded scope; hourly aggregate flow is not reconstructed per-entry gate proof.',
      firstStepSelection: raw.engine?.realFirstStep ?? null, paperAfterCompute: raw.engine?.paperSelectionAfterCompute ?? null,
      hourlyFlow: raw.stepsByRange ?? [], flowDefinition: 'Engine validated=configs in that step; Signal validated=active exact units; candidates/taken are pre-funding modeled events, not settled fills',
      executionSkips: raw.engine?.skips ?? {}, skipsByRange: raw.engine?.skipsByRange ?? {} },
    account: { startingBalance: raw.settings?.book?.balance ?? null, sizing: raw.settings?.book?.sizing ?? null, leverage: raw.settings?.book?.leverage ?? null,
      closedNetUsd: data.total?.net ?? null, endingBalance: data.total?.balanceEnd ?? null, markedEndingEquity: data.total?.equityEnd ?? null,
      equityMaxDdUsd: data.total?.equityMaxDd ?? null, equityMaxDdPct: data.total?.equityMaxDdPct ?? null,
      greenHours: data.total?.greenHours ?? null, redHours: data.total?.redHours ?? null, flatHours: data.total?.flatHours ?? null,
      unknownAllocations: excluded.unknownAllocations, zeroAllocations: excluded.zeroAllocations, openAtEnd: raw.openEnd?.length ?? null },
    performance: { wallSeconds: raw.runSeconds ?? null, computeMs: raw.engine?.computeMs ?? null, peakRssMb: raw.engine?.rssMaxMb ?? null, mem: mem ?? null,
      phases: raw.engine?.phases ?? null, loop: raw.engine?.loop ?? null, stalls: raw.engine?.stalls ?? null, coverage: raw.engine?.coverage ?? null },
    pruning: { assessmentAllowed: selectionComplete, minimumCloses: 50, minimumSymbols: 3,
      rule: 'Only completed frozen 22-symbol/24h selection evidence; PF<1 and negative unit net with negative unit net in both chronological halves. Candidates are research proposals, never automatic changes. Empty/insufficient cells stay enabled. Untouched final comparison still required.',
      candidates: cells.filter((x) => x.researchPruningCandidate).map((x) => ({ cfg: x.cfg, side: x.side, closes: x.closes, symbols: x.symbols, exactPf: x.exactPf, unitNet: x.unitNet })) },
    checksOk: checks.every((x) => x.ok), checks };
}

const pfText = (x) => x.state === 'empty' ? 'empty' : x.state === 'unknown' ? 'unknown' : x.noLoss ? `no losses (gate score ${x.noLossGateScore}; exact ratio unavailable)` : x.exactPf?.toFixed(4) ?? 'unavailable';
const money = (x) => finite(x) ? x.toFixed(8) : 'unknown';
export function renderSessionStudyAudit(a) {
  const lines = ['# Frozen session reconciliation', '', `Study: ${a.provenance.study?.id ?? 'unsealed'} · ${a.purpose} · offline modeled execution only.`, '',
    `${a.window.symbols.length} symbols, ${iso(a.window.startT)} → ${iso(a.window.endT)} (${a.window.hours}h).`, '',
    `Reconciliation: ${a.checksOk ? 'PASS' : 'INCOMPLETE / FAILED'}; pruning assessment: ${a.pruning.assessmentAllowed ? 'eligible selection window' : 'not allowed'}.`, '',
    '| Cohort | Funded settled closes | Unit PF | Sized net $ |', '|---|---:|---|---:|'];
  for (const x of [{ key: 'Combined', ...a.total }, ...a.cohorts]) lines.push(`| ${x.key} | ${x.closes} | ${pfText(x)} | ${money(x.sizedNetUsd)} |`);
  for (const [name, rows] of [['Type', a.byType], ['Range', a.byRange], ['Direction', a.byDirection]]) {
    lines.push('', `## ${name}`, '', '| Group | Closes | Symbols | Unit PF | Sized net $ |', '|---|---:|---:|---|---:|');
    for (const x of rows) lines.push(`| ${x.key} | ${x.closes} | ${x.symbols} | ${pfText(x)} | ${money(x.sizedNetUsd)} |`);
  }
  lines.push('', '## Hourly funded execution (UTC)', '', '| Hour | Engine closes | Engine PF | Signal closes | Signal PF | Combined PF | Sized net $ |', '|---|---:|---|---:|---|---|---:|');
  for (const h of a.hours) lines.push(`| ${h.from.slice(0, 16).replace('T', ' ')} | ${h.engine.closes} | ${pfText(h.engine)} | ${h.signals.closes} | ${pfText(h.signals)} | ${pfText(h.combined)} | ${money(h.combined.sizedNetUsd)} |`);
  lines.push('', '## Qualification and account', '', `Base ${a.eligibility.base.passed ?? 'unknown'}/${a.eligibility.base.evaluated ?? 'unknown'} pairs; run-start configs ${a.eligibility.configRunStart.passed ?? 'unknown'}/${a.eligibility.configRunStart.evaluated ?? 'unknown'}.`, '',
    `Closed net $${money(a.account.closedNetUsd)}; ending balance $${money(a.account.endingBalance)}; marked ending equity $${money(a.account.markedEndingEquity)}; equity max drawdown ${finite(a.account.equityMaxDdPct) ? (100 * a.account.equityMaxDdPct).toFixed(4) + '%' : 'unknown'}.`, '',
    `Elapsed ${a.performance.wallSeconds ?? 'unknown'}s; compute ${a.performance.computeMs ?? 'unknown'}ms; peak RSS ${a.performance.peakRssMb ?? 'unknown'}MB.`, '',
    '## Pruning evidence', '', a.pruning.rule, '', `Research-only proposals: ${a.pruning.candidates.length}. Exact config/direction rows, sample denominators, chronological halves, every failure and performance telemetry are retained in the JSON. No config was disabled by this audit.`, '',
    '## Checks', '', '| Check | Result |', '|---|---|');
  for (const x of a.checks.filter((x) => !x.ok)) lines.push(`| ${x.name} | FAIL / unavailable |`);
  if (a.checksOk) lines.push(`| ${a.checks.length} reconciliation checks | PASS |`);
  return lines.join('\n') + '\n';
}

async function hashFile(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

/** Independently reconcile allocated closes without retaining unused config-history rows. */
export async function auditSessionStudyFiles(rawFile, dataFile, { purpose = 'development', protocolFile } = {}) {
  const raw = await readSessionDump(rawFile, { loadTapeTrades: false, loadValidation: false, verifyUnloaded: true });
  const data = await readSessionDump(dataFile, { verifyUnloaded: true });
  const protocolBytes = protocolFile ? await readFile(protocolFile) : null;
  const a = auditSessionStudy(raw, data, { purpose, protocol: protocolBytes ? JSON.parse(protocolBytes) : null,
    protocolSha256: protocolBytes ? hash(protocolBytes) : null });
  a.provenance.inputSha256 = { raw: await hashFile(rawFile), allocationReport: await hashFile(dataFile),
    protocol: protocolBytes ? hash(protocolBytes) : null };
  return a;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), arg = (key) => { const i = args.indexOf(`--${key}`); return i < 0 ? undefined : args[i + 1]; };
  if (!arg('raw') || !arg('data') || !arg('out')) throw new Error('Usage: node scripts/audit-session-study.mjs --raw raw.json --data html/data.json --out docs/simulations/audit-stem [--purpose development|selection|final] [--protocol protocol.json]');
  const audit = await auditSessionStudyFiles(arg('raw'), arg('data'), { purpose: arg('purpose') ?? 'development', protocolFile: arg('protocol') });
  mkdirSync(dirname(arg('out')), { recursive: true });
  await writeJsonFile(`${arg('out')}.json`, audit);
  writeFileSync(`${arg('out')}.md`, renderSessionStudyAudit(audit));
  process.stdout.write(JSON.stringify({ out: arg('out'), checksOk: audit.checksOk, closes: audit.total.closes, pf: audit.total.exactPf, hours: audit.hours.length, pruningAssessmentAllowed: audit.pruning.assessmentAllowed, candidates: audit.pruning.candidates.length }) + '\n');
  process.exitCode = audit.checksOk ? 0 : 1;
}
