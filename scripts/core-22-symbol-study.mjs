#!/usr/bin/env node
// Frozen causal CoreRuntime study. This launcher never acquires data or places venue orders.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = 3_600_000, M = 60_000;
const SCHEMA = "cts-causal-22-symbol-study-v1";
export const STUDY_SYMBOLS = ["AVAX", "LINK", "LTC", "SUI", "NEAR", "DOT", "ATOM", "APT", "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "BCH", "TRX", "ETC", "OP", "ARB", "FIL", "UNI"].map((x) => `${x}-USDT`);
const plain = (x) => Array.isArray(x) ? x.map(plain) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, plain(x[k])])) : x;
export const studyJson = (x) => JSON.stringify(plain(x), null, 2) + "\n";
export const studyHash = (x) => createHash("sha256").update(x).digest("hex");
export async function verifyStudyFeedHash(file, expected) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  if (hash.digest("hex") !== expected) throw new Error("Frozen feed hash mismatch");
}
const read = (file) => { const b = fs.readFileSync(file); return { data: JSON.parse(b), sha256: studyHash(b), bytes: b.length }; };
const writeNew = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, studyJson(data), { flag: "wx" }); };
const same = (a, b) => studyJson(a) === studyJson(b);

export function studyWindow(endT = Date.parse("2026-10-17T21:00:00Z"), preH = 24) {
  if (!Number.isSafeInteger(endT) || endT % H) throw new Error("Study end must be an explicit complete UTC hour");
  if (![24, 168].includes(preH)) throw new Error("Evaluated prehistory must be explicitly24 or168 hours");
  const tradeStartT = endT - 24 * H, evaluationFromT = tradeStartT - preH * H, indicatorStartT = tradeStartT - (168 + 205) * H;
  return { endT, tradeStartT, evaluationFromT, indicatorStartT, runH: 24, preH, longH: preH, indicatorWarmupH: (168 + 205) - preH };
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
export async function studyRuntimeSettings(symbols, window, laneHistoryDays) {
  process.env.CTS_CORE_STATE = "off"; process.env.CTS_CORE_AUTOSTART = "0"; process.env.CTS_CORE_LIVE = "0";
  await import("./lib/core-test-offline-guard.cjs");
  const [{ DEFAULT_SETTINGS }, { CoreRuntime }, { CoreDb }] = await Promise.all([
    import("../src/core/config.ts"), import("../src/core/server/runtime.server.ts"), import("../src/core/server/db.server.ts"),
  ]);
  // Every nested ladder is supplied in full: production SettingsPatch merges grid one level deep.
  const settings = structuredClone(DEFAULT_SETTINGS);
  Object.assign(settings, { symbols: symbols.length, forceSymbols: [...symbols] });
  if (laneHistoryDays !== undefined) {
    if (!Number.isInteger(laneHistoryDays) || laneHistoryDays < 17 || laneHistoryDays > 45) throw new Error("Explicit all-lane history must cover at least17 days");
    settings.tfDays = Object.fromEntries(settings.tfs.map((tf) => [String(tf), laneHistoryDays]));
  }
  const runtime = new CoreRuntime(new CoreDb(":memory:"), { symbols: symbols.length, signals: { enabled: true } }, { replay: true, priceStream: null });
  try {
    runtime.updateSettings(settings);
    runtime.updateSettings({}, { causalBase: true, recordValidation: true, preH: window.preH, longH: window.longH, simH: window.runH });
    const actual = { settings: structuredClone(runtime.settings), wf: structuredClone(runtime.wf) };
    if (actual.settings.cost !== DEFAULT_SETTINGS.cost || !same(actual.settings.gates, DEFAULT_SETTINGS.gates) || !same(actual.settings.grid, DEFAULT_SETTINGS.grid)) throw new Error("Baseline changed production cost/gates/grid");
    if (!same(actual.settings.forceSymbols, symbols) || actual.settings.symbols !== symbols.length || actual.wf.validLastN !== 15 || actual.wf.signalValidLastN !== 25 || actual.wf.causalBase !== true || actual.wf.recordValidation !== true || actual.wf.preH !== window.preH || actual.wf.longH !== window.longH || actual.wf.simH !== window.runH) throw new Error("Runtime settings/WF do not match the frozen baseline");
    // Full WF contains thousands of derived protection cells and exceeds Linux's per-argument size limit.
    // Store it as evidence, but send only this explicit patch; the same production defaults derive every cell.
    const commandWf = Object.fromEntries(["causalBase", "recordValidation", "preH", "simH", "longH", "validLastN", "signalValidLastN"].map((key) => [key, actual.wf[key]]));
    return { ...actual, commandWf, settingsSha256: studyHash(studyJson(actual)), scope: "Current production focus, independent configured ranges and strategy toggles; no threshold relaxation", laneHistoryDays: laneHistoryDays ?? null };
  } finally { runtime.dispose(); }
}

function sourceFiles(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? sourceFiles(path.join(dir, x.name)) : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name) && !/\.test\.[^.]+$/.test(x.name) ? [path.join(dir, x.name)] : []); }
export function studySources() {
  const files = [...sourceFiles(path.join(ROOT, "src/core")), ...sourceFiles(path.join(ROOT, "scripts/lib")), ...["scripts/core-session.mjs", "scripts/core-22-symbol-study.mjs", "package.json", "package-lock.json"].map((f) => path.join(ROOT, f))];
  return files.filter((f) => fs.existsSync(f)).sort().map((f) => ({ path: path.relative(ROOT, f), sha256: studyHash(fs.readFileSync(f)) }));
}
export function verifyStudySources(protocol) {
  if (protocol.schema !== SCHEMA || !same(protocol.sources, studySources())) throw new Error("Source tree differs from frozen study; preserve this attempt and prepare a new one");
}

export function studyCommand(protocol, studyCase, output, phase = "engine") {
  const args = ["--experimental-strip-types", "--no-warnings", "--expose-gc", `--max-old-space-size=${protocol.budget.heapMb}`, path.join(ROOT, "scripts/core-session.mjs")];
  const book = ["--balance", String(protocol.book.balance), "--sizing", protocol.book.mode, "--pct", String(protocol.book.pct), "--leverage", String(protocol.book.leverage)];
  if (phase === "engine") args.push("--require-full-grid");
  if (phase === "engine") args.push("--feed", studyCase.feed, "--end-at", new Date(protocol.window.endT).toISOString(), "--evaluation-from", new Date(protocol.window.evaluationFromT).toISOString(), "--pre", String(protocol.window.preH), "--run", String(protocol.window.runH), "--symbols", String(studyCase.symbols.length), "--signals", "on", "--settings", JSON.stringify(studyCase.runtime.settings), "--wf", JSON.stringify(studyCase.runtime.commandWf), "--signal-progress", "--tape-trades", "--dump-only", "--dump", path.join(output, "raw.json"), "--max-wait-min", String(protocol.budget.timeoutMinutes), "--quiet", "true", ...book);
  else args.push("--replay", path.join(output, "raw.json"), "--signal-progress", "--out", path.join(output, "session"), "--html", path.join(output, "book"), ...book);
  return args;
}
export function studyEnvironment(workers = 2) {
  if (![1, 2].includes(workers)) throw new Error("Frozen worker count must be1 or2");
  return { PATH: process.env.PATH ?? "", LANG: "C.UTF-8", TZ: "UTC", NODE_OPTIONS: `--require ${path.join(ROOT, "scripts/lib/core-test-offline-guard.cjs")}`, MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576", CTS_CORE_WORKERS: String(workers), CTS_CORE_COMPARE: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_LIVE: "0" };
}
export const studyMemoryAbort = (log) => log.match(/^\s*memory:[^\n]*(?:compute aborted|compute not started|full grid required|abort[^\n]*fallback)[^\n]*$/im)?.[0]?.trim() ?? null;
export async function studyChild(args, logfile, timeoutMs, { workers = 2, watchMemory = false } = {}) {
  const fd = fs.openSync(logfile, "wx"), started = Date.now();
  try { return await new Promise((resolve, reject) => {
    // Its own process group makes cancellation precise even if an engine later starts subprocesses.
    const p = spawn(process.execPath, args, { cwd: ROOT, env: studyEnvironment(workers), detached: true, stdio: ["ignore", fd, fd] });
    let timedOut = false, memoryAbort = null, interrupted = null, escalation = null, monitor = null, closed = false;
    const killGroup = (signal) => {
      if (closed || !p.pid) return;
      try { process.kill(-p.pid, signal); } catch { p.kill(signal); }
    };
    const stop = () => { if (escalation || closed) return; killGroup("SIGTERM"); escalation = setTimeout(() => killGroup("SIGKILL"), 5000); escalation.unref(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const onInterrupt = (signal) => { interrupted = signal; stop(); };
    const sigint = () => onInterrupt("SIGINT"), sigterm = () => onInterrupt("SIGTERM");
    process.once("SIGINT", sigint); process.once("SIGTERM", sigterm);
    if (watchMemory) monitor = setInterval(() => {
      if (memoryAbort || closed) return;
      try { memoryAbort = studyMemoryAbort(fs.readFileSync(logfile, "utf8")); if (memoryAbort) stop(); } catch { /* a partial log read cannot authorize a passing result */ }
    }, 500);
    const cleanup = () => { closed = true; clearTimeout(timer); clearTimeout(escalation); clearInterval(monitor); process.off("SIGINT", sigint); process.off("SIGTERM", sigterm); };
    p.once("error", (e) => { cleanup(); reject(e); });
    p.once("close", (exitCode, signal) => { cleanup(); resolve({ exitCode, signal, timedOut, interrupted, memoryAbort, seconds: (Date.now() - started) / 1000 }); });
  }); } finally { fs.closeSync(fd); }
}

export function finishStudyReturns(x) {
  const unknown = x.unknown + (!Number.isFinite(x.gp) || !Number.isFinite(x.gl) || !Number.isFinite(x.gp - x.gl) || x.gl > 0 && !Number.isFinite(x.gp / x.gl) ? 1 : 0);
  return { ...x, unknown, pf: unknown ? null : x.n && x.gl > 0 ? x.gp / x.gl : null, noLoss: x.n > 0 && !unknown && x.gp > 0 && x.gl === 0, net: unknown ? null : x.gp - x.gl };
}
const empty = () => ({ n: 0, gp: 0, gl: 0, unknown: 0 });
const add = (x, r) => { x.n++; if (!Number.isFinite(r)) x.unknown++; else if (r > 0) x.gp += r; else x.gl -= r; };
const sum = (rows) => finishStudyReturns(rows.reduce((a, x) => ({ n: a.n + x.n, gp: a.gp + x.gp, gl: a.gl + x.gl, unknown: a.unknown + (x.unknown ?? 0) }), empty()));
export const studyHour = (exitT, window) => Math.ceil((exitT - window.tradeStartT) / H) - 1;

/** Exact config history before each distinct executed entry; every future/tied close is excluded from strict counts. */
export async function studyEntryHistoryAudit(raw, wf, floor = 0) {
  const [{ modeledUnitReturn }, { isSignalInd }] = await Promise.all([import("../src/core/metrics/stats.ts"), import("../src/core/indications/registry.ts")]);
  const executedConfigs = new Set((raw.trades ?? []).map((x) => x.cfg));
  const tapes = new Map();
  const index = (rows) => {
    const sorted = [...rows].sort((a, b) => a.exitT - b.exitT), sides = new Map(), symbolSides = new Map();
    for (const row of sorted) {
      const side = row.side > 0 ? 1 : -1, key = `${row.sym}|${side}`;
      if (!sides.has(side)) sides.set(side, []); sides.get(side).push(row);
      if (!symbolSides.has(key)) symbolSides.set(key, []); symbolSides.get(key).push(row);
    }
    return { pooled: sorted, sides, symbolSides };
  };
  for (const tp of raw.tapeTrades ?? []) if (executedConfigs.has(tp.id)) tapes.set(tp.id, index((tp.trades ?? []).map(([sym, side, entryT, exitT, r]) => ({ sym, side, entryT, exitT, r }))));
  const acceptedRows = new Map();
  for (const x of raw.trades ?? []) { if (!acceptedRows.has(x.cfg)) acceptedRows.set(x.cfg, []); acceptedRows.get(x.cfg).push({ ...x, r: modeledUnitReturn(x) }); }
  const selected = new Map([...acceptedRows].map(([cfg, rows]) => [cfg, index(rows)]));
  const history = (rows, t, target) => {
    let lo = 0, hi = rows.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (rows[mid].exitT < t) lo = mid + 1; else hi = mid; }
    const strict = lo; while (lo < rows.length && rows[lo].exitT === t) lo++;
    const values = target > 0 ? rows.slice(Math.max(0, strict - target), strict) : [], totals = empty();
    for (const row of values) add(totals, row.r);
    return { availableStrictlyBefore: strict, availableAtOrBefore: lo, closesAtEntryTimestamp: lo - strict, targetN: target,
      effectiveFloor: target > 0 ? floor > 0 ? Math.min(floor, target) : target : 0, fullTargetPresent: target <= 0 || strict >= target,
      partialAllowedByConfiguredFloor: target > 0 && strict < target && floor > 0 && strict >= floor,
      lastNStrictBefore: { ...finishStudyReturns(totals), distinctOnsets: new Set(values.map((x) => `${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`)).size },
      latestStrictExitT: strict ? rows[strict - 1].exitT : null };
  };
  const entries = new Map();
  for (const x of raw.trades ?? []) {
    const key = `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`;
    if (entries.has(key)) { entries.get(key).executedCloseSlices++; continue; }
    const ind = x.cfg.split("|")[1] ?? "", targetN = isSignalInd(ind) ? wf.signalValidLastN ?? wf.validLastN ?? 0 : wf.validLastN ?? 0;
    const tape = tapes.get(x.cfg), own = selected.get(x.cfg), side = x.side > 0 ? 1 : -1;
    entries.set(key, { cfg: x.cfg, sym: x.sym, side, entryT: x.entryT, targetN, executedCloseSlices: 1, candidateHistoryKnown: !!tape,
      candidateConfigPooled: tape ? history(tape.pooled, x.entryT, targetN) : null,
      candidateOwnDirection: tape ? history(tape.sides.get(side) ?? [], x.entryT, targetN) : null,
      candidateOwnSymbolDirection: tape ? history(tape.symbolSides.get(`${x.sym}|${side}`) ?? [], x.entryT, targetN) : null,
      previouslyAcceptedExecutionInRun: history(own.pooled, x.entryT, targetN) });
  }
  const rows = [...entries.values()];
  return { scope: "Read-only candidate-history audit at actual modeled entry times, separately from selected execution history. Strict columns use exitT < entryT. Runtime lastNOk accepts exitT <= entryT, shown separately; strict deficits alone do not establish a runtime gate violation. No future closes enter either count. No unknown tape is treated as empty/passing.",
    floor, distinctExecutedEntries: rows.length, settledCloseSlices: raw.trades?.length ?? 0, repeatedEntryCloseSlices: (raw.trades?.length ?? 0) - rows.length,
    missingCandidateTapeEntries: rows.filter((x) => !x.candidateHistoryKnown).length,
    fullTargetStrictBefore: rows.filter((x) => x.candidateConfigPooled?.fullTargetPresent).length,
    partialConfiguredFloorStrictBefore: rows.filter((x) => x.candidateConfigPooled?.partialAllowedByConfiguredFloor).length,
    belowConfiguredFloorStrictBefore: rows.filter((x) => x.candidateConfigPooled && !x.candidateConfigPooled.fullTargetPresent && !x.candidateConfigPooled.partialAllowedByConfiguredFloor).length,
    entriesWithTiedCloses: rows.filter((x) => x.candidateConfigPooled?.closesAtEntryTimestamp > 0).length,
    selectedExecutionHistoryScope: "Accepted virtual settled closes captured inside this24h run only; this never replaces the independent historical candidate tape used by runtime gates.", rows };
}

/** Reduction of actual runtime output only; no fixed-cohort independent replay is substituted. */
export async function summarizeStudy(raw, book, protocol, studyCase, log = "") {
  const { modeledUnitReturn } = await import("../src/core/metrics/stats.ts");
  const [{ orderKey }, { rangeOfId }, { laneOf, isSignalInd }] = await Promise.all([import("../src/core/sizing.ts"), import("../src/core/minimal-coord.ts"), import("../src/core/indications/registry.ts")]);
  const structural = [];
  const check = (name, ok) => structural.push({ name, ok: !!ok });
  const expected = studyCase.runtime;
  check("exact24h simulated window", raw.window?.startT === protocol.window.tradeStartT && raw.window?.endT === protocol.window.endT);
  check("exact complete symbol universe", same([...(raw.engine?.universe ?? [])].sort(), [...studyCase.symbols].sort()));
  check("actual symbols requested", raw.settings?.symbolsAsked === studyCase.symbols.length);
  check("actual causal/time/last-N settings", ["causalBase", "preH", "simH", "longH", "validLastN", "signalValidLastN"].every((k) => raw.settings?.wf?.[k] === expected.wf[k]));
  check("actual settings parity", raw.settings?.cost === expected.settings.cost && same(raw.settings?.gates, expected.settings.gates) && same(raw.settings?.lanes, expected.settings.tfs) && same(raw.settings?.toggles, expected.settings.toggles) && same(raw.settings?.disabledKinds, expected.settings.disabledKinds) && raw.settings?.focus === expected.settings.focus.length && raw.settings?.evaluationFromT === protocol.window.evaluationFromT);
  check("actual sizing parity", raw.settings?.book?.balance === protocol.book.balance && raw.settings?.book?.leverage === protocol.book.leverage && raw.settings?.book?.sizing?.mode === protocol.book.mode && raw.settings?.book?.sizing?.pct === expected.settings.sizing?.pct && raw.settings?.live?.sizingMode === expected.settings.sizing?.mode && protocol.book.pct === expected.settings.sizing?.pct);
  check("full computation without memory fallback", (raw.engine?.mem?.computeLevel ?? raw.engine?.mem?.fallback) === 0);
  check("completed paper step", /paper step on compute #\d+:/.test(log) && !/universe not complete|WARNING: the paper step|WARNING: the reported compute/.test(log));
  check("every hourly runtime revalidation recorded", Array.from({ length: 24 }, (_, i) => protocol.window.tradeStartT + i * H).every((t) => raw.validation?.some((x) => x.t === t && Array.isArray(x.checks))));
  check("full Base processing coverage", Number.isSafeInteger(raw.engine?.coverage?.expectedCombos) && raw.engine.coverage.expectedCombos > 0 && raw.engine.coverage.expectedCombos === raw.engine.coverage.evaluated);
  const allocations = new Map();
  for (const a of book.sizedOrders ?? []) if (Number.isSafeInteger(a.closeIndex)) allocations.set(a.closeIndex, allocations.has(a.closeIndex) ? null : a);
  const virtual = empty(), funded = empty(), by = new Map(), config = new Map();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, startT: protocol.window.tradeStartT + hour * H, virtual: empty(), funded: empty(),
    candidateStages: Object.fromEntries(["beforeBase", "afterBase", "pool", "seated"].map((stage) => {
      const row = raw.funnel?.[stage]?.[hour], base = stage === "beforeBase" || stage === "afterBase";
      return [stage, { ...finishStudyReturns({ ...empty(), ...row }), sampleRecorded: !!row && (!base || row.n > 0 || raw.engine?.baseEvaluated === 0) }];
    })) }));
  let zeroAllocations = 0, unknownAllocations = 0;
  const group = (axis, key) => { const id = `${axis}|${key}`; if (!by.has(id)) by.set(id, { axis, key, virtual: empty(), funded: empty() }); return by.get(id); };
  for (let i = 0; i < (raw.trades ?? []).length; i++) {
    const x = raw.trades[i], h = studyHour(x.exitT, protocol.window), r = modeledUnitReturn(x), a = allocations.get(i);
    if (h < 0 || h >= 24 || x.entryT < protocol.window.tradeStartT || x.entryT >= protocol.window.endT || x.markedOpen || ["open", "end"].includes(x.reason)) throw new Error("Prewindow/endpoint/invalid close in settled cohort");
    const ind = x.cfg.split("|")[1] ?? "?", range = rangeOfId(x.cfg) || (isSignalInd(ind) ? "signal" : "wide"), kind = x.kind ?? "unknown", lane = laneOf(ind), direction = x.side > 0 ? "long" : "short";
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
  const validationRows = (raw.validation ?? []).flatMap((step) => step.checks.map(([id, ok, n, gateScore, gp, gl]) => ({ t: step.t, id, pass: !!ok, n, gateScore, gp, gl, pf: gl > 0 ? gp / gl : null, noLoss: n > 0 && gp > 0 && gl === 0 })));
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
  return { schema: "cts-causal-22-symbol-results-v1", complete: structural.every((x) => x.ok), structural, symbolCount: studyCase.symbols.length, window: raw.window,
    scope: "Retrospective causal modeled orders from CoreRuntime; venue-owned execution and future profitability are unverified. Tape candidates overlap and do not equal account fills.",
    settingsSha256: expected.settingsSha256, sourceSha256: studyHash(studyJson(protocol.sources)), cost: raw.settings?.cost,
    dataCoverage: { evaluatedPrehistoryHoursRequested: protocol.window.preH, indicatorWarmupHoursSeparate: protocol.window.indicatorWarmupH, actualFrozenTfDays: expected.settings.tfDays,
      feedFirstT: protocol.window.indicatorStartT, feedEndT: protocol.window.endT, retainedQualifiedOrExecutedTapeHistory: [...retainedHistory.values()],
      limitation: "Retained tapes cover configs qualified or executed at a runtime step, not every rejected config; a sparse trade history is never filled or counted as a last-N pass." },
    progression: { basePairsEvaluated: raw.engine?.baseEvaluated, basePairsPassed: raw.engine?.basePassed, allComputedConfigTapes: raw.engine?.tapes, configsCheckedAcrossRun: allChecked.size, configsEverQualified: qualified.size, executedConfigs: config.size,
      // Pre/post-Base Base cells and config tapes are deliberately distinct samples.
      hourlyCandidateDiagnostics: Object.fromEntries(["beforeBase", "afterBase", "pool", "seated"].map((k) => {
        const value = sum(raw.funnel?.[k] ?? []), base = k === "beforeBase" || k === "afterBase";
        return [k, { ...value, sampleRecorded: value.n > 0 || !base || raw.engine?.baseEvaluated === 0,
          scope: base ? "Base representative candidate cells; slim runtime history may omit their closes. Missing close rows mean unavailable hourly PF, not a measured zero-trade result." : "independent overlapping config tape candidates; not execution" }];
      })),
      baseByRange: raw.engine?.baseByRange ?? [], baseRejections: raw.engine?.baseWhy ?? [], strategyGateFailures: raw.tapeAgg?.evalFails ?? {}, afterBaseStrategyGates: raw.tapeAgg?.evalAfterBase ?? {}, entryRejections: raw.engine?.skips ?? {}, entryRejectionsByRange: raw.engine?.skipsByRange ?? {} },
    acceptedVirtualSettled: finishStudyReturns(virtual), fundedModeledSettled: finishStudyReturns(funded), zeroAllocations, unknownAllocations, hourly,
    greenFundedHours: hourly.filter((x) => x.funded.n && x.funded.net > 0).length, activeFundedHours: hourly.filter((x) => x.funded.n > 0).length,
    groups: [...by.values()].map(finalized), configs: [...config.values()].map(finalized), validationRows,
    continuousValidation: { recordedSteps: raw.validation?.length ?? 0, checked: validationRows.length, passed: validationRows.filter((x) => x.pass).length, failed: validationRows.filter((x) => !x.pass).length },
    entryHistoryAudit: await studyEntryHistoryAudit(raw, expected.wf, expected.settings.gates.lastNFloor ?? 0),
    pipelineCoverage: raw.engine?.coverage ?? null,
    signalProgress: raw.signalProgress ? { requestedConfigs: raw.signalProgress.requestedConfigs?.length ?? 0, distinctConfiguredConfigs: raw.signalProgress.configs?.length ?? 0,
      builtConfigs: raw.signalProgress.configs?.filter((x) => x.built).length ?? 0, build: raw.signalProgress.build, definitions: raw.signalProgress.definitions,
      exactConfigEvidence: "raw.json signalProgress.configs and tapeTrades; retained immutably with source/feed hashes" } : null,
    performance: { seconds: raw.runSeconds, computeMs: raw.engine?.computeMs, peakRssMb: raw.engine?.rssMaxMb, phases: raw.engine?.phases, loop: raw.engine?.loop, stalls: raw.engine?.stalls, memory: raw.engine?.mem },
    nativeReportChecks: book.checks ?? [], equity: book.total ?? null, endpointMarks: { excludedFromSettledPF: true, open: raw.openEnd?.length ?? 0 },
    pruning: { performed: false, rule: "No OOS-based member removal. Freeze any later prune variant using only pre-trade causal diagnostics, then run a separately retained comparison." } };
}

const pfText = (x) => x?.noLoss ? "no losses" : x?.pf == null ? "—" : x.pf.toFixed(3);
export function studyMarkdown(s) {
  const rows = ["# Causal 24h simulation", "", `${s.symbolCount} symbols; full computation ${s.complete ? "complete" : "INVALID/INCOMPLETE"}. ${s.scope}`, "",
    "| Base range | Evaluated pairs | Passed pairs | Before: median pair PF | After: pooled validated PF |", "|---|---:|---:|---:|---:|",
    ...(s.progression.baseByRange ?? []).map((r) => `|${r.range ?? r.tag ?? "Wide"}|${r.evaluated}|${r.passed}|${r.pfMedian == null ? "—" : r.pfMedian.toFixed(3)}|${pfText(finishStudyReturns({ n: r.passed, gp: r.passedGp ?? 0, gl: r.passedGl ?? 0, unknown: 0 }))}|`),
    "", "Base cells are representative histories; the before column is a median and the after column pools the validated cells. They are separate from full strategy-config and execution samples below.", "",
    "| Cohort | Settled closes | Return PF | Net unit-return points |", "|---|---:|---:|---:|",
    ...[["Before Base: representative candidate cells", s.progression.hourlyCandidateDiagnostics.beforeBase], ["After Base: representative candidate cells", s.progression.hourlyCandidateDiagnostics.afterBase],
      ["Computed config tape candidates", s.progression.hourlyCandidateDiagnostics.pool], ["Seated config tape candidates", s.progression.hourlyCandidateDiagnostics.seated],
      ["Accepted virtual orders after runtime gates", s.acceptedVirtualSettled], ["Funded modeled orders in shared capped book", s.fundedModeledSettled]].map(([label, x]) => `|${label}|${x.sampleRecorded === false ? "unavailable" : x.n}|${pfText(x)}|${x.sampleRecorded === false || x.net == null ? "—" : (x.net * 100).toFixed(3)}|`),
    "", "The representative-cell pre/post rows share the same gross-return aggregation but have different qualification cohorts. Full config candidates are a separate overlapping sample. Slim Base history may omit representative close rows: unavailable PF is never replaced with zero or a passing score.", "",
    "| UTC hour starting | Pre-Base PF | Post-Base PF | Config pool PF | Seated PF | Funded PF | Funded closes | Net unit-return points |", "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...s.hourly.map((x) => `|${new Date(x.startT).toISOString()}|${pfText(x.candidateStages.beforeBase)}|${pfText(x.candidateStages.afterBase)}|${pfText(x.candidateStages.pool)}|${pfText(x.candidateStages.seated)}|${pfText(x.funded)}|${x.funded.n}|${x.funded.net == null ? "—" : (x.funded.net * 100).toFixed(3)}|`),
    "", `Positive funded hours ${s.greenFundedHours}/24 (${s.activeFundedHours} active). Configs checked ${s.progression.configsCheckedAcrossRun}; ever qualified ${s.progression.configsEverQualified}; executed ${s.progression.executedConfigs}.`,
    "", `Last-N entry audit: ${s.entryHistoryAudit.fullTargetStrictBefore} entries had their full target strictly before entry; ${s.entryHistoryAudit.partialConfiguredFloorStrictBefore} had a partial sample meeting the existing minimum floor ${s.entryHistoryAudit.floor}; ${s.entryHistoryAudit.missingCandidateTapeEntries} had unknown tape evidence. These are sample-availability counts, not PF gate pass counts. Same-timestamp closes are reported separately because runtime includes them.`,
    "", `Base pairs ${s.progression.basePairsPassed}/${s.progression.basePairsEvaluated}; computed config tapes ${s.progression.allComputedConfigTapes}. Full pre/post-Base stage counts, independent candidate PF, failure reasons and per-indication/range/type/direction returns are in summary.json.`, "", `Compute${Math.round((s.performance.computeMs ?? 0) / 1000)}s; peak RSS${s.performance.peakRssMb ?? "unknown"}MB.`, "", "No config removal, gate relaxation or live promotion is authorized by this retrospective output.", ""];
  const failed = s.structural.filter((x) => !x.ok); if (failed.length) rows.push("Failed completeness checks: " + failed.map((x) => x.name).join("; "), "");
  return rows.join("\n");
}

export async function studyMain(argv) {
  const [mode, ...rest] = argv;
  const arg = (key, fallback) => { const i = rest.indexOf(`--${key}`); return i < 0 ? fallback : rest[i + 1]; };
  if (mode === "prepare") {
    const source = path.resolve(arg("feed", "")), output = path.resolve(arg("out", ""));
    if (!arg("feed") || !arg("out") || fs.existsSync(output)) throw new Error("prepare requires existing --feed and a NEW --out directory");
    const endT = Date.parse(arg("end-at", "2026-10-17T21:00:00Z")), window = studyWindow(endT, Number(arg("pre-hours", "24"))), loaded = read(source);
    validateStudyFeed(loaded.data, STUDY_SYMBOLS, window);
    fs.mkdirSync(output, { recursive: true });
    const cases = [];
    for (const count of [20, 22]) {
      const symbols = STUDY_SYMBOLS.slice(0, count), set = new Set(symbols), feed = { ...loaded.data, tickers: loaded.data.tickers.filter((x) => set.has(x.symbol ?? x.sym)), candles: Object.fromEntries(Object.entries(loaded.data.candles).filter(([key]) => set.has(key.split("|")[0]))) };
      const file = path.join(output, `feed-${count}.json`), text = JSON.stringify(feed); fs.writeFileSync(file, text, { flag: "wx" });
      cases.push({ id: `baseline-${count}`, symbols, feed: file, feedSha256: studyHash(text), quality: validateStudyFeed(feed, symbols, window), runtime: await studyRuntimeSettings(symbols, window, arg("lane-history-days") === undefined ? undefined : Number(arg("lane-history-days"))) });
    }
    if (cases.some((c) => !same(c.runtime.settings.sizing, cases[0].runtime.settings.sizing))) throw new Error("Study cases disagree on actual production sizing");
    const workers = Number(arg("workers", "2")); studyEnvironment(workers);
    const sources = studySources();
    const p = { schema: SCHEMA, frozenAt: new Date().toISOString(), classification: "Rules/settings/source/feed frozen before this scoring attempt; retrospective public market simulation", window, originalFeed: { path: source, sha256: loaded.sha256 }, cases, sources,
      book: { balance: 1000, pct: cases[0].runtime.settings.sizing.pct, mode: cases[0].runtime.settings.sizing.mode === "fixed" ? "fixed" : "equityPct", leverage: 10,
        sizingProvenance: "Production runtime settings.sizing.pct; explicit modeled start balance1000 and leverage10. minQty paper models use equityPct, as native session sizing does." }, budget: { heapMb: 4096, workers, concurrency: 1, timeoutMinutes: Number(arg("timeout-min", "180")), failFastOnMemoryAbort: true },
      selection: "No performance-based removal before the complete22-symbol24h baseline; no test-period/OOS tuning. Any variant requires a new immutable protocol before its outcome.",
      actualExecution: false, live: false, newNetworkRequests: 0 };
    writeNew(path.join(output, "protocol.json"), p); console.log(studyJson({ prepared: true, protocol: path.join(output, "protocol.json"), cases: cases.map((x) => x.id) })); return;
  }
  if (!["run", "compare"].includes(mode) || !arg("protocol")) throw new Error("Usage: core-22-symbol-study.mjs prepare --feed feed.json --out NEW_DIRECTORY [--lane-history-days 18] [--pre-hours 24|168] [--workers 1|2] | run --protocol protocol.json --case baseline-20|baseline-22 | compare --protocol protocol.json");
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
    const result = { protocolSha256: frozen.sha256, comparable: true, scope: "Same24h source window and gates; exact20-symbol subset versus22-symbol universe. Shared-book capacity and causal pooled histories can change the executed cohort.", cases: summaries.map(({ id, summary }) => ({ id, summarySha256: summary.sha256, ...Object.fromEntries(["symbolCount", "acceptedVirtualSettled", "fundedModeledSettled", "greenFundedHours", "activeFundedHours", "progression", "performance"].map((key) => [key, summary.data[key]])) })) };
    writeNew(path.join(dir, "comparison.json"), result); console.log(studyJson(result)); return;
  }
  const c = p.cases.find((x) => x.id === arg("case")); if (!c) throw new Error("Explicit frozen --case required");
  // prepare validated every candle. Identical bytes preserve that validation without retaining a second
  // parsed market universe in the parent while the engine holds its own copy.
  await verifyStudyFeedHash(c.feed, c.feedSha256);
  if (!same(await studyRuntimeSettings(c.symbols, p.window, c.runtime.laneHistoryDays ?? undefined), c.runtime)) throw new Error("Actual preflight settings changed after freeze");
  const dest = path.join(dir, c.id), lock = path.join(ROOT, "runs", "core-22-symbol-study.lock");
  if (fs.existsSync(dest)) throw new Error("Case already has an attempt; preserve it and prepare a new protocol for retries");
  fs.mkdirSync(path.dirname(lock), { recursive: true }); const lockFd = fs.openSync(lock, "wx"); fs.writeFileSync(lockFd, String(process.pid)); fs.mkdirSync(dest);
  const command = { engine: studyCommand(p, c, dest), render: studyCommand(p, c, dest, "render"), environment: studyEnvironment(p.budget.workers), protocolSha256: frozen.sha256 };
  writeNew(path.join(dest, "command.json"), command);
  const result = { id: c.id, complete: false };
  try {
    result.engine = await studyChild(command.engine, path.join(dest, "engine.log"), p.budget.timeoutMinutes * 60_000, { workers: p.budget.workers, watchMemory: p.budget.failFastOnMemoryAbort === true });
    if (result.engine.exitCode !== 0 || result.engine.timedOut || result.engine.memoryAbort || result.engine.interrupted || !fs.existsSync(path.join(dest, "raw.json"))) throw new Error("Engine failed/incomplete; retained exact attempt");
    result.render = await studyChild(command.render, path.join(dest, "render.log"), p.budget.timeoutMinutes * 60_000, { workers: p.budget.workers });
    if (![0, 1].includes(result.render.exitCode) || result.render.timedOut || result.render.interrupted) throw new Error("Report render failed/incomplete");
    verifyStudySources(p);
    const raw = read(path.join(dest, "raw.json")), book = read(path.join(dest, "book/data.json"));
    const summary = await summarizeStudy(raw.data, book.data, p, c, fs.readFileSync(path.join(dest, "engine.log"), "utf8"));
    summary.provenance = { protocolSha256: frozen.sha256, feedSha256: c.feedSha256, rawSha256: raw.sha256, bookSha256: book.sha256 };
    writeNew(path.join(dest, "summary.json"), summary); fs.writeFileSync(path.join(dest, "summary.md"), studyMarkdown(summary), { flag: "wx" });
    result.complete = summary.complete; result.structuralFailures = summary.structural.filter((x) => !x.ok); result.summarySha256 = studyHash(fs.readFileSync(path.join(dest, "summary.json")));
  } catch (e) { result.error = String(e); }
  finally { writeNew(path.join(dest, "run-result.json"), result); fs.closeSync(lockFd); fs.unlinkSync(lock); }
  console.log(studyJson(result)); if (!result.complete) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await studyMain(process.argv.slice(2));
