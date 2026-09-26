#!/usr/bin/env node
// Complete coverage + throughput: EVERY bot × indication × protect × sub-strategy config (normal, trailing, DCA,
// DCA Active, Axis) is simulated on every symbol, streamed (nothing kept but aggregates), on real data.
// Reports: configs processed, throughput, memory, dead indications (no signal / no trade), per kind / bot /
// strategy stats, and a best-first ranking (train half → test half) with the orders a top portfolio opens.
//   node --experimental-strip-types scripts/core-coverage.mjs --cache c15m.json --srctf 15 --tf 15 --out docs/coverage-15m
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { entrySignal } from "../src/core/bots/bots.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { INDICATION_BY_ID } from "../src/core/indications/registry.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { profitFactor, statsOf } from "../src/core/metrics/stats.ts";
import { allCombos, configId, makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { simulate } from "../src/core/sim/backtest.ts";
import { simulateDca } from "../src/core/sim/dca.ts";
import { simulateAxis } from "../src/core/sim/axis.ts";
import { defaultWalkForward } from "../src/core/sim/walkforward.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const tf = Number(arg("tf", 15));
const srctf = Number(arg("srctf", 15));
const days = Number(arg("days", 0));
const raw = JSON.parse(readFileSync(arg("cache"), "utf8"));
let bars = Object.entries(raw).map(([s, c]) => barsFromCandles(s, tf, resample(c, srctf, tf)));
if (days > 0) {
  const keep = Math.round((days * 24 * 60) / tf);
  bars = bars.map((b) => { const a = Math.max(0, b.n - keep); return { ...b, n: b.n - a, t: b.t.slice(a), o: b.o.slice(a), h: b.h.slice(a), l: b.l.slice(a), c: b.c.slice(a), v: b.v.slice(a) }; });
}
const U = makeUniverse(bars);
const split = U.startT + (U.nowT - U.startT) / 2;
const spanD = (U.nowT - U.startT) / 86_400_000;
const s = { ...DEFAULT_SETTINGS, tfMin: tf };
const wf = defaultWalkForward(s);
const combos = allCombos();
const variants = wf.protects.length + wf.dcaProtects.length * 3;
console.error(`${U.bars.length} symbols · ${spanD.toFixed(1)} days · ${tf}m · ${combos.length} combos × ${variants} variants = ${combos.length * variants} configs × ${U.bars.length} symbols`);

const agg = (m, k) => m.get(k) ?? (m.set(k, { configs: 0, trades: 0, gp: 0, gl: 0 }), m.get(k));
const byKind = new Map(), byBot = new Map(), byStrat = new Map(), byInd = new Map();
const deadSignal = [], noTrades = [];
const ranked = [];
let configs = 0, symSims = 0;
const t0 = performance.now();
let peakRss = 0;
for (let ci = 0; ci < combos.length; ci++) {
  const c = combos[ci];
  const sigs = U.caches.map((k) => entrySignal(c.bot, c.ind, k, s.tactics));
  if (sigs.some((x) => !x)) continue;
  let nSig = 0;
  for (const x of sigs) for (let i = 0; i < x.length; i++) if (x[i]) nSig++;
  if (!nSig) deadSignal.push(`${c.bot}|${c.ind}`);
  let comboTrades = 0;
  const runs = [];
  for (const p of wf.protects) runs.push({ p, kind: p.trail > 0 ? "trailing" : "normal", sim: (sy) => simulate("x", U.bars[sy], sigs[sy], p, { cost: s.cost }).trades });
  for (const p of wf.dcaProtects) {
    runs.push({ p, kind: "dca", sim: (sy) => simulateDca("x", U.bars[sy], sigs[sy], p, s.dca, false, s.cost).trades });
    runs.push({ p, kind: "dca-active", sim: (sy) => simulateDca("x", U.bars[sy], sigs[sy], p, s.dca, true, s.cost).trades });
    runs.push({ p, kind: "axis", sim: (sy) => simulateAxis("x", U.bars[sy], sigs[sy], p, s.axis, U.caches[sy].ema(s.axis.center), U.caches[sy].atr(14), s.cost).trades });
  }
  for (const r of runs) {
    const tr = [];
    for (let sy = 0; sy < U.bars.length; sy++) {
      for (const t of r.sim(sy)) tr.push(t);
      symSims++;
    }
    configs++;
    comboTrades += tr.length;
    let gp = 0, gl = 0, gpA = 0, glA = 0, gpB = 0, glB = 0, nA = 0, nB = 0;
    for (const t of tr) {
      if (t.r > 0) gp += t.r; else gl -= t.r;
      if (t.exitT <= split) { nA++; if (t.r > 0) gpA += t.r; else glA -= t.r; }
      else if (t.entryT >= split) { nB++; if (t.r > 0) gpB += t.r; else glB -= t.r; }
    }
    const kind = INDICATION_BY_ID.get(c.ind)?.kind ?? "none";
    for (const [m, k] of [[byKind, kind], [byBot, c.bot], [byStrat, r.kind], [byInd, c.ind]]) {
      const a = agg(m, k);
      a.configs++;
      a.trades += tr.length;
      a.gp += gp;
      a.gl += gl;
    }
    if (nA >= 20) ranked.push({ id: configId(c.bot, c.ind, r.p, r.kind === "normal" || r.kind === "trailing" ? undefined : r.kind), pfA: profitFactor(gpA, glA), nA, pfB: profitFactor(gpB, glB), nB, netA: gpA - glA });
  }
  if (!comboTrades) noTrades.push(`${c.bot}|${c.ind}`);
  if (ci % 50 === 0) {
    const rss = process.memoryUsage().rss;
    peakRss = Math.max(peakRss, rss);
    console.error(`  ${ci}/${combos.length} combos · ${configs} configs · ${Math.round((performance.now() - t0) / 1000)} s · ${Math.round(configs / ((performance.now() - t0) / 1000))} configs/s · rss ${Math.round(rss / 1e6)} MB`);
  }
}
const secs = (performance.now() - t0) / 1000;
// best first: rank by the train half (A) score, report the test half (B)
ranked.sort((a, b) => b.netA - a.netA);
const top = ranked.slice(0, 40);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const tbl = (m, name) => [`| ${name} | configs | trades | PF |`, "|---|---:|---:|---:|", ...[...m.entries()].sort((a, b) => b[1].trades - a[1].trades).map(([k, a]) => `| ${k} | ${a.configs} | ${a.trades} | ${f2(profitFactor(a.gp, a.gl))} |`)];
const topB = top.filter((r) => r.nB >= 10);
const passB = topB.filter((r) => r.pfB >= 1.1).length;
const md = [`# Complete coverage — every config, ${tf}m`, "",
  `${U.bars.length} symbols · ${spanD.toFixed(1)} days of real BingX data · **${configs.toLocaleString("en-US")} configs** (${combos.length} bot × indication combos × ${variants} protect / sub-strategy variants) · **${symSims.toLocaleString("en-US")} symbol simulations** in ${secs.toFixed(0)} s (${Math.round(configs / secs)} configs/s, ${Math.round(symSims / secs)} symbol-sims/s) · peak RSS ${Math.round(peakRss / 1e6)} MB · cost 0.2% round trip`, "",
  `- Combos with **no signal at all**: ${deadSignal.length ? deadSignal.join(", ") : "none"}`,
  `- Combos with **no trade in any variant**: ${noTrades.length ? noTrades.join(", ") : "none"}`,
  `- Every strategy kind processed: ${[...byStrat.keys()].join(", ")}`, "",
  "## By strategy", "", ...tbl(byStrat, "strategy"), "", "## By indication type", "", ...tbl(byKind, "type"), "", "## By bot", "", ...tbl(byBot, "bot"), "",
  `## Best first — top 40 configs by the first half, reported on the second half (${passB}/${topB.length} with ≥ 10 trades keep PF ≥ 1.1)`, "",
  "| config | A n | A PF | B n | B PF |", "|---|---:|---:|---:|---:|",
  ...top.map((r) => `| ${r.id} | ${r.nA} | ${f2(r.pfA)} | ${r.nB} | ${f2(r.pfB)} |`)];
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md.join("\n"));
  writeFileSync(`${out}.json`, JSON.stringify({ configs, symSims, secs, peakRss, deadSignal, noTrades, byStrat: Object.fromEntries(byStrat), byKind: Object.fromEntries(byKind), byInd: Object.fromEntries(byInd) }, null, 1));
}
console.log(md.slice(0, 8).join("\n"));
