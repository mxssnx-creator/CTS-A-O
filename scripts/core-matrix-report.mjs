#!/usr/bin/env node
// Summarises docs/matrix/*.{cur,prev,prev2}.json: every settings variant × execution preset over all periods.
// A combination qualifies when every period has PF ≥ --minPf and ≥ --minPerDay orders a day.
//   node scripts/core-matrix-report.mjs --dir docs/matrix --out docs/matrix.md
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const dir = arg("dir", "docs/matrix");
const minPf = Number(arg("minPf", 1.05));
const minPerDay = Number(arg("minPerDay", 3));
const periods = arg("periods", "cur,prev,prev2").split(",");
const rows = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const [variant, period] = f.replace(/\.json$/, "").split(".");
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const r of j.rows) {
    const k = `${variant}|${r.preset}`;
    const e = rows.get(k) ?? {
      variant,
      preset: r.preset,
      label: r.label,
      settings: j.settings,
      patch: j.patch,
      per: {},
    };
    const rd = r.runsDetail;
    e.per[period] = {
      pf: r.pf,
      n: r.n,
      perDay: r.perDay,
      wr: r.wr,
      gh: r.gh,
      net: r.net,
      greenDays: r.greenDays,
      days: r.days,
      positiveRuns: r.positiveRuns,
      runs: r.runs,
      ddt: r.ddt,
      from: rd[0]?.startT,
      to: rd[rd.length - 1]?.startT + j.runH * 3_600_000,
      symbols: j.symbols,
    };
    rows.set(k, e);
  }
}
const all = [...rows.values()].filter((e) => periods.every((p) => e.per[p]));
for (const e of all) {
  e.minPf = Math.min(...periods.map((p) => e.per[p].pf));
  e.ok = periods.every((p) => e.per[p].pf >= minPf && e.per[p].perDay >= minPerDay);
}
all.sort((a, b) => b.minPf - a.minPf);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pct = (x) => `${Math.round(x * 100)}%`;
const md = [
  `# Simulated trading matrix`,
  "",
  `${new Set(all.map((e) => e.variant)).size} settings variants × ${new Set(all.map((e) => e.preset)).size} execution presets × ${periods.length} periods (${periods.join(", ")}) — every cell a complete causal walk-forward long run of 48 h runs on real 1h BingX data, 0.2% round-trip cost. Variant id = signal set – tactic – Block/DCA settings – last-N.`,
  "",
  `**Qualifying (PF ≥ ${minPf} and ≥ ${minPerDay} orders/day in every period): ${all.filter((e) => e.ok).length} of ${all.length}.**`,
  "",
  `| variant | execution | ${periods.map((p) => `${p} PF (orders/day · green h)`).join(" | ")} | worst PF |`,
  `|---|---|${periods.map(() => "---:").join("|")}|---:|`,
  ...all
    .slice(0, 80)
    .map(
      (e) =>
        `| ${e.variant} | ${e.label} | ${periods.map((p) => `${f2(e.per[p].pf)} (${f2(e.per[p].perDay)} · ${pct(e.per[p].gh)})`).join(" | ")} | ${e.ok ? "**" : ""}${f2(e.minPf)}${e.ok ? "**" : ""} |`,
    ),
];
// per execution preset: median worst-PF across variants
md.push(
  "",
  "## By execution preset (median over settings variants)",
  "",
  `| execution | ${periods.map((p) => `median PF ${p}`).join(" | ")} |`,
  `|---|${periods.map(() => "---:").join("|")}|`,
);
for (const preset of [...new Set(all.map((e) => e.preset))]) {
  const xs = all.filter((e) => e.preset === preset);
  const med = (p) => {
    const v = xs.map((e) => e.per[p].pf).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  md.push(`| ${xs[0].label} | ${periods.map((p) => f2(med(p))).join(" | ")} |`);
}
md.push(
  "",
  "## By settings variant (median over execution presets)",
  "",
  `| variant | ${periods.map((p) => `median PF ${p}`).join(" | ")} |`,
  `|---|${periods.map(() => "---:").join("|")}|`,
);
for (const v of [...new Set(all.map((e) => e.variant))].sort()) {
  const xs = all.filter((e) => e.variant === v);
  const med = (p) => {
    const s = xs.map((e) => e.per[p].pf).sort((a, b) => a - b);
    return s[s.length >> 1];
  };
  md.push(`| ${v} | ${periods.map((p) => f2(med(p))).join(" | ")} |`);
}
writeFileSync(arg("out", "docs/matrix.md"), md.join("\n"));
writeFileSync(arg("out", "docs/matrix.md").replace(/\.md$/, ".json"), JSON.stringify(all, null, 1));
console.log(md.slice(0, 30).join("\n"));
console.log(md.slice(md.findIndex((l) => l.startsWith("## By execution"))).join("\n"));
