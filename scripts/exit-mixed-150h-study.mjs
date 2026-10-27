#!/usr/bin/env node
// Frozen 12-symbol production-path coexistence replay: ordinary Minimal/Short plus independent Historic Exit.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { allCombos } from "../src/core/pipeline/pipeline.ts";
import { CoreRuntime, baseFocus } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { readSessionStudy, sessionStudySourceFiles, studyCanonical, studyExactJson, studySha256 } from "./lib/session-study.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mode = process.argv[2];
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const out = resolve(root, arg("out", "runs/exit-mixed-150h"));
const feedSource = resolve(root, "scripts/studies/signals-coverage/feed.json.gz");
const definition = resolve(root, "docs/low-range-research-20261027/MIXED-EXIT-150H-PROTOCOL.md");
const H = 3_600_000, preH = 150, runH = 24, warmH = 100;
const endT = Date.parse("2026-10-17T21:00:00Z"), tradeStartT = endT - runH * H;
const evaluationFromT = tradeStartT - preH * H, indicatorStartT = evaluationFromT - warmH * H;
const focus = ["follow|ema-9-21", "follow|rsi-mom-14-20"];
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_LIVE = "0";

if (mode === "prepare") {
  if (existsSync(out)) throw new Error("Use a fresh output directory; preserve every prior attempt");
  // A source fingerprint also binds every imported core file; insist the economic checkpoint is committed and clean.
  try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", "src/core", "scripts/lib", "scripts/core-session.mjs", "package.json"], { cwd: root }); }
  catch { throw new Error("Commit the economic source files before freezing this replay"); }
  const bytes = readFileSync(feedSource), source = JSON.parse(gunzipSync(bytes));
  const symbols = source.tickers.map((t) => t.sym).sort();
  assert.equal(symbols.length, 12, "the frozen source must contain exactly 12 symbols");
  assert.equal(new Set(symbols).size, 12, "symbol identities must be distinct");
  const feed = { tickers: source.tickers.filter((t) => symbols.includes(t.sym)), candles: {} };
  for (const sym of symbols) for (const tf of [1, 60]) {
    const rows = (source.candles[`${sym}|${tf}`] ?? []).filter((c) => c.t >= indicatorStartT && c.t + tf * 60_000 <= endT);
    assert.equal(rows.length, (warmH + preH + runH) * 60 / tf, `incomplete ${sym} ${tf}m coverage`);
    assert.ok(rows.every((c, i) => c.t === indicatorStartT + i * tf * 60_000), `gap in ${sym} ${tf}m coverage`);
    feed.candles[`${sym}|${tf}`] = rows;
  }
  mkdirSync(out, { recursive: true });
  const feedPath = `${out}/feed.json`;
  writeFileSync(feedPath, JSON.stringify(feed), { flag: "wx" });
  const settings = structuredClone(DEFAULT_SETTINGS), days = Math.ceil((warmH + preH + runH) / 24);
  Object.assign(settings, { symbols: 12, forceSymbols: symbols, symbolRank: "market", historyDays: days,
    tfMin: 1, tfs: [1, 5, 15], tfDays: { 1: days, 5: days, 15: days }, focus, pinned: [], paperBalance: 10 });
  settings.signals.enabled = false;
  settings.live.enabled = false;
  settings.sizing = { ...settings.sizing, mode: "equityPct", pct: .002 };
  settings.toggles = { ...settings.toggles, normal: true, trailing: true, exit: true,
    block: false, blockActive: false, dca: false, dcaActive: false, axis: false };
  // Narrow the *inventory*, not the gates or protection arrays, so the coexistence test is bounded.
  settings.grid = { ...settings.grid, tp: [], micro: false, general: false, long: false, minimalPlus: false,
    lowRange: { ...settings.grid.lowRange, enabled: false } };
  settings.exitStrategy = { ...settings.exitStrategy, includeTactics: false, includeRelations: false, includeMicro: false };
  assert.equal(settings.exitStrategy.lookbackH, 150, "default Exit fit must use the full requested 150h");
  const make = (seed, wf = {}) => {
    const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { symbols: 12, signals: { enabled: false } },
      { market: "bingx", replay: true, priceStream: null, evaluationFromT, replayPreloadAll: true,
        feed: { history: async () => [], klines: async () => [], tickers: async () => [] } });
    try {
      rt.updateSettings(seed); rt.updateSettings({ symbols: 12 });
      rt.updateSettings({}, { ...wf, preH, simH: runH, causalBase: true, recordValidation: true });
      rt.wf = { ...rt.wf, longH: preH };
      return { settings: studyCanonical(rt.settings), wf: studyCanonical(rt.wf) };
    } finally { rt.dispose(); db.db.close(); }
  };
  // A legacy partial WF gains explicit coordination defaults on its first reload. Freeze the fully materialized
  // second result, then require the third production normalization to match it exactly.
  const first = make(settings), actual = make(first.settings, first.wf), reload = make(actual.settings, actual.wf);
  assert.equal(studyExactJson(actual), studyExactJson(reload), "materialized settings must normalize identically twice");
  assert.equal(actual.settings.exitStrategy.lookbackH, preH);
  assert.equal(actual.wf.exitMinTrades, DEFAULT_SETTINGS.exitStrategy.minValidationTrades);
  assert.equal(studyExactJson(actual.settings.gates), studyExactJson(DEFAULT_SETTINGS.gates), "default qualification gates changed");
  assert.equal(studyExactJson(actual.settings.tactics), studyExactJson(DEFAULT_SETTINGS.tactics), "default entry filters changed");
  assert.equal(actual.settings.cost, DEFAULT_SETTINGS.cost, "modeled round-trip cost changed");
  const combos = allCombos(baseFocus(actual.settings), actual.settings.disabledKinds, actual.settings.tfs);
  assert.ok(combos.length > 0 && combos.every((x) => focus.some((f) => f === `${x.bot}|${x.ind.split("@")[0]}`)),
    "runtime inventory exceeds or misses the declared ordinary indication scope");
  const files = sessionStudySourceFiles(root), sourceHash = studySha256(studyExactJson(files));
  const protocol = { schema: "cts-session-study-v1", id: "exit-mixed-12symbol-150h-24h", symbols,
    window: { indicatorStartT, evaluationFromT, tradeStartT, endT, warmH, preH, runH }, liveSinceT: tradeStartT,
    feed: { path: feedPath, sha256: studySha256(readFileSync(feedPath)), parentSha256: studySha256(bytes),
      provider: "Previously examined cached Binance USD-M public candles; retrospective, not fresh holdout data" },
    source: { checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), files, sha256: sourceHash },
    harnessSha256: studySha256(readFileSync(new URL(import.meta.url))), definitionSha256: studySha256(readFileSync(definition)),
    actualSettings: actual.settings, actualWf: actual.wf, account: { balance: 10, leverage: 10, sizing: actual.settings.sizing },
    inventory: { focus, ordinaryPairs: combos.map((x) => `${x.bot}|${x.ind}`).sort(), lanes: [1, 5, 15],
      ordinaryRanges: ["Minimal", "Short"], strategies: ["Normal", "Trailing", "Historic Exit"] },
    policy: "Bounded mixed strategy processing; all default gates, default entry filters, cost and full enabled protection arrays preserved. Independent Historic Exit fits use 150h evaluated prehistory; 100h older candles only initialize indicators. Reused retrospective public candles; simulated funding and positions, not venue fills. Unselected sources and strategy types are explicitly out of scope." };
  writeFileSync(`${out}/desk.json`, JSON.stringify(actual, null, 2) + "\n", { flag: "wx" });
  writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ symbols: symbols.length, ordinaryPairs: combos.length, sourceSha256: sourceHash, window: protocol.window }));
} else if (mode === "run") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  if (p.harnessSha256 !== studySha256(readFileSync(new URL(import.meta.url))) || p.definitionSha256 !== studySha256(readFileSync(definition)))
    throw new Error("Study harness or protocol definition changed after freeze");
  if (existsSync(`${out}/raw.json`)) throw new Error("Measured output already exists");
  const args = ["--expose-gc", "--max-old-space-size=4096", "--experimental-strip-types", "--no-warnings",
    "scripts/core-session.mjs", "--feed", p.feed.path, "--desk", `${out}/desk.json`, "--symbols", "12",
    "--pre", String(preH), "--run", String(runH), "--end-at", new Date(endT).toISOString(),
    "--evaluation-from", new Date(evaluationFromT).toISOString(), "--selection-hours", String(preH),
    "--live-since", new Date(tradeStartT).toISOString(), "--replay-preload-all", "--signals", "off", "--tactics", "default",
    "--balance", "10", "--leverage", "10", "--pct", ".002", "--frozen-session", `${out}/protocol.json`,
    "--chunk-allocations", "--tape-trades-all", "--dump", `${out}/raw.json`, "--out", `${out}/session`,
    "--html", `${out}/report`, "--quiet", "true"];
  writeFileSync(`${out}/command.json`, JSON.stringify({ executable: process.execPath, args }, null, 2) + "\n", { flag: "wx" });
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env,
    CTS_CORE_STATE: "off", CTS_CORE_AUTOSTART: "0", CTS_CORE_LIVE: "0", CTS_CORE_VARIANTS: "0",
    CTS_CORE_WORKERS: "1", CTS_CORE_COMPARE: "0", MALLOC_ARENA_MAX: "2", MALLOC_MMAP_THRESHOLD_: "1048576",
    NODE_OPTIONS: `--require ${resolve(root, "scripts/lib/core-test-offline-guard.cjs")}` } });
  process.exitCode = await new Promise((done) => { child.on("error", () => done(1)); child.on("exit", (code) => done(code ?? 1)); });
} else throw new Error("Usage: exit-mixed-150h-study.mjs prepare|run --out NEW_DIRECTORY");
