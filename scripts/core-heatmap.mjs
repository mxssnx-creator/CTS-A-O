#!/usr/bin/env node
// CTS-A-O — builds the standalone TP × SL × trailing heatmap (one HTML file, data inline, independent of the app)
// and its line-by-line listing from:
//   --sim   simulation windows (scripts/core-heatmap-sim.mjs JSON files, pooled)
//   --live  the live desk's status.json (per-cell paper book on live prices, seats) on the demo connection
//   --exchange  optional exchange report of the desk's tag (scripts/core-live-report.mjs JSON)
//
//   node scripts/core-heatmap.mjs --sim runs/hm/sim-w --live /tmp/claude-0/hm/runs/hm/live-heatmap/status.json \
//     --exchange runs/hm/exchange-CTSV2M_.json --html docs/heatmap/index.html --md docs/heatmap.md
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const simPrefix = arg("sim", "runs/hm/sim-w");
const livePath = arg("live", "");
const exPath = arg("exchange", "");
const htmlOut = arg("html", "docs/heatmap/index.html");
const mdOut = arg("md", "docs/heatmap.md");

const TPS = [1, 2, 3, 4, 5, 6, 7, 8];
const SLS = Array.from({ length: 11 }, (_, i) => +(0.5 + i * 0.25).toFixed(2));
const TRS = [0, 0.5, 0.75];
const key = (tp, sl, tr) => `${tp}|${sl}|${tr}`;
const pf = (gp, gl) => (gl > 1e-12 ? gp / gl : gp > 0 ? 99 : 0);

// --- simulation windows
const sdir = dirname(simPrefix);
const simFiles = readdirSync(sdir)
  .filter((f) => f.startsWith(basename(simPrefix)) && f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(sdir, f), "utf8")))
  .sort((a, b) => b.endAgo - a.endAgo);
const sim = new Map();
for (const w of simFiles)
  for (const [part, cells] of [
    ["base", w.base],
    ["wf", w.wf],
  ])
    for (const [k, x] of Object.entries(cells ?? {})) {
      const c = sim.get(k) ?? { base: { n: 0, w: 0, gp: 0, gl: 0, tapes: 0, pos: 0, wins: 0 }, wf: { n: 0, w: 0, gp: 0, gl: 0 } };
      const a = c[part];
      a.n += x.n;
      a.w += x.w;
      a.gp += x.gp;
      a.gl += x.gl;
      if (part === "base") {
        a.tapes = Math.max(a.tapes, x.tapes);
        if (x.n > 0) {
          a.wins++;
          if (x.gp > x.gl) a.pos++;
        }
      }
      sim.set(k, c);
    }

// --- live desk (paper book on live prices per cell, seats) and the exchange result of its tag
const live = livePath && existsSync(livePath) ? JSON.parse(readFileSync(livePath, "utf8")) : null;
const liveCells = new Map();
for (const [k, x] of Object.entries(live?.cells ?? {})) {
  // live keys are absolute percents (TP · SL · trailing) from the config id
  const [tp, sl, tr] = k.split("|").map(Number);
  if (!(tp > 0)) continue;
  const kk = key(+tp.toFixed(2), Math.round((sl / tp) * 4) / 4, tr > 0 ? Math.round((tr / tp) * 4) / 4 : 0);
  const a = liveCells.get(kk) ?? { n: 0, w: 0, gp: 0, gl: 0, usd: 0, seats: 0 };
  a.n += x.n;
  a.w += x.w;
  a.gp += x.gp;
  a.gl += x.gl;
  a.usd += x.usd ?? 0;
  a.seats += x.seats ?? 0;
  liveCells.set(kk, a);
}
const exchange = exPath && existsSync(exPath) ? JSON.parse(readFileSync(exPath, "utf8")) : null;

// --- rows: every cell of the grid, line by line
const rows = [];
for (const tr of TRS)
  for (const tp of TPS)
    for (const sl of SLS) {
      const k = key(tp, sl, tr);
      const s = sim.get(k);
      const l = liveCells.get(k);
      const b = s?.base;
      const f = s?.wf;
      const r = {
        tp,
        sl,
        tr,
        slPct: +(tp * sl).toFixed(2),
        trPct: +(tp * tr).toFixed(2),
        simN: b?.n ?? 0,
        simPf: b ? +pf(b.gp, b.gl).toFixed(3) : null,
        simNet: b ? +((b.gp - b.gl) * 100 / Math.max(1, b.tapes)).toFixed(2) : null,
        simWr: b?.n ? +(b.w / b.n).toFixed(3) : null,
        simPos: b ? `${b.pos}/${b.wins}` : "–",
        wfN: f?.n ?? 0,
        wfPf: f?.n ? +pf(f.gp, f.gl).toFixed(3) : null,
        wfNet: f?.n ? +((f.gp - f.gl) * 100).toFixed(2) : null,
        liveSeats: l?.seats ?? 0,
        liveN: l?.n ?? 0,
        livePf: l?.n ? +pf(l.gp, l.gl).toFixed(3) : null,
        liveNet: l?.n ? +((l.gp - l.gl) * 100).toFixed(2) : null,
        liveWr: l?.n ? +(l.w / l.n).toFixed(3) : null,
        liveUsd: l?.n ? +l.usd.toFixed(3) : null,
      };
      // working: the simulation and the live run both clear PF 1.1 (live with at least 5 closes)
      r.working = r.simPf !== null && r.simPf >= 1.1 && r.livePf !== null && r.livePf >= 1.1 && r.liveN >= 5;
      r.simOnly = !r.working && r.simPf !== null && r.simPf >= 1.1 && (r.wfPf ?? 0) >= 1.1;
      rows.push(r);
    }

const meta = {
  generated: new Date().toISOString(),
  windows: simFiles.map((w) => ({
    from: new Date(w.startT).toISOString().slice(0, 16).replace("T", " "),
    to: new Date(w.endT).toISOString().slice(0, 16).replace("T", " "),
    symbols: w.symbols?.length ?? 12,
    tapes: w.tapes,
  })),
  live: live
    ? {
        tag: live.tag,
        conn: live.conn,
        hours: +live.hours.toFixed(2),
        at: live.at,
        symbols: live.symbols ?? [],
        seats: rows.reduce((a, r) => a + r.liveSeats, 0),
        closes: rows.reduce((a, r) => a + r.liveN, 0),
        cellsTrading: rows.filter((r) => r.liveSeats > 0 || r.liveN > 0).length,
      }
    : null,
  exchange: exchange
    ? {
        orders: exchange.orders ?? exchange.n ?? null,
        positions: exchange.positions ?? null,
        net: exchange.net ?? null,
        fees: exchange.fees ?? null,
        pf: exchange.pf ?? null,
      }
    : null,
};

// --- markdown listing
const f2 = (x) => (x === null || x === undefined ? "–" : Number(x).toFixed(2));
const trName = (tr) => (tr ? `trail ${tr} × TP` : "no trail");
const md = [
  "# TP × SL × trailing heatmap: every cell line by line",
  "",
  "Grid:",
  "- TP 1–8 % (step 1 %);",
  "- SL 0.5–3 × TP (step 0.25);",
  "- trailing off, 0.5 × TP or 0.75 × TP;",
  "- 264 cells.",
  "",
  `**Simulation:** ${meta.windows.length} windows × 24 h, 12 symbols, the 15 m reference lane (targets exact). Columns:`,
  "- base: every tape of the cell, all indications × all symbols;",
  "- WF: the Real-stage walk-forward with the cell probe.",
  "",
  meta.live
    ? `**Live:** ${meta.live.conn}, tag ${meta.live.tag}, ${meta.live.hours} h, every cell seated (${meta.live.cellsTrading} cells traded or held a seat, ${meta.live.closes} closes). Live PF is the desk's per-cell book on live prices. The exchange nets the cells per symbol and side, at the minimum quantity and maximum leverage.`
    : "**Live:** not run yet.",
  "",
  "**Working** = sim PF ≥ 1.1 and live PF ≥ 1.1 with at least 5 live closes. **Sim only** = sim and WF PF ≥ 1.1 but not yet confirmed live.",
  "",
  "## Working cells",
  "",
  "| TP % | SL × TP | SL % | trailing | sim closes | sim PF | WF PF | live closes | live PF | live net % |",
  "|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|",
  ...rows
    .filter((r) => r.working)
    .sort((a, b) => (b.livePf ?? 0) - (a.livePf ?? 0))
    .map((r) => `| ${r.tp} | ${r.sl} | ${r.slPct} | ${trName(r.tr)} | ${r.simN} | ${f2(r.simPf)} | ${f2(r.wfPf)} | ${r.liveN} | ${f2(r.livePf)} | ${f2(r.liveNet)} |`),
  "",
  "## Every cell",
  "",
  "| # | TP % | SL × TP | SL % | trailing | trail % | sim closes | sim PF | sim win % | sim positive windows | WF closes | WF PF | WF net % | live seats | live closes | live PF | live win % | live net % | verdict |",
  "|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map(
    (r, i) =>
      `| ${i + 1} | ${r.tp} | ${r.sl} | ${r.slPct} | ${trName(r.tr)} | ${r.trPct} | ${r.simN} | ${f2(r.simPf)} | ${r.simWr === null ? "–" : (r.simWr * 100).toFixed(0)} | ${r.simPos} | ${r.wfN} | ${f2(r.wfPf)} | ${f2(r.wfNet)} | ${r.liveSeats} | ${r.liveN} | ${f2(r.livePf)} | ${r.liveWr === null ? "–" : (r.liveWr * 100).toFixed(0)} | ${f2(r.liveNet)} | ${r.working ? "working" : r.simOnly ? "sim only" : "–"} |`,
  ),
  "",
].join("\n");
mkdirSync(dirname(mdOut), { recursive: true });
writeFileSync(mdOut, md);

// --- HTML (standalone)
const data = JSON.stringify({ meta, rows, TPS, SLS, TRS }).replace(/</g, "\\u003c");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TP SL Heatmap</title>
<style>
:root {
  --page: #f9f9f7; --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --muted: #6e6c66; --grid: #e1e0d9; --axis: #c3c2b7;
  --neutral: #f0efec; --empty: #ebeae5; --focus: #2a78d6;
  --n5: #a32d27; --n4: #c9473f; --n3: #e2766c; --n2: #eea79f; --n1: #f6d4d0;
  --p1: #cde2fb; --p2: #9ec5f4; --p3: #5598e7; --p4: #2a78d6; --p5: #184f95;
  --good: #0ca30c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --page: #0d0d0d; --surface: #1a1a19; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #9a988f; --grid: #2c2c2a; --axis: #383835;
    --neutral: #383835; --empty: #242422;
    --n5: #f0a39a; --n4: #e2766c; --n3: #c9473f; --n2: #8f2f29; --n1: #5a2522;
    --p1: #1b3354; --p2: #184f95; --p3: #2a78d6; --p4: #5598e7; --p5: #9ec5f4;
  }
}
:root[data-theme="dark"] {
  --page: #0d0d0d; --surface: #1a1a19; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #9a988f; --grid: #2c2c2a; --axis: #383835;
  --neutral: #383835; --empty: #242422;
  --n5: #f0a39a; --n4: #e2766c; --n3: #c9473f; --n2: #8f2f29; --n1: #5a2522;
  --p1: #1b3354; --p2: #184f95; --p3: #2a78d6; --p4: #5598e7; --p5: #9ec5f4;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1240px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 16px; margin: 28px 0 8px; }
p.sub { color: var(--ink-2); margin: 0 0 16px; max-width: 900px; }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0 16px; }
.seg { display: inline-flex; border: 1px solid var(--axis); border-radius: 8px; overflow: hidden; }
.seg button { border: 0; background: var(--surface); color: var(--ink-2); padding: 6px 10px; font: inherit; cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--page); }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 8px 0 8px; }
.tile { background: var(--surface); border: 1px solid var(--grid); border-radius: 10px; padding: 10px 12px; }
.tile b { display: block; font-size: 20px; font-variant-numeric: tabular-nums; }
.tile span { color: var(--muted); font-size: 12px; }
.panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
.panel { background: var(--surface); border: 1px solid var(--grid); border-radius: 12px; padding: 12px; overflow-x: auto; }
.panel h3 { margin: 0 0 8px; font-size: 14px; }
table.hm { border-collapse: separate; border-spacing: 2px; font-variant-numeric: tabular-nums; }
table.hm th { font-weight: 500; color: var(--muted); font-size: 11px; padding: 2px; }
table.hm td { width: 30px; height: 26px; text-align: center; font-size: 10px; border-radius: 4px; cursor: default; }
table.hm td.empty { background: var(--empty); color: var(--muted); }
table.hm td:hover, table.hm td:focus { outline: 2px solid var(--focus); outline-offset: 0; }
table.hm td.work { box-shadow: inset 0 0 0 2px var(--good); }
.legend { display: flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 12px; flex-wrap: wrap; }
.legend i { display: inline-block; width: 22px; height: 12px; border-radius: 3px; }
.tip { position: fixed; pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--axis); border-radius: 8px; padding: 8px 10px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.18); display: none; z-index: 9; max-width: 280px; }
.tip b { font-size: 13px; }
.list { background: var(--surface); border: 1px solid var(--grid); border-radius: 12px; overflow-x: auto; }
table.rows { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; font-size: 12px; }
table.rows th, table.rows td { padding: 5px 8px; border-bottom: 1px solid var(--grid); text-align: right; white-space: nowrap; }
table.rows th { position: sticky; top: 0; background: var(--surface); color: var(--ink-2); cursor: pointer; user-select: none; }
table.rows td.l, table.rows th.l { text-align: left; }
.ok { color: var(--good); font-weight: 600; }
.muted { color: var(--muted); }
footer { color: var(--muted); font-size: 12px; margin-top: 16px; }
</style>
</head>
<body>
<main>
<h1>TP × SL × trailing heatmap</h1>
<p class="sub" id="sub"></p>
<div class="tiles" id="tiles"></div>
<div class="bar">
  <div class="seg" role="group" aria-label="Metric" id="metric"></div>
  <div class="seg" role="group" aria-label="Show" id="show"></div>
</div>
<div class="legend" id="legend"></div>
<div class="panels" id="panels"></div>
<h2>Every cell, line by line</h2>
<div class="list"><table class="rows" id="rows"></table></div>
<footer id="foot"></footer>
</main>
<div class="tip" id="tip" role="tooltip"></div>
<script>
const D = ${data};
const METRICS = [
  { k: "simPf", label: "Sim PF", kind: "pf" },
  { k: "wfPf", label: "Walk-forward PF", kind: "pf" },
  { k: "livePf", label: "Live PF", kind: "pf" },
  { k: "liveN", label: "Live closes", kind: "count" },
  { k: "liveNet", label: "Live net %", kind: "net" },
];
let metric = D.meta.live && D.rows.some((r) => r.liveN > 0) ? "livePf" : "simPf";
let show = "all";
const fmt = (x, d = 2) => (x === null || x === undefined ? "–" : Number(x).toFixed(d));
const pfColor = (v) => {
  if (v === null || v === undefined) return null;
  const x = Math.max(-1.5, Math.min(1.5, Math.log2(Math.max(v, 0.01))));
  if (Math.abs(x) < 0.07) return "var(--neutral)";
  const step = Math.min(5, Math.ceil(Math.abs(x) / 0.3));
  return x > 0 ? "var(--p" + step + ")" : "var(--n" + step + ")";
};
const netColor = (v) => (v === null ? null : v === 0 ? "var(--neutral)" : pfColor(v > 0 ? 1 + Math.min(v, 20) / 10 : 1 / (1 + Math.min(-v, 20) / 10)));
const cntColor = (v, max) => (!v ? null : "var(--p" + Math.max(1, Math.min(5, Math.ceil((v / Math.max(1, max)) * 5))) + ")");
const isDark = () => document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
// strong steps: dark fills in light mode (white ink), light fills in dark mode (dark ink)
const inkOn = (bg) => (/--(p4|p5|n4|n5)\\b/.test(bg) ? (isDark() ? "#0b0b0b" : "#ffffff") : "var(--ink)");
const visible = (r) => show === "all" || (show === "working" ? r.working : show === "sim" ? r.working || r.simOnly : r.liveN > 0);
function head() {
  const m = D.meta;
  const w = m.windows;
  document.getElementById("sub").textContent =
    "TP 1–8 % × SL 0.5–3 × TP (step 0.25) × trailing (off, 0.5, 0.75 × TP), 264 cells. Simulation: " + w.length +
    " windows × 24 h on 12 symbols (15 m lane, exact targets)" + (w.length ? ", " + w[0].from + " → " + w[w.length - 1].to + " UTC" : "") +
    (m.live ? ". Live: " + m.live.conn + " (demo), tag " + m.live.tag + ", " + m.live.hours + " h, minimum quantity at maximum leverage." : ". Live run pending.");
  const working = D.rows.filter((r) => r.working).length;
  const simOnly = D.rows.filter((r) => r.simOnly).length;
  const bestLive = D.rows.filter((r) => r.liveN >= 5).sort((a, b) => b.livePf - a.livePf)[0];
  const bestSim = D.rows.filter((r) => r.simPf !== null).sort((a, b) => b.simPf - a.simPf)[0];
  const tiles = [
    [working, "working cells (sim and live PF ≥ 1.1)"],
    [simOnly, "sim-only cells (sim and WF PF ≥ 1.1)"],
    [m.live ? m.live.cellsTrading : "–", "cells seated or traded live"],
    [m.live ? m.live.closes : "–", "live closes (paper book on live prices)"],
    [bestSim ? bestSim.tp + "% · " + bestSim.sl + "× · " + (bestSim.tr || "no") + " trail" : "–", "best sim cell (PF " + fmt(bestSim && bestSim.simPf) + ")"],
    [bestLive ? bestLive.tp + "% · " + bestLive.sl + "× · " + (bestLive.tr || "no") + " trail" : "–", "best live cell, ≥ 5 closes (PF " + fmt(bestLive && bestLive.livePf) + ")"],
  ];
  document.getElementById("tiles").innerHTML = tiles.map(([v, l]) => '<div class="tile"><b>' + v + "</b><span>" + l + "</span></div>").join("");
  const seg = (id, items, cur, set) => {
    const el = document.getElementById(id);
    el.innerHTML = items.map(([k, l]) => '<button type="button" data-k="' + k + '" aria-pressed="' + (k === cur) + '">' + l + "</button>").join("");
    el.onclick = (e) => { const b = e.target.closest("button"); if (b) { set(b.dataset.k); render(); } };
  };
  seg("metric", METRICS.map((x) => [x.k, x.label]), metric, (k) => (metric = k));
  seg("show", [["all", "All cells"], ["working", "Working"], ["sim", "Working + sim only"], ["live", "Traded live"]], show, (k) => (show = k));
}
function legend(kind) {
  const el = document.getElementById("legend");
  if (kind === "count") {
    el.innerHTML = "<span>fewer</span>" + [1, 2, 3, 4, 5].map((i) => '<i style="background:var(--p' + i + ')"></i>').join("") + "<span>more closes</span>" + '<span class="muted">· grey = no data · green outline = working</span>';
    return;
  }
  const lab = kind === "net" ? ["loss", "0", "gain"] : ["PF 0.35", "PF 1", "PF 2.8"];
  el.innerHTML = "<span>" + lab[0] + "</span>" + [5, 4, 3, 2, 1].map((i) => '<i style="background:var(--n' + i + ')"></i>').join("") +
    '<i style="background:var(--neutral)"></i>' + [1, 2, 3, 4, 5].map((i) => '<i style="background:var(--p' + i + ')"></i>').join("") +
    "<span>" + lab[2] + '</span><span class="muted">· grey = no data · green outline = working</span>';
}
function render() {
  head();
  const M = METRICS.find((x) => x.k === metric);
  legend(M.kind);
  const max = Math.max(1, ...D.rows.map((r) => r.liveN));
  const panels = D.TRS.map((tr) => {
    let h = '<div class="panel"><h3>' + (tr ? "Trailing " + tr + " × TP" : "No trailing") + '</h3><table class="hm"><thead><tr><th>TP \\\\ SL×</th>' +
      D.SLS.map((s) => "<th>" + s + "</th>").join("") + "</tr></thead><tbody>";
    for (const tp of D.TPS) {
      h += "<tr><th>" + tp + "%</th>";
      for (const sl of D.SLS) {
        const r = D.rows.find((x) => x.tp === tp && x.sl === sl && x.tr === tr);
        const v = r[metric];
        const on = visible(r);
        const bg = !on ? null : M.kind === "pf" ? pfColor(v) : M.kind === "net" ? netColor(v) : cntColor(v, max);
        const txt = v === null || v === undefined || (M.kind === "count" && !v) ? "–" : M.kind === "count" ? v : Number(v).toFixed(M.kind === "pf" ? 2 : 1);
        h += bg
          ? '<td tabindex="0" data-i="' + D.rows.indexOf(r) + '" class="' + (r.working ? "work" : "") + '" style="background:' + bg + ";color:" + inkOn(bg) + '">' + txt + "</td>"
          : '<td tabindex="0" data-i="' + D.rows.indexOf(r) + '" class="empty">' + (on ? "–" : "") + "</td>";
      }
      h += "</tr>";
    }
    return h + "</tbody></table></div>";
  });
  document.getElementById("panels").innerHTML = panels.join("");
  rowsTable();
}
const COLS = [
  ["tp", "TP %"], ["sl", "SL × TP"], ["slPct", "SL %"], ["tr", "trail × TP"], ["simN", "sim closes"], ["simPf", "sim PF"],
  ["simPos", "sim + windows"], ["wfN", "WF closes"], ["wfPf", "WF PF"], ["liveSeats", "live seats"], ["liveN", "live closes"],
  ["livePf", "live PF"], ["liveWr", "live win %"], ["liveNet", "live net %"], ["verdict", "verdict"],
];
let sortK = "livePf";
let sortDir = -1;
function rowsTable() {
  const rs = D.rows.filter(visible).map((r) => ({ ...r, verdict: r.working ? "working" : r.simOnly ? "sim only" : "" }));
  rs.sort((a, b) => {
    const x = a[sortK], y = b[sortK];
    if (x === y) return 0;
    if (x === null || x === undefined || x === "") return 1;
    if (y === null || y === undefined || y === "") return -1;
    return (x < y ? -1 : 1) * sortDir;
  });
  const t = document.getElementById("rows");
  t.innerHTML = "<thead><tr><th>#</th>" + COLS.map(([k, l]) => '<th data-k="' + k + '" class="' + (k === "verdict" ? "l" : "") + '">' + l + (k === sortK ? (sortDir < 0 ? " ↓" : " ↑") : "") + "</th>").join("") + "</tr></thead><tbody>" +
    rs.map((r, i) => "<tr><td>" + (i + 1) + "</td>" + COLS.map(([k]) => {
      const v = r[k];
      if (k === "verdict") return '<td class="l ' + (v === "working" ? "ok" : "muted") + '">' + (v || "–") + "</td>";
      if (k === "liveWr") return "<td>" + (v === null ? "–" : (v * 100).toFixed(0)) + "</td>";
      if (typeof v === "number" && !Number.isInteger(v)) return "<td>" + v.toFixed(2) + "</td>";
      return "<td>" + (v === null || v === undefined ? "–" : v) + "</td>";
    }).join("") + "</tr>").join("") + "</tbody>";
  t.querySelector("thead").onclick = (e) => {
    const th = e.target.closest("th[data-k]");
    if (!th) return;
    if (sortK === th.dataset.k) sortDir = -sortDir; else { sortK = th.dataset.k; sortDir = -1; }
    rowsTable();
  };
}
const tip = document.getElementById("tip");
const showTip = (td, x, y) => {
  const r = D.rows[+td.dataset.i];
  if (!r) return;
  tip.innerHTML = "<b>TP " + r.tp + " % · SL " + r.sl + " × (" + r.slPct + " %) · " + (r.tr ? "trail " + r.tr + " × (" + r.trPct + " %)" : "no trail") + "</b><br>" +
    "Sim: " + r.simN + " closes · PF " + fmt(r.simPf) + " · win " + (r.simWr === null ? "–" : (r.simWr * 100).toFixed(0) + " %") + " · positive windows " + r.simPos + "<br>" +
    "Walk-forward: " + r.wfN + " closes · PF " + fmt(r.wfPf) + " · net " + fmt(r.wfNet) + " %<br>" +
    "Live: " + r.liveSeats + " seats · " + r.liveN + " closes · PF " + fmt(r.livePf) + " · net " + fmt(r.liveNet) + " %" +
    (r.working ? '<br><span class="ok">working</span>' : r.simOnly ? "<br>sim only" : "");
  tip.style.display = "block";
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 14)) + "px";
  tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 14)) + "px";
};
document.getElementById("panels").addEventListener("mousemove", (e) => { const td = e.target.closest("td[data-i]"); if (td) showTip(td, e.clientX, e.clientY); else tip.style.display = "none"; });
document.getElementById("panels").addEventListener("mouseleave", () => (tip.style.display = "none"));
document.getElementById("panels").addEventListener("focusin", (e) => { const td = e.target.closest("td[data-i]"); if (td) { const b = td.getBoundingClientRect(); showTip(td, b.right, b.top); } });
document.getElementById("panels").addEventListener("focusout", () => (tip.style.display = "none"));
document.getElementById("foot").textContent = "Generated " + D.meta.generated.slice(0, 16).replace("T", " ") + " UTC by scripts/core-heatmap.mjs (CTS-A-O). Demo account only; PF = gross profit ÷ gross loss after the 0.2 % position cost.";
render();
</script>
</body>
</html>
`;
mkdirSync(dirname(htmlOut), { recursive: true });
writeFileSync(htmlOut, html);
process.stderr.write(
  `heatmap: ${rows.length} cells · ${simFiles.length} sim windows · live ${meta.live ? `${meta.live.closes} closes` : "none"} · working ${rows.filter((r) => r.working).length} → ${htmlOut}, ${mdOut}\n`,
);
