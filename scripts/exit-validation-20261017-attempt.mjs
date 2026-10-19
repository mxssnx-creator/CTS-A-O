#!/usr/bin/env node
// Reproducible bounded Exit validation. Seal the complete protocol before scoring.
// No network, exchange, account, or synthetic data path is used.
//   node --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt corrected-6h --preH 6 --seal --feed /path/feed.json
//   node --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt corrected-6h --run
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const attempt = process.argv.includes("--attempt") ? arg("--attempt") : "corrected-6h";
assert.match(attempt, /^[a-z0-9-]{1,40}$/, "simple immutable attempt name");
const requestedPreH = process.argv.includes("--preH") ? Number(arg("--preH")) : 6;
assert.ok([6, 168].includes(requestedPreH), "evaluated prehistory is either the default6h smoke or168h default Exit lookback adequacy check");
const stem = resolve(root, `docs/sims/exit-validation-20261017-${attempt}`);
const H = 3_600_000;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const json = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const sources = () => {
  const files = ["package-lock.json", "package.json", "scripts/exit-validation-20261017.mjs", "scripts/exit-validation-20261017-attempt.mjs"];
  const visit = (dir) => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else if (path.endsWith(".ts") && !path.endsWith(".test.ts")) files.push(path);
    }
  };
  visit("src/core");
  return files.sort().map((path) => ({ path, sha256: hash(readFileSync(resolve(root, path))) }));
};
const iso = (t) => new Date(t).toISOString();
const finish = (g) => {
  for (;;) {
    const x = g.next();
    if (x.done) return x.value;
  }
};
const familyKeys = ["static-sl", "adaptive-sl", "trailing"].flatMap((set) => [1, -1].map((side) => `${set}|${side}`));

if (!process.argv.includes("--seal") && !process.argv.includes("--run")) {
  console.log("Use --seal --feed /path/feed.json before --run. Protocol, bounded public feed and results are written under docs/sims/exit-validation-20261017.");
  process.exit(0);
}

const { DEFAULT_SETTINGS, DEFAULT_TOGGLES } = await import("../src/core/config.ts");
const { checkSettings } = await import("../src/core/settings-check.ts");
const { normalizeLanes } = await import("../src/core/server/runtime.server.ts");
const { barsFromCandles, headBars, resample } = await import("../src/core/market/bars.ts");
const { makeUniverse, parseConfigId } = await import("../src/core/pipeline/pipeline.ts");
const { emptyExitStrategyDiagnostics, exitStrategyProtectsGen } = await import("../src/core/exit-strategy.ts");
const { buildTapes, configEval, defaultWalkForward, walkForward } = await import("../src/core/sim/walkforward.ts");
const { modeledUnitReturn, modeledUnitStatsOf } = await import("../src/core/metrics/stats.ts");

if (process.argv.includes("--seal")) {
  assert.ok(!existsSync(`${stem}-protocol.json`), "A frozen protocol already exists; preserve it under a distinct attempt name before sealing corrected source");
  assert.ok(process.argv.includes("--feed"), "--seal requires --feed /path/feed.json");
  const sourcePath = resolve(arg("--feed"));
  const sourceBytes = readFileSync(sourcePath);
  const source = JSON.parse(sourceBytes);
  const symbols = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"];
  const tfs = [1, 5, 15, 30];
  const pairs = ["follow", "revert"].flatMap((bot) => ["ema-9-21", "rsi-mom-14-20"].flatMap((ind) => tfs.map((tf) => `${bot}|${ind}@m${tf}`)));
  const endT = Math.floor(Math.min(...symbols.map((sym) => {
    const cs = source.candles?.[`${sym}|1`];
    assert.ok(cs?.length, `missing ${sym} 1m source`);
    return cs.at(-1).t + 60_000;
  })) / H) * H;
  const tradeStartT = endT - 6 * H;
  const preH = requestedPreH;
  const evaluationFromT = tradeStartT - preH * H;
  const indicatorStartT = evaluationFromT - 72 * H;
  const candles = {};
  const quality = [];
  for (const sym of symbols) {
    const cs = source.candles[`${sym}|1`].filter((c) => c.t >= indicatorStartT && c.t + 60_000 <= endT);
    assert.equal(cs.length, (72 + preH + 6) * 60, `${sym}: exactly 72h warmup + ${preH}h evaluated prehistory + 6h trading`);
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      assert.ok([c.t, c.o, c.h, c.l, c.c, c.v].every(Number.isFinite), `${sym}: finite OHLCV`);
      assert.ok(c.o > 0 && c.c > 0 && c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c) && c.l > 0 && c.v >= 0, `${sym}: valid OHLCV`);
      assert.equal(c.t, indicatorStartT + i * 60_000, `${sym}: contiguous minute bars`);
    }
    candles[`${sym}|1`] = cs;
    quality.push({ sym, n: cs.length, firstT: cs[0].t, lastT: cs.at(-1).t, gaps: 0, zeroVolumeBars: cs.filter((c) => c.v === 0).length });
  }
  const settings = normalizeLanes({
    ...structuredClone(DEFAULT_SETTINGS),
    symbols: symbols.length,
    forceSymbols: symbols,
    tfs,
    focus: pairs,
    pinned: [],
    signals: { ...structuredClone(DEFAULT_SETTINGS.signals), enabled: false },
    toggles: { ...DEFAULT_TOGGLES, normal: false, trailing: false, exit: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    exitStrategy: { ...structuredClone(DEFAULT_SETTINGS.exitStrategy), enabled: true },
  });
  checkSettings(settings);
  const wfPatch = { preH, simH: 6, longH: preH, stepH: 1, startT: tradeStartT, recordValidation: true };
  const wf = { ...defaultWalkForward(settings), ...wfPatch, protects: [], dcaProtects: [] };
  assert.deepEqual(wf.gates, settings.gates);
  assert.deepEqual(wf.toggles, settings.toggles);
  assert.equal(wf.cost, settings.cost);
  assert.ok(wf.gates.minPf >= 1.1 && settings.exitStrategy.minPf >= 1.1, "preserve PF floors");
  mkdirSync(dirname(stem), { recursive: true });
  const feed = gzipSync(JSON.stringify({ candles }), { level: 9, mtime: 0 });
  writeFileSync(`${stem}-feed.json.gz`, feed);
  const protocol = {
    schema: "cts-exit-validation-v1", attempt, frozenAt: iso(Date.now()),
    classification: "Retrospective reused cached public market candles; no new or unseen market-performance claim",
    actualExecution: false, synthetic: false, newNetworkRequests: 0,
    source: { path: sourcePath, bytes: sourceBytes.length, sha256: hash(sourceBytes), provenance: "Existing cached public-candle replay feed; this harness performs no independent venue provenance audit" },
    feed: { path: relative(root, `${stem}-feed.json.gz`), bytes: feed.length, sha256: hash(feed) },
    quality, symbols, pairs, tfs,
    window: { indicatorStartT, evaluationFromT, tradeStartT, endT, indicatorWarmupH: 72, preH, simH: 6, fitFraction: settings.exitStrategy.trainFraction },
    protocol: "Frozen fixed symbol/indication inventory; no performance-based tuning or removal. TP/SL candidates fit on older evaluated prehistory, qualify on later prehistory closes only; existing post-admission seat and entry gates run causally each hour. Exit admission is independent of Normal/Trailing Base/range admission. Endpoint marks are separate from settled closes. Intrinsic config model is one unit; no account funding, fees beyond modeled round-trip cost, or exchange fills are simulated.",
    resourceBudget: { concurrency: 1, symbols: symbols.length, initializedPairs: pairs.length, barHorizonH: 72 + preH + 6, heapMb: 768 },
    settings, wfPatch, sources: sources(),
  };
  json(`${stem}-protocol.json`, protocol);
  console.log(JSON.stringify({ sealed: `${stem}-protocol.json`, protocolSha256: hash(readFileSync(`${stem}-protocol.json`)), feedSha256: protocol.feed.sha256, window: protocol.window, pairs: pairs.length, cost: settings.cost }));
  process.exit(0);
}

const start = performance.now();
const protocolPath = `${stem}-protocol.json`;
const protocol = readJson(protocolPath);
assert.equal(protocol.schema, "cts-exit-validation-v1");
assert.deepEqual(sources(), protocol.sources, "Production source changed since sealing; preserve this attempt and seal a distinct protocol before rescoring");
assert.deepEqual(normalizeLanes(protocol.settings), protocol.settings, "frozen settings are production lane-normalized");
checkSettings(protocol.settings);
const settings = protocol.settings;
const inputBytes = readFileSync(resolve(root, protocol.feed.path));
assert.equal(hash(inputBytes), protocol.feed.sha256, "bounded input hash");
const feed = JSON.parse(gunzipSync(inputBytes));
const { evaluationFromT, tradeStartT, endT, preH } = protocol.window;
const bars = protocol.symbols.flatMap((sym) => protocol.tfs.map((tf) => barsFromCandles(sym, tf, resample(feed.candles[`${sym}|1`], 1, tf))));
const u = makeUniverse(bars, evaluationFromT);
const pre = makeUniverse(bars.map((b) => headBars(b, tradeStartT)), evaluationFromT);
assert.equal(u.nowT, endT);
assert.equal(pre.nowT, tradeStartT);
assert.equal(u.startT, evaluationFromT);
const diagnostics = emptyExitStrategyDiagnostics();
const validation = { cost: settings.cost, minPf: settings.exitStrategy.minPf, minTrades: settings.exitStrategy.minValidationTrades, maxDdr: settings.exitStrategy.maxDdr, minSl: settings.protectFloor.minSl, minTrail: settings.protectFloor.minTrail };
const pairProtects = finish(exitStrategyProtectsGen(pre, protocol.pairs, settings.exitStrategy, settings.tactics, tradeStartT, validation, diagnostics));
const futureDiagnostics = emptyExitStrategyDiagnostics();
const withFuture = finish(exitStrategyProtectsGen(u, protocol.pairs, settings.exitStrategy, settings.tactics, tradeStartT, validation, futureDiagnostics));
assert.deepEqual(withFuture, pairProtects, "future bars cannot alter prehistory fit/holdout qualification");
assert.deepEqual(futureDiagnostics, diagnostics, "future bars cannot alter qualification diagnostics");
const tapes = buildTapes(u, [], settings.cost, undefined, new Set(protocol.pairs), settings.tactics, undefined, { minSl: validation.minSl, minTrail: validation.minTrail, pairProtects });
const wf = { ...defaultWalkForward(settings), ...protocol.wfPatch, protects: [], dcaProtects: [], basePassed: new Set() };
assert.equal(wf.preH, preH);
assert.equal(wf.longH, preH);
assert.deepEqual(wf.gates, settings.gates);
assert.deepEqual(wf.toggles, settings.toggles);
const ids = new Set();
for (const tape of tapes) {
  assert.equal(tape.kind, "exit");
  assert.equal(tape.protect.tag, undefined, "Exit cannot inherit a range");
  assert.ok(!ids.has(tape.id), "one tape per exact config");
  ids.add(tape.id);
  for (let i = 0; i < tape.n; i++) {
    assert.equal(tape.side[i], tape.protect.exitSide, "one independently qualified direction");
    assert.ok(tape.entryT[i] >= evaluationFromT, "older warmup never supplies evaluated entries");
  }
}
const result = walkForward(u, tapes, wf);
const tradeKeys = new Set();
for (const trade of [...result.trades, ...(result.openAtEnd ?? [])]) {
  const parsed = parseConfigId(trade.cfg);
  assert.equal(parsed?.protect.exitType, "historic");
  assert.equal(parsed?.protect.exitSide, trade.side);
  assert.ok(trade.entryT >= tradeStartT && trade.entryT < endT, "forward entry boundary");
  const key = `${trade.cfg}|${trade.sym}|${trade.side}|${trade.entryT}`;
  assert.ok(!tradeKeys.has(key), "no duplicate modeled entry");
  tradeKeys.add(key);
  assert.ok(Number.isFinite(modeledUnitReturn(trade)), "modeled unit-return evidence");
}
const familyOf = (cfg) => { const p = parseConfigId(cfg)?.protect; return `${p?.exitSet}|${p?.exitSide}`; };
const summarize = (trades) => {
  const stats = modeledUnitStatsOf(trades, endT);
  let gp = 0, gl = 0;
  for (const trade of trades) { const r = modeledUnitReturn(trade); if (r > 0) gp += r; else gl -= r; }
  return { n: trades.length, gp, gl, netReturnPoints: 100 * (gp - gl), exactPf: trades.length === 0 ? null : gl === 0 ? null : gp / gl, pfStatus: trades.length === 0 ? "empty" : gl === 0 ? "no-loss sample" : "measured", runtimePfScore: stats.pf, unknownReturns: stats.unknownReturns };
};
const configRows = tapes.map((tape) => ({ id: tape.id, ind: tape.ind, bot: tape.bot, protect: tape.protect, atStart: configEval(tape, tradeStartT, wf), forwardSettled: summarize(result.trades.filter((trade) => trade.cfg === tape.id)) }));
const hourly = Array.from({ length: 6 }, (_, i) => {
  const from = tradeStartT + i * H, to = from + H;
  const settled = result.trades.filter((trade) => trade.exitT > from && trade.exitT <= to);
  return { from, to, ...summarize(settled), families: Object.fromEntries(familyKeys.map((key) => [key, summarize(settled.filter((trade) => familyOf(trade.cfg) === key))])) };
});
assert.equal(hourly.reduce((n, row) => n + row.n, 0), result.trades.length, "hourly settled cohort reconciles");
const families = familyKeys.map((key) => ({ key, independentlyQualifiedConfigs: tapes.filter((tape) => familyOf(tape.id) === key).length, seatsQualifiedAtStart: configRows.filter((row) => familyOf(row.id) === key && row.atStart.ok).length, ...summarize(result.trades.filter((trade) => familyOf(trade.cfg) === key)) }));
assert.equal(families.reduce((n, row) => n + row.n, 0), result.trades.length, "independent set/side rows reconcile");
assert.deepEqual(sources(), protocol.sources, "source remained unchanged throughout scoring");
const evidence = {
  schema: "cts-exit-validation-result-v1", completedAt: iso(Date.now()), protocolSha256: hash(readFileSync(protocolPath)),
  classification: protocol.classification, window: protocol.window, diagnostics,
  settingsParity: true, causalFitWithFutureBarsParity: true, noDuplicateConfigsOrEntries: true,
  settled: summarize(result.trades), endpointMarks: summarize(result.openAtEnd ?? []),
  families, hourly, configRows, skips: result.skips, steps: result.steps,
  settledTrades: result.trades, openAtEnd: result.openAtEnd ?? [],
  elapsedMs: Math.round(performance.now() - start), maxRssMiB: process.resourceUsage().maxRSS / 1024,
};
json(`${stem}-result.json`, evidence);
const pf = (row) => row.pfStatus === "empty" ? "empty" : row.pfStatus === "no-loss sample" ? "no losses" : row.exactPf.toFixed(3);
const positive = hourly.filter((row) => row.netReturnPoints > 0).length;
const lines = [
  "# Exit causal validation — reused public history", "",
  `${protocol.classification}. Four fixed symbols; 16 initialized indication/bot/lane pairs; all three Exit config sets and both sides are reported, including empty outcomes. No new market-data requests or exchange orders.`, "",
  `Window: **${iso(tradeStartT)} → ${iso(endT)}**. ${preH} hours of evaluated prehistory precede trading. Seventy-two older hours initialize indicators behind explicit evaluationFromT; they supply no scored entries. Modeled round-trip cost: **${(settings.cost * 100).toFixed(2)}%**.`, "",
  "The frozen production settings retain their PF, minimum-close, DDR, last-N, confidence, hourly-success and symbol-side gates. Exit candidates have their own prehistory fit/holdout admission and subsequent seat/entry validation; Normal/Trailing Base and range admission is deliberately empty. New Exit config sets use unrestricted completed indication entries, independently of global remove-only entry tactics. No PF, close-count or drawdown gate is relaxed to create orders. TP/SL fitting is fixed at the trading boundary for this check; gates continue reading only prior settled closes.", "",
  `Settled modeled orders: **${evidence.settled.n}**; primary unit-return PF: **${pf(evidence.settled)}**; sum of unit returns: **${evidence.settled.netReturnPoints.toFixed(3)} percentage points**. Positive settled hours: **${positive}/6**, flat: ${hourly.filter((row) => row.netReturnPoints === 0).length}, negative: ${hourly.filter((row) => row.netReturnPoints < 0).length}. Endpoint marks: ${evidence.endpointMarks.n}, reported separately. This is virtual model evidence without account allocation; order counts are modeled settled config orders, never venue fills.`, "",
  "| Independent Exit set | Side | Holdout-qualified configs | Seat-qualified at start | Settled orders | Unit PF | Net return points |", "|---|---|---:|---:|---:|---:|---:|",
  ...families.map((row) => { const [set, side] = row.key.split("|"); return `| ${set} | ${side === "1" ? "Long" : "Short"} | ${row.independentlyQualifiedConfigs} | ${row.seatsQualifiedAtStart} | ${row.n} | ${pf(row)} | ${row.netReturnPoints.toFixed(3)} |`; }), "",
  "| Hour UTC | Settled orders | Unit PF | Net return points |", "|---|---:|---:|---:|",
  ...hourly.map((row) => `| ${iso(row.from).slice(0, 16)} | ${row.n} | ${pf(row)} | ${row.netReturnPoints.toFixed(3)} |`), "",
  `Qualification diagnostics: ${JSON.stringify(diagnostics)}. Entry skip reasons: ${JSON.stringify(result.skips)}. Every accepted config and its own initial seat evaluation and forward returns are in the result JSON. Each hourly JSON row also contains all six independent set/side slices.`, "",
  `Correctness checks passed: production settings validation and lane normalization; exact WF/settings gate and cost parity; truncated-prehistory versus future-present fit/holdout parity; no range tags; exact side identity; no duplicate config or modeled entry; no pre-evaluation entries; independent family and hourly settled-return reconciliation. Runtime ${evidence.elapsedMs} ms; process maximum RSS ${evidence.maxRssMiB.toFixed(1)} MiB; one process, no worker fan-out. Worker/parallel parity, order ownership and live protection are covered by separate project tests; this harness does not reproduce exchange execution.`, "",
  "Empty or insufficient outcomes establish no profitability result. A no-loss sample is labeled explicitly; its runtime qualification score uses the existing finite sentinel and is not presented as an exact measured PF. Reused retrospective history and a six-hour development window cannot establish durable profitability or positive results in every hour. Intrabar OHLC uncertainty and modeled costs remain limitations.", "",
  "Reproduce from the committed bounded public input and frozen protocol:", "", "```sh", `node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-attempt.mjs --attempt ${attempt} --run`, "```", "",
  `Protocol SHA-256: ${evidence.protocolSha256}. Bounded compressed input SHA-256: ${protocol.feed.sha256}. The protocol records complete settings, source hashes and original cached-feed provenance. Source mismatches stop scoring.`, "",
];
writeFileSync(`${stem}.md`, lines.join("\n"));
console.log(JSON.stringify({ report: `${stem}.md`, settled: evidence.settled, families, positiveHours: positive, diagnostics, elapsedMs: evidence.elapsedMs, maxRssMiB: evidence.maxRssMiB }));
