#!/usr/bin/env node
// Freeze before scoring. Uses the normal runtime/session and all cells of its explicitly recorded grids.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import {
  MICRO_CONFIG_IDS,
  INVERSE_MICRO_CONFIG_IDS,
} from "../src/core/indications/micro-family.ts";
import { INDICATION_KINDS } from "../src/core/domain/types.ts";
import { DEFAULT_MODEL_FEES, RT_COST } from "../src/core/model-cost.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import {
  sessionStudySourceFiles,
  studyCanonical,
  studyExactJson,
  studySha256,
  readSessionStudy,
} from "./lib/session-study.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const mode = process.argv[2],
  out = resolve(arg("out", "runs/micro-20x12h")),
  H = 3_600_000;
const symbolCount = Number(arg("symbols", "20"));
if (!Number.isInteger(symbolCount) || symbolCount < 1 || symbolCount > 100) throw new Error("Invalid symbol count");
const range = arg("range", "original");
if (!["original", "micro", "minimal", "short", "general", "long", "wide", "minimalPlus"].includes(range)) throw new Error("Unknown range");
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
if (mode === "prepare") {
  if (existsSync(`${out}/protocol.json`))
    throw new Error("Use a new output directory; do not overwrite a measured protocol");
  const input = readFileSync(resolve(arg("feed")));
  const source = JSON.parse(input[0] === 31 ? gunzipSync(input) : input);
  const symbols = source.tickers
    .map((x) => x.sym)
    .sort()
    .slice(0, symbolCount);
  if (symbols.length !== symbolCount) throw new Error("Study needs the requested number of real cached symbols");
  const lastT = Math.min(...symbols.map((sym) => source.candles[`${sym}|1`].at(-1).t + 60_000));
  const endT = Number(arg("end", Math.floor(lastT / H) * H)),
    runH = 12,
    preH = 12;
  if (endT > lastT || !Number.isSafeInteger(endT))
    throw new Error("End must be inside the supplied history");
  const tradeStartT = endT - runH * H,
    evaluationFromT = tradeStartT - preH * H,
    indicatorStartT = evaluationFromT - 24 * H;
  const feed = { tickers: source.tickers.filter((x) => symbols.includes(x.sym)), candles: {} };
  for (const sym of symbols)
    for (const tf of [1, 60]) {
      const rows = source.candles[`${sym}|${tf}`].filter(
        (c) => c.t >= indicatorStartT && c.t + tf * 60_000 <= endT,
      );
      if (
        tf === 1 &&
        (rows.length !== 48 * 60 || rows.some((c, i) => c.t !== indicatorStartT + i * 60_000))
      )
        throw new Error(`Missing native 1m history for ${sym}`);
      feed.candles[`${sym}|${tf}`] = rows;
    }
  mkdirSync(out, { recursive: true });
  const feedPath = `${out}/feed.json`;
  writeFileSync(feedPath, JSON.stringify(feed));
  const seed = structuredClone(DEFAULT_SETTINGS);
  Object.assign(seed, {
    symbols: symbolCount,
    forceSymbols: symbols,
    symbolRank: "market",
    historyDays: 2,
    tfDays: { 1: 2, 5: 2, 15: 2 },
    tfMin: 1,
    tfs: [1, 5, 15],
    focus: [...MICRO_CONFIG_IDS, ...INVERSE_MICRO_CONFIG_IDS].map((id) => `follow|${id}`),
    pinned: [],
    disabledKinds: INDICATION_KINDS.filter((kind) => kind !== "micro" && kind !== "inverse"),
    paperBalance: 10,
    // Modeled costs are distinct from the frozen 0.2% range-distance reference.
    cost: RT_COST,
    fees: { ...DEFAULT_MODEL_FEES },
  });
  seed.signals.enabled = false;
  seed.live.enabled = false;
  seed.sizing = { ...seed.sizing, mode: "equityPct", pct: 0.002 };
  seed.toggles = {
    ...seed.toggles,
    normal: true,
    trailing: true,
    exit: true,
    block: false,
    blockActive: false,
    dca: false,
    dcaActive: false,
    axis: false,
  };
  seed.grid = {
    ...seed.grid,
    tp: [],
    general: { ...seed.grid.general, minTf: 0, maxHoldMin: 240 },
    long: false,
    minimalPlus: { ...seed.grid.minimalPlus, enabled: false },
    micro: { ...seed.grid.micro, minTf: 0, maxHoldMin: 60 },
    minimal: { ...seed.grid.minimal, minTf: 0, maxHoldMin: 120 },
    short: { ...seed.grid.short, minTf: 0, maxHoldMin: 180 },
  };
  if (range !== "original") {
    const selected = range === "wide" ? null : structuredClone(DEFAULT_SETTINGS.grid[range]);
    for (const key of ["micro", "minimal", "short", "general", "long", "minimalPlus"]) seed.grid[key] = false;
    seed.grid.tp = range === "wide" ? [0.03, 0.05, 0.08] : [];
    if (selected) seed.grid[range] = { ...selected, minTf: 0, ...(range === "minimalPlus" ? { enabled: true } : {}) };
  }
  seed.exitStrategy = {
    ...seed.exitStrategy,
    enabled: true,
    includeMicro: true,
    includeTactics: false,
    includeRelations: false,
    lookbackH: 12,
    holdH: 3,
  };
  // Experimental stop grid; full gates, costs, sizing, TP and trailing choices stay frozen.
  // This is a configured ratio ceiling; hard minimum stops remain authoritative.
  const slRatioCap = Number(arg("sl-ratio-cap", "0"));
  if (!Number.isFinite(slRatioCap) || slRatioCap < 0 || (slRatioCap > 0 && slRatioCap < 0.25) || slRatioCap > 5)
    throw new Error("--sl-ratio-cap must be 0 (baseline), or 0.25..5");
  if (slRatioCap) {
    const capRange = r => ({ ...r,
      slOfTp: [...new Set(r.slOfTp.map(x => Math.min(x, slRatioCap)))],
      ...(r.trailSlOfTp == null ? {} : { trailSlOfTp: Math.min(r.trailSlOfTp, slRatioCap) }) });
    seed.grid = capRange(seed.grid);
    for (const key of ["micro", "minimal", "short", "general", "long", "minimalPlus"])
      if (seed.grid[key]) seed.grid[key] = capRange(seed.grid[key]);
  }
  const make = (settings, wf = {}) => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { symbols: symbolCount, signals: { enabled: false } },
      {
        market: "bingx",
        replay: true,
        priceStream: null,
        evaluationFromT,
        replayPreloadAll: true,
        feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
      },
    );
    rt.updateSettings(settings);
    rt.updateSettings({ symbols: symbolCount });
    rt.updateSettings({}, { preH, simH: runH, ...wf, causalBase: true, recordValidation: true });
    rt.wf = { ...rt.wf, longH: 12 };
    return rt;
  };
  const a = make(seed),
    b = make(studyCanonical(a.settings), studyCanonical(a.wf));
  const settings = studyCanonical(b.settings),
    wf = studyCanonical(b.wf),
    c = make(settings, wf);
  if (
    studyExactJson(c.settings) !== studyExactJson(settings) ||
    studyExactJson(c.wf) !== studyExactJson(wf)
  )
    throw new Error("Actual runtime settings failed stable normalization");
  for (const rt of [a, b, c]) rt.dispose();
  const files = sessionStudySourceFiles(root);
  const protocol = {
    schema: "cts-session-study-v1",
    id: `micro-${symbolCount}-symbols-${range}-12h-pre-12h-run`,
    range,
    stopExperiment: { configuredSlRatioCap: slRatioCap || null, exitUnchanged: true, minimumStopsUnchanged: true },
    symbols,
    window: { indicatorStartT, evaluationFromT, tradeStartT, endT, preH, runH },
    feed: {
      path: feedPath,
      sha256: studySha256(readFileSync(feedPath)),
      parentSha256: studySha256(input),
      provider: arg("provider", "Cached Binance USD-M native 1m candles; historical regression, not fresh holdout"),
    },
    source: {
      checkpoint: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
      files,
      sha256: studySha256(studyExactJson(files)),
    },
    actualSettings: settings,
    actualWf: wf,
    account: { balance: 10, leverage: 10, sizing: settings.sizing },
    policy:
      "All configured Micro and mirrored Inverse identities; complete configured Micro/Minimal/Short/General TP x SL x trailing grid, plus independently fitted Exit. The protocol range field identifies an explicitly isolated range when requested. No PF/sample/Last-N gates weakened. Older 24h warm indicators only. No exchange executions.",
    harnessSha256: studySha256(readFileSync(new URL(import.meta.url))),
  };
  writeFileSync(`${out}/desk.json`, JSON.stringify({ settings, wf }, null, 2));
  writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2));
  console.log(
    JSON.stringify({
      out,
      window: protocol.window,
      symbols: symbols.length,
      identities: MICRO_CONFIG_IDS.length + INVERSE_MICRO_CONFIG_IDS.length,
      sourceSha256: protocol.source.sha256,
    }),
  );
} else if (mode === "run") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  if (p.harnessSha256 !== studySha256(readFileSync(new URL(import.meta.url))))
    throw new Error("Study harness changed since freeze");
  if (existsSync(`${out}/raw.json`)) throw new Error("Measured output already exists");
  const heapMb = Number(arg("heap-mb", "4096"));
  if (!Number.isInteger(heapMb) || heapMb < 1024 || heapMb > 8192)
    throw new Error("--heap-mb must be an integer from 1024 to 8192");
  const args = [
    "--expose-gc",
    `--max-old-space-size=${heapMb}`,
    "--experimental-strip-types",
    "--no-warnings",
    "scripts/core-session.mjs",
    ...(process.argv.includes("--tape-trades-all") ? ["--tape-trades-all"] : []),
    "--feed",
    p.feed.path,
    "--desk",
    `${out}/desk.json`,
    "--symbols",
    String(p.symbols.length),
    "--pre",
    "12",
    "--run",
    "12",
    "--end-at",
    new Date(p.window.endT).toISOString(),
    "--evaluation-from",
    new Date(p.window.evaluationFromT).toISOString(),
    "--selection-hours",
    "12",
    "--replay-preload-all",
    "--signals",
    "off",
    "--balance",
    "10",
    "--leverage",
    "10",
    "--pct",
    "0.002",
    "--frozen-session",
    `${out}/protocol.json`,
    "--chunk-allocations",
    "--dump",
    `${out}/raw.json`,
    "--out",
    `${out}/session`,
    "--html",
    `${out}/report`,
    "--quiet",
    "true",
  ];
  writeFileSync(
    `${out}/command.json`,
    JSON.stringify({ executable: process.execPath, args }, null, 2),
  );
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      CTS_CORE_VARIANTS: "0",
      CTS_CORE_WORKERS: arg("workers", "2"),
      CTS_CORE_COMPARE: "0",
    },
  });
  process.exitCode = await new Promise((done) => {
    child.on("error", (e) => {
      console.error(e);
      done(1);
    });
    child.on("exit", (code) => done(code ?? 1));
  });
} else
  throw new Error(
    "Usage: micro-study.mjs prepare --feed FILE --out DIR; micro-study.mjs run --out DIR",
  );
