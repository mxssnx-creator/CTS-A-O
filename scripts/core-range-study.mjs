#!/usr/bin/env node
// Explicit offline study commands. `prepare`/`seal-source` never execute a strategy; `run` requires the sealed source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { assertStudyProtocol, deepStudyMerge, rangeStudyIdentityUniverse, studyJson, studySha256 } from "./lib/range-study.mjs";
import { signalTicker } from "./lib/signal-market.mjs";
import { rangeStudyEvidence } from "./lib/range-study-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => { const bytes = fs.readFileSync(p); return { data: JSON.parse(bytes), sha256: studySha256(bytes), bytes: bytes.length }; };
const write = (p, x) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, studyJson(x)); };
const sourcePaths = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? sourcePaths(path.join(dir, x.name)) : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name) ? [path.join(dir, x.name)] : []);
export function studySourceFiles() {
  const paths = [...sourcePaths(path.join(root, "src/core")), ...sourcePaths(path.join(root, "src/components/v2")), ...sourcePaths(path.join(root, "scripts/lib")),
    path.join(root, "scripts/core-session.mjs"), path.join(root, "scripts/core-range-study.mjs"), path.join(root, "package.json"), path.join(root, "package-lock.json")];
  return paths.filter((p) => fs.existsSync(p) && !/\.test\.[^.]+$/.test(p) && !p.endsWith("/test-support.ts")).sort().map((p) => ({ path: path.relative(root, p), sha256: studySha256(fs.readFileSync(p)) }));
}
export function verifyStudySource(seal, protocolSha256) {
  if (seal.status !== "frozen" || seal.protocolSha256 !== protocolSha256 || !/^[0-9a-f]{40}$/.test(seal.checkpoint)) throw new Error("An acknowledged source checkpoint and exact protocol seal are required");
  const changed = seal.files.filter((x) => !fs.existsSync(path.join(root, x.path)) || studySha256(fs.readFileSync(path.join(root, x.path))) !== x.sha256);
  if (changed.length) throw new Error("Source changed after freeze: " + changed.map((x) => x.path).join(", "));
  if (studySha256(studyJson(studySourceFiles())) !== seal.sourceSha256) throw new Error("Source inventory differs from sealed import-source manifest");
}
export function studyFeed(sources, p, fold) {
  const feed = { tickers: [], candles: {} }, quality = {};
  for (const sym of p.symbols) {
    const byTime = new Map(); let overlaps = 0;
    for (const src of sources) for (const row of src.candles?.[`${sym}|1`] ?? src[sym] ?? []) {
      if (row.t < fold.indicatorStartT || row.t >= fold.endT) continue;
      const c = Object.fromEntries(["t", "o", "h", "l", "c", "v"].map((k) => [k, row[k]]));
      if (!Object.values(c).every((x) => typeof x === "number" && Number.isFinite(x)) || c.t % 60_000 || c.l <= 0 || c.l > Math.min(c.o, c.c) || c.h < Math.max(c.o, c.c) || c.v < 0) throw new Error("Invalid cached candle");
      const old = byTime.get(c.t);
      if (old) { if (JSON.stringify(old) !== JSON.stringify(c)) throw new Error("Conflicting public cache overlap"); overlaps++; } else byTime.set(c.t, c);
    }
    const candles = [...byTime.values()].sort((a, b) => a.t - b.t), expected = (fold.endT - fold.indicatorStartT) / 60_000;
    if (candles.length !== expected || candles.some((x, i) => x.t !== fold.indicatorStartT + i * 60_000)) throw new Error(`Incomplete cached input for ${sym}`);
    feed.candles[`${sym}|1`] = candles;
    feed.tickers.push(signalTicker(sym, candles.filter((x) => x.t >= fold.evaluationFromT), fold.tradeStartT));
    quality[sym] = { bars: candles.length, first: candles[0].t, last: candles.at(-1).t, gaps: 0, identicalOverlaps: overlaps };
  }
  return { feed, quality };
}
export function studyCaseCommand(p, fold, profile, dir, phase) {
  const settings = deepStudyMerge(p.commonSettings, profile.settings), wf = deepStudyMerge(p.commonWf, profile.wf);
  const book = ["--balance", String(p.book.balance), "--pct", String(p.book.pct), "--leverage", String(p.book.leverage)];
  const args = ["--experimental-strip-types", "--no-warnings", "--expose-gc", `--max-old-space-size=${p.budget.heapMb}`, path.join(root, "scripts/core-session.mjs")];
  if (phase === "engine") args.push("--feed", path.join(path.dirname(dir), fold.id, "feed.json"), "--end-at", new Date(fold.endT).toISOString(), "--evaluation-from", new Date(fold.evaluationFromT).toISOString(),
    "--pre", String(p.preH), "--run", String(p.runH), "--symbols", String(p.symbols.length), "--signals", "off", "--settings", JSON.stringify(settings), "--wf", JSON.stringify(wf),
    "--signal-progress", "--tape-trades", "--dump-only", "--dump", path.join(dir, "raw.json"), "--quiet", "true", ...book);
  else args.push("--replay", path.join(dir, "raw.json"), "--signal-progress", "--out", path.join(dir, "session"), "--html", path.join(dir, "book"), ...book);
  return args;
}
const safeEnvironment = () => ({ PATH: process.env.PATH ?? "", LANG: "C.UTF-8", TZ: "UTC", NODE_OPTIONS: `--require ${path.join(root, "scripts/lib/core-test-offline-guard.cjs")}`,
  CTS_CORE_WORKERS: "1", CTS_CORE_COMPARE: "0", CTS_CORE_VARIANTS: "0", CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_LIVE: "0" });
async function child(args, log, timeoutMs) {
  const fd = fs.openSync(log, "w"), start = Date.now();
  try { return await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, args, { cwd: root, env: safeEnvironment(), stdio: ["ignore", fd, fd] });
    let timeout = false;
    const timer = setTimeout(() => { timeout = true; proc.kill("SIGTERM"); const hard = setTimeout(() => proc.kill("SIGKILL"), 5000); hard.unref(); }, timeoutMs);
    proc.once("error", (e) => { clearTimeout(timer); reject(e); });
    proc.once("close", (exitCode, signal) => { clearTimeout(timer); resolve({ exitCode, signal, timedOut: timeout, elapsedSeconds: (Date.now() - start) / 1000 }); });
  }); } finally { fs.closeSync(fd); }
}
function csv(file, rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))], cell = (x) => x == null ? "" : typeof x === "object" ? '"' + JSON.stringify(x).replaceAll('"', '""') + '"' : typeof x === "string" ? '"' + x.replaceAll('"', '""') + '"' : String(x);
  fs.writeFileSync(file, keys.join(",") + "\n" + rows.map((x) => keys.map((k) => cell(x[k])).join(",")).join("\n") + "\n");
}
function emitEvidence(dir, e, provenance) {
  const { configSides, configSymbolProof, virtualTrades, fundedTrades, validation, endpoints, ...summary } = e;
  write(path.join(dir, "evidence-summary.json"), { ...summary, provenance });
  csv(path.join(dir, "exact-config-side-evidence.csv"), configSides);
  csv(path.join(dir, "exact-config-symbol-proof.csv"), configSymbolProof);
  csv(path.join(dir, "accepted-virtual-close-slices.csv"), virtualTrades); csv(path.join(dir, "funded-owned-close-slices.csv"), fundedTrades);
  const hours = e.hourly.map(({ key, ...value }) => { const [axis, hour, tag, kind, side] = key.split("|"); const startT = e.window.startT + Number(hour) * 3_600_000; return { axis, hour: Number(hour), tag, kind, side: Number(side), startUtc: new Date(startT).toISOString(), endUtc: new Date(startT + 3_600_000).toISOString(), ...value }; });
  write(path.join(dir, "hourly.json"), { provenance, rows: hours }); csv(path.join(dir, "hourly.csv"), hours);
  csv(path.join(dir, "validation-checks.csv"), validation.flatMap((step) => step.checks.map(([id, ok, n, gateScore, gp, gl]) => ({ t: step.t, id, qualified: !!ok, n, pf: gl > 0 ? gp / gl : null, noLoss: n > 0 && gp > 0 && gl === 0, gateScore, gp, gl }))));
  write(path.join(dir, "endpoint-marks-separate.json"), { provenance, ...endpoints });
}
export async function rangeStudyMain(argv) {
  const [mode, file, extra] = argv;
  if (!["prepare", "seal-source", "run"].includes(mode) || !file) throw new Error("Usage: core-range-study.mjs prepare|seal-source|run protocol.json [checkpoint|fold-P0]");
  const loaded = read(path.resolve(file)), p = assertStudyProtocol(loaded.data), dir = path.dirname(path.resolve(file));
  if (mode === "prepare") {
    const paths = ["runs/research-market-20261014/market-cache.json", "runs/signal-6x6-20261015-0400/attempt-03-independent-signal-cells/feed.json"];
    const sources = paths.map((x) => ({ path: x, ...read(path.join(root, x)) }));
    for (const fold of p.folds) { const result = studyFeed(sources.map((x) => x.data), p, fold); const text = JSON.stringify(result.feed), dest = path.join(dir, fold.id); fs.mkdirSync(dest, { recursive: true }); fs.writeFileSync(path.join(dest, "feed.json"), text);
      write(path.join(dest, "market-manifest.json"), { protocolSha256: loaded.sha256, newNetworkRequests: 0, source: sources.map(({ path: sourcePath, sha256, bytes }) => ({ path: sourcePath, sha256, bytes })), fold, quality: result.quality, feed: { bytes: Buffer.byteLength(text), sha256: studySha256(text) } }); }
    console.log(studyJson({ prepared: true, newNetworkRequests: 0, folds: p.folds.length })); return;
  }
  const sealFile = path.join(dir, "source-freeze.json");
  if (mode === "seal-source") {
    if (!/^[0-9a-f]{40}$/.test(extra ?? "")) throw new Error("Explicit final root source checkpoint required");
    if (fs.existsSync(sealFile)) throw new Error("Source seal exists; preserve it rather than overwrite");
    const files = studySourceFiles(), universes = p.profiles.map((x) => ({ profile: x.id, ...rangeStudyIdentityUniverse(p, x) }));
    if (new Set(universes.map((x) => studySha256(studyJson(x.configurations)))).size !== 1) throw new Error("Profiles have different configured identities");
    write(path.join(dir, "configured-identity-universe.json"), universes[0].configurations);
    for (const u of universes) write(path.join(dir, `settings-${u.profile}.json`), { settingsVersion: u.settingsVersion, settings: u.settings, wf: u.wf });
    write(sealFile, { status: "frozen", at: new Date().toISOString(), checkpoint: extra, node: process.version, protocolSha256: loaded.sha256, sourceSha256: studySha256(studyJson(files)), files,
      profiles: universes.map((x) => ({ profile: x.profile, settingsVersion: x.settingsVersion, requested: x.requestedCells, configured: x.configurations.length })) });
    console.log(studyJson({ sealed: true, checkpoint: extra, files: files.length })); return;
  }
  const seal = read(sealFile); verifyStudySource(seal.data, loaded.sha256);
  const cases = p.folds.flatMap((fold) => p.profiles.map((profile) => ({ fold, profile, id: `${fold.id}-${profile.id}` }))).filter((x) => !extra || x.id === extra);
  if (!cases.length) throw new Error("Unknown frozen case");
  const lock = path.join(dir, "study-heavy.lock"), lockFd = fs.openSync(lock, "wx"); fs.writeFileSync(lockFd, String(process.pid));
  try { for (const c of cases) {
    const dest = path.join(dir, c.id); if (fs.existsSync(dest)) throw new Error("Case output already exists; never overwrite a measured attempt"); fs.mkdirSync(dest);
    const feed = read(path.join(dir, c.fold.id, "market-manifest.json")); if (feed.data.protocolSha256 !== loaded.sha256 || feed.data.feed.sha256 !== studySha256(fs.readFileSync(path.join(dir, c.fold.id, "feed.json")))) throw new Error("Frozen feed differs");
    const universe = rangeStudyIdentityUniverse(p, c.profile); if (universe.settingsVersion !== seal.data.profiles.find((x) => x.profile === c.profile.id)?.settingsVersion) throw new Error("Settings version differs from sealed source");
    const command = { engine: studyCaseCommand(p, c.fold, c.profile, dest, "engine"), render: studyCaseCommand(p, c.fold, c.profile, dest, "render"), environment: safeEnvironment(), protocolSha256: loaded.sha256, sourceFreezeSha256: seal.sha256, settingsVersion: universe.settingsVersion, feedSha256: feed.data.feed.sha256 };
    write(path.join(dest, "command.json"), command); console.log(`Starting ${c.id}: workers1, heap4096, guards on`);
    const result = { id: c.id, complete: false, command: "command.json" };
    try {
      result.engine = await child(command.engine, path.join(dest, "engine.log"), p.budget.timeoutMinutesPerRun * 60_000);
      if (result.engine.exitCode !== 0 || !fs.existsSync(path.join(dest, "raw.json"))) throw new Error("Engine failed/incomplete; preserve exact exit and logs");
      result.render = await child(command.render, path.join(dest, "render.log"), p.budget.timeoutMinutesPerRun * 60_000);
      verifyStudySource(seal.data, loaded.sha256);
      const raw = read(path.join(dest, "raw.json")), book = read(path.join(dest, "book/data.json"));
      const e = rangeStudyEvidence(raw.data, book.data, p, c.fold, c.profile, universe);
      const expectedTimes = Array.from({ length: 6 }, (_, i) => c.fold.tradeStartT + i * 3_600_000);
      const completeHours = expectedTimes.every((t) => e.validation.some((x) => x.t === t));
      const measuredEmptyRangeChecks = e.failedChecks.filter((x) => /^(?:coverage: range (?:mc|mn|sh) has config sets|execution: range (?:mc|mn|sh) executed orders)$/.test(x.name));
      const unexpectedFailedChecks = e.failedChecks.filter((x) => !measuredEmptyRangeChecks.includes(x));
      const memoryLevel = raw.data.engine.mem?.computeLevel ?? raw.data.engine.mem?.fallback ?? 0;
      result.complete = !result.render.timedOut && [0, 1].includes(result.render.exitCode) && e.initialValidationRecorded && completeHours && e.outsideConfiguredUniverse.length === 0 && memoryLevel === 0 && unexpectedFailedChecks.length === 0;
      result.allReconciliationChecksPassed = e.failedChecks.length === 0; result.measuredEmptyRangeChecks = measuredEmptyRangeChecks; result.unexpectedFailedChecks = unexpectedFailedChecks;
      result.failedChecks = e.failedChecks; result.outsideConfiguredUniverse = e.outsideConfiguredUniverse; result.initialValidationRecorded = e.initialValidationRecorded; result.completeHours = completeHours;
      const provenance = { protocolSha256: loaded.sha256, sourceFreezeSha256: seal.sha256, sourceCheckpoint: seal.data.checkpoint, settingsVersion: universe.settingsVersion, feedSha256: feed.data.feed.sha256, rawSha256: raw.sha256, normalizedBookSha256: book.sha256 };
      emitEvidence(dest, e, provenance);
    } catch (err) { result.error = String(err); }
    write(path.join(dest, "run-result.json"), result); console.log(studyJson(result));
  } } finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await rangeStudyMain(process.argv.slice(2));
