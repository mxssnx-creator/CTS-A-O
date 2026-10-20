#!/usr/bin/env node
// Bounded retrospective engine audit. Freeze the source/settings/feed before scoring; never alter PF gates.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, headBars, resample } from "../src/core/market/bars.ts";
import { makeUniverse, runPipeline } from "../src/core/pipeline/pipeline.ts";
import { basePass } from "../src/core/server/runtime.server.ts";
import {
  buildTapes,
  baseAllowsTape,
  engineContextValid,
  configEval,
  defaultWalkForward,
  walkForward,
} from "../src/core/sim/walkforward.ts";
import { modeledUnitStatsOf } from "../src/core/metrics/stats.ts";
import { rangeMinTfOf, microIndRule } from "../src/core/minimal-coord.ts";
import { INVERSE_CONFIG_IDS } from "../src/core/indications/inverse-config.ts";
import { indicationState } from "../src/core/indications/registry.ts";
import { walkForwardHourlyReport } from "./lib/walkforward-hourly-report.mjs";

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
const symbols = feed.tickers
  .map((x) => x.sym ?? x.symbol)
  .sort()
  .slice(0, 12);
assert.equal(symbols.length, 12, "exactly twelve symbols required");
const feedEndT =
  Math.floor(Math.min(...symbols.map((sym) => feed.candles[`${sym}|1`].at(-1).t + 60_000)) / H) * H;
const endT = Number(arg("end", feedEndT));
assert.ok(
  Number.isFinite(endT) && endT <= feedEndT,
  "end must be an available UTC millisecond timestamp",
);
const hours = Number(arg("hours", 6));
assert.ok(Number.isInteger(hours) && hours >= 1 && hours <= 48, "hours must be 1..48");
const startT = endT - hours * H;
const selectionHours = Number(arg("selection-hours", 24));
const sourceHours = Number(arg("source-hours", 120));
assert.ok(Number.isInteger(selectionHours) && selectionHours >= 6 && selectionHours <= 336);
assert.ok(
  Number.isInteger(sourceHours) && sourceHours >= selectionHours + 20 && sourceHours <= 400,
);
const fromT = startT - 24 * H;
const settings = structuredClone(DEFAULT_SETTINGS);
settings.signals.enabled = false; // Dedicated Inverse study; independent Signals processing is outside this cohort.
settings.exitStrategy.enabled = false;
settings.grid.micro = { ...settings.grid.micro, maxHoldMin: 15 };
settings.focus = INVERSE_CONFIG_IDS.map((id) => `follow|${id}`);
settings.pinned = [];
settings.tfs = [1, 5, 15];
settings.symbols = symbols.length;
settings.forceSymbols = symbols;
const scope = "inverse";
const wf = {
  ...defaultWalkForward(settings),
  preH: 6,
  longH: selectionHours,
  simH: hours,
  startT,
  causalBase: true,
  recordValidation: true,
};
const protocol = {
  classification:
    "Frozen retrospective Inverse research on cached public history; modeled executions, no funded or venue-owned/live claim",
  scope,
  feedSha256: hash(input),
  symbols,
  startT,
  endT,
  evaluationFromT: fromT,
  lastNHistory: `${sourceHours}h source history; Base evaluates 24h, config selection ${selectionHours}h; Last-N stays strict`,
  settings,
  wf: { ...wf, protects: undefined, dcaProtects: undefined },
  source: sources(),
  harnessSha256: hash(readFileSync(new URL(import.meta.url))),
  signalScope: "Not scored: independent Signals processing is outside the Inverse cohort",
  allRanges: "Current configured production grids; Micro maximum hold explicitly 15 minutes",
};
writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2));
const drain = (g) => {
  for (;;) {
    const x = g.next();
    if (x.done) return x.value;
  }
};
const bars = symbols.flatMap((sym) =>
  settings.tfs.map((tf) =>
    barsFromCandles(
      sym,
      tf,
      resample(
        feed.candles[`${sym}|1`].filter((c) => c.t >= startT - sourceHours * H && c.t < endT),
        1,
        tf,
      ),
    ),
  ),
);
const u = makeUniverse(bars); // Last-N retains the source's available prior closes; selection remains 24h.
const pre = makeUniverse(
  bars.map((b) => headBars(b, startT)),
  fromT,
);
console.log(
  `Base: ${settings.focus.length} Inverse sources on independent/combined 1/5/15m lanes, ${symbols.length} symbols, 24h evaluated prehistory, Micro max hold 15m`,
);
const started = performance.now();
const pipeline = drain(runPipeline(pre, settings));
const baseMs = performance.now() - started;
const base = basePass(pipeline.s1, settings);
wf.basePassed = new Set(base.qualified.map((r) => `${r.bot}|${r.ind}`));
wf.basePassedRanges = base.qualifiedTags;
wf.basePassedTargets = base.qualifiedTps;
wf.baseWideLadderPairs = base.wideLadderPairs;
console.log(
  `Base qualified ${base.qualified.length}/${pipeline.s1.length}; building exact admitted ranges`,
);
const tapes = buildTapes(
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
);
console.log(`Tapes ${tapes.length}; running all admitted configurations together`);
const tapesMs = performance.now() - started - baseMs;
const sim = walkForward(u, tapes, wf);
const walkMs = performance.now() - started - baseMs - tapesMs;
const report = walkForwardHourlyReport(sim);
const byId = new Map(tapes.map((tp) => [tp.id, tp]));
const contextDiagnostic = {
  pooledPassingConfigs: 0,
  contexts: 0,
  fewerThanFiveCloses: 0,
  recentPfAtLeast135: 0,
  acceptedByAllContextGates: 0,
};
for (const tp of tapes) {
  if (!configEval(tp, startT, { ...wf, basePassed: undefined }).ok) continue;
  contextDiagnostic.pooledPassingConfigs++;
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
        contextDiagnostic.acceptedByAllContextGates++;
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
    !engineContextValid(tp, trade.entryT, wf, trade.sym, trade.side)
  )
    violations.push({ cfg: trade.cfg, entryT: trade.entryT });
  assert.ok(wf.basePassedRanges[`${tp.bot}|${tp.ind}`]?.includes(tp.protect.tag ?? ""));
}
assert.deepEqual(sources(), protocol.source, "source unchanged throughout scoring");
const summary = (rows) => {
  const s = modeledUnitStatsOf(rows, endT);
  return {
    n: rows.length,
    pf: rows.length ? s.pf : null,
    noLoss: s.gp > 0 && s.gl === 0,
    exactRatio: s.gl > 0 ? s.gp / s.gl : null,
    gp: s.gp,
    gl: s.gl,
    net: s.net,
  };
};
const result = {
  timingMs: { base: baseMs, tapes: tapesMs, walk: walkMs, total: baseMs + tapesMs + walkMs },
  byDirection: Object.fromEntries(
    [1, -1].map((side) => [
      side === 1 ? "long" : "short",
      summary(sim.trades.filter((t) => t.side === side)),
    ]),
  ),
  bySymbol: Object.fromEntries(
    symbols.map((sym) => [sym, summary(sim.trades.filter((t) => t.sym === sym))]),
  ),
  byStrategy: report.byKind,
  byIndication: Object.fromEntries(
    INVERSE_CONFIG_IDS.map((id) => [
      id,
      summary(sim.trades.filter((t) => byId.get(t.cfg)?.ind.replace(/@m\d+c?$/, "") === id)),
    ]),
  ),
  positiveHours: report.hourly.filter((h) => h.net > 0).length,
  flatHours: report.hourly.filter((h) => h.net === 0).length,
  negativeHours: report.hourly.filter((h) => h.net < 0).length,
  perLane: Object.fromEntries(
    [1, 5, 15].map((tf) => [
      tf,
      {
        sourceStates: u.caches
          .filter((k) => k.b.tfMin === tf)
          .reduce(
            (n, k) =>
              n +
              INVERSE_CONFIG_IDS.reduce(
                (m, id) => m + indicationState(id, k).reduce((a, v) => a + Number(v !== 0), 0),
                0,
              ),
            0,
          ),
        ...summary(
          sim.trades.filter((t) => byId.get(t.cfg)?.ind.match(/@m(\d+)c?$/)?.[1] === String(tf)),
        ),
      },
    ]),
  ),
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
  passingEntryContextsAtStart: tapes.reduce(
    (n, tp) =>
      n +
      (configEval(tp, startT, wf).ok
        ? [...new Set(tp.syms)].reduce(
            (m, sym) =>
              m +
              Number(engineContextValid(tp, startT, wf, sym, 1)) +
              Number(engineContextValid(tp, startT, wf, sym, -1)),
            0,
          )
        : 0),
    0,
  ),
  baseQualifiedRanges: base.qualifiedTags,
  tapes: tapes.length,
  settled: summary(sim.trades),
  executedConfigs: new Set(sim.trades.map((t) => t.cfg)).size,
  modeledOrdersOnly: true,
  contextDiagnostic,
  endpointMarks: summary(sim.openAtEnd ?? []),
  allEntriesCurrentlyQualified: violations.length === 0,
  qualificationViolations: violations,
  hourly: report.hourly.map(({ t, stats, net }) => ({ t, ...stats, net })),
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
