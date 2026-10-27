#!/usr/bin/env node
// Bounded, frozen 20-symbol production-path replay: all Low-Range sources, Short, 15m, 24h.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { LOW_RANGE_IDS, DEFAULT_LOW_RANGE_GRID } from "../src/core/indications/low-range.ts";
import { INDICATION_KINDS } from "../src/core/domain/types.ts";
import { DEFAULT_SETTINGS, SHORT_RANGE } from "../src/core/config.ts";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { sessionStudySourceFiles, studyCanonical, studyExactJson, studySha256, readSessionStudy } from "./lib/session-study.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const mode = process.argv[2], out = resolve(arg("out", "runs/low-range-runtime-24h")), H = 3_600_000;
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
if (mode === "prepare") {
  if (existsSync(`${out}/protocol.json`)) throw new Error("Use a new output directory");
  const sourcePath = resolve(arg("feed"));
  const bytes = readFileSync(sourcePath), source = JSON.parse(bytes[0] === 31 ? gunzipSync(bytes) : bytes);
  const symbols = source.tickers.map((x) => x.sym).sort();
  if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("Expected exactly 20 symbols");
  const endT = Date.parse("2026-10-10T12:00:00Z"), runH = 24, preH = 24;
  const tradeStartT = endT - runH * H, evaluationFromT = tradeStartT - preH * H, indicatorStartT = evaluationFromT - 24 * H;
  const feed = { tickers: source.tickers.filter((x) => symbols.includes(x.sym)), candles: {} };
  for (const sym of symbols) for (const tf of [1, 60]) {
    const candles = source.candles[`${sym}|${tf}`].filter((c) => c.t >= indicatorStartT && c.t + tf * 60_000 <= endT);
    if (candles.length !== 72 * 60 / tf || candles.some((c, i) => c.t !== indicatorStartT + i * tf * 60_000))
      throw new Error(`Incomplete ${sym} ${tf}m replay candles`);
    feed.candles[`${sym}|${tf}`] = candles;
  }
  mkdirSync(out, { recursive: true });
  const feedPath = `${out}/feed.json`;
  writeFileSync(feedPath, JSON.stringify(feed), { flag: "wx" });
  const seed = structuredClone(DEFAULT_SETTINGS);
  Object.assign(seed, { symbols: 20, forceSymbols: symbols, symbolRank: "market", historyDays: 3,
    tfMin: 1, tfs: [15], tfDays: { 1: 3, 5: 3, 15: 3 },
    focus: LOW_RANGE_IDS.map((id) => `follow|${id}`), pinned: [],
    disabledKinds: INDICATION_KINDS.filter((kind) => kind !== "low-range"), paperBalance: 10 });
  seed.signals.enabled = false;
  seed.live.enabled = false;
  seed.sizing = { ...seed.sizing, mode: "equityPct", pct: 0.002 };
  seed.toggles = { ...seed.toggles, normal: true, trailing: true, exit: false,
    dca: false, dcaActive: false, axis: false, block: false, blockActive: false };
  seed.exitStrategy = { ...seed.exitStrategy, enabled: false };
  seed.grid = { ...seed.grid, tp: [], micro: false, minimal: false, general: false, long: false, minimalPlus: false,
    short: { ...SHORT_RANGE, minTf: 15, tp: [0.018], slOfTp: [1], trailOfTp: [0] },
    lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true }, rangeFit: { enabled: false }, baseCells: false };
  const make = (settings, wf = {}) => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 20, signals: { enabled: false } },
      { market: "bingx", replay: true, priceStream: null, evaluationFromT, replayPreloadAll: true,
        feed: { history: async () => [], klines: async () => [], tickers: async () => [] } });
    rt.updateSettings(settings); rt.updateSettings({ symbols: 20 });
    rt.updateSettings({}, { ...wf, preH, simH: runH, causalBase: true, recordValidation: true });
    rt.wf = { ...rt.wf, longH: preH };
    return rt;
  };
  const a = make(seed), b = make(studyCanonical(a.settings), studyCanonical(a.wf));
  const actualSettings = studyCanonical(b.settings), actualWf = studyCanonical(b.wf), c = make(actualSettings, actualWf);
  if (studyExactJson(c.settings) !== studyExactJson(actualSettings) || studyExactJson(c.wf) !== studyExactJson(actualWf))
    throw new Error("Runtime settings do not survive normalization");
  for (const rt of [a, b, c]) rt.dispose();
  const files = sessionStudySourceFiles(root);
  const protocol = { schema: "cts-session-study-v1", id: "low-range-20-symbol-15m-24h", symbols,
    window: { indicatorStartT, evaluationFromT, tradeStartT, endT, preH, runH },
    feed: { path: feedPath, sha256: studySha256(readFileSync(feedPath)), parentSha256: studySha256(bytes),
      provider: "Cached Binance USD-M candles, previously examined retrospective data" },
    source: { checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      files, sha256: studySha256(studyExactJson(files)) }, actualSettings, actualWf,
    account: { balance: 10, leverage: 10, sizing: actualSettings.sizing },
    policy: "Offline production-path replay. All 75 Low-Range sources, one independent 15m lane, all configured Short steps/stops/trails and no-TP siblings. Other indications, DCA, Axis and Historic Exit are out of scope. Existing gates and modeled cost are unchanged. Not venue fills or a fresh holdout.",
    harnessSha256: studySha256(readFileSync(new URL(import.meta.url))) };
  writeFileSync(`${out}/desk.json`, JSON.stringify({ settings: actualSettings, wf: actualWf }, null, 2), { flag: "wx" });
  writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ symbols: symbols.length, sources: LOW_RANGE_IDS.length, window: protocol.window, sourceSha256: protocol.source.sha256 }));
} else if (mode === "run") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  if (p.harnessSha256 !== studySha256(readFileSync(new URL(import.meta.url)))) throw new Error("Study harness changed after freeze");
  if (existsSync(`${out}/raw.json`)) throw new Error("Measured output already exists");
  const args = ["--expose-gc", "--max-old-space-size=3072", "--experimental-strip-types", "--no-warnings",
    "scripts/core-session.mjs", "--feed", p.feed.path, "--desk", `${out}/desk.json`, "--symbols", "20",
    "--pre", "24", "--run", "24", "--end-at", new Date(p.window.endT).toISOString(),
    "--evaluation-from", new Date(p.window.evaluationFromT).toISOString(), "--selection-hours", "24",
    "--replay-preload-all", "--signals", "off", "--balance", "10", "--leverage", "10", "--pct", "0.002",
    "--frozen-session", `${out}/protocol.json`, "--chunk-allocations", "--dump", `${out}/raw.json`,
    "--out", `${out}/session`, "--html", `${out}/report`, "--quiet", "true"];
  writeFileSync(`${out}/command.json`, JSON.stringify({ executable: process.execPath, args }, null, 2), { flag: "wx" });
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit",
    env: { ...process.env, CTS_CORE_VARIANTS: "0", CTS_CORE_WORKERS: "1", CTS_CORE_COMPARE: "0" } });
  process.exitCode = await new Promise((done) => { child.on("error", () => done(1)); child.on("exit", (code) => done(code ?? 1)); });
} else throw new Error("Usage: low-range-runtime-study.mjs prepare --feed FILE --out DIR | run --out DIR");
