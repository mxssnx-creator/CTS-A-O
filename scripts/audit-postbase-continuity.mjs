#!/usr/bin/env node
// Bounded retrospective engine audit. Freeze the source/settings/feed before scoring; never alter PF gates.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { BREAK_MICRO_FOCUS_17OCT, DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, headBars, resample } from "../src/core/market/bars.ts";
import { makeUniverse, runPipeline } from "../src/core/pipeline/pipeline.ts";
import { baseFocus, basePass } from "../src/core/server/runtime.server.ts";
import {
  buildTapesGen,
  baseAllowsTape,
  engineContextValid,
  configDirectionEval,
  configEval,
  configContextEval,
  makeTape,
  tradeAt,
  symStats,
  defaultWalkForward,
  walkForwardGen,
} from "../src/core/sim/walkforward.ts";
import { modeledUnitStatsOf } from "../src/core/metrics/stats.ts";
import { rangeMinTfOf, microIndRule } from "../src/core/minimal-coord.ts";
import { auditSettledHours } from "./lib/postbase-hourly.mjs";
import { scalarDirectionEval } from "../.github/audits/hourly-progress.mjs";

const arg = (k, fallback) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const H = 3_600_000;
const hash = (x) => createHash("sha256").update(x).digest("hex");
const input = readFileSync(resolve(arg("feed")));
const feed = JSON.parse(input[0] === 31 ? gunzipSync(input) : input);
const out = resolve(arg("out", "runs/postbase-continuity-20261020"));
mkdirSync(out, { recursive: true });
const sources = () => {
  const files = [];
  const walk = (dir) => {
    for (const x of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${x.name}`;
      if (x.isDirectory()) walk(p);
      else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) files.push(p);
    }
  };
  walk("src/core");
  return Object.fromEntries(files.sort().map((p) => [p, hash(readFileSync(p))]));
};
const symbols = feed.tickers.map((x) => x.sym ?? x.symbol).sort();
const feedEndT =
  Math.floor(Math.min(...symbols.map((sym) => feed.candles[`${sym}|1`].at(-1).t + 60_000)) / H) * H;
const endT = Number(arg("end", feedEndT));
assert.ok(
  Number.isFinite(endT) && endT % H === 0 && endT <= feedEndT,
  "end must be an available whole-hour UTC millisecond timestamp",
);
const startT = endT - 6 * H;
const fromT = startT - 24 * H;
const settings = structuredClone(DEFAULT_SETTINGS);
settings.signals.enabled = false; // Isolate engine validation; Signal sources retain their independent 336h history.
settings.exitStrategy.enabled = false;
settings.grid.micro = { ...settings.grid.micro, maxHoldMin: 15 };
settings.focus = ["follow", "revert"].flatMap((bot) =>
  ["mc-rsi2-5", "mc-rsi3-10", "mc-fbo-48", "ema-9-21", "rsi-mom-14-20"].flatMap((ind) =>
    [5, 15].map((tf) => `${bot}|${ind}@m${tf}`),
  ),
);
settings.pinned = [];
settings.tfs = [1, 5, 15, 30];
settings.symbols = symbols.length;
settings.forceSymbols = symbols;
const scope = arg("scope", "bounded");
assert.ok(["bounded", "micro"].includes(scope), "scope must be bounded or micro");
if (scope === "micro") {
  for (const range of ["minimal", "short", "general", "long", "minimalPlus"])
    settings.grid[range] = false;
  settings.grid.tp = [];
  settings.tfs = [5, 15, 30];
  settings.focus = [...DEFAULT_SETTINGS.focus];
  const breaks = new Set(BREAK_MICRO_FOCUS_17OCT);
  settings.focus = baseFocus(settings).filter(
    (pair) => pair.split("|")[1].startsWith("mc-") || breaks.has(pair),
  );
}
const wf = {
  ...defaultWalkForward(settings),
  preH: 6,
  longH: 24,
  simH: 6,
  startT,
  causalBase: true,
  recordValidation: true,
};
const protocol = {
  classification: "Retrospective engine regression; no funded/live/independent alpha claim",
  scope,
  feedSha256: hash(input),
  symbols,
  startT,
  endT,
  evaluationFromT: fromT,
  lastNHistory: "All available source candles; Base and broad config evaluation remain 24h",
  validationScope:
    "Full independent config/direction evaluation through entry, including sample, confidence and Last-N; separate symbol gate",
  settings,
  wf: { ...wf, protects: undefined, dcaProtects: undefined },
  source: sources(),
  rssBudgetMiB: 3072,
  harnessSha256: hash(readFileSync(new URL(import.meta.url))),
  signalScope: "Not scored: engine-only replay; independent 336h Signal history is tested separately",
  allRanges: "Current configured production grids; Micro maximum hold explicitly 15 minutes",
  settlementHorizon: "Source bars stop at endT; settled exits are in (startT,endT]; endpoint marks remain separate",
  hourlyReferenceSha256: hash(readFileSync(new URL("./lib/postbase-hourly.mjs", import.meta.url))),
  scalarReferenceSha256: hash(readFileSync(new URL("../.github/audits/hourly-progress.mjs", import.meta.url))),
};
writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2));
let lastMemoryCheck = 0;
const drain = (g) => {
  for (;;) {
    const value = g.next();
    if (Date.now() - lastMemoryCheck > 1000) {
      lastMemoryCheck = Date.now();
      assert.ok(
        process.memoryUsage().rss <= 3072 * 1024 ** 2,
        "audit memory budget exceeded; incomplete scoring cannot pass",
      );
    }
    if (value.done) return value.value;
  }
};
const bars = symbols.flatMap((sym) =>
  settings.tfs.map((tf) => headBars(
    barsFromCandles(sym, tf, resample(feed.candles[`${sym}|1`], 1, tf)), endT,
  )),
);
const u = makeUniverse(bars); // Last-N retains the source's available prior closes; selection remains 24h.
const pre = makeUniverse(
  bars.map((b) => headBars(b, startT)),
  fromT,
);
console.log(
  `Base: ${settings.focus.length} pairs, ${symbols.length} symbols, 24h evaluated prehistory, Micro max hold 15m`,
);
const pipeline = drain(runPipeline(pre, settings));
const base = basePass(pipeline.s1, settings);
wf.basePassed = new Set(base.qualified.map((r) => `${r.bot}|${r.ind}`));
wf.basePassedRanges = base.qualifiedTags;
wf.basePassedTargets = base.qualifiedTps;
wf.baseWideLadderPairs = base.wideLadderPairs;
console.log(
  `Base qualified ${base.qualified.length}/${pipeline.s1.length}; building exact admitted ranges`,
);
const tapes = drain(
  buildTapesGen(
    u,
    wf.protects,
    settings.cost,
    undefined,
    new Set(base.passed.map((r) => `${r.bot}|${r.ind}`)),
    settings.tactics,
    undefined,
    {
      minSl: settings.protectFloor.minSl,
      minTrail: settings.protectFloor.minTrail,
      pairTags: base.pairTags,
      pairTps: base.pairTps,
      rangeMinTf: rangeMinTfOf(settings.grid),
      microOwnInds: microIndRule(settings.grid),
    },
  ),
);
console.log(`Tapes ${tapes.length}; running all admitted configurations together`);
if (arg("diagnose-hourly", "false") === "true") {
  const hours = Array.from({ length: 7 }, (_, i) => ({ t: startT + i * H, checked: 0, passing: 0, failures: {} }));
  const violations = [];
  let mismatches = 0;
  for (const tp of tapes) {
    const sides = new Map([1, -1].map((side) => [side, []]));
    for (let i = 0; i < tp.n; i++) sides.get(tp.side[i]).push([
      tp.syms[tp.symI[i]], tp.side[i], tp.entryT[i], tp.exitT[i], tp.r[i],
    ]);
    for (const hour of hours) for (const side of [1, -1]) {
      const actual = configDirectionEval(tp, hour.t, wf, side);
      const expected = scalarDirectionEval(sides.get(side), hour.t, wf, tp.protect, tp.kind, tp.ind);
      hour.checked++;
      if (actual.ok) hour.passing++;
      else hour.failures[actual.fail] = (hour.failures[actual.fail] ?? 0) + 1;
      const differences = ["n", "pf", "net"].filter((key) =>
        Math.abs(actual[key] - expected[key]) > 1e-8 * Math.max(1, Math.abs(expected[key])));
      if (actual.ok !== expected.ok || differences.length) {
        mismatches++;
        if (violations.length < 20) violations.push({ cfg: tp.id, side, t: hour.t, actual, expected, differences });
      }
    }
  }
  const audit = { checked: hours.reduce((n, h) => n + h.checked, 0), mismatches, hours, violations };
  writeFileSync(`${out}/hourly-gates.json`, JSON.stringify(audit, null, 2));
  console.log(JSON.stringify(audit));
  assert.deepEqual(sources(), protocol.source);
  assert.equal(mismatches, 0, "Independent hourly own-direction evaluation mismatch");
  process.exit(0);
} else if (arg("diagnose-parity")) {
  const bytes = readFileSync(arg("diagnose-parity"));
  const orders = JSON.parse(gunzipSync(bytes));
  const byId = new Map(tapes.map((tp) => [tp.id, tp]));
  const index = new Map();
  const stats = {
    orders: orders.length, matched: 0, missing: 0, mismatched: 0,
    entryQualificationFailed: 0, symbolWithoutPriorClose: 0,
    maxUnitReturnError: 0, maxCostError: 0,
  };
  const failures = [];
  const evaluations = [];
  for (const order of orders) {
    const tp = byId.get(order.cfg);
    assert.ok(tp, `missing config ${order.cfg}`);
    let rows = index.get(tp);
    if (!rows) {
      rows = new Map();
      for (let i = 0; i < tp.n; i++) {
        const key = `${tp.syms[tp.symI[i]]}|${tp.side[i]}|${tp.entryT[i]}`;
        const matches = rows.get(key) ?? [];
        matches.push(i);
        rows.set(key, matches);
      }
      index.set(tp, rows);
    }
    const matches = (rows.get(`${order.sym}|${order.side}|${order.entryT}`) ?? [])
      .map((i) => tradeAt(tp, i));
    const unitR = order.r / order.mult;
    const match = matches.find((row) => row.exitT === order.exitT && row.reason === order.reason &&
      Math.abs(row.entry - order.entry) <= 1e-8 * Math.max(1, order.entry) &&
      Math.abs(row.exit - order.exit) <= 1e-8 * Math.max(1, order.exit) &&
      Math.abs(row.r - unitR) <= 1e-8);
    if (!matches.length) stats.missing++;
    else if (!match) stats.mismatched++;
    else stats.matched++;
    if (!match && failures.length < 12) failures.push({ order, matches });
    if (match) stats.maxUnitReturnError = Math.max(stats.maxUnitReturnError, Math.abs(match.r - unitR));
    const cost = order.side * (order.exit - order.entry) / order.entry - unitR;
    stats.maxCostError = Math.max(stats.maxCostError, Math.abs(cost - settings.cost));
    const direction = configDirectionEval(tp, order.entryT, wf, order.side);
    const symbol = symStats(tp, order.sym, order.side, order.entryT - 24 * H, order.entryT);
    const qualified = baseAllowsTape(tp, wf) && direction.ok &&
      engineContextValid(tp, order.entryT, wf, order.sym, order.side);
    if (!qualified) stats.entryQualificationFailed++;
    if (!symbol.n) stats.symbolWithoutPriorClose++;
    evaluations.push({ cfg: order.cfg, sym: order.sym, side: order.side,
      entryT: order.entryT, exitT: order.exitT, unitR, direction, symbol, qualified });
  }
  assert.deepEqual(sources(), protocol.source, "source unchanged throughout parity audit");
  writeFileSync(`${out}/execution-parity.json`, JSON.stringify({
    stats, failures, evaluations, source: protocol.source,
    protocolSha256: hash(readFileSync(`${out}/protocol.json`)), ordersSha256: hash(bytes),
  }, null, 2));
  await new Promise((done) => process.stdout.write(`${JSON.stringify(stats)}\n`, done));
  // The diagnostic is complete: do not continue into a second execution replay.
  process.exit(stats.missing || stats.mismatched || stats.entryQualificationFailed ? 1 : 0);
} else if (arg("diagnose-prefix")) {
  const orders = JSON.parse(gunzipSync(readFileSync(arg("diagnose-prefix"))));
  const byPair = new Map();
  for (const order of orders) {
    const pair = order.cfg.split("|").slice(0, 2).join("|");
    if (!byPair.has(pair)) byPair.set(pair, order.cfg);
  }
  const onlyIds = new Set(byPair.values());
  const comparisons = [];
  for (let cut = startT; cut <= endT; cut += H) {
    const head = makeUniverse(bars.map((b) => headBars(b, cut)));
    const prefix = drain(
      buildTapesGen(
        head,
        wf.protects,
        settings.cost,
        undefined,
        new Set(byPair.keys()),
        settings.tactics,
        undefined,
        {
          minSl: settings.protectFloor.minSl,
          minTrail: settings.protectFloor.minTrail,
          pairTags: base.pairTags,
          pairTps: base.pairTps,
          rangeMinTf: rangeMinTfOf(settings.grid),
          microOwnInds: microIndRule(settings.grid),
          onlyIds,
        },
      ),
    );
    const original = new Map(tapes.filter((tp) => onlyIds.has(tp.id)).map((tp) => [tp.id, tp]));
    const rows = (tp) => {
      const out = [];
      for (let i = 0; i < tp.n; i++)
        if (tp.exitT[i] <= cut)
          out.push([
            tp.entryT[i],
            tp.exitT[i],
            tp.syms[tp.symI[i]],
            tp.side[i],
            +tp.r[i].toFixed(12),
            tp.reason[i],
          ]);
      return out;
    };
    for (const tp of prefix) {
      const full = original.get(tp.id),
        a = rows(full),
        b = rows(tp);
      comparisons.push({
        cut,
        cfg: tp.id,
        fullN: a.length,
        prefixN: b.length,
        same: JSON.stringify(a) === JSON.stringify(b),
      });
    }
  }
  assert.deepEqual(sources(), protocol.source);
  writeFileSync(
    `${out}/prefix-audit.json`,
    JSON.stringify(
      { comparisons, violations: comparisons.filter((x) => !x.same), source: protocol.source },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { comparisons: comparisons.length, violations: comparisons.filter((x) => !x.same) },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (arg("diagnose-orders")) {
  const orders = JSON.parse(gunzipSync(readFileSync(arg("diagnose-orders"))));
  const byId = new Map(tapes.map((tp) => [tp.id, tp]));
  const sides = new Map();
  const stats = {
    orders: orders.length,
    configFailed: 0,
    ownDirectionFailed: {},
    symbolWithoutPriorClose: 0,
    priorExecutionLosing: 0,
    maxCostError: 0,
  };
  const examples = [];
  for (const order of orders) {
    const tp = byId.get(order.cfg);
    assert.ok(tp);
    const key = `${order.cfg}|${order.side}`;
    let own = sides.get(key);
    if (!own) {
      const rows = [];
      for (let i = 0; i < tp.n; i++) if (tp.side[i] === order.side) rows.push(tradeAt(tp, i));
      own = makeTape(tp.id, tp.bot, tp.ind, tp.protect, tp.kind, tp.syms, rows, [], []);
      sides.set(key, own);
    }
    const config = configEval(tp, order.entryT, wf);
    const direction = configEval(own, order.entryT, { ...wf, basePassed: undefined });
    const symbol = symStats(tp, order.sym, order.side, order.entryT - 24 * H, order.entryT);
    const prior = orders
      .filter((x) => x.cfg === order.cfg && x.side === order.side && x.exitT <= order.entryT)
      .slice(-15);
    const gp = prior.reduce((n, x) => n + Math.max(0, x.r / x.mult), 0);
    const gl = prior.reduce((n, x) => n + Math.max(0, -x.r / x.mult), 0);
    if (!config.ok) stats.configFailed++;
    const gate = direction.ok ? "pass" : direction.fail;
    stats.ownDirectionFailed[gate] = (stats.ownDirectionFailed[gate] ?? 0) + 1;
    if (!symbol.n) stats.symbolWithoutPriorClose++;
    if (prior.length && gp <= gl) stats.priorExecutionLosing++;
    const estimatedCost =
      (order.side * (order.exit - order.entry)) / order.entry - order.r / order.mult;
    stats.maxCostError = Math.max(stats.maxCostError, Math.abs(estimatedCost - settings.cost));
    if (examples.length < 12 && !direction.ok)
      examples.push({
        cfg: order.cfg,
        sym: order.sym,
        side: order.side,
        entryT: order.entryT,
        unitR: order.r / order.mult,
        config,
        direction,
        symbol,
        priorExecution: { n: prior.length, gp, gl },
      });
  }
  assert.deepEqual(sources(), protocol.source);
  const result = {
    stats,
    examples,
    source: protocol.source,
    settingsSha256: hash(JSON.stringify(settings)),
    ordersSha256: hash(readFileSync(arg("diagnose-orders"))),
  };
  writeFileSync(`${out}/entry-audit.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ stats, examples: examples.slice(0, 3) }, null, 2));
  process.exit(0);
}
if (arg("diagnostic-only", "false") === "true") {
  const diagnostics = [];
  for (let t = startT; t <= endT; t += H) {
    const failures = {},
      configFailures = {},
      counts = {},
      examples = [];
    let contexts = 0,
      pooled = 0;
    for (const tp of tapes) {
      const cfg = configEval(tp, t, wf);
      const gate = cfg.ok ? "pass" : cfg.fail;
      configFailures[gate] = (configFailures[gate] ?? 0) + 1;
      if (cfg.ok) pooled++;
      for (const sym of new Set(tp.syms))
        for (const side of [1, -1]) {
          const ev = configContextEval(tp, t, wf, sym, side);
          contexts++;
          const gate = ev.ok ? "pass" : ev.fail;
          failures[gate] = (failures[gate] ?? 0) + 1;
          counts[ev.n] = (counts[ev.n] ?? 0) + 1;
          if (ev.n >= 5 && examples.length < 12) examples.push({ cfg: tp.id, sym, side, ...ev });
        }
    }
    diagnostics.push({ t, contexts, pooled, configFailures, failures, counts, examples });
  }
  writeFileSync(`${out}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
  console.log(JSON.stringify(diagnostics.map(({ examples: _examples, ...rest }) => rest)));
  process.exit(0);
}
const sim = drain(walkForwardGen(u, tapes, wf));
assert.equal(sim.startT, startT);
assert.equal(sim.endT, endT);
const hourlyAudit = auditSettledHours(sim.trades, startT, endT, sim.hourly);
const validationSteps = sim.steps.map((step) => ({
  t: step.t,
  passingSets: (step.checks ?? []).filter((row) => row[1] === 1).length,
  selectedSets: step.real.length,
  taken: step.taken,
  skipped: step.skipped,
}));
const byId = new Map(tapes.map((tp) => [tp.id, tp]));
const contextDiagnostic = {
  qualifiedConfigContainers: 0,
  contexts: 0,
  fewerThanFiveCloses: 0,
  recentPfAtLeast135: 0,
  acceptedByConfiguredSymbolGate: 0,
};
for (const tp of tapes) {
  if (!configEval(tp, startT, { ...wf, basePassed: undefined }).ok) continue;
  contextDiagnostic.qualifiedConfigContainers++;
  for (const sym of new Set(tp.syms))
    for (const side of [1, -1]) {
      contextDiagnostic.contexts++;
      const own = [];
      for (let i = 0; i < tp.n; i++)
        if (tp.exitT[i] <= startT && tp.syms[tp.symI[i]] === sym && tp.side[i] === side)
          own.push(tp.r[i]);
      if (own.length < 5) contextDiagnostic.fewerThanFiveCloses++;
      const recent = own.slice(-75),
        gp = recent.reduce((n, r) => n + Math.max(0, r), 0),
        gl = recent.reduce((n, r) => n + Math.max(0, -r), 0);
      if (own.length >= 5 && gp > 0 && (gl === 0 || gp / gl >= 1.35))
        contextDiagnostic.recentPfAtLeast135++;
      if (engineContextValid(tp, startT, wf, sym, side))
        contextDiagnostic.acceptedByConfiguredSymbolGate++;
    }
}
const violations = [];
for (const trade of [...sim.trades, ...(sim.openAtEnd ?? [])]) {
  const tp = byId.get(trade.cfg);
  assert.ok(tp, "every entry retains its exact calculated configuration");
  assert.ok(
    baseAllowsTape(tp, wf),
    "every entry retains its exact Base pair/range/target qualification",
  );
  if (
    !configEval(tp, trade.entryT, wf).ok ||
    !configDirectionEval(tp, trade.entryT, wf, trade.side).ok ||
    !engineContextValid(tp, trade.entryT, wf, trade.sym, trade.side)
  )
    violations.push({ cfg: trade.cfg, entryT: trade.entryT });
  assert.ok(wf.basePassedRanges[`${tp.bot}|${tp.ind}`]?.includes(tp.protect.tag ?? ""));
}
assert.deepEqual(sources(), protocol.source, "source unchanged throughout scoring");
const summary = (rows) => {
  const s = modeledUnitStatsOf(rows, endT);
  return { n: rows.length, pf: rows.length ? s.pf : null, gp: s.gp, gl: s.gl, net: s.net };
};
const result = {
  classification: protocol.classification,
  startT,
  endT,
  baseEvaluated: pipeline.s1.length,
  baseQualified: base.qualified.length,
  qualifiedBaseRows: base.qualified.map((r) => ({
    bot: r.bot,
    ind: r.ind,
    full: r.full,
    ranges: r.ranges,
    rangeTps: r.rangeTps,
  })),
  passingSetsAtStart: tapes.filter((tp) => configEval(tp, startT, wf).ok).length,
  passingSetsAtEnd: tapes.filter((tp) => configEval(tp, endT, wf).ok).length,
  passingDirectionalSetsAtStart: tapes.reduce(
    (n, tp) =>
      n +
      (configEval(tp, startT, wf).ok
        ? Number(configDirectionEval(tp, startT, wf, 1).ok) +
          Number(configDirectionEval(tp, startT, wf, -1).ok)
        : 0),
    0,
  ),
  passingEntryContextsAtStart: tapes.reduce(
    (n, tp) =>
      n +
      (configEval(tp, startT, wf).ok
        ? [...new Set(tp.syms)].reduce(
            (m, sym) =>
              m +
              Number(
                configDirectionEval(tp, startT, wf, 1).ok &&
                  engineContextValid(tp, startT, wf, sym, 1),
              ) +
              Number(
                configDirectionEval(tp, startT, wf, -1).ok &&
                  engineContextValid(tp, startT, wf, sym, -1),
              ),
            0,
          )
        : 0),
    0,
  ),
  baseQualifiedRanges: base.qualifiedTags,
  tapes: tapes.length,
  settled: summary(sim.trades),
  executedConfigs: new Set(sim.trades.map((t) => t.cfg)).size,
  validationSteps,
  modeledOrdersOnly: true,
  contextDiagnostic,
  endpointMarks: summary(sim.openAtEnd ?? []),
  allEntriesCurrentlyQualified: violations.length === 0,
  qualificationViolations: violations,
  hourly: sim.hourly,
  hourlyAudit,
  skips: sim.skips,
  ranges: Object.fromEntries(
    ["", "mc", "mn", "mp", "sh", "gn", "lg"].map((tag) => [
      tag || "wide",
      summary(sim.trades.filter((t) => byId.get(t.cfg)?.protect.tag === (tag || undefined))),
    ]),
  ),
  protocolSha256: hash(readFileSync(`${out}/protocol.json`)),
  rssMaxMiB: process.resourceUsage().maxRSS / 1024,
};
writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
writeFileSync(`${out}/executions.json.gz`, gzipSync(JSON.stringify(sim.trades)));
console.log(
  JSON.stringify({ ...result, qualifiedBaseRows: undefined, hourly: undefined }, null, 2),
);
if (violations.length) process.exitCode = 1;
