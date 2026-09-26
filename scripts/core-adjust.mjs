#!/usr/bin/env node
// Indication adjustments, one indication at a time, on REAL data with a two-half check.
// Every indication × {follow, revert} is run plain and with each causal filter (src/core/indications/filters.ts).
// Half A selects, half B validates. A filter counts as an improvement for an indication only when it raises
// PF in BOTH halves with enough trades left. Output: per-filter robustness, per-indication best filter
// (chosen on A, reported on B), and the both-halves survivors.
//
//   node --experimental-strip-types scripts/core-adjust.mjs --cache c1h.json --srctf 60 --tf 60 --out docs/adjust-1h
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { comboSignal } from "../src/core/bots/bots.ts";
import { RT_COST } from "../src/core/config.ts";
import { FILTER_IDS, applyFilter } from "../src/core/indications/filters.ts";
import { INDICATIONS } from "../src/core/indications/registry.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { profitFactor, statsOf } from "../src/core/metrics/stats.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { simulate } from "../src/core/sim/backtest.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const tf = Number(arg("tf", 60));
const srctf = Number(arg("srctf", 60));
const minN = Number(arg("minN", 30));
const bots = arg("bots", "follow,revert").split(",");
const filters = arg("filters", FILTER_IDS.join(",")).split(",");
const raw = JSON.parse(readFileSync(arg("cache"), "utf8"));
const U = makeUniverse(Object.entries(raw).map(([s, c]) => barsFromCandles(s, tf, resample(c, srctf, tf))));
const refIdx = U.bars.findIndex((b) => b.sym === arg("ref", "BTCUSDT") || b.sym === "BTC-USDT");
const ref = refIdx >= 0 ? U.caches[refIdx] : null;
const split = U.startT + (U.nowT - U.startT) / 2;
const days = (U.nowT - U.startT) / 86_400_000;
const barsPerH = 60 / tf;
const scale = Math.sqrt(tf / 15);
const r4 = (x) => +x.toFixed(4);
const PROTECTS = JSON.parse(arg("protects", JSON.stringify([
  { tp: r4(0.026 * scale), sl: r4(0.039 * scale), trail: 0, hold: Math.round(8 * barsPerH) },
  { tp: r4(0.035 * scale), sl: r4(0.0875 * scale), trail: 0, hold: Math.round(24 * barsPerH) },
])));
console.error(`${U.bars.length} symbols (ref ${ref ? ref.b.sym : "none"}) · ${days.toFixed(0)} days · ${tf}m · ${INDICATIONS.length} ind × ${bots.length} bots × ${filters.length} filters × ${PROTECTS.length} protects`);

function run(bot, ind, f, p) {
  const tr = [];
  for (let s = 0; s < U.bars.length; s++) {
    const sig = comboSignal(bot, ind, U.caches[s]);
    if (!sig) return null;
    const fs = applyFilter(f, sig, U.caches[s], s === refIdx ? null : ref);
    for (const t of simulate("x", U.bars[s], fs, p, { cost: RT_COST }).trades) tr.push(t);
  }
  const A = statsOf(tr.filter((t) => t.exitT <= split).sort((a, b) => a.exitT - b.exitT));
  const B = statsOf(tr.filter((t) => t.entryT >= split).sort((a, b) => a.exitT - b.exitT));
  return { A, B };
}

const t0 = performance.now();
const rows = [];
let done = 0;
for (const ind of INDICATIONS) {
  for (const bot of bots) {
    for (let pi = 0; pi < PROTECTS.length; pi++) {
      for (const f of filters) {
        const r = run(bot, ind.id, f, PROTECTS[pi]);
        if (r) rows.push({ ind: ind.id, kind: ind.kind, bot, pi, f, A: r.A, B: r.B });
      }
    }
  }
  if (++done % 10 === 0) console.error(`  ${done}/${INDICATIONS.length} · ${Math.round((performance.now() - t0) / 1000)} s`);
}

const key = (r) => `${r.bot}|${r.ind}|${r.pi}`;
const base = new Map(rows.filter((r) => r.f === "none").map((r) => [key(r), r]));

// per-filter robustness across every indication × bot × protect with a base that has enough trades
const robust = filters.filter((f) => f !== "none").map((f) => {
  let cmp = 0, both = 0, gpA = 0, glA = 0, gpB = 0, glB = 0, nA = 0, nB = 0, bgpB = 0, bglB = 0, bnB = 0;
  for (const r of rows) {
    if (r.f !== f) continue;
    const b = base.get(key(r));
    if (!b || b.A.n < minN || b.B.n < minN) continue;
    cmp++;
    if (r.A.n >= minN / 2 && r.B.n >= minN / 2 && r.A.pf > b.A.pf && r.B.pf > b.B.pf) both++;
    gpA += r.A.gp; glA += r.A.gl; gpB += r.B.gp; glB += r.B.gl; nA += r.A.n; nB += r.B.n;
    bgpB += b.B.gp; bglB += b.B.gl; bnB += b.B.n;
  }
  return { f, cmp, both, bothFrac: cmp ? both / cmp : 0, pfA: profitFactor(gpA, glA), pfB: profitFactor(gpB, glB), basePfB: profitFactor(bgpB, bglB), keepB: bnB ? nB / bnB : 0 };
}).sort((a, b) => b.bothFrac - a.bothFrac);

// per indication × bot: best (filter, protect) chosen on A (net, n ≥ minN) → reported on B
const perInd = [];
for (const ind of INDICATIONS) for (const bot of bots) {
  const xs = rows.filter((r) => r.ind === ind.id && r.bot === bot && r.A.n >= minN);
  if (!xs.length) continue;
  const bestA = [...xs].sort((a, b) => b.A.net - a.A.net)[0];
  const plain = [...xs.filter((r) => r.f === "none")].sort((a, b) => b.A.net - a.A.net)[0];
  perInd.push({ ind: ind.id, kind: ind.kind, bot, f: bestA.f, pi: bestA.pi, A: bestA.A, B: bestA.B, plainA: plain?.A, plainB: plain?.B });
}
const survivors = rows.filter((r) => r.A.n >= minN && r.B.n >= minN && r.A.pf >= 1.1 && r.B.pf >= 1.1).sort((a, b) => Math.min(b.A.pf, b.B.pf) - Math.min(a.A.pf, a.B.pf));

const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pc = (x) => `${(x * 100).toFixed(1)}%`;
const md = [`# Indication adjustments — ${tf}m`, "",
  `${U.bars.length} symbols · ${days.toFixed(0)} days of real BingX data · half A → ${new Date(split).toISOString().slice(0, 10)} (select) · half B → ${new Date(U.nowT).toISOString().slice(0, 10)} (validate) · cost 0.2% round trip · ${INDICATIONS.length} indications × ${bots.join("/")} × ${filters.length} filters × ${PROTECTS.length} protects (${PROTECTS.map((p) => `TP ${pc(p.tp)} SL ${pc(p.sl)} hold ${p.hold}`).join("; ")})`, "",
  `**Both-halves survivors** (PF ≥ 1.1 in A and B, ≥ ${minN} trades each): ${survivors.length} of ${rows.length}.`, "",
  "## Filter robustness (vs the same indication × bot × protect without filter)", "",
  "| filter | compared | better in both halves | pooled PF A | pooled PF B | plain PF B | trades kept (B) |", "|---|---:|---:|---:|---:|---:|---:|",
  ...robust.map((r) => `| ${r.f} | ${r.cmp} | ${pc(r.bothFrac)} | ${f2(r.pfA)} | ${f2(r.pfB)} | ${f2(r.basePfB)} | ${pc(r.keepB)} |`), "",
  "## Survivors", "", "| combo | filter | protect | A n | A PF | B n | B PF | B net % |", "|---|---|---:|---:|---:|---:|---:|---:|",
  ...survivors.slice(0, 40).map((r) => `| ${r.bot}·${r.ind} | ${r.f} | ${r.pi} | ${r.A.n} | ${f2(r.A.pf)} | ${r.B.n} | ${f2(r.B.pf)} | ${f2(r.B.net)} |`), "",
  "## Every indication: best filter × protect chosen on A → B (plain = best unfiltered on A)", "",
  "| kind | indication | bot | filter | A PF (n) | B PF (n) | plain A PF | plain B PF |", "|---|---|---|---|---:|---:|---:|---:|",
  ...perInd.sort((a, b) => b.B.pf - a.B.pf).map((r) => `| ${r.kind} | ${r.ind} | ${r.bot} | ${r.f} | ${f2(r.A.pf)} (${r.A.n}) | ${f2(r.B.pf)} (${r.B.n}) | ${f2(r.plainA?.pf)} | ${f2(r.plainB?.pf)} |`),
];
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md.join("\n"));
  const slim = (s) => s && { n: s.n, pf: s.pf, net: s.net };
  writeFileSync(`${out}.json`, JSON.stringify({ tf, days, split, protects: PROTECTS, robust, survivors: survivors.map((r) => ({ id: `${r.bot}|${r.ind}`, f: r.f, pi: r.pi, A: slim(r.A), B: slim(r.B) })), perInd: perInd.map((r) => ({ ...r, A: slim(r.A), B: slim(r.B), plainA: slim(r.plainA), plainB: slim(r.plainB) })) }, null, 2));
}
console.log(md.slice(0, 12 + robust.length + 20).join("\n"));
console.error(`done in ${Math.round((performance.now() - t0) / 1000)} s`);
