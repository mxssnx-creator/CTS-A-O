#!/usr/bin/env node
// Independent before/after replay of identical immutable tapes, including minute entries and hourly reports.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const roots = process.argv.slice(2);
if (roots.length !== 2) throw new Error("signal-simulation-parity BEFORE_ROOT AFTER_ROOT");
const load = (root, file) => import(pathToFileURL(resolve(root, file)).href);
const H = 3_600_000, M = 60_000, startT = 100 * H, endT = 112 * H;
const results = [];
for (const root of roots) {
  const wf = await load(root, "src/core/sim/walkforward.ts");
  const { DEFAULT_SETTINGS } = await load(root, "src/core/config.ts");
  const { signalSettings } = await load(root, "src/core/signal-config.ts");
  const { configId } = await load(root, "src/core/pipeline/pipeline.ts");
  const { sigActiveKey } = await load(root, "src/core/signals.ts");
  const tapes = [];
  for (const lane of [1, 5, 15, 30]) for (const kind of ["normal", "trailing", "trailing-only"]) {
    const ind = `sig-ema-cross-s@m${lane}`;
    const protect = { tp: kind === "trailing-only" ? 0 : .02, sl: .04,
      trail: kind === "normal" ? 0 : .01, hold: 96,
      ...(kind === "trailing-only" ? { trailOnly: true } : {}) };
    const id = configId("follow", ind, protect), trades = [], open = [];
    for (let minute = 1; minute < 112 * 60; minute += 7) for (const [sym, side] of [["A", 1], ["A", -1], ["B", 1], ["B", -1]]) {
      const entryT = minute * M, exitT = entryT + (1 + minute % 17) * M;
      const r = minute % 5 === 0 ? -.005 : .012;
      if (exitT <= endT) trades.push({ cfg: id, sym, side, kind, entryT, exitT, r,
        entry: 100, exit: 100 * (1 + side * r), reason: r > 0 ? "tp" : "sl", bars: 3, mfe: .02, mae: -.005 });
      else open.push({ cfg: id, sym, side, kind, entryT, entry: 100, nowT: endT, price: 101,
        r: .01, bars: 1, mfe: .01, mae: 0, peak: 101, sl: 96, tp: 102, trail: 0 });
    }
    tapes.push(wf.makeTape(id, "follow", ind, protect, kind, ["A", "B"], trades, open, []));
  }
  const rank = signalSettings({ enabled: true, count: 0, minTrades: 3, minBlockShare: 0, validate: false, rank: "drawdown" });
  const base = wf.defaultWalkForward(DEFAULT_SETTINGS);
  const active = new Set(tapes.flatMap(tp => tp.syms.flatMap(sym => [1, -1].map(side => sigActiveKey(tp.bot, tp.ind, sym, side, tp.kind, tp.id)))));
  const out = [];
  for (const stepH of [1 / 60, .25, 1, 3]) for (const ranked of [false, true]) {
    const options = { ...base, startT, simH: 12, stepH, preH: 100, longH: 100, signalLongH: 100,
      signalValidLastN: 8, validLastN: 0, lastN: 0, signalOwnBase: true,
      signalAccept: rank.accept, signalSideAccept: undefined, signalGuardN: 8,
      signalActive: active, signalRank: ranked ? rank : undefined,
      signalMaxPositions: 0, signalCluster: undefined, coord: undefined, symGate: undefined,
      gates: { ...base.gates, minTrades: 3, maxDdr: 0, minGreen: 0, stableBlocks: 0 },
      toggles: { ...base.toggles, normal: true, trailing: true, block: false, blockActive: false },
      recordValidation: "summary" };
    const began = performance.now();
    const result = wf.walkForward({ bars: [], caches: [], series: [], nowT: endT, startT: 0, endT, splitT: startT, baseTf: 1 }, tapes, options);
    const { opts: _opts, ...record } = result;
    assert.ok(result.trades.length > 0, "parity fixture must exercise executed orders");
    out.push({ stepH, ranked, record, ms: performance.now() - began });
  }
  results.push(out);
}
for (let i = 0; i < results[0].length; i++) {
  const before = results[0][i], after = results[1][i];
  assert.deepEqual(after.record, before.record, `complete replay parity: step=${before.stepH}, ranked=${before.ranked}`);
  console.log(JSON.stringify({ stepH: before.stepH, ranked: before.ranked, beforeMs: before.ms, afterMs: after.ms,
    trades: after.record.trades.length, candidates: after.record.signalFunnel.candidates, hours: after.record.hourly.length,
    resultSha256: createHash("sha256").update(JSON.stringify(after.record)).digest("hex"), exactParity: true }));
}
