#!/usr/bin/env node
// Frozen causal CoreRuntime study. This launcher never acquires data or places venue orders.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000, M = 60_000;
const SCHEMA = "cts-causal-22-symbol-study-v3";
export const STUDY_RESOURCE_LOCK = "/workspace/scratch/.cts-ao-compute.lock";
export const STUDY_ADMISSION = { minimumAvailableMiB: 4096, unknown: "reject", wait: false, timeoutBypass: false, sharedLock: STUDY_RESOURCE_LOCK, basis: "Require measured host and ancestor-cgroup headroom before each child, crediting only measured inactive_file as the production guard does. V8 heap is a ceiling; actual peak is recorded, and runtime memory guards remain enabled with every fallback rejected." };
export const STUDY_SYMBOLS = ["AVAX", "LINK", "LTC", "SUI", "NEAR", "DOT", "ATOM", "APT", "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "BCH", "TRX", "ETC", "OP", "ARB", "FIL", "UNI"].map((x) => `${x}-USDT`);
const plain = (x) => Array.isArray(x) ? x.map(plain) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, plain(x[k])])) : x;
export const studyJson = (x) => JSON.stringify(plain(x), null, 2) + "\n";
export const studyHash = (x) => createHash("sha256").update(x).digest("hex");
const read = (file) => { const b = fs.readFileSync(file); return { data: JSON.parse(b), sha256: studyHash(b), bytes: b.length }; };
const writeNew = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, studyJson(data), { flag: "wx" }); };
const same = (a, b) => studyJson(a) === studyJson(b);
const readText = (file) => { try { return fs.readFileSync(file, "utf8"); } catch { return null; } };
const writeStatus = (file, data) => { fs.writeFileSync(file + ".tmp", studyJson(data)); fs.renameSync(file + ".tmp", file); };

/** Both host and every visible cgroup-v2 ancestor must be known; no wait or unknown-reading bypass. */
export function studyMemorySnapshot(readFile = readText, at = new Date().toISOString()) {
  const meminfo = readFile("/proc/meminfo") ?? "", hostMatch = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo);
  const hostAvailableMiB = hostMatch ? Number(hostMatch[1]) / 1024 : null;
  const membership = /^0::(\/[^\n]*)$/m.exec(readFile("/proc/self/cgroup") ?? ""), hierarchy = [], errors = [];
  if (!Number.isFinite(hostAvailableMiB) || hostAvailableMiB < 0) errors.push("Host MemAvailable is unknown");
  if (!membership || membership[1].split("/").includes("..")) errors.push("Cgroup-v2 membership is unknown");
  else {
    const parts = membership[1].split("/").filter(Boolean);
    for (let depth = parts.length; depth >= 0; depth--) {
      const dir = path.join("/sys/fs/cgroup", ...parts.slice(0, depth)), limitText = readFile(path.join(dir, "memory.max"))?.trim(), usedText = readFile(path.join(dir, "memory.current"))?.trim();
      const used = /^\d+$/.test(usedText ?? "") ? Number(usedText) : NaN;
      const inactiveMatch = /^inactive_file\s+(\d+)$/m.exec(readFile(path.join(dir, "memory.stat")) ?? ""), inactive = inactiveMatch ? Number(inactiveMatch[1]) : NaN;
      const unlimited = limitText === "max", limit = /^\d+$/.test(limitText ?? "") ? Number(limitText) : NaN;
      const known = Number.isSafeInteger(used) && used >= 0 && Number.isSafeInteger(inactive) && inactive >= 0 && (unlimited || Number.isSafeInteger(limit) && limit > 0);
      if (!known) errors.push(`Unknown cgroup memory limit/current/inactive_file at ${dir}`);
      hierarchy.push({ path: dir, known, unlimited, limitMiB: !unlimited && Number.isFinite(limit) ? limit / 2 ** 20 : null, usedMiB: Number.isFinite(used) ? used / 2 ** 20 : null, inactiveFileMiB: Number.isFinite(inactive) ? inactive / 2 ** 20 : null, availableMiB: known && !unlimited ? Math.max(0, limit - Math.max(0, used - inactive)) / 2 ** 20 : null });
    }
  }
  const finite = hierarchy.filter((x) => x.known && !x.unlimited).map((x) => x.availableMiB);
  const known = errors.length === 0 && hierarchy.length > 0;
  return { at, unit: "MiB", known, hostAvailableMiB, cgroup: hierarchy, availableMiB: known ? Math.min(hostAvailableMiB, ...finite) : null, errors };
}
export function studyAdmissionDecision(snapshot, policy = STUDY_ADMISSION) {
  const admitted = snapshot.known === true && Number.isFinite(snapshot.availableMiB) && snapshot.availableMiB >= policy.minimumAvailableMiB;
  return { ...snapshot, minimumAvailableMiB: policy.minimumAvailableMiB, admitted, reason: admitted ? "Known host/cgroup headroom meets the frozen minimum" : snapshot.known !== true ? "Memory availability is unknown; repair host/cgroup readings and prepare a new attempt" : `Only ${Math.floor(snapshot.availableMiB)}MiB available; ${policy.minimumAvailableMiB}MiB required. Finish other memory-heavy work and prepare a new attempt; no timeout bypass is permitted.` };
}
/** flock is tied to this inherited open-file description and released even if the launcher is killed. */
export async function acquireStudyResourceLock(file = STUDY_RESOURCE_LOCK) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "a+");
  try {
    await new Promise((resolve, reject) => {
      const p = spawn("flock", ["--nonblock", "--exclusive", "--conflict-exit-code", "73", "3"], { stdio: ["ignore", "ignore", "pipe", fd] });
      let error = ""; p.stderr.on("data", (x) => error += x);
      p.once("error", reject);
      p.once("close", (code) => code === 0 ? resolve() : reject(new Error(code === 73 ? `Another cooperating compute owns ${file}; finish it and prepare a new attempt` : `Unable to acquire shared compute flock (${code}): ${error.trim()}`)));
    });
    return { file, fd, release() { fs.closeSync(fd); } };
  } catch (e) { fs.closeSync(fd); throw e; }
}

export function studyWindow(endT = Date.parse("2026-10-17T21:00:00Z")) {
  if (!Number.isSafeInteger(endT) || endT % H) throw new Error("Study end must be an explicit complete UTC hour");
  const tradeStartT = endT - 24 * H, evaluationFromT = tradeStartT - 24 * H;
  return { endT, tradeStartT, evaluationFromT, indicatorStartT: evaluationFromT - 205 * H, runH: 24, preH: 24, longH: 24, selectionH: 24, indicatorWarmupH: 205 };
}

/** Physical indicator warmup stays in the feed; ranking observes only the preceding evaluation day. */
export function trimStudyFeed(source, symbols, window) {
  const candles = {}, tickers = [];
  for (const sym of symbols) {
    const rows = source.candles?.[`${sym}|1`];
    if (!Array.isArray(rows)) throw new Error(`Missing source1m feed for ${sym}`);
    const cs = rows.filter((c) => c.t >= window.indicatorStartT && c.t < window.endT);
    candles[`${sym}|1`] = cs;
    const hours = [];
    for (let i = 0; i < cs.length; i += 60) {
      const part = cs.slice(i, i + 60);
      if (part.length !== 60 || part[0].t % H || part.some((c, j) => c.t !== part[0].t + j * M)) throw new Error(`Incomplete aligned hourly bucket for ${sym}`);
      hours.push({ t: part[0].t, o: part[0].o, h: Math.max(...part.map((c) => c.h)), l: Math.min(...part.map((c) => c.l)), c: part.at(-1).c, v: part.reduce((n, c) => n + c.v, 0) });
    }
    candles[`${sym}|60`] = hours;
    const prior = cs.filter((c) => c.t >= window.evaluationFromT && c.t < window.tradeStartT);
    if (prior.length !== 24 * 60) throw new Error(`Incomplete prior24h ranking history for ${sym}`);
    tickers.push({ sym, last: prior.at(-1).c, quoteVol: prior.reduce((n, c) => n + c.v * c.c, 0), changePct: (prior.at(-1).c / prior[0].o - 1) * 100 });
  }
  const feed = { tickers, candles };
  validateStudyFeed(feed, symbols, window);
  return feed;
}

/** Validate the exact offline input; no gaps, synthetic filling or ranking substitution is permitted. */
export function validateStudyFeed(feed, symbols, window) {
  if (!Array.isArray(symbols) || ![20, 22].includes(symbols.length) || new Set(symbols).size !== symbols.length) throw new Error("Exactly20 or22 unique frozen symbols required");
  const keys = new Set(symbols), quality = {};
  const tickers = (feed.tickers ?? []).map((x) => x.symbol ?? x.sym);
  if (new Set(tickers).size !== symbols.length || tickers.length !== symbols.length || tickers.some((x) => !keys.has(x))) throw new Error("Ticker symbols differ from exact frozen universe");
  for (const symbol of symbols) {
    const cs = feed.candles?.[`${symbol}|1`], expected = (window.endT - window.indicatorStartT) / M;
    if (!Array.isArray(cs) || cs.length !== expected) throw new Error(`Incomplete1m feed for ${symbol}`);
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (c.t !== window.indicatorStartT + i * M || ![c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) || c.l <= 0 || c.l > Math.min(c.o, c.c) || c.h < Math.max(c.o, c.c) || c.v < 0) throw new Error(`Invalid/gapped1m feed for ${symbol} at${i}`);
    }
    // Ranking must also be frozen; the actual engine reads its60m ranking lane even with forced symbols.
    const hours = feed.candles?.[`${symbol}|60`], first = Math.ceil(window.indicatorStartT / H) * H;
    if (!Array.isArray(hours) || hours.length !== (window.endT - first) / H || hours.some((c, i) => c.t !== first + i * H || ![c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) || c.l <= 0 || c.l > Math.min(c.o, c.c) || c.h < Math.max(c.o, c.c) || c.v < 0)) throw new Error(`Incomplete60m ranking feed for ${symbol}`);
    quality[symbol] = { minuteBars: cs.length, hourlyBars: hours.length, firstT: cs[0].t, lastT: cs.at(-1).t, gaps: 0 };
  }
  if (Object.keys(feed.candles ?? {}).some((k) => !keys.has(k.split("|")[0]) || !["1", "60"].includes(k.split("|")[1]))) throw new Error("Unexpected feed symbols/timeframes");
  return quality;
}

/** Materialize through the production constructor/update path, before any engine is started. */
export async function studyRuntimeSettings(symbols, window, laneHistoryDays, { cost = 0.0015, variant = "baseline" } = {}) {
  process.env.CTS_CORE_STATE = "off"; process.env.CTS_CORE_AUTOSTART = "0"; process.env.CTS_CORE_LIVE = "0";
  await import("./lib/core-test-offline-guard.cjs");
  const [{ DEFAULT_SETTINGS }, { CoreRuntime }, { CoreDb }, { BREAK_CONFIG_IDS, breakAnchorTf }] = await Promise.all([
    import("../src/core/config.ts"), import("../src/core/server/runtime.server.ts"), import("../src/core/server/db.server.ts"), import("../src/core/indications/break-config.ts"),
  ]);
  // Every nested ladder is supplied in full: production SettingsPatch merges grid one level deep.
  const settings = structuredClone(DEFAULT_SETTINGS);
  Object.assign(settings, { symbols: symbols.length, forceSymbols: [...symbols] });
  if (!["baseline", "reclaim8"].includes(variant)) throw new Error("Study variant must be baseline or reclaim8");
  if (!Number.isFinite(cost) || cost < 2 * settings.fees.taker || cost > 0.02) throw new Error("Modeled round-trip cost must cover unchanged taker fees and be at most2%");
  settings.cost = cost;
  settings.fees.slippage = cost / 2 - settings.fees.taker;
  if (variant === "reclaim8") settings.focus.push(...BREAK_CONFIG_IDS.filter((id) => id.includes("-mc-rel-reclaim8-")).map((id) => `follow|${id}@m${breakAnchorTf(id)}`));
  const neededDays = Math.ceil((window.endT - window.indicatorStartT) / (24 * H));
  laneHistoryDays ??= neededDays;
  if (!Number.isInteger(laneHistoryDays) || laneHistoryDays < neededDays || laneHistoryDays > 45) throw new Error(`All-lane history must cover at least${neededDays} days and at most45 days`);
  settings.tfDays = Object.fromEntries(settings.tfs.map((tf) => [String(tf), laneHistoryDays]));
  settings.historyDays = laneHistoryDays;
  const runtime = new CoreRuntime(new CoreDb(":memory:"), { symbols: symbols.length, signals: { enabled: true } }, { replay: true, replayPreloadAll: true, priceStream: null });
  try {
    runtime.updateSettings(settings);
    runtime.updateSettings({}, { causalBase: true, recordValidation: true, preH: window.preH, longH: window.longH, simH: window.runH });
    const actual = { settings: structuredClone(runtime.settings), wf: structuredClone(runtime.wf) };
    if (!same(actual.settings, settings)) throw new Error("Actual runtime settings differ from the complete frozen default/explicit study patch: " + Object.keys(settings).filter((key) => !same(actual.settings[key], settings[key])).join(", "));
    if (!same(actual.settings.gates, DEFAULT_SETTINGS.gates) || !same(actual.settings.grid, DEFAULT_SETTINGS.grid) || !same(actual.settings.sizing, DEFAULT_SETTINGS.sizing)) throw new Error("Study changed production gates/grid/sizing");
    if (!same(actual.settings.forceSymbols, symbols) || actual.settings.symbols !== symbols.length || actual.wf.validLastN !== 15 || actual.wf.signalValidLastN !== 25 || actual.wf.causalBase !== true || actual.wf.recordValidation !== true || actual.wf.preH !== window.preH || actual.wf.longH !== window.longH || actual.wf.simH !== window.runH) throw new Error("Runtime settings/WF do not match the frozen protocol");
    // Full WF contains thousands of derived protection cells and exceeds Linux's per-argument size limit.
    // Store it as evidence, but send only this explicit patch; the same production defaults derive every cell.
    const commandWf = Object.fromEntries(["causalBase", "recordValidation", "preH", "simH", "longH", "validLastN", "signalValidLastN"].map((key) => [key, actual.wf[key]]));
    if (runtime.replayPreloadAll !== true) throw new Error("Runtime does not support the required frozen complete-feed preload; update sources and prepare a new protocol");
    return { ...actual, commandWf, replayPreloadAll: true, settingsSha256: studyHash(studyJson(actual)), scope: "Complete production defaults with explicit cost, loading coverage, exact universe and opt-in source variant; independent gates remain unchanged", laneHistoryDays, variant, cost };
  } finally { runtime.dispose(); }
}

function sourceFiles(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? sourceFiles(path.join(dir, x.name)) : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name) && !/\.test\.[^.]+$/.test(x.name) ? [path.join(dir, x.name)] : []); }
export function studySources() {
  const files = [...sourceFiles(path.join(ROOT, "src/core")), ...sourceFiles(path.join(ROOT, "scripts/lib")), ...["scripts/core-session.mjs", "scripts/core-22-symbol-study.mjs", "package.json", "package-lock.json"].map((f) => path.join(ROOT, f))];
  return files.filter((f) => fs.existsSync(f)).sort().map((f) => ({ path: path.relative(ROOT, f), sha256: studyHash(fs.readFileSync(f)) }));
}
export function verifyStudySources(protocol) {
  if (protocol.execution?.replayPreloadAll !== true || !same(protocol.budget?.admission, STUDY_ADMISSION) || protocol.cases?.some((c) => c.runtime?.replayPreloadAll !== true)) throw new Error("Protocol lacks frozen complete-feed preload/memory admission; preserve it and prepare a new attempt");
  if (protocol.schema !== SCHEMA || !same(protocol.sources, studySources())) throw new Error("Source tree differs from frozen study; preserve this attempt and prepare a new one");
}

export function studyCommand(protocol, studyCase, output, phase = "engine") {
  if (protocol.execution?.replayPreloadAll !== true || studyCase.runtime?.replayPreloadAll !== true) throw new Error("Explicit frozen replayPreloadAll required before child command construction");
  const args = ["--experimental-strip-types", "--no-warnings", "--expose-gc", `--max-old-space-size=${protocol.budget.heapMb}`, path.join(ROOT, "scripts/core-session.mjs")];
  const book = ["--balance", String(protocol.book.balance), "--pct", String(protocol.book.pct), "--leverage", String(protocol.book.leverage)];
  if (phase === "engine") args.push("--feed", studyCase.feed, "--end-at", new Date(protocol.window.endT).toISOString(), "--evaluation-from", new Date(protocol.window.evaluationFromT).toISOString(), "--replay-preload-all", "--selection-hours", String(protocol.window.selectionH), "--pre", String(protocol.window.preH), "--run", String(protocol.window.runH), "--symbols", String(studyCase.symbols.length), "--signals", "on", "--settings", JSON.stringify(studyCase.runtime.settings), "--wf", JSON.stringify(studyCase.runtime.commandWf), "--signal-progress", "--tape-trades", "--dump-only", "--dump", path.join(output, "raw.json"), "--max-wait-min", String(protocol.budget.timeoutMinutes), "--quiet", "true", ...book);
  else args.push("--replay", path.join(output, "raw.json"), "--signal-progress", "--out", path.join(output, "session"), "--html", path.join(output, "book"), ...book);
  return args;
}
export const studyEnvironment = () => ({ PATH: process.env.PATH ?? "", LANG: "C.UTF-8", TZ: "UTC", NODE_OPTIONS: `--require ${path.join(ROOT, "scripts/lib/core-test-offline-guard.cjs")}`, MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576", CTS_CORE_WORKERS: "1", CTS_CORE_COMPARE: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_LIVE: "0" });
export async function studyChild(args, logfile, timeoutMs, signal, resourceFd) {
  const fd = fs.openSync(logfile, "wx"), started = Date.now();
  try { return await new Promise((resolve) => {
    if (signal?.aborted) { resolve({ exitCode: null, signal: null, interrupted: true, timedOut: false, seconds: 0 }); return; }
    // The child keeps the shared flock even if its launcher is killed before it can forward a signal.
    const p = spawn(process.execPath, args, { cwd: ROOT, env: studyEnvironment(), stdio: ["ignore", fd, fd, ...(resourceFd === undefined ? [] : [resourceFd])] });
    let timedOut = false, interrupted = false, escalation;
    const stop = () => { p.kill("SIGTERM"); escalation ??= setTimeout(() => p.kill("SIGKILL"), 5000); };
    const onAbort = () => { interrupted = true; stop(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => { clearTimeout(timer); clearTimeout(escalation); signal?.removeEventListener("abort", onAbort); };
    p.once("error", (e) => { cleanup(); resolve({ exitCode: null, signal: null, spawnError: String(e), interrupted, timedOut, seconds: (Date.now() - started) / 1000 }); });
    p.once("close", (exitCode, childSignal) => { cleanup(); resolve({ exitCode, signal: childSignal, interrupted, timedOut, seconds: (Date.now() - started) / 1000 }); });
  }); } finally { fs.closeSync(fd); }
}

export function finishStudyReturns(x) {
  const unknown = x.unknown + (!Number.isFinite(x.gp) || !Number.isFinite(x.gl) || !Number.isFinite(x.gp - x.gl) || x.gl > 0 && !Number.isFinite(x.gp / x.gl) ? 1 : 0);
  return { ...x, unknown, pf: unknown ? null : x.n && x.gl > 0 ? x.gp / x.gl : null, noLoss: x.n > 0 && !unknown && x.gp > 0 && x.gl === 0, net: unknown ? null : x.gp - x.gl };
}
const empty = () => ({ n: 0, gp: 0, gl: 0, unknown: 0 });
const add = (x, r) => { x.n++; if (!Number.isFinite(r)) x.unknown++; else if (r > 0) x.gp += r; else x.gl -= r; };
const sum = (rows) => finishStudyReturns(rows.reduce((a, x) => ({ n: a.n + x.n, gp: a.gp + x.gp, gl: a.gl + x.gl, unknown: a.unknown + (x.unknown ?? 0) }), empty()));
const unavailableStage = (basis) => ({ sampleRecorded: false, basis, n: null, gp: null, gl: null, unknown: null, pf: null, noLoss: false, net: null });
const baseStageUnavailable = () => unavailableStage("Slim Base stores pair counts and PF gates; its hourly funnel arrays are placeholders without recorded representative trades.");
const hourlyStage = (raw, key, hour) => ["beforeBase", "afterBase"].includes(key) ? baseStageUnavailable() : raw.funnel?.[key]?.[hour] ? { ...finishStudyReturns({ ...empty(), ...raw.funnel[key][hour] }), sampleRecorded: true, basis: "Recorded independent overlapping config tape candidates; not account execution." } : unavailableStage("No hourly candidate sample recorded by the source.");
export const studyHour = (exitT, window) => Math.ceil((exitT - window.tradeStartT) / H) - 1;

/** Reduction of actual runtime output only; no fixed-cohort independent replay is substituted. */
export async function summarizeStudy(raw, book, protocol, studyCase, log = "") {
  const { modeledUnitReturn } = await import("../src/core/metrics/stats.ts");
  const [{ orderKey }, { rangeOfId }, { laneOf, isSignalInd }, { kindOfId }, { baseAllowsTape }] = await Promise.all([import("../src/core/sizing.ts"), import("../src/core/minimal-coord.ts"), import("../src/core/indications/registry.ts"), import("../src/core/pipeline/pipeline.ts"), import("../src/core/sim/walkforward.ts")]);
  const structural = [];
  const check = (name, ok) => structural.push({ name, ok: !!ok });
  const expected = studyCase.runtime;
  check("exact24h simulated window", raw.window?.startT === protocol.window.tradeStartT && raw.window?.endT === protocol.window.endT);
  check("exact forced symbol universe and order", same(raw.engine?.universe, studyCase.symbols));
  check("actual symbols requested", raw.settings?.symbolsAsked === studyCase.symbols.length);
  check("actual causal/time/last-N settings", ["causalBase", "preH", "simH", "longH", "validLastN", "signalValidLastN"].every((k) => raw.settings?.wf?.[k] === expected.wf[k]));
  check("complete frozen WF defaults and grids retained", Object.entries(expected.wf).filter(([, value]) => value !== undefined).every(([key, value]) => same(raw.settings?.effectiveWf?.[key], value)));
  check("complete effective runtime settings parity", same(raw.settings?.effective, expected.settings));
  check("actual selection history boundary", raw.settings?.replaySelectionHours === protocol.window.selectionH && raw.settings?.evaluationFromT === protocol.window.evaluationFromT && raw.settings?.effectiveWf?.recordValidation === true);
  check("actual complete-feed replay preload", protocol.execution?.replayPreloadAll === true && expected.replayPreloadAll === true && raw.settings?.replayPreloadAll === true);
  const actualBook = raw.settings?.book;
  check("engine/report shared sizing parity", actualBook?.balance === protocol.book.balance && actualBook?.sizing?.mode === expected.settings.sizing?.mode && actualBook?.sizing?.pct === expected.settings.sizing?.pct && actualBook?.sizing?.pct === protocol.book.pct && actualBook?.leverage === protocol.book.leverage && book.settings?.balance0 === protocol.book.balance && same(book.settings?.sizing, actualBook?.sizing) && book.settings?.leverage === protocol.book.leverage);
  check("native report accounting checks", Array.isArray(book.checks) && book.checks.length > 0 && book.checks.every((x) => x.ok === true));
  check("full computation without memory fallback", raw.engine?.mem?.computeLevel === 0 && raw.engine?.mem?.fallback === 0 && !raw.engine?.mem?.lastAbort);
  check("actual runtime performance evidence", [raw.runSeconds, raw.engine?.computeMs, raw.engine?.rssMaxMb].every((x) => Number.isFinite(x) && x >= 0) && raw.engine.rssMaxMb > 0);
  check("completed paper step", /paper step on compute #\d+:/.test(log) && !/universe not complete|WARNING: the paper step|WARNING: the reported compute/.test(log));
  check("every hourly runtime revalidation recorded", Array.from({ length: 24 }, (_, i) => protocol.window.tradeStartT + i * H).every((t) => raw.validation?.some((x) => x.t === t && Array.isArray(x.checks))));
  const coverage = raw.engine?.coverage;
  check("full Base processing coverage", [coverage?.expectedCombos, coverage?.evaluated].every((x) => Number.isSafeInteger(x) && x >= 0) && coverage.expectedCombos === coverage.evaluated);
  const allocations = new Map();
  for (const a of book.sizedOrders ?? []) if (Number.isSafeInteger(a.closeIndex)) allocations.set(a.closeIndex, allocations.has(a.closeIndex) ? null : a);
  const virtual = empty(), funded = empty(), by = new Map(), config = new Map();
  const funnelScopes = ["beforeBase", "afterBase", "pool", "poolNormal", "poolTrailing", "poolTrailingOnly", "seated", "seatedNormal", "seatedTrailing", "seatedTrailingOnly"];
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const startT = protocol.window.tradeStartT + hour * H, validation = raw.validation?.filter((x) => x.t === startT) ?? [];
    return { hour, startT, virtual: empty(), funded: empty(),
      stages: Object.fromEntries(funnelScopes.map((key) => [key, hourlyStage(raw, key, hour)])),
      validation: { steps: validation.length, checked: validation.reduce((n, x) => n + x.checks.length, 0), passed: validation.reduce((n, x) => n + x.checks.filter((c) => c[1]).length, 0), seatedConfigs: [...new Set(validation.flatMap((x) => x.real ?? []))].length },
      rangeProgress: raw.stepsByRange?.find((x) => x.t === startT)?.byRange ?? null,
      account: book.hours?.find((x) => x.t === startT) ?? null };
  });
  let zeroAllocations = 0, unknownAllocations = 0;
  const group = (axis, key) => { const id = `${axis}|${key}`; if (!by.has(id)) by.set(id, { axis, key, virtual: empty(), funded: empty() }); return by.get(id); };
  for (let i = 0; i < (raw.trades ?? []).length; i++) {
    const x = raw.trades[i], h = studyHour(x.exitT, protocol.window), r = modeledUnitReturn(x), a = allocations.get(i);
    if (h < 0 || h >= 24 || x.entryT < protocol.window.tradeStartT || x.entryT >= protocol.window.endT || x.markedOpen || ["open", "end"].includes(x.reason)) throw new Error("Prewindow/endpoint/invalid close in settled cohort");
    const ind = x.cfg.split("|")[1] ?? "?", range = rangeOfId(x.cfg) || (isSignalInd(ind) ? "signal" : "wide"), kind = x.kind ?? kindOfId(x.cfg), lane = laneOf(ind), direction = x.side > 0 ? "long" : "short";
    const scopes = [group("range", range), group("type", kind), group("indication", ind), group("direction", direction), group("symbol", x.sym), group("range/type/direction", `${range}/${kind}/${direction}`), group("lane", `${lane.tf ?? 1}${lane.combined ? "c" : ""}`)];
    if (!config.has(x.cfg)) config.set(x.cfg, { cfg: x.cfg, range, kind, ind, virtual: empty(), funded: empty() });
    scopes.push(config.get(x.cfg));
    add(virtual, r); add(hours[h].virtual, r); for (const g of scopes) add(g.virtual, r);
    const amount = a?.allocatedNotional, volume = x.vol ?? 1;
    const valid = a && a.key === orderKey(x) && a.exitT === x.exitT && Number.isFinite(amount) && amount >= 0 && Number.isFinite(a.unitNotional) && a.unitNotional >= 0 && Number.isFinite(volume) && volume > 0 && Math.abs(amount - a.unitNotional * volume) <= 1e-10 * Math.max(1, amount);
    if (valid && amount <= 1e-9) { zeroAllocations++; continue; }
    if (!valid) unknownAllocations++;
    const ownR = valid ? r : NaN;
    add(funded, ownR); add(hours[h].funded, ownR); for (const g of scopes) add(g.funded, ownR);
  }
  check("known normalized shared-book allocations", unknownAllocations === 0 && allocations.size === (raw.trades ?? []).length);
  check("verified execution unit returns", virtual.unknown === 0 && funded.unknown === 0);
  const finalized = (r) => ({ ...r, virtual: finishStudyReturns(r.virtual), funded: finishStudyReturns(r.funded) });
  const hourly = hours.map(finalized);
  const sourceMeta = (id) => { const ind = id.split("|")[1] ?? "?"; return { ind, range: rangeOfId(id) || (isSignalInd(ind) ? "signal" : "wide"), kind: kindOfId(id) }; };
  const baseRanges = raw.settings?.effectiveWf?.basePassedRanges;
  const baseOptions = { basePassed: new Set(raw.settings?.effectiveWf?.basePassed ?? []), basePassedRanges: baseRanges ?? {}, baseWideLadderPairs: new Set(raw.settings?.effectiveWf?.baseWideLadderPairs ?? []) };
  const allowed = (id) => { const meta = sourceMeta(id); return isSignalInd(meta.ind) ? true : baseAllowsTape({ bot: id.split("|")[0], ind: meta.ind, kind: meta.kind, protect: { tag: rangeOfId(id) || undefined } }, baseOptions); };
  check("explicit engine Base qualification metadata", baseRanges !== null && typeof baseRanges === "object" && Array.isArray(raw.settings?.effectiveWf?.basePassed));
  check("executed engine configs retain matching Base range qualification", (raw.trades ?? []).every((x) => allowed(x.cfg)));
  const validationRows = (raw.validation ?? []).flatMap((step) => step.checks.map(([id, ok, n, gateScore, gp, gl]) => ({ t: step.t, id, ...sourceMeta(id), baseQualified: allowed(id), pass: !!ok, n, gateScore, gp, gl, pf: gl > 0 ? gp / gl : null, noLoss: n > 0 && gp > 0 && gl === 0 })));
  const allChecked = new Set(validationRows.map((x) => x.id)), qualified = new Set(validationRows.filter((x) => x.pass).map((x) => x.id));
  const retainedHistory = new Map();
  for (const tape of raw.tapeTrades ?? []) {
    const ind = tape.id.split("|")[1] ?? "?", lane = laneOf(ind), key = `${lane.tf ?? 1}${lane.combined ? "c" : ""}`;
    if (!retainedHistory.has(key)) retainedHistory.set(key, { lane: key, tapeConfigs: 0, closedBeforeTradeStart: 0, oldestEntryT: null, newestExitT: null });
    const row = retainedHistory.get(key); row.tapeConfigs++;
    for (const [, , entryT, exitT] of tape.trades ?? []) if (entryT >= protocol.window.evaluationFromT && exitT < protocol.window.tradeStartT) {
      row.closedBeforeTradeStart++; row.oldestEntryT = Math.min(row.oldestEntryT ?? Infinity, entryT); row.newestExitT = Math.max(row.newestExitT ?? -Infinity, exitT);
    }
  }
  return { schema: "cts-causal-22-symbol-results-v2", complete: structural.every((x) => x.ok), structural, symbolCount: studyCase.symbols.length, variant: studyCase.variant ?? expected.variant, window: raw.window,
    scope: "Retrospective causal modeled orders from CoreRuntime; venue-owned execution and future profitability are unverified. Tape candidates overlap and do not equal account fills.",
    settingsSha256: expected.settingsSha256, sourceSha256: studyHash(studyJson(protocol.sources)), cost: raw.settings?.cost,
    ranking: { ...protocol.ranking, membershipAndOrder: "The exact forced symbol list and matching count determine universe membership and order. Runtime60m volatility ranking may read through the replay end; its discarded rank values cannot change this forced universe or downstream economic calculations." },
    dataCoverage: { evaluatedPrehistoryHoursRequested: protocol.window.preH, indicatorWarmupHoursSeparate: protocol.window.indicatorWarmupH, actualFrozenTfDays: expected.settings.tfDays,
      feedFirstT: protocol.window.indicatorStartT, feedEndT: protocol.window.endT, retainedQualifiedOrExecutedTapeHistory: [...retainedHistory.values()],
      limitation: "Retained tapes cover configs qualified or executed at a runtime step, not every rejected config; a sparse trade history is never filled or counted as a last-N pass." },
    progression: { basePairsEvaluated: raw.engine?.baseEvaluated, basePairsPassed: raw.engine?.basePassed, allComputedConfigTapes: raw.engine?.tapes, configsCheckedAcrossRun: allChecked.size, configsEverQualified: qualified.size, executedConfigs: config.size,
      // Pre/post-Base Base cells and config tapes are deliberately distinct samples.
      hourlyCandidateDiagnostics: Object.fromEntries(["beforeBase", "afterBase", "pool", "seated"].map((k) => [k, ["beforeBase", "afterBase"].includes(k) ? baseStageUnavailable() : Array.isArray(raw.funnel?.[k]) ? { ...sum(raw.funnel[k]), sampleRecorded: true, scope: "independent overlapping config tape candidates; not execution" } : unavailableStage("No candidate sample recorded by the source.")])),
      baseByRange: raw.engine?.baseByRange ?? [], baseRejections: raw.engine?.baseWhy ?? [], strategyGateFailures: raw.tapeAgg?.evalFails ?? {}, afterBaseStrategyGates: raw.tapeAgg?.evalAfterBase ?? {}, candidateConfigsByRangeAndType: raw.tapeAgg?.rangeByTypeEval ?? {}, candidateConfigsByRangeAndIndicationType: raw.tapeAgg?.rangeByKindEval ?? {}, entryRejections: raw.engine?.skips ?? {}, entryRejectionsByRange: raw.engine?.skipsByRange ?? {} },
    acceptedVirtualSettled: finishStudyReturns(virtual), fundedModeledSettled: finishStudyReturns(funded), zeroAllocations, unknownAllocations, hourly,
    greenFundedHours: hourly.filter((x) => x.funded.n && x.funded.net > 0).length, activeFundedHours: hourly.filter((x) => x.funded.n > 0).length,
    groups: [...by.values()].map(finalized), configs: [...config.values()].map(finalized), validationRows,
    continuousValidation: { recordedSteps: raw.validation?.length ?? 0, checked: validationRows.length, passed: validationRows.filter((x) => x.pass).length, failed: validationRows.filter((x) => !x.pass).length, afterBaseChecked: validationRows.filter((x) => x.baseQualified).length, afterBasePassed: validationRows.filter((x) => x.baseQualified && x.pass).length, afterBaseFailed: validationRows.filter((x) => x.baseQualified && !x.pass).length },
    pipelineCoverage: raw.engine?.coverage ?? null,
    signalProgress: raw.signalProgress ? { requestedConfigs: raw.signalProgress.requestedConfigs?.length ?? 0, distinctConfiguredConfigs: raw.signalProgress.configs?.length ?? 0,
      builtConfigs: raw.signalProgress.configs?.filter((x) => x.built).length ?? 0, build: raw.signalProgress.build, definitions: raw.signalProgress.definitions,
      exactConfigEvidence: "raw.json signalProgress.configs and tapeTrades; retained immutably with source/feed hashes" } : null,
    performance: { seconds: raw.runSeconds, computeMs: raw.engine?.computeMs, peakRssMb: raw.engine?.rssMaxMb, phases: raw.engine?.phases, loop: raw.engine?.loop, stalls: raw.engine?.stalls, memory: raw.engine?.mem },
    nativeReportChecks: book.checks ?? [], equity: book.total ?? null, equityDrawdown: { max: book.total?.equityMaxDd ?? null, maxPct: book.total?.equityMaxDdPct ?? null, durationH: book.total?.equityDdtMaxH ?? null, minimum: book.total?.eqMin ?? null, basis: "Native report minute-close marked equity; endpoint open positions stay separate from settled-return PF." }, endpointMarks: { excludedFromSettledPF: true, open: raw.openEnd?.length ?? 0 },
    pruning: { performed: false, rule: "No OOS-based member removal. Freeze any later prune variant using only pre-trade causal diagnostics, then run a separately retained comparison." } };
}

const pfText = (x) => x?.noLoss ? "no losses" : x?.pf == null ? "—" : x.pf.toFixed(3);
export function studyMarkdown(s) {
  const rows = ["# Causal24h simulation", "", `${s.symbolCount} symbols; full computation ${s.complete ? "complete" : "INVALID/INCOMPLETE"}. ${s.scope}`, "", "| Cohort | Settled closes | Return PF | Net unit-return points |", "|---|---:|---:|---:|",
    ...[["Accepted virtual orders after runtime gates", s.acceptedVirtualSettled], ["Funded modeled orders in shared capped book", s.fundedModeledSettled]].map(([label, x]) => `|${label}|${x.n}|${pfText(x)}|${x.net == null ? "—" : (x.net * 100).toFixed(3)}|`), "", "| UTC hour starting | Funded closes | Return PF | Net unit-return points |", "|---|---:|---:|---:|",
    ...s.hourly.map((x) => `|${new Date(x.startT).toISOString()}|${x.funded.n}|${pfText(x.funded)}|${x.funded.net == null ? "—" : (x.funded.net * 100).toFixed(3)}|`), "", `Positive funded hours ${s.greenFundedHours}/24 (${s.activeFundedHours} active). Configs checked ${s.progression.configsCheckedAcrossRun}; ever qualified ${s.progression.configsEverQualified}; executed ${s.progression.executedConfigs}.`, "", "| UTC hour starting | Config validations checked / passed | Seated configs | After-Base candidates | Seated candidates | Funded closes |", "|---|---:|---:|---:|---:|---:|", ...s.hourly.map((x) => `|${new Date(x.startT).toISOString()}|${x.validation.checked} / ${x.validation.passed}|${x.validation.seatedConfigs}|${x.stages.afterBase.n ?? "—"}|${x.stages.seated.n ?? "—"}|${x.funded.n}|`), "", `Base pairs ${s.progression.basePairsPassed}/${s.progression.basePairsEvaluated}; computed config tapes ${s.progression.allComputedConfigTapes}. Base hourly candidate samples are unavailable because the source retains slim Base counts only (—). Actual hourly range progression, config validation, independent candidate PF, failure reasons and executions are in summary.json.`, "", `Compute ${Math.round((s.performance.computeMs ?? 0) / 1000)}s; peak RSS ${s.performance.peakRssMb ?? "unknown"}MB. Equity max drawdown ${s.equityDrawdown.max ?? "unknown"} (${s.equityDrawdown.maxPct == null ? "unknown" : (100 * s.equityDrawdown.maxPct).toFixed(3) + "%"}); drawdown duration ${s.equityDrawdown.durationH ?? "unknown"}h.`, "", "Config pruning requires its own frozen pre-trade selection and retained comparison. Retrospective output is not venue-owned execution evidence.", ""];
  const failed = s.structural.filter((x) => !x.ok); if (failed.length) rows.push("Failed completeness checks: " + failed.map((x) => x.name).join("; "), "");
  return rows.join("\n");
}

export async function studyMain(argv) {
  const [mode, ...rest] = argv;
  const arg = (key, fallback) => { const i = rest.indexOf(`--${key}`); return i < 0 ? fallback : rest[i + 1]; };
  if (mode === "prepare") {
    const source = path.resolve(arg("feed", "")), output = path.resolve(arg("out", ""));
    if (!arg("feed") || !arg("out") || fs.existsSync(output)) throw new Error("prepare requires existing --feed and a NEW --out directory");
    const count = Number(arg("symbols", "22")), variant = arg("variant", "baseline"), cost = Number(arg("cost", "0.0015"));
    if (![20, 22].includes(count)) throw new Error("--symbols must be20 or22");
    if (!["baseline", "reclaim8"].includes(variant)) throw new Error("--variant must be baseline or reclaim8");
    const endT = Date.parse(arg("end-at", count === 20 ? "2026-10-16T21:00:00Z" : "2026-10-17T21:00:00Z")), window = studyWindow(endT), loaded = read(source);
    const timeoutMinutes = Number(arg("timeout-min", "180"));
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 1440) throw new Error("--timeout-min must be1 through1440");
    const symbols = STUDY_SYMBOLS.slice(0, count), feed = trimStudyFeed(loaded.data, symbols, window);
    const runtime = await studyRuntimeSettings(symbols, window, arg("lane-history-days") === undefined ? undefined : Number(arg("lane-history-days")), { variant, cost });
    fs.mkdirSync(output, { recursive: true });
    const file = path.join(output, `feed-${count}.json`), text = JSON.stringify(feed); fs.writeFileSync(file, text, { flag: "wx" });
    const cases = [{ id: `${variant}-${count}`, variant, symbols, feed: file, feedSha256: studyHash(text), quality: validateStudyFeed(feed, symbols, window), runtime }];
    const sources = studySources();
    const p = { schema: SCHEMA, frozenAt: new Date().toISOString(), classification: "Rules/settings/source/feed frozen before this scoring attempt; retrospective public market simulation", window, originalFeed: { path: source, sha256: loaded.sha256 }, cases, sources,
      book: { balance: runtime.settings.paperBalance, pct: runtime.settings.sizing.pct, leverage: 10 }, execution: { replayPreloadAll: true }, budget: { heapMb: 4096, workers: 1, concurrency: 1, timeoutMinutes, admission: STUDY_ADMISSION },
      ranking: { fromT: window.evaluationFromT, toT: window.tradeStartT, basis: "Frozen ticker values use each symbol's preceding24h completed1m bars; quote volume=sum(close*volume), change=last close / first open -1.", universe: "Exact forceSymbols list and matching requested count fix universe membership and order; runtime60m volatility ranking reads are discarded and do not select or reorder these cases." },
      selection: "No performance-based removal before the complete22-symbol24h baseline. Development and final trade windows are chronological and distinct; any later selection must be frozen using only pre-trade/development evidence and retain its baseline comparison.",
      actualExecution: false, live: false, newNetworkRequests: 0 };
    writeNew(path.join(output, "protocol.json"), p); console.log(studyJson({ prepared: true, protocol: path.join(output, "protocol.json"), cases: cases.map((x) => x.id) })); return;
  }
  if (!["run", "compare"].includes(mode) || !arg("protocol")) throw new Error("Usage: core-22-symbol-study.mjs prepare --feed feed.json --out NEW_DIRECTORY --symbols 20|22 --variant baseline|reclaim8 [--end-at ISO] [--cost 0.0015] [--lane-history-days 11] | run --protocol protocol.json --case baseline-20|baseline-22|reclaim8-20|reclaim8-22 | compare --protocol protocol.json");
  const file = path.resolve(arg("protocol")), frozen = read(file), p = frozen.data, dir = path.dirname(file);
  verifyStudySources(p);
  if (mode === "compare") {
    const summaries = p.cases.map((c) => {
      const summary = read(path.join(dir, c.id, "summary.json")), result = read(path.join(dir, c.id, "run-result.json")).data;
      if (summary.data.provenance?.protocolSha256 !== frozen.sha256 || summary.data.provenance?.feedSha256 !== c.feedSha256 || summary.data.sourceSha256 !== studyHash(studyJson(p.sources)) || !result.complete || result.summarySha256 !== summary.sha256) throw new Error("Stale/mismatched summary cannot enter comparison");
      for (const [name, key] of [["raw.json", "rawSha256"], ["book/data.json", "bookSha256"]]) if (studyHash(fs.readFileSync(path.join(dir, c.id, name))) !== summary.data.provenance[key]) throw new Error("Raw evidence changed after run");
      return { id: c.id, summary };
    });
    if (summaries.some((x) => !x.summary.data.complete)) throw new Error("Cannot compare incomplete study runs");
    const result = { protocolSha256: frozen.sha256, comparable: true, scope: "Frozen cases within this protocol only. Different development/final windows or universes are separate evidence and cannot be interpreted as a matched formula comparison.", cases: summaries.map(({ id, summary }) => ({ id, summarySha256: summary.sha256, ...Object.fromEntries(["symbolCount", "variant", "acceptedVirtualSettled", "fundedModeledSettled", "greenFundedHours", "activeFundedHours", "progression", "performance"].map((key) => [key, summary.data[key]])) })) };
    writeNew(path.join(dir, "comparison.json"), result); console.log(studyJson(result)); return;
  }
  const c = p.cases.find((x) => x.id === arg("case")); if (!c) throw new Error("Explicit frozen --case required");
  const dest = path.join(dir, c.id), lock = path.join(ROOT, "runs", "core-22-symbol-study.lock");
  if (fs.existsSync(dest)) throw new Error("Case already has an attempt; preserve it and prepare a new protocol for retries");
  fs.mkdirSync(dest);
  const result = { id: c.id, complete: false, status: "starting", stage: "resource-admission", startedAt: new Date().toISOString(), protocolSha256: frozen.sha256, admission: [] };
  const statusFile = path.join(dest, "status.json"), controller = new AbortController();
  const publish = () => writeStatus(statusFile, result);
  let resourceLock, lockFd, interrupted;
  const onInterrupt = (signal) => {
    interrupted ??= signal; result.status = "interrupted"; result.interrupted = { signal: interrupted, at: new Date().toISOString() };
    controller.abort({ signal }); publish();
  };
  const sigint = () => onInterrupt("SIGINT"), sigterm = () => onInterrupt("SIGTERM");
  process.on("SIGINT", sigint); process.on("SIGTERM", sigterm);
  const admit = (phase) => {
    const decision = { phase, ...studyAdmissionDecision(studyMemorySnapshot(), p.budget.admission) };
    result.admission.push(decision); publish();
    if (!decision.admitted) { result.status = "blocked"; throw new Error(decision.reason); }
  };
  publish();
  try {
    admit("preflight");
    resourceLock = await acquireStudyResourceLock(p.budget.admission.sharedLock);
    if (controller.signal.aborted) throw new Error("Study interrupted before launch");
    fs.mkdirSync(path.dirname(lock), { recursive: true }); lockFd = fs.openSync(lock, "wx"); fs.writeFileSync(lockFd, String(process.pid));
    { const feed = read(c.feed); if (feed.sha256 !== c.feedSha256) throw new Error("Frozen feed hash mismatch"); validateStudyFeed(feed.data, c.symbols, p.window); }
    if (!same(await studyRuntimeSettings(c.symbols, p.window, c.runtime.laneHistoryDays, { cost: c.runtime.cost, variant: c.variant }), c.runtime)) throw new Error("Actual preflight settings changed after freeze");
    const command = { engine: studyCommand(p, c, dest), render: studyCommand(p, c, dest, "render"), environment: studyEnvironment(), protocolSha256: frozen.sha256, resourceLock: resourceLock.file, admissionPolicy: p.budget.admission };
    writeNew(path.join(dest, "command.json"), command);
    admit("engine"); result.stage = "engine"; result.status = "running"; publish();
    result.engine = await studyChild(command.engine, path.join(dest, "engine.log"), p.budget.timeoutMinutes * 60_000, controller.signal, resourceLock.fd);
    if (result.engine.exitCode !== 0 || result.engine.interrupted || result.engine.timedOut || !fs.existsSync(path.join(dest, "raw.json"))) throw new Error("Engine failed/incomplete; retained exact attempt");
    admit("render"); result.stage = "render"; publish();
    result.render = await studyChild(command.render, path.join(dest, "render.log"), p.budget.timeoutMinutes * 60_000, controller.signal, resourceLock.fd);
    if (![0, 1].includes(result.render.exitCode) || result.render.interrupted || result.render.timedOut) throw new Error("Report render failed/incomplete");
    if (controller.signal.aborted) throw new Error("Study interrupted before reduction");
    result.stage = "summary"; publish();
    verifyStudySources(p);
    const raw = read(path.join(dest, "raw.json")), book = read(path.join(dest, "book/data.json"));
    const summary = await summarizeStudy(raw.data, book.data, p, c, fs.readFileSync(path.join(dest, "engine.log"), "utf8"));
    if (controller.signal.aborted) throw new Error("Study interrupted during reduction; retained raw evidence without publishing a completed result");
    summary.provenance = { protocolSha256: frozen.sha256, feedSha256: c.feedSha256, rawSha256: raw.sha256, bookSha256: book.sha256 };
    writeNew(path.join(dest, "summary.json"), summary); fs.writeFileSync(path.join(dest, "summary.md"), studyMarkdown(summary), { flag: "wx" });
    result.complete = summary.complete; result.structuralFailures = summary.structural.filter((x) => !x.ok); result.summarySha256 = studyHash(fs.readFileSync(path.join(dest, "summary.json"))); result.status = summary.complete ? "complete" : "failed";
  } catch (e) { result.error = String(e); if (controller.signal.aborted) result.status = "interrupted"; else if (result.status !== "blocked") result.status = result.stage === "resource-admission" ? "blocked" : "failed"; }
  finally {
    result.finishedAt = new Date().toISOString();
    try { writeNew(path.join(dest, "run-result.json"), result); publish(); }
    finally {
      process.off("SIGINT", sigint); process.off("SIGTERM", sigterm);
      try { if (lockFd !== undefined) { const held = fs.fstatSync(lockFd), current = fs.statSync(lock, { throwIfNoEntry: false }); fs.closeSync(lockFd); if (current?.dev === held.dev && current?.ino === held.ino) fs.unlinkSync(lock); } }
      finally { resourceLock?.release(); }
    }
  }
  console.log(studyJson(result)); if (!result.complete) process.exitCode = interrupted === "SIGINT" ? 130 : interrupted === "SIGTERM" ? 143 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await studyMain(process.argv.slice(2));
