#!/usr/bin/env node
// Read-only reporting of the already-frozen study; never runs strategies, acquires candles or changes gates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { studyJson, studySha256 } from "./lib/range-study.mjs";
import { studyConfigDetails } from "./lib/range-study-evidence.mjs";
import { readSessionDump } from "./lib/session-dump.mjs";
import { verifyStudySource } from "./core-range-study.mjs";
import { readStored } from "./lib/session-feed.mjs";
import { CandleSeries } from "../src/core/market/candle-series.ts";
import { laneSeriesOf } from "../src/core/server/runtime.server.ts";
import { headBars } from "../src/core/market/bars.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { addReturnEvidence, finishReturnEvidence, returnBucket } from "./lib/return-evidence.mjs";
const H = 3_600_000, read = (f) => JSON.parse(fs.readFileSync(f)), sha = (f) => studySha256(fs.readFileSync(f));
const iso = (t) => t === null ? null : new Date(t).toISOString();
const write = (f, x) => fs.writeFileSync(f, studyJson(x));
function csv(f, rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const cell = (v) => v == null ? "" : typeof v === "object" ? '"' + JSON.stringify(v).replaceAll('"', '""') + '"' : typeof v === "string" ? '"' + v.replaceAll('"', '""') + '"' : String(v);
  fs.writeFileSync(f, keys.join(",") + "\n" + rows.map((r) => keys.map((k) => cell(r[k])).join(",")).join("\n") + "\n");
}
export function parseEvidenceCsv(text) {
  const records = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); if (row.some((x) => x !== "")) records.push(row); row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(field); if (row.some((x) => x !== "")) records.push(row);
  if (!records.length) return [];
  const header = records.shift(); if (new Set(header).size !== header.length) throw new Error("Duplicate CSV header");
  return records.map((x) => { if (x.length !== header.length) throw new Error("CSV row width differs"); return Object.fromEntries(header.map((k, i) => [k, x[i]])); });
}
const csvNumber = (value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : NaN;
export function portfolioEvidence(rows, scope, endpointRows = []) {
  const b = returnBucket(), onsets = new Set(), open = new Set(endpointRows.map((x) => `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`));
  let cashGp = 0, cashGl = 0;
  for (const x of rows) {
    if (scope === "funded" && x.allocation === "zero") throw new Error("Known zero allocation must not be in the funded evidence export");
    const r = scope === "funded" && x.allocation !== "positive" ? NaN : csvNumber(x.unitR), cash = csvNumber(x.sizedPnl);
    addReturnEvidence(b, r, cash); if (Number.isFinite(cash)) { cashGp += Math.max(0, cash); cashGl += Math.max(0, -cash); }
    const key = `${x.id}|${x.sym}|${Number(x.side) > 0 ? 1 : -1}|${x.entryT}`;
    if ((scope !== "funded" || x.allocation === "positive") && !open.has(key)) onsets.add(key);
  }
  const result = finishReturnEvidence(b);
  return { ...result, pf: result.noLoss ? null : result.pf, pfConvention: result.unknownReturns ? "unavailable" : "gross-return-ratio",
    cashGp, cashGl, cashPf: b.unknownSizedPnl || !cashGl ? null : cashGp / cashGl, cashNoLoss: !b.unknownSizedPnl && cashGp > 0 && cashGl === 0,
    uniqueSettledOnsets: onsets.size, scope: scope === "funded" ? "whole-book-positive-owned-settled-close-slices-all-ranges" : "whole-book-post-Base-accepted-virtual-settled-close-slices-all-ranges" };
}
export function portfolioRowsForStudy(dir) {
  const p = read(path.join(dir, "protocol.json"));
  return p.folds.flatMap((fold) => p.profiles.map((profile) => {
    const caseId = `${fold.id}-${profile.id}`, d = path.join(dir, caseId), fundedFile = path.join(d, "funded-owned-close-slices.csv"), virtualFile = path.join(d, "accepted-virtual-close-slices.csv");
    const endpoints = read(path.join(d, "endpoint-marks-separate.json")).planned;
    const funded = portfolioEvidence(parseEvidenceCsv(fs.readFileSync(fundedFile, "utf8")), "funded", endpoints), virtual = portfolioEvidence(parseEvidenceCsv(fs.readFileSync(virtualFile, "utf8")), "virtual", endpoints);
    return { caseId, fold: fold.id, profile: profile.id, scope: "Whole book: every range and loss; not range/configuration qualification proof", startUtc: iso(fold.tradeStartT), endUtc: iso(fold.endT),
      fundedCloses: funded.n, fundedSettledOnsets: funded.uniqueSettledOnsets, fundedGp: funded.gp, fundedGl: funded.gl, fundedReturnPf: funded.pf, fundedNoLoss: funded.noLoss,
      unknownFundedReturns: funded.unknownReturns, cashGp: funded.cashGp, cashGl: funded.cashGl, cashPfDiagnostic: funded.cashPf, cashNoLoss: funded.cashNoLoss, netUsd: funded.usd, unknownSizedPnl: funded.unknownSizedPnl,
      acceptedVirtualCloses: virtual.n, acceptedVirtualGp: virtual.gp, acceptedVirtualGl: virtual.gl, acceptedVirtualReturnPf: virtual.pf, virtualNoLoss: virtual.noLoss, unknownVirtualReturns: virtual.unknownReturns,
      fundedSourceCsvSha256: sha(fundedFile), acceptedVirtualSourceCsvSha256: sha(virtualFile), endpointSourceSha256: sha(path.join(d, "endpoint-marks-separate.json")) };
  }));
}
function portfolioParagraph(rows) {
  const second = rows.filter((x) => x.fold === "development-2"), a = second.find((x) => x.profile === "P0"), b = second.find((x) => x.profile === "P1"), c = second.find((x) => x.profile === "P2");
  if (!a || !b || !c || a.fundedReturnPf !== c.fundedReturnPf || a.netUsd !== c.netUsd) throw new Error("Expected frozen portfolio comparison differs");
  return `Whole funded book, with every range and losing close retained: fold 2 P0/P2 each has ${a.fundedCloses} settled close slices, return PF ${a.fundedReturnPf.toFixed(10)}, cash PF ${a.cashPfDiagnostic.toFixed(10)}, and net +$${a.netUsd.toFixed(11)}. P1 has ${b.fundedCloses} close slices, return PF ${b.fundedReturnPf.toFixed(10)}, cash PF ${b.cashPfDiagnostic.toFixed(10)}, and net +$${b.netUsd.toFixed(11)}. All fold 1 books have zero settled closes and unavailable PF. P0/P2's positive whole-book return PF of ${a.fundedReturnPf.toFixed(4)} is below the frozen 1.1 floor; it is not proof for any individual range or configuration. Cash PF remains an allocation-weighted diagnostic on the same full owned cohort. Selection remains NONE because the frozen two-fold rules were not met. The six-row portfolio-summary.csv preserves the accepted-virtual axis alongside funded returns and cash diagnostics.`;
}
export function writePortfolioSupplement(dir, docFile) {
  const rows = portfolioRowsForStudy(dir), out = path.join(dir, "development-report"), dest = path.join(out, "portfolio-summary.csv");
  if (fs.existsSync(dest)) throw new Error("Preserve the existing portfolio supplement");
  const text = fs.readFileSync(docFile, "utf8"), marker = "\n\n## Qualification and causal rejection";
  if (!text.includes(marker)) throw new Error("Expected report insertion point absent");
  csv(dest, rows); write(path.join(out, "portfolio-summary.json"), { classification: "Whole-book aggregate of all existing CSV rows; no new engine run or cohort selection", rows, selectedAny: false, outerNetworkRequests: 0 });
  fs.writeFileSync(docFile, text.replace(marker, "\n\n" + portfolioParagraph(rows) + marker));
  const manifestFile = path.join(out, "report-manifest.json"), manifest = read(manifestFile);
  manifest.rowCounts.portfolio = rows.length; write(manifestFile, manifest);
  return { rows: rows.length, csv: dest, document: docFile };
}
export function frozenRangeEligibility(folds) {
  const reasons = [];
  for (const x of folds) {
    if (!x.complete) reasons.push(`${x.fold}: completeness/activity failures retained`);
    if (x.funded.uniqueSettledOnsets < 30) reasons.push(`${x.fold}: funded settled onsets ${x.funded.uniqueSettledOnsets}<30`);
    if (!Number.isFinite(x.funded.pf) || x.funded.pf < 1.1 || x.funded.unknownReturns) reasons.push(`${x.fold}: finite funded return PF>=1.1 not demonstrated`);
    if (!Number.isFinite(x.virtualQualified.pf) || x.virtualQualified.pf < 1.1 || x.virtualQualified.unknownReturns) reasons.push(`${x.fold}: finite accepted virtual return PF>=1.1 not demonstrated`);
  }
  if (folds.length !== 2 || new Set(folds.map((x) => x.fold)).size !== 2) reasons.push("Both distinct predeclared development folds are required");
  return { eligible: reasons.length === 0, reasons };
}
function marketSanity(feed, p, fold) {
  const out = [];
  for (const sym of p.symbols) for (const [label, from, to] of [["preceding6h", fold.tradeStartT - 6 * H, fold.tradeStartT], ["trade6h", fold.tradeStartT, fold.endT]]) {
    const cs = feed.candles[`${sym}|1`].filter((x) => x.t >= from && x.t < to);
    const low = Math.min(...cs.map((x) => x.l)), high = Math.max(...cs.map((x) => x.h));
    out.push({ fold: fold.id, sym, segment: label, startUtc: iso(from), endUtc: iso(to), bars: cs.length, expected: 360,
      distinctCloses: new Set(cs.map((x) => x.c)).size, positiveVolumeBars: cs.filter((x) => x.v > 0).length,
      summedVolume: cs.reduce((n, x) => n + x.v, 0), highLowRangePct: 100 * (high / low - 1), netMovePct: 100 * (cs.at(-1).c / cs[0].o - 1),
      chronologicalAndGapless: cs.length === 360 && cs.every((x, i) => x.t === from + i * 60_000) });
  }
  return out;
}
function reconstructHorizon(feed, p, fold, settings) {
  const rows = [], bars = [];
  const requestedBaseBars = Math.round(settings.historyDays * 1440 / settings.tfMin);
  for (const sym of p.symbols) {
    const loaded = readStored(feed.candles[`${sym}|1`], 1, { nowT: fold.endT, limit: requestedBaseBars });
    const cs = CandleSeries.fromCandles(loaded, requestedBaseBars);
    const lanes = laneSeriesOf(sym, cs, settings); bars.push(...lanes);
    for (const b of lanes) {
      const stage = headBars(b, fold.tradeStartT), duration = b.tfMin * 60_000;
      const before = (t) => Array.from(b.t).filter((v) => v + duration <= t).length;
      rows.push({ fold: fold.id, sym, tfMin: b.tfMin, evidence: "deterministic loader/lane reconstruction, not persisted runtime candle telemetry",
        requestedBaseBars, reconstructedStoredBaseBars: cs.n, reconstructedStoredBaseFirstUtc: iso(cs.t[0]),
        laneFirstUtc: iso(b.t[0]), laneLastCloseUtc: iso(b.t[b.n - 1] + duration), laneBars: b.n, causalStageBars: stage.n,
        completedWarmupBars: before(fold.evaluationFromT), evaluationPreBars: before(fold.tradeStartT) - before(fold.evaluationFromT),
        expectedEvaluationPreBars: p.preH * 60 / b.tfMin, tradeBars: b.n - before(fold.tradeStartT), focusedOutcomeLane: b.tfMin === 15,
        combinedHigherSupport: b.tfMin === 30, mandatoryDataLaneOnly: b.tfMin === 1 });
    }
  }
  const u = makeUniverse(bars, fold.evaluationFromT), stage = makeUniverse(bars.map((b) => headBars(b, fold.tradeStartT)), fold.evaluationFromT);
  return { fold: fold.id, evidence: "deterministic reconstruction from sealed feed/settings and unchanged production loader functions; physical origins were not persisted in raw.json",
    rawDirectPhysicalTelemetryAvailable: false, evaluationFromUtc: iso(fold.evaluationFromT), reconstructedUniverse: { startUtc: iso(u.startT), indicatorStartUtc: iso(u.indicatorStartT), nowUtc: iso(u.nowT), causalStageNowUtc: iso(stage.nowT) },
    focusedAndHigherSupportFullPrehistory: rows.filter((x) => x.tfMin !== 1).every((x) => x.evaluationPreBars === x.expectedEvaluationPreBars),
    allSettingsTimeframesFullPrehistory: rows.every((x) => x.evaluationPreBars === x.expectedEvaluationPreBars), rows };
}
function causalTapeEvidence(raw) {
  const start = raw.window.startT, end = raw.window.endT, floor = raw.settings.evaluationFromT;
  const checks = new Map(raw.validation.map((x) => [x.t, new Map(x.checks.map((c) => [c[0], c[1]]))]));
  const ranges = new Map(["mc", "mn", "sh"].map((x) => [x, { tag: x, retainedEverSeatedTapes: 0, retainedClosedOnsets: 0, preStartEntriesExitingDuringRun: 0, forwardClosedOnsets: 0, latestEntryT: null, maxPreOnsetsExactConfigSymbolSide: 0 }]));
  const short = [];
  for (const tp of raw.tapeTrades) {
    const meta = studyConfigDetails(tp.id), r = ranges.get(meta.tag); if (!r) continue;
    r.retainedEverSeatedTapes++; const own = new Map();
    for (const [sym, side, entryT, exitT, value] of tp.trades) {
      r.retainedClosedOnsets++; r.latestEntryT = Math.max(r.latestEntryT ?? entryT, entryT);
      if (entryT < start && exitT >= start) r.preStartEntriesExitingDuringRun++;
      if (entryT >= floor && entryT < start && exitT < start) { const key = `${sym}|${side}`; if (!own.has(key)) own.set(key, new Set()); own.get(key).add(entryT); }
      if (entryT < start || entryT >= end) continue;
      r.forwardClosedOnsets++;
      if (meta.tag !== "sh") continue;
      const stepT = start + Math.floor((entryT - start) / H) * H;
      const history = tp.trades.filter((x) => x[0] === sym && x[1] === side && x[3] <= entryT && x[3] >= entryT - 336 * H);
      const gp = history.reduce((n, x) => n + Math.max(0, x[4]), 0), gl = history.reduce((n, x) => n + Math.max(0, -x[4]), 0);
      short.push({ ...meta, sym, side, entryUtc: iso(entryT), exitUtc: iso(exitT), qualifiedInEntryHour: !!checks.get(stepT)?.get(tp.id),
        ownSymbolSidePastCloses: history.length, pastGp: gp, pastGl: gl, pastNet: gp - gl, pastPf: gl ? gp / gl : null, forwardUnitReturnDiagnosticOnly: value });
    }
    r.maxPreOnsetsExactConfigSymbolSide = Math.max(r.maxPreOnsetsExactConfigSymbolSide, ...[...own.values()].map((x) => x.size));
  }
  return { retainedScope: "Only tapes validated in at least one step or executed are retained; unretained histories remain unknown. Counts of retained closed raw opportunities are not executor candidates.",
    ranges: [...ranges.values()].map((x) => ({ ...x, latestEntryUtc: iso(x.latestEntryT), hoursBeforeStartOfLatestEntry: x.latestEntryT === null ? null : (start - x.latestEntryT) / H })),
    shortForwardClosedOpportunities: short, runtimeStepCandidates: raw.stepsByRange, runtimeSkipsByRange: raw.engine.skipsByRange };
}
/** Reconstruct causal evidence from every retained history, including checksummed sidecars. */
export async function causalTapeEvidenceFromFile(file) {
  const raw = await readSessionDump(file, { verifyUnloaded: true });
  return { raw, evidence: causalTapeEvidence(raw) };
}
export async function rangeStudyReport(protocolFile, docFile) {
  const dir = path.dirname(path.resolve(protocolFile)), out = path.join(dir, "development-report");
  if (fs.existsSync(out) || fs.existsSync(docFile)) throw new Error("Preserve existing report artifacts");
  const p = read(protocolFile), sealFile = path.join(dir, "source-freeze.json"), seal = read(sealFile); verifyStudySource(seal, sha(protocolFile));
  const configured = read(path.join(dir, "configured-identity-universe.json")), known = new Map(configured.map((x) => [x.id, studyConfigDetails(x.id)]));
  const all = [], hourly = [], rows = [], directions = [], failures = [], market = [], horizons = [], causal = [], indicationRows = [];
  for (const fold of p.folds) {
    const feedFile = path.join(dir, fold.id, "feed.json"), feed = read(feedFile);
    market.push(...marketSanity(feed, p, fold)); horizons.push(reconstructHorizon(feed, p, fold, read(path.join(dir, "settings-P0.json")).settings));
    for (const profile of p.profiles) {
      const caseId = `${fold.id}-${profile.id}`, caseDir = path.join(dir, caseId), rawFile = path.join(caseDir, "raw.json"), e = read(path.join(caseDir, "evidence-summary.json")), result = read(path.join(caseDir, "run-result.json"));
      const { raw, evidence: causalEvidence } = await causalTapeEvidenceFromFile(rawFile);
      if (sha(rawFile) !== e.provenance.rawSha256 || sha(path.join(caseDir, "book/data.json")) !== e.provenance.normalizedBookSha256) throw new Error("Frozen evidence input hash mismatch");
      if (e.hourly.length !== 144) throw new Error("Every case must retain all144 hourly cells");
      all.push({ caseId, fold: fold.id, profile: profile.id, e, result }); causal.push({ caseId, ...causalEvidence });
      failures.push(...e.failedChecks.map((x) => ({ caseId, ...x })));
      hourly.push(...read(path.join(caseDir, "hourly.json")).rows.map((x) => ({ caseId, fold: fold.id, profile: profile.id, ...x })));
      const initial = new Map(raw.validation.find((x) => x.t === fold.tradeStartT).checks.map((x) => [x[0], x[1]]));
      for (const pair of p.focus) for (const tag of ["mc", "mn", "sh"]) {
        const ids = configured.filter((x) => `${x.bot}|${x.ind}` === pair && x.protect.tag === tag).map((x) => x.id), base = raw.basePairs.find((x) => x.pair === pair);
        indicationRows.push({ caseId, pair, tag, configured: ids.length, baseEvaluated: !!base, basePassed: base?.tags?.includes(tag) ?? false,
          initialEvaluatedConfigs: ids.filter((id) => initial.has(id)).length, initialQualifiedConfigs: ids.filter((id) => initial.get(id)).length });
      }
      for (const r of e.ranges) {
        const summed = (key) => r.build.reduce((n, x) => n + (x[key] ?? 0), 0), skip = {};
        for (const x of r.build) for (const [k, v] of Object.entries(x.skip ?? {})) skip[k] = (skip[k] ?? 0) + v;
        const flow = raw.stepsByRange.reduce((a, s) => { const x = s.byRange[r.tag]; a.candidates += x?.candidates ?? 0; a.taken += x?.taken ?? 0; return a; }, { candidates: 0, taken: 0 });
        rows.push({ caseId, fold: fold.id, profile: profile.id, tag: r.tag, range: r.range, configured: r.configured, baseEvaluatedPairs: r.base.evaluated, basePassedPairs: r.base.passed,
          baseAggregateReportedMinPf: r.base.minPf, genericBaseSetsMinPf: p.gates.baseSetsMinPf, tacticFullIndicationFloor: 1.1,
          baseFirstRejections: r.baseRejections.first, baseOnlyRejections: r.baseRejections.only, representedMainGrid: summed("grid"), built: summed("built"), buildSkips: skip,
          configEvalAtStart: r.evaluatedConfigsAtStart, qualifiedAtStart: r.qualifiedConfigsAtStart, configFirstRejections: r.initialEvaluation,
          executionCandidates: flow.candidates, acceptedEntryOrdersIncludingEndpoints: flow.taken, executionFirstRejects: raw.engine.skipsByRange[r.tag] ?? {},
          acceptedVirtualSettledCloses: r.virtualQualified.n, acceptedVirtualReturnPf: r.virtualQualified.pf, virtualNoLoss: r.virtualQualified.noLoss,
          fundedOwnedSettledCloses: r.funded.n, fundedOwnedSettledOnsets: r.funded.uniqueSettledOnsets, fundedReturnPf: r.funded.pf, fundedNoLoss: r.funded.noLoss,
          fundedUnknownReturns: r.funded.unknownReturns, cashPfDiagnostic: r.funded.cashPf, cashNoLossDiagnostic: r.funded.cashNoLoss, fundedNetUsd: r.funded.usd, exactConfigSymbolSide30OnsetProofs: r.proofConfigSymbolSides,
          complete: result.complete, allChecksPassed: result.allReconciliationChecksPassed, failedChecks: e.failedChecks.map((x) => x.name), runtimeRssMb: raw.engine.rssMaxMb, memoryComputeLevel: raw.engine.mem.computeLevel });
        for (const s of r.directions) directions.push({ caseId, tag: r.tag, side: s.side, virtual: s.virtualQualified, funded: s.funded, exactConfigSymbolSide30OnsetProofs: s.researchProofConfigSymbolSides });
      }
    }
  }
  const selection = ["mc", "mn", "sh"].map((tag) => {
    const profiles = p.profiles.map((profile) => {
      const cases = all.filter((x) => x.profile === profile.id), folds = cases.map((x) => ({ fold: x.fold, complete: x.result.complete, ...x.e.ranges.find((r) => r.tag === tag) }));
      const proofs = cases.map((x) => new Set(x.e.historicalProofIds.filter((id) => known.get(id.split("|symbol:")[0])?.tag === tag)));
      const commonProofs = [...proofs[0]].filter((id) => proofs[1].has(id));
      return { profile: profile.id, ...frozenRangeEligibility(folds), exactConfigSymbolSideProofsInBothFolds: commonProofs.length, proofIdentities: commonProofs,
        minimumFiniteFundedPf: folds.every((f) => Number.isFinite(f.funded.pf)) ? Math.min(...folds.map((f) => f.funded.pf)) : null, folds: folds.map((f) => ({ fold: f.fold, funded: f.funded, virtualQualified: f.virtualQualified })) };
    });
    const eligible = profiles.filter((x) => x.eligible).sort((a, b) => b.exactConfigSymbolSideProofsInBothFolds - a.exactConfigSymbolSideProofsInBothFolds || b.minimumFiniteFundedPf - a.minimumFiniteFundedPf || a.profile.localeCompare(b.profile));
    return { tag, selectedProfile: eligible[0]?.profile ?? null, profiles };
  });
  if (selection.some((x) => x.selectedProfile)) throw new Error("This dated report template describes the frozen no-winner result; a selected profile requires a new truthful report");
  fs.mkdirSync(out); const provenance = { protocolSha256: sha(protocolFile), sourceFreezeSha256: sha(sealFile), sourceCheckpoint: seal.checkpoint, sourceSha256: seal.sourceSha256, profileSettings: seal.profiles };
  write(path.join(out, "frozen-profile-eligibility.json"), { schema: "cts-frozen-profile-selection-v1", provenance, classification: p.classification, ranges: selection, selectedAny: selection.some((x) => x.selectedProfile), outerNetworkRequests: 0, outerStatus: selection.some((x) => x.selectedProfile) ? "Held for explicit selected-profile/proof/source freeze before any acquisition" : "Not acquired: no development profile passed the frozen eligibility rules" });
  csv(path.join(out, "range-qualification-18.csv"), rows); csv(path.join(out, "hourly-864.csv"), hourly); write(path.join(out, "hourly-864.json"), { provenance, rows: hourly });
  csv(path.join(out, "range-side-36.csv"), directions); csv(path.join(out, "range-indication-lane-576.csv"), indicationRows); csv(path.join(out, "all-failed-checks.csv"), failures);
  csv(path.join(out, "market-input-sanity.csv"), market); write(path.join(out, "horizon-reconstruction.json"), { provenance, folds: horizons }); write(path.join(out, "causal-rejection-evidence.json"), { provenance, cases: causal });
  csv(path.join(out, "short-forward-rejection-details.csv"), causal.flatMap((x) => x.shortForwardClosedOpportunities.map((r) => ({ caseId: x.caseId, ...r }))));
  const fmt = (x) => x == null ? "unavailable" : Number(x).toFixed(4), header = "| Fold | Profile | Range | Base passed / evaluated | ConfigEval passed / evaluated | Virtual closes / return PF | Funded closes / return PF | Cash PF |\n|---|---|---|---:|---:|---:|---:|---:|\n";
  const table = rows.map((r) => `| ${r.fold.replace("development-", "")} | ${r.profile} | ${r.range} | ${r.basePassedPairs}/${r.baseEvaluatedPairs} | ${r.qualifiedAtStart}/${r.configEvalAtStart} | ${r.acceptedVirtualSettledCloses} / ${r.virtualNoLoss ? "no losses; undefined" : fmt(r.acceptedVirtualReturnPf)} | ${r.fundedOwnedSettledCloses} / ${r.fundedNoLoss ? "no losses; undefined" : fmt(r.fundedReturnPf)} | ${r.cashNoLossDiagnostic ? "no losses; undefined" : fmt(r.cashPfDiagnostic)} |`).join("\n");
  const trade1 = market.filter((x) => x.fold === p.folds[0].id && x.segment === "trade6h"), prior1 = market.filter((x) => x.fold === p.folds[0].id && x.segment === "preceding6h"), trade2 = market.filter((x) => x.fold === p.folds[1].id && x.segment === "trade6h");
  const values = (xs, key, digits = 4) => xs.map((x) => Number(x[key]).toFixed(digits)).join(", ");
  const activityText = `All four fold 1 inputs contain 360 gapless minute bars and positive volume on every bar. Distinct closes are ${trade1.map((x) => `${x.sym.replace("-USDT", "")} ${x.distinctCloses}`).join(", ")}. Their high/low ranges are ${values(trade1, "highLowRangePct")} percent, respectively, against ${values(prior1, "highLowRangePct")} percent in the preceding six hours. These active, changing inputs rule out flat or missing-candle inputs as the explanation for the zero entries; they do not independently authenticate venue freshness. Fold 2 ranges are larger at ${values(trade2, "highLowRangePct")} percent. These facts establish input activity; they do not establish that an indication should fire. Market-input-sanity.csv retains every exact comparison.`;
  const text = `# Frozen Micro / Minimal / Short development study — 15 October 2026\n\nNo profile qualified for promotion. All three profiles failed the frozen two-fold requirement of at least 30 funded settled onsets and finite accepted-virtual and funded return PF >=1.1 in each fold. No outer data was acquired. More historical cells qualified with P1, but its executed return PF deteriorated. This is a bounded retrospective development study of four symbols and 32 existing 15m regular/combined indications; it does not establish systemwide or live profitability.\n\n${header}${table}\n\nP0 is the corrected scoped baseline. P1 adds the existing causal trailing Base cell. P2 enables existing engine-side acceptance at 1.05/24h/30 closes and produces the same accepted trades as P0 in these windows; there are no additional engine-side rejection events in the captured skips. Every other gate, current TP/SL/trail/hold cell and 0.20% round-trip cost stayed unchanged. Requested/configured 57,344 cells per profile are separate from evaluated, qualified and funded cells. Block volume is removed from primary unit returns; cash PF is a separate allocation-weighted diagnostic on the same owned cohort. A cash PF above 1 cannot rescue a losing return PF.\n\nFold 1 is 13 October 22:00→14 October 04:00 UTC; fold 2 is 14 October 22:00→15 October 04:00 UTC. Each has 72h of evaluated prehistory on the focused 15m and higher supporting 30m series, with 205h of earlier indicator context. The two windows had already been seen and are retrospective development only.\n\nThe frozen source is ${seal.checkpoint}, source SHA256 ${seal.sourceSha256}, protocol SHA256 ${sha(protocolFile)}. The original six startup failures are preserved under attempt-01-startup-failed. A harness-only repair materializes complete runtime settings and production-normalized settings/WF hashes; fourteen focused tests passed, including actual stopped-runtime application with zero computes. No core default or market-performance gate changed in this repair. The generic Base sets prefilter remains at PF 1.0 (gates.baseSetsMinPf); Tactic's full indication floor remains 1.1 in Base and every later qualification. The aggregate Base minimum therefore is not a uniform PF 1.1 proof for every indication. Actual configEval and frozen finite execution PF requirements remain separate.\n\n## Qualification and causal rejection\n\nP1 improved Short Base admission from 1 to 3 pairs in fold 1 and 3 to 4 in fold 2; initial Short configEval passes rose 139→183 in fold 1 and stayed 52 in fold 2. These are real historical qualification counts, not execution proof. All exact config/symbol/direction 30-onset research proof counts are 0: the largest retained own prehistory samples are 8 onsets for Micro/Minimal and 6–7 for Short. Missing unretained histories stay unknown.\n\nIn fold 1, all recorded execution-step candidate counts are 0 and skips are empty. Ever-seated retained tapes contain no entries starting inside the trading window; their latest entry is 7h before its start (Short 10.5h). Pre-start entries that exit during the run remain excluded from its new-entry execution cohort. This is absence of qualifying fresh opportunities in the frozen scoped pool, rather than a late coordination veto. The confirmation rule in walkforward.ts applies only to Signals; Signals are disabled here. ${activityText}\n\nIn fold 2, Short has 10 closed opportunities among retained ever-seated tapes. Eight are not configEval-qualified in their actual entry hour. The two remaining XRP short entries at 03:00 UTC fail the causal own-symbol/side gate: their prior five closes have PF 0.7959115653 and net return −0.0024260957. Their later small positive results do not justify waiving this gate. Short therefore has zero accepted/funded orders. The full exact protections, timestamps, prior sample and outcome diagnostics are retained separately.\n\n## Input horizon: observed versus reconstructed\n\nRaw evidence directly records the four actual symbols, lanes [1,15,30], evaluationFromT, both six-hour endpoints, exact initial validation and all six hourly cuts. It does not persist physical candle/lane origins. Horizon-reconstruction.json therefore explicitly reports a deterministic reconstruction from sealed feed/settings using unchanged production readStored, CandleSeries, laneSeriesOf, headBars and makeUniverse; it is not presented as measured persisted runtime telemetry.\n\nThe runtime history request/store retains all 16,980 prepared 1m bars per symbol (283h). The focused 15m and supporting 30m series retain 1,132/566 completed bars, with exactly 820/410 completed indicator-warmup bars and 288/144 prehistory bars before trading. Production tfDays['1']=3 separately limits the mandatory 1m analysis lane to 72h, hence only 66h before the trade start: it does not satisfy 72h prehistory on every configured data lane. No 1m outcome IDs are in focus. Source higherFactors uses only higher enabled timeframes, so 15m combined uses 30m, while market references are grouped by their own timeframe. This supports the bounded focused-lane reconstruction; it does not establish complete 1m or all-timeframe validation.\n\n## Checks and files\n\nAll six engines exited 0 at full memory level 0 and preserve every hourly cell. Fold 1 retains five failed activity checks per profile: Normal, Trailing, Micro, Minimal and Short executed no orders. Each fold 2 case retains the failed Short activity check. Thus 18 failed check occurrences remain visible; the study never claims all checks passed. The strict harness marks fold 1 incomplete for its missing strategy-type activity. Fold2 capture is complete while its Short activity check is still explicitly false. None of these empty cohorts is PF 0 or profitable.\n\nThe development-report directory contains the 18-row range waterfall, 36 range/direction rows, 576 indication/lane/range rows, all 864 hourly cells, all failed checks, frozen false-eligibility JSON, input sanity, loader reconstruction and exact Short rejection details. Each case retains full exact config-side and config/symbol/direction proof CSVs, exact TP/SL/trail/hold metadata, accepted/funded close slices, endpoint marks, raw/book JSON and hashes. Endpoint marks remain separate from settled PF.\n\nThe next falsifiable research question is whether a larger predeclared causal training period and new evaluation windows produce enough exact own-symbol/side onsets and settled funded outcomes without lowering gates. P1's increased admission alone is not a successful optimization; P2 demonstrates no measured improvement here. No losing side or cell was dropped, no parameter was selected after inspecting these results, and no live promotion is justified by this study.\n`;
  fs.writeFileSync(docFile, text); write(path.join(out, "report-manifest.json"), { provenance, rowCounts: { ranges: rows.length, directions: directions.length, indications: indicationRows.length, hourly: hourly.length, failedChecks: failures.length, inputSanity: market.length }, sourceFiles: ["scripts/core-range-study-report.mjs", "src/core/server/runtime.server.ts", "src/core/indications/registry.ts", "src/core/indications/market.ts", "src/core/sim/walkforward.ts"], selectedAny: selection.some((x) => x.selectedProfile), rawAndBookInputsUnchanged: true });
  writePortfolioSupplement(dir, docFile);
  return { out, document: docFile, selectedAny: selection.some((x) => x.selectedProfile), rows: rows.length, hourly: hourly.length, portfolio: 6, failures: failures.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(studyJson(process.argv[2] === "portfolio-only"
  ? writePortfolioSupplement(path.resolve(process.argv[3]), process.argv[4]) : await rangeStudyReport(process.argv[2], process.argv[3])));
