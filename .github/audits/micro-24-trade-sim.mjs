#!/usr/bin/env node
// Fixed 24-symbol follow-up: complete registered Micro/Inverse grid, no performance-based selection.
// Freeze before scoring. Uses the normal runtime/session and all cells of its explicitly recorded grids.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import {
  MICRO_CONFIG_IDS,
  INVERSE_MICRO_CONFIG_IDS,
} from "../../src/core/indications/micro-family.ts";
import { INDICATION_KINDS } from "../../src/core/domain/types.ts";
import { DEFAULT_MODEL_FEES, RT_COST } from "../../src/core/model-cost.ts";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { CoreRuntime } from "../../src/core/server/runtime.server.ts";
import { CoreDb } from "../../src/core/server/db.server.ts";
import {
  sessionStudySourceFiles,
  studyCanonical,
  studyExactJson,
  studySha256,
  readSessionStudy,
} from "../../scripts/lib/session-study.mjs";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const mode = process.argv[2],
  out = resolve(arg("out", "runs/micro-24-trade-sim-20261020-v5")),
  H = 3_600_000;
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
if (mode === "prepare") {
  if (existsSync(`${out}/protocol.json`))
    throw new Error("Use a new output directory; do not overwrite a measured protocol");
  const input = readFileSync(resolve(arg("feed")));
  const source = JSON.parse(input[0] === 31 ? gunzipSync(input) : input);
  const symbols = source.tickers.map((x) => x.sym).sort();
  const expected = ["AVAX", "LINK", "LTC", "SUI", "NEAR", "DOT", "ATOM", "APT", "BTC", "ETH", "SOL", "BNB", "DOGE", "ADA", "BCH", "TRX", "ETC", "OP", "ARB", "FIL", "XRP", "UNI", "XLM", "INJ"].map((x) => `${x}-USDT`).sort();
  if (studyExactJson(symbols) !== studyExactJson(expected))
    throw new Error("Study requires its exact twenty-four preregistered symbols");
  const lastT = Math.min(...symbols.map((sym) => source.candles[`${sym}|1`].at(-1).t + 60_000));
  const endT = Number(arg("end", Math.floor(lastT / H) * H)),
    runH = 12,
    preH = 12;
  const microHold = Number(arg("micro-hold", 60)), includeLong = arg("long-range", "false") === "true";
  if (![15, 60].includes(microHold)) throw new Error("micro-hold must be a preregistered 15 or 60 minutes");
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
  const allIds = [...MICRO_CONFIG_IDS, ...INVERSE_MICRO_CONFIG_IDS];
  const focusFile = arg("focus-file");
  const selected = focusFile ? JSON.parse(readFileSync(resolve(focusFile))) : allIds;
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length ||
      selected.some((id) => !allIds.includes(id))) throw new Error("Nonempty unique registered Micro focus required");
  const seed = structuredClone(DEFAULT_SETTINGS);
  Object.assign(seed, {
    symbols: 24,
    forceSymbols: symbols,
    symbolRank: "market",
    historyDays: 2,
    tfDays: { 1: 2, 5: 2, 15: 2 },
    tfMin: 1,
    tfs: [1, 5, 15],
    focus: selected.map((id) => `follow|${id}`),
    pinned: [],
    disabledKinds: INDICATION_KINDS.filter((kind) => kind !== "micro" && kind !== "inverse"),
    paperBalance: 10000,
    // Modeled costs are distinct from the frozen 0.2% range-distance reference.
    cost: RT_COST,
    fees: { ...DEFAULT_MODEL_FEES },
  });
  seed.signals.enabled = false;
  seed.live.enabled = false;
  seed.sizing = { ...seed.sizing, mode: "fixed", pct: 0.002 };
  seed.live.notionalUsd = 2;
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
    long: includeLong ? structuredClone(DEFAULT_SETTINGS.grid.long) : false,
    minimalPlus: { ...seed.grid.minimalPlus, enabled: false },
    micro: { ...seed.grid.micro, minTf: 0, maxHoldMin: microHold },
    minimal: { ...seed.grid.minimal, minTf: 0, maxHoldMin: 120 },
    short: { ...seed.grid.short, minTf: 0, maxHoldMin: 180 },
  };
  seed.exitStrategy = {
    ...seed.exitStrategy,
    enabled: true,
    includeMicro: false,
    includeTactics: false,
    includeRelations: false,
    lookbackH: 12,
    holdH: 3,
  };
  const make = (settings, wf = {}) => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { symbols: 24, signals: { enabled: false } },
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
    rt.updateSettings({ symbols: 24 });
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
    id: arg("label", "micro-24-symbols-12h-pre-12h-run-20261020-v5"),
    scope: { hold: microHold === 15 ? "micro-15m" : "standard", microHold, includeLong, focus: selected,
      ...(focusFile ? { selectedFocusSha256: studySha256(readFileSync(resolve(focusFile))) } : {}),
      purpose: focusFile ? "Frozen training-selected focus, independently gated in this later test; losses retained; not native execution"
        : "Fixed retrospective 24-symbol correctness and hourly stability test; no performance-based source selection or gate relaxation; not native execution" },
    symbols,
    window: { indicatorStartT, evaluationFromT, tradeStartT, endT, preH, runH },
    feed: {
      path: feedPath,
      sha256: studySha256(readFileSync(feedPath)),
      parentSha256: studySha256(input),
      provider: "Verified official Binance USD-M native 1m archives; scope and chronology in window/feed hashes; not BingX venue execution",
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
    account: { balance: 10000, leverage: 10, sizing: settings.sizing, notionalUsd: 2 },
    policy:
      "All explicitly focused Micro and mirrored Inverse identities; complete configured Micro/Minimal/Short/General TP x SL x trailing grid, plus independently fitted Exit. No PF/sample/Last-N gates weakened. Older 24h warm indicators only. No exchange executions.",
    harnessSha256: studySha256(readFileSync(new URL(import.meta.url))),
  };
  writeFileSync(`${out}/desk.json`, JSON.stringify({ settings, wf }, null, 2));
  writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2));
  console.log(
    JSON.stringify({
      out,
      window: protocol.window,
      symbols: symbols.length,
      identities: selected.length,
      sourceSha256: protocol.source.sha256,
    }),
  );
} else if (mode === "run") {
  const { protocol: p } = readSessionStudy(`${out}/protocol.json`, root);
  if (p.harnessSha256 !== studySha256(readFileSync(new URL(import.meta.url))))
    throw new Error("Study harness changed since freeze");
  if (existsSync(`${out}/raw.json`)) throw new Error("Measured output already exists");
  const args = [
    "--expose-gc",
    "--max-old-space-size=4096",
    "--experimental-strip-types",
    "--no-warnings",
    "scripts/core-session.mjs",
    "--tape-trades-all",
    "--feed",
    p.feed.path,
    "--desk",
    `${out}/desk.json`,
    "--symbols",
    "24",
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
    String(p.account.balance),
    "--leverage",
    "10",
    "--sizing",
    p.account.sizing.mode,
    "--notional",
    String(p.account.notionalUsd),
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
    "Usage: micro-24-trade-sim.mjs prepare --feed FILE --out DIR; micro-24-trade-sim.mjs run --out DIR",
  );
