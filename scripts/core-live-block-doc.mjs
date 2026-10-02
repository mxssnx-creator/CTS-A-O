#!/usr/bin/env node
// CTS-A-O — the live write-up of the Block desks of one x02 VST run: per desk the paper book on live prices (per
// range), the exchange result of its tag (per kind, from scripts/core-live-report.mjs), fills, exchange calls and
// bans, the engine's simulated run, and the Base results per indication type over the desk's window.
//
//   node scripts/core-live-block-doc.mjs --desk "Overall:runs/hm/live-overall:runs/hm/exchange-CTSV2O_.json" \
//     --desk "Shared:…" --desk "Additive:…" --out docs/live-vst-block.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const desks = [];
for (let i = 0; i < argv.length; i++)
  if (argv[i] === "--desk") {
    const [label, dir, ex] = argv[++i].split(":");
    desks.push({ label, dir, ex });
  }
const oi = argv.indexOf("--out");
const out = oi >= 0 ? argv[oi + 1] : "docs/live-vst-block.md";
const read = (f) => (f && existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const pf = (gp, gl) => (gl > 1e-12 ? gp / gl : gp > 0 ? Infinity : 0);
const pfs = (x) => (x === Infinity ? "∞" : f2(x));
const t = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

const rows = desks.map((d) => ({ ...d, s: read(`${d.dir}/status.json`), x: read(d.ex) }));
const md = [];
md.push(`# Block desks live on x02 VST`, ``);
const first = rows.find((r) => r.s)?.s;
if (first)
  md.push(
    `${rows.length} desks ran side by side on the demo account (bingx-vst-02), each with its own client-id tag, on the 12 most volatile symbols of the last hour: ${first.symbols.join(", ")}.`,
    `- **Leverage and size:** maximum leverage per symbol and side; minimum exchange quantity per order (the Block volume in whole lots).`,
    `- **Paper book:** the desk's forward book on live prices, at the same moments as its orders.`,
    `- **Exchange result:** read back from the exchange order history by the desk's tag (realized profit and fees per position).`,
    ``,
  );
md.push(
  `## Summary`,
  ``,
  `| desk | tag | hours | paper closes | paper WR | paper PF | paper $ | exchange orders | exchange positions | exchange PF | exchange net $ | fees $ | sim PF (engine) | sim closes | avg slip % |`,
  `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`,
);
for (const r of rows) {
  const s = r.s;
  if (!s) {
    md.push(`| ${r.label} | – | no status | | | | | | | | | | | | |`);
    continue;
  }
  const p = Object.values(s.paper ?? {}).reduce(
    (a, v) => ({ n: a.n + v.n, w: a.w + v.w, gp: a.gp + v.gp, gl: a.gl + v.gl, usd: a.usd + v.usd }),
    { n: 0, w: 0, gp: 0, gl: 0, usd: 0 },
  );
  const k = Object.values(r.x?.byKind ?? {});
  const xs = k.reduce(
    (a, v) => ({ pos: a.pos + v.positions, gp: a.gp + v.gp, gl: a.gl + v.gl, net: a.net + v.net, fee: a.fee + v.fee }),
    { pos: 0, gp: 0, gl: 0, net: 0, fee: 0 },
  );
  md.push(
    `| ${r.label} | ${s.tag} | ${f2(s.hours)} | ${p.n} | ${p.n ? f2((p.w / p.n) * 100) : "–"} % | ${pfs(pf(p.gp, p.gl))} | ${f2(p.usd)} | ${r.x?.orders ?? "–"} | ${r.x ? xs.pos : "–"} | ${r.x ? pfs(pf(xs.gp, xs.gl)) : "–"} | ${r.x ? f2(xs.net) : "–"} | ${r.x ? f2(xs.fee) : "–"} | ${f2(s.engine?.sim?.pf)} | ${s.engine?.sim?.n ?? "–"} | ${f2((s.fills?.slip ?? NaN) * 100)} |`,
  );
}
md.push(``);
for (const r of rows) {
  const s = r.s;
  if (!s) continue;
  md.push(`## ${r.label} (${s.tag})`, ``);
  md.push(
    `- **Run:** ${f2(s.hours)} h, ending ${s.at.slice(0, 16).replace("T", " ")} UTC${s.final ? " (final status)" : ""}.`,
    `- **Engine:** ${s.engine?.computes ?? "–"} recomputes, last one ${f2((s.engine?.lastComputeMs ?? NaN) / 1000)} s; ${s.engine?.real ?? "–"} configs in Real.`,
    `- **Memory:** RSS ${s.mem?.rssMb ?? "–"} MB, heap ${s.mem?.heapMb ?? "–"} MB.`,
    `- **Fills:** ${s.fills?.n ?? 0}, average slippage ${f2((s.fills?.slip ?? NaN) * 100)} %.`,
    ``,
    `Paper book per range (live prices):`,
    ``,
    `| range | closes | WR | PF | $ |`,
    `|---|---:|---:|---:|---:|`,
  );
  for (const [k, v] of Object.entries(s.paper ?? {}))
    md.push(`| ${k} | ${v.n} | ${v.n ? f2((v.w / v.n) * 100) : "–"} % | ${pfs(pf(v.gp, v.gl))} | ${f2(v.usd)} |`);
  md.push(``);
  if (r.x) {
    md.push(
      `Exchange result per kind (tag ${s.tag}):`,
      ``,
      `| kind | positions | wins | PF | net $ | fees $ | opened notional $ | fee % |`,
      `|---|---:|---:|---:|---:|---:|---:|---:|`,
    );
    for (const [k, v] of Object.entries(r.x.byKind ?? {}))
      md.push(
        `| ${k} | ${v.positions} | ${v.wins} | ${pfs(v.pf)} | ${f2(v.net)} | ${f2(v.fee)} | ${f2(v.notional)} | ${f2(v.feePct)} |`,
      );
    md.push(``);
  }
  md.push(`Own orders by kind letter:`, ``, `| kind | status | orders |`, `|---|---|---:|`);
  for (const o of s.orders ?? []) md.push(`| ${o.kind} | ${o.status} | ${o.n} |`);
  md.push(``);
  const calls = Object.entries(s.exchangeCalls ?? {});
  if (calls.length) {
    md.push(`Exchange calls (rate-limit pauses in brackets):`, ``);
    for (const [k, n] of calls) md.push(`- ${k}: ${n}${s.exchangeBans?.[k] ? ` (${s.exchangeBans[k]})` : ""}`);
    md.push(``);
  }
  const base = s.indications?.base ?? {};
  if (Object.keys(base).length) {
    const w = s.indications.window;
    md.push(
      `Base results per indication type over the engine's window (${w ? `${t(w.startT)} → ${t(w.endT)} UTC` : "–"}), every config, before any selection:`,
      ``,
      `| indication | configs | positive | closes | PF |`,
      `|---|---:|---:|---:|---:|`,
    );
    for (const [k, v] of Object.entries(base).sort((a, b) => b[1].pf - a[1].pf))
      md.push(`| ${k} | ${v.configs} | ${v.positive} | ${v.closes} | ${f2(v.pf)} |`);
    md.push(``);
  }
}
writeFileSync(out, md.join("\n"));
console.log(`wrote ${out} (${rows.length} desks)`);
