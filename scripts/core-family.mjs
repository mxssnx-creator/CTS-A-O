#!/usr/bin/env node
// Family scan: RSI-extreme momentum (enter WITH the move when RSI crosses into an extreme) over RSI period ×
// level × protect × filter, two halves (A select / B validate) plus month-by-month consistency.
//   node --experimental-strip-types scripts/core-family.mjs --cache c1h.json --srctf 60 --tf 60 --out docs/family-1h
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { RT_COST } from "../src/core/config.ts";
import { applyFilter } from "../src/core/indications/filters.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { statsOf } from "../src/core/metrics/stats.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { simulate } from "../src/core/sim/backtest.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const tf = Number(arg("tf", 60));
const srctf = Number(arg("srctf", 60));
const minN = Number(arg("minN", 60));
const raw = JSON.parse(readFileSync(arg("cache"), "utf8"));
const U = makeUniverse(
  Object.entries(raw).map(([s, c]) => barsFromCandles(s, tf, resample(c, srctf, tf))),
);
const refIdx = U.bars.findIndex((b) => b.sym === "BTC-USDT" || b.sym === "BTCUSDT");
const ref = refIdx >= 0 ? U.caches[refIdx] : null;
const split = U.startT + (U.nowT - U.startT) / 2;
const bph = 60 / tf;
const scale = Math.sqrt(tf / 60);
const P = JSON.parse(arg("periods", "[7,10,14,21]"));
const L = JSON.parse(arg("levels", "[15,20,25,30]"));
const TP = JSON.parse(arg("tp", "[0.03,0.05,0.07,0.1]")).map((x) => +(x * scale).toFixed(4));
const K = JSON.parse(arg("k", "[1,1.5,2,2.5]"));
const HOLD = JSON.parse(arg("hold", "[12,24,48]"));
const TRS = JSON.parse(arg("trail", "[0,0.5]"));
const FILTERS = arg("filters", "none,euUs,volHi,adx20,euUs+volHi,euUs+adx20").split(",");

function momentum(k, p, lvl) {
  return k.memo(`rsimom:${p}:${lvl}`, () => {
    const r = k.rsi(p);
    const out = new Int8Array(k.b.n);
    for (let i = 1; i < k.b.n; i++) {
      if (r[i] > 100 - lvl && !(r[i - 1] > 100 - lvl)) out[i] = 1;
      else if (r[i] < lvl && !(r[i - 1] < lvl)) out[i] = -1;
    }
    return out;
  });
}
const filt = (f, sig, s) =>
  f.split("+").reduce((x, id) => applyFilter(id, x, U.caches[s], s === refIdx ? null : ref), sig);
const month = (t) => new Date(t).toISOString().slice(0, 7);

const rows = [];
const t0 = performance.now();
for (const p of P)
  for (const lvl of L)
    for (const f of FILTERS) {
      const sigs = U.caches.map((k, s) => filt(f, momentum(k, p, lvl), s));
      for (const tp of TP)
        for (const kk of K)
          for (const h of HOLD)
            for (const trs of TRS) {
              const prot = {
                tp,
                sl: +(tp * kk).toFixed(4),
                trail: trs ? +(tp * trs).toFixed(4) : 0,
                hold: h * bph,
              };
              const tr = [];
              for (let s = 0; s < U.bars.length; s++)
                for (const t of simulate("x", U.bars[s], sigs[s], prot, { cost: RT_COST }).trades)
                  tr.push(t);
              tr.sort((a, b) => a.exitT - b.exitT);
              const A = statsOf(tr.filter((t) => t.exitT <= split));
              const B = statsOf(tr.filter((t) => t.entryT >= split));
              const bm = {};
              for (const t of tr) bm[month(t.exitT)] = (bm[month(t.exitT)] ?? 0) + t.r;
              const ms = Object.values(bm);
              rows.push({
                p,
                lvl,
                f,
                tp,
                k: kk,
                h,
                trs,
                A,
                B,
                all: statsOf(tr),
                green: ms.filter((x) => x > 0).length,
                months: ms.length,
              });
            }
      console.error(`  rsi ${p} ${lvl} ${f} · ${Math.round((performance.now() - t0) / 1000)} s`);
    }
const ok = rows.filter((r) => r.A.n >= minN && r.B.n >= minN);
const surv = ok
  .filter((r) => r.A.pf >= 1.1 && r.B.pf >= 1.1)
  .sort((a, b) => Math.min(b.A.pf, b.B.pf) - Math.min(a.A.pf, a.B.pf));
// selection-free view: pooled share of variants passing per axis value
const axis = (name, get) => {
  const vals = [...new Set(ok.map(get))];
  return `- **${name}**: ${vals
    .map((v) => {
      const xs = ok.filter((r) => get(r) === v);
      const pass = xs.filter((r) => r.A.pf >= 1.1 && r.B.pf >= 1.1).length;
      const mB = xs.map((r) => r.B.pf).sort((a, b) => a - b)[xs.length >> 1];
      return `${v} → ${pass}/${xs.length} pass, median B PF ${mB?.toFixed(2)}`;
    })
    .join(" · ")}`;
};
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pc = (x) => `${(x * 100).toFixed(1)}%`;
const days = (U.nowT - U.startT) / 86_400_000;
const md = [
  `# RSI-extreme momentum family — ${tf}m`,
  "",
  `${U.bars.length} symbols · ${days.toFixed(0)} days · half A → ${new Date(split).toISOString().slice(0, 10)} · cost 0.2% round trip · ${rows.length} variants (${ok.length} with ≥ ${minN} trades per half)`,
  "",
  `**Both halves PF ≥ 1.1:** ${surv.length} of ${ok.length}.`,
  "",
  "## Axis view (share of variants passing both halves; median half-B PF)",
  "",
  axis("RSI period", (r) => r.p),
  axis("level", (r) => r.lvl),
  axis("filter", (r) => r.f),
  axis("TP", (r) => r.tp),
  axis("SL ratio", (r) => r.k),
  axis("hold h", (r) => r.h),
  axis("trail share", (r) => r.trs),
  "",
  "## Top 40 (by the weaker half)",
  "",
  "| RSI | level | filter | TP | SL | hold h | trail | A n | A PF | B n | B PF | all PF | trades/day | green hours | green months |",
  "|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...surv
    .slice(0, 40)
    .map(
      (r) =>
        `| ${r.p} | ${r.lvl} | ${r.f} | ${pc(r.tp)} | ${pc(r.tp * r.k)} | ${r.h} | ${r.trs} | ${r.A.n} | ${f2(r.A.pf)} | ${r.B.n} | ${f2(r.B.pf)} | ${f2(r.all.pf)} | ${f2(r.all.n / days)} | ${pc(r.all.gh)} | ${r.green}/${r.months} |`,
    ),
];
const bigN = [...surv]
  .filter((r) => r.A.pf >= 1.15 && r.B.pf >= 1.15)
  .sort((a, b) => b.all.n - a.all.n)
  .slice(0, 25);
md.push(
  "",
  "## Most orders with PF ≥ 1.15 in both halves",
  "",
  md[md.length - 22 - Math.min(40, surv.length) + 20] ?? "",
  "",
);
md.splice(md.length - 2, 2);
md.push(
  "| RSI | level | filter | TP | SL | hold h | trail | A n | A PF | B n | B PF | all PF | trades/day | green hours | green months |",
  "|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...bigN.map(
    (r) =>
      `| ${r.p} | ${r.lvl} | ${r.f} | ${pc(r.tp)} | ${pc(r.tp * r.k)} | ${r.h} | ${r.trs} | ${r.A.n} | ${f2(r.A.pf)} | ${r.B.n} | ${f2(r.B.pf)} | ${f2(r.all.pf)} | ${f2(r.all.n / days)} | ${pc(r.all.gh)} | ${r.green}/${r.months} |`,
  ),
);
const out = arg("out");
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.md`, md.join("\n"));
  writeFileSync(
    `${out}.json`,
    JSON.stringify(
      surv
        .slice(0, 200)
        .map((r) => ({
          p: r.p,
          lvl: r.lvl,
          f: r.f,
          tp: r.tp,
          k: r.k,
          h: r.h,
          trs: r.trs,
          A: { n: r.A.n, pf: r.A.pf },
          B: { n: r.B.n, pf: r.B.pf },
          all: { n: r.all.n, pf: r.all.pf, gh: r.all.gh },
          green: r.green,
          months: r.months,
        })),
      null,
      2,
    ),
  );
}
console.log(md.join("\n"));
