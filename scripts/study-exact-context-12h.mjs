#!/usr/bin/env node
// Bounded retrospective research only. The new Real gate is not modeled here.
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from "../src/core/indications/low-range-research.ts";
import { configId, laneProtect, makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { compareTapeTrades, defaultWalkForward, makeTape, signalConfigEval, tradeAt, walkForward } from "../src/core/sim/walkforward.ts";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
import { positionOrderCounts } from "../src/core/positions.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: study-exact-context-12h.mjs OUTPUT_DIR");
const M = 60_000, H = 60 * M, start = Date.parse("2026-10-10T00:00:00Z"), end = start + 12 * H;
const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const bytes = readFileSync(feedPath), feed = JSON.parse(gunzipSync(bytes));
const symbols = feed.tickers.map((x) => x.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("exactly 20 distinct symbols required");
const warm = start - 84 * H, tfs = [1, 5, 15], histories = [12, 60];
const methods = ["edge-turn", "failed-break", "breakout", "mid-reclaim", "compression-break"];
const windows = [1, 6], relations = ["standalone", "trend"], samples = [5, 8, 10, 12, 15, 20, 25, 30, 35];
const policy = { ...DEFAULT_LOW_RANGE_POLICY, steps: [3], slRatios: [1], trailRatios: [0, .5], tags: ["sh"] };
const sourceBars = new Map(), caches = new Map(), allBars = [];
for (const sym of symbols) {
  const minutes = (feed.candles[`${sym}|1`] ?? []).filter((c) => c.t >= warm && c.t < end);
  if (minutes.length !== 96 * 60 || minutes.some((c, i) => c.t !== warm + i * M)) throw new Error(`missing minute: ${sym}`);
  for (const tf of tfs) {
    const b = barsFromCandles(sym, tf, tf === 1 ? minutes : resample(minutes, 1, tf));
    sourceBars.set(`${sym}|${tf}`, b); caches.set(`${sym}|${tf}`, new SeriesCache(b)); allBars.push(b);
  }
}
mkdirSync(out, { recursive: true });
const sha = (x) => createHash("sha256").update(x).digest("hex");
const protocol = { scope: "retrospective unallocated modeled orders, not venue fills, funded results, or a fresh holdout",
  feedSha256: sha(bytes), symbols, start, end, warm, histories, tfs, methods, windows, relations,
  protections: policy, cost: DEFAULT_SETTINGS.cost, baseLastN: 40, samples,
  sourceSha256: Object.fromEntries(["scripts/study-exact-context-12h.mjs", "src/core/sim/walkforward.ts",
    "src/core/sim/processed-validation.ts", "src/core/sim/backtest.ts", "src/core/config.ts"]
    .map((path) => [path, sha(readFileSync(path))])),
  note: "Only the bounded Short Low-Range Normal/Trailing probe is measured. The prototype uses exact config/symbol/side history and no elapsed-time PF gate. 12h/60h describe available input, not a performance qualification window. Real and other strategy types are not measured." };
writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const baseOpts = { ...defaults, startT: start, baseQualificationT: start, simH: 12, preH: 12, longH: 12, stepH: 1,
  gates: { ...defaults.gates, lastNOnly: true, baseLastN: 40 }, validLastN: 12, signalValidLastN: 12,
  rangeOpts: undefined, rangeGate: undefined, lastN: 0, symGate: "off", bots: [], portfolio: 0,
  seatPer: "config", seatSet: "validated", recordValidation: true,
  toggles: { ...defaults.toggles, normal: true, trailing: true, exit: false, block: false, blockActive: false,
    dca: false, dcaActive: false, axis: false }, relate: { ...defaults.relate, enabled: false } };
const pf = (gp, gl) => gl > 0 ? gp / gl : gp > 0 ? null : null;
const allCases = [];
for (const history of histories) {
  const from = start - history * H, tapes = [];
  for (const tf of tfs) for (const window of windows) for (const method of methods) for (const relation of relations) {
    const memory = Number(readFileSync("/sys/fs/cgroup/memory.current", "utf8"));
    const limit = Number(readFileSync("/sys/fs/cgroup/memory.max", "utf8"));
    if (Number.isFinite(limit) && memory > limit * .9) throw new Error(`memory safeguard: ${memory}/${limit}`);
    const ind = `low-range-${window}-${method}-${relation}@m${tf}`;
    const prepared = symbols.map((sym) => {
      const key = `${sym}|${tf}`, b = sourceBars.get(key), state = lowRangeState(caches.get(key), window, method, relation);
      const onset = new Int8Array(b.n);
      for (let i = 1; i < b.n; i++) if (b.t[i] + tf * M >= from && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
      return [b, [sideSignal(onset, 1), sideSignal(onset, -1)]];
    });
    for (const ref of lowRangeProtects(policy)) {
      const protect = laneProtect({ ...ref, hold: Math.max(1, Math.floor(60 / tf)), maxHoldMin: 60 }, ind);
      const kind = protect.trail ? "trailing" : "normal", id = configId("follow", ind, protect), trades = [], opens = [];
      for (const [b, signals] of prepared) for (const signal of signals) {
        const result = simulate(id, b, signal, protect, { cost: DEFAULT_SETTINGS.cost });
        trades.push(...result.trades); if (result.open) opens.push(result.open);
      }
      trades.sort(compareTapeTrades);
      tapes.push(makeTape(id, "follow", ind, protect, kind, symbols, trades, opens, []));
    }
  }
  process.stderr.write(`history ${history}h: built ${tapes.length} Normal/Trailing Short tapes\n`);
  const contexts = [];
  for (const tp of tapes) for (const sym of symbols) for (const side of [1, -1]) {
    const own = [];
    for (let i = 0; i < tp.n; i++) if (tp.syms[tp.symI[i]] === sym && tp.side[i] === side && tp.exitT[i] < start) own.push(tp.r[i]);
    const last = own.slice(-40), gp = last.reduce((a, r) => a + Math.max(0, r), 0), gl = last.reduce((a, r) => a + Math.max(0, -r), 0);
    const base = last.length === 40 && gp > gl && gp >= 1.1 * gl;
    const verdicts = {};
    for (const n of samples) {
      const ev = signalConfigEval(tp, start, { ...baseOpts, validLastN: n }, sym, side);
      verdicts[n] = { ok: ev.ok, n: ev.n, pf: Number.isFinite(ev.pf) ? ev.pf : null,
        gp: ev.gp ?? null, gl: ev.gl ?? null, fail: ev.ok ? null : ev.fail };
      if (ev.ok && !base) throw new Error(`Validation admitted failed Base: ${tp.id} ${sym} ${side} Last-${n}`);
    }
    contexts.push({ cfg: tp.id, sym, side, kind: tp.kind, tf: Number(/@m(\d+)/.exec(tp.ind)?.[1]),
      base: { n: last.length, pass: base, gp, gl, pf: pf(gp, gl), noLoss: gp > 0 && gl === 0 }, verdicts });
  }
  writeFileSync(`${out}/history-${history}-contexts.jsonl`, contexts.map((x) => JSON.stringify(x)).join("\n") + "\n", { flag: "wx" });
  const universe = makeUniverse(allBars, from), eligible = contexts.filter((x) => x.base.pass);
  const byId = new Map(tapes.map((tp) => [tp.id, tp]));
  const source = new Map();
  const keyOf = (x) => JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT]);
  for (const tp of tapes) for (let i = 0; i < tp.n; i++) if (tp.entryT[i] >= start && tp.entryT[i] < end) {
    const tr = tradeAt(tp, i), key = keyOf(tr);
    if (source.has(key)) throw new Error(`duplicate source trade ${key}`);
    source.set(key, tr);
  }
  for (const n of samples) {
    const pass = contexts.filter((x) => x.verdicts[n].ok);
    const historicalGp = pass.reduce((a, x) => a + x.verdicts[n].gp, 0);
    const historicalGl = pass.reduce((a, x) => a + x.verdicts[n].gl, 0);
    const entry = { history, n, contexts: contexts.length, basePassed: eligible.length, validated: pass.length,
      validatedPctOfBase: n >= 9 && eligible.length ? 100 * pass.length / eligible.length : null,
      historicalGp, historicalGl, historicalPf: pf(historicalGp, historicalGl),
      rejection: n < 9 ? "prototype requires at least nine closes" : null, cases: [] };
    if (n >= 9) for (const block of [false, true]) {
      const o = { ...baseOpts, validLastN: n, toggles: { ...baseOpts.toggles, block } };
      const sim = walkForward(universe, tapes, o), rows = sim.trades;
      let gp = 0, gl = 0;
      const groups = {}, hourly = {}, seen = new Set();
      for (const tr of rows) {
        const r = modeledUnitReturn(tr);
        if (!Number.isFinite(r)) throw new Error(`unknown return ${tr.cfg}`);
        const key = keyOf(tr), original = source.get(key), tp = byId.get(tr.cfg);
        if (!original || !tp || seen.has(key) || !sim.validated?.includes(tr.cfg) ||
          !signalConfigEval(tp, tr.entryT, o, tr.sym, tr.side).ok || Math.abs(r - original.r) > 1e-10 ||
          tr.reason !== original.reason) throw new Error(`unvalidated or unmatched order ${key}`);
        seen.add(key);
        gp += Math.max(r, 0); gl += Math.max(-r, 0);
        const k = `${tr.kind ?? "normal"}|${Number(/@m(\d+)/.exec(tr.cfg)?.[1])}|${tr.reason}`;
        const g = groups[k] ??= { closes: 0, gp: 0, gl: 0 }; g.closes++; g.gp += Math.max(r, 0); g.gl += Math.max(-r, 0);
        const hour = Math.floor((tr.exitT - 1) / H) * H, h = hourly[hour] ??= { closes: 0, gp: 0, gl: 0 };
        h.closes++; h.gp += Math.max(r, 0); h.gl += Math.max(-r, 0);
      }
      const file = `history-${history}-validation-${n}-block-${block}-orders.jsonl`;
      writeFileSync(`${out}/${file}`, rows.map((x) => JSON.stringify(x)).join("\n") + (rows.length ? "\n" : ""), { flag: "wx" });
      entry.cases.push({ block, initialValidatedConfigs: sim.validated?.length ?? 0, closes: rows.length, gp, gl, pf: pf(gp, gl),
        noLoss: gp > 0 && gl === 0, positionsAndOrders: positionOrderCounts(rows, sim.openAtEnd ?? []),
        groups, hourly, skips: sim.skips, exactTapeMatches: seen.size, orderFile: file });
    }
    allCases.push(entry);
    process.stderr.write(`history ${history}h Last-${n}: ${pass.length}/${eligible.length} Base contexts; ${entry.cases.map((x) => `${x.block ? "Block on" : "Block off"} ${x.closes}`).join(", ")}\n`);
  }
}
writeFileSync(`${out}/results.json`, JSON.stringify({ protocol, cases: allCases }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: "complete", cases: allCases.length, output: out }));
