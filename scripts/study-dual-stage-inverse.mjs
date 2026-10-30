#!/usr/bin/env node
// Bounded offline research. Every stage re-simulates its own accepted signals, prices, protection and cost.
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from "../src/core/indications/low-range-research.ts";
import { configId, kindOfId, laneProtect } from "../src/core/pipeline/pipeline.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { StageChainBook } from "../src/core/sim/stage-chain.ts";
import { DEFAULT_STAGE_CHAIN, dualStageGate, negativeMainTrigger, singleStageGate } from "../src/core/sim/stage-policy.ts";
import { simulateStageSource } from "../src/core/sim/stage-source.ts";
import { positionOrderCounts } from "../src/core/positions.ts";

const output = process.argv[2], range = process.argv[3] ?? "sh", holdMinutes = Number(process.argv[4] ?? 60);
if (!output || !["mc", "mn", "sh"].includes(range) || ![15, 30, 60].includes(holdMinutes))
  throw new Error("usage: study-dual-stage-inverse.mjs NEW_OUTPUT_DIRECTORY [mc|mn|sh] [15|30|60]");
mkdirSync(output, { recursive: true });
const M = 60_000, H = 60 * M, start = Date.parse("2026-10-10T00:00:00Z"), end = start + 12 * H,
  from = start - 84 * H, samples = [5, 10, 15, 20, 25], minPf = 1.1;
const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz", bytes = readFileSync(feedPath), feed = JSON.parse(gunzipSync(bytes));
const sha = (b) => createHash("sha256").update(b).digest("hex"), symbols = feed.tickers.map((x) => x.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("exactly 20 distinct symbols required");
const sourcePaths = ["scripts/study-dual-stage-inverse.mjs", "src/core/sim/stage-policy.ts", "src/core/sim/stage-source.ts",
  "src/core/sim/stage-chain.ts", "src/core/sim/entry-admission.ts", "src/core/sim/backtest.ts", "src/core/sim/dca.ts", "src/core/sim/axis.ts",
  "src/core/indications/low-range-research.ts"];
const protocol = { scope: "Isolated 20-symbol Low-Range Normal/Trailing model; independent Base/Main/Real/inverse sets. No portfolio allocation, additional/Overall strategy adjustments, production paper, live or venue fills.",
  start, end, from, prehistoryHours: 84, simulationHours: 12, symbols, range, holdMinutes, tfs: [1, 5, 15],
  basePrimaryN: 50, mainPrimaryN: 50, secondarySamples: samples, negativeMainWindows: [5, 10], realN: 15,
  minPf, cost: DEFAULT_SETTINGS.cost, feedSha256: sha(bytes), sourceSha256: Object.fromEntries(sourcePaths.map((p) => [p, sha(readFileSync(p))])),
  setIdentityPolicy: "upstream-admission-v1",
  decisionRule: "Complete own predecessor orders closed strictly before each entry; secondary static 5/10/15/20/25 tested independently at Base and Main. No cold/unknown promotion.",
  inverseRule: "Positive Main primary plus negative mean of Last-5/10 requests a separate opposite-direction Main simulation on that accepted Main entry. Its own positive dual-window validation is required for Real, then its Real Last-15 for Active.",
  activeRule: "Model Active mirrors exact final qualified Real entries and their protections; no further gate. These are unallocated model orders, not actual owned fills.",
  cohortRule: "Historical checkpoint at start is separate from subsequent orders entered in [start,end). Prehistory entries carried into the window are listed separately and excluded from the new-entry PF cohort.",
  noLossConvention: "PF=4 when gross profit>0 and gross loss=0 is a score, not a finite ratio.",
  defaultSelectionRule: "Exploratory previously examined period. No default is promoted solely on this in-sample grid; no future PF guarantee." };
protocol.economicRevision = sha(JSON.stringify([protocol.feedSha256, protocol.cost, protocol.sourceSha256]));
writeFileSync(`${output}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });
const evidencePath = `${output}/contexts.jsonl`;
writeFileSync(evidencePath, "", { flag: "wx" });
const blank = () => ({ qualified: 0, failed: 0, insufficient: 0, unknown: 0, parentMissing: 0 });
const counters = () => ({ main: blank(), inverseMain: blank(), real: blank(), inverseReal: blank(), active: blank(), inverseActive: blank() });
const stats = () => ({ historical: { base: 0, main: 0, inverseMain: 0, mainGp: 0, mainGl: 0,
  inverseGp: 0, inverseGl: 0 }, decisions: counters(), stages: Object.fromEntries(["main", "inverseMain", "real", "inverseReal", "active", "inverseActive"].map((s) => [s, []])) });
const cases = new Map();
for (const b of samples) for (const m of samples) cases.set(`${b}|${m}`, stats());
const rowsOf = (trades) => trades.map((t) => ({ orderId: `${t.side}|${t.entryT}`, entryT: t.entryT, exitT: t.exitT, knownT: t.exitT, unitReturn: t.r }))
  .sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || a.orderId.localeCompare(b.orderId));
const before = (rows, t) => { let a = 0, b = rows.length; while (a < b) { const mid = (a + b) >>> 1; if (rows[mid].exitT < t) a = mid + 1; else b = mid; } return rows.slice(Math.max(0, a - 50), a); };
const policy = (n) => ({ primaryN: 50, secondaryN: n, secondaryMode: "static", secondaryWindows: samples });
const gate = (rows, t, n) => dualStageGate(before(rows, t), policy(n), minPf, t);
const compact = (g) => ({ state: g.state, primary: { n: g.primary.n, pf: g.primary.pf }, secondary: g.secondary.map((w) => ({ requestedN: w.requestedN, n: w.n, pf: w.pf })) });
const records = (result) => [...result.trades.map((t) => ({ ...t, closed: true })), ...(result.open ? [{ cfg: result.open.cfg,
  sym: result.open.sym, side: result.open.side, kind: kindOfId(result.open.cfg), entryT: result.open.entryT, exitT: end, entry: result.open.entry,
  r: result.open.mtm * (result.open.w ?? 1), closed: false, markedOpen: true }] : [])];
const entriesOf = (result) => new Set(records(result).map((t) => t.entryT));
const addStage = (acc, name, result) => acc.stages[name].push(...records(result).filter((t) => t.entryT >= start && t.entryT < end));
const mirror = (result, set, sourceRows, name, acc, decisions) => {
  const passing = new Set();
  for (const t of records(result)) {
    const g = singleStageGate(before(sourceRows, t.entryT), 15, minPf, t.entryT);
    if (t.entryT >= start) { acc.decisions[name][g.state]++; decisions.push({ entryT: t.entryT, state: g.state, n: g.primary.n, pf: g.primary.pf }); }
    if (g.state === "qualified") passing.add(t.entryT);
  }
  const selected = { ...result, setId: set.id, parentSetId: set.parentSetId, admissionPolicy: set.admissionPolicy,
    trades: result.trades.filter((t) => passing.has(t.entryT)), open: result.open && passing.has(result.open.entryT) ? result.open : null };
  addStage(acc, name, selected);
  return selected;
};
const summarize = (orders) => {
  const closed = orders.filter((t) => t.closed), held = orders.filter((t) => !t.closed);
  let gp = 0, gl = 0; const reasons = {};
  for (const t of closed) { if (!Number.isFinite(t.r)) throw new Error("unknown closed model result");
    gp += Math.max(0, t.r); gl += Math.max(0, -t.r); reasons[t.reason] = (reasons[t.reason] ?? 0) + 1; }
  return { ...positionOrderCounts(closed, held), grossProfit: gp, grossLoss: gl,
    returnPf: closed.length && gl > 0 ? gp / gl : null, noLoss: closed.length > 0 && gp > 0 && gl === 0, reasons };
};
let contextCount = 0, maxHeap = 0, maxRss = 0;
const started = performance.now();
for (const sym of symbols) {
  const minutes = (feed.candles[`${sym}|1`] ?? []).filter((c) => c.t >= from && c.t < end);
  if (minutes.length !== 96 * 60 || minutes.some((c, i) => c.t !== from + i * M)) throw new Error(`incomplete minute data for ${sym}`);
  for (const tf of protocol.tfs) {
    const bars = barsFromCandles(sym, tf, tf === 1 ? minutes : resample(minutes, 1, tf)), cache = new SeriesCache(bars);
    for (const window of [1, 6]) for (const method of ["edge-turn", "failed-break", "breakout", "mid-reclaim", "compression-break"])
      for (const relation of ["standalone", "trend"]) {
        const ind = `low-range-${window}-${method}-${relation}@m${tf}`, state = lowRangeState(cache, window, method, relation), onset = new Int8Array(bars.n);
        for (let i = 1; i < bars.n; i++) if (state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
        for (const ref of lowRangeProtects({ ...DEFAULT_LOW_RANGE_POLICY, steps: [3], slRatios: [1], trailRatios: [0, .5], tags: [range] })) {
          const p = laneProtect({ ...ref, hold: Math.max(1, Math.floor(holdMinutes / tf)), maxHoldMin: holdMinutes }, ind),
            kind = p.trail ? "trailing" : "normal", cfg = configId("follow", ind, p);
          for (const side of [1, -1]) {
            const signal = sideSignal(onset, side), raw = simulate(cfg, bars, signal, p, { cost: protocol.cost }), rawRows = rowsOf(raw.trades);
            const context = { cfg, sym, side, tf, kind, relation, raw, bases: {} };
            for (const b of samples) {
              const chainSettings = { ...structuredClone(DEFAULT_STAGE_CHAIN), enabled: true, base: policy(b), main: policy(15) },
                identity = { baseConfigId: cfg, symbol: sym, side, kind, lane: relation,
                  economicRevision: protocol.economicRevision },
                book = new StageChainBook("model", chainSettings), base = book.base(identity, minPf),
                mainSet = book.main(base.id, "no-additional-strategies"), inverseSet = book.inverseMain(mainSet.id, "negative-main-inverse");
              const source = { cfg, bars, side, signal, protect: p, cost: protocol.cost, kind }, mainDecisions = [], inverseDecisions = [];
              const main = simulateStageSource(mainSet, source, (e) => {
                const g = gate(rawRows, e.entryT, b);
                if (e.entryT >= start) mainDecisions.push({ entryT: e.entryT, ...compact(g) });
                return g.state === "qualified";
              }), mainRows = rowsOf(main.trades), mainEntries = entriesOf(main);
              const inverseMain = simulateStageSource(inverseSet, source, (e) => {
                if (!mainEntries.has(e.entryT)) { if (e.entryT >= start) inverseDecisions.push({ entryT: e.entryT, state: "parentMissing" }); return false; }
                const n = negativeMainTrigger(before(mainRows, e.entryT), DEFAULT_STAGE_CHAIN, minPf, e.entryT);
                const state = n.qualified ? "qualified" : n.primary.state === "insufficient" || n.windows.some((w) => w.state === "insufficient") ? "insufficient" : "failed";
                if (e.entryT >= start) inverseDecisions.push({ entryT: e.entryT, state, primaryPf: n.primary.pf, mean: n.mean });
                return n.qualified;
              }), inverseRows = rowsOf(inverseMain.trades), inverseEntries = entriesOf(inverseMain);
              const data = { main, inverseMain, mainDecisions, inverseDecisions, cases: {} };
              context.bases[b] = data;
              for (const m of samples) {
                const acc = cases.get(`${b}|${m}`), decisions = { real: [], inverseReal: [], active: [], inverseActive: [] };
                const caseBook = new StageChainBook("model", { ...chainSettings, main: policy(m) }), caseBase = caseBook.base(identity, minPf),
                  caseMain = caseBook.main(caseBase.id, mainSet.processingId), caseInverse = caseBook.inverseMain(caseMain.id, inverseSet.processingId),
                  realSet = caseBook.real(caseMain.id, "no-overall-strategies"), inverseRealSet = caseBook.real(caseInverse.id, "no-overall-strategies");
                if (caseMain.id !== mainSet.id || caseInverse.id !== inverseSet.id) throw new Error("changed downstream gate altered its predecessor source identity");
                const simReal = (set, rows, parent, name) => simulateStageSource(set, source, (e) => {
                  if (!parent.has(e.entryT)) { if (e.entryT >= start) decisions[name].push({ entryT: e.entryT, state: "parentMissing" }); return false; }
                  const g = gate(rows, e.entryT, m);
                  if (e.entryT >= start) decisions[name].push({ entryT: e.entryT, ...compact(g) });
                  return g.state === "qualified";
                });
                const real = simReal(realSet, mainRows, mainEntries, "real"), inverseReal = simReal(inverseRealSet, inverseRows, inverseEntries, "inverseReal"),
                  active = mirror(real, caseBook.active(realSet.id), rowsOf(real.trades), "active", acc, decisions.active),
                  inverseActive = mirror(inverseReal, caseBook.active(inverseRealSet.id), rowsOf(inverseReal.trades), "inverseActive", acc, decisions.inverseActive);
                for (const [name, result] of Object.entries({ main, inverseMain, real, inverseReal })) addStage(acc, name, result);
                for (const d of mainDecisions) acc.decisions.main[d.state]++;
                for (const d of inverseDecisions) acc.decisions.inverseMain[d.state]++;
                for (const name of ["real", "inverseReal"]) for (const d of decisions[name]) acc.decisions[name][d.state]++;
                const bg = gate(rawRows, start, b), mg = gate(mainRows, start, m), ig = gate(inverseRows, start, m);
                if (bg.state === "qualified") { acc.historical.base++;
                  if (mg.state === "qualified") { acc.historical.main++; acc.historical.mainGp += mg.primary.gp; acc.historical.mainGl += mg.primary.gl; }
                  if (ig.state === "qualified") { acc.historical.inverseMain++; acc.historical.inverseGp += ig.primary.gp; acc.historical.inverseGl += ig.primary.gl; } }
                data.cases[m] = { real, inverseReal, active, inverseActive, decisions, checkpoint: { base: compact(bg), main: compact(mg), inverseMain: compact(ig) } };
              }
            }
            appendFileSync(evidencePath, JSON.stringify(context) + "\n"); contextCount++;
          }
        }
      }
  }
  const mem = process.memoryUsage(); maxHeap = Math.max(maxHeap, mem.heapUsed); maxRss = Math.max(maxRss, mem.rss);
  process.stderr.write(`${sym}: ${contextCount}/4800 contexts, ${Math.round(mem.rss / 1048576)} MiB RSS\n`);
}
if (contextCount !== 4800) throw new Error(`incomplete context count ${contextCount}`);
const results = [];
for (const [key, acc] of cases) {
  const [baseSecondaryN, mainSecondaryN] = key.split("|").map(Number), h = acc.historical;
  results.push({ baseSecondaryN, mainSecondaryN, contexts: contextCount, historical: { ...h,
    mainPercentOfBase: h.base ? 100 * h.main / h.base : null, mainPf: h.mainGl ? h.mainGp / h.mainGl : null,
    inverseMainPercentOfBase: h.base ? 100 * h.inverseMain / h.base : null, inverseMainPf: h.inverseGl ? h.inverseGp / h.inverseGl : null },
    decisions: Object.fromEntries(Object.entries(acc.decisions).map(([name, d]) => { const evaluated = Object.values(d).reduce((a, n) => a + n, 0);
      return [name, { ...d, evaluated, percent: evaluated ? 100 * d.qualified / evaluated : null }]; })),
    stages: Object.fromEntries(Object.entries(acc.stages).map(([name, orders]) => [name, summarize(orders)])),
    groups: Object.fromEntries(["normal", "trailing"].flatMap((kind) => protocol.tfs.map((tf) => [`${kind}|${tf}`,
      Object.fromEntries(Object.entries(acc.stages).map(([name, orders]) => [name, summarize(orders.filter((o) =>
        o.kind === kind && o.cfg.includes(`@m${tf}|`)))]))]))),
  });
}
writeFileSync(`${output}/results.json`, JSON.stringify({ contextCount, elapsedSeconds: (performance.now() - started) / 1000,
  memory: { maxSampledHeapBytes: maxHeap, maxSampledRssBytes: maxRss }, cases: results }, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify({ contexts: contextCount, cases: results.length, evidencePath }) + "\n");
