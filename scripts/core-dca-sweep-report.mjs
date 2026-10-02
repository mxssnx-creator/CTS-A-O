#!/usr/bin/env node
// CTS-A-O — pools a DCA sweep (scripts/core-dca-sweep.mjs) over its windows. Per variant and kind (DCA, DCA Active):
//   base  every DCA tape over the window: PF, win rate, average r, worst close, legs, drawdown of the averaged curve,
//         positive windows (stability)
//   WF    the Real-stage walk-forward on the DCA tapes alone: closes, PF, net, max drawdown, DDT
// Ranked by a low-drawdown score: base PF, positive in most windows, then the smallest averaged drawdown.
//
//   node scripts/core-dca-sweep-report.mjs --glob runs/dca/s1-w --out runs/dca/stage1 [--top 8]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const prefix = arg("glob", "runs/dca/s1-w");
const out = arg("out", "runs/dca/stage1");
const top = Number(arg("top", 8));
const dir = dirname(prefix);
const wins = readdirSync(dir)
  .filter((f) => f.startsWith(basename(prefix)) && f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const pf = (gp, gl) => (gl > 1e-12 ? gp / gl : gp > 0 ? 99 : 0);
const agg = new Map();
for (const w of wins)
  for (const r of w.rows)
    for (const k of ["dca", "dca-active"]) {
      const key = `${r.name}|${k}`;
      const a =
        agg.get(key) ??
        agg
          .set(key, {
            name: r.name,
            kind: k,
            dca: r.dca,
            w: 0,
            b: { n: 0, gp: 0, gl: 0, wins: 0, pos: 0, mdd: 0, worst: 0, legs: 0, net: 0 },
            f: { n: 0, gp: 0, gl: 0, net: 0, mdd: 0, ddt: 0 },
          })
          .get(key);
      a.w++;
      const b = r.base?.[k];
      if (b) {
        a.b.n += b.n;
        a.b.gp += b.gp;
        a.b.gl += b.gl;
        a.b.net += b.net;
        a.b.mdd = Math.max(a.b.mdd, b.mdd);
        a.b.worst = Math.min(a.b.worst, b.worst);
        a.b.legs += b.legs * b.n;
        if (b.n) {
          a.b.wins++;
          if (b.gp > b.gl) a.b.pos++;
        }
      }
      const f = r.byKind?.[k];
      if (f) {
        a.f.n += f.n;
        a.f.gp += f.gp;
        a.f.gl += f.gl;
        a.f.net += f.net;
        a.f.mdd = Math.max(a.f.mdd, f.mdd);
        a.f.ddt = Math.max(a.f.ddt, f.ddt);
      }
    }
const rows = [...agg.values()].map((a) => ({
  ...a,
  bpf: pf(a.b.gp, a.b.gl),
  fpf: pf(a.f.gp, a.f.gl),
  legs: a.b.n ? a.b.legs / a.b.n : 0,
}));
// low drawdown + stability first: positive in at least 4 of 6 windows and base PF ≥ 1, then return per drawdown
const score = (r) => (r.b.pos >= Math.ceil(r.w * 0.6) && r.bpf >= 1 ? 1 : 0) * 1000 + (r.b.net / Math.max(0.05, r.b.mdd));
rows.sort((x, y) => score(y) - score(x));
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const head = `| variant | kind | base closes | base PF | positive windows | Σ net (avg curve) % | worst avg-curve DD % | worst close % | legs | WF closes | WF PF | WF net % | WF max DD % | WF DDT h |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`;
const line = (r) =>
  `| ${r.name} | ${r.kind} | ${r.b.n} | ${f2(r.bpf)} | ${r.b.pos}/${r.b.wins} | ${f2(r.b.net)} | ${f2(r.b.mdd)} | ${f2(r.b.worst)} | ${f2(r.legs)} | ${r.f.n} | ${f2(r.fpf)} | ${f2(r.f.net)} | ${f2(r.f.mdd)} | ${f2(r.f.ddt)} |`;
const md = [`# DCA sweep: ${wins.length} windows × 24 h, 12 symbols`, ``, head, ...rows.map(line), ``].join("\n");
writeFileSync(`${out}.md`, md);
const best = [];
const seen = new Set();
for (const r of rows) {
  if (seen.has(r.name)) continue;
  seen.add(r.name);
  best.push({ name: r.name, dca: r.dca });
  if (best.length >= top) break;
}
writeFileSync(`${out}.best.json`, JSON.stringify(best, null, 1));
console.log(`${wins.length} windows · ${rows.length} rows`);
console.log(head);
for (const r of rows.slice(0, 24)) console.log(line(r));
