// Fixed-protocol offline validation of Signals Coordination.
// Reads a local frozen candle cache only; it does not access exchanges, accounts, settings stores, or order APIs.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS, DEFAULT_TACTICS } from "../src/core/config.ts";
import { minPfOf } from "../src/core/minimal-coord.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { filterEntries } from "../src/core/sim/walkforward.ts";
import { simulate } from "../src/core/sim/backtest.ts";
import { profitFactor, settledHourT, statsOf } from "../src/core/metrics/stats.ts";
import { DEFAULT_SIGNALS, SIGNAL_SOURCES } from "../src/core/signal-config.ts";
import { isSignalCoordinationInd, parseSignalCoordinationId, signalCoordinationHistory, SIGNAL_COORDINATION_RATIOS } from "../src/core/signal-coordination.ts";
import { signalCombos } from "../src/core/signals.ts";
import { emptySignalHistDiagnostics, signalHistProtectsGen } from "../src/core/signal-hist.ts";
import { configId, makeUniverse, protectKind, runCombo, passesBase, baseSetsGates } from "../src/core/pipeline/pipeline.ts";
import { compareTapeTrades, configEval, defaultWalkForward, makeTape, selectFixed } from "../src/core/sim/walkforward.ts";
import { symbolDirections } from "../src/core/sim/symbol-directions.ts";
import { signalCoordinationProtects } from "../src/core/server/runtime.server.ts";
import { publishReplayEvidence } from "./lib/replay-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOUR = 3_600_000;
const COST = DEFAULT_SETTINGS.cost;
const PROTOCOL = resolve(root, "docs/signal-research-protocol-20261016.json");
const SAMPLE = resolve(root, "scripts/data/signals-coordination-protection-sample.json");
const OLD_REPORT = resolve(root, "runs/signals-coordination-trade-sim-20261017/report.json");
const OUT = resolve(root, "runs/signals-coordination-trade-sim-20261017-expanded");
const hash = (x) => createHash("sha256").update(x).digest("hex");
const iso = (x) => new Date(x).toISOString();
const round = (x) => Number(x.toFixed(12));
const protectKey = (p) => [p.tp, p.sl, p.trail, p.hold, p.tag ?? ""].join("|");
const sourceKey = (x) => "r" + Math.round(x.ratio * 100) + "-i" + x.inputMask;
const inputLabel = (mask) => mask === 1 ? "Short" : mask === 2 ? "Medium" : "Short + Medium";
const idOf = (bot, ind, p, side) => configId(bot, ind, p) + "|side" + side;

function blank() { return { n: 0, wins: 0, losses: 0, zero: 0, gp: 0, gl: 0 }; }
function add(a, r) {
  if (!Number.isFinite(r)) throw new Error("Non-finite return in replay");
  a.n++;
  if (r > 0) { a.wins++; a.gp += r; }
  else if (r < 0) { a.losses++; a.gl -= r; }
  else a.zero++;
}
function merge(a, b) {
  for (const k of ["n", "wins", "losses", "zero", "gp", "gl"]) a[k] += b[k];
  return a;
}
function summary(a) {
  const net = a.gp - a.gl;
  return {
    n: a.n, wins: a.wins, losses: a.losses, zero: a.zero,
    gp: round(a.gp), gl: round(a.gl), netReturnSum: round(net), netPoints: round(net * 100),
    pf: a.n ? round(profitFactor(a.gp, a.gl)) : null, winRate: a.n ? round(a.wins / a.n) : null,
  };
}
function baseStats(trades, nowT) {
  return statsOf([...trades].sort(compareTapeTrades), nowT);
}
function directionSignal(signal, side) {
  const out = new Int8Array(signal.length);
  for (let i = 0; i < signal.length; i++) if (signal[i] * side > 0) out[i] = signal[i];
  return out;
}
function maskEntries(signal, bars, boundary) {
  const out = new Int8Array(signal.length);
  for (let i = 0; i + 1 < signal.length; i++) if (bars.t[i + 1] >= boundary) out[i] = signal[i];
  return out;
}
function trimThrough(b, t) {
  let n = 0;
  const tf = b.tfMin * 60_000;
  while (n < b.n && b.t[n] + tf <= t) n++;
  return n === b.n ? b : { ...b, n, t: b.t.slice(0, n), o: b.o.slice(0, n), h: b.h.slice(0, n), l: b.l.slice(0, n), c: b.c.slice(0, n), v: b.v.slice(0, n) };
}
function validateMarket(market, protocol) {
  const symbols = Object.keys(market).sort();
  if (JSON.stringify(symbols) !== JSON.stringify([...protocol.data.symbols].sort())) throw new Error("Cache symbols differ from protocol");
  let total = 0;
  for (const sym of symbols) {
    const cs = market[sym];
    if (!Array.isArray(cs) || cs.length < 2 || cs[0].t !== protocol.data.startT || cs.at(-1).t + 60_000 !== protocol.data.endT)
      throw new Error(sym + ": invalid cache size or endpoints");
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (![c.t, c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) || c.t % 60_000 || c.l <= 0 ||
          c.h < Math.max(c.o, c.c) || c.l > Math.min(c.o, c.c) || c.v < 0)
        throw new Error(sym + ": invalid minute candle " + i);
      if (i && c.t !== cs[i - 1].t + 60_000) throw new Error(sym + ": gap or duplicate at " + i);
    }
    total += cs.length;
  }
  return { symbols, totalCandles: total, startT: protocol.data.startT, isStartT: protocol.data.isStartT, splitT: protocol.data.splitT, endT: protocol.data.endT };
}
function runtimeProtects() {
  return signalCoordinationProtects(
    DEFAULT_SETTINGS.grid,
    COST,
    DEFAULT_SIGNALS.coordination.ranges,
  );
}
function entryFor(pair, cache, bars) {
  const raw = entrySignal(pair.bot, pair.ind, cache, DEFAULT_TACTICS);
  if (!raw) throw new Error("Missing signal " + pair.key);
  return filterEntries(raw, bars, cache, DEFAULT_SIGNALS.filter);
}
function summarizeHours(map) {
  const rows = [...map].map(([t, a]) => ({ t, ...summary(a) })).filter((x) => x.n).sort((a, b) => a.t - b.t);
  const pfs = rows.map((x) => x.pf).sort((a, b) => a - b);
  const green = rows.filter((x) => x.netReturnSum > 0).length;
  const worst = rows.reduce((a, x) => !a || x.netPoints < a.netPoints ? x : a, null);
  return {
    activeHours: rows.length, greenHours: green, greenShare: rows.length ? round(green / rows.length) : 0,
    medianActiveHourPf: pfs.length ? round(pfs.length % 2 ? pfs[(pfs.length - 1) / 2] : (pfs[pfs.length / 2 - 1] + pfs[pfs.length / 2]) / 2) : 0,
    worstActiveHour: worst ? { at: iso(worst.t), closes: worst.n, pf: worst.pf, netPoints: worst.netPoints } : null,
  };
}
async function fingerprint() {
  const files = [
    "src/core/signal-coordination.ts", "src/core/signals.ts", "src/core/signal-hist.ts", "src/core/signal-config.ts",
    "src/core/sim/backtest.ts", "src/core/sim/walkforward.ts", "src/core/sim/symbol-directions.ts", "src/core/metrics/stats.ts", "src/core/pipeline/pipeline.ts",
    "src/core/server/runtime.server.ts", "src/core/config.ts", "src/core/minimal-coord.ts",
    "src/core/domain/types.ts", "src/components/v2/pages/settings.tsx",
    "src/core/signal-hist.test.ts", "src/core/signal-coordination-feature.test.ts",
    "src/core/signals.test.ts", "src/core/sim/signal-gates.test.ts",
    "scripts/core-signal-coordination-replay.mjs", "scripts/data/signals-coordination-protection-sample.json",
    "scripts/lib/replay-evidence.mjs",
  ];
  const hashes = [];
  for (const path of files) hashes.push([path, hash(await readFile(resolve(root, path)))]);
  return { sha256: hash(JSON.stringify(hashes)), files: hashes };
}
function markdown(report) {
  const f = (x, d = 3) => x == null || !Number.isFinite(Number(x)) ? "N/A" : Number(x).toFixed(d);
  const groups = report.ratioInputGroups.map((g) =>
    "| " + (g.ratio === 0.8 ? "80–100%" : f(g.ratio * 100, 0) + "–" + f((g.ratio + 0.05) * 100, 0) + "%") + " | " + g.inputs + " | " + g.qualified + " / " + g.configSides +
    " | " + (g.rejected.basePair ?? 0) + " / " + Object.entries(g.rejected).filter(([k]) => k.startsWith("strategy-")).reduce((n, [, v]) => n + v, 0) +
    " | " + g.allOos.n + " · " + f(g.allOos.pf) + " · " + f(g.allOos.netPoints, 1) +
    " | " + g.selectedOos.n + " · " + f(g.selectedOos.pf) + " · " + f(g.selectedOos.netPoints, 1) +
    " · " + f(g.selectedOos.pfWithMarks) + " | " + g.hourly.activeHours + " / " + f(g.hourly.greenShare * 100, 1) + "% |"
  ).join("\n");
  const byTable = (o) => Object.entries(o).map(([k, x]) => "| " + k + " | " + x.n + " | " + f(x.pf) + " | " + f(x.netPoints, 1) + " |").join("\n");
  const all = report.cohorts.allConfigsDiagnostic;
  const selected = report.cohorts.isQualifiedPool;
  const h = report.historical;
  const uniqueStrategies = new Map(report.rows.map((row) => [row.cfg, row]));
  const strategyGates = { normal: {}, trailing: {} };
  for (const row of uniqueStrategies.values()) {
    const counts = strategyGates[row.kind];
    if (!counts) continue;
    const reason = row.strategyBaseEval.ok ? "passed" : row.strategyBaseEval.fail ?? "failed";
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  const topTrailing = [...uniqueStrategies.values()]
    .filter((x) => x.kind === "trailing" && x.strategyBaseEval.ok)
    .sort((a, b) => b.strategyBaseEval.pf - a.strategyBaseEval.pf || b.lastN.pf - a.lastN.pf)
    .slice(0, 5);
  const trailingDetails = topTrailing.map((x) =>
    "| " + x.source + " | " + x.range + " | " + x.protect.tp + " / " + x.protect.sl + " / " + x.protect.trail + " / " + x.protect.hold +
    " | " + f(x.lastN.pf) + " | " + f(x.strategyBaseEval.pf) + " | " + (x.strategyBaseEval.fail ?? "pass") + " |",
  ).join("\n");
  return "# Signals Coordination expanded offline replay\n\n" +
    "Run: " + report.generatedAt + ". Retrospective offline simulation on the same frozen candle cache as the 2026-10-17 baseline; it is not a forward or live-account result.\n\n" +
    "## Scope\n\n" +
    "- Five ratios (60%, 65%, 70%, 75%, 80%) × three independent Short / Medium / combined source-input masks; the 80% identity covers through 100%.\n" +
    "- " + report.configSideRows + " config-side rows across 15 coordinator identities, both directions, Short / Normal / Long exit tags, Normal / Trailing strategies, and historic configs that cleared IS gates.\n" +
    "- Full runtime grid: " + report.protectionGrid.runtimeConfigs + " protections per coordinator identity (" + report.protectionGrid.normalPerCoordinator + " Normal + " + report.protectionGrid.trailingPerCoordinator + " Trailing) × " + report.protectionGrid.coordinatorIdentities + " identities = " + report.protectionGrid.totalStandardProtectionIdentities + " protection identities / " + report.protectionGrid.standardConfigSides + " directional config-side rows. Normal expanded from 4,500 to 11,250 unique protections across the 15 identities with 12 h, 32 h and 48 h untrailed holds. Trailing expanded from 13,500 to 20,250 with 48 h holds; the 48 h cells produced Strategy Base passes on the frozen IS replay. The 36-protection subset is an internal v2 coverage comparison, not v1 semantic parity.\n" +
    "- Fixed-cohort diagnostic: pooled long/short configs are selected once at the IS cutoff with configEval/selectFixed, including last-N PF, DDR, DDT, pre-window, range and stability gates. This does not reproduce actual Signal activation or continuous entry/guard checks. Runtime Signals use their own causal entry path; this fixed-cohort comparison is not execution evidence. No separate full-period IS screen is imposed. Endpoint marks remain separate.\n" +
    "- Cost " + (report.model.cost * 100).toFixed(2) + "% round trip. PF uses gross-positive / absolute-gross-negative unit returns. Pooled results count overlapping independent configs and are not portfolio ROI or account orders.\n\n" +
    "Cache SHA-256: " + report.market.cacheSha256 + ". " + report.market.symbols.length + " symbols, IS " + iso(report.market.isStartT) + " through " + iso(report.market.splitT) + ", OOS through " + iso(report.market.endT) + ". The cache was already used for tactic research, so this evidence is retrospective.\n\n" +
    "## OOS by domination ratio and input mask\n\n" +
    "| Ratio band | Inputs | IS-qualified / config sides | Rejections (pair Base / Strategy Base) | All configs: closes · PF · net points | Qualified: closes · PF · net points · PF with marks | Active / green hours |\n" +
    "|---:|---|---:|---|---:|---:|---:|\n" + groups + "\n\n" +
    "Ratios are disjoint bands: 60%, 65%, 70%, and 75% each cover through (but exclude) the next lower edge; 80% covers the full range through 100%. Quiet sources abstain and only active, non-conflicting votes form the denominator.\n\n" +
    "## Aggregate performance\n\n" +
    "| Cohort | Independent closes | PF | Net points | PF including endpoint marks | Net including marks |\n|---|---:|---:|---:|---:|---:|\n" +
    "| All configs | " + all.closed.n + " | " + f(all.closed.pf) + " | " + f(all.closed.netPoints, 1) + " | " + f(all.withOpenMarks.pf) + " | " + f(all.withOpenMarks.netPoints, 1) + " |\n" +
    "| IS-qualified pool | " + selected.closed.n + " | " + f(selected.closed.pf) + " | " + f(selected.closed.netPoints, 1) + " | " + f(selected.withOpenMarks.pf) + " | " + f(selected.withOpenMarks.netPoints, 1) + " |\n\n" +
    "### Exit range\n\n| Range | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byRange) +
    "\n\n### Strategy type, fixed-cohort selected\n\n| Type | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byStrategy) +
    "\n\n### Strategy type, all-config diagnostic\n\n| Type | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byStrategyAll) +
    "\n\n### Direction, fixed-cohort selected\n\n| Direction | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byDirection) +
    "\n\n### Strategy Base gates and passing trailing configurations\n\nThe runtime evaluator admitted " + (strategyGates.normal.passed ?? 0) + " of " + Object.values(strategyGates.normal).reduce((a, b) => a + b, 0) +
    " unique Normal configs and " + (strategyGates.trailing.passed ?? 0) + " of " + Object.values(strategyGates.trailing).reduce((a, b) => a + b, 0) +
    " unique Trailing configs on IS. First-failure counts: `" + JSON.stringify(strategyGates) + "`. Passing Trailing configs below rank by runtime-window PF, then last-N PF, using IS only.\n\n" +
    "| Coordinator / mask | Range | TP / SL / trail / hold | Last-N PF | Runtime-window PF | Runtime gate |\n|---|---|---|---:|---:|---|\n" + trailingDetails +
    "\n\nQualified pool: " + report.qualifiedConfigSides + " config-side IDs (" + report.qualifiedByOrigin.grid + " standard, " + report.qualifiedByOrigin.historic + " historic). Historic diagnostics: " +
    h.diagnostics.evaluated + " evaluated candidates from " + h.diagnostics.pairs + " pairs; " + h.diagnostics.qualified + " range-tagged configs passed; " +
    h.diagnostics.pfRejected + " failed PF/net, " + h.diagnostics.ddrRejected + " failed DDR, " + h.diagnostics.insufficientTrades + " lacked the required closes. PF floors: " +
    Object.entries(report.historyValidation.rangeMinPf).map(([k, v]) => k + " " + v).join(", ") + ".\n\n" +
    "## Hourly results and volume factor\n\nAcross " + report.hourly.evaluatedHours + " OOS clock hours, " + report.hourly.activeHours +
    " had settled closes; " + report.hourly.greenHours + " were green (" + f(report.hourly.greenShare * 100, 1) + "% of active hours). Median active-hour PF " +
    f(report.hourly.medianActiveHourPf) + ". Worst active hour: " + (report.hourly.worstActiveHour ? report.hourly.worstActiveHour.at + ", " +
    report.hourly.worstActiveHour.closes + " closes, PF " + f(report.hourly.worstActiveHour.pf) + ", net " + f(report.hourly.worstActiveHour.netPoints, 1) + " points." : "none.") +
    " Groups are shown individually above; positive results were not universal.\n\n| Size factor | Unit PF | Closes | Linear size-only net points |\n|---:|---:|---:|---:|\n" +
    report.volumeFactorLinearDiagnostics.map((x) => "| " + x.factor + "× | " + f(x.unitPF) + " | " + x.closes + " | " + f(x.linearSizedReturnPoints, 1) + " |").join("\n") +
    "\n\nDefault coordinator extra factor is " + report.model.defaultCoordinatorVolumeFactor + "× normal; other combined-indication defaults are neutral at 1×. A multiplier scales losses and gains together and cannot improve PF. These points omit compounding, concurrent exposure, caps, funding and execution effects.\n\n" +
    "## Earlier-result comparison\n\n" +
    "| Current v2 cohort | Closes | PF | Net points | Active / green hours |\n|---|---:|---:|---:|---:|\n" +
    "| 36-protection sample, all ratios | " + report.comparison.currentSample.n + " | " + f(report.comparison.currentSample.pf) + " | " + f(report.comparison.currentSample.netPoints, 1) + " | " + report.comparison.currentSampleHourly.activeHours + " / " + f(report.comparison.currentSampleHourly.greenShare * 100, 1) + "% |\n" +
    "| Full runtime grid, all ratios | " + report.cohorts.isQualifiedPool.closed.n + " | " + f(report.cohorts.isQualifiedPool.closed.pf) + " | " + f(report.cohorts.isQualifiedPool.closed.netPoints, 1) + " | " + report.hourly.activeHours + " / " + f(report.hourly.greenShare * 100, 1) + "% |\n\n" +
    "The previous cumulative-threshold replay is not directly comparable with these v2 band results; its figures remain in the archived v1 report as historical reference only. The two current rows use identical selection rules and band semantics; the sample is a subset of the full runtime grid.\n\n" +
    "## Regression and limits\n\nThe runner asserts all ratio identities, band boundaries, complete runtime-grid count, sample membership, data hash, pair-level Base behavior, runtime Strategy Base/Last-N gates and IS/OOS boundaries. Empty qualified groups are rendered as N/A with rejection counts.\n\n" +
    "- The runner asserts all ratios, identities, complete runtime-grid count, baseline-sample membership, data hash and IS/OOS boundaries.\n" +
    "- This does not test venue fills, account-level position-stack reconciliation or live order handling. Existing offline accounting/position tests cover those code paths separately.\n" +
    "- No external orders were sent. Cached-market results do not establish future profitability, safe sizing or success in every hour.\n";
}

async function run() {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith("--")) args.set(process.argv[i].slice(2), process.argv[++i]);
  const protocol = JSON.parse(readFileSync(PROTOCOL, "utf8"));
  const cacheOptions = [
    resolve(root, protocol.data.cache),
    resolve(root, "../18f0ba5d9c08/CTS-A-O", protocol.data.cache),
  ];
  const cachePath = args.get("cache") ? resolve(args.get("cache")) : cacheOptions.find(existsSync);
  if (!cachePath) throw new Error("Pass --cache with the frozen market-cache.json file");
  const outDir = args.get("out") ? resolve(args.get("out")) : OUT;
  const raw = await readFile(cachePath);
  const marketData = JSON.parse(raw.toString("utf8"));
  const market = validateMarket(marketData, protocol);
  const cacheSha256 = hash(raw);
  if (cacheSha256 !== protocol.data.sha256) throw new Error("Frozen cache SHA-256 mismatch");
  const fixture = JSON.parse(await readFile(SAMPLE, "utf8"));
  const runtime = runtimeProtects();
  const runtimeKeys = new Set(runtime.map(protectKey));
  const normalProtects = runtime.filter((p) => p.trail === 0);
  const trailingProtects = runtime.filter((p) => p.trail > 0);
  if (runtime.length !== 2100 || normalProtects.length !== 750 || trailingProtects.length !== 1350 ||
      fixture.protects.length !== 36 || fixture.protects.some((p) => !runtimeKeys.has(protectKey(p))))
    throw new Error("Runtime protection grid or fixed sample changed");
  const combos = signalCombos(DEFAULT_SIGNALS, [15]).filter((x) => isSignalCoordinationInd(x.ind));
  if (SIGNAL_COORDINATION_RATIOS.length !== 5 || combos.length !== 15) throw new Error("Unexpected coordination matrix size");
  const pairs = combos.map((x) => {
    const parsed = parseSignalCoordinationId(x.ind);
    if (!parsed) throw new Error("Invalid coordinator ID " + x.ind);
    return { bot: x.bot, ind: x.ind, key: x.bot + "|" + x.ind, parsed, source: sourceKey(parsed) };
  });
  const pairSet = new Set(pairs.map((p) => p.key));
  const fullBars = [];
  const isBars = [];
  for (const sym of market.symbols) {
    const cs = marketData[sym];
    const full = trimThrough(barsFromCandles(sym, 15, resample(cs, 1, 15)), market.endT);
    full.lanes = [1, 5, 15, 30];
    fullBars.push(full);
    const beforeSplit = cs.filter((c) => c.t + 60_000 <= market.splitT);
    const prefix = trimThrough(barsFromCandles(sym, 15, resample(beforeSplit, 1, 15)), market.splitT);
    prefix.lanes = [1, 5, 15, 30];
    isBars.push(prefix);
  }
  const uIs = makeUniverse(isBars, market.isStartT);
  const uOos = makeUniverse(fullBars);
  if (uIs.bars.length !== market.symbols.length || uOos.bars.length !== market.symbols.length) throw new Error("Missing symbol bars");

  const gates = DEFAULT_SETTINGS.gates;
  const tags = [...new Set(runtime.map((p) => p.tag))];
  const rangeMinPf = Object.fromEntries(tags.map((tag) => [tag, minPfOf(gates, tag)]));
  const diagnostics = emptySignalHistDiagnostics();
  // Signals are discovered only when the representative pair itself passes the runtime Base gate. Keep every
  // identity in the replay for rejection diagnostics, but do not let a failed pair promote its protection grid.
  const pairBase = new Map();
  for (const pair of pairs) {
    const run = runCombo(uIs, pair.bot, pair.ind, DEFAULT_PROTECT, COST, 1, DEFAULT_TACTICS);
    pairBase.set(pair.key, !!run && passesBase(run.full, baseSetsGates(gates)));
  }
  const eligiblePairSet = new Set([...pairSet].filter((key) =>
    DEFAULT_SIGNALS.baseGate === false || pairBase.get(key),
  ));
  const histGen = signalHistProtectsGen(uIs, eligiblePairSet, DEFAULT_SIGNALS, DEFAULT_TACTICS, market.splitT, {
    cost: COST, minPf: gates.minPf, minTrades: gates.minTrades, maxDdr: gates.maxDdr, rangeMinPf,
  }, diagnostics);
  let histResult = histGen.next();
  while (!histResult.done) histResult = histGen.next();
  const historical = signalCoordinationHistory(histResult.value, pairSet, runtime);

  const rows = [];
  const strategyTapes = [];
  const sourceGroups = new Map();
  const all = blank(), allMarks = blank(), selected = blank(), selectedMarks = blank();
  const selectedByOrigin = { grid: blank(), historic: blank() };
  const byRange = { short: blank(), normal: blank(), long: blank() };
  const byStrategy = { normal: blank(), trailing: blank() };
  const hourly = new Map();
  const sampleHourly = new Map();
  const cooldown = tacticCooldown(DEFAULT_TACTICS);
  const wf = defaultWalkForward(DEFAULT_SETTINGS);
  const signalWf = wf;
  const selection = {
    evaluator: "runtime Strategy Base configEval at the IS cutoff",
    lastN: signalWf.signalValidLastN ?? signalWf.validLastN,
    minPfByRange: { short: rangeMinPf.sh, normal: rangeMinPf.gn, long: rangeMinPf.lg },
    maxDdr: gates.maxDdr,
    maxDdtH: gates.maxDdtH,
  };
  const rejection = (_x, _marks, _range, pairEligible, _configStats, _lastStats, configEvalResult) => {
    if (!pairEligible) return "basePair";
    if (!configEvalResult.ok) return `strategy-${configEvalResult.fail ?? "gate"}`;
    return null;
  };

  for (const pair of pairs) {
    const baselineProtects = new Set(fixture.protects.map(protectKey));
    const standard = runtime.map((p) => ({
      ...p,
      origin: baselineProtects.has(protectKey(p)) ? "grid-sample" : "grid-full",
    }));
    const hist = (historical[pair.key] ?? []).map((p) => ({ ...p, origin: "historic-mfe" }));
    const protections = [...standard, ...hist];
    const unique = new Map();
    for (const p of protections) {
      const key = configId(pair.bot, pair.ind, p);
      const existing = unique.get(key);
      if (!existing || (existing.origin === "historic-mfe" && p.origin !== "historic-mfe")) unique.set(key, p);
    }
    const pairEntries = market.symbols.map((_, s) => {
      const bIs = uIs.bars[s], bOos = uOos.bars[s];
      const isSignal = maskEntries(entryFor(pair, uIs.caches[s], bIs), bIs, market.isStartT);
      const oosSignal = maskEntries(entryFor(pair, uOos.caches[s], bOos), bOos, market.splitT);
      return {
        bIs, bOos,
        is: { 1: directionSignal(isSignal, 1), "-1": directionSignal(isSignal, -1) },
        oos: { 1: directionSignal(oosSignal, 1), "-1": directionSignal(oosSignal, -1) },
      };
    });
    const orderedEntries = symbolDirections(pairEntries, () => [1, -1]);
    for (const p of unique.values()) {
      const kind = protectKind(p);
      const range = p.tag === "sh" ? "short" : p.tag === "lg" ? "long" : "normal";
      const sideRows = [1, -1].map((side) => ({
        side,
        id: idOf(pair.bot, pair.ind, p, side),
        is: { closed: blank(), marks: blank(), openAtEnd: 0, trades: [] },
        oos: { closed: blank(), marks: blank(), openAtEnd: 0, hours: new Map() },
      }));
      const pooledIsTrades = [];
      for (const { symbol: signals, direction: side } of orderedEntries) {
        const { id, is, oos } = sideRows[side === 1 ? 0 : 1];
        const isResult = simulate(id, signals.bIs, signals.is[side], p, { cost: COST, cooldown });
        for (const tr of isResult.trades) {
          if (tr.entryT < market.isStartT || tr.exitT > market.splitT) throw new Error("IS boundary violation " + id);
          add(is.closed, tr.r);
          is.trades.push(tr);
          pooledIsTrades.push(tr);
        }
        if (isResult.open) { add(is.marks, isResult.open.mtm); is.openAtEnd++; }
        const oosResult = simulate(id, signals.bOos, signals.oos[side], p, { cost: COST, cooldown });
        for (const tr of oosResult.trades) {
          if (tr.entryT < market.splitT || tr.exitT > market.endT) throw new Error("OOS boundary violation " + id);
          add(oos.closed, tr.r);
          const hour = settledHourT(tr.exitT);
          add(oos.hours.get(hour) ?? oos.hours.set(hour, blank()).get(hour), tr.r);
        }
        if (oosResult.open) { add(oos.marks, oosResult.open.mtm); oos.openAtEnd++; }
      }
      pooledIsTrades.sort(compareTapeTrades);
      const configStats = baseStats(pooledIsTrades, market.splitT);
      const lastN = Math.min(selection.lastN, pooledIsTrades.length);
      const lastStats = baseStats(pooledIsTrades.slice(-lastN), market.splitT);
      const pairEligible = DEFAULT_SIGNALS.baseGate === false || pairBase.get(pair.key) === true;
      const configTape = makeTape(
        configId(pair.bot, pair.ind, p), pair.bot, pair.ind, p, kind, market.symbols,
        pooledIsTrades, [], [],
      );
      strategyTapes.push(configTape);
      const configEvalResult = configEval(configTape, market.splitT, signalWf);
      for (const { side, id, is, oos } of sideRows) {
        const isAll = merge({ ...is.closed }, is.marks);
        const oosAll = merge({ ...oos.closed }, oos.marks);
        const selectionRejection = rejection(is.closed, is.marks, range, pairEligible, configStats, lastStats, configEvalResult);
        const isQualified = selectionRejection === null;
        const row = {
          id, cfg: configId(pair.bot, pair.ind, p), ind: pair.ind, source: pair.source, ratio: pair.parsed.ratio,
          inputMask: pair.parsed.inputMask, range, kind, origin: p.origin, protect: { ...p }, side,
          basePairPassed: pairEligible,
          is: { closed: summary(is.closed), endpointMarks: summary(is.marks), openAtEnd: is.openAtEnd, withEndpointMarks: summary(isAll) },
          configIs: { closes: configStats.n, pf: configStats.pf, net: configStats.net, ddr: configStats.net > 0 ? configStats.mdd / configStats.net : null },
          lastN: { requested: selection.lastN, closes: lastStats.n, pf: lastStats.pf, net: lastStats.net, ddtH: lastStats.ddt, ddr: lastStats.net > 0 ? lastStats.mdd / lastStats.net : null },
          strategyBaseEval: {
            ok: configEvalResult.ok,
            fail: configEvalResult.ok ? null : configEvalResult.fail,
            n: configEvalResult.n,
            pf: configEvalResult.pf,
            net: configEvalResult.net,
            ddtH: configEvalResult.ddt,
            lcb: configEvalResult.lcb,
            greenShare: configEvalResult.gh,
          },
          oos: { closed: summary(oos.closed), endpointMarks: summary(oos.marks), openAtEnd: oos.openAtEnd, withEndpointMarks: summary(oosAll) },
          isQualified, selectionFloor: selection.minPfByRange[range], selectionRejection,
        };
        rows.push(row);
        merge(all, oos.closed); merge(allMarks, oos.marks);
        let group = sourceGroups.get(pair.source);
        if (!group) {
          group = { ratio: pair.parsed.ratio, inputMask: pair.parsed.inputMask, configSides: 0, qualified: 0, rejected: {}, all: blank(), allMarks: blank(), selected: blank(), selectedMarks: blank(), hours: new Map() };
          sourceGroups.set(pair.source, group);
        }
        group.configSides++; merge(group.all, oos.closed); merge(group.allMarks, oos.marks);
        if (!isQualified) group.rejected[selectionRejection] = (group.rejected[selectionRejection] ?? 0) + 1;
        if (isQualified) {
          group.qualified++; merge(group.selected, oos.closed); merge(group.selectedMarks, oos.marks);
          merge(selected, oos.closed); merge(selectedMarks, oos.marks);
          merge(selectedByOrigin[p.origin === "historic-mfe" ? "historic" : "grid"], oos.closed);
          merge(byRange[range], oos.closed); merge(byStrategy[kind], oos.closed);
          if (p.origin === "grid-sample")
            for (const [t, values] of oos.hours)
              merge(sampleHourly.get(t) ?? sampleHourly.set(t, blank()).get(t), values);
          for (const [t, values] of oos.hours) {
            merge(hourly.get(t) ?? hourly.set(t, blank()).get(t), values);
            merge(group.hours.get(t) ?? group.hours.set(t, blank()).get(t), values);
          }
        }
      }
    }
  }
  const fixedSelection = selectFixed(strategyTapes, market.splitT, signalWf);
  const evaluatedBasePasses = new Set(
    [...new Map(rows.map((row) => [row.cfg, row])).values()]
      .filter((row) => row.strategyBaseEval.ok)
      .map((row) => row.cfg),
  );
  const selectedBasePasses = new Set(fixedSelection.picks.map((pick) => pick.id));
  if (evaluatedBasePasses.size !== selectedBasePasses.size ||
      [...evaluatedBasePasses].some((id) => !selectedBasePasses.has(id)))
    throw new Error("configEval and runtime selectFixed disagree on Strategy Base eligibility");

  const expectedGridRows = pairs.length * runtime.length * 2;
  const actualGridRows = rows.filter((r) => r.origin !== "historic-mfe").length;
  if (actualGridRows !== expectedGridRows)
    throw new Error("Incomplete coordinator grid: expected " + expectedGridRows + " directional rows, got " + actualGridRows);
  if (sourceGroups.size !== 15 || new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("Coordinator grouping or config-side identity is incomplete");

  const groupRows = [...sourceGroups.entries()].sort(([, a], [, b]) =>
    a.ratio - b.ratio || a.inputMask - b.inputMask,
  ).map(([key, g]) => {
    const withMarks = merge({ ...g.selected }, g.selectedMarks);
    const hours = summarizeHours(g.hours);
    return {
      key, ratio: g.ratio, inputs: inputLabel(g.inputMask), configSides: g.configSides, qualified: g.qualified,
      rejected: g.rejected,
      allOos: summary(g.all), selectedOos: { ...summary(g.selected), pfWithMarks: summary(withMarks).pf },
      hourly: { activeHours: hours.activeHours, greenShare: hours.greenShare },
    };
  });
  const allWithMarks = merge({ ...all }, allMarks);
  const selectedWithMarks = merge({ ...selected }, selectedMarks);
  const hourlySummary = summarizeHours(hourly);
  const report = {
    schema: "cts-signal-coordination-band-replay-v5", generatedAt: new Date().toISOString(),
    market: { ...market, cacheSha256 },
    model: {
      sourceCount: selectedSourcesCount(), sourcePool: "DEFAULT_SIGNALS enabled sources",
      minSources: DEFAULT_SIGNALS.coordination.minSources, ratios: SIGNAL_COORDINATION_RATIOS,
      signalPairBaseGate: DEFAULT_SIGNALS.baseGate,
      laneMinutes: 15, cost: COST, selection,
      defaultCoordinatorVolumeFactor: DEFAULT_SIGNALS.coordination.volumeFactor,
      combinedVolumeFactors: DEFAULT_SIGNALS.combinedVolumeFactors,
      returnBasis: "unit close returns after modeled round-trip cost; independent overlapping config copies",
    },
    protectionGrid: {
      runtimeConfigs: runtime.length, baselineSample: fixture.protects.length, coordinatorIdentities: pairs.length,
      normalPerCoordinator: normalProtects.length, trailingPerCoordinator: trailingProtects.length,
      totalStandardProtectionIdentities: runtime.length * pairs.length,
      standardConfigSides: runtime.length * pairs.length * 2,
    },
    runtimeSelection: { configEvalPasses: evaluatedBasePasses.size, selectFixedPicks: selectedBasePasses.size },
    historyValidation: { minPf: gates.minPf, minTrades: gates.minTrades, maxDdr: gates.maxDdr, rangeMinPf },
    historical: { diagnostics, taggedConfigSides: rows.filter((r) => r.origin === "historic-mfe").length },
    configSideRows: rows.length, qualifiedConfigSides: rows.filter((r) => r.isQualified).length,
    qualifiedByOrigin: {
      grid: rows.filter((r) => r.isQualified && r.origin !== "historic-mfe").length,
      historic: rows.filter((r) => r.isQualified && r.origin === "historic-mfe").length,
    },
    cohorts: {
      allConfigsDiagnostic: { closed: summary(all), endpointMarks: summary(allMarks), withOpenMarks: summary(allWithMarks), openAtEnd: allMarks.n },
      isQualifiedPool: { closed: summary(selected), endpointMarks: summary(selectedMarks), withOpenMarks: summary(selectedWithMarks), openAtEnd: selectedMarks.n },
      byOrigin: { grid: summary(selectedByOrigin.grid), historic: summary(selectedByOrigin.historic) },
    },
    byRange: Object.fromEntries(Object.entries(byRange).map(([k, x]) => [k, summary(x)])),
    byStrategy: Object.fromEntries(Object.entries(byStrategy).map(([k, x]) => [k, summary(x)])),
    byStrategyAll: Object.fromEntries(["normal", "trailing"].map((kind) => {
      const total = blank();
      for (const row of rows) if (row.kind === kind) merge(total, row.oos.closed);
      return [kind, summary(total)];
    })),
    byDirection: Object.fromEntries([1, -1].map((side) => {
      const total = blank();
      for (const row of rows) if (row.side === side && row.isQualified) merge(total, row.oos.closed);
      return [side === 1 ? "long" : "short", summary(total)];
    })),
    hourly: { evaluatedHours: Math.ceil((market.endT - market.splitT) / HOUR), ...hourlySummary },
    ratioInputGroups: groupRows, rows,
    volumeFactorLinearDiagnostics: [1, DEFAULT_SIGNALS.coordination.volumeFactor, 22].filter((v, i, a) => a.indexOf(v) === i).map((factor) => ({
      factor, unitPF: summary(selected).pf, closes: selected.n, unitNetPoints: summary(selected).netPoints,
      linearSizedReturnPoints: round(summary(selected).netPoints * factor),
      meaning: "size-only diagnostic; no compounding, simultaneous portfolio, account caps or execution costs beyond the unit model",
    })),
    sourceFingerprint: await fingerprint(),
  };
  const previous = JSON.parse(await readFile(OLD_REPORT, "utf8"));
  const previousSummary = JSON.parse(await readFile(resolve(dirname(OLD_REPORT), "summary.json"), "utf8"));
  report.previousCompatibility = {
    comparable: false,
    reason: "previous report used cumulative v1 thresholds; current report uses disjoint v2 ratio bands",
    previousSchema: previous.selection?.schema ?? null,
  };
  const cohort = (test) => {
    const a = blank();
    for (const r of rows) if (r.isQualified && test(r)) merge(a, r.oos.closed);
    return summary(a);
  };
  report.comparison = {
    semanticsComparableToV1: false,
    currentSample: cohort((r) => r.origin === "grid-sample"),
    currentSampleHourly: summarizeHours(sampleHourly),
    previousV1Reference: {
      qualifiedOosByOrigin: previousSummary.qualifiedOosByOrigin,
      hourly: previousSummary.hourly,
      semantics: "cumulative thresholds; not directly comparable to v2 bands",
    },
  };
  const reportHash = hash(JSON.stringify(report));
  report.reportSha256 = reportHash;
  const snapshot = await publishReplayEvidence(outDir, report);
  await writeFile(resolve(snapshot.dir, "summary.json"), JSON.stringify({
    reportSha256: reportHash, cacheSha256, rows: report.configSideRows, qualified: report.qualifiedConfigSides,
    allOos: report.cohorts.allConfigsDiagnostic.closed, isQualifiedOos: report.cohorts.isQualifiedPool.closed,
    hourly: report.hourly, history: report.historical, previousCompatibility: report.previousCompatibility,
    ratioInputGroups: report.ratioInputGroups,
  }, null, 2) + "\n");
  const mdPath = resolve(root, "docs/sims/signals-coordination-trade-sim-20261017-expanded.md");
  await writeFile(mdPath, markdown(report));
  process.stdout.write(JSON.stringify({
    report: resolve(snapshot.dir, "report.json"), latest: resolve(outDir, "latest.json"), markdown: mdPath, rows: report.configSideRows,
    qualified: report.qualifiedConfigSides, allOos: report.cohorts.allConfigsDiagnostic.closed,
    selectedOos: report.cohorts.isQualifiedPool.closed, hourly: report.hourly,
    history: report.historical, previousCompatibility: report.previousCompatibility,
  }, null, 2) + "\n");
}

function selectedSourcesCount() {
  return SIGNAL_SOURCES.filter((s) => DEFAULT_SIGNALS.sourcesMode === "allow"
    ? DEFAULT_SIGNALS.sources[s.name] === true : DEFAULT_SIGNALS.sources[s.name] !== false).length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch((error) => { process.stderr.write(String(error?.stack ?? error) + "\n"); process.exitCode = 1; });
}
