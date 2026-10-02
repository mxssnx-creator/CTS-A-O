#!/usr/bin/env node
// CTS-A-O — pools a Block sweep (scripts/core-block-sweep.mjs) over its windows: per variant the combined PF
// (Σ gross profit ÷ Σ gross loss), net, closes, positive windows, worst window, drawdown and volume; ranked by
// combined PF among the variants that are positive in most windows. Writes markdown, prints the top lines.
//
//   node scripts/core-block-sweep-report.mjs --glob runs/blk/s1-w --out runs/blk/stage1 [--top 12] [--min-n 60]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const prefix = arg("glob", "runs/blk/s1-w");
const out = arg("out", "runs/blk/stage1");
const top = Number(arg("top", 12));
const minN = Number(arg("min-n", 60));
const dir = dirname(prefix);
const files = readdirSync(dir)
  .filter((f) => f.startsWith(basename(prefix)) && f.endsWith(".json"))
  .map((f) => join(dir, f));
const wins = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
const pf = (gp, gl) => (gl > 1e-12 ? gp / gl : gp > 0 ? 99 : 0);
const agg = new Map();
for (const w of wins)
  for (const r of [...w.rows, ...(w.rangeRows ?? [])]) {
    const a =
      agg.get(r.name) ??
      agg
        .set(r.name, { name: r.name, patch: r.patch, w: 0, n: 0, gp: 0, gl: 0, net: 0, pos: 0, worst: Infinity, mdd: 0, ddt: 0, gh: 0, vol: 0, skipA: 0, ranges: {} })
        .get(r.name);
    a.w++;
    a.n += r.n;
    a.gp += r.gp ?? 0;
    a.gl += r.gl ?? 0;
    a.net += r.net;
    if (r.net > 0) a.pos++;
    a.worst = Math.min(a.worst, r.n ? r.pf : 1);
    a.mdd = Math.max(a.mdd, r.mdd ?? 0);
    a.ddt += r.ddt ?? 0;
    a.gh += r.gh ?? 0;
    a.vol += r.avgVol ?? 1;
    a.skipA += r.skipActive ?? 0;
    for (const [k, v] of Object.entries(r.byRange ?? {})) {
      const b = (a.ranges[k] ??= { n: 0, gp: 0, gl: 0 });
      b.n += v.n;
      b.gp += v.gp ?? 0;
      b.gl += v.gl ?? 0;
    }
  }
const rows = [...agg.values()].map((a) => ({
  ...a,
  pf: pf(a.gp, a.gl),
  ddt: a.ddt / a.w,
  gh: a.gh / a.w,
  vol: a.vol / a.w,
}));
const W = wins.length;
const eligible = rows.filter((r) => r.n >= minN && r.pos >= Math.ceil(W * 0.6) && r.net > 0);
eligible.sort((a, b) => b.pf - a.pf);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const line = (r) =>
  `| ${r.name} | ${r.n} | ${f2(r.pf)} | ${f2(r.net)} | ${r.pos}/${r.w} | ${f2(r.worst)} | ${f2(r.mdd)} | ${f2(r.ddt)} | ${(r.gh * 100).toFixed(0)} % | ${f2(r.vol)} | ${Object.entries(r.ranges).map(([k, v]) => `${k} ${v.n}·${f2(pf(v.gp, v.gl))}`).join(", ")} |`;
const head = `| variant | closes | PF | net % | positive windows | worst window PF | max DD % | avg DDT h | green hours | avg volume | per range (n·PF) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|`;
const base = rows.filter((r) => r.name.startsWith("no-block") || r.name.startsWith("range "));
const md = [
  `# Block sweep — ${W} windows × 24 h, ${wins[0]?.symbols ?? "?"} symbols`,
  ``,
  `Tapes per window: ${wins.map((w) => w.tapes).join(" / ")} · compute ${wins.map((w) => Math.round(w.computeS)).join(" / ")} s · RSS ${wins.map((w) => w.rssMaxMb).join(" / ")} MB`,
  ``,
  `## Baselines and ranges`,
  ``,
  head,
  ...base.map(line),
  ``,
  `## Ranked (closes ≥ ${minN}, positive in ≥ ${Math.ceil(W * 0.6)} of ${W} windows, net > 0), by combined PF`,
  ``,
  head,
  ...eligible.map(line),
  ``,
  `## Every variant`,
  ``,
  head,
  ...[...rows].sort((a, b) => b.pf - a.pf).map(line),
  ``,
].join("\n");
writeFileSync(`${out}.md`, md);
writeFileSync(`${out}.best.json`, JSON.stringify(eligible.slice(0, top).map((r) => ({ name: r.name, patch: r.patch })), null, 1));
console.log(`${W} windows · ${rows.length} variants · ${eligible.length} eligible`);
for (const r of [...base, ...eligible.slice(0, top)]) console.log(line(r));
if (!existsSync(`${out}.md`)) process.exit(1);
