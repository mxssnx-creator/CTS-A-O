#!/usr/bin/env node
// Reconcile a --window-screen --orders replay without changing its selection or return calculations.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { configId } from "../src/core/pipeline/pipeline.ts";

const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const near = (a, b, label) => requireValue(Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)), `${label}: ${a} != ${b}`);
const empty = () => ({ n: 0, gp: 0, gl: 0, reasons: {} });
function add(aggregate, order) {
  const gain = Math.max(0, order.r), loss = Math.max(0, -order.r);
  aggregate.n++; aggregate.gp += gain; aggregate.gl += loss;
  const reason = aggregate.reasons[order.reason] ??= { n: 0, gp: 0, gl: 0 };
  reason.n++; reason.gp += gain; reason.gl += loss;
}
function compareReasons(actual, expected, label) {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected ?? {})]);
  for (const key of keys) {
    const a = actual[key] ?? { n: 0, gp: 0, gl: 0 }, b = expected?.[key] ?? { n: 0, gp: 0, gl: 0 };
    requireValue(a.n === b.n, `${label} ${key}: close count differs`);
    near(a.gp, b.gp, `${label} ${key} gains`); near(a.gl, b.gl, `${label} ${key} losses`);
  }
}
function compareForward(actual, expected, label) {
  requireValue(actual.n === expected.settled, `${label}: close count differs`);
  near(actual.gp, expected.gp, `${label} gains`); near(actual.gl, expected.gl, `${label} losses`);
  compareReasons(actual.reasons, expected.exitReasons, label);
}

/** Scalar OHLC check: barriers precede time exits and a completed bar ratchets the next bar's stop. */
export function auditPricePath(order, protect, bars) {
  requireValue(!protect.atr && !protect.trailOnly && !protect.exitType, "unsupported protection for price-path audit");
  requireValue(bars.length === order.bars && bars.length > 0, `missing bars: ${order.cfg}`);
  near(bars[0].o, order.entry, `entry open ${order.cfg}`);
  let stop = order.entry * (1 - order.side * protect.sl);
  const target = order.entry * (1 + order.side * protect.tp);
  let peak = order.entry, armed = false, observed;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], gap = i > 0;
    requireValue(b.t === order.entryT + i * order.tf * 60_000 &&
      [b.o, b.h, b.l, b.c].every(Number.isFinite) && b.l > 0 && b.h >= Math.max(b.o, b.c) &&
      b.l <= Math.min(b.o, b.c), `invalid candle: ${order.cfg}`);
    const stopHit = order.side === 1 ? b.l <= stop : b.h >= stop;
    const targetHit = protect.tp > 0 && (order.side === 1 ? b.h >= target : b.l <= target) &&
      !(armed && protect.trailFree);
    if (stopHit) {
      observed = { reason: armed ? "trail" : "sl", exit: gap
        ? (order.side === 1 ? Math.min(b.o, stop) : Math.max(b.o, stop)) : stop };
    } else if (targetHit) {
      observed = { reason: "tp", exit: gap
        ? (order.side === 1 ? Math.max(b.o, target) : Math.min(b.o, target)) : target };
    } else if (i + 1 >= protect.hold) observed = { reason: "time", exit: b.c };
    if (observed) {
      requireValue(i === bars.length - 1, `an earlier bar closed ${order.cfg}`);
      requireValue(observed.reason === order.reason, `exit reason differs: ${order.cfg}`);
      near(observed.exit, order.exit, `exit price ${order.cfg}`);
      return;
    }
    if (protect.trail > 0) {
      peak = order.side === 1 ? Math.max(peak, b.h) : Math.min(peak, b.l);
      if (order.side * (peak - order.entry) / order.entry >= protect.trail) {
        armed = true;
        const next = peak * (1 - order.side * protect.trail * (protect.trailStep ?? 1));
        stop = order.side === 1 ? Math.max(stop, next) : Math.min(stop, next);
      }
    }
  }
  throw new Error(`no recorded exit was reached: ${order.cfg}`);
}

/** Checks exact config/side membership, one-time cost, exits and every stored per-direction/aggregate total. */
export function auditScreen(protocol, results, cells, orders) {
  requireValue(protocol.windowScreen === true && protocol.recordOrders === true, "expected a recorded window screen");
  requireValue(results.status === "completed", "screen is incomplete");
  requireValue(cells.length === protocol.totalCells && cells.length === results.total.cells, "cell inventory differs");
  const byConfig = new Map(), byDirection = new Map(), byStrategy = new Map(), byStrategyTf = new Map();
  let basePassed = 0, active = 0, contexts = 0, validated = 0, historicGp = 0, historicGl = 0;
  let candidates = 0, gatePassed = 0, gateRejected = 0, open = 0;
  for (const cell of cells) {
    const id = configId("follow", cell.ind, cell.protect);
    requireValue(!byConfig.has(id), `duplicate cell ${id}`);
    byConfig.set(id, cell);
    if (!cell.base.passed) continue;
    basePassed++;
    if (cell.initiallyValidated) active++;
    const sides = new Set();
    for (const direction of cell.directions) {
      requireValue((direction.side === 1 || direction.side === -1) && !sides.has(direction.side), `bad direction ${id}`);
      sides.add(direction.side); contexts++;
      if (direction.initial.passed) { validated++; historicGp += direction.initial.gp; historicGl += direction.initial.gl; }
      candidates += direction.forwardGate.candidates; gatePassed += direction.forwardGate.passed;
      gateRejected += direction.forwardGate.candidates - direction.forwardGate.passed;
      open += direction.forward.openAtEnd;
    }
    requireValue(sides.size === 2, `missing direction ${id}`);
  }
  const total = empty(), identities = new Set();
  for (const order of orders) {
    const cell = byConfig.get(order.cfg);
    requireValue(cell?.base.passed && cell.initiallyValidated, `order outside initial Active set: ${order.cfg}`);
    requireValue(order.ind === cell.ind && order.tf === cell.tf && protocol.symbols.includes(order.sym), `order context differs: ${order.cfg}`);
    requireValue(order.side === 1 || order.side === -1, `invalid side: ${order.cfg}`);
    const strategy = cell.protect.trail ? "trailing" : "normal";
    requireValue(order.strategy === strategy, `strategy differs: ${order.cfg}`);
    requireValue(order.entryT >= protocol.start && order.entryT < protocol.end &&
      order.exitT > order.entryT && order.exitT <= protocol.end, `order outside forward window: ${order.cfg}`);
    requireValue(Number.isFinite(order.entry) && order.entry > 0 && Number.isFinite(order.exit) && order.exit > 0,
      `invalid prices: ${order.cfg}`);
    requireValue(Number.isInteger(order.bars) && order.bars > 0 && order.bars <= cell.protect.hold &&
      order.exitT - order.entryT === order.bars * order.tf * 60_000, `invalid hold: ${order.cfg}`);
    requireValue(["time", "tp", "sl", "trail"].includes(order.reason), `unknown exit reason: ${order.reason}`);
    if (order.reason === "time") requireValue(order.bars === cell.protect.hold, `early time exit: ${order.cfg}`);
    if (order.reason === "trail") requireValue(cell.protect.trail > 0, `trail on Normal: ${order.cfg}`);
    const tolerance = 1e-8 * Math.max(1, order.entry);
    if (order.reason === "tp") requireValue((order.exit - order.entry * (1 + order.side * cell.protect.tp)) * order.side >= -tolerance,
      `target was not reached: ${order.cfg}`);
    if (order.reason === "sl") requireValue((order.exit - order.entry * (1 - order.side * cell.protect.sl)) * order.side <= tolerance,
      `stop was not reached: ${order.cfg}`);
    near(order.r, order.side * (order.exit - order.entry) / order.entry - protocol.policy.cost, `one-time cost ${order.cfg}`);
    const identity = JSON.stringify([order.cfg, order.sym, order.side, order.entryT]);
    requireValue(!identities.has(identity), `duplicate order ${identity}`); identities.add(identity);
    const dk = JSON.stringify([order.cfg, order.side]);
    if (!byDirection.has(dk)) byDirection.set(dk, empty());
    if (!byStrategy.has(strategy)) byStrategy.set(strategy, empty());
    const sk = `${strategy}|${cell.tf}`;
    if (!byStrategyTf.has(sk)) byStrategyTf.set(sk, empty());
    for (const group of [total, byDirection.get(dk), byStrategy.get(strategy), byStrategyTf.get(sk)]) add(group, order);
  }
  for (const [id, cell] of byConfig) for (const direction of cell.directions) {
    compareForward(byDirection.get(JSON.stringify([id, direction.side])) ?? empty(), direction.forward, `${id} side ${direction.side}`);
  }
  const summary = results.total;
  requireValue(basePassed === summary.basePassed && active === summary.activeConfigs && contexts === summary.contexts &&
    validated === summary.validated, "Base/validation inventory differs");
  requireValue(candidates === summary.forwardCandidates && gatePassed === summary.forwardGatePassed &&
    gateRejected === summary.forwardGateRejected && open === summary.openAtEnd, "forward gate inventory differs");
  near(historicGp, summary.historicalGp, "historical gains"); near(historicGl, summary.historicalGl, "historical losses");
  compareForward(total, summary, "total");
  for (const [key, row] of Object.entries(results.byStrategy)) compareForward(byStrategy.get(key) ?? empty(), row, key);
  for (const [key, row] of Object.entries(results.byStrategyTf)) compareForward(byStrategyTf.get(key) ?? empty(), row, key);
  return { cells: cells.length, basePassed, active, contexts, validated, candidates, gatePassed, gateRejected,
    settled: total.n, openAtEnd: open, gp: total.gp, gl: total.gl, exitReasons: total.reasons,
    scope: "model closes; entry-time gate verdicts are those recorded by the replay" };
}

function readLines(path) {
  const text = gunzipSync(readFileSync(path)).toString("utf8").trim();
  return text ? text.split("\n").map(JSON.parse) : [];
}
function digest(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function run(directory) {
  const protocol = JSON.parse(readFileSync(`${directory}/protocol.json`));
  const results = JSON.parse(readFileSync(`${directory}/results.json`));
  const sources = { source: "src/core/indications/low-range-research.ts", tests: "src/core/indications/low-range-research.test.ts",
    runner: "scripts/low-range-short-24h-research.mjs", description: "docs/low-range-research-20261027/PROTOCOL-SHORT.md",
    feed: protocol.feed.path, backtest: "src/core/sim/backtest.ts", walkforward: "src/core/sim/walkforward.ts",
    pipeline: "src/core/pipeline/pipeline.ts", config: "src/core/config.ts" };
  for (const [key, path] of Object.entries(sources)) requireValue(digest(path) === protocol.hashes[key], `source hash differs: ${key}`);
  requireValue(digest(`${directory}/cells.jsonl.gz`) === results.ledgerSha256, "cell ledger hash differs");
  requireValue(digest(`${directory}/orders.jsonl.gz`) === results.ordersSha256, "order ledger hash differs");
  const cells = readLines(`${directory}/cells.jsonl.gz`), orders = readLines(`${directory}/orders.jsonl.gz`);
  const summary = auditScreen(protocol, results, cells, orders);
  const feed = JSON.parse(gunzipSync(readFileSync(protocol.feed.path)));
  const configs = new Map(cells.map((c) => [configId("follow", c.ind, c.protect), c]));
  const cache = new Map();
  const laneBars = (sym, tf) => {
    const key = `${sym}|${tf}`;
    if (cache.has(key)) return cache.get(key);
    const minutes = (feed.candles[`${sym}|1`] ?? []).filter((c) => c.t >= protocol.warm && c.t < protocol.end);
    const expected = (protocol.end - protocol.warm) / 60_000;
    requireValue(minutes.length === expected && minutes.every((c, i) => c.t === protocol.warm + i * 60_000),
      `incomplete minute feed: ${sym}`);
    requireValue(minutes.length % tf === 0, `incomplete lane: ${sym}|${tf}`);
    const out = [];
    for (let i = 0; i < minutes.length; i += tf) {
      const group = minutes.slice(i, i + tf);
      out.push({ t: group[0].t, o: group[0].o, h: Math.max(...group.map((c) => c.h)),
        l: Math.min(...group.map((c) => c.l)), c: group.at(-1).c });
    }
    cache.set(key, out); return out;
  };
  for (const order of orders) {
    const bars = laneBars(order.sym, order.tf), i = (order.entryT - protocol.warm) / (order.tf * 60_000);
    requireValue(Number.isInteger(i) && i >= 0, `entry is not lane aligned: ${order.cfg}`);
    auditPricePath(order, configs.get(order.cfg).protect, bars.slice(i, i + order.bars));
  }
  return { directory, validationLastN: protocol.validLastN, baseLastN: protocol.baseLastN,
    ...summary, pricePathsChecked: orders.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  requireValue(process.argv.length > 2, "usage: audit-low-range-screen-orders.mjs <screen-dir> [...]");
  console.log(JSON.stringify(process.argv.slice(2).map(run), null, 2));
}
