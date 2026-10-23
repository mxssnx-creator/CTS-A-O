#!/usr/bin/env node
// CTS-A-O — DCA sweep on real BingX data: the engine computes the window once (12 symbols, Main pairs, signals),
// then every DCA variant rebuilds only its DCA tapes (DCA and DCA Active, every Main pair) and runs the Real-stage
// walk-forward on them alone (Block off): per kind closes, PF, net, max drawdown, drawdown time, positive hours,
// average legs. One JSON per window; pooled by scripts/core-dca-sweep-report.mjs.
//
//   CTS_CORE_WORKERS=1 node --experimental-strip-types scripts/core-dca-sweep.mjs --end-ago 24 [--stage 1|2]
//     [--best runs/dca/best.json] --out runs/dca/s1-w24
import { readFileSync, writeFileSync } from "node:fs";
import { dcaSweepStats } from "./dca-sweep-stats.mjs";

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { walkForward, buildTapes, dcaProtectGrid } = await import("../src/core/sim/walkforward.ts");
const { REF_TF } = await import("../src/core/sim/backtest.ts");
const { fetchHistory, fetchKlines } = await import("../src/core/market/bingx.ts");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const symbols = Number(arg("symbols", 12));
const preH = Number(arg("pre", 12));
const runH = Number(arg("run", 24));
const endAgo = Number(arg("end-ago", 0));
const stage = Number(arg("stage", 1));
const out = arg("out", "runs/dca/sweep");
const settingsExtra = JSON.parse(arg("settings", "{}"));

const cutT = endAgo > 0 ? Math.floor(Date.now() / 3_600_000) * 3_600_000 - endAgo * 3_600_000 : 0;
const keep = (cs, tf) => cs.filter((c) => c.t + tf * 60_000 <= cutT);
const feed = cutT
  ? {
      history: async (sym, tf, bars, opt = {}) => keep(await fetchHistory(sym, tf, bars, { ...opt, nowT: cutT }), tf),
      klines: async (sym, tf, opt = {}) =>
        keep(await fetchKlines(sym, tf, { ...opt, endT: Math.min(opt.endT ?? cutT, cutT - 1), nowT: cutT }), tf),
    }
  : null;
const rt = new CoreRuntime(
  new CoreDb(":memory:"),
  { symbols, signals: { enabled: false }, ...settingsExtra },
  { market: "bingx", ...(feed ? { feed } : {}) },
);
rt.updateSettings({}, { preH, simH: runH });
const t0 = Date.now();
rt.start();
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 900_000) throw new Error(rt.status.error ?? "engine error");
  await new Promise((r) => setTimeout(r, 1000));
}
rt.stop();
const computeS = (Date.now() - t0) / 1000;
const u = rt.lastUniverse;
const only = new Set(rt.tapes.filter((t) => !String(t.ind).startsWith("sig")).map((t) => `${t.bot}|${t.ind}`));
const floors = { minSl: rt.settings.protectFloor.minSl, minTrail: rt.settings.protectFloor.minTrail };

function run(name, dca) {
  const t = Date.now();
  const protects = dcaProtectGrid(REF_TF, dca);
  const tapes = buildTapes(u, [], rt.settings.cost, { protects, dca, noDca: false }, only, rt.settings.tactics, null, floors);
  // DCA and DCA Active exclude each other (the Active toggle replaces the base leg): one walk-forward per kind,
  // on the DCA tapes plus the engine's plain tapes (the base a DCA set is judged against)
  const plain = rt.tapes.filter((x) => x.kind === "normal" || x.kind === "trailing");
  const wfOf = (active) =>
    walkForward(u, [...plain, ...tapes], {
      ...rt.wf,
      dca,
      toggles: { normal: false, trailing: false, block: false, blockActive: false, dca: true, dcaActive: active, axis: false },
    });
  const sims = { dca: wfOf(false), "dca-active": wfOf(true) };
  const sim = sims.dca;
  const byKind = {};
  for (const k of ["dca", "dca-active", "all"]) {
    const src = k === "all" ? [...sims.dca.trades, ...sims["dca-active"].trades] : sims[k].trades;
    const xs = src.filter((x) => k === "all" || x.kind === k);
    byKind[k] = dcaSweepStats(xs, sim.startT, sim.endT);
    if (k === "all") byKind[k].basis = "sum-of-alternative-unfunded-scenarios-not-one-account";
  }
  // base: every DCA tape over the window (no selection), per kind; the pooled curve averages the tapes (one unit
  // spread over every tape) so its drawdown is comparable between variants
  const base = {};
  for (const k of ["dca", "dca-active"]) {
    const ts = tapes.filter((x) => x.kind === k);
    const xs = [];
    for (const tp of ts) for (let i = 0; i < tp.n; i++)
      if (tp.exitT[i] > sim.startT && tp.exitT[i] <= sim.endT)
        xs.push({ entryT: tp.entryT[i], exitT: tp.exitT[i], r: tp.r[i], vol: tp.vol[i] });
    const st = dcaSweepStats(xs, sim.startT, sim.endT, { candidate: true, curveDivisor: Math.max(1, ts.length) });
    base[k] = { ...st, tapes: ts.length, avgR: xs.length ? (st.gp - st.gl) / xs.length : 0,
      worst: xs.reduce((n, x) => Math.min(n, x.r * 100), 0) };
  }
  return { name, dca, tapes: tapes.length, base, byKind, ms: Date.now() - t };
}

const TP = {
  cur: undefined,
  gl: [0.032, 0.04, 0.048, 0.056],
  mix: [0.012, 0.026, 0.035, 0.048],
};
const variants = [];
if (stage === 1) {
  for (const [tn, tp] of Object.entries(TP))
    for (const levels of [1, 2, 3])
      for (const [sn, sp] of [
        ["s1%", { step: 0.01 }],
        ["s2%", { step: 0.02 }],
        ["s0.5tp", { step: 0.02, stepOfTp: 0.5 }],
        ["s1tp", { step: 0.02, stepOfTp: 1 }],
      ])
        for (const stopGap of [0.5, 1.5])
          variants.push([`tp:${tn} L${levels} ${sn} g${stopGap}`, { levels, ...sp, stopGap, ...(tp ? { tp } : {}) }]);
} else if (stage === 3) {
  // every variant of the --best file as it is
  for (const b of JSON.parse(readFileSync(arg("best", "runs/dca/best3.json"), "utf8"))) variants.push([b.name, b.dca]);
} else {
  // the best stage-1 variants × stop of the target
  const best = JSON.parse(readFileSync(arg("best", "runs/dca/best.json"), "utf8"));
  for (const b of best)
    for (const slOfTp of [0.75, 1, 1.5, 2])
      variants.push([`${b.name} sl${slOfTp}`, { ...b.dca, slOfTp, tp: b.dca.tp ?? [0.008, 0.012, 0.026, 0.035] }]);
}
const rows = [];
for (const [name, dca] of variants) {
  const r = run(name, dca);
  rows.push(r);
  process.stdout.write(JSON.stringify(r) + "\n");
}
writeFileSync(
  `${out}.json`,
  JSON.stringify({ schema: "cts-dca-sweep-v2", evidence: "Unfunded virtual sensitivity scenarios; not account or venue execution. Endpoint marks excluded; own unit returns after costs.", window: { startT: rt.sim.startT, endT: rt.sim.endT }, symbols, preH, runH, endAgo, stage, computeS, pairs: only.size, rows }, null, 1),
);
process.stderr.write(`wrote ${out}.json: ${rows.length} variants\n`);
process.exit(0);
