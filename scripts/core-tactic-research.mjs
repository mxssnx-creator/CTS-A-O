// Offline, bounded Tactic validation. No connections, settings, orders or promotions are read or written.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { TACTIC_TECHNIQUES, tacticSnapshot } from "../src/core/indications/tactic.ts";
import { indicationState } from "../src/core/indications/registry.ts";
import { comboSignal, entrySignal } from "../src/core/bots/bots.ts";
import { tacticCooldown, tacticKeyFor } from "../src/core/indications/filters.ts";
import { bothSides, simulate } from "../src/core/sim/backtest.ts";
import { profitFactor, statsOf } from "../src/core/metrics/stats.ts";
import { DEFAULT_TACTICS, PF_NO_LOSS } from "../src/core/config.ts";

export const COST = 0.002;
export const LANES = Object.freeze([
  { tf: 1, combined: false }, { tf: 1, combined: true },
  { tf: 5, combined: false }, { tf: 5, combined: true },
  { tf: 15, combined: false }, { tf: 15, combined: true },
  { tf: 30, combined: false },
]);
export const SCREEN = Object.freeze({ minClosed: 30, minPf: 1.1 });
export const sha256 = (x) => createHash("sha256").update(x).digest("hex");
const iso = (t) => new Date(t).toISOString();
const order = (a, b) => a.exitT - b.exitT || a.entryT - b.entryT || String(a.cfg ?? "").localeCompare(String(b.cfg ?? "")) || String(a.sym ?? "").localeCompare(String(b.sym ?? "")) || (a.side ?? 0) - (b.side ?? 0);

export function protectGrid(tf) {
  const out = [];
  for (const tp of [0.006, 0.012, 0.024]) for (const ratio of [0.75, 1.5])
    for (const trailing of [false, true]) for (const hours of [2, 8]) {
      const id = `tp${tp}_sl${ratio}_tr${trailing ? 0.5 : 0}_h${hours}`;
      out.push({ id, tp, sl: tp * ratio, trail: trailing ? tp * 0.5 : 0, hold: hours * 60 / tf });
    }
  return out;
}

export function researchGroups() {
  return TACTIC_TECHNIQUES.flatMap(({ id: technique }) => ["short", "medium"].flatMap((range) =>
    LANES.map(({ tf, combined }) => ({ technique, range, tf, combined,
      id: `tactic-${technique}-${range === "short" ? "s" : "m"}@m${tf}${combined ? "c" : ""}`,
    }))));
}

export function researchMode(id = "default", groups = researchGroups()) {
  if (!["default", "raw"].includes(id)) throw new Error(`Unknown research mode: ${id}`);
  const tactics = id === "default" ? { ...DEFAULT_TACTICS } : null;
  return { id, label: id === "default" ? "Current default entry filters" : "Raw onset diagnostic",
    signalFunction: id === "default" ? "entrySignal(follow, indication, cache, DEFAULT_TACTICS)" : "comboSignal(follow, indication, cache)",
    tactics, cooldownBars: tacticCooldown(tactics),
    effectiveFilterKeys: Object.fromEntries(groups.map((g) => [g.id, tacticKeyFor(tactics, g.id.split("@")[0])])) };
}

export function researchSignal(group, k, mode) {
  const signal = mode.id === "default" ? entrySignal("follow", group.id, k, mode.tactics) : comboSignal("follow", group.id, k);
  if (!signal) throw new Error(`Missing signal: ${group.id}`);
  return signal;
}

/** Reject gaps rather than allowing a closed-bar signal to enter after an unknown interval. */
export function validateMarket(market) {
  const symbols = Object.keys(market).sort();
  if (!symbols.length) throw new Error("Empty market cache");
  let startT, endT, total = 0;
  const counts = {};
  for (const sym of symbols) {
    const cs = market[sym];
    if (!Array.isArray(cs) || cs.length < 2) throw new Error(`${sym}: insufficient candles`);
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (![c.t, c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) || c.t % 60_000 !== 0 ||
        c.l <= 0 || c.h < Math.max(c.o, c.c) || c.l > Math.min(c.o, c.c) || c.v < 0)
        throw new Error(`${sym}: invalid closed 1m candle ${i}`);
      if (i && c.t !== cs[i - 1].t + 60_000) throw new Error(`${sym}: gap or duplicate at ${i}`);
    }
    const a = cs[0].t, z = cs.at(-1).t + 60_000;
    if (startT !== undefined && (a !== startT || z !== endT)) throw new Error(`${sym}: unequal source window`);
    startT = a; endT = z; counts[sym] = cs.length; total += cs.length;
  }
  return { symbols, startT, endT, start: iso(startT), endExclusive: iso(endT), totalCandles: total, counts, gaps: 0 };
}

/** All r values are net notional-return fractions, never cash-weighted P&L. */
export function summarize(input, endT) {
  const trades = [...input].sort(order);
  let returnGp = 0, returnGl = 0, firstEntryT = Infinity;
  for (const t of trades) {
    if (!Number.isFinite(t.r) || !Number.isFinite(t.entryT) || !Number.isFinite(t.exitT)) throw new Error("Invalid return sample");
    if (t.r > 0) returnGp += t.r; else returnGl -= t.r;
    firstEntryT = Math.min(firstEntryT, t.entryT);
  }
  const s = statsOf(trades, endT);
  return { n: trades.length, wins: s.wins, losses: s.losses, pf: profitFactor(returnGp, returnGl),
    pfBasis: "net-return-per-simulated-settled-close", pfConvention: `shared profitFactor; wins without losses use sentinel ${PF_NO_LOSS}`,
    returnGp, returnGl, noLoss: returnGp > 0 && returnGl === 0,
    exactRatio: returnGl > 0 ? returnGp / returnGl : null,
    netReturnSum: returnGp - returnGl, netReturnPoints: s.net, mddReturnPoints: s.mdd,
    maxDrawdownHours: s.ddt, winRate: s.wr, firstEntryT: trades.length ? firstEntryT : null,
    firstExitT: trades.length ? trades[0].exitT : null, lastExitT: trades.length ? trades.at(-1).exitT : null,
    tradeHash: sha256(JSON.stringify(trades.map((t) => [t.cfg, t.sym, t.side, t.entryT, t.exitT, t.r, t.reason]))),
  };
}

const markedSummary = (trades, marks, endT) => ({ ...summarize([...trades, ...marks], endT),
  pfBasis: "net-return-settled-plus-endpoint-open-marks" });

export function qualifies(closed, marked, screen = SCREEN) {
  return closed.n >= screen.minClosed && closed.pf >= screen.minPf && closed.netReturnSum > 0 &&
    marked.pf >= screen.minPf && marked.netReturnSum > 0;
}

/** Selection consumes IS summaries only. An unqualified winner remains a diagnostic, never a promotion. */
export function selectIS(rows, screen = SCREEN) {
  const tagged = rows.map((r) => ({ ...r, isQualified: qualifies(r.closed, r.withOpenMarks, screen) }));
  tagged.sort((a, b) => Number(b.isQualified) - Number(a.isQualified) ||
    b.withOpenMarks.netReturnSum - a.withOpenMarks.netReturnSum || b.closed.netReturnSum - a.closed.netReturnSum ||
    b.closed.n - a.closed.n || a.configId.localeCompare(b.configId));
  if (!tagged.length) throw new Error("Empty IS search");
  return tagged[0];
}

export function cacheFor(sym, candles, tf) {
  const b = barsFromCandles(sym, tf, tf === 1 ? candles : resample(candles, 1, tf));
  b.lanes = [1, 5, 15, 30];
  return new SeriesCache(b);
}

/** Fresh OOS positions, with past context. Only a next-open entry at/after split can enter. */
export function maskEntries(sig, bars, splitT) {
  const out = new Int8Array(sig.length);
  for (let i = 0; i + 1 < sig.length; i++) if (bars.t[i + 1] >= splitT) out[i] = sig[i];
  return out;
}

function runCell(k, group, protect, splitT, endT, mode, context = false) {
  const id = `${mode.id}|${group.id}|${protect.id}`;
  const raw = researchSignal(group, k, mode);
  const signal = splitT === null ? raw : maskEntries(raw, k.b, splitT);
  const trades = [], marks = [];
  for (const sim of bothSides(signal, (s) => simulate(id, k.b, s, protect, { cost: COST, cooldown: mode.cooldownBars }))) {
    trades.push(...sim.trades);
    if (sim.open) marks.push({ cfg: id, sym: k.b.sym, side: sim.open.side, entryT: sim.open.entryT, exitT: endT, r: sim.open.mtm, reason: "endpoint-mark-open" });
  }
  if (context) {
    const index = new Map(Array.from(k.b.t, (t, i) => [t, i]));
    for (const t of trades) {
      const snap = tacticSnapshot(k, group.range, index.get(t.entryT) - 1);
      t.context = { regime: snap.regime, volatility: snap.volatility.state,
        trendAlignment: snap.trend === 0 ? "neutral" : snap.trend === t.side ? "aligned" : "opposed",
        adaptiveMethod: snap.adaptiveMethod, direction: t.side > 0 ? "long" : "short", symbol: t.sym };
    }
  }
  return { trades, marks };
}

export function contextBreakdown(trades, endT) {
  const out = {};
  for (const dim of ["regime", "volatility", "trendAlignment", "adaptiveMethod", "direction", "symbol"]) {
    const buckets = new Map();
    for (const t of trades) { const key = t.context[dim]; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(t); }
    out[dim] = Object.fromEntries([...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([key, ts]) => [key, summarize(ts, endT)]));
  }
  return out;
}

/** Two physical phases: the IS loop has only prefix candles. No holdout summary is available to selection. */
export function runResearch(market, { splitT, groups = researchGroups(), grid = protectGrid, screen = SCREEN, mode: modeId = "default", onProgress = () => {} } = {}) {
  const mode = researchMode(modeId, groups);
  const data = validateMarket(market);
  splitT ??= Math.floor((data.startT + data.endT) / 120_000) * 60_000;
  if (!Number.isInteger(splitT / 60_000) || splitT <= data.startT || splitT >= data.endT) throw new Error("Split must be a minute inside the source window");
  const prefix = Object.fromEntries(data.symbols.map((s) => [s, market[s].filter((c) => c.t + 60_000 <= splitT)]));
  const chosen = [], isCandidates = [];
  let dedupChecks = 0;
  for (const group of groups) {
    const cells = grid(group.tf).map((protect) => ({ protect, trades: [], marks: [] }));
    if (!cells.length) throw new Error("Empty protect grid");
    for (const sym of data.symbols) {
      const k = cacheFor(sym, prefix[sym], group.tf);
      if (group.tf === 30 && !group.combined) {
        const normal = indicationState(group.id, k), combined = indicationState(`${group.id}c`, k);
        if (normal.some((s, i) => s !== combined[i])) throw new Error("30m combined is not equivalent");
        dedupChecks++;
      }
      for (const cell of cells) { const r = runCell(k, group, cell.protect, null, splitT, mode); cell.trades.push(...r.trades); cell.marks.push(...r.marks); }
      k.clear();
    }
    const rows = cells.map((cell) => ({ groupId: group.id, configId: `${mode.id}|${group.id}|${cell.protect.id}`, protect: cell.protect,
      closed: summarize(cell.trades, splitT), openAtEnd: cell.marks.length, withOpenMarks: markedSummary(cell.trades, cell.marks, splitT) }));
    const selected = selectIS(rows, screen);
    isCandidates.push(...rows.map((r) => ({ ...r, isQualified: qualifies(r.closed, r.withOpenMarks, screen) })));
    chosen.push({ group, selected });
    onProgress(`IS ${chosen.length}/${groups.length}: ${group.id}`);
  }
  // Chosen IDs are frozen before this first access to full-window indicator series.
  const selectedIds = chosen.map((c) => c.selected.configId);
  const allTrades = [], allMarks = [], qualifiedTrades = [], qualifiedMarks = [], results = [];
  for (const { group, selected } of chosen) {
    const trades = [], marks = [];
    for (const sym of data.symbols) {
      const k = cacheFor(sym, market[sym], group.tf);
      const r = runCell(k, group, selected.protect, splitT, data.endT, mode, true);
      // This is an invariant, not a filter: an invalid sample fails validation.
      for (const t of [...r.trades, ...r.marks]) if (t.entryT < splitT || t.exitT > data.endT || t.exitT < t.entryT) throw new Error("OOS boundary violation");
      trades.push(...r.trades); marks.push(...r.marks); k.clear();
    }
    const closed = summarize(trades, data.endT), withOpenMarks = markedSummary(trades, marks, data.endT);
    results.push({ ...group, configId: selected.configId, protect: selected.protect, isQualified: selected.isQualified,
      is: { closed: selected.closed, withOpenMarks: selected.withOpenMarks, openAtEnd: selected.openAtEnd },
      oos: { closed, withOpenMarks, openAtEnd: marks.length, meetsDiagnosticScreen: qualifies(closed, withOpenMarks, screen),
        context: contextBreakdown(trades, data.endT) } });
    allTrades.push(...trades); allMarks.push(...marks);
    if (selected.isQualified) { qualifiedTrades.push(...trades); qualifiedMarks.push(...marks); }
    onProgress(`OOS ${results.length}/${groups.length}: ${group.id}`);
  }
  const pool = (ts, ms) => ({ closed: summarize(ts, data.endT), openAtEnd: ms.length, withOpenMarks: markedSummary(ts, ms, data.endT), context: contextBreakdown(ts, data.endT) });
  return { schema: "cts-tactic-research-v1", data: { ...data, splitT, split: iso(splitT),
      isSourceCandles: Object.values(prefix).reduce((s, cs) => s + cs.length, 0) },
    protocol: { mode, bot: "follow", cost: COST, costBasis: "static roundtrip notional return deduction; 0.1% per side; no separate funding or extra slippage model",
      direction: "long and short independent", screen, selection: "IS-qualified first, then highest IS endpoint-marked net-return sum; closed net, sample count and ID break ties",
      oosPolicy: "fresh flat slots; full causal prior context; next-open entry >= split; settled exit <= endpoint",
      noLossSentinel: PF_NO_LOSS, marks: "open positions marked at final completed close with full modeled roundtrip cost; not settled closes",
      scope: "bounded grid; no claim of global optimum, live profitability, capital-constrained portfolio or statistically independent copies",
      groups: groups.length, candidates: isCandidates.length, protectCellsPerGroup: [...new Set(groups.map((g) => grid(g.tf).length))],
      deduplicated: "30m combined equals 30m independent because no higher lane exists; evaluated once", dedupChecks },
    selectionHash: sha256(JSON.stringify(selectedIds)), selectedIds, isCandidates,
    qualifiedGroups: results.filter((r) => r.isQualified).length,
    oosScreenGroups: results.filter((r) => r.oos.meetsDiagnosticScreen).length,
    all70DiagnosticPool: pool(allTrades, allMarks), isQualifiedSelectedPool: pool(qualifiedTrades, qualifiedMarks), results };
}

const fmt = (x, n = 3) => Number(x).toFixed(n);
const pf = (s) => s.noLoss ? `${fmt(s.pf)}*` : fmt(s.pf);
export function renderMarkdown(report, reportHash, paths = {}) {
  const p = report.protocol, d = report.data;
  const poolRow = (label, x) => `| ${label} | ${x.closed.n} | ${pf(x.closed)} | ${fmt(x.closed.netReturnPoints)} | ${fmt(x.closed.mddReturnPoints)} | ${x.openAtEnd} | ${pf(x.withOpenMarks)} | ${fmt(x.withOpenMarks.netReturnPoints)} |`;
  const modeText = `Primary mode: **${p.mode.label}**, using \`${p.mode.signalFunction}\`. Exact tactics: \`${JSON.stringify(p.mode.tactics)}\`; effective cooldown ${p.mode.cooldownBars} bars. Effective per-indication filter keys are retained in JSON, including the existing low-ADX exemption for mean reversion and adaptive. ${p.mode.id === "default" ? "This reproduces the default entry filters and cooldown with the disclosed research protects; it does not reproduce full runtime account coordination, stage gates or position sizing." : "This is an unfiltered onset diagnostic; it does not reproduce the default entry filters or full runtime account coordination, stage gates or position sizing."} The raw onset study cannot establish default-system performance.\n\n`;
  const command = `node --experimental-strip-types --no-warnings --max-old-space-size=768 scripts/core-tactic-research.mjs --mode ${report.cliMode ?? p.mode.id} --cache ${paths.cache ?? "runs/research-market-20261014/market-cache.json"} --split ${d.split} --out ${paths.out ?? "runs/tactic-research-20261014/report.json"} --markdown ${paths.markdown ?? "docs/tactic-validation.md"}`;
  const rawText = report.rawDiagnostic ? `\n## Separate raw onset diagnostic\n\nThis second mode uses comboSignal without DEFAULT_TACTICS and independently selects its own ${report.rawDiagnostic.protocol.candidates} IS cells with the same PF ≥${report.rawDiagnostic.protocol.screen.minPf} protocol. It is not mixed into the primary mode or chosen on OOS performance. ${report.rawDiagnostic.qualifiedGroups}/${report.rawDiagnostic.protocol.groups} raw groups qualify in IS.\n\n| Raw OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${poolRow("All raw selected groups (diagnostic)", report.rawDiagnostic.all70DiagnosticPool)}\n${poolRow("Raw IS-qualified selected groups", report.rawDiagnostic.isQualifiedSelectedPool)}\n\nRaw selected IDs, all cells, all70 group outcomes, context and trade hashes are separate under rawDiagnostic in JSON. Neither mode is selected or retuned on its OOS result.\n` : "";
  return `# Tactic held-out validation\n\nOffline simulation of the first-class Tactic indication family. No orders, promotions or settings changes. These results do not establish live profitability.\n\n${modeText}Source: ${d.symbols.join(", ")}; ${d.totalCandles.toLocaleString("en-US")} completed 1m candles, ${d.start} to ${d.endExclusive} exclusive, ${d.gaps} gaps. Chronological split: **${d.split}**. IS has ${d.isSourceCandles.toLocaleString("en-US")} source candles; OOS starts with fresh flat positions and warmed causal context.\n\n${p.groups} distinct technique/range/lane groups; ${p.candidates} IS protect candidates; ${p.protectCellsPerGroup.join("/")} protect cells per group. The five techniques each have short and medium ranges. Lanes are independent and combined 1/5/15m plus independent 30m; 30m combined is identical and counted once. Follow entries use state onsets; long and short slots run independently.\n\nThe frozen grid is TP 0.6/1.2/2.4%, stop 0.75/1.5× TP, trailing disabled or 0.5× TP, hold 2/8 hours (24 cells). Hold periods use equal wall time; these explicit distances are not lane-scaled. Every settled or endpoint-marked return deducts **0.2% roundtrip cost** (0.1% per side). This is a static cost model; actual commissions, funding, execution slippage and capital/margin constraints are not reproduced. Closed signals enter at the next bar open; stops precede targets when both occur within a bar, and completed-bar trailing updates apply to the next bar. Source gaps fail validation.\n\nSelection reads only physically truncated IS candles. It first considers configurations with at least ${p.screen.minClosed} IS settled closes, return PF ≥${p.screen.minPf} and positive net returns both closed and including endpoint open marks, then ranks by IS net-return sum including those marks (ties: closed net, sample count, ID). A group without a qualifying cell keeps an explicitly unqualified diagnostic winner. All selected IDs freeze before OOS evaluation. **${report.qualifiedGroups}/${p.groups} groups qualified in IS**; **${report.oosScreenGroups}/${p.groups} diagnostic OOS groups meet the same screen**. OOS results never select pool membership.\n\nPrimary PF uses the shared return-based profitFactor helper. Gross positive/negative net-return sums and exact finite ratios are retained in JSON. A starred PF uses the existing no-loss sentinel ${p.noLossSentinel}, not an exact measured ratio; no-loss exactRatio is null. Net and drawdown below are sums of per-trade return **percentage points**, not account ROI or account drawdown. Open marks include the modeled roundtrip cost and are shown separately from settled-close PF. Pools combine overlapping independent configuration copies and are not an executable account portfolio.\n\n| OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${poolRow("All selected groups (diagnostic)", report.all70DiagnosticPool)}\n${poolRow("IS-qualified selected groups only", report.isQualifiedSelectedPool)}\n\n| Technique/range/lane | IS qualified | IS closes | IS return PF | OOS closes | OOS return PF | OOS net points | OOS DD points | Opens | OOS PF incl. marks | OOS screen |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n${report.results.map((r) => `| ${r.id} | ${r.isQualified ? "yes" : "no"} | ${r.is.closed.n} | ${pf(r.is.closed)} | ${r.oos.closed.n} | ${pf(r.oos.closed)} | ${fmt(r.oos.closed.netReturnPoints)} | ${fmt(r.oos.closed.mddReturnPoints)} | ${r.oos.openAtEnd} | ${pf(r.oos.withOpenMarks)} | ${r.oos.meetsDiagnosticScreen ? "pass" : "fail"} |`).join("\n")}\n\n${rawText}\nContext breakdowns in JSON attribute each OOS settled close to the technique's completed signal-bar regime, volatility band, trend alignment, adaptive method, direction and symbol. These are post-selection diagnostics, not further filters. Combined-lane contexts describe the base lane; higher-lane agreement is part of the signal pipeline. All IS cells, selected protects, counts, return sums, drawdowns, trade hashes and entry/exit bounds are retained in the reproducible JSON. No parameter or technique is claimed to be best outside this source window and symbol sample and disclosed grid.\n\nReproduce from the repository root:\n\n\`\`\`sh\n${command}\nnode --experimental-strip-types --no-warnings --test scripts/core-tactic-research.test.mjs\n\`\`\`\n\nCache SHA256: \`${report.evidence?.cacheSha256 ?? "not provided"}\`. Source fingerprint: \`${report.evidence?.sourceSha256 ?? "not provided"}\`. Selection SHA256: \`${report.selectionHash}\`. Deterministic report SHA256: \`${reportHash}\`. Raw market and generated JSON remain outside Git; the command regenerates them from the stated cache. The runner uses no network or account access.\n`;
}

async function sourceEvidence() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const files = [];
  async function walk(dir) {
    for (const f of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(dir, f.name);
      if (f.isDirectory()) await walk(path); else if (f.name.endsWith(".ts") && !f.name.endsWith(".test.ts")) files.push(path);
    }
  }
  await walk(resolve(root, "src/core"));
  files.push(fileURLToPath(import.meta.url));
  const hashes = [];
  for (const path of files.sort()) hashes.push([relative(root, path), sha256(await readFile(path))]);
  return { sourceSha256: sha256(JSON.stringify(hashes)), sourceFiles: hashes };
}

async function main() {
  const started = performance.now();
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--cache", "--out", "--markdown", "--split", "--mode"].includes(args[i]) || !args[i + 1]) throw new Error("Usage: --cache path --out path [--markdown path] [--split ISO] [--mode both|default|raw]");
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options.cache || !options.out) throw new Error("--cache and --out are required");
  const mode = options.mode ?? "both";
  if (!["both", "default", "raw"].includes(mode)) throw new Error("Mode must be both, default or raw");
  const sourcesBefore = await sourceEvidence();
  const raw = await readFile(resolve(options.cache));
  const market = JSON.parse(raw);
  const run = (id) => runResearch(market, { mode: id, splitT: options.split ? Date.parse(options.split) : undefined,
    onProgress: (message) => process.stderr.write(`${id}: ${message}\n`) });
  const report = run(mode === "raw" ? "raw" : "default");
  if (mode === "both") report.rawDiagnostic = run("raw");
  report.cliMode = mode;
  const sourcesAfter = await sourceEvidence();
  if (sourcesBefore.sourceSha256 !== sourcesAfter.sourceSha256) throw new Error("Sources changed during research; rerun on frozen code");
  report.evidence = { cacheSha256: sha256(raw), cacheBytes: raw.length, ...sourcesBefore };
  const json = `${JSON.stringify(report, null, 2)}\n`, hash = sha256(json);
  await mkdir(dirname(resolve(options.out)), { recursive: true });
  await writeFile(resolve(options.out), json);
  if (options.markdown) { await mkdir(dirname(resolve(options.markdown)), { recursive: true }); await writeFile(resolve(options.markdown), renderMarkdown(report, hash, options)); }
  process.stdout.write(`${JSON.stringify({ reportSha256: hash, selectionHash: report.selectionHash, qualifiedGroups: report.qualifiedGroups,
    mode: report.protocol.mode.id, oos: report.all70DiagnosticPool.closed, isQualifiedOos: report.isQualifiedSelectedPool.closed,
    rawDiagnostic: report.rawDiagnostic ? { qualifiedGroups: report.rawDiagnostic.qualifiedGroups, oos: report.rawDiagnostic.all70DiagnosticPool.closed, isQualifiedOos: report.rawDiagnostic.isQualifiedSelectedPool.closed } : null })}\n`);
  process.stderr.write(`${JSON.stringify({ wallSeconds: (performance.now() - started) / 1000, maxRssKiB: process.resourceUsage().maxRSS })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
