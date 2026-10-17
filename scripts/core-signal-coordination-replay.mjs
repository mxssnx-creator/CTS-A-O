// Fixed-protocol offline validation of Signals Coordination.
// Reads a local frozen candle cache only; it does not access exchanges, accounts, settings stores, or order APIs.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { DEFAULT_SETTINGS, DEFAULT_TACTICS } from "../src/core/config.ts";
import { minPfOf } from "../src/core/minimal-coord.ts";
import { tacticCooldown } from "../src/core/indications/filters.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { filterEntries, protectGrid } from "../src/core/sim/walkforward.ts";
import { simulate } from "../src/core/sim/backtest.ts";
import { profitFactor } from "../src/core/metrics/stats.ts";
import { DEFAULT_SIGNALS, SIGNAL_SOURCES } from "../src/core/signal-config.ts";
import { isSignalCoordinationInd, parseSignalCoordinationId, signalCoordinationHistory, SIGNAL_COORDINATION_RATIOS } from "../src/core/signal-coordination.ts";
import { signalCombos } from "../src/core/signals.ts";
import { emptySignalHistDiagnostics, signalHistProtectsGen } from "../src/core/signal-hist.ts";
import { configId, makeUniverse, protectKind } from "../src/core/pipeline/pipeline.ts";

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
    pf: round(profitFactor(a.gp, a.gl)), winRate: a.n ? round(a.wins / a.n) : null,
  };
}
function closeTo(a, b) { return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9; }
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
  const g = DEFAULT_SETTINGS.grid;
  const r = DEFAULT_SIGNALS.coordination.ranges;
  return protectGrid(15, {
    ...g, tp: [], slOfTp: [], trailOfTp: [],
    short: r.short ? g.short : false, general: r.normal ? g.general : false, long: r.long ? g.long : false,
    minimal: false, micro: false, minimalPlus: false,
  }, COST).filter((p) => ["sh", "gn", "lg"].includes(p.tag));
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
    "src/core/sim/backtest.ts", "src/core/sim/walkforward.ts", "src/core/pipeline/pipeline.ts",
    "src/core/server/runtime.server.ts", "src/core/config.ts", "src/core/minimal-coord.ts",
    "src/core/domain/types.ts", "src/components/v2/pages/settings.tsx",
    "src/core/signal-hist.test.ts", "src/core/signal-coordination-feature.test.ts",
    "scripts/core-signal-coordination-replay.mjs", "scripts/data/signals-coordination-protection-sample.json",
  ];
  const hashes = [];
  for (const path of files) hashes.push([path, hash(await readFile(resolve(root, path)))]);
  return { sha256: hash(JSON.stringify(hashes)), files: hashes };
}
function comparePrevious(previous, rows) {
  const oldOos = new Map(previous.oos.filter((r) => r.origin === "grid-sample").map((r) => [r.id, r]));
  const oldIs = new Map(previous.is.filter((r) => r.origin === "grid-sample").map((r) => [r.id, r]));
  const current = new Map(rows.filter((r) => r.origin === "grid-sample").map((r) => [r.id, r]));
  let compared = 0;
  const mismatches = [];
  for (const [id, prev] of oldOos) {
    const cur = current.get(id);
    if (!cur) { mismatches.push({ id, reason: "missing" }); continue; }
    compared++;
    const old = oldIs.get(id);
    for (const [phase, a, b] of [["IS", old?.closed, cur.is.closed], ["OOS", prev.closed, cur.oos.closed]]) {
      if (!a || a.n !== b.n || !closeTo(a.pf, b.pf) || !closeTo(a.netReturnSum, b.netReturnSum))
        mismatches.push({ id, phase, old: a && { n: a.n, pf: a.pf, net: a.netReturnSum }, current: { n: b.n, pf: b.pf, net: b.netReturnSum } });
    }
  }
  return { previousStandardRows: oldOos.size, comparedRows: compared, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 20) };
}
function markdown(report) {
  const f = (x, d = 3) => Number(x).toFixed(d);
  const groups = report.ratioInputGroups.map((g) =>
    "| " + f(g.ratio * 100, 0) + "% | " + g.inputs + " | " + g.qualified + " / " + g.configSides +
    " | " + g.allOos.n + " · " + f(g.allOos.pf) + " · " + f(g.allOos.netPoints, 1) +
    " | " + g.selectedOos.n + " · " + f(g.selectedOos.pf) + " · " + f(g.selectedOos.netPoints, 1) +
    " · " + f(g.selectedOos.pfWithMarks) + " | " + g.hourly.activeHours + " / " + f(g.hourly.greenShare * 100, 1) + "% |"
  ).join("\n");
  const byTable = (o) => Object.entries(o).map(([k, x]) => "| " + k + " | " + x.n + " | " + f(x.pf) + " | " + f(x.netPoints, 1) + " |").join("\n");
  const all = report.cohorts.allConfigsDiagnostic;
  const selected = report.cohorts.isQualifiedPool;
  const h = report.historical;
  return "# Signals Coordination expanded offline replay\n\n" +
    "Run: " + report.generatedAt + ". Retrospective offline simulation on the same frozen candle cache as the 2026-10-17 baseline; it is not a forward or live-account result.\n\n" +
    "## Scope\n\n" +
    "- All nine ratios from 60% through 100% in 5-point steps × three independent Short / Medium / combined source-input masks; 63 enabled sources on the default 15-minute lane.\n" +
    "- " + report.configSideRows + " config-side rows across 27 coordinator identities, both directions, Short / Normal / Long exit tags, Normal / Trailing strategies, and historic configs that cleared IS gates.\n" +
    "- Full runtime grid: " + report.protectionGrid.runtimeConfigs + " protections per coordinator identity × " + report.protectionGrid.coordinatorIdentities + " identities = " + report.protectionGrid.totalStandardProtectionIdentities + " protection identities / " + report.protectionGrid.standardConfigSides + " directional config-side rows. The baseline's 36-protection sample remains a compatibility check.\n" +
    "- IS selection froze IDs before OOS: at least " + report.model.selection.minSettled + " settled closes, PF ≥ " + report.model.selection.minPf + ", positive net, and endpoint-marked PF ≥ " + report.model.selection.endpointMarkedMinPf + ". Historic candidates also clear their own range PF floor.\n" +
    "- Cost " + (report.model.cost * 100).toFixed(2) + "% round trip. PF uses gross-positive / absolute-gross-negative unit returns. Pooled results count overlapping independent configs and are not portfolio ROI or account orders.\n\n" +
    "Cache SHA-256: " + report.market.cacheSha256 + ". " + report.market.symbols.length + " symbols, IS " + iso(report.market.isStartT) + " through " + iso(report.market.splitT) + ", OOS through " + iso(report.market.endT) + ". The cache was already used for tactic research, so this evidence is retrospective.\n\n" +
    "## OOS by domination ratio and input mask\n\n" +
    "| Ratio | Inputs | IS-qualified / config sides | All configs: closes · PF · net points | Qualified: closes · PF · net points · PF with marks | Active / green hours |\n" +
    "|---:|---|---:|---:|---:|---:|\n" + groups + "\n\n" +
    "The 100% threshold requires unanimity of active, non-conflicting source votes; quiet sources abstain. The equality boundary is inclusive.\n\n" +
    "## Aggregate performance\n\n" +
    "| Cohort | Independent closes | PF | Net points | PF including endpoint marks | Net including marks |\n|---|---:|---:|---:|---:|---:|\n" +
    "| All configs | " + all.closed.n + " | " + f(all.closed.pf) + " | " + f(all.closed.netPoints, 1) + " | " + f(all.withOpenMarks.pf) + " | " + f(all.withOpenMarks.netPoints, 1) + " |\n" +
    "| IS-qualified pool | " + selected.closed.n + " | " + f(selected.closed.pf) + " | " + f(selected.closed.netPoints, 1) + " | " + f(selected.withOpenMarks.pf) + " | " + f(selected.withOpenMarks.netPoints, 1) + " |\n\n" +
    "### Exit range\n\n| Range | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byRange) +
    "\n\n### Strategy type\n\n| Type | Closes | PF | Net points |\n|---|---:|---:|---:|\n" + byTable(report.byStrategy) +
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
    "| Cohort | Previous run | Expanded full-grid run |\n|---|---:|---:|\n" +
    "| 60–80% baseline 36-protection sample | " + report.comparison.previousLegacyGrid.n + " closes · PF " + f(report.comparison.previousLegacyGrid.pf) + " · " + f(report.comparison.previousLegacyGrid.netPoints, 1) + " points | " + report.comparison.currentLegacyGrid.n + " closes · PF " + f(report.comparison.currentLegacyGrid.pf) + " · " + f(report.comparison.currentLegacyGrid.netPoints, 1) + " points |\n" +
    "| 60–80% full runtime grid | — | " + report.comparison.currentLegacyGridFull.n + " closes · PF " + f(report.comparison.currentLegacyGridFull.pf) + " · " + f(report.comparison.currentLegacyGridFull.netPoints, 1) + " points |\n" +
    "| 60–80% historic protections | " + report.comparison.previousLegacyHistoric.n + " closes · PF " + f(report.comparison.previousLegacyHistoric.pf) + " · " + f(report.comparison.previousLegacyHistoric.netPoints, 1) + " points | " + report.comparison.currentLegacyHistoric.n + " closes · PF " + f(report.comparison.currentLegacyHistoric.pf) + " · " + f(report.comparison.currentLegacyHistoric.netPoints, 1) + " points |\n" +
    "| Added 85–100% standard protections | — | " + report.comparison.addedGrid.n + " closes · PF " + f(report.comparison.addedGrid.pf) + " · " + f(report.comparison.addedGrid.netPoints, 1) + " points |\n" +
    "| Added 85–100% historic protections | — | " + report.comparison.addedHistoric.n + " closes · PF " + f(report.comparison.addedHistoric.pf) + " · " + f(report.comparison.addedHistoric.netPoints, 1) + " points |\n\n" +
    "The baseline's 1,080 standard config-side rows match exactly (zero count/PF/net mismatches). The historic pool is smaller at the old thresholds because each range now has to clear its own stage PF floor. For the old-ratio baseline sample, active-hour green share moved from " + f(report.comparison.previousHourly.greenShare * 100, 1) + "% (" + report.comparison.previousHourly.greenHours + "/" + report.comparison.previousHourly.activeHours + ") to " + f(report.comparison.currentLegacyHourly.greenShare * 100, 1) + "% (" + report.comparison.currentLegacyHourly.greenHours + "/" + report.comparison.currentLegacyHourly.activeHours + "). Across the full expanded grid it is " + f(report.comparison.currentHourly.greenShare * 100, 1) + "% (" + report.comparison.currentHourly.greenHours + "/" + report.comparison.currentHourly.activeHours + "); adding configs increased activity, not consistency.\n\n" +
    "## Regression and limits\n\nCompared to the previous standard sample: " + report.previousCompatibility.comparedRows + " of " +
    report.previousCompatibility.previousStandardRows + " config-side rows, " + report.previousCompatibility.mismatchCount + " mismatches. Historic rows may change because of the corrected per-range PF gates.\n\n" +
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
  if (runtime.length !== 1200 || fixture.protects.length !== 36 || fixture.protects.some((p) => !runtimeKeys.has(protectKey(p))))
    throw new Error("Runtime protection grid or fixed sample changed");
  const combos = signalCombos(DEFAULT_SIGNALS, [15]).filter((x) => isSignalCoordinationInd(x.ind));
  if (SIGNAL_COORDINATION_RATIOS.length !== 9 || combos.length !== 27) throw new Error("Unexpected coordination matrix size");
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
  const histGen = signalHistProtectsGen(uIs, pairSet, DEFAULT_SIGNALS, DEFAULT_TACTICS, market.splitT, {
    cost: COST, minPf: gates.minPf, minTrades: gates.minTrades, maxDdr: gates.maxDdr, rangeMinPf,
  }, diagnostics);
  let histResult = histGen.next();
  while (!histResult.done) histResult = histGen.next();
  const historical = signalCoordinationHistory(histResult.value, pairSet, runtime);

  const rows = [];
  const sourceGroups = new Map();
  const all = blank(), allMarks = blank(), selected = blank(), selectedMarks = blank();
  const selectedByOrigin = { grid: blank(), historic: blank() };
  const byRange = { short: blank(), normal: blank(), long: blank() };
  const byStrategy = { normal: blank(), trailing: blank() };
  const hourly = new Map();
  const legacyHourly = new Map();
  const cooldown = tacticCooldown(DEFAULT_TACTICS);
  const selection = { minSettled: 30, minPf: 1.1, endpointMarkedMinPf: 1.1 };
  const qualify = (x, marks) => x.n >= selection.minSettled && profitFactor(x.gp, x.gl) >= selection.minPf &&
    x.gp - x.gl > 0 && profitFactor(x.gp + marks.gp, x.gl + marks.gl) >= selection.endpointMarkedMinPf &&
    (x.gp - x.gl + marks.gp - marks.gl) > 0;

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
    for (const p of unique.values()) for (const side of [1, -1]) {
      const id = idOf(pair.bot, pair.ind, p, side);
      const kind = protectKind(p);
      const range = p.tag === "sh" ? "short" : p.tag === "lg" ? "long" : "normal";
      const is = { closed: blank(), marks: blank(), openAtEnd: 0 };
      const oos = { closed: blank(), marks: blank(), openAtEnd: 0, hours: new Map() };
      for (const signals of pairEntries) {
        const isResult = simulate(id, signals.bIs, signals.is[side], p, { cost: COST, cooldown });
        for (const tr of isResult.trades) {
          if (tr.entryT < market.isStartT || tr.exitT > market.splitT) throw new Error("IS boundary violation " + id);
          add(is.closed, tr.r);
        }
        if (isResult.open) { add(is.marks, isResult.open.mtm); is.openAtEnd++; }
        const oosResult = simulate(id, signals.bOos, signals.oos[side], p, { cost: COST, cooldown });
        for (const tr of oosResult.trades) {
          if (tr.entryT < market.splitT || tr.exitT > market.endT) throw new Error("OOS boundary violation " + id);
          add(oos.closed, tr.r);
          const hour = Math.floor(tr.exitT / HOUR) * HOUR;
          add(oos.hours.get(hour) ?? oos.hours.set(hour, blank()).get(hour), tr.r);
        }
        if (oosResult.open) { add(oos.marks, oosResult.open.mtm); oos.openAtEnd++; }
      }
      const isAll = merge({ ...is.closed }, is.marks);
      const oosAll = merge({ ...oos.closed }, oos.marks);
      const isQualified = qualify(is.closed, is.marks);
      const row = {
        id, cfg: configId(pair.bot, pair.ind, p), ind: pair.ind, source: pair.source, ratio: pair.parsed.ratio,
        inputMask: pair.parsed.inputMask, range, kind, origin: p.origin, protect: { ...p }, side,
        is: { closed: summary(is.closed), endpointMarks: summary(is.marks), openAtEnd: is.openAtEnd, withEndpointMarks: summary(isAll) },
        oos: { closed: summary(oos.closed), endpointMarks: summary(oos.marks), openAtEnd: oos.openAtEnd, withEndpointMarks: summary(oosAll) },
        isQualified,
      };
      rows.push(row);
      merge(all, oos.closed); merge(allMarks, oos.marks);
      let group = sourceGroups.get(pair.source);
      if (!group) {
        group = { ratio: pair.parsed.ratio, inputMask: pair.parsed.inputMask, configSides: 0, qualified: 0, all: blank(), allMarks: blank(), selected: blank(), selectedMarks: blank(), hours: new Map() };
        sourceGroups.set(pair.source, group);
      }
      group.configSides++; merge(group.all, oos.closed); merge(group.allMarks, oos.marks);
      if (isQualified) {
        group.qualified++; merge(group.selected, oos.closed); merge(group.selectedMarks, oos.marks);
        merge(selected, oos.closed); merge(selectedMarks, oos.marks);
        merge(selectedByOrigin[p.origin === "historic-mfe" ? "historic" : "grid"], oos.closed);
        merge(byRange[range], oos.closed); merge(byStrategy[kind], oos.closed);
        for (const [t, values] of oos.hours) {
          merge(hourly.get(t) ?? hourly.set(t, blank()).get(t), values);
          merge(group.hours.get(t) ?? group.hours.set(t, blank()).get(t), values);
          if (pair.parsed.ratio <= 0.8)
            merge(legacyHourly.get(t) ?? legacyHourly.set(t, blank()).get(t), values);
        }
      }
    }
  }
  const expectedGridRows = pairs.length * runtime.length * 2;
  const actualGridRows = rows.filter((r) => r.origin !== "historic-mfe").length;
  if (actualGridRows !== expectedGridRows)
    throw new Error("Incomplete coordinator grid: expected " + expectedGridRows + " directional rows, got " + actualGridRows);
  if (sourceGroups.size !== 27 || new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("Coordinator grouping or config-side identity is incomplete");

  const groupRows = [...sourceGroups.entries()].sort(([, a], [, b]) =>
    a.ratio - b.ratio || a.inputMask - b.inputMask,
  ).map(([key, g]) => {
    const withMarks = merge({ ...g.selected }, g.selectedMarks);
    const hours = summarizeHours(g.hours);
    return {
      key, ratio: g.ratio, inputs: inputLabel(g.inputMask), configSides: g.configSides, qualified: g.qualified,
      allOos: summary(g.all), selectedOos: { ...summary(g.selected), pfWithMarks: summary(withMarks).pf },
      hourly: { activeHours: hours.activeHours, greenShare: hours.greenShare },
    };
  });
  const allWithMarks = merge({ ...all }, allMarks);
  const selectedWithMarks = merge({ ...selected }, selectedMarks);
  const hourlySummary = summarizeHours(hourly);
  const report = {
    schema: "cts-signal-coordination-expanded-replay-v1", generatedAt: new Date().toISOString(),
    market: { ...market, cacheSha256 },
    model: {
      sourceCount: selectedSourcesCount(), sourcePool: "DEFAULT_SIGNALS enabled sources",
      minSources: DEFAULT_SIGNALS.coordination.minSources, ratios: SIGNAL_COORDINATION_RATIOS,
      laneMinutes: 15, cost: COST, selection,
      defaultCoordinatorVolumeFactor: DEFAULT_SIGNALS.coordination.volumeFactor,
      combinedVolumeFactors: DEFAULT_SIGNALS.combinedVolumeFactors,
      returnBasis: "unit close returns after modeled round-trip cost; independent overlapping config copies",
    },
    protectionGrid: {
      runtimeConfigs: runtime.length, baselineSample: fixture.protects.length, coordinatorIdentities: pairs.length,
      totalStandardProtectionIdentities: runtime.length * pairs.length,
      standardConfigSides: runtime.length * pairs.length * 2,
    },
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
  report.previousCompatibility = comparePrevious(previous, rows);
  const cohort = (test) => {
    const a = blank();
    for (const r of rows) if (r.isQualified && test(r)) merge(a, r.oos.closed);
    return summary(a);
  };
  report.comparison = {
    previousLegacyGrid: previousSummary.qualifiedOosByOrigin.grid,
    previousLegacyHistoric: previousSummary.qualifiedOosByOrigin.historic,
    currentLegacyGrid: cohort((r) => r.origin === "grid-sample" && r.ratio <= 0.8),
    currentLegacyGridFull: cohort((r) => r.origin !== "historic-mfe" && r.ratio <= 0.8),
    currentLegacyHistoric: cohort((r) => r.origin === "historic-mfe" && r.ratio <= 0.8),
    addedGrid: cohort((r) => r.origin !== "historic-mfe" && r.ratio > 0.8),
    addedHistoric: cohort((r) => r.origin === "historic-mfe" && r.ratio > 0.8),
    previousHourly: previousSummary.hourly,
    currentLegacyHourly: summarizeHours(legacyHourly),
    currentHourly: report.hourly,
  };
  const reportHash = hash(JSON.stringify(report));
  report.reportSha256 = reportHash;
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(resolve(outDir, "summary.json"), JSON.stringify({
    reportSha256: reportHash, cacheSha256, rows: report.configSideRows, qualified: report.qualifiedConfigSides,
    allOos: report.cohorts.allConfigsDiagnostic.closed, isQualifiedOos: report.cohorts.isQualifiedPool.closed,
    hourly: report.hourly, history: report.historical, previousCompatibility: report.previousCompatibility,
    ratioInputGroups: report.ratioInputGroups,
  }, null, 2) + "\n");
  const mdPath = resolve(root, "docs/sims/signals-coordination-trade-sim-20261017-expanded.md");
  await writeFile(mdPath, markdown(report));
  process.stdout.write(JSON.stringify({
    report: resolve(outDir, "report.json"), markdown: mdPath, rows: report.configSideRows,
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
