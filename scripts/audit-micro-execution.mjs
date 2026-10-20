#!/usr/bin/env node
// Independent price-path and arithmetic audit of a completed session. Does not call the production simulator/PF.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { readSessionDump } from "./lib/session-dump.mjs";
import { parseConfigId, makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { barsFromCandles } from "../src/core/market/bars.ts";
import { entrySignal } from "../src/core/bots/bots.ts";
import { configEval, engineContextValid, makeTape } from "../src/core/sim/walkforward.ts";

const dir = process.argv[2];
if (!dir) throw new Error("audit-micro-execution.mjs SESSION_DIR");
const protocol = JSON.parse(readFileSync(`${dir}/protocol.json`));
const raw = await readSessionDump(`${dir}/raw.json`);
const feed = JSON.parse(readFileSync(protocol.feed.path));
const cost = protocol.actualSettings.cost;
assert.ok(cost >= 0 && cost <= 0.0015, "current modeled round trip must not exceed 0.15%");
const tfOf = (id) => Number(/@m(\d+)/.exec(id)?.[1] ?? 1);
const columns = new Map();
// Independently resample recorded native prices. Runtime candle/indicator columns retain Float64; only compact executed-tape prices use Float32.
for (const sym of protocol.symbols) for (const tf of [1, 5, 15]) {
  const groups = new Map();
  for (const c of feed.candles[`${sym}|1`]) {
    const t = Math.floor(c.t / (tf * 60_000)) * tf * 60_000;
    let row = groups.get(t);
    if (!row) { row = { t, o: c.o, h: -Infinity, l: Infinity, c: 0, v: 0, n: 0 }; groups.set(t, row); }
    row.h = Math.max(row.h, c.h); row.l = Math.min(row.l, c.l);
    row.c = c.c; row.v += c.v; row.n++;
  }
  columns.set(`${sym}|${tf}`, [...groups.values()].filter((x) => x.n === tf));
}
const universe = makeUniverse([...columns].map(([key, cs]) => {
  const [sym, tf] = key.split("|"); return { ...barsFromCandles(sym, Number(tf), cs), lanes: [1, 5, 15] };
}));
const parsed = new Map(), tapes = new Map();
for (const row of raw.tapeTrades) {
  const cfg = parseConfigId(row.id); assert.ok(cfg, row.id); parsed.set(row.id, cfg);
  const syms = [...new Set(row.trades.map((t) => t[0]))];
  const trades = row.trades.map(([sym, side, entryT, exitT, r]) =>
    ({ cfg: row.id, sym, side, entryT, exitT, r, entry: 1, exit: 1, reason: "time", bars: 1, mfe: 0, mae: 0, mult: 1 }));
  const kind = raw.trades.find((t) => t.cfg === row.id)?.kind ?? (cfg.protect.trail ? "trailing" : "normal");
  tapes.set(row.id, makeTape(row.id, cfg.bot, cfg.ind, cfg.protect, kind, syms, trades, [], []));
}
const violations = [], reasons = {}, bySource = {}, entryProof = [];
let gp = 0, gl = 0, maxReturnError = 0, replayed = 0, maxPriceError = 0, beforeCostGp = 0, beforeCostGl = 0;
const add = (key, r) => { const s = bySource[key] ??= { n: 0, gp: 0, gl: 0 }; s.n++; s.gp += Math.max(0, r); s.gl += Math.max(0, -r); };
const record = (name, trade, detail) => violations.push({ name, cfg: trade.cfg, sym: trade.sym, entryT: trade.entryT, detail });
for (const trade of raw.trades) {
  const cfg = parsed.get(trade.cfg) ?? parseConfigId(trade.cfg); assert.ok(cfg);
  const tf = tfOf(trade.cfg), cs = columns.get(`${trade.sym}|${tf}`), index = cs.findIndex((b) => b.t === trade.entryT);
  if (index <= 0) { record("entry bar unavailable", trade); continue; }
  const basis = trade.mult ?? 1;
  const gross = trade.side * (trade.exit - trade.entry) / trade.entry;
  const net = gross - cost;
  const err = Math.abs(net - trade.r / basis); maxReturnError = Math.max(maxReturnError, err);
  if (err > 1e-6) record("return/cost discrepancy", trade, { expected: net, actual: trade.r / basis });
  gp += Math.max(net, 0); gl += Math.max(-net, 0); beforeCostGp += Math.max(gross, 0); beforeCostGl += Math.max(-gross, 0);
  add(cfg.ind, net); reasons[trade.reason] = (reasons[trade.reason] ?? 0) + 1;
  const series = universe.bars.findIndex((b) => b.sym === trade.sym && b.tfMin === tf);
  const signal = entrySignal(cfg.bot, cfg.ind, universe.caches[series], protocol.actualSettings.tactics);
  if (signal[index - 1] !== trade.side) record("wrong/missing entry direction", trade, signal[index - 1]);
  const tp = tapes.get(trade.cfg);
  if (tp) {
    const ev = configEval(tp, trade.entryT, protocol.actualWf);
    if (!ev.ok) record("config no longer qualifies at entry", trade, ev);
    if (!engineContextValid(tp, trade.entryT, protocol.actualWf, trade.sym, trade.side)) record("symbol/direction gate fails", trade);
    entryProof.push({ cfg: trade.cfg, sym: trade.sym, side: trade.side, entryT: trade.entryT, preEntryPf: ev.pf, preEntryN: ev.n, passed: ev.ok });
  } else record("missing complete config history", trade);
  // Independently scan the actual executed normal/trailing protection. Intrabar order remains stop first.
  if (!["normal", "trailing", "trailing-only"].includes(trade.kind)) continue;
  const p = cfg.protect, entry = cs[index].o, side = trade.side;
  let stop = entry * (1 - side * p.sl), target = p.trailOnly ? 0 : entry * (1 + side * p.tp), peak = entry, armed = false, closed;
  for (let i = index; i < cs.length; i++) {
    const b = cs[i], gap = i > index, exitT = b.t + tf * 60_000;
    if (side === 1 ? b.l <= stop : b.h >= stop)
      closed = { exit: gap ? side === 1 ? Math.min(b.o, stop) : Math.max(b.o, stop) : stop, exitT, reason: armed ? "trail" : "sl" };
    else if (target > 0 && !(armed && p.trailFree) && (side === 1 ? b.h >= target : b.l <= target))
      closed = { exit: gap ? side === 1 ? Math.max(b.o, target) : Math.min(b.o, target) : target, exitT, reason: "tp" };
    else if (i - index + 1 >= p.hold) closed = { exit: b.c, exitT, reason: "time" };
    if (closed) break;
    if (p.trail > 0) {
      peak = side === 1 ? Math.max(peak, b.h) : Math.min(peak, b.l);
      if (side * (peak - entry) / entry >= p.trail) {
        armed = true; const next = peak * (1 - side * p.trail * (p.trailStep ?? 1));
        stop = side === 1 ? Math.max(stop, next) : Math.min(stop, next);
      }
    }
  }
  replayed++;
  if (!closed) record("independent scanner found no close", trade);
  else {
    const pxError = Math.abs(closed.exit - trade.exit) / trade.entry; maxPriceError = Math.max(maxPriceError, pxError);
    if (pxError > 1e-6 || closed.exitT !== trade.exitT || closed.reason !== trade.reason)
      record("protection path discrepancy", trade, closed);
  }
}
const result = { scope: "Independent arithmetic, entry directions, exact config/symbol gates and normal/trailing candle scanner; modeled orders only",
  cost, roundTripChargedOnce: maxReturnError <= 1e-6, rows: raw.trades.length, independentlyReplayedProtectionRows: replayed,
  maxReturnError, maxPriceError, gp, gl, pf: raw.trades.length && gl > 0 ? gp / gl : null,
  beforeCostPfDiagnostic: beforeCostGl > 0 ? beforeCostGp / beforeCostGl : null, reasons,
  bySource: Object.entries(bySource).map(([id, x]) => ({ id, ...x, pf: x.gl > 0 ? x.gp / x.gl : null })),
  precision: "1e-6 return tolerance covers Float32 stored price columns; modeled return arrays retain their original higher precision",
  violations, entryProof };
writeFileSync(`${dir}/independent-audit.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, bySource: undefined, entryProof: undefined, violations: violations.slice(0, 8) }));
process.exitCode = violations.length ? 1 : 0;
