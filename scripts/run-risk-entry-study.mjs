#!/usr/bin/env node
// Separate, prespecified account-risk study. No economic source, defaults or live settings are changed.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FEED_SHA256, SYMBOLS, assertEconomicSource, verifyFeed, sessionArguments } from "./run-exact-signal-study.mjs";
import { readSessionStudy, validateFrozenSessionResult, studyExactJson as exact, studySha256 as sha } from "./lib/session-study.mjs";
import { readSessionDump } from "./lib/session-dump.mjs";

export const ECONOMIC_COMMIT = "fdabcdb3f9daf17160873f98962dc265f9142159";
export const CANDIDATE = "entry5-gross1";
export const RISK_NODE_FLAGS = Object.freeze(["--max-old-space-size=8192", "--expose-gc", "--experimental-strip-types"]);
/** Keep every history chunk verified without retaining all tapes/checks alongside owned closes. */
export const readRiskSessionResult = (file) => readSessionDump(file, {
  loadTapeTrades: false, loadValidation: false, verifyUnloaded: true,
});
/** Assessment needs totals; preserve and verify every allocation manifest rather than hydrating it again. */
export const readRiskReportResult = (file) => readSessionDump(file, { loadSidecars: false, verifyUnloaded: true });
export const RISK_CASES = Object.freeze({
  "control-entry0-gross7": { entryLastN: 0, gross: 7 },
  "entry5-gross7": { entryLastN: 5, gross: 7 },
  "entry5-gross1": { entryLastN: 5, gross: 1 },
  "entry15-gross1": { entryLastN: 15, gross: 1 },
});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); };
const finite = (x) => typeof x === "number" && Number.isFinite(x);
export function riskCase(id) {
  if (!Object.hasOwn(RISK_CASES, id)) throw new Error(`Unknown prespecified risk case: ${id}`);
  return { id, ...RISK_CASES[id], purpose: "final", count: 22, runH: 24, symbols: [...SYMBOLS],
    evaluationFrom: "2026-10-14T15:00:00.000Z", start: "2026-10-14T21:00:00.000Z", end: "2026-10-15T21:00:00.000Z" };
}
/** Full saved WF timing is authoritative after launcher merging; never inherit the six-hour development simH. */
export function riskDesk(basis, spec) {
  const desk = structuredClone(basis);
  desk.settings.live = { ...desk.settings.live, enabled: false, maxPositions: 100, maxPositionX: 0.75, maxExposureX: spec.gross };
  desk.wf = { ...desk.wf, preH: 6, simH: 24, longH: 6, causalBase: true, recordValidation: true, lastN: spec.entryLastN,
    ...(spec.entryLastN ? { lastNMinPf: 1.2 } : {}) };
  return desk;
}
export function assertRiskProtocol(protocol, basis, spec) {
  const expected = riskDesk(basis, spec), s = protocol.actualSettings, w = protocol.actualWf;
  if (exact(s) !== exact(expected.settings) || exact(w) !== exact(expected.wf)) throw new Error("Risk protocol changed settings outside its prespecified full account/entry policy");
  if (protocol.feed?.sha256 !== FEED_SHA256 || exact(protocol.symbols) !== exact(SYMBOLS) ||
      protocol.window?.evaluationFromT !== Date.parse(spec.evaluationFrom) || protocol.window?.tradeStartT !== Date.parse(spec.start) ||
      protocol.window?.endT !== Date.parse(spec.end) || protocol.window?.runH !== 24 || protocol.window?.preH !== 6 ||
      s.cost !== 0.0015 || s.signals?.count !== 0 || !s.signals?.enabled || s.live?.enabled !== false || s.live.maxPositions !== 100 ||
      s.live.maxPositionX !== 0.75 || s.live.maxExposureX !== spec.gross || s.live.exposureScaler === false ||
      s.paperBalance !== 10 || s.sizing?.mode !== "equityPct" || s.sizing.pct !== 0.001 || protocol.account?.balance !== 10 || protocol.account?.leverage !== 10 ||
      w.preH !== 6 || w.longH !== 6 || w.simH !== 24 || w.recordValidation !== true || !w.causalBase ||
      w.lastN !== spec.entryLastN || (spec.entryLastN > 0 && w.lastNMinPf !== 1.2)) throw new Error("Frozen risk study account/window/qualification contract differs");
  return true;
}
export function assessRiskOutcome(audit, data, spec) {
  const checks = [], check = (name, passed, actual = null) => checks.push({ name, passed, actual });
  const engine = audit.cohorts?.find((x) => x.key === "Engine"), signals = audit.cohorts?.find((x) => x.key === "Signals");
  const measured = (row) => row?.state === "measured" && finite(row.exactPf) && row.exactPf > 1.2;
  const engineDirections = [-1, 1].map((side) => {
    const cells = (audit.cells ?? []).filter((x) => x.cohort === "Engine" && x.side === side);
    const known = cells.every((x) => finite(x.unitGp) && finite(x.unitGl));
    const gp = cells.reduce((n, x) => n + (x.unitGp ?? 0), 0), gl = cells.reduce((n, x) => n + (x.unitGl ?? 0), 0);
    return { side, closes: cells.reduce((n, x) => n + (x.closes ?? 0), 0), exactPf: known && gl > 0 ? gp / gl : null,
      state: !cells.length ? "empty" : !known ? "unknown" : gl > 0 ? "measured" : gp > 0 ? "no-loss" : "flat" };
  });
  const t = data.total ?? {}, marginOver = finite(t.marginOverMinutes) ? t.marginOverMinutes : t.marginOver?.minutes;
  const positiveHours = (audit.hours ?? []).filter((hour) => hour.fullHour && finite(hour.combined?.sizedNetUsd) && hour.combined.sizedNetUsd > 0).length;
  const identityOk = audit.purpose === "final" && audit.window?.hours === 24 && audit.window.startT === Date.parse(spec.start) && audit.window.endT === Date.parse(spec.end) &&
    exact([...(audit.window?.symbols ?? [])].sort()) === exact([...SYMBOLS].sort()) && audit.provenance?.study?.id === spec.id && audit.provenance.study.feedSha256 === FEED_SHA256;
  const capsOk = t.caps?.on === true && t.caps.maxPositionX === 0.75 && t.caps.maxExposureX === spec.gross;
  const integrityPassed = identityOk && capsOk && audit.checksOk === true && data.checksOk === true &&
    audit.checks?.length > 0 && audit.checks.every((x) => x.ok === true) &&
    data.study?.sourceSha256 === audit.provenance.study.sourceSha256 && data.study?.protocolSha256 === audit.provenance.study.protocolSha256;
  check("strict source/window/caps/report/independent arithmetic evidence", integrityPassed);
  check("primary post-Base Engine finite return PF > 1.2", measured(engine), engine?.exactPf);
  check("combined funded finite return PF > 1.2", measured(audit.total), audit.total?.exactPf);
  check("at least 1,000 primary Engine and combined funded settled closes", engine?.closes >= 1000 && audit.total?.closes >= 1000, { engine: engine?.closes, combined: audit.total?.closes });
  check("at least ten traded Engine and combined symbols", engine?.symbols >= 10 && audit.total?.symbols >= 10, { engine: engine?.symbols, combined: audit.total?.symbols });
  check("both Engine directions trade; own PF is reported separately", engineDirections.every((x) => x.closes > 0), engineDirections);
  check("Signal PF > 1.2 when Signal fills exist; empty is uncertified", !!signals && (signals.closes === 0 || measured(signals)), signals);
  check("at least 16 of 24 cash-positive hours", audit.hours?.length === 24 && positiveHours >= 16 && positiveHours === audit.account?.greenHours, positiveHours);
  check("positive closed cash and marked ending equity above starting capital", finite(audit.account?.closedNetUsd) && audit.account.closedNetUsd > 0 &&
    finite(audit.account.markedEndingEquity) && audit.account.markedEndingEquity > 10 && audit.account.startingBalance === 10, audit.account);
  check("marked equity remains strictly positive", finite(t.eqMin) && t.eqMin > 0 && !t.ruinT, { minimumEquity: t.eqMin, ruinT: t.ruinT });
  check("no modeled margin shortfall", t.feasible === true && finite(marginOver) && marginOver === 0, { feasible: t.feasible, marginOverMinutes: marginOver });
  check("marked equity drawdown <= 10%", finite(t.equityMaxDdPct) && t.equityMaxDdPct >= 0 && t.equityMaxDdPct <= 0.1, t.equityMaxDdPct);
  return { schema: "cts-risk-entry-study-result-v1", id: spec.id, candidate: spec.id === CANDIDATE, candidateFrozenBeforeHoldout: CANDIDATE,
    status: integrityPassed ? "complete" : "invalid-evidence", integrityPassed, researchAccepted: checks.every((x) => x.passed),
    scope: "Offline research only; acceptance never authorizes live trading, pruning, defaults or deployment.",
    signalEvidence: signals?.closes === 0 ? "empty-not-certified" : signals?.state ?? "unknown", engine, signals, combined: audit.total,
    engineDirections, combinedDirections: audit.byDirection, positiveHours, hours: 24,
    account: { ...audit.account, minimumEquity: t.eqMin, feasible: t.feasible, marginOverMinutes: marginOver },
    reportEvidence: { arraySidecars: data.arraySidecars ?? {}, allocationDetails: data.arraySidecars ? "lossless-verified-sidecars" : "legacy-inline" },
    checks, failedCriteria: checks.filter((x) => !x.passed).map((x) => x.name), performance: audit.performance };
}
async function main() {
  const args = process.argv.slice(2), arg = (key, fallback) => { const i = args.indexOf(`--${key}`); return i < 0 ? fallback : args[i + 1]; };
  if (args.includes("--help")) { console.log(`run-risk-entry-study --case ${Object.keys(RISK_CASES).join("|")} --feed FILE --out FRESH_DIR | --verify-feed FILE`); return; }
  if (arg("verify-feed")) { console.log(JSON.stringify(verifyFeed(arg("verify-feed")))); return; }
  if (args.includes("--validate-result")) {
    const sourceRoot = path.resolve(arg("source-root", ROOT));
    assertEconomicSource(sourceRoot, read(path.join(ROOT, "scripts/studies/baseline-2860c3f.json")), "corrected");
    validateFrozenSessionResult(await readRiskSessionResult(arg("raw")), arg("protocol"), sourceRoot);
    console.log(JSON.stringify({ strictFrozenResult: "passed" })); return;
  }
  if (args.includes("--assess-result")) {
    const outcome = assessRiskOutcome(read(arg("audit")), await readRiskReportResult(arg("data")), riskCase(arg("case")));
    write(arg("result"), outcome);
    if (!outcome.integrityPassed) throw new Error("Risk evidence failed integrity checks; outcome and failures retained");
    console.log(JSON.stringify({ id: outcome.id, status: outcome.status, researchAccepted: outcome.researchAccepted, failedCriteria: outcome.failedCriteria })); return;
  }
  const spec = riskCase(arg("case"));
  const runScope = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? "1"}` : "local";
  const out = path.resolve(arg("out", `runs/risk-entry-study-ci/${runScope}/${spec.id}`));
  if (["launcher.json", "failure.json", "source-preparation"].some((name) => fs.existsSync(path.join(out, name)))) throw new Error("Preserve failed/prior attempts; use a fresh --out directory");
  const evidence = path.join(out, "evidence"); fs.mkdirSync(evidence, { recursive: true });
  const commands = [], deadline = Date.now() + 40 * 60_000;
  const env = { ...process.env, CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0", CTS_CORE_WORKERS: "4", CTS_CORE_LIVE: "0",
    CTS_CORE_MEM_SOFT_MB: "2500", CTS_CORE_MEM_HARD_MB: "1200", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576", DATABASE_URL: "" };
  const run = (label, file, argv, allowFailure = false) => new Promise((resolve, reject) => {
    const log = path.join(evidence, `${label}.log`), fd = fs.openSync(log, "wx"), start = Date.now();
    const command = { label, argv: [process.execPath, ...RISK_NODE_FLAGS, file, ...argv], log: path.relative(out, log) }; commands.push(command);
    const child = spawn(process.execPath, command.argv.slice(1), { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { fs.writeSync(fd, chunk); process.stdout.write(chunk); });
    const timer = setTimeout(() => { child.kill("SIGTERM"); const kill = setTimeout(() => child.kill("SIGKILL"), 5000); kill.unref(); }, Math.max(1000, deadline - Date.now()));
    child.once("error", (error) => { clearTimeout(timer); fs.closeSync(fd); reject(error); });
    child.once("close", (code, signal) => { clearTimeout(timer); fs.closeSync(fd); Object.assign(command, { exitCode: code, signal, seconds: (Date.now() - start) / 1000 });
      if (code !== 0 && !allowFailure) reject(new Error(`${label} failed: exit ${code}, signal ${signal}; retained ${log}`)); else resolve(code); });
  });
  let launch;
  try {
    const feed = verifyFeed(path.resolve(arg("feed", "runs/eval-22-20261017/feed.json")));
    const metadata = read(path.join(ROOT, "scripts/studies/baseline-2860c3f.json"));
    if (metadata.correctedEconomicCommit !== ECONOMIC_COMMIT || metadata.files.length !== 82) throw new Error("Risk study requires its exact fdabcdb economic source manifest");
    assertEconomicSource(ROOT, metadata, "corrected");
    const prep = path.join(out, "source-preparation");
    await run("source-proof", "scripts/run-exact-signal-study.mjs", ["--case", "corrected20", "--out", prep, "--source-check-only"]);
    const proof = read(path.join(prep, "source-proof.json")), baselineRoot = path.join(prep, "source-baseline");
    write(path.join(out, "source-proof.json"), proof);
    const freeze = async (id, supplied) => {
      const dir = path.join(out, "frozen", id), argv = ["--root", ROOT, "--basis-root", baselineRoot, "--feed", feed.path, "--symbols", SYMBOLS.join(","),
        "--evaluation-from", spec.evaluationFrom, "--end-at", spec.end, "--pre", "6", "--run", "24", "--id", id, "--out", dir,
        ...(supplied ? ["--settings", supplied] : [])];
      await run(`freeze-${id}`, "scripts/freeze-session-study.mjs", argv);
      return { desk: path.join(dir, "desk.json"), protocol: path.join(dir, "protocol.json") };
    };
    const basis = await freeze("full-baseline-basis"), basisDesk = read(basis.desk);
    const settingsFile = path.join(out, "frozen", "risk-full-desk.json"); write(settingsFile, riskDesk(basisDesk, spec));
    const chosen = await freeze(spec.id, settingsFile), protocol = read(chosen.protocol);
    assertRiskProtocol(protocol, basisDesk, spec); readSessionStudy(chosen.protocol, ROOT); assertEconomicSource(ROOT, metadata, "corrected");
    launch = { schema: "cts-risk-entry-study-launch-v1", id: spec.id, status: "running", createdAt: new Date().toISOString(), spec,
      candidateFrozenBeforeHoldout: CANDIDATE, policy: "No pruning/default changes; control and other entry/gross arms diagnostic; no automatic live promotion.",
      sourceEconomicCommit: ECONOMIC_COMMIT, economicFileCount: 82, feed, sourceSha256: protocol.source.sha256, protocolSha256: sha(fs.readFileSync(chosen.protocol)),
      settingsSha256: sha(exact(protocol.actualSettings)), wfSha256: sha(exact(protocol.actualWf)),
      explicitAccountChangesFromUncappedDevelopment: { maxPositionX: 0.75, maxExposureX: spec.gross },
      resourcePolicy: { workers: 4, maxMinutes: 40, mainChildHeapLimitMb: 8192, heapLimitViaNodeOptions: false,
        losslessBoundedSidecars: true, verifyEverySidecarBeforeAndAfterReport: true, outputRunScope: runScope,
        requiredMemoryFallback: 0, backgroundPresetComparison: false, isolatedPublicStandardRunner: true }, commands };
    write(path.join(out, "launcher.json"), launch);
    await run("simulation", "scripts/core-session.mjs", sessionArguments(spec, { feed: feed.path, desk: chosen.desk, protocol: chosen.protocol, evidence }));
    await run("validate-dump", "scripts/run-risk-entry-study.mjs", ["--validate-result", "--raw", path.join(evidence, "raw.json"), "--protocol", chosen.protocol]);
    const reportCode = await run("report", "scripts/core-session.mjs", ["--replay", path.join(evidence, "raw.json"), "--frozen-session", chosen.protocol,
      "--signal-progress", "--chunk-allocations", "--out", path.join(evidence, "report"), "--html", path.join(evidence, "html"), "--writeup", path.join(evidence, "summary.md"), "--quiet", "true"], true);
    const auditCode = await run("audit", "scripts/audit-session-study.mjs", ["--raw", path.join(evidence, "raw.json"), "--data", path.join(evidence, "html/data.json"),
      "--out", path.join(evidence, "audit"), "--purpose", "final", "--protocol", chosen.protocol], true);
    if (reportCode || auditCode) throw new Error("Strict report or independent arithmetic audit failed; all artifacts retained");
    await run("assessment", "scripts/run-risk-entry-study.mjs", ["--assess-result", "--case", spec.id, "--audit", path.join(evidence, "audit.json"),
      "--data", path.join(evidence, "html/data.json"), "--result", path.join(evidence, "risk-result.json")]);
    await run("validate-final-dump", "scripts/run-risk-entry-study.mjs", ["--validate-result", "--raw", path.join(evidence, "raw.json"), "--protocol", chosen.protocol]);
    verifyFeed(feed.path); assertEconomicSource(ROOT, metadata, "corrected"); assertEconomicSource(baselineRoot, metadata, "baseline");
    readSessionStudy(chosen.protocol, ROOT); assertRiskProtocol(read(chosen.protocol), basisDesk, spec);
    const result = read(path.join(evidence, "risk-result.json"));
    launch.status = "complete"; launch.result = { researchAccepted: result.researchAccepted, failedCriteria: result.failedCriteria,
      enginePf: result.engine?.exactPf, combinedPf: result.combined?.exactPf, fundedCloses: result.combined?.closes,
      greenHours: result.positiveHours, equityMaxDdPct: result.account.equityMaxDdPct, minimumEquity: result.account.minimumEquity,
      feasible: result.account.feasible, marginOverMinutes: result.account.marginOverMinutes,
      resultSha256: sha(fs.readFileSync(path.join(evidence, "risk-result.json"))) };
    write(path.join(out, "launcher.json"), launch);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${spec.id}\n\nCompleted offline research; frozen candidate: ${CANDIDATE}. Research criteria: **${result.researchAccepted ? "PASS" : "FAIL"}**. Engine PF ${result.engine?.exactPf ?? result.engine?.state}, combined PF ${result.combined?.exactPf ?? result.combined?.state}; ${result.combined?.closes} funded closes; ${result.positiveHours}/24 cash-positive hours; marked DD ${(100 * result.account.equityMaxDdPct).toFixed(2)}%; minimum equity $${result.account.minimumEquity}; margin-shortfall minutes ${result.account.marginOverMinutes}. ${result.failedCriteria.join("; ") || "All prespecified criteria met"}. All losses, empty Signals and direction PF remain in artifacts. No live action or pruning.\n`);
    console.log(JSON.stringify({ id: spec.id, status: "complete", ...launch.result }));
  } catch (error) {
    write(path.join(out, "failure.json"), { id: spec.id, status: "failed", at: new Date().toISOString(), error: String(error), commands, launch: launch ?? null,
      limitation: "Incomplete arithmetic/source/coverage evidence is not a completed study; a completed economic or feasibility failure is retained as such." });
    if (launch) { launch.status = "failed"; write(path.join(out, "launcher.json"), launch); }
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
