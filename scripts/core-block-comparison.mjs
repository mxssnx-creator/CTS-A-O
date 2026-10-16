#!/usr/bin/env node
// Bounded, fully offline, prespecified Block comparison. Never acquires market data or places orders.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  COMPARISON_ARMS,
  COMPARISON_HISTORY_SOURCE,
  COMPARISON_POLICY,
  COMPARISON_SOURCES,
  COMPARISON_SYMBOLS,
  NATIVE_BASELINE_ID,
  canonical,
  comparisonRoot as root,
  comparisonSourceFiles,
  exactJson,
  sha256,
  verifyComparisonSource,
  writeComparisonJson as write,
} from "./lib/block-comparison.mjs";

const H = 3_600_000;
const read = (file) => JSON.parse(fs.readFileSync(file));
function readComparisonProjection(file) {
  const x = read(file);
  return {
    schema: x.schema,
    fold: x.fold,
    arm: x.arm,
    window: x.window,
    protocolSha256: x.protocolSha256,
    sourceSha256: x.sourceSha256,
    settings: x.settings,
    total: x.total,
    slices: x.slices,
    risk: x.risk,
    book: { checks: x.book.checks, failedChecks: x.book.failedChecks },
    provenance: { coverage: x.provenance.coverage },
  };
}
export function comparisonEnvironment() {
  return {
    PATH: process.env.PATH ?? "",
    LANG: "C.UTF-8",
    TZ: "UTC",
    NODE_OPTIONS: `--require ${path.join(root, "scripts/lib/core-test-offline-guard.cjs")}`,
    MALLOC_ARENA_MAX: "2",
    MALLOC_MMAP_THRESHOLD_: "1048576",
    CTS_CORE_WORKERS: "1",
    CTS_CORE_COMPARE: "0",
    CTS_CORE_VARIANTS: "0",
    CTS_CORE_STATE: "off",
    CTS_CORE_AUTOSTART: "0",
    CTS_CORE_LIVE: "0",
  };
}
export function validateComparisonFeed(feed, symbols, endT) {
  const quality = {};
  if (!feed || !Array.isArray(feed.tickers) || !feed.candles)
    throw new Error("Missing public offline feed");
  const tickerIds = feed.tickers.map((x) => x.symbol ?? x.sym);
  if (
    new Set(tickerIds).size !== symbols.length ||
    tickerIds.length !== symbols.length ||
    tickerIds.some((x) => !symbols.includes(x))
  )
    throw new Error("Feed ticker universe differs from frozen symbols");
  let firstT = null,
    count = null;
  for (const sym of symbols) {
    const rows = feed.candles[`${sym}|1`];
    if (!Array.isArray(rows) || rows.length < 720)
      throw new Error("Missing minute candles for " + sym);
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i];
      if (
        ![c.t, c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) ||
        c.t % 60_000 ||
        c.l <= 0 ||
        c.l > Math.min(c.o, c.c) ||
        c.h < Math.max(c.o, c.c) ||
        c.v < 0 ||
        (i && c.t !== rows[i - 1].t + 60_000) ||
        c.t + 60_000 > endT
      )
        throw new Error("Invalid, non-contiguous or future candle for " + sym);
    }
    if (rows.at(-1).t + 60_000 !== endT)
      throw new Error("Feed does not reach the frozen exclusive end");
    firstT ??= rows[0].t;
    count ??= rows.length;
    if (rows[0].t !== firstT || rows.length !== count)
      throw new Error("Feed symbols have different warmup coverage");
    quality[sym] = { n: rows.length, firstT: rows[0].t, endExclusiveT: endT, gaps: 0 };
  }
  if (
    Object.keys(feed.candles).length !== symbols.length ||
    feed.tickers.some((x) => !symbols.includes(x.symbol ?? x.sym))
  )
    throw new Error("Feed expands beyond the frozen four symbols");
  return quality;
}
export async function materializedComparisonDefaults() {
  process.env.CTS_CORE_STATE = "off";
  process.env.CTS_CORE_AUTOSTART = "0";
  process.env.CTS_CORE_COMPARE = "0";
  process.env.CTS_CORE_LIVE = "0";
  const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
  const { CoreDb } = await import("../src/core/server/db.server.ts");
  const { positiveCoordWarnings } = await import("../src/core/positive.ts");
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    { symbols: 4, signals: { enabled: true } },
    { market: "bingx", replay: true, priceStream: null },
  );
  rt.updateSettings({
    symbols: 4,
    forceSymbols: [...COMPARISON_SYMBOLS],
    symbolRank: "volume",
    toggles: { ...rt.settings.toggles, block: true, blockActive: false },
    block: {
      ...rt.settings.block,
      mode: "overall",
      ratio: 0.2,
      sharedRatio: undefined,
      historySource: COMPARISON_HISTORY_SOURCE,
      maxMult: 2,
      steps: 0,
      sources: { ...COMPARISON_SOURCES },
    },
  });
  rt.updateSettings({}, { preH: 6, simH: 6, causalBase: true, recordValidation: true });
  if (rt.status.computes !== 0) throw new Error("Settings materialization unexpectedly computed");
  const result = {
    actualSettings: canonical(rt.settings),
    actualWf: canonical(rt.wf),
    positiveCoordWarnings: positiveCoordWarnings(rt.settings, rt.wf),
    computes: rt.status.computes,
  };
  rt.dispose();
  return result;
}
export function comparisonEngineCommand(protocolFile, fold, p) {
  return [
    "--experimental-strip-types",
    "--no-warnings",
    "--expose-gc",
    "--max-old-space-size=4096",
    path.join(root, "scripts/core-session.mjs"),
    "--feed",
    path.join(path.dirname(protocolFile), fold.id, "feed.json"),
    "--end-at",
    new Date(fold.endT).toISOString(),
    "--evaluation-from",
    new Date(fold.evaluationFromT).toISOString(),
    "--pre",
    "6",
    "--run",
    "6",
    "--symbols",
    "4",
    "--signals",
    "on",
    "--settings",
    JSON.stringify(p.actualSettings),
    "--wf",
    JSON.stringify({ causalBase: true, recordValidation: true }),
    "--balance",
    "1000",
    "--pct",
    "0.02",
    "--leverage",
    "10",
    "--signal-progress",
    "--dump-only",
    "--dump",
    path.join(path.dirname(protocolFile), fold.id, "native-raw.json"),
    "--frozen-block-study",
    protocolFile,
    "--study-fold",
    fold.id,
    "--max-wait-min",
    "8",
    "--paper-wait-s",
    "120",
  ];
}
export async function prepareComparison(
  dir,
  feedRoot = path.join(root, "runs/range-study-20261015/attempt-02-materialized-settings"),
) {
  dir = path.resolve(dir);
  const protocolFile = path.join(dir, "protocol.json");
  if (fs.existsSync(protocolFile)) throw new Error("Preserve the existing frozen protocol");
  const defaults = await materializedComparisonDefaults();
  const folds = [1, 2].map((n) => {
    const id = `development-${n}`,
      input = path.resolve(feedRoot, id, "feed.json");
    const bytes = fs.readFileSync(input),
      endT = Date.parse(n === 1 ? "2026-10-14T04:00:00Z" : "2026-10-15T04:00:00Z");
    const quality = validateComparisonFeed(JSON.parse(bytes), COMPARISON_SYMBOLS, endT),
      dest = path.join(dir, id, "feed.json");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(input, dest);
    return {
      id,
      endT,
      tradeStartT: endT - 6 * H,
      evaluationFromT: endT - 12 * H,
      originalPath: input,
      feedSha256: sha256(bytes),
      feedBytes: bytes.length,
      quality,
    };
  });
  const p = {
    schema: "cts-block-comparison-v1",
    frozenAt: new Date().toISOString(),
    classification:
      "Reused retrospective development windows; no claim of untouched holdout, prospective profitability or venue execution.",
    symbols: COMPARISON_SYMBOLS,
    arms: COMPARISON_ARMS,
    nativeBaselineId: NATIVE_BASELINE_ID,
    sourceFlags: COMPARISON_SOURCES,
    performancePolicy: COMPARISON_POLICY,
    folds,
    preH: 6,
    runH: 6,
    ...defaults,
    actualSettingsSha256: sha256(exactJson(defaults.actualSettings)),
    actualWfSha256: sha256(exactJson(defaults.actualWf)),
    differences:
      "Ten arms: Block Off; Overall/Additive/Shared ratio0.2 and Shared-higher ratio0.2 with sharedRatio0.4, each with Block Active off and on; legacy Overall ratio0.2/steps7/cap8 diagnostic. The eight continuous arms use steps0/cap2. Shared-higher is sensitivity only and cannot change defaults. All source flags retain common shipped defaults (overall/symbol/direction/exact indication on, config/strategy-type off); all other source, gate, range, protection, cost and coordination settings remain identical. Axis remains current-default false.",
    sample:
      "Primary=GP/GL of strict verified modeled unit-net returns on matched positive-owned settled close slices. Same cohort cash PF is diagnostic. Accepted virtual orders remain separate. Unknown units/ownership are unavailable, zero allocations are explicit and endpoint marks stay outside settled PF.",
    comparison:
      "Whole-arm cohorts are primary. Common exact positive-owned close-slice intersection is diagnostic. Weight-only Block must preserve same-slice unit returns; any full-cohort PF difference requires different funded sample/entries, never relabeled cash weights. Each fold independently requires at least30 distinct positive-owned settled entry orders, finite unit-return PF>=1.1, >=0.1 absolute PF improvement over Off, equity drawdown<=10% and <=Off+2 percentage points, known ownership/returns/stack cap and feasible margin. These retrospective outcomes cannot authorize live promotion or change defaults.",
    warmup:
      "All candles before each evaluationFromT initialize indicators only. They never expand the six-hour evaluated preparation sample.",
    budget: {
      workers: 1,
      maxOldSpaceMb: 4096,
      totalMinutes: 35,
      maxEngineMinutesPerFold: 12,
      maxRenderMinutes: 1,
      expectedPeakRssGiB: 3,
      memoryGuardsEnabled: true,
    },
    networkRequests: 0,
    liveOrders: false,
    book: {
      balance: 1000,
      sizing: "equityPct",
      pct: 0.02,
      leverage: 10,
      caps: "Native core-session allocation, unchanged",
    },
    completeness:
      "Full current default focus, enabled sources/types and complete configured exit ladders on four fixed symbols. Requested/built/qualified/executed are separate; disabled, unbuilt, empty, losing and unknown scopes remain explicit. Not global coverage.",
  };
  write(protocolFile, p);
  return p;
}
async function child(args, log, timeoutMs) {
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const fd = fs.openSync(log, "w"),
    start = Date.now();
  try {
    return await new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, args, {
        cwd: root,
        env: comparisonEnvironment(),
        stdio: ["ignore", fd, fd],
      });
      let timedOut = false;
      const timer = setTimeout(
        () => {
          timedOut = true;
          proc.kill("SIGTERM");
          const hard = setTimeout(() => proc.kill("SIGKILL"), 5000);
          hard.unref();
        },
        Math.max(1, timeoutMs),
      );
      proc.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.once("close", (exitCode, signal) => {
        clearTimeout(timer);
        resolve({ exitCode, signal, timedOut, elapsedSeconds: (Date.now() - start) / 1000 });
      });
    });
  } finally {
    fs.closeSync(fd);
  }
}
export async function runComparison(protocolFile) {
  protocolFile = path.resolve(protocolFile);
  const frozen = verifyComparisonSource(protocolFile),
    p = frozen.protocol,
    dir = path.dirname(protocolFile);
  const lock = path.join(dir, "heavy.lock"),
    lockFd = fs.openSync(lock, "wx"),
    started = Date.now(),
    results = [];
  fs.writeFileSync(lockFd, String(process.pid));
  const remaining = () => p.budget.totalMinutes * 60_000 - (Date.now() - started);
  try {
    for (const fold of p.folds) {
      if (remaining() <= 0)
        throw new Error("Frozen total budget exhausted; preserve incomplete scope");
      const foldDir = path.join(dir, fold.id),
        command = comparisonEngineCommand(protocolFile, fold, p);
      if (fs.existsSync(path.join(foldDir, "native-raw.json")))
        throw new Error("Existing measured run must be preserved; refuse overwrite");
      write(path.join(foldDir, "command.json"), {
        engine: command,
        environment: comparisonEnvironment(),
      });
      console.log(
        `Starting ${fold.id}: 4 symbols, full current enabled exits, one native compute, ${p.arms.length} frozen Block arms`,
      );
      const engine = await child(
        command,
        path.join(foldDir, "engine.log"),
        Math.min(remaining(), p.budget.maxEngineMinutesPerFold * 60_000),
      );
      const record = { fold: fold.id, engine, arms: [], complete: false };
      results.push(record);
      write(path.join(dir, "progress.json"), { started: new Date(started).toISOString(), results });
      if (engine.exitCode !== 0)
        throw new Error(`${fold.id} engine failed/incomplete; see preserved log`);
      verifyComparisonSource(protocolFile);
      for (const arm of p.arms) {
        if (remaining() <= 0) throw new Error("Frozen total budget exhausted");
        const armDir = path.join(foldDir, arm.id),
          rawPath = path.join(armDir, "raw.json");
        const args = [
          "--experimental-strip-types",
          "--no-warnings",
          "--expose-gc",
          "--max-old-space-size=4096",
          path.join(root, "scripts/core-session.mjs"),
          "--replay",
          rawPath,
          "--signal-progress",
          "--out",
          path.join(armDir, "session"),
          "--html",
          path.join(armDir, "book"),
        ];
        const render = await child(
          args,
          path.join(armDir, "book.log"),
          Math.min(remaining(), p.budget.maxRenderMinutes * 60_000),
        );
        const item = { arm: arm.id, render, complete: false };
        record.arms.push(item);
        if (
          ![0, 1].includes(render.exitCode) ||
          !fs.existsSync(path.join(armDir, "book/data.json"))
        )
          throw new Error("Native funded allocation/report failed");
        const { blockComparisonEvidence } = await import("./lib/block-comparison-evidence.mjs");
        const evidence = blockComparisonEvidence(
          read(rawPath),
          read(path.join(armDir, "book/data.json")),
          {
            fold: fold.id,
            arm: arm.id,
            protocolSha256: frozen.protocolSha256,
            sourceSha256: frozen.seal.sourceSha256,
          },
        );
        write(path.join(armDir, "evidence.json"), evidence);
        item.complete = true;
        item.failedChecks =
          read(path.join(armDir, "book/data.json")).checks?.filter((x) => !x.ok) ?? [];
        item.allNativeChecksPassed = item.failedChecks.length === 0;
        write(path.join(dir, "progress.json"), {
          started: new Date(started).toISOString(),
          results,
        });
      }
      record.complete = record.arms.every((x) => x.complete);
      globalThis.gc?.();
    }
    verifyComparisonSource(protocolFile);
    const { assessBlockPerformance, compareBlockEvidence } =
      await import("./lib/block-comparison-evidence.mjs");
    const allArms = p.folds.flatMap((fold) =>
      p.arms.map((arm) =>
        readComparisonProjection(path.join(dir, fold.id, arm.id, "evidence.json")),
      ),
    );
    const folds = p.folds.map((fold) => ({
      fold: fold.id,
      comparison: compareBlockEvidence(allArms.filter((x) => x.fold === fold.id)),
    }));
    const performance = assessBlockPerformance(allArms, p.performancePolicy);
    const report = {
      schema: "cts-block-comparison-report-v1",
      at: new Date().toISOString(),
      protocolSha256: frozen.protocolSha256,
      sourceSha256: frozen.seal.sourceSha256,
      sourceCheckpoint: frozen.seal.checkpoint,
      classification: p.classification,
      scope: p.completeness,
      noPromotion: true,
      codeDefaultsUnchanged: true,
      baselineArm: NATIVE_BASELINE_ID,
      results,
      folds,
      performance,
      allNativeChecksPassed: results.every((x) => x.arms.every((a) => a.allNativeChecksPassed)),
      accountingLimits:
        "Native modeled session book and configured 0.20% round-trip cost, not venue-owned fills or measured account fees. Native funding, latency, venue quantity precision and liquidation are not reconstructed. Coverage/activity failures remain explicit even when capture completes.",
      elapsedSeconds: (Date.now() - started) / 1000,
    };
    write(path.join(dir, "comparison.json"), report);
    console.log(
      JSON.stringify({
        complete: results.every((x) => x.complete),
        elapsedSeconds: report.elapsedSeconds,
        output: dir,
      }),
    );
    return report;
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lock);
    write(path.join(dir, "progress.json"), { started: new Date(started).toISOString(), results });
  }
}
export async function blockComparisonMain(argv) {
  const [mode, file, checkpoint] = argv;
  if (!file || !["prepare", "seal-source", "run"].includes(mode))
    throw new Error(
      "Usage: core-block-comparison.mjs prepare OUTPUT_DIR [CACHED_FEED_ROOT] | seal-source PROTOCOL FINAL_COMMIT | run PROTOCOL",
    );
  if (mode === "prepare") {
    const p = await prepareComparison(file, checkpoint);
    console.log(
      JSON.stringify({
        prepared: true,
        scope: p.completeness,
        folds: p.folds.length,
        arms: p.arms.length,
      }),
    );
    return;
  }
  const protocolFile = path.resolve(file);
  if (mode === "seal-source") {
    if (!/^[0-9a-f]{40}$/.test(checkpoint ?? ""))
      throw new Error("Explicit final source checkpoint required");
    const sealFile = path.join(path.dirname(protocolFile), "source-freeze.json");
    if (fs.existsSync(sealFile))
      throw new Error("Preserve existing source freeze; do not overwrite");
    const files = comparisonSourceFiles();
    write(sealFile, {
      at: new Date().toISOString(),
      checkpoint,
      protocolSha256: sha256(fs.readFileSync(protocolFile)),
      files,
      sourceSha256: sha256(exactJson(files)),
    });
    console.log(JSON.stringify({ sealed: true, files: files.length, checkpoint }));
    return;
  }
  await runComparison(protocolFile);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await blockComparisonMain(process.argv.slice(2));
