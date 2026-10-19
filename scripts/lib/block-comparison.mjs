// Frozen offline Block ablation. Tapes and all strategy qualification are native; only execution Block changes.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const COMPARISON_ARMS = Object.freeze([
  {
    id: "off",
    block: false,
    active: false,
    maxMult: 2,
    mode: "overall",
    ratio: 0.2,
    steps: 0,
    diagnostic: true,
  },
  ...[false, true].flatMap((active) => [
    {
      id: `overall${active ? "-active" : ""}`,
      block: true,
      active,
      maxMult: 2,
      mode: "overall",
      ratio: 0.2,
      steps: 0,
      diagnostic: false,
    },
    {
      id: `additive${active ? "-active" : ""}`,
      block: true,
      active,
      maxMult: 2,
      mode: "additive",
      ratio: 0.2,
      steps: 0,
      diagnostic: false,
    },
    {
      id: `shared${active ? "-active" : ""}`,
      block: true,
      active,
      maxMult: 2,
      mode: "shared",
      ratio: 0.2,
      steps: 0,
      diagnostic: false,
    },
    {
      id: `shared-higher${active ? "-active" : ""}`,
      block: true,
      active,
      maxMult: 2,
      mode: "shared",
      ratio: 0.2,
      sharedRatio: 0.4,
      steps: 0,
      diagnostic: true,
    },
  ]),
  {
    id: "stepped-cap8",
    block: true,
    active: false,
    maxMult: 8,
    mode: "overall",
    ratio: 0.2,
    steps: 7,
    diagnostic: true,
  },
]);
export const NATIVE_BASELINE_ID = "overall";
export const COMPARISON_HISTORY_SOURCE = "accepted-orders";
export const COMPARISON_SOURCES = Object.freeze({
  config: false,
  overall: true,
  symbol: true,
  direction: true,
  indication: true,
  type: false,
});
export const COMPARISON_POLICY = Object.freeze({
  minOwnedEntryOrders: 30,
  minReturnPf: 1.1,
  minPairedPfImprovement: 0.1,
  maxEquityDrawdownFraction: 0.1,
  maxEquityDrawdownIncreaseFraction: 0.02,
});
export const COMPARISON_SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"];
export const comparisonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function canonical(value) {
  if (value instanceof Set) return [...value].sort().map(canonical);
  if (value instanceof Map)
    return Object.fromEntries(
      [...value]
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([k, v]) => [k, canonical(v)]),
    );
  if (ArrayBuffer.isView(value)) return [...value].map(canonical);
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export const exactJson = (value) => JSON.stringify(canonical(value));
export const writeComparisonJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
};
export function comparisonSourceFiles(root = comparisonRoot) {
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((x) =>
        x.isDirectory()
          ? walk(path.join(dir, x.name))
          : /\.(?:ts|tsx|mjs|cjs)$/.test(x.name)
            ? [path.join(dir, x.name)]
            : [],
      );
  return [
    ...walk(path.join(root, "src/core")),
    ...walk(path.join(root, "scripts/lib")),
    ...[
      "scripts/core-session.mjs",
      "scripts/core-block-comparison.mjs",
      "package.json",
      "package-lock.json",
    ].map((x) => path.join(root, x)),
  ]
    .filter((x) => !/\.test\.[^.]+$/.test(x) && !x.endsWith("/test-support.ts"))
    .sort()
    .map((file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)) }));
}
export function verifyComparisonSource(protocolFile) {
  const protocolBytes = fs.readFileSync(protocolFile),
    protocol = JSON.parse(protocolBytes);
  if (
    protocol.schema !== "cts-block-comparison-v1" ||
    exactJson(protocol.arms) !== exactJson(COMPARISON_ARMS) ||
    exactJson(protocol.symbols) !== exactJson(COMPARISON_SYMBOLS) ||
    protocol.nativeBaselineId !== NATIVE_BASELINE_ID ||
    exactJson(protocol.sourceFlags) !== exactJson(COMPARISON_SOURCES) ||
    exactJson(protocol.performancePolicy) !== exactJson(COMPARISON_POLICY) ||
    protocol.actualSettings?.block?.historySource !== COMPARISON_HISTORY_SOURCE
  )
    throw new Error("Unexpected frozen Block comparison scope");
  const seal = JSON.parse(
    fs.readFileSync(path.join(path.dirname(protocolFile), "source-freeze.json")),
  );
  if (seal.protocolSha256 !== sha256(protocolBytes) || !/^[0-9a-f]{40}$/.test(seal.checkpoint))
    throw new Error("Comparison source/protocol seal is missing or differs");
  const files = comparisonSourceFiles();
  if (exactJson(files) !== exactJson(seal.files) || sha256(exactJson(files)) !== seal.sourceSha256)
    throw new Error("Comparison source changed after freeze");
  return { protocol, seal, protocolSha256: seal.protocolSha256 };
}
export function assertComparisonRuntime(rt, protocol) {
  if (exactJson(rt.settings) !== exactJson(protocol.actualSettings))
    throw new Error("Actual runtime settings differ from the complete frozen settings");
  if (exactJson(rt.wf) !== exactJson(protocol.actualWf))
    throw new Error("Actual runtime walk-forward options differ from the frozen options");
  if (rt.status.computes !== 0)
    throw new Error("Comparison settings must be checked before any compute");
}
export function validateFrozenBlockRuntime(
  rt,
  protocolFile,
  foldId,
  feedFile,
  evaluationFromT,
  cutT,
) {
  const frozen = verifyComparisonSource(protocolFile),
    fold = frozen.protocol.folds.find((x) => x.id === foldId);
  if (!fold || fold.endT !== cutT || fold.evaluationFromT !== evaluationFromT)
    throw new Error("Comparison fold/time boundary differs");
  if (sha256(fs.readFileSync(feedFile)) !== fold.feedSha256)
    throw new Error("Comparison candle feed differs from its frozen bytes");
  assertComparisonRuntime(rt, frozen.protocol);
  return frozen;
}
export function armOptions(base, arm) {
  if (!COMPARISON_ARMS.some((x) => exactJson(x) === exactJson(arm)))
    throw new Error("Unfrozen comparison arm");
  return {
    ...base,
    protects: [],
    dcaProtects: [],
    toggles: { ...base.toggles, block: arm.block, blockActive: arm.active },
    block: {
      ...base.block,
      maxMult: arm.maxMult,
      mode: arm.mode,
      ratio: arm.ratio,
      sharedRatio: arm.sharedRatio,
      steps: arm.steps,
    },
  };
}
const simulationDigest = (sim) =>
  sha256(
    exactJson({
      trades: [...sim.trades].sort(
        (a, b) =>
          a.exitT - b.exitT ||
          a.entryT - b.entryT ||
          String(a.cfg).localeCompare(String(b.cfg)) ||
          a.side - b.side ||
          a.sym.localeCompare(b.sym),
      ),
      open: [...(sim.openAtEnd ?? [])].sort(
        (a, b) =>
          a.entryT - b.entryT ||
          String(a.cfg).localeCompare(String(b.cfg)) ||
          a.side - b.side ||
          a.sym.localeCompare(b.sym),
      ),
      steps: sim.steps,
      signalSteps: sim.signalSteps,
      skips: sim.skips,
    }),
  );

/** Called only by the explicit offline session hook while the actual final native tapes still exist. */
export async function captureFrozenBlockArms(rt, sim, raw, protocolFile, foldId, coverageOf) {
  const frozen = verifyComparisonSource(protocolFile),
    p = frozen.protocol,
    fold = p.folds.find((x) => x.id === foldId);
  if (!fold || raw.window.startT !== fold.tradeStartT || raw.window.endT !== fold.endT)
    throw new Error("Actual execution window differs from frozen comparison");
  if (
    (raw.engine.mem?.computeLevel ?? raw.engine.mem?.fallback ?? 0) !== 0 ||
    raw.engine.universe.length !== p.symbols.length ||
    p.symbols.some((x) => !raw.engine.universe.includes(x))
  )
    throw new Error("Comparison requires the full requested universe at full memory level");
  const { walkForward, selectionScoreAt } = await import("../../src/core/sim/walkforward.ts");
  const { captureSignalProgress } = await import("./signal-progress.mjs");
  const out = path.join(path.dirname(protocolFile), foldId),
    base = sim.opts;
  const u = {
    bars: [],
    caches: [],
    startT: 0,
    endT: 0,
    splitT: 0,
    nowT: base.startT === undefined ? sim.endT : (rt.lastUniverse?.nowT ?? sim.endT),
    baseTf: rt.lastUniverse?.baseTf ?? 1,
  };
  const nativeDigest = simulationDigest(sim),
    baseline = p.arms.find((x) => x.id === NATIVE_BASELINE_ID);
  if (!baseline) throw new Error("Frozen native baseline is missing");
  const replay = walkForward(u, rt.tapes, armOptions(base, baseline));
  const replayDigest = simulationDigest(replay);
  if (simulationDigest(sim) !== nativeDigest)
    throw new Error("Variant replay mutated the original native result");
  if (nativeDigest !== replayDigest)
    throw new Error(
      "Final-tape baseline does not exactly reproduce native trades, opens, steps, signal activation and skips",
    );
  const builtCatalog = rt.tapes.map((tp) => ({
    id: tp.id,
    bot: tp.bot,
    ind: tp.ind,
    kind: tp.kind,
    protect: tp.protect,
    n: tp.n,
    symbols: tp.syms,
  }));
  writeComparisonJson(path.join(out, "built-catalog.json"), {
    sourceSha256: frozen.seal.sourceSha256,
    catalog: builtCatalog,
    coverage: raw.engine.coverage,
    note: "Built identities only; requested but uncomputed cells remain in native coverage/Signal inventory and are never marked passing.",
  });
  const rows = [];
  if (typeof coverageOf !== "function") throw new Error("Native per-arm coverage reducer required");
  for (const arm of [baseline, ...p.arms.filter((x) => x.id !== NATIVE_BASELINE_ID)]) {
    const t0 = Date.now(),
      variant =
        arm.id === NATIVE_BASELINE_ID ? replay : walkForward(u, rt.tapes, armOptions(base, arm));
    const opts = armOptions(base, arm),
      byId = new Map(rt.tapes.map((tp) => [tp.id, tp]));
    const cfgInfo = {};
    for (const x of [...variant.trades, ...(variant.openAtEnd ?? [])]) {
      const tp = byId.get(x.cfg);
      if (tp && !cfgInfo[x.cfg])
        cfgInfo[x.cfg] = [tp.protect?.sl ?? 0, selectionScoreAt(tp, sim.startT, opts)];
    }
    const want = new Set([
      ...(variant.trades ?? []).map((x) => x.cfg),
      ...(variant.steps ?? []).flatMap((x) => x.real ?? []),
    ]);
    const view = Object.create(rt);
    view.sim = variant;
    view.settings = { ...rt.settings, toggles: opts.toggles, block: opts.block };
    const coverage = await coverageOf(view, view.settings);
    const armRaw = {
      ...raw,
      settings: { ...raw.settings, toggles: opts.toggles, block: opts.block },
      trades: [...variant.trades].sort((a, b) => a.exitT - b.exitT),
      openEnd: (variant.openAtEnd ?? []).map((x) => ({
        cfg: x.cfg,
        sym: x.sym,
        side: x.side,
        entryT: x.entryT,
        entry: x.entry,
        mtmR: x.r,
        kind: x.kind,
        vol: x.vol,
        mult: x.mult,
        level: x.level,
        legs: x.legs,
        src: x.src,
        coordVol: x.coordVol,
        ...(x.unitR !== undefined ? { unitR: x.unitR } : {}),
      })),
      validation: (variant.steps ?? [])
        .filter((x) => x.checks)
        .map((x) => ({ t: x.t, real: x.real, checks: x.checks })),
      stepsByRange: (variant.steps ?? []).map((x) => ({ t: x.t, byRange: x.byRange ?? null })),
      signalProgress: captureSignalProgress(rt, variant, sim.startT, sim.endT),
      tapeTrades: rt.tapes
        .filter((tp) => want.has(tp.id))
        .map((tp) => ({
          id: tp.id,
          trades: Array.from({ length: tp.n }, (_, i) => [
            tp.syms[tp.symI[i]],
            tp.side[i],
            tp.entryT[i],
            tp.exitT[i],
            tp.r[i],
          ]),
        })),
      cfgInfo,
      variants: null,
      engine: {
        ...raw.engine,
        coverage,
        skips: variant.skips,
        skipsByRange: variant.skipsByRange,
        skipPf: variant.skipPf,
      },
      frozenBlockComparison: {
        schema: p.schema,
        fold: foldId,
        arm,
        protocolSha256: frozen.protocolSha256,
        sourceSha256: frozen.seal.sourceSha256,
        sourceCheckpoint: frozen.seal.checkpoint,
        nativeDigest,
        replayDigest,
        actualSettingsVerifiedBeforeCompute: true,
        sharedTapeCount: rt.tapes.length,
        symbols: p.symbols,
        builtCatalog,
        sharedHistoricalDiagnostics:
          "Base, funnel, initially seated tape aggregates and paper selection are common native Overall continuous ratio0.2 cap2 diagnostics. Per-arm trades, validation, signal activation, indication execution coverage, skips and native allocated book are separate.",
        prospectiveEvidence: false,
        liveOrders: false,
      },
    };
    const dest = path.join(out, arm.id, "raw.json");
    if (fs.existsSync(dest))
      throw new Error("Preserve existing comparison outcomes; refuse overwrite");
    writeComparisonJson(dest, armRaw);
    rows.push({
      arm: arm.id,
      path: dest,
      trades: variant.trades.length,
      open: variant.openAtEnd?.length ?? 0,
      seconds: (Date.now() - t0) / 1000,
    });
    process.stderr.write(
      `frozen Block ${foldId}/${arm.id}: ${variant.trades.length} settled modeled slices; ${rows.at(-1).seconds.toFixed(2)}s\n`,
    );
  }
  const manifest = {
    nativeDigest,
    replayDigest,
    exactBaselineReproduction: true,
    rows,
    protocolSha256: frozen.protocolSha256,
    sourceSha256: frozen.seal.sourceSha256,
  };
  writeComparisonJson(path.join(out, "arm-capture.json"), manifest);
  return manifest;
}
