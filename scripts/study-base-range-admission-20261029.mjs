#!/usr/bin/env node
// Frozen, bounded production-path check of expanded Base-range construction.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { DEFAULT_SETTINGS, MINIMAL_RANGE, SHORT_RANGE } from "../src/core/config.ts";
import { roundTripCostFromFees } from "../src/core/model-cost.ts";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { sessionStudySourceFiles, studyCanonical, studyExactJson, studySha256 } from "./lib/session-study.mjs";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const root = resolve("."), out = resolve(process.argv[2] ?? "runs/base-range-admission-20261029");
if (existsSync(out)) throw new Error("Use a fresh study directory");
const slippage = Number(process.argv[3] ?? "0.00025");
if (![0.0001, 0.00025].includes(slippage)) throw new Error("Use the requested 0.12% or current 0.15% modeled cost");
const sourcePath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const bytes = readFileSync(sourcePath), source = JSON.parse(gunzipSync(bytes));
const symbols = source.tickers.map((x) => x.sym).sort().slice(0, 8);
assert.equal(new Set(symbols).size, 8);
const H = 3_600_000, endT = Date.UTC(2026, 9, 9, 12);
const runH = 24, preH = 24, warmH = 24;
const tradeStartT = endT - runH * H, evaluationFromT = tradeStartT - preH * H;
const indicatorStartT = evaluationFromT - warmH * H;
assert.equal((endT - indicatorStartT) / H, 72);
const feed = { tickers: source.tickers.filter((x) => symbols.includes(x.sym)), candles: {} };
for (const sym of symbols) for (const tf of [1, 60]) {
  const rows = (source.candles[`${sym}|${tf}`] ?? []).filter((c) => c.t >= indicatorStartT && c.t < endT);
  assert.equal(rows.length, (endT - indicatorStartT) / (tf * 60_000), `${sym}/${tf} coverage`);
  assert.ok(rows.every((c, i) => c.t === indicatorStartT + i * tf * 60_000), `${sym}/${tf} gaps`);
  feed.candles[`${sym}|${tf}`] = rows;
}
mkdirSync(out, { recursive: true });
const feedPath = `${out}/feed.json`;
writeFileSync(feedPath, JSON.stringify(feed), { flag: "wx" });
const seed = structuredClone(DEFAULT_SETTINGS);
seed.fees.slippage = slippage;
seed.cost = roundTripCostFromFees(seed.fees);
Object.assign(seed, { symbols: 8, forceSymbols: symbols, symbolRank: "market", historyDays: 3,
  tfMin: 1, tfs: [5, 15], tfDays: { 1: 3, 5: 3, 15: 3 },
  focus: ["follow", "revert"].flatMap((bot) => ["ema-9-21", "rsi-mom-14-20"]
    .flatMap((ind) => [5, 15].map((tf) => `${bot}|${ind}@m${tf}`))), pinned: [] });
seed.signals.enabled = false;
seed.live.enabled = false;
seed.exitStrategy.enabled = false;
seed.toggles = { ...seed.toggles, normal: true, trailing: true, exit: false, block: true,
  dca: true, dcaActive: false, axis: true };
seed.axis = { ...seed.axis, perRange: true, ranges: ["atr"], levelsSet: [2] };
seed.grid = { ...seed.grid, tp: [], micro: false, minimalPlus: false, general: false, long: false,
  minimal: { ...MINIMAL_RANGE, tp: [.008, .012], slOfTp: [1.5, 2], trailOfTp: [0, .5] },
  short: { ...SHORT_RANGE, tp: [.018, .022], slOfTp: [1, 1.5], trailOfTp: [0, .5] },
  holdH: [1, 4], baseRanges: false, baseTargets: true, allSets: false };
const make = (settings, wf = {}) => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 8, signals: { enabled: false } },
    { market: "bingx", replay: true, priceStream: null, evaluationFromT, replayPreloadAll: true,
      feed: { history: async () => [], klines: async () => [], tickers: async () => [] } });
  rt.updateSettings(settings); rt.updateSettings({ symbols: 8 });
  rt.updateSettings({}, { ...wf, preH, simH: runH, causalBase: true, recordValidation: true });
  rt.wf = { ...rt.wf, longH: preH };
  return rt;
};
const a = make(seed), b = make(studyCanonical(a.settings), studyCanonical(a.wf));
const actualSettings = studyCanonical(b.settings), actualWf = studyCanonical(b.wf), c = make(actualSettings, actualWf);
assert.equal(studyExactJson(c.settings), studyExactJson(actualSettings), "settings normalization");
assert.equal(studyExactJson(c.wf), studyExactJson(actualWf), "walk-forward normalization");
for (const rt of [a, b, c]) rt.dispose();
const files = sessionStudySourceFiles(root);
const protocol = { schema: "cts-session-study-v1", id: "base-range-admission-8-symbol-20261029", symbols,
  window: { indicatorStartT, evaluationFromT, tradeStartT, endT, warmH, preH, runH },
  feed: { path: feedPath, sha256: studySha256(readFileSync(feedPath)), parentSha256: studySha256(bytes),
    provider: "Previously examined cached Binance USD-M minute candles; retrospective" },
  source: { files, sha256: studySha256(studyExactJson(files)), checkpoint: "working-tree-source-seal" },
  launcherSha256: studySha256(readFileSync(new URL(import.meta.url))),
  actualSettings, actualWf, account: { balance: 10, leverage: 10, sizing: actualSettings.sizing },
  scope: "Eight symbols, 24h indicator warmup, 24h evaluated prehistory, 24h trading; fixed EMA/RSI sources, Minimal/Short, Normal/Trailing/DCA/Axis, Block on. Signals, Historic Exit, DCA Active and other ranges excluded. No actual venue fills. The 0.12% cost is an operator-requested sensitivity after the 0.15% reference; neither is a fresh holdout." };
writeFileSync(`${out}/desk.json`, JSON.stringify({ settings: actualSettings, wf: actualWf }, null, 2), { flag: "wx" });
writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2), { flag: "wx" });
console.log(JSON.stringify({ symbols, window: protocol.window, cost: actualSettings.cost,
  sizing: actualSettings.sizing, sourceSha256: protocol.source.sha256, scope: protocol.scope }));
