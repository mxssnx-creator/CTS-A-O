#!/usr/bin/env node
// Every indication, one by one, on several timeframes — independent and combined — on REAL data, two halves.
//   independent: the indication's state on timeframe tf (follow / revert on its onsets)
//   combined:    the same, kept only where the SAME indication agrees on the higher timeframes (completed bars)
// Protects are a fine grid scaled to the timeframe. Half A selects, half B validates.
//
//   node --experimental-strip-types scripts/core-mtf.mjs --cache c1m.json --srctf 1 --tfs 1,5,15 --out docs/mtf-1m
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { RT_COST } from "../src/core/config.ts";
import { INDICATIONS, mtfState } from "../src/core/indications/registry.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { profitFactor, statsOf } from "../src/core/metrics/stats.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { simulate } from "../src/core/sim/backtest.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const srctf = Number(arg("srctf", 1));
const tfs = arg("tfs", "1,5,15").split(",").map(Number);
const minN = Number(arg("minN", 30));
const only = arg("only") ? new Set(arg("only").split(",")) : null;
const raw = JSON.parse(readFileSync(arg("cache"), "utf8"));
// higher timeframes for "combined", per base timeframe
const COMBINE = { 1: [5, 15], 3: [5], 5: [3], 15: [4], 30: [2], 60: [4] };
const r4 = (x) => +x.toFixed(4);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pc = (x) => `${(x * 100).toFixed(2)}%`;

const results = [];
const t0 = performance.now();
let days = 0, split = 0, startT = 0, nowT = 0;
for (const tf of tfs) {
  const U = makeUniverse(Object.entries(raw).map(([s, c]) => barsFromCandles(s, tf, resample(c, srctf, tf))));
  split = U.startT + (U.nowT - U.startT) / 2;
  days = (U.nowT - U.startT) / 86_400_000;
  startT = U.startT;
  nowT = U.nowT;
  const scale = Math.sqrt(tf / 15);
  const bph = 60 / tf;
  const P = [];
  for (const tp of [0.6, 1, 1.6].map((m) => r4(0.026 * scale * m)))
    for (const k of [1, 2]) P.push({ tp, sl: r4(tp * k), trail: 0, hold: Math.max(4, Math.round(Math.max(1, 8 * scale) * bph)) });
  const factors = COMBINE[tf].map((f) => f / 1).filter((f) => Number.isInteger(f));
  for (const ind of INDICATIONS) {
    if (only && !only.has(ind.id)) continue;
    for (const mode of ["independent", "combined"]) {
      const states = U.caches.map((k) => mtfState(ind.id, k, mode === "combined" ? COMBINE[tf] : []));
      for (const bot of ["follow", "revert"]) {
        const dir = bot === "follow" ? 1 : -1;
        const sigs = states.map((st) => {
          const out = new Int8Array(st.length);
          for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) out[i] = st[i] * dir;
          return out;
        });
        for (let pi = 0; pi < P.length; pi++) {
          const tr = [];
          for (let s = 0; s < U.bars.length; s++) for (const t of simulate("x", U.bars[s], sigs[s], P[pi], { cost: RT_COST }).trades) tr.push(t);
          const A = statsOf(tr.filter((t) => t.exitT <= split).sort((a, b) => a.exitT - b.exitT));
          const B = statsOf(tr.filter((t) => t.entryT >= split).sort((a, b) => a.exitT - b.exitT));
          results.push({ tf, mode, ind: ind.id, kind: ind.kind, bot, pi, p: P[pi], A: { n: A.n, pf: A.pf, net: A.net, gp: A.gp, gl: A.gl, gh: A.gh }, B: { n: B.n, pf: B.pf, net: B.net, gp: B.gp, gl: B.gl, gh: B.gh } });
        }
      }
      // release per-indication memory on the 1m universe
      if (tf === 1) for (const k of U.caches) k.memo("gc", () => 0);
    }
  }
  console.error(`tf ${tf}m done · ${results.length} rows · ${Math.round((performance.now() - t0) / 1000)} s · mem ${Math.round(process.memoryUsage().rss / 1e6)} MB`);
}

// pooled per tf × mode (selection-free)
const pooled = [];
for (const tf of tfs) for (const mode of ["independent", "combined"]) {
  const xs = results.filter((r) => r.tf === tf && r.mode === mode);
  let gpA = 0, glA = 0, gpB = 0, glB = 0, nA = 0, nB = 0;
  for (const r of xs) { gpA += r.A.gp; glA += r.A.gl; gpB += r.B.gp; glB += r.B.gl; nA += r.A.n; nB += r.B.n; }
  const pass = xs.filter((r) => r.A.n >= minN && r.B.n >= minN && r.A.pf >= 1.1 && r.B.pf >= 1.1).length;
  pooled.push({ tf, mode, variants: xs.length, pass, pfA: profitFactor(gpA, glA), pfB: profitFactor(gpB, glB), perDay: (nA + nB) / xs.length / days });
}
// per indication: for each tf × mode, the best variant on A → its B
const perInd = [];
for (const ind of INDICATIONS) {
  if (only && !only.has(ind.id)) continue;
  const row = { ind: ind.id, kind: ind.kind, cells: {} };
  for (const tf of tfs) for (const mode of ["independent", "combined"]) {
    const xs = results.filter((r) => r.ind === ind.id && r.tf === tf && r.mode === mode && r.A.n >= minN);
    const best = xs.sort((a, b) => b.A.net - a.A.net)[0];
    row.cells[`${tf}:${mode}`] = best ? { bot: best.bot, p: best.p, A: best.A, B: best.B } : null;
  }
  perInd.push(row);
}
const survivors = results.filter((r) => r.A.n >= minN && r.B.n >= minN && r.A.pf >= 1.1 && r.B.pf >= 1.1).sort((a, b) => Math.min(b.A.pf, b.B.pf) - Math.min(a.A.pf, a.B.pf));

const d = (t) => new Date(t).toISOString().slice(0, 10);
const md = [`# Indications × timeframes — independent and combined`, "",
  `${Object.keys(raw).length} symbols · ${days.toFixed(1)} days of real BingX ${srctf}m data (${d(startT)} → ${d(nowT)}) · half A → ${d(split)} selects, half B validates · cost 0.2% round trip · ${INDICATIONS.length} indications × follow/revert × 6 protects per timeframe · combined = the same indication agrees on the higher timeframe(s): ${tfs.map((t) => `${t}m → ${COMBINE[t].map((f) => `${t * f}m`).join("+")}`).join(", ")}`, "",
  "## Pooled (every indication × bot × protect; no selection)", "",
  "| timeframe | mode | variants | pass both halves (PF ≥ 1.1, ≥ " + minN + " trades) | pooled PF A | pooled PF B | trades/day per variant |", "|---|---|---:|---:|---:|---:|---:|",
  ...pooled.map((r) => `| ${r.tf}m | ${r.mode} | ${r.variants} | ${r.pass} | ${f2(r.pfA)} | ${f2(r.pfB)} | ${f2(r.perDay)} |`), "",
  `## Both-halves survivors (${survivors.length})`, "",
  "| tf | mode | combo | TP | SL | hold (bars) | A n | A PF | B n | B PF | B trades/day | green hours B |", "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...survivors.slice(0, 60).map((r) => `| ${r.tf}m | ${r.mode} | ${r.bot}·${r.ind} | ${pc(r.p.tp)} | ${pc(r.p.sl)} | ${r.p.hold} | ${r.A.n} | ${f2(r.A.pf)} | ${r.B.n} | ${f2(r.B.pf)} | ${f2(r.B.n / (days / 2))} | ${Math.round(r.B.gh * 100)}% |`), "",
  "## Every indication, one by one: best variant on A → half-B PF (trades in B)", "",
  `| kind | indication | ${tfs.flatMap((t) => [`${t}m`, `${t}m comb.`]).join(" | ")} |`, `|---|---|${tfs.flatMap(() => ["---:", "---:"]).join("|")}|`,
  ...perInd.map((r) => `| ${r.kind} | ${r.ind} | ${tfs.flatMap((t) => ["independent", "combined"].map((m) => { const c = r.cells[`${t}:${m}`]; return c ? `${f2(c.B.pf)} (${c.B.n})` : "–"; })).join(" | ")} |`)];
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md.join("\n"));
  writeFileSync(`${out}.json`, JSON.stringify({ days, split, tfs, pooled, survivors: survivors.map((r) => ({ tf: r.tf, mode: r.mode, id: `${r.bot}|${r.ind}`, p: r.p, A: { n: r.A.n, pf: r.A.pf }, B: { n: r.B.n, pf: r.B.pf, gh: r.B.gh } })), perInd }, null, 2));
}
console.log(md.slice(0, 24 + Math.min(20, survivors.length)).join("\n"));
