#!/usr/bin/env node
// Serial, resource-admitted frozen offline sessions. A valid losing/empty run is complete evidence, not promotion.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, openSync, closeSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { memInfo } from "../src/core/server/memguard.server.ts";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const errorText = (error) => error instanceof Error ? error.message : String(error);
const cancelled = () => Object.assign(new Error("Frozen session cancelled"), { code: "CTS_SESSION_CANCELLED" });
const resourceBlocked = () => Object.assign(new Error("No stable memory headroom before admission deadline; no run scored"), { code: "CTS_SESSION_RESOURCE_BLOCKED" });
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object"
  ? Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined).map((k) => [k, canonical(x[k])])) : x;
const exact = (x) => JSON.stringify(canonical(x));

export function writeLauncherStatus(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { flag: "wx" }); renameSync(temp, file); }
  finally { try { unlinkSync(temp); } catch (error) { if (error.code !== "ENOENT") throw error; } }
}

function delay(ms, signal) {
  if (signal?.aborted) return Promise.reject(cancelled());
  return new Promise((done, reject) => {
    const finish = (error) => { clearTimeout(timer); signal?.removeEventListener("abort", abort); error ? reject(error) : done(); };
    const abort = () => finish(cancelled());
    const timer = setTimeout(() => finish(), ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function waitForSessionHeadroom({ available = () => memInfo().availMb, minFreeMb = 3500,
  samples = 3, pollMs = 5000, timeoutMs = 10 * 60_000, signal, onStatus = () => {}, now = Date.now, sleep = delay } = {}) {
  if (!Number.isFinite(minFreeMb) || !(minFreeMb >= 3500) || !Number.isInteger(samples) || samples < 3 ||
    !Number.isFinite(pollMs) || !(pollMs > 0) || !Number.isFinite(timeoutMs) || !(timeoutMs > 0))
    throw new Error("Admission requires at least 3500 MB and three separated samples with positive deadlines");
  const started = now();
  let stable = 0;
  for (;;) {
    if (signal?.aborted) throw cancelled();
    if (now() - started > timeoutMs) throw resourceBlocked();
    const availMb = available();
    stable = Number.isFinite(availMb) && availMb >= minFreeMb ? stable + 1 : 0;
    onStatus({ state: "waiting", stage: "headroom", availMb, stable, requiredMb: minFreeMb, requiredSamples: samples });
    if (stable >= samples) return { availMb, waitedMs: now() - started };
    if (now() - started >= timeoutMs) throw resourceBlocked();
    await sleep(Math.min(pollMs, timeoutMs - (now() - started)), signal);
  }
}

/** One owned child; all exit/error/monitor/deadline paths close descriptors and clear timers/listeners. */
export async function runSessionChild({ command = process.execPath, args = [], cwd, env = process.env, logPath,
  deadlineMs = 60 * 60_000, graceMs = 10_000, pollMs = 2000, signal, monitor = () => null, onSpawn = () => {} }) {
  if (![deadlineMs, graceMs, pollMs].every((x) => Number.isFinite(x) && x > 0)) throw new Error("Child deadlines must be finite and positive");
  if (signal?.aborted) throw cancelled();
  const fd = openSync(logPath, "wx");
  let child, timer, watcher, escalation, failure = null, forcedKill = false, finished = false;
  const started = Date.now();
  const stop = (kind, message) => {
    failure ??= { kind, message };
    if (finished || !child?.pid) return;
    try { child.kill("SIGINT"); } catch (error) { failure.signalError = errorText(error); }
    escalation ??= setTimeout(() => {
      if (!finished) {
        forcedKill = true;
        try { child.kill("SIGKILL"); } catch (error) { failure.killError = errorText(error); }
      }
    }, graceMs);
  };
  const abort = () => stop("cancelled", "Frozen session cancelled");
  try {
    child = spawn(command, args, { cwd, env, stdio: ["ignore", fd, fd] });
    const result = await new Promise((done) => {
      child.once("error", (error) => { failure ??= { kind: "spawn-error", message: errorText(error) }; });
      child.once("close", (code, exitSignal) => { finished = true; done({ code, signal: exitSignal }); });
      child.once("spawn", () => {
        try { onSpawn({ pid: child.pid }); } catch (error) { stop("status-error", errorText(error)); }
        if (signal?.aborted) abort();
      });
      signal?.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => stop("deadline", `Child exceeded ${deadlineMs} ms deadline`), deadlineMs);
      watcher = setInterval(() => {
        if (failure || finished) return;
        try { const reason = monitor(); if (reason) stop("monitor", String(reason)); }
        catch (error) { stop("monitor-error", errorText(error)); }
      }, pollMs);
    });
    return { ...result, failure, forcedKill, pid: child.pid ?? null, elapsedMs: Date.now() - started };
  } finally {
    clearTimeout(timer); clearTimeout(escalation); clearInterval(watcher);
    signal?.removeEventListener("abort", abort);
    closeSync(fd);
  }
}

export function reserveSessionAttempt(jobDir, now = new Date()) {
  const parent = join(jobDir, "attempts");
  mkdirSync(parent, { recursive: true });
  return mkdtempSync(join(parent, now.toISOString().replace(/[:.]/g, "-") + "-"));
}

export function frozenSessionInvocation(root, attempt, protocol, sourceEnv = process.env) {
  const account = protocol.account;
  if (!account || !(account.balance > 0) || !(account.leverage > 0) || account.sizing?.mode !== "equityPct" || !(account.sizing.pct > 0))
    throw new Error("Frozen session requires explicit positive balance/leverage and equityPct sizing");
  if (protocol.actualSettings?.live?.enabled !== false) throw new Error("Frozen launcher requires live trading disabled");
  const env = { ...sourceEnv };
  for (const key of Object.keys(env))
    if (/^(BINGX|BINANCE|BYBIT|OKX|CTS_CORE_|CTS_TEST_)/i.test(key)) delete env[key];
  delete env.NODE_TEST_CONTEXT; delete env.NODE_V8_COVERAGE;
  Object.assign(env, { CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_WORKERS: "1",
    CTS_CORE_LIVE: "0", CTS_CORE_COMPARE: "0", CTS_CORE_MEM_HARD_MB: "1200", CTS_CORE_MEM_SOFT_MB: "2500",
    MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576",
    NODE_OPTIONS: `--require ${JSON.stringify(resolve(root, "scripts/lib/core-test-offline-guard.cjs"))}` });
  return { command: process.execPath, cwd: root, env, args: ["--expose-gc", "--experimental-strip-types", "--no-warnings",
    resolve(root, "scripts/core-session.mjs"), "--symbols", String(protocol.symbols.length),
    "--pre", String(protocol.window.preH), "--run", String(protocol.window.runH),
    "--end-at", new Date(protocol.window.endT).toISOString(), "--evaluation-from", new Date(protocol.window.evaluationFromT).toISOString(),
    "--selection-hours", String(protocol.actualWf.longH), "--live-since", new Date(protocol.liveSinceT).toISOString(),
    "--feed", resolve(root, protocol.feed.path), "--desk", join(attempt, "desk.json"), "--frozen-session", join(attempt, "protocol.json"),
    "--signals", protocol.actualSettings.signals.enabled ? "on" : "off", "--balance", String(account.balance),
    "--pct", String(account.sizing.pct), "--leverage", String(account.leverage), "--signal-progress",
    "--out", join(attempt, "report"), "--writeup", join(attempt, "writeup.md"), "--html", join(attempt, "html"),
    "--dump", join(attempt, "raw.json"), "--quiet", "true", "--max-wait-min", "30", "--paper-wait-s", "900"] };
}

/** Additional completion gate: an arithmetic audit or a zero process exit alone cannot certify this. */
export function assertSessionCompletion(raw, report, protocol) {
  const expected = [...protocol.symbols].sort();
  if (exact([...(raw.symbols ?? [])].sort()) !== exact(expected) || exact([...(raw.engine?.universe ?? [])].sort()) !== exact(expected))
    throw new Error("Incomplete frozen symbol universe");
  const mem = raw.engine?.mem;
  if (!mem || ["computeLevel", "fallback", "aborts"].some((key) => mem[key] !== 0))
    throw new Error("Memory coverage is degraded or unknown");
  const coverage = raw.engine?.coverage;
  if (!coverage || !Number.isInteger(coverage.expectedCombos) || coverage.expectedCombos < 1 || coverage.evaluated !== coverage.expectedCombos)
    throw new Error("Missing or incomplete configured combo coverage");
  if (!(raw.engine?.computes > 0) || raw.engine?.paperSelectionAfterCompute?.complete !== true)
    throw new Error("Full compute/paper publication is incomplete");
  if (report.checksOk !== true || !Array.isArray(report.checks) || !report.checks.length || report.checks.some((x) => x.ok !== true))
    throw new Error("Report consistency checks are incomplete or failed");
  if (!raw.study || exact(raw.study) !== exact(report.study)) throw new Error("Raw/report frozen provenance differs");
  if (raw.settings?.cost !== protocol.actualSettings.cost) throw new Error("Recorded modeled cost differs from the frozen settings");
  if (exact(report.symbols) !== exact(raw.symbols) || report.window?.startT !== raw.window?.startT || report.window?.endT !== raw.window?.endT)
    throw new Error("Report symbol/time scope differs");
  const startT = protocol.window.tradeStartT, endT = protocol.window.endT, hours = report.hours ?? [];
  if (hours.length !== Math.ceil((endT - startT) / 3_600_000) || hours.some((h, i) => h.t !== startT + i * 3_600_000))
    throw new Error("Hourly account coverage is incomplete");
}

async function hashFile(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

export async function verifySessionAttempt(root, attempt, purpose = "development") {
  const study = await import(pathToFileURL(resolve(root, "scripts/lib/session-study.mjs")).href);
  const auditModule = await import(pathToFileURL(resolve(root, "scripts/audit-session-study.mjs")).href);
  const protocolPath = join(attempt, "protocol.json"), sealed = study.readSessionStudy(protocolPath, root);
  const rawBytes = readFileSync(join(attempt, "raw.json")), reportBytes = readFileSync(join(attempt, "html/data.json"));
  const raw = JSON.parse(rawBytes), report = JSON.parse(reportBytes), recordedStudy = raw.study;
  assertSessionCompletion(raw, report, sealed.protocol);
  const validated = study.validateFrozenSessionResult(raw, protocolPath, root);
  if (exact(recordedStudy) !== exact(validated)) throw new Error("Raw frozen identity differs from validated result");
  const audit = auditModule.auditSessionStudy(raw, report, { purpose, protocol: sealed.protocol, protocolSha256: sealed.protocolSha256 });
  audit.provenance.inputSha256 = { raw: sha(rawBytes), allocationReport: sha(reportBytes), protocol: sealed.protocolSha256 };
  writeLauncherStatus(join(attempt, "audit.json"), audit);
  writeFileSync(join(attempt, "audit.md"), auditModule.renderSessionStudyAudit(audit), { flag: "wx" });
  if (audit.checksOk !== true) throw new Error("Independent funded-account audit failed");
  return { fullFrozenCoverage: true, reportChecks: report.checks.length, independentAudit: true,
    fundedCloses: audit.total.closes, unitPf: audit.total.exactPf, strategyPromotion: false };
}

/** Optional controls are dependency injection for tiny fixtures; CLI always uses real frozen source and commands. */
export async function runFrozenSessions({ root = DEFAULT_ROOT, jobs, purpose = "development", statusFile,
  waitMs = 10 * 60_000, deadlineMs = 60 * 60_000, graceMs = 10_000, signal }, controls = {}) {
  root = resolve(root);
  if (!Array.isArray(jobs) || !jobs.length) throw new Error("At least one --job directory is required");
  if (!["development", "selection", "final"].includes(purpose)) throw new Error("Invalid study purpose");
  if (![waitMs, deadlineMs, graceMs].every((x) => Number.isFinite(x) && x > 0)) throw new Error("Launcher deadlines must be finite and positive");
  statusFile = resolve(root, statusFile ?? "runs/frozen-session-launcher-status.json");
  const lockPath = join(root, "runs/frozen-session-launcher.lock");
  mkdirSync(dirname(lockPath), { recursive: true });
  let lock;
  try { lock = openSync(lockPath, "wx"); }
  catch (error) { if (error.code === "EEXIST") throw new Error(`A launcher owns ${lockPath}; inspect its recorded PID before clearing a stale lock`); throw error; }
  const results = [];
  let current = null, attempt = null, childResult = null;
  const status = (value) => {
    const row = { ...value, job: current, attempt, purpose, at: new Date().toISOString() };
    writeLauncherStatus(statusFile, row);
    if (attempt) writeLauncherStatus(join(attempt, "status.json"), row);
  };
  try {
    writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    for (const job of jobs) {
      if (signal?.aborted) throw cancelled();
      current = resolve(root, job); attempt = null; childResult = null; attempt = reserveSessionAttempt(current);
      for (const name of ["protocol.json", "desk.json"])
        writeFileSync(join(attempt, name), readFileSync(join(current, name)), { flag: "wx" });
      status({ state: "waiting", stage: "preflight" });
      const study = await import(pathToFileURL(resolve(root, "scripts/lib/session-study.mjs")).href);
      const sealed = study.readSessionStudy(join(attempt, "protocol.json"), root), protocol = sealed.protocol;
      const desk = JSON.parse(readFileSync(join(attempt, "desk.json")));
      if (exact(desk.settings) !== exact(protocol.actualSettings) || exact(desk.wf) !== exact(protocol.actualWf))
        throw new Error("Desk snapshot differs from frozen runtime settings");
      const feed = resolve(root, protocol.feed.path);
      if (await hashFile(feed) !== protocol.feed.sha256) throw new Error("Feed differs from frozen bytes");
      await (controls.admit ?? waitForSessionHeadroom)({ timeoutMs: waitMs, signal, onStatus: status });
      const invocation = frozenSessionInvocation(root, attempt, protocol);
      writeLauncherStatus(join(attempt, "invocation.json"), { command: invocation.command, args: invocation.args,
        cwd: invocation.cwd, workers: 1, protocolSha256: sealed.protocolSha256, sourceSha256: protocol.source.sha256,
        launcherSha256: sha(readFileSync(fileURLToPath(import.meta.url))), deadlineMs, graceMs });
      status({ state: "running", stage: "session", workers: 1 });
      const logPath = join(attempt, "run.log");
      childResult = await (controls.child ?? runSessionChild)({ ...invocation, logPath, signal, deadlineMs, graceMs,
        onSpawn: ({ pid }) => status({ state: "running", stage: "session", pid, workers: 1 }),
        monitor: () => {
          if (/memory: memory pressure:.*compute aborted/.test(readFileSync(logPath, "utf8"))) return "Runtime memory compute abort; no run scored";
          const { availMb } = memInfo();
          return !Number.isFinite(availMb) || availMb < 1200 ? "Active child lost hard memory headroom; no run scored" : null;
        } });
      writeLauncherStatus(join(attempt, "child-outcome.json"), childResult);
      if (signal?.aborted) throw cancelled();
      if (childResult.failure || childResult.code !== 0) throw new Error(childResult.failure?.message ?? `Child failed: code ${childResult.code}, signal ${childResult.signal}`);
      status({ state: "running", stage: "independent-verification", workers: 1 });
      const evidence = await (controls.verify ?? verifySessionAttempt)(root, attempt, purpose);
      const outcome = { state: "complete", job: current, attempt, evidence, child: childResult, at: new Date().toISOString() };
      writeLauncherStatus(join(attempt, "outcome.json"), outcome);
      status(outcome); results.push(outcome);
    }
    attempt = null; current = null;
    status({ state: "complete", jobs: results, strategyPromotion: false });
    return results;
  } catch (error) {
    const outcome = { state: "failed", error: errorText(error), code: error.code ?? null,
      resourceBlocked: error.code === "CTS_SESSION_RESOURCE_BLOCKED", cancelled: signal?.aborted === true,
      child: childResult, completedJobs: results, strategyPromotion: false };
    if (attempt) writeLauncherStatus(join(attempt, "outcome.json"), outcome);
    status(outcome);
    throw error;
  } finally {
    closeSync(lock); unlinkSync(lockPath);
  }
}

export async function frozenSessionMain(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    console.log("node --experimental-strip-types scripts/run-frozen-session.mjs --root REPO --job DIR [--job DIR] [--purpose development|selection|final] [--status FILE] [--wait-min 10] [--deadline-min 60] [--grace-ms 10000]");
    return;
  }
  const options = { jobs: [] }, names = { "--root": "root", "--purpose": "purpose", "--status": "statusFile", "--wait-min": "waitMs", "--deadline-min": "deadlineMs", "--grace-ms": "graceMs" };
  for (let i = 0; i < args.length; i++) {
    const key = args[i], value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    if (key === "--job") options.jobs.push(value);
    else if (names[key]) options[names[key]] = ["--wait-min", "--deadline-min", "--grace-ms"].includes(key)
      ? Number(value) * (key === "--grace-ms" ? 1 : 60_000) : value;
    else throw new Error(`Unknown option ${key}`);
  }
  for (const key of ["waitMs", "deadlineMs", "graceMs"])
    if (options[key] !== undefined && !(Number.isFinite(options[key]) && options[key] > 0)) throw new Error(`Invalid ${key}`);
  const controller = new AbortController(), handlers = new Map();
  for (const name of ["SIGINT", "SIGTERM"]) { const handler = () => controller.abort(); handlers.set(name, handler); process.on(name, handler); }
  try { await runFrozenSessions({ ...options, signal: controller.signal }); }
  finally { for (const [name, handler] of handlers) process.off(name, handler); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await frozenSessionMain(); }
  catch (error) { console.error(errorText(error)); process.exitCode = error.code === "CTS_SESSION_CANCELLED" ? 130 : 1; }
}
