#!/usr/bin/env node
// Freeze the complete production-normalized settings before scoring a public-candle session.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { sessionStudySourceFiles, studyCanonical, studyExactJson, studySha256 } from "./lib/session-study.mjs";

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
if (args.includes("--help")) {
  console.log("freeze-session-study --root REPO --basis-root REPO --feed FILE --symbols A-USDT,B-USDT --evaluation-from ISO --end-at ISO --pre 6 --run 6 --id ID --out DIR [--settings FILE]");
  process.exit(0);
}
process.env.CTS_CORE_STATE = "off"; process.env.CTS_CORE_AUTOSTART = "0";
const root = resolve(arg("root", ".")), basisRoot = resolve(arg("basis-root", root));
const symbols = arg("symbols", "").split(",").filter(Boolean), preH = Number(arg("pre", 6)), runH = Number(arg("run", 6));
const endT = Date.parse(arg("end-at")), evaluationFromT = Date.parse(arg("evaluation-from")), tradeStartT = endT - runH * 3_600_000;
const id = arg("id"), out = resolve(arg("out", "runs/session-study")), feed = resolve(arg("feed"));
if (!id || !symbols.length || new Set(symbols).size !== symbols.length || !Number.isFinite(endT) || !Number.isFinite(evaluationFromT) || tradeStartT - evaluationFromT !== preH * 3_600_000)
  throw new Error("Supply an exact symbol list and contiguous prehistory/trade boundaries");
const load = (r, file) => import(pathToFileURL(resolve(r, file)).href);
const { DEFAULT_SETTINGS } = await load(basisRoot, "src/core/config.ts");
const { CoreRuntime } = await load(root, "src/core/server/runtime.server.ts");
const { CoreDb } = await load(root, "src/core/server/db.server.ts");
// Full nested ranges, arrays and grids are materialized before updateSettings' one-level group merge.
const settingsFile = arg("settings");
const supplied = settingsFile ? JSON.parse(readFileSync(settingsFile, "utf8")) : null;
const seed = structuredClone(supplied?.settings ?? supplied ?? DEFAULT_SETTINGS);
Object.assign(seed, { symbols: symbols.length, forceSymbols: symbols, symbolRank: "market", cost: DEFAULT_SETTINGS.cost, fees: { ...DEFAULT_SETTINGS.fees } });
seed.paperBalance = 10;
seed.sizing = { ...seed.sizing, mode: "equityPct", pct: 0.001 };
seed.signals = { ...seed.signals, enabled: true, count: 0 };
seed.live = { ...seed.live, enabled: false, maxPositions: 100 };
const make = (settings, wf = {}) => {
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { symbols: symbols.length, signals: { enabled: true } }, { market: "bingx", replay: true, priceStream: null, evaluationFromT, feed: { history: async () => [], klines: async () => [], tickers: async () => [] } });
  rt.db.kvSet("liveSince", tradeStartT);
  rt.updateSettings(settings); rt.updateSettings({ symbols: symbols.length });
  rt.updateSettings({}, { preH, simH: runH, ...wf, causalBase: true });
  rt.wf = { ...rt.wf, longH: preH };
  return { rt, db };
};
const first = make(seed, supplied?.wf);
// A first default construction omits optional coord flags which sanitizeWf materializes on reload.
// Freeze the fully materialized reload, then require its next reload to be identical.
const second = make(studyCanonical(first.rt.settings), studyCanonical(first.rt.wf));
const actualSettings = studyCanonical(second.rt.settings), actualWf = studyCanonical(second.rt.wf);
const third = make(actualSettings, actualWf);
const changedPaths = (a, b, prefix = "") => studyExactJson(a) === studyExactJson(b) ? [] :
  a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)
    ? [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => changedPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k))
    : [{ path: prefix, before: a, after: b }];
if (studyExactJson(third.rt.settings) !== studyExactJson(actualSettings) || studyExactJson(third.rt.wf) !== studyExactJson(actualWf))
  throw new Error(`Frozen settings do not survive the actual session launcher normalization: ${JSON.stringify([...changedPaths(actualSettings, third.rt.settings, "settings"), ...changedPaths(actualWf, third.rt.wf, "wf")])}`);
for (const x of [first, second, third]) x.rt.dispose();
const files = sessionStudySourceFiles(root);
const protocol = {
  schema: "cts-session-study-v1", id, createdAt: new Date().toISOString(),
  symbols, window: { evaluationFromT, tradeStartT, endT, preH, runH }, liveSinceT: tradeStartT,
  feed: { path: feed, sha256: studySha256(readFileSync(feed)), provider: "Binance USD-M public historical candle archive" },
  source: { checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), basisCheckpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: basisRoot, encoding: "utf8" }).trim(), files, sha256: studySha256(studyExactJson(files)) },
  actualSettings, actualWf,
  account: { balance: 10, leverage: 10, sizing: actualSettings.sizing },
  policy: { qualification: "No PF/sample/DD/Last-N thresholds relaxed. All configured ranges remain enabled for initial 22-symbol evaluation.", scoring: "Post-Base qualified engine execution; independently qualified exact Signal configs separately; combined funded account separately.", directions: "Both directions enabled; realized counts reported, never fabricated.", evidence: "Offline model only; no venue fills or live promotion." },
};
mkdirSync(out, { recursive: true });
const deskPath = resolve(out, "desk.json"), protocolPath = resolve(out, "protocol.json");
writeFileSync(deskPath, JSON.stringify({ settings: actualSettings, wf: actualWf, why: protocol.policy }, null, 2) + "\n");
writeFileSync(protocolPath, JSON.stringify(protocol, null, 2) + "\n");
console.log(JSON.stringify({ id, root, symbols: symbols.length, deskPath, protocolPath, feedSha256: protocol.feed.sha256, sourceSha256: protocol.source.sha256, cost: actualSettings.cost, sizing: actualSettings.sizing, selectionHours: actualWf.longH }));
