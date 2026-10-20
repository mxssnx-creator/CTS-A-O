#!/usr/bin/env node
// Offline evidence reduction only. This root script is outside the frozen engine/source set.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { verifyStudySources } from "./core-22-symbol-study.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000;
const hash = (b) => createHash("sha256").update(b).digest("hex");
const plain = (x) => Array.isArray(x) ? x.map(plain) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, plain(x[k])])) : x;
const json = (x) => JSON.stringify(plain(x), null, 2) + "\n";
const read = (file) => { const b = fs.readFileSync(file); return { data: JSON.parse(b), sha256: hash(b), bytes: b.length, path: path.resolve(file) }; };
const rel = (file) => path.relative(ROOT, path.resolve(file));
const archivePath = (file) => { const value = rel(file); return value.startsWith("..") || path.isAbsolute(value) ? `external/${hash(path.resolve(file)).slice(0, 12)}-${path.basename(file)}` : value; };
const close = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
const iso = (t) => Number.isFinite(t) ? new Date(t).toISOString() : "unavailable";
const pick = (x, keys) => Object.fromEntries(keys.filter((k) => x?.[k] !== undefined).map((k) => [k, x[k]]));
const pf = (x) => x?.sampleRecorded === false ? "unavailable" : x?.noLoss ? "no losses" : Number.isFinite(x?.pf) ? x.pf.toFixed(3) : "unavailable";
const points = (x) => x?.sampleRecorded === false || !Number.isFinite(x?.net) ? "unavailable" : (100 * x.net).toFixed(3);

async function fileMeta(file) {
  const digest = createHash("sha256"); let bytes = 0;
  for await (const b of fs.createReadStream(file)) { digest.update(b); bytes += b.length; }
  return { path: path.resolve(file), bytes, sha256: digest.digest("hex") };
}

export async function verifyFrozenFeedBytes(file, expectedSha256, verified = new Map()) {
  const key = `${path.resolve(file)}|${expectedSha256}`;
  if (!verified.has(key)) {
    const meta = await fileMeta(file);
    if (meta.sha256 !== expectedSha256) throw new Error(`Actual frozen feed bytes differ: ${file}`);
    verified.set(key, meta);
  }
  return verified.get(key);
}

export async function verifyFrozenSourceBytes(sources, root = ROOT) {
  const snapshot = [], resolvedRoot = path.resolve(root);
  for (const source of sources) {
    const file = path.resolve(resolvedRoot, source.path), relative = path.relative(resolvedRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Frozen source path escapes repository");
    const meta = await fileMeta(file);
    if (meta.sha256 !== source.sha256) throw new Error(`Actual frozen source bytes differ: ${source.path}`);
    snapshot.push({ ...meta, role: "frozen-source", sourcePath: source.path });
  }
  return snapshot;
}

async function actualCaseProvenance(protocol, studyCase, context, artifacts) {
  const errors = [], sourceSet = hash(json(protocol.sources));
  if (!context.sourceSets.has(sourceSet)) {
    try {
      // This verifies the exact current core/scripts-lib/launcher/package inventory, including additions/removals.
      verifyStudySources(protocol);
      const files = await verifyFrozenSourceBytes(protocol.sources);
      verifyStudySources(protocol);
      for (const file of files) artifacts.push({ ...file, sourceSetSha256: sourceSet, archivePath: `frozen-source/${sourceSet}/${file.sourcePath}` });
      context.sourceSets.set(sourceSet, { verified: true, files: files.length });
    } catch (error) { context.sourceSets.set(sourceSet, { verified: false, error: String(error) }); }
  }
  const source = context.sourceSets.get(sourceSet);
  if (!source.verified) errors.push(`Actual frozen source/inventory verification failed: ${source.error}`);
  try { await verifyFrozenFeedBytes(studyCase.feed, studyCase.feedSha256, context.feeds); }
  catch (error) { errors.push(String(error)); }
  return errors;
}

export function comparisonCases(protocol) {
  const cases = protocol.cases.filter((c) => [20, 22].includes(c.symbols.length));
  if ([20, 22].some((count) => cases.filter((c) => c.symbols.length === count).length !== 1)) throw new Error("Each baseline/prune protocol must contain exactly one20-symbol and one22-symbol case");
  return cases;
}

export function verifyFinalSummary(s, p, c, protocolSha256) {
  const errors = [];
  const check = (ok, why) => { if (!ok) errors.push(why); };
  check(s.schema === "cts-causal-22-symbol-results-v1", "unsupported summary schema");
  check(s.complete === true && Array.isArray(s.structural) && s.structural.length > 0 && s.structural.every((x) => x.ok === true), "incomplete structural verification");
  check(s.provenance?.protocolSha256 === protocolSha256 && s.provenance?.feedSha256 === c.feedSha256, "protocol/feed fingerprint mismatch");
  check(s.sourceSha256 === hash(json(p.sources)) && s.settingsSha256 === c.runtime.settingsSha256, "source/settings fingerprint mismatch");
  check(s.symbolCount === c.symbols.length && s.window?.startT === p.window.tradeStartT && s.window?.endT === p.window.endT, "symbol/time scope mismatch");
  check(s.cost === c.runtime.settings.cost, "cost mismatch");
  check(s.dataCoverage?.evaluatedPrehistoryHoursRequested === p.window.preH && s.dataCoverage?.indicatorWarmupHoursSeparate === p.window.indicatorWarmupH, "history scope mismatch");
  check(s.hourly?.length === 24 && s.hourly.every((x, i) => x.startT === p.window.tradeStartT + i * H), "missing or shifted hourly cells");
  for (const key of ["acceptedVirtualSettled", "fundedModeledSettled"]) {
    const total = s[key], hourKey = key === "fundedModeledSettled" ? "funded" : "virtual";
    if (!total || !Array.isArray(s.hourly)) { check(false, `${key} missing`); continue; }
    const sums = s.hourly.reduce((a, h) => { const r = h[hourKey] ?? {}; return { n: a.n + (r.n ?? 0), gp: a.gp + (r.gp ?? 0), gl: a.gl + (r.gl ?? 0), unknown: a.unknown + (r.unknown ?? 0) }; }, { n: 0, gp: 0, gl: 0, unknown: 0 });
    check(sums.n === total.n && sums.unknown === total.unknown && close(sums.gp, total.gp) && close(sums.gl, total.gl), `${key} hourly gross-return reconciliation failed`);
    if (total.unknown === 0 && total.n > 0 && total.gl > 0) check(Number.isFinite(total.pf) && close(total.pf, total.gp / total.gl), `${key} PF arithmetic mismatch`);
  }
  return errors;
}

export function conciseFinalCase(s) {
  const stages = s.progression.hourlyCandidateDiagnostics;
  return {
    symbolCount: s.symbolCount, cost: s.cost, modeledRoundTripCostPercent: s.cost * 100,
    progression: pick(s.progression, ["basePairsEvaluated", "basePairsPassed", "allComputedConfigTapes", "configsCheckedAcrossRun", "configsEverQualified", "executedConfigs"]),
    cohorts: { beforeBase: stages.beforeBase, afterBase: stages.afterBase, configPool: stages.pool, seatedCandidates: stages.seated, acceptedVirtualSettled: s.acceptedVirtualSettled, fundedModeledSettled: s.fundedModeledSettled },
    positiveFundedHours: s.greenFundedHours, activeFundedHours: s.activeFundedHours,
    hourly: s.hourly.map((h) => ({ startT: h.startT, utc: iso(h.startT), preBase: h.candidateStages.beforeBase, postBase: h.candidateStages.afterBase, configPool: h.candidateStages.pool, seated: h.candidateStages.seated, acceptedVirtual: h.virtual, funded: h.funded })),
    continuousValidation: s.continuousValidation,
    lastNHistory: pick(s.entryHistoryAudit, ["scope", "floor", "distinctExecutedEntries", "settledCloseSlices", "repeatedEntryCloseSlices", "missingCandidateTapeEntries", "fullTargetStrictBefore", "partialConfiguredFloorStrictBefore", "belowConfiguredFloorStrictBefore", "entriesWithTiedCloses", "selectedExecutionHistoryScope"]),
    dataCoverage: s.dataCoverage,
    rejectionReasons: { base: s.progression.baseRejections, strategy: s.progression.strategyGateFailures, afterBaseStrategy: s.progression.afterBaseStrategyGates, entries: s.progression.entryRejections, byRange: s.progression.entryRejectionsByRange },
    groups: s.groups,
    runtime: s.performance,
    bookDiagnostics: pick(s.equity, ["balanceEnd", "equityEnd", "net", "netPct", "cashPfDiagnostic", "equityMaxDdPct", "ddtH", "ddr", "marginMax", "openEnd"]),
    zeroAllocations: s.zeroAllocations, unknownAllocations: s.unknownAllocations, endpointMarks: s.endpointMarks,
    nativeFailedChecks: (s.nativeReportChecks ?? []).filter((x) => Array.isArray(x) ? x[1] === false : x.ok === false || x.pass === false), pruning: s.pruning,
  };
}

async function collectCase(protocol, frozen, c, studyDir, label, artifacts, context) {
  const dest = path.join(studyDir, c.id), resultFile = path.join(dest, "run-result.json");
  const item = { id: `${label}/${c.id}`, caseId: c.id, label, symbolCount: c.symbols.length, status: "pending", protocolSha256: frozen.sha256, feedSha256: c.feedSha256 };
  if (!fs.existsSync(resultFile)) { item.reason = "No completed run-result.json; no performance inferred"; return item; }
  const result = read(resultFile); artifacts.push(await fileMeta(resultFile));
  for (const name of ["command.json", "engine.log", "render.log", "summary.md", "session.md"]) if (fs.existsSync(path.join(dest, name))) artifacts.push(await fileMeta(path.join(dest, name)));
  if (result.data.complete !== true) {
    // Deliberately do not parse an invalid summary or expose its PF as evidence.
    item.status = "invalid"; item.reason = result.data.error ?? "Run completeness checks failed";
    item.failures = result.data.structuralFailures ?? []; item.engine = result.data.engine; return item;
  }
  const summaryFile = path.join(dest, "summary.json"), summary = read(summaryFile);
  const errors = verifyFinalSummary(summary.data, protocol, c, frozen.sha256);
  errors.push(...await actualCaseProvenance(protocol, c, context, artifacts));
  if (summary.sha256 !== result.data.summarySha256) errors.push("run-result/summary hash mismatch");
  for (const [name, key] of [["raw.json", "rawSha256"], ["book/data.json", "bookSha256"]]) {
    const meta = await fileMeta(path.join(dest, name)); artifacts.push(meta);
    if (meta.sha256 !== summary.data.provenance?.[key]) errors.push(`${name} hash mismatch`);
  }
  artifacts.push(await fileMeta(summaryFile));
  if (errors.length) { item.status = "invalid"; item.reason = "Final evidence checks failed"; item.failures = errors; return item; }
  item.status = "verified"; item.summarySha256 = summary.sha256; item.results = conciseFinalCase(summary.data); return item;
}

async function invalidAttempts(studyDir, artifacts) {
  const parent = path.dirname(studyDir), current = path.resolve(studyDir), rows = [];
  for (const d of fs.readdirSync(parent, { withFileTypes: true }).filter((x) => x.isDirectory() && /^symbols22-study-/.test(x.name))) {
    const dir = path.join(parent, d.name); if (path.resolve(dir) === current) continue;
    for (const c of fs.readdirSync(dir, { withFileTypes: true }).filter((x) => x.isDirectory())) {
      const f = path.join(dir, c.name, "run-result.json"); if (!fs.existsSync(f)) continue;
      const x = read(f);
      for (const file of [path.join(dir, "protocol.json"), f, ...["command.json", "engine.log", "render.log"].map((name) => path.join(dir, c.name, name))])
        if (fs.existsSync(file)) artifacts.push(await fileMeta(file));
      rows.push({ directory: rel(path.dirname(f)), runResultSha256: x.sha256, status: x.data.complete ? "superseded; not scored here" : "failed/incomplete", error: x.data.error, failures: x.data.structuralFailures ?? [], engine: x.data.engine,
        policy: "Only attempt/status metadata was read; invalid or superseded performance is not used for tuning or headline comparison." });
    }
  }
  return rows;
}

function historicalCoordinator(file) {
  if (!fs.existsSync(file)) return { status: "unavailable" };
  const value = read(file), manifest = read(path.join(path.dirname(file), "manifest.json")).data;
  const sealed = manifest.files?.find((x) => x.file === path.basename(file));
  if (!sealed || sealed.sha256 !== value.sha256 || sealed.bytes !== value.bytes || value.data.schema !== "cts-coordinator-selected-reverification-v1") throw new Error("Historical selected-summary seal mismatch");
  const x = value.data;
  return { status: "verified historical diagnostic", schema: x.schema, sha256: value.sha256, semantics: x.semantics, selectedConfigs: x.selectedConfigs, selectedSides: x.selectedSides, closed: x.closed, byDirection: x.byDirection, byStrategy: x.byStrategy,
    hourly: pick(x.hourly, ["activeHours", "greenHours", "greenShare"]), sourceReportSha256: x.sourceReportSha256, cacheSha256: x.cacheSha256,
    limits: "Eight reused symbols; fixed IS-cutoff cohort with overlapping config copies. This is distinct from the new causal20/22-symbol runtime study and does not establish entry-gated execution, account returns, positive shorts or stable hourly profit." };
}

function finalReportText(report) {
  const lines = ["# CTS-A-O causal study evidence", "", report.scope, "", `Status: **${report.complete ? "all requested baseline cases verified" : "incomplete; pending/invalid cases remain"}**. No live orders were part of this study.`, "",
    "| Case | Status | Symbols | Cost round trip | Funded closes | Return PF | Net return points | Positive / active hours |", "|---|---|---:|---:|---:|---:|---:|---:|",
    ...report.cases.map((c) => { const r = c.results; return `|${c.id}|${c.status}|${c.symbolCount}|${r ? r.modeledRoundTripCostPercent.toFixed(2) + "%" : "—"}|${r?.cohorts.fundedModeledSettled.n ?? "—"}|${r ? pf(r.cohorts.fundedModeledSettled) : "unavailable"}|${r ? points(r.cohorts.fundedModeledSettled) : "—"}|${r ? `${r.positiveFundedHours} / ${r.activeFundedHours} (of24)` : "—"}|`; }), "",
    `History: ${report.historyScope.evaluatedPrehistoryHours}h evaluated prehistory, ${report.historyScope.indicatorOnlyWarmupHours}h earlier indicator-only context, ${report.historyScope.simulatedHours}h trading. Older context is excluded by the explicit evaluation boundary. Missing or insufficient history is never filled or labeled a pass.`, "",
    "The pre/post-Base representative cells, overlapping config candidates, accepted virtual orders and funded modeled orders are separate cohorts. Return PF is primary after modeled costs; sized-dollar PF and equity are separate book diagnostics. Endpoint marks are excluded from settled PF. No-loss results are labeled instead of presenting a sentinel as a measured finite ratio."];
  for (const c of report.cases) {
    lines.push("", `## ${c.id}`, "");
    if (!c.results) { lines.push(`${c.status}: ${c.reason}.`, ...(c.failures ?? []).map((x) => `- ${typeof x === "string" ? x : x.name ?? JSON.stringify(x)}`)); continue; }
    const r = c.results;
    lines.push("| Progression cohort | Closes | Return PF | Net return points |", "|---|---:|---:|---:|",
      ...Object.entries(r.cohorts).map(([name, x]) => `|${name}|${x.sampleRecorded === false ? "unavailable" : x.n}|${pf(x)}|${points(x)}|`), "",
      `Base pairs ${r.progression.basePairsPassed}/${r.progression.basePairsEvaluated}; config tapes ${r.progression.allComputedConfigTapes}; checked ${r.progression.configsCheckedAcrossRun}; qualified at least once ${r.progression.configsEverQualified}; executed configs ${r.progression.executedConfigs}.`, "",
      "| UTC hour starting | Pre-Base PF | Post-Base PF | Funded closes | Funded Return PF | Net return points |", "|---|---:|---:|---:|---:|---:|",
      ...r.hourly.map((h) => `|${h.utc}|${pf(h.preBase)}|${pf(h.postBase)}|${h.funded.n}|${pf(h.funded)}|${points(h.funded)}|`), "",
      `Continuous validation: ${r.continuousValidation?.recordedSteps ?? "unknown"} recorded steps, ${r.continuousValidation?.checked ?? "unknown"} checks. Last-N availability audit: full target strictly before entry ${r.lastNHistory.fullTargetStrictBefore ?? "unknown"}; partial samples meeting existing floor ${r.lastNHistory.partialConfiguredFloorStrictBefore ?? "unknown"}; unknown candidate history ${r.lastNHistory.missingCandidateTapeEntries ?? "unknown"}. Runtime includes same-timestamp closes; strict deficits alone do not prove a gate violation.`, "",
      `Compute ${r.runtime?.computeMs == null ? "unavailable" : (r.runtime.computeMs / 1000).toFixed(1) + "s"}; peak RSS ${r.runtime?.peakRssMb ?? "unavailable"}MB. Native failed report/activity checks: ${r.nativeFailedChecks.length}. JSON retains every group, rejection reason and history-scope limitation.`);
  }
  const h = report.historicalCoordinator;
  lines.push("", "## Historical coordinator diagnostic", "", h.closed ? `The separately sealed v5 cohort contains ${h.selectedConfigs} configs/${h.selectedSides} directional rows, ${h.closed.n} overlapping closes, PF ${h.closed.pf.toFixed(3)}. Long PF ${h.byDirection.long.pf.toFixed(3)}, short PF ${h.byDirection.short.pf.toFixed(3)}. Positive active hours ${h.hourly.greenHours}/${h.hourly.activeHours}. ${h.limits}` : "Historical selected evidence unavailable.", "",
    "## Attempt and test limits", "", ...report.invalidOrSupersededAttempts.map((a) => `- ${a.directory}: ${a.status}; ${a.error ?? "retained separately"}.`), "",
    report.testEvidence ? `Test evidence supplied separately: ${report.testEvidence.path}, SHA-256 ${report.testEvidence.sha256}. Counts and test scope are preserved in report.json; they are not inferred from simulation completion.` : "No final test manifest supplied. Do not infer a full-suite pass, live validation or profitability certification from this report.", "",
    "Pruning requires its own frozen causal-history rule and separately retained comparison. Removing losing test-period members is retrospective tuning and cannot establish untouched held-out performance. No aggregate outcome guarantees success in every hour.", "",
    "Verified cases require actual feed bytes, the exact current frozen source inventory and every source file to match their seals. The packaging plan preserves the existing saved evidence ZIP and adds new raw/book/summary/protocol/log files plus an explicit core/scripts-lib/launcher/package source snapshot with hashes into a new private evidence archive. It never overwrites the prior ZIP or uploads files.", "");
  return lines.join("\n");
}

export function finalReportHtml(report) {
  const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const inline = (value) => escape(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const table = (headers, rows) => `<div class="table"><table><thead><tr>${headers.map((x) => `<th>${inline(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${inline(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const lines = finalReportText(report).split("\n"), blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; if (!line.trim()) continue;
    if (line.startsWith("|")) {
      const cells = (value) => value.split("|").slice(1, -1).map((x) => x.trim()), headers = cells(line), rows = [];
      i++; while (i + 1 < lines.length && lines[i + 1].startsWith("|")) rows.push(cells(lines[++i]));
      blocks.push(table(headers, rows)); continue;
    }
    const heading = line.match(/^(#{1,3}) (.*)$/);
    if (heading) { blocks.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (line.startsWith("- ")) {
      const rows = [line.slice(2)]; while (i + 1 < lines.length && lines[i + 1].startsWith("- ")) rows.push(lines[++i].slice(2));
      blocks.push(`<ul>${rows.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`); continue;
    }
    blocks.push(`<p>${inline(line)}</p>`);
  }
  for (const c of report.cases.filter((x) => x.results)) {
    const groups = c.results.groups ?? [];
    blocks.push(`<h2>${escape(c.id)}: range, strategy and direction detail</h2>`, table(["Axis", "Identity", "Virtual closes", "Virtual PF", "Funded closes", "Funded PF", "Funded net return points"],
      groups.filter((g) => ["range", "type", "direction", "lane"].includes(g.axis)).map((g) => [g.axis, g.key, g.virtual.n, pf(g.virtual), g.funded.n, pf(g.funded), points(g.funded)])));
  }
  if (report.testEvidence) blocks.push(`<h2>Recorded test evidence</h2><pre>${escape(JSON.stringify(report.testEvidence.recorded, null, 2))}</pre>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CTS-A-O causal study evidence</title><style>body{font:15px/1.55 system-ui,sans-serif;color:#182430;background:#f3f6f8;margin:0}main{max-width:1180px;margin:32px auto;padding:32px;background:white;border:1px solid #dce3e8;border-radius:12px}h1{font-size:28px;line-height:1.2;margin:0 0 20px}h2{font-size:20px;border-top:1px solid #dce3e8;padding-top:24px;margin-top:32px}p,li{max-width:105ch}.table{overflow:auto;margin:18px 0}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:13px}th,td{padding:9px 12px;border-bottom:1px solid #dce3e8;text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}th{background:#edf3f8;color:#173a5a}tbody tr:nth-child(even){background:#f7f9fb}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6f8;padding:16px;font-size:12px}footer{border-top:1px solid #dce3e8;padding-top:20px;color:#536474;font-size:12px}@media(max-width:700px){main{margin:0;padding:18px;border:0;border-radius:0}}@media print{main{max-width:none;margin:0;padding:0;border:0}thead{display:table-header-group}.table{overflow:visible}tr{break-inside:avoid}}</style></head><body><main>${blocks.join("\n")}<footer>Protocol SHA-256 ${escape(report.protocolSha256)} · Source SHA-256 ${escape(report.sourceSha256)}. Exact unrounded values and provenance are retained in report.json.</footer></main></body></html>\n`;
}

export async function finalReportMain(argv) {
  const arg = (key, fallback) => { const i = argv.indexOf(`--${key}`); return i < 0 ? fallback : argv[i + 1]; };
  if (!arg("study") || !arg("out")) throw new Error("Usage: core-22-symbol-final-report.mjs --study STUDY_DIRECTORY --out NEW_DIRECTORY [--prune PRUNE_STUDY_DIRECTORY] [--tests tests.json] [--base-zip archive.zip]");
  const studyDir = path.resolve(arg("study")), output = path.resolve(arg("out"));
  if (fs.existsSync(output)) throw new Error("Preserve prior reports; --out must be a new directory");
  const artifacts = [], context = { sourceSets: new Map(), feeds: new Map() }, frozen = read(path.join(studyDir, "protocol.json")), p = frozen.data;
  if (p.schema !== "cts-causal-22-symbol-study-v1") throw new Error("Unsupported frozen study protocol");
  artifacts.push(await fileMeta(frozen.path));
  const cases = [];
  for (const c of comparisonCases(p)) cases.push(await collectCase(p, frozen, c, studyDir, "baseline", artifacts, context));
  if (arg("prune")) {
    const dir = path.resolve(arg("prune")), fp = read(path.join(dir, "protocol.json"));
    if (fp.data.schema !== p.schema) throw new Error("Prune comparison requires a separate frozen causal study protocol");
    artifacts.push(await fileMeta(fp.path));
    for (const c of comparisonCases(fp.data)) cases.push(await collectCase(fp.data, fp, c, dir, "prune-variant", artifacts, context));
  }
  const tests = arg("tests") ? read(path.resolve(arg("tests"))) : null;
  if (tests) artifacts.push(await fileMeta(tests.path));
  const baseFile = path.resolve(arg("base-zip", path.join(ROOT, "../deliverables/cts-ao-market-replay-evidence-20261017.zip")));
  const baseArchive = fs.existsSync(baseFile) ? { ...await fileMeta(baseFile), preserveExisting: true } : { path: baseFile, status: "not available locally" };
  const historical = historicalCoordinator(path.resolve(arg("history", path.join(ROOT, "docs/evidence/coordinator-v5-20261017/selected-summary.json"))));
  const report = { schema: "cts-causal-study-final-report-v1", generatedAt: new Date().toISOString(), complete: cases.filter((x) => x.label === "baseline").length === 2 && cases.every((x) => x.status === "verified"),
    scope: "Retrospective, offline causal CoreRuntime evidence on a frozen public-market sample. Verified modeled execution is distinct from venue-owned fills, fixed-cohort research and future profitability.",
    protocolSha256: frozen.sha256, sourceSha256: hash(json(p.sources)), historyScope: { evaluatedPrehistoryHours: p.window.preH, indicatorOnlyWarmupHours: p.window.indicatorWarmupH, simulatedHours: p.window.runH, evaluationFrom: iso(p.window.evaluationFromT), tradingFrom: iso(p.window.tradeStartT), tradingThroughExclusive: iso(p.window.endT) },
    cases, historicalCoordinator: historical, invalidOrSupersededAttempts: await invalidAttempts(studyDir, artifacts),
    actualInputVerification: { policy: "Each unique completed-case feed was streamed and hashed. Each source set passed the production exact-current-inventory verifier and every source file was independently streamed/hashed; verified core/scripts-lib/launcher/package files are explicitly listed for archival.",
      feeds: [...context.feeds.values()], sourceSets: [...context.sourceSets].map(([sha256, result]) => ({ sha256, ...result })) },
    testEvidence: tests ? { path: rel(tests.path), sha256: tests.sha256, recorded: tests.data } : null,
    exclusions: ["No PF from invalid/superseded attempts enters headline results", "No live or venue-owned execution validation", "No OOS-based parameter or member selection", "No unknown or empty history presented as passing"], baseArchive };
  const builder = await fileMeta(fileURLToPath(import.meta.url)); artifacts.push(builder); report.builderSha256 = builder.sha256;
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "report.json"), json(report), { flag: "wx" });
  fs.writeFileSync(path.join(output, "report.html"), finalReportHtml(report), { flag: "wx" });
  const unique = [...new Map(artifacts.map((a) => [a.path, a])).values()];
  const plan = { schema: "cts-private-evidence-packaging-plan-v1", createdAt: report.generatedAt, baseArchive,
    procedure: "Create a NEW versioned ZIP by retaining all existing base archive entries, adding the listed artifacts and this final report under unique relative paths, and adding a per-file SHA-256/size manifest. Verify each source file still matches its listed bytes/hash before packaging; archive the complete explicitly listed frozen core/scripts-lib/launcher/package snapshot. Verify CRC and every manifest hash. Keep raw runtime JSON compressed inside the ZIP; omit duplicate feeds because the exact compressed22-symbol feed is already in the base archive and the20-symbol subset can be reconstructed in its frozen order. Save the resulting new archive through the existing private Library identity/version workflow. Do not overwrite the existing local ZIP or publish/upload through this script.",
    scope: "Only explicit public-market study evidence and final test manifests; no databases, environment files, API keys, account state, credentials or unreviewed directory trees.",
    additions: unique.map((a) => ({ ...a, archivePath: a.archivePath ?? archivePath(a.path), compression: "deflate" })),
    verifiedInputFeeds: [...context.feeds.values()], frozenSourceSets: [...context.sourceSets].map(([sha256, result]) => ({ sha256, ...result })),
    finalReportFiles: ["report.json", "report.html", "packaging-plan.json"], pendingCases: cases.filter((c) => c.status !== "verified").map((c) => ({ id: c.id, status: c.status })),
    completeness: "Pending/failed runs remain disclosed; no unfinished raw file is treated as a completed result. Preserve failed attempt metadata separately." };
  fs.writeFileSync(path.join(output, "packaging-plan.json"), json(plan), { flag: "wx" });
  console.log(json({ output, complete: report.complete, cases: cases.map((c) => ({ id: c.id, status: c.status })), artifacts: unique.length, baseArchive }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await finalReportMain(process.argv.slice(2));
