#!/usr/bin/env node
// Apply the sealed Base-40 screen to the real walk-forward selector and entry gates; no live orders or funding.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState } from "../src/core/indications/low-range-research.ts";
import { configId, makeUniverse, protectCellKey } from "../src/core/pipeline/pipeline.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { compareTapeTrades, defaultWalkForward, makeTape, passedCellsOf, tapeTrades, walkForward } from "../src/core/sim/walkforward.ts";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { positionOrderCounts } from "../src/core/positions.ts";
import { auditScreen } from "./audit-low-range-screen-orders.mjs";

const [out, ...dirs] = process.argv.slice(2);
if (!out || dirs.length !== 1 || existsSync(out))
  throw new Error("usage: low-range-base40-runtime-replay.mjs <fresh-output-dir> <validation-12-dir>");
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const read = (path) => JSON.parse(readFileSync(path));
const lines = (path) => { const s = gunzipSync(readFileSync(path)).toString("utf8").trim(); return s ? s.split("\n").map(JSON.parse) : []; };
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const screens = dirs.map((dir) => {
  const protocol = read(`${dir}/protocol.json`), result = read(`${dir}/results.json`);
  const cells = lines(`${dir}/cells.jsonl.gz`), orders = lines(`${dir}/orders.jsonl.gz`);
  requireValue(hash(`${dir}/cells.jsonl.gz`) === result.ledgerSha256 && hash(`${dir}/orders.jsonl.gz`) === result.ordersSha256,
    `ledger hash differs: ${dir}`);
  auditScreen(protocol, result, cells, orders);
  for (const [key, path] of Object.entries({ source: "src/core/indications/low-range-research.ts", runner: "scripts/low-range-short-24h-research.mjs",
    feed: protocol.feed.path, backtest: "src/core/sim/backtest.ts", walkforward: "src/core/sim/walkforward.ts",
    pipeline: "src/core/pipeline/pipeline.ts", config: "src/core/config.ts" }))
    requireValue(hash(path) === protocol.hashes[key], `source hash differs: ${key}`);
  return { dir, protocol, result, cells };
});
for (let i = 0; i < screens.length; i++)
  requireValue(screens[i].protocol.baseLastN === 40 && screens[i].protocol.validLastN === 12, "unexpected Last-N settings");
const p = screens[0].protocol;
requireValue(p.windowScreen && p.rangeGate?.lastN === 75 && p.policy.cost === DEFAULT_SETTINGS.cost, "unexpected screen policy");
const idOf = (row) => configId("follow", row.ind, row.protect);
const baseRows = screens[0].cells.filter((row) => row.base.passed);
const baseIds = new Set(baseRows.map(idOf));
requireValue(baseIds.size === baseRows.length && baseIds.size === screens[0].result.total.basePassed, "invalid Base cells");
for (const screen of screens.slice(1)) {
  const ids = new Set(screen.cells.filter((row) => row.base.passed).map(idOf));
  requireValue(ids.size === baseIds.size && [...ids].every((id) => baseIds.has(id)), "Base cohorts differ across arms");
  requireValue(screen.protocol.hashes.feed === p.hashes.feed && screen.protocol.start === p.start && screen.protocol.end === p.end,
    "feed or window differs across arms");
}
const feed = JSON.parse(gunzipSync(readFileSync(p.feed.path)));
const barsByKey = new Map(), cacheByKey = new Map(), signalsByKey = new Map(), bars = [];
for (const sym of p.symbols) {
  const minutes = (feed.candles[`${sym}|1`] ?? []).filter((c) => c.t >= p.warm && c.t < p.end);
  requireValue(minutes.length === (p.end - p.warm) / 60_000 && minutes.every((c, i) => c.t === p.warm + i * 60_000),
    `incomplete feed: ${sym}`);
  for (const tf of p.tfs) {
    const candles = tf === 1 ? minutes : resample(minutes, 1, tf);
    const b = barsFromCandles(sym, tf, candles), key = `${sym}|${tf}`;
    barsByKey.set(key, b); cacheByKey.set(key, new SeriesCache(b)); bars.push(b);
  }
}
const universe = makeUniverse(bars, p.evalFrom);
requireValue(universe.nowT === p.end && universe.startT === p.evalFrom, "universe window differs");
const tapes = [], pairCells = {}, pairRanges = {};
for (const row of baseRows) {
  const id = idOf(row), pair = `follow|${row.ind}`, trades = [], opens = [];
  (pairCells[pair] ??= []).push(protectCellKey(row.protect));
  pairRanges[pair] = [row.protect.tag];
  for (const sym of p.symbols) {
    const key = `${sym}|${row.tf}`, b = barsByKey.get(key), signalKey = `${key}|${row.ind}`;
    let signals = signalsByKey.get(signalKey);
    if (!signals) {
      const state = lowRangeState(cacheByKey.get(key), row.window, row.method, row.relation), onset = new Int8Array(b.n);
      for (let i = 1; i < b.n; i++)
        if (b.t[i] + row.tf * 60_000 >= p.evalFrom && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
      signals = [sideSignal(onset, 1), sideSignal(onset, -1)]; signalsByKey.set(signalKey, signals);
    }
    for (const signal of signals) {
      const result = simulate(id, b, signal, row.protect, { cost: p.policy.cost });
      trades.push(...result.trades); if (result.open) opens.push(result.open);
    }
  }
  trades.sort(compareTapeTrades);
  tapes.push(makeTape(id, "follow", row.ind, row.protect, row.protect.trail ? "trailing" : "normal", p.symbols, trades, opens, []));
}
const tapeById = new Map(tapes.map((t) => [t.id, t])), tapeRows = new Map();
const keyOf = (t) => JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT]);
for (const tape of tapes) for (const trade of tapeTrades(tape)) {
  const key = keyOf(trade); requireValue(!tapeRows.has(key), `duplicate tape close: ${key}`); tapeRows.set(key, trade);
}
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
requireValue(JSON.stringify(defaults.gates) === JSON.stringify(p.gates), "runtime gate settings differ from screen");
const baseOptions = { ...defaults, startT: p.start, simH: 24, preH: 24, longH: 24, stepH: 1,
  rangeGate: p.rangeGate, basePassed: new Set(Object.keys(pairCells)), basePassedCells: passedCellsOf(pairCells),
  basePassedRanges: pairRanges, seatSet: "validated", recordValidation: true,
  toggles: { ...defaults.toggles, normal: true, trailing: true, exit: false, block: false, blockActive: false,
    dca: false, dcaActive: false, axis: false },
  relate: { ...defaults.relate, enabled: false } };
const summarize = (trades) => {
  let gp = 0, gl = 0, wins = 0, losses = 0;
  const reasons = {}, byKind = {}, byTf = {}, bySide = {};
  const add = (groups, key, r) => { const g = groups[key] ??= { n: 0, gp: 0, gl: 0 }; g.n++; g.gp += Math.max(0, r); g.gl += Math.max(0, -r); };
  for (const t of trades) {
    const r = modeledUnitReturn(t); requireValue(Number.isFinite(r), `unknown modeled unit return: ${t.cfg}`);
    gp += Math.max(0, r); gl += Math.max(0, -r); if (r > 0) wins++; else if (r < 0) losses++;
    add(reasons, t.reason, r); add(byKind, tapeById.get(t.cfg).kind, r);
    add(byTf, String(Number(/@m(\d+)/.exec(t.cfg)?.[1])), r); add(bySide, String(t.side), r);
  }
  for (const group of [reasons, byKind, byTf, bySide]) for (const x of Object.values(group))
    x.pf = x.gl > 0 ? x.gp / x.gl : x.gp > 0 ? "no-loss" : null;
  return { closes: trades.length, wins, losses, gp, gl, net: gp - gl, pf: gl > 0 ? gp / gl : gp > 0 ? "no-loss" : null,
    reasons, byKind, byTf, bySide };
};
mkdirSync(out, { recursive: true });
const manifest = { scope: "retrospective unallocated walk-forward; Base-40 is a counterfactual screen, not a production Base setting",
  feedSha256: p.hashes.feed, baseCells: baseIds.size, evaluatedCells: p.totalCells, start: p.start, end: p.end, evalFrom: p.evalFrom,
  rangeGate: p.rangeGate, cost: p.policy.cost, scripts: { runner: hash("scripts/low-range-base40-runtime-replay.mjs"),
    backtest: hash("src/core/sim/backtest.ts"), walkforward: hash("src/core/sim/walkforward.ts") } };
writeFileSync(`${out}/protocol.json`, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
const arms = [];
for (const screen of screens) for (const coordination of ["default", "off"]) {
  const validLastN = screen.protocol.validLastN;
  const o = { ...baseOptions, validLastN, coord: coordination === "off" ? { ...defaults.coord, enabled: false } : defaults.coord };
  const result = walkForward(universe, tapes, o);
  const v = new Set(result.validated ?? []);
  const expectedV = new Set(screen.cells.filter((row) => row.initiallyValidated).map(idOf));
  requireValue(v.size === expectedV.size && [...v].every((id) => expectedV.has(id)), `initial V differs: ${validLastN}/${coordination}`);
  const seen = new Set();
  for (const trade of result.trades) {
    const key = keyOf(trade), source = tapeRows.get(key), r = modeledUnitReturn(trade);
    requireValue(v.has(trade.cfg) && source && !seen.has(key), `missing, duplicate or unvalidated close: ${key}`);
    requireValue(Number.isFinite(r) && Math.abs(r - source.r) <= 1e-7 &&
      Math.abs(trade.entry - source.entry) <= 1e-6 * Math.max(1, source.entry) &&
      Math.abs(trade.exit - source.exit) <= 1e-6 * Math.max(1, source.exit) && trade.reason === source.reason,
      `source tape mismatch: ${key}`);
    seen.add(key);
  }
  const stem = `validation-${validLastN}-coord-${coordination}`;
  const orderBytes = gzipSync(Buffer.from(result.trades.map((t) => JSON.stringify(t)).join("\n") + (result.trades.length ? "\n" : "")), { level: 9 });
  writeFileSync(`${out}/${stem}-orders.jsonl.gz`, orderBytes, { flag: "wx" });
  const orderSha256 = createHash("sha256").update(orderBytes).digest("hex");
  arms.push({ validLastN, coordination, initialValidated: v.size, initialHistoricalPf: screen.result.total.historicalPf,
    directionValidated: screen.result.total.validated, directionEvaluated: screen.result.total.contexts,
    effective: { entryLastN: o.lastN, rangeGate: o.rangeGate, symGate: o.symGate, symMinN: o.symMinN,
      mode: o.mode, seatPer: o.seatPer, coord: o.coord, maxOpen: o.maxOpen, maxPositions: o.maxPositions,
      maxPerSymbol: o.maxPerSymbol, maxPerSide: o.maxPerSide, toggles: o.toggles },
    modeled: summarize(result.trades), openAtEnd: result.openAtEnd.length, positionsAndOrders: positionOrderCounts(result.trades, result.openAtEnd),
    skips: result.skips, steps: result.steps.map((s) => ({ t: s.t, eligible: s.eligible, selected: s.real?.length ?? 0,
      taken: s.taken, skipped: s.skipped, checks: s.checks })), exactTapeMatches: seen.size, orderFile: `${stem}-orders.jsonl.gz`, orderSha256 });
}
writeFileSync(`${out}/results.json`, JSON.stringify({ ...manifest, arms }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(arms.map(({ validLastN, coordination, initialValidated, modeled, openAtEnd, skips, exactTapeMatches }) =>
  ({ validLastN, coordination, initialValidated, modeled, openAtEnd, skips, exactTapeMatches }))));
