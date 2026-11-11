#!/usr/bin/env node
// Frozen native market replay: eight symbols, exactly 12h prehistory + 12h trading, no extra warmup.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { LOW_RANGE_IDS, DEFAULT_LOW_RANGE_GRID } from "../src/core/indications/low-range.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { lastNSamplesGen } from "../src/core/server/last-n-samples.ts";
import { positionConfigEval } from "../src/core/sim/walkforward.ts";
import { iterateSessionTapeTrades } from "./lib/session-dump.mjs";
const [feedArg, outArg] = process.argv.slice(2);
if (!feedArg || !outArg)
  throw new Error("Usage: verify-position-policy.mjs FEED.json.gz FRESH_OUTPUT_DIRECTORY");
const feedPath = resolve(feedArg),
  out = resolve(outArg);
if (existsSync(join(out, "protocol.json"))) throw new Error("Use a fresh output directory");
const bytes = readFileSync(feedPath),
  feed = JSON.parse(bytes[0] === 31 ? gunzipSync(bytes) : bytes),
  symbols = feed.tickers.map((x) => x.sym);
if (symbols.length !== 8 || new Set(symbols).size !== 8)
  throw new Error("Exactly eight distinct symbols required");
const H = 3600000,
  minutes = symbols.map((sym) => feed.candles[`${sym}|1`]),
  first = minutes[0][0].t,
  end = minutes[0].at(-1).t + 60000;
if (
  end - first !== 24 * H ||
  minutes.some((rows) => rows.length !== 1440 || rows.some((c, i) => c.t !== first + i * 60000))
)
  throw new Error("Every symbol must contain the same contiguous 24h, without hidden warmup");
const settings = structuredClone(DEFAULT_SETTINGS);
Object.assign(settings, {
  symbols: 8,
  forceSymbols: symbols,
  historyDays: 2,
  tfMin: 1,
  tfs: [1, 5],
  tfDays: { 1: 2, 5: 2, 15: 2, 30: 2 },
  focus: [
    ...LOW_RANGE_IDS.map((id) => `follow|${id}@m1`),
    ...["ema-9-21", "rsi-mom-14-20", "macd"].flatMap((id) => [
      `follow|${id}@m1`,
      `revert|${id}@m1`,
    ]),
  ],
  pinned: [],
  disabledKinds: [],
  paperBalance: 10,
});
settings.live.enabled = false;
// A bounded fixed grid tests all ordinary ranges alongside independent Low-Range; it is not an optimum search.
for (const name of ["micro", "minimal", "short", "general", "long"]) {
  const prior = settings.grid[name];
  if (prior)
    settings.grid[name] = { ...prior, tp: [prior.tp[0]], slOfTp: [0.5, 1], trailOfTp: [0, 0.5] };
}
settings.grid.lowRange = {
  ...DEFAULT_LOW_RANGE_GRID,
  enabled: true,
  steps: [2, 4, 6],
  slRatios: [0.5, 1, 2],
  trailRatios: [0, 0.5],
};
settings.grid.baseCells = true;
settings.grid.baseTrailCells = true;
settings.dca = { ...settings.dca, levels: 2 };
settings.axis = { ...settings.axis, levels: 2, ranges: ["atr"], levelsSet: [2] };
settings.exitStrategy = {
  ...settings.exitStrategy,
  enabled: true,
  lookbackH: 12,
  timeframes: [1],
  includeCombined: false,
  maxConfigsPerPair: 6,
};
settings.signals = {
  ...settings.signals,
  enabled: true,
  sourcesMode: "allow",
  sources: { "ema-cross": true, "rsi-reversal": true },
  lanes: [1],
  exits: "pct",
  hist: { ...settings.signals.hist, lookbackH: 12 },
  normal: { tp: [0.01], slOfTp: [1] },
  trailing: { tp: [0.01], slOfTp: 1, trailOfTp: [0.5] },
  trailRatios: [1],
  trailingOnly: { enabled: true, sl: [0.01], trail: [0.005], trailStep: 1 },
};
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
process.env.CTS_CORE_LIVE = "0";
const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, {
  market: "bingx",
  replay: true,
  priceStream: null,
  evaluationFromT: first,
  replayPreloadAll: true,
  feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
});
rt.updateSettings(settings, {
  preH: 12,
  longH: 12,
  simH: 12,
  signalLongH: 12,
  stepH: 1,
  causalBase: true,
  recordValidation: true,
});
const desk = { settings: rt.settings, wf: rt.wf };
// Serialize only durable configurable WF fields; ephemeral Set/Map provenance is computed by the replay itself.
for (const key of [
  "basePassed",
  "basePassedRanges",
  "basePassedTargets",
  "basePassedCells",
  "basePassedTrailingOnlyCells",
  "validated",
])
  delete desk.wf[key];
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "desk.json"), JSON.stringify(desk, null, 2));
rt.dispose();
const sha = (x) => createHash("sha256").update(x).digest("hex");
const sourceFiles = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|mjs)$/.test(p)) sourceFiles.push([p, sha(readFileSync(p))]);
  }
}
walk("src");
sourceFiles.push([
  "scripts/verify-position-policy.mjs",
  sha(readFileSync("scripts/verify-position-policy.mjs")),
]);
sourceFiles.sort((a, b) => a[0].localeCompare(b[0]));
const protocol = {
  schema: "cts-position-count-replay-v1",
  base: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceSha256: sha(JSON.stringify(sourceFiles)),
  sourceFiles,
  feed: {
    path: feedPath,
    sha256: sha(bytes),
    provider:
      "Previously examined cached public Binance candles; not BingX venue fills or an unseen holdout",
  },
  symbols,
  window: { first, tradeStart: first + 12 * H, end, preH: 12, runH: 12, hiddenWarmupH: 0 },
  positionWindows: desk.settings.gates.positionWindows,
  cost: desk.settings.cost,
  scope:
    "All 1354 Low-Range sources on 1m, six ordinary bot/source pairs on 1m, all ordinary ranges with a bounded fixed grid, configured Signal sources and independent Exit fitting. Empty/insufficient categories are retained. Not all possible config values or persistent venue-stage integration.",
};
writeFileSync(join(out, "protocol.json"), JSON.stringify(protocol, null, 2));
const args = [
  "--expose-gc",
  "--max-old-space-size=4096",
  "--experimental-strip-types",
  "--no-warnings",
  "scripts/core-session.mjs",
  "--feed",
  feedPath,
  "--desk",
  join(out, "desk.json"),
  "--symbols",
  "8",
  "--pre",
  "12",
  "--run",
  "12",
  "--end-at",
  new Date(end).toISOString(),
  "--evaluation-from",
  new Date(first).toISOString(),
  "--selection-hours",
  "12",
  "--replay-preload-all",
  "--signals",
  "on",
  "--balance",
  "10",
  "--leverage",
  "10",
  "--pct",
  "0.002",
  "--dump",
  join(out, "raw.json"),
  "--dump-only",
  "--tape-trades-all",
  "--quiet",
  "true",
];
writeFileSync(
  join(out, "command.json"),
  JSON.stringify({ command: process.execPath, args }, null, 2),
);
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    CTS_CORE_WORKERS: "1",
    CTS_CORE_VARIANTS: "0",
    CTS_CORE_COMPARE: "0",
    MALLOC_ARENA_MAX: "2",
    MALLOC_MMAP_THRESHOLD_: "1048576",
  },
});
process.exitCode = await new Promise((done, reject) => {
  child.on("error", reject);
  child.on("exit", (code) => done(code ?? 1));
});
if (process.exitCode === 0) {
  // Read-only endpoint readiness. This does not turn built candidates into post-Base or funded proof.
  const tapes = [];
  for await (const item of iterateSessionTapeTrades(join(out, "raw.json"))) {
    const rows = item.trades,
      syms = item.symbols;
    tapes.push({
      id: item.id,
      bot: item.id.split("|")[0],
      ind: item.id.split("|")[1],
      kind: item.kind,
      protect: item.protect,
      heldOnly: item.heldOnly,
      syms,
      n: rows.length,
      entryT: Float64Array.from(rows, (r) => r[2]),
      exitT: Float64Array.from(rows, (r) => r[3]),
      r: Float64Array.from(rows, (r) => r[4]),
      side: Int8Array.from(rows, (r) => r[1]),
      symI: Int32Array.from(rows, (r) => syms.indexOf(r[0])),
    });
  }
  const gen = lastNSamplesGen(tapes, end, desk.wf);
  let next = gen.next();
  while (!next.done) next = gen.next();
  const contexts = tapes.flatMap((tp) =>
    [...new Set(tp.syms)].flatMap((sym) =>
      [1, -1].map((side) => {
        const ev = positionConfigEval(tp, end, desk.wf, sym, side);
        return {
          cfg: tp.id,
          sym,
          side,
          n: ev.n,
          requestedN: ev.requestedN,
          passed: ev.ok,
          fail: ev.ok ? null : ev.fail,
          qualifiedPf: ev.ok ? ev.pf : null,
        };
      }),
    ),
  );
  writeFileSync(
    join(out, "candidate-readiness.json"),
    JSON.stringify(
      {
        scope:
          "Built raw-candidate config × symbol × side at strict endpoint; separate from post-Base admission and execution",
        at: end,
        samples: next.value,
        contexts,
        evaluated: contexts.length,
        passed: contexts.filter((c) => c.passed).length,
      },
      null,
      2,
    ),
  );
}
