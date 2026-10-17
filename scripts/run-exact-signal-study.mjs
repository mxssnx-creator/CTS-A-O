#!/usr/bin/env node
// Isolated offline study launcher. Kept outside the economic/report source-seal paths.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const FEED_SHA256 = "84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019";
export const SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT", "ATOM", "APT", "NEAR", "SUI", "TRX", "UNI", "FIL", "ETC", "ARB", "OP", "XLM"].map((s) => `${s}-USDT`);
export const STUDY_CASES = Object.freeze({
  baseline20: { purpose: "development", baseline: true, count: 20, evaluationFrom: "2026-10-12T03:00:00.000Z", start: "2026-10-12T09:00:00.000Z", end: "2026-10-12T15:00:00.000Z", runH: 6 },
  corrected20: { purpose: "development", baseline: false, count: 20, evaluationFrom: "2026-10-12T03:00:00.000Z", start: "2026-10-12T09:00:00.000Z", end: "2026-10-12T15:00:00.000Z", runH: 6 },
  "dev20-entry5": { purpose: "development", baseline: false, count: 20, evaluationFrom: "2026-10-12T03:00:00.000Z", start: "2026-10-12T09:00:00.000Z", end: "2026-10-12T15:00:00.000Z", runH: 6, entryLastN: 5 },
  "dev20-entry15": { purpose: "development", baseline: false, count: 20, evaluationFrom: "2026-10-12T03:00:00.000Z", start: "2026-10-12T09:00:00.000Z", end: "2026-10-12T15:00:00.000Z", runH: 6, entryLastN: 15 },
  selection22: { purpose: "selection", baseline: false, count: 22, evaluationFrom: "2026-10-13T09:00:00.000Z", start: "2026-10-13T15:00:00.000Z", end: "2026-10-14T15:00:00.000Z", runH: 24 },
  final22: { purpose: "final", baseline: false, count: 22, evaluationFrom: "2026-10-15T15:00:00.000Z", start: "2026-10-15T21:00:00.000Z", end: "2026-10-16T21:00:00.000Z", runH: 24 },
});
const rootOfScript = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object"
  ? Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined).map((k) => [k, canonical(x[k])])) : x;
const exact = (x) => JSON.stringify(canonical(x));
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); };

export function studyCase(name) {
  if (!Object.hasOwn(STUDY_CASES, name)) throw new Error(`Unknown fixed study case: ${name}`);
  return { id: name, ...STUDY_CASES[name], symbols: SYMBOLS.slice(0, STUDY_CASES[name].count) };
}
export function assertProtocolPair(baseline, corrected) {
  for (const key of ["actualSettings", "actualWf", "symbols", "window", "account", "feed"])
    if (exact(baseline[key]) !== exact(corrected[key])) throw new Error(`Development arm parity differs: ${key}`);
  if (baseline.actualSettings.cost !== 0.0015 || baseline.actualSettings.signals.count !== 0 ||
      baseline.actualSettings.live.enabled !== false || baseline.actualSettings.live.maxPositions !== 100 ||
      baseline.actualWf.preH !== 6 || baseline.actualWf.longH !== 6 || !baseline.actualWf.causalBase)
    throw new Error("Frozen economic/account safety contract differs");
  return true;
}
export function assertSelectionConclusion(audit, sourceSha256) {
  const fold = studyCase("selection22"), actual = audit.provenance?.study;
  if (audit.purpose !== "selection" || audit.checksOk !== true || audit.pruning?.assessmentAllowed !== true ||
      audit.window?.startT !== Date.parse(fold.start) || audit.window?.endT !== Date.parse(fold.end) ||
      exact([...(audit.window?.symbols ?? [])].sort()) !== exact([...fold.symbols].sort()) || actual?.feedSha256 !== FEED_SHA256 ||
      actual?.sourceSha256 !== sourceSha256)
    throw new Error("Final window requires the completed matching 22-symbol selection conclusion first");
  return true;
}
export function foldDesk(desk, spec) {
  const out = structuredClone(desk);
  // The freezer/session merges saved WF after CLI bounds, so override this fold's full timing in the saved WF.
  out.wf = { ...out.wf, preH: 6, longH: 6, simH: spec.runH,
    ...(spec.count === 22 ? { recordValidation: true } : {}),
    ...(spec.entryLastN ? { lastN: spec.entryLastN, lastNMinPf: 1.2 } : {}) };
  return out;
}
export function economicFiles(root) {
  const visit = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? visit(path.join(dir, x.name))
    : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name) && !/\.test\.[^.]+$/.test(x.name) && x.name !== "test-support.ts" ? [path.relative(root, path.join(dir, x.name))] : []);
  return visit(path.join(root, "src/core")).sort();
}
export function assertEconomicSource(root, manifest, arm) {
  const field = arm === "baseline" ? "baselineSha256" : arm === "corrected" ? "correctedSha256" : null;
  if (!field) throw new Error("Economic source arm must be baseline or corrected");
  const expected = manifest.files.filter((x) => x[field] !== null);
  if (exact(economicFiles(root)) !== exact(expected.map((x) => x.path).sort())) throw new Error(`${arm} economic source inventory differs`);
  for (const row of expected) if (sha(fs.readFileSync(path.join(root, row.path))) !== row[field]) throw new Error(`${arm} economic source differs: ${row.path}`);
}
export function verifyFeed(file) {
  const actual = sha(fs.readFileSync(file));
  if (actual !== FEED_SHA256) throw new Error(`Frozen public feed SHA256 differs: ${actual}`);
  const manifest = json(path.join(path.dirname(file), "manifest.json"));
  if (manifest.status !== "complete" || manifest.feed?.sha256 !== FEED_SHA256 || manifest.feed?.symbols !== 22 ||
      manifest.feed?.oneMinuteBars !== 665280 || exact(manifest.configuration?.symbols) !== exact(SYMBOLS) ||
      Object.keys(manifest.artifacts ?? {}).length !== 462 || Object.values(manifest.artifacts).some((x) => x.status !== "verified" || x.checksumStatus !== "verified" || x.coverage?.bars !== 1440))
    throw new Error("Public archive manifest lacks complete exact symbol/checksum/coverage evidence");
  return { path: path.resolve(file), sha256: actual, bytes: fs.statSync(file).size, symbols: 22, oneMinuteBars: 665280 };
}

function commonReporter(root) {
  const visit = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? visit(path.join(dir, x.name))
    : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name) && !/\.test\.[^.]+$/.test(x.name) ? [path.join(dir, x.name)] : []);
  return [...visit(path.join(root, "scripts/lib")), path.join(root, "scripts/core-session.mjs"), path.join(root, "package.json")]
    .sort().map((file) => ({ path: path.relative(root, file), sha256: sha(fs.readFileSync(file)) }));
}
function prepareBaseline(root, out) {
  const metadataPath = path.join(root, "scripts/studies/baseline-2860c3f.json"), metadata = json(metadataPath);
  const patchPath = path.join(root, "scripts/studies", metadata.patch);
  if (sha(fs.readFileSync(patchPath)) !== metadata.patchSha256) throw new Error("Baseline patch changed from its economic-source manifest");
  assertEconomicSource(root, metadata, "corrected");
  const baselineRoot = path.join(out, "source-baseline");
  if (fs.existsSync(baselineRoot)) throw new Error("Preserve existing study attempts; choose a new --out directory");
  execFileSync("git", ["worktree", "add", "--detach", baselineRoot, "HEAD"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["apply", "--unidiff-zero", "--check", patchPath], { cwd: baselineRoot, stdio: "pipe" });
  execFileSync("git", ["apply", "--unidiff-zero", patchPath], { cwd: baselineRoot, stdio: "pipe" });
  assertEconomicSource(baselineRoot, metadata, "baseline");
  if (exact(commonReporter(root)) !== exact(commonReporter(baselineRoot))) throw new Error("Baseline/current reporter instrumentation differs");
  if (fs.existsSync(path.join(root, "node_modules"))) fs.symlinkSync(path.join(root, "node_modules"), path.join(baselineRoot, "node_modules"), "dir");
  const proof = { schema: metadata.schema, baselineEconomicCommit: metadata.baselineEconomicCommit,
    correctedEconomicCommit: metadata.correctedEconomicCommit, patchSha256: metadata.patchSha256,
    checkedOutCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    baselineScope: "Patched baseline economic sources, with current common report/freeze instrumentation; not a checkout of the baseline commit", economicFiles: metadata.files,
    commonReporterSha256: sha(exact(commonReporter(root))), commonReporter: commonReporter(root) };
  write(path.join(out, "source-proof.json"), proof);
  return { baselineRoot, proof };
}

export function sessionArguments(spec, { feed, desk, protocol, evidence }) {
  return ["--symbols", String(spec.count), "--pre", "6", "--run", String(spec.runH), "--end-at", spec.end,
    "--evaluation-from", spec.evaluationFrom, "--selection-hours", "6", "--live-since", spec.start,
    "--feed", feed, "--desk", desk, "--frozen-session", protocol, "--signals", "on",
    "--balance", "10", "--pct", "0.001", "--leverage", "10", "--signal-progress", "--dump-only", "--tape-trades",
    "--dump", path.join(evidence, "raw.json"), "--quiet", "true", "--max-wait-min", "25", "--paper-wait-s", "300"];
}
async function main() {
  const args = process.argv.slice(2), arg = (key, fallback) => { const i = args.indexOf(`--${key}`); return i < 0 ? fallback : args[i + 1]; };
  if (args.includes("--help")) { console.log("run-exact-signal-study --case baseline20|corrected20|dev20-entry5|dev20-entry15|selection22|final22 --feed FILE --out DIR [--selection-audit FILE] [--source-check-only] | --verify-feed FILE"); return; }
  if (arg("verify-feed")) { console.log(JSON.stringify(verifyFeed(arg("verify-feed")))); return; }
  const root = rootOfScript, spec = studyCase(arg("case")), out = path.resolve(arg("out", `runs/exact-signal-study-ci/${spec.id}`));
  if (fs.existsSync(path.join(out, "launcher.json")) || fs.existsSync(path.join(out, "failure.json"))) throw new Error("Preserve the previous attempt; use a fresh output directory");
  fs.mkdirSync(path.join(out, "evidence"), { recursive: true });
  const evidence = path.join(out, "evidence"), deadline = Date.now() + 36 * 60_000;
  const env = { ...process.env, CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_WORKERS: "4",
    CTS_CORE_MEM_SOFT_MB: "2500", CTS_CORE_MEM_HARD_MB: "1200", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576" };
  const node = ["--expose-gc", "--experimental-strip-types"];
  const commands = [];
  const run = (label, file, argv, cwd = root, allowFailure = false) => new Promise((resolve, reject) => {
    const log = path.join(evidence, `${label}.log`), fd = fs.openSync(log, "wx"), start = Date.now();
    const command = { label, cwd, argv: [process.execPath, ...node, file, ...argv], log: path.relative(out, log) }; commands.push(command);
    const child = spawn(process.execPath, [...node, file, ...argv], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { fs.writeSync(fd, chunk); process.stdout.write(chunk); });
    const timer = setTimeout(() => { child.kill("SIGTERM"); const kill = setTimeout(() => child.kill("SIGKILL"), 5000); kill.unref(); }, Math.max(1000, deadline - Date.now()));
    child.on("error", (error) => { clearTimeout(timer); fs.closeSync(fd); reject(error); });
    child.on("close", (code, signal) => { clearTimeout(timer); fs.closeSync(fd); Object.assign(command, { exitCode: code, signal, seconds: (Date.now() - start) / 1000 });
      if (code !== 0 && !allowFailure) reject(new Error(`${label} failed: exit ${code}, signal ${signal}; retained ${log}`)); else resolve(code); });
  });
  let launch;
  try {
    const { baselineRoot, proof } = prepareBaseline(root, out);
    if (args.includes("--source-check-only")) { console.log(JSON.stringify({ sourceCheck: "passed", baselineRoot, files: proof.economicFiles.length, patchSha256: proof.patchSha256 })); return; }
    const feed = verifyFeed(path.resolve(arg("feed", "runs/eval-22-20261017/feed.json")));
    const frozen = path.join(out, "frozen");
    const freeze = async (id, sourceRoot, fold, suppliedDesk) => {
      const dir = path.join(frozen, id);
      const argv = ["--root", sourceRoot, "--basis-root", baselineRoot, "--feed", feed.path, "--symbols", fold.symbols.join(","),
        "--evaluation-from", fold.evaluationFrom, "--end-at", fold.end, "--pre", "6", "--run", String(fold.runH), "--id", id, "--out", dir,
        ...(suppliedDesk ? ["--settings", suppliedDesk] : [])];
      await run(`freeze-${id}`, path.join(root, "scripts/freeze-session-study.mjs"), argv);
      return { dir, protocol: path.join(dir, "protocol.json"), desk: path.join(dir, "desk.json") };
    };
    const baseline = await freeze("baseline20", baselineRoot, studyCase("baseline20"));
    const corrected = await freeze("corrected20", root, studyCase("corrected20"), baseline.desk);
    const bp = json(baseline.protocol), cp = json(corrected.protocol);
    assertProtocolPair(bp, cp);
    write(path.join(frozen, "development-pair-parity.json"), { passed: true, baselineProtocolSha256: sha(fs.readFileSync(baseline.protocol)),
      correctedProtocolSha256: sha(fs.readFileSync(corrected.protocol)), settingsSha256: sha(exact(bp.actualSettings)), wfSha256: sha(exact(bp.actualWf)),
      feedSha256: feed.sha256, economics: { cost: 0.0015, balance: 10, leverage: 10, pct: 0.001, count: 0, preH: 6, selectionHours: 6 }, directionPolicy: "Both directions enabled; empty realized sides remain explicit" });
    let chosen = spec.id === "baseline20" ? baseline : spec.id === "corrected20" ? corrected : null;
    if (!chosen) {
      const settingsFile = path.join(frozen, "full-validation-desk.json"), fullDesk = foldDesk(json(corrected.desk), spec);
      write(settingsFile, fullDesk);
      chosen = await freeze(spec.id, root, spec, settingsFile);
    }
    const protocol = json(chosen.protocol), sourceRoot = spec.baseline ? baselineRoot : root;
    let selectionConclusion = null;
    if (spec.id === "final22") {
      const selectionFile = arg("selection-audit");
      if (!selectionFile) throw new Error("final22 requires --selection-audit before its untouched window can run");
      const bytes = fs.readFileSync(selectionFile), audit = JSON.parse(bytes);
      assertSelectionConclusion(audit, protocol.source.sha256);
      selectionConclusion = { path: path.resolve(selectionFile), sha256: sha(bytes), checksOk: true, pruningAssessmentAllowed: true,
        researchProposalCount: audit.pruning.candidates.length, policy: "Proposals retained as diagnostics. Final uses the unchanged unpruned frozen policy; no automatic pruning or live promotion." };
    }
    launch = { schema: "cts-exact-signal-ci-launch-v1", id: spec.id, createdAt: new Date().toISOString(), fold: spec, feed,
      economicBaseline: proof.baselineEconomicCommit, economicCorrected: proof.correctedEconomicCommit, patchSha256: proof.patchSha256,
      sourceSha256: protocol.source.sha256, protocolSha256: sha(fs.readFileSync(chosen.protocol)), selectionConclusion,
      researchPolicy: spec.entryLastN ? { scope: "Development-only additional exact-config causal entry check; no automatic selection, pruning or promotion", lastN: spec.entryLastN, lastNMinPf: 1.2 } : null,
      resourcePolicy: { workers: 4, variants: false, availableMemoryHardReserveMb: 1200, availableMemorySoftReserveMb: 2500,
        hostMemoryMb: Math.round(os.totalmem() / 1048576), cpuParallelism: os.availableParallelism(), requiredMemoryFallback: 0, maxDriverMinutes: 36 },
      phases: "Separate dump-only process with tape trades and Signal progress, then common reporter/allocation replay, then independent auditor", commands };
    write(path.join(out, "launcher.json"), launch);
    await run("simulation", path.join(sourceRoot, "scripts/core-session.mjs"), sessionArguments(spec, { feed: feed.path, desk: chosen.desk, protocol: chosen.protocol, evidence }), sourceRoot);
    const renderCode = await run("report", path.join(sourceRoot, "scripts/core-session.mjs"), ["--replay", path.join(evidence, "raw.json"),
      "--frozen-session", chosen.protocol, "--signal-progress", "--out", path.join(evidence, "report"), "--html", path.join(evidence, "html"),
      "--writeup", path.join(evidence, "summary.md"), "--quiet", "true"], sourceRoot, true);
    const auditCode = await run("audit", path.join(root, "scripts/audit-session-study.mjs"), ["--raw", path.join(evidence, "raw.json"),
      "--data", path.join(evidence, "html/data.json"), "--out", path.join(evidence, "audit"), "--purpose", spec.purpose, "--protocol", chosen.protocol], root, true);
    const audit = json(path.join(evidence, "audit.json")), report = json(path.join(evidence, "html/data.json"));
    if (renderCode || auditCode || audit.checksOk !== true || report.checksOk !== true) throw new Error("Strict common report or independent audit failed; all artifacts retained");
    launch.status = "complete"; launch.result = { fundedCloses: audit.total.closes, returnPf: audit.total.exactPf, state: audit.total.state,
      greenHours: audit.account.greenHours, hours: audit.window.hours, checks: audit.checks.length, pruningAssessmentAllowed: audit.pruning.assessmentAllowed,
      sourceSha256: protocol.source.sha256, rawSha256: sha(fs.readFileSync(path.join(evidence, "raw.json"))), auditSha256: sha(fs.readFileSync(path.join(evidence, "audit.json"))) };
    write(path.join(out, "launcher.json"), launch);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${spec.id}\n\nOffline model: ${audit.total.closes} funded settled closes; Return PF ${audit.total.noLoss ? "no losses (finite gate score, not exact PF)" : audit.total.exactPf ?? audit.total.state}; positive hours ${audit.account.greenHours}/${audit.window.hours}. ${audit.checks.length} audit checks passed. Full hourly/type/range/side and raw evidence are artifacts. No live trades or promotion.\n`);
    console.log(JSON.stringify({ case: spec.id, status: "complete", ...launch.result }));
  } catch (error) {
    const failure = { case: spec.id, status: "failed", at: new Date().toISOString(), error: String(error), commands, launch: launch ?? null,
      limitation: "A failure, fallback or incomplete universe is not completed profitability evidence; raw attempts remain preserved." };
    write(path.join(out, "failure.json"), failure);
    if (launch) { launch.status = "failed"; write(path.join(out, "launcher.json"), launch); }
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${spec.id}: incomplete\n\n${String(error).replace(/[\r\n]/g, " ")}\n\nNo performance claim. Failed attempts and logs retained.\n`);
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
