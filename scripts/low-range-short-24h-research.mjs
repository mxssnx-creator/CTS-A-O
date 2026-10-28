#!/usr/bin/env node
// Fixed, unallocated 24-hour Low-Range research probe; see PROTOCOL-SHORT.md.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync, writeSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { LOW_RANGE_WINDOWS, LOW_RANGE_METHODS, LOW_RANGE_RELATIONS, lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from "../src/core/indications/low-range-research.ts";
import { rangeCellPass, configId, laneProtect } from "../src/core/pipeline/pipeline.ts";
import { compareTapeTrades, configDirectionEval, defaultWalkForward, lastNOk, makeTape } from "../src/core/sim/walkforward.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { statsOf, settledHourT } from "../src/core/metrics/stats.ts";
import { minPfOf } from "../src/core/minimal-coord.ts";

const output = process.argv[2] ?? "runs/low-range-24h-20261027";
const windowScreen = process.argv.includes("--window-screen");
const integerOption = (name, fallback) => {
  const raw = process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`--${name} must be a nonnegative integer`);
  return value;
};
if (existsSync(`${output}/protocol.json`)) throw new Error("Use a fresh output directory");
const sha = (x) => createHash("sha256").update(x).digest("hex");
const H = 3600000, M = 60000;
const evalFrom = Date.parse("2026-10-08T12:00:00Z"), start = evalFrom + 24 * H, end = start + 24 * H, warm = evalFrom - 24 * H;
const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const feedBytes = readFileSync(feedPath), feed = JSON.parse(gunzipSync(feedBytes));
const symbols = feed.tickers.map((x) => x.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("Expected exactly 20 symbols");
const policy = windowScreen
  ? { ...DEFAULT_LOW_RANGE_POLICY, steps: [3], slRatios: [1], trailRatios: [0, 0.5], tags: ["sh"] }
  : { ...DEFAULT_LOW_RANGE_POLICY, tags: ["sh"] };
const protects = lowRangeProtects(policy), tfs = [1, 5, 15];
const candidateHoldMin = windowScreen ? 60 : 180;
const memoryLimit = Number(readFileSync("/sys/fs/cgroup/memory.max", "utf8"));
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const validLastN = integerOption("valid-last-n", defaults.validLastN ?? 0);
const rangeLastN = integerOption("range-last-n", defaults.rangeGate?.lastN ?? 0);
const baseLastN = integerOption("base-last-n", 0);
const o = { ...defaults, preH: 24, simH: 24, longH: 24, validLastN,
  rangeGate: defaults.rangeGate ? { ...defaults.rangeGate, lastN: rangeLastN } : undefined };
const countPerStep = Object.fromEntries(policy.steps.map((step) => [step, protects.filter((p) => Math.round((p.tp - policy.cost) / policy.step) === step).length]));
const protocol = {
  schema: "cts-low-range-short-24h-research-v1",
  scope: windowScreen
    ? "unallocated all-window candidate screen with matched 60m Normal TP and trailing reference cells, not production or venue execution"
    : "unallocated independent candidate tapes, not production or venue execution",
  windowScreen,
  frozenAt: new Date().toISOString(),
  hashes: { source: sha(readFileSync("src/core/indications/low-range-research.ts")), tests: sha(readFileSync("src/core/indications/low-range-research.test.ts")),
    runner: sha(readFileSync("scripts/low-range-short-24h-research.mjs")), description: sha(readFileSync("docs/low-range-research-20261027/PROTOCOL-SHORT.md")), feed: sha(feedBytes) },
  feed: { path: feedPath, provider: "Previously examined cached Binance USD-M minute candles; retrospective, not a fresh holdout" },
  symbols, warm, evalFrom, start, end, tfs, policy, methods: LOW_RANGE_METHODS, relations: LOW_RANGE_RELATIONS, windows: LOW_RANGE_WINDOWS,
  requestedPerSignalLane: policy.steps.length * policy.slRatios.length * policy.trailRatios.length * policy.tags.length,
  candidateHoldMin,
  distinctPerSignalLane: protects.length, countPerStep,
  totalCells: protects.length * LOW_RANGE_WINDOWS.length * LOW_RANGE_METHODS.length * LOW_RANGE_RELATIONS.length * tfs.length,
  gates: o.gates, baseLastN, validLastN: o.validLastN, rangeGate: o.rangeGate, preH: o.preH, longH: o.longH,
};
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });
const sourceBars = new Map();
for (const sym of symbols) {
  const minute = feed.candles[`${sym}|1`]?.filter((c) => c.t >= warm && c.t < end) ?? [];
  if (minute.length !== 72 * 60 || minute.some((c, i) => c.t !== warm + i * M)) throw new Error(`Incomplete source candles for ${sym}`);
  for (const tf of tfs) {
    const candles = tf === 1 ? minute : resample(minute, 1, tf);
    if (candles.length !== 72 * 60 / tf || candles.some((c, i) => c.t !== warm + i * tf * M)) throw new Error(`Incomplete ${tf}m bars for ${sym}`);
    sourceBars.set(`${sym}|${tf}`, barsFromCandles(sym, tf, candles));
  }
}
const blank = () => ({ cells: 0, basePassed: 0, activeConfigs: 0, contexts: 0, validated: 0, historicalGp: 0, historicalGl: 0,
  forwardCandidates: 0, forwardGatePassed: 0, forwardGateRejected: 0, forwardGateFailures: {},
  settled: 0, long: 0, short: 0, openAtEnd: 0, wins: 0, losses: 0, flat: 0, gp: 0, gl: 0, failureReasons: {} });
const total = blank(), byStep = {}, byStepTf = {}, byStepRange = {}, byStepMethod = {}, byStepHour = {}, byStrategy = {}, byStrategyTf = {};
const group = (obj, key) => obj[key] ??= blank();
const hourGroup = (step, time) => group(byStepHour, `${step}|${time}`);
const ledgerFile = `${output}/cells.jsonl.gz`, ledger = openSync(ledgerFile, "wx");
const begun = performance.now();
let peakRss = process.memoryUsage().rss, peakCgroup = 0;
const pf = (gp, gl, n) => !n ? null : gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null;
const bump = (groups, key, amount = 1) => { for (const b of groups) b[key] += amount; };
try {
  for (const tf of tfs) for (const window of LOW_RANGE_WINDOWS) for (const method of LOW_RANGE_METHODS) for (const relation of LOW_RANGE_RELATIONS) {
    const ind = `low-range-${window}-${method}-${relation}@m${tf}`;
    const bb = symbols.map((sym) => sourceBars.get(`${sym}|${tf}`));
    const signals = bb.map((bars) => {
      const state = lowRangeState(new SeriesCache(bars), window, method, relation), onset = new Int8Array(bars.n);
      for (let i = 1; i < bars.n; i++) if (bars.t[i] + tf * M >= evalFrom && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
      return [sideSignal(onset, 1), sideSignal(onset, -1)];
    });
    const lineBuffer = [];
    const holdBars = Math.max(1, Math.floor(candidateHoldMin / tf));
    for (const ref of protects) {
      const heldRef = { ...ref, hold: holdBars, maxHoldMin: candidateHoldMin };
      const p = laneProtect(heldRef, ind), id = configId("follow", ind, p), trades = [], opens = [];
      const step = Math.round((p.tp - policy.cost) / policy.step);
      const strategy = p.trail ? "trailing" : "normal";
      const groups = [total, group(byStep, String(step)), group(byStepTf, `${step}|${tf}`),
        group(byStepRange, `${step}|${p.tag}`), group(byStepMethod, `${step}|${method}`),
        group(byStrategy, strategy), group(byStrategyTf, `${strategy}|${tf}`)];
      for (let s = 0; s < bb.length; s++) for (let side = 0; side < 2; side++) {
        const result = simulate(id, bb[s], signals[s][side], p, { cost: policy.cost });
        trades.push(...result.trades);
        if (result.open) opens.push(result.open);
      }
      trades.sort(compareTapeTrades);
      const tape = makeTape(id, "follow", ind, p, p.trail ? "trailing" : "normal", symbols, trades, opens, []);
      const baseTrades = trades.filter((t) => t.entryT >= evalFrom && t.exitT < start);
      const initial = statsOf(baseTrades, start);
      const basePfFloor = minPfOf(o.gates, p.tag, ind);
      const baseLastTrades = baseLastN > 0 ? baseTrades.slice(-baseLastN) : [];
      const baseLastStats = baseLastN > 0 ? statsOf(baseLastTrades, start) : null;
      const baseLastNPass = baseLastN <= 0 || lastNOk(tape, start, baseLastN, basePfFloor,
        0, 0, o.gates.lastNFloor ?? 0, o.gates.warmup !== false);
      const basePassed = rangeCellPass(o.gates, ind)(p.tag, initial) && baseLastNPass;
      const row = { ind, tf, step, method, relation, window, tag: p.tag, protect: p,
        base: { n: initial.n, pf: initial.n ? initial.pf : null, noLoss: initial.n > 0 && initial.gl === 0 && initial.gp > 0,
          lastN: baseLastN ? { n: baseLastStats.n, pf: baseLastStats.n ? baseLastStats.pf : null,
            net: baseLastStats.net, passed: baseLastNPass } : null, passed: basePassed },
        initiallyValidated: null, directions: [] };
      bump(groups, "cells");
      if (basePassed) {
        bump(groups, "basePassed");
        const verdictCache = new Map();
        const initialBySide = new Map([1, -1].map((side) => [side, configDirectionEval(tape, start, o, side)]));
        const initiallyValidated = [...initialBySide.values()].some((ev) => ev.ok);
        row.initiallyValidated = initiallyValidated;
        if (initiallyValidated) bump(groups, "activeConfigs");
        for (const side of [1, -1]) {
          bump(groups, "contexts");
          const ev = initialBySide.get(side);
          if (ev.ok) { bump(groups, "validated"); bump(groups, "historicalGp", ev.gp ?? 0); bump(groups, "historicalGl", ev.gl ?? 0); }
          else for (const g of groups) g.failureReasons[ev.fail] = (g.failureReasons[ev.fail] ?? 0) + 1;
          const qualifies = (at) => {
            const key = `${side}|${at}`;
            if (!verdictCache.has(key)) verdictCache.set(key, configDirectionEval(tape, at, o, side));
            return verdictCache.get(key);
          };
          // Runtime validated-seat mode starts from the config IDs in V. Do not let a Base-passed but never
          // initially validated config drift into the forward screen merely because it later recovers.
          const entryCandidates = initiallyValidated
            ? trades.filter((t) => t.side === side && t.entryT >= start && t.entryT < end) : [];
          const gateRejectedBy = {};
          let gatePassed = 0;
          for (const t of entryCandidates) {
            const verdict = qualifies(t.entryT);
            if (verdict.ok) gatePassed++;
            else gateRejectedBy[verdict.fail] = (gateRejectedBy[verdict.fail] ?? 0) + 1;
          }
          for (const g of groups) {
            g.forwardCandidates += entryCandidates.length;
            g.forwardGatePassed += gatePassed;
            g.forwardGateRejected += entryCandidates.length - gatePassed;
            for (const [reason, count] of Object.entries(gateRejectedBy))
              g.forwardGateFailures[reason] = (g.forwardGateFailures[reason] ?? 0) + count;
          }
          const selected = entryCandidates.filter((t) => t.exitT <= end && qualifies(t.entryT).ok);
          const held = initiallyValidated
            ? opens.filter((t) => t.side === side && t.entryT >= start && qualifies(t.entryT).ok) : [];
          bump(groups, "openAtEnd", held.length);
          let gp = 0, gl = 0;
          for (const t of selected) {
            const gain = Math.max(0, t.r), loss = Math.max(0, -t.r);
            gp += gain; gl += loss;
            const time = settledHourT(t.exitT);
            if (time < start || time >= end) throw new Error("Close outside declared 24-hour window");
            const all = [...groups, hourGroup(step, time)];
            bump(all, "settled"); bump(all, side === 1 ? "long" : "short");
            bump(all, t.r > 0 ? "wins" : t.r < 0 ? "losses" : "flat"); bump(all, "gp", gain); bump(all, "gl", loss);
          }
          row.directions.push({ side, initial: ev.ok ? { passed: true, n: ev.n, pf: ev.pf, gp: ev.gp, gl: ev.gl } : { passed: false, n: ev.n, fail: ev.fail },
            forwardGate: { candidates: entryCandidates.length, passed: gatePassed, rejectedBy: gateRejectedBy },
            forward: { settled: selected.length, gp, gl, openAtEnd: held.length } });
        }
      }
      lineBuffer.push(JSON.stringify(row));
    }
    writeSync(ledger, gzipSync(Buffer.from(lineBuffer.join("\n") + "\n"), { level: 1 }));
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    try { peakCgroup = Math.max(peakCgroup, Number(readFileSync("/sys/fs/cgroup/memory.current", "utf8"))); } catch { /* host has no cgroup counter */ }
    if (peakRss > 6_100_000_000 || (memoryLimit > 0 && peakCgroup > memoryLimit * 0.9))
      throw new Error(`memory safeguard: process RSS ${peakRss}, cgroup ${peakCgroup} of ${memoryLimit} bytes`);
    writeFileSync(`${output}/progress.json`, JSON.stringify({ completedCells: total.cells, totalCells: protocol.totalCells,
      lastIndication: ind, elapsedMs: performance.now() - begun, peakRss, peakCgroup }) + "\n");
    process.stderr.write(`${ind}: ${total.cells}/${protocol.totalCells} cells · validated ${total.validated}/${total.contexts}\n`);
  }
  if (total.cells !== protocol.totalCells) throw new Error("Grid did not complete");
  for (const b of [total, ...Object.values(byStep), ...Object.values(byStepTf), ...Object.values(byStepRange), ...Object.values(byStepMethod),
    ...Object.values(byStepHour), ...Object.values(byStrategy), ...Object.values(byStrategyTf)]) {
    b.historicalPf = pf(b.historicalGp, b.historicalGl, b.validated);
    b.validatedPct = b.contexts ? 100 * b.validated / b.contexts : null;
    b.forwardPf = pf(b.gp, b.gl, b.settled);
  }
  const results = { schema: protocol.schema, status: "completed", scope: protocol.scope, total, byStep, byStepTf, byStepRange, byStepMethod, byStepHour, byStrategy, byStrategyTf,
    elapsedMs: performance.now() - begun, peakRss, peakCgroup };
  closeSync(ledger);
  results.ledgerSha256 = sha(readFileSync(ledgerFile));
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: results.status, total, byStep, elapsedMs: results.elapsedMs, peakRss, peakCgroup, ledgerSha256: results.ledgerSha256 }));
} catch (e) {
  closeSync(ledger);
  writeFileSync(`${output}/failure.json`, JSON.stringify({ status: "incomplete", error: String(e), completedCells: total.cells,
    totalCells: protocol.totalCells, elapsedMs: performance.now() - begun, peakRss, peakCgroup }) + "\n", { flag: "wx" });
  throw e;
}
