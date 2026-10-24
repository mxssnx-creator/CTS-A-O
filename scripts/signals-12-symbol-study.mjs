#!/usr/bin/env node
// Independent-config research, not funded/venue execution. Freeze protocol before reading outcomes.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { signalSettings, SIGNAL_SOURCES } from "../src/core/signal-config.ts";
import { signalCombos, signalProtects, signalActiveHas } from "../src/core/signals.ts";
import { signalHistProtects, signalHistValidationOf } from "../src/core/signal-hist.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { makeUniverse, kindOfId } from "../src/core/pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, walkForward, configEval, signalConfigEval, signalSetAt, tradeAt, axisVariants } from "../src/core/sim/walkforward.ts";
import { modeledUnitStatsOf, statsOf } from "../src/core/metrics/stats.ts";
import { isSignalCoordinationInd } from "../src/core/signal-coordination.ts";
import { signalCoordinationProtects } from "../src/core/server/runtime.server.ts";
const arg = (key, d) => { const i = process.argv.indexOf(`--${key}`); return i < 0 ? d : process.argv[i + 1]; };
const directory = resolve(arg("data", "research/runs/signals-12sym-20261020"));
const output = resolve(arg("out", "research/runs/signals-12sym-20261020/study"));
mkdirSync(output, { recursive: true });
const dataProtocol = JSON.parse(readFileSync(`${directory}/data-protocol.json`));
const manifests = JSON.parse(readFileSync(`${directory}/data-manifest.json`));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const H = 3_600_000;
const endT = dataProtocol.endT, startT = endT - 24 * H, splitT = endT - 12 * H;
const symbols = dataProtocol.symbols;
assert.equal(symbols.length, 12);
const settings = structuredClone(DEFAULT_SETTINGS);
settings.signals = signalSettings({ ...settings.signals, exits: "both", trailRatios: [0.5, 1, 1.5], trailMax: 0.03,
  sources: { ...settings.signals.sources, "r-apz-reclaim": true, "r-frama-pullback": true, "r-st-pullback": true },
  strategies: { dca: true, axis: true } });
const sig = settings.signals;
const scope = arg("scope", "configured");
assert.ok(["configured", "new-all-lanes"].includes(scope));
if (scope === "new-all-lanes") {
  sig.sourcesMode = "allow";
  sig.sources = Object.fromEntries(["r-apz-reclaim", "r-frama-pullback", "r-st-pullback"].map((x) => [x, true]));
  sig.lanes = [1, 5, 15, 30]; sig.coordination.enabled = false;
}
const pairFilter = arg("pair", "");
const pairs = signalCombos(sig, [1, 5, 15, 30]).filter((p) => !pairFilter || p.ind === pairFilter);
assert.ok(pairs.length);
const sourceFiles = ["scripts/signals-12-symbol-study.mjs"];
const collect = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) collect(p); else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) sourceFiles.push(p); } };
collect("src/core");
const sourceHashes = Object.fromEntries(sourceFiles.sort().map((p) => [p, hash(readFileSync(p))]));
const protocol = { ...dataProtocol, scope, startT, splitT, endT, selection: "Best ceiling/ratio with >=25 development closes, development PF >=1.5 and positive net, selected on development 12h only, then frozen for confirmation 12h. No final-window reselection.",
  qualification: "Signal own history and own Last-25 PF >= 1.5, retaining stricter gates, shared with Strategy Base and execution. Historical Normal TP/SL and Trailing candidates qualified independently per symbol/direction.",
  evaluationFromT: startT - 336 * H, ceilings: [0.01, 0.02, 0.03], ratios: [0.5, 1, 1.5], settings,
  classification: "Independent source/config scenarios; settled accepted virtual orders before account allocation, not funded positions or venue fills.",
  sharedCoordination: "Per-source scenarios omit shared side acceptance, loss clusters, engine confirmation, Block and account funding. Exact own-config PF/Last-N/acceptance/guard remain enabled. DCA Active runs in its separate mode; no duplicate base orders.",
  history: "24h indicator warmup + 336h evaluated prehistory + 12h development + 12h confirmation; every configured TP/SL and trailing grid cell, ATR, historical Normal/Trailing, DCA and Axis built independently.",
  sourceHashes, manifests, pairs, status: "sealed-before-scoring" };
const protocolPath = `${output}/protocol.json`;
// A second run needs a new folder, preserving its exact pre-score source/settings manifest.
try { writeFileSync(protocolPath, JSON.stringify(protocol, null, 2), { flag: "wx" }); }
catch { assert.deepEqual(JSON.parse(readFileSync(protocolPath)), protocol, "existing protocol differs; choose a new output directory"); }
const candles = new Map(symbols.map((sym) => {
  const file = `${sym}.json.gz`, bytes = readFileSync(`${directory}/${file}`);
  assert.equal(hash(bytes), manifests[file]);
  const cs = JSON.parse(gunzipSync(bytes));
  assert.equal(cs.length, 384 * 60); assert.equal(cs[0].t, dataProtocol.startT);
  return [sym, cs];
}));
const tfs = [...new Set(pairs.map((p) => Number(/@m(\d+)/.exec(p.ind)[1])))];
const bars = symbols.flatMap((sym) => tfs.map((tf) => barsFromCandles(sym, tf, tf === 1 ? candles.get(sym) : resample(candles.get(sym), 1, tf))));
const u = makeUniverse(bars, protocol.evaluationFromT);
const base = defaultWalkForward(settings);
const wf = { ...base, startT, simH: 24, signalLongH: 336, signalRank: sig, signalOwnBase: true,
  signalBasePassed: new Set(pairs.map((p) => `${p.bot}|${p.ind}`)), signalGuardN: sig.guard.enabled ? sig.guard.lastN : 0,
  signalAccept: sig.accept, signalSideAccept: undefined, signalCluster: undefined, signalSourceGate: undefined,
  signalMaxOpen: 0, signalPerSymbol: 0, signalMaxPositions: 0, coord: { ...base.coord, enabled: false },
  toggles: { ...base.toggles, normal: true, trailing: true, block: false, blockActive: false, dca: true, dcaActive: false, axis: true },
  recordValidation: true };
const file = `${output}/configs.ndjson`; writeFileSync(file, "");
const tradesFile = `${output}/accepted-trades.ndjson`; writeFileSync(tradesFile, "");
const stagesFile = `${output}/stage-progression.ndjson`; writeFileSync(stagesFile, "");
const totals = { pairs: 0, rawCells: 0, effectiveConfigs: 0, historicCandidates: 0, historicQualified: 0, historyCloses: 0, qualifiedConfigs: 0,
  configsEverValidated: 0, configsExecuted: 0, stageEvaluations: 0, stagePasses: 0,
  lastNReadyContexts: 0, insufficientContexts: 0, acceptedSettledCloses: 0, long: 0, short: 0 };
const allTrades = [];
const bucketTrades = new Map();
const sourceTrades = new Map();
const rows = [];
const add = (map, key, values) => { let v = map.get(key); if (!v) map.set(key, v = []); v.push(...values); };
const at = (xs, from, to) => xs.filter((t) => t.exitT > from && t.exitT <= to && !t.markedOpen);
for (let i = 0; i < pairs.length; i++) {
  const { bot, ind } = pairs[i]; const pair = `${bot}|${ind}`;
  const retained = [];
  for (const max of protocol.ceilings) {
    const own = signalSettings({ ...sig, trailMax: max });
    const normal = isSignalCoordinationInd(ind) ? signalCoordinationProtects(settings.grid, settings.cost, own.coordination.ranges, own) : signalProtects(own);
    const fitted = signalHistProtects(u, [pair], own, settings.tactics, startT, signalHistValidationOf(settings.cost, settings.gates));
    const historical = fitted[pair] ?? [];
    // buildTapes is the same local/worker tape constructor used by runtime and preset jobs.
    const ts = buildTapes(u, normal, settings.cost,
      { protects: base.dcaProtects, dca: base.dca, axis: settings.axis }, new Set([pair]), settings.tactics, null,
      { minSl: own.minSl, minTrail: own.minTrail, signalReferenceGrid: true, signalTrailMax: max, pairProtects: { [pair]: historical } });
    totals.rawCells += normal.length + historical.length + base.dcaProtects.length * 2 + axisVariants(settings.axis, base.dcaProtects).length;
    retained.push(...ts);
    totals.historicQualified += historical.length;
  }
  assert.equal(new Set(retained.map((t) => t.id)).size, retained.length, `duplicate effective config ${pair}`);
  const inactive = retained.filter((t) => t.kind === "dca-active");
  const ordinary = retained.filter((t) => t.kind !== "dca-active");
  const simulation = walkForward(u, ordinary, wf);
  const activeSimulation = walkForward(u, inactive, { ...wf, toggles: { ...wf.toggles, dcaActive: true } });
  const executed = [...simulation.trades, ...activeSimulation.trades].filter((t) => !t.markedOpen);
  const stageCounts = new Map();
  for (const [mode, sim] of [["ordinary", simulation], ["dca-active", activeSimulation]]) {
    for (const step of sim.steps) {
      const checks = step.checks ?? [];
      for (const [id, ok] of checks) {
        const count = stageCounts.get(id) ?? { evaluatedSteps: 0, passedSteps: 0 };
        count.evaluatedSteps++; count.passedSteps += ok; stageCounts.set(id, count);
      }
      appendFileSync(stagesFile, JSON.stringify({ source: ind, mode, t: step.t, evaluated: checks.length,
        passed: checks.filter(c => c[1]).length, activeOwnContexts: sim.signalSteps?.find(s => s.t === step.t)?.keys.length ?? 0,
        candidateEntries: step.byRange?.sig?.candidates ?? 0, taken: step.taken, skipped: step.skipped }) + "\n");
      totals.stageEvaluations += checks.length; totals.stagePasses += checks.filter(c => c[1]).length;
    }
  }
  for (const tr of executed) appendFileSync(tradesFile, JSON.stringify(tr) + "\n");
  for (const [sim, tapes] of [[simulation, ordinary], [activeSimulation, inactive]]) {
    const ids = new Map(tapes.map((t) => [t.id, t]));
    for (const tr of sim.trades.filter((t) => !t.markedOpen)) {
      const tp = ids.get(tr.cfg);
      assert.ok(tp && signalActiveHas(signalSetAt(sim.signalSteps, tr.entryT), tp.bot, tp.ind, tr.sym, tr.side, tp.kind, tp.id));
      const ownEval = signalConfigEval(tp, tr.entryT, wf, tr.sym, tr.side);
      assert.ok(ownEval.ok && ownEval.pf >= 1.5, "every accepted close came from its own causally qualified Base context");
    }
  }
  const byCfg = new Map(); for (const tr of executed) add(byCfg, tr.cfg, [tr]);
  for (const tp of retained) {
    const ev = configEval(tp, startT, wf);
    const history = [];
    const contexts = new Map();
    for (let j = 0; j < tp.n; j++) if (tp.exitT[j] <= startT) {
      history.push(tradeAt(tp, j)); const key = `${tp.syms[tp.symI[j]]}|${tp.side[j]}`; contexts.set(key, (contexts.get(key) ?? 0) + 1);
    }
    let ready = 0;
    for (const sym of symbols) for (const side of [1, -1]) if ((contexts.get(`${sym}|${side}`) ?? 0) >= 25) ready++;
    const ownTrades = byCfg.get(tp.id) ?? [];
    const development = modeledUnitStatsOf(at(ownTrades, startT, splitT));
    const confirmation = modeledUnitStatsOf(at(ownTrades, splitT, endT));
    const row = { cfg: tp.id, source: ind, kind: tp.kind, protection: tp.protect, history: statsOf(history),
      strategyBaseEvaluation: ev, stageBase: stageCounts.get(tp.id) ?? { evaluatedSteps: 0, passedSteps: 0 }, contextsLast25Ready: ready, contextsInsufficient: 24 - ready,
      acceptedSettled: modeledUnitStatsOf(ownTrades), development, confirmation,
      long: ownTrades.filter((t) => t.side === 1).length, short: ownTrades.filter((t) => t.side === -1).length };
    appendFileSync(file, JSON.stringify(row) + "\n");
    rows.push({ cfg: tp.id, source: ind, kind: tp.kind, max: tp.protect.trailMax, ratio: tp.protect.trailStep ?? 1, development, confirmation });
    totals.historyCloses += history.length; totals.lastNReadyContexts += ready; totals.insufficientContexts += 24 - ready;
    totals.qualifiedConfigs += Number(ev.ok);
    totals.configsEverValidated += Number((stageCounts.get(tp.id)?.passedSteps ?? 0) > 0);
    totals.configsExecuted += Number(ownTrades.length > 0);
    const key = `${tp.protect.trailMax}|${tp.protect.trailStep ?? 1}|${tp.kind}`;
    add(bucketTrades, key, ownTrades);
  }
  allTrades.push(...executed); add(sourceTrades, ind, executed);
  totals.pairs++; totals.effectiveConfigs += retained.length; totals.acceptedSettledCloses += executed.length;
  totals.long += executed.filter((t) => t.side === 1).length; totals.short += executed.filter((t) => t.side === -1).length;
  const progress = { completed: i + 1, of: pairs.length, pair, configs: retained.length, orders: executed.length, totals };
  writeFileSync(`${output}/progress.json`, JSON.stringify(progress, null, 2));
  console.log(`${i + 1}/${pairs.length} ${ind}: ${retained.length} configs, ${executed.length} settled accepted virtual closes`);
  for (const cache of u.caches) cache.clear();
  if (global.gc) global.gc();
}
// Aggregates arrive source by source. Return paths and duration diagnostics require
// chronological closes, even though PF / profit / loss sums are order independent.
const stats = (xs) => ({ ...modeledUnitStatsOf([...xs].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || a.cfg.localeCompare(b.cfg))), long: xs.filter((x) => x.side === 1).length, short: xs.filter((x) => x.side === -1).length });
const hourly = Array.from({ length: 24 }, (_, i) => { const from = startT + i * H; return { from, to: from + H, ...stats(at(allTrades, from, from + H)) }; });
const groups = [...bucketTrades].map(([key, ts]) => ({ key, total: stats(ts), development: stats(at(ts, startT, splitT)), confirmation: stats(at(ts, splitT, endT)) }));
// A frozen group rule, selected before inspecting the confirmation values. No guaranteed every-hour claim.
const selected = groups.filter((g) => g.development.n >= 25 && g.development.pf >= 1.5 && g.development.net > 0)
  .sort((a, b) => b.development.pf - a.development.pf || b.development.n - a.development.n || a.key.localeCompare(b.key))[0] ?? null;
const summary = { protocolSha256: hash(readFileSync(protocolPath)), ...totals, total: stats(allTrades), development: stats(at(allTrades, startT, splitT)),
  confirmation: stats(at(allTrades, splitT, endT)), hourly, groups, selected,
  sources: [...sourceTrades].map(([source, ts]) => ({ source, ...stats(ts), development: stats(at(ts, startT, splitT)), confirmation: stats(at(ts, splitT, endT)) })),
  symbols: symbols.map((sym) => { const ts = allTrades.filter((t) => t.sym === sym); return { symbol: sym, ...stats(ts), development: stats(at(ts, startT, splitT)), confirmation: stats(at(ts, splitT, endT)) }; }),
  qualifiedConfigsBasis: "Own symbol/direction configEval shared with Strategy Base and execution. qualifiedConfigs is the start snapshot; configsEverValidated counts configs passing at least one hourly Base evaluation; configsExecuted counts configs with settled accepted virtual closes. Unfiltered candidate history is diagnostic only.",
  classification: protocol.classification, sharedCoordination: protocol.sharedCoordination,
  positiveHours: hourly.filter((x) => x.net > 0).length, negativeHours: hourly.filter((x) => x.net < 0).length, flatHours: hourly.filter((x) => x.net === 0).length };
writeFileSync(`${output}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ totals, total: summary.total, selected, hours: [summary.positiveHours, summary.negativeHours, summary.flatHours] }, null, 2));
