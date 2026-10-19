#!/usr/bin/env node
// CTS-A-O — builds the standalone TP × SL × trailing heatmap (one HTML file, data inline, independent of the app)
// and its line-by-line listing from:
//   --sim   simulation windows (scripts/core-heatmap-sim.mjs JSON files, pooled)
//   --paper the desk's status.json (forward paper book on live prices, not exchange executions); --live is a legacy alias
//   --exchange  optional exchange report of the desk's tag (scripts/core-live-report.mjs JSON)
//
//   node --experimental-strip-types scripts/core-heatmap.mjs --sim runs/hm/sim-w --paper runs/hm/live-heatmap/status.json \
//     --exchange runs/hm/exchange-CTSV2M_.json --html docs/heatmap/index.html --md docs/heatmap.md
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { profitFactor } from "../src/core/metrics/stats.ts";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const simPrefix = arg("sim", "runs/hm/sim-w");
// --live is a legacy input alias; status.json cells always contain the forward paper book.
const paperPath = arg("paper", arg("live", ""));
const exPath = arg("exchange", "");
const htmlOut = arg("html", "docs/heatmap/index.html");
const mdOut = arg("md", "docs/heatmap.md");

const TPS = [1, 2, 3, 4, 5, 6, 7, 8];
const SLS = Array.from({ length: 11 }, (_, i) => +(0.5 + i * 0.25).toFixed(2));
const TRS = [0, 0.5, 0.75];
const key = (tp, sl, tr) => `${tp}|${sl}|${tr}`;
const knownSums = (x) => !!x && !x.unavailable && (x.unknownReturns === undefined || x.unknownReturns === 0) &&
  Number.isFinite(x.n) && x.n >= 0 && Number.isFinite(x.w) && Number.isFinite(x.gp) && x.gp >= 0 && Number.isFinite(x.gl) && x.gl >= 0;
const poolReturns = (a, x) => {
  const n = Number.isFinite(x.n) && x.n >= 0 ? x.n : 0;
  a.n += n;
  if (!knownSums(x)) {
    a.unknownReturns = (a.unknownReturns ?? 0) + (Number.isFinite(x.unknownReturns) && x.unknownReturns > 0 ? x.unknownReturns : Math.max(1, n));
    a.unavailable = true;
    a.gp = null;
    a.gl = null;
    a.w = null;
  } else if (!a.unavailable) {
    a.w += x.w;
    a.gp += x.gp;
    a.gl += x.gl;
  }
};
const pfFields = (prefix, x) => {
  const known = knownSums(x);
  const gp = known ? x.gp : null, gl = known ? x.gl : null;
  const present = (x?.n ?? 0) > 0;
  const noLoss = present && known && gp > 0 && gl === 0;
  return {
    [`${prefix}Pf`]: present && known ? profitFactor(gp, gl) : null,
    [`${prefix}ReturnGp`]: gp,
    [`${prefix}ReturnGl`]: gl,
    [`${prefix}NoLoss`]: noLoss,
    [`${prefix}PfConvention`]: !present || !known ? "unavailable" : noLoss ? "no-loss-sentinel" : "gross-return-ratio",
    [`${prefix}UnknownReturns`]: x?.unknownReturns ?? 0,
  };
};

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
    ["wf", w.wfUnit],
    ["wfWeighted", w.wf],
  ])
    for (const [k, x] of Object.entries(cells ?? {})) {
      const c = sim.get(k) ?? { base: { n: 0, w: 0, gp: 0, gl: 0, tapes: 0, pos: 0, wins: 0 }, wf: { n: 0, w: 0, gp: 0, gl: 0 }, wfWeighted: { n: 0, w: 0, gp: 0, gl: 0 } };
      const a = c[part];
      poolReturns(a, x);
      if (part === "base") {
        a.tapes = Math.max(a.tapes, x.tapes);
        if (x.n > 0) {
          a.wins++;
          if (knownSums(x) && x.gp > x.gl) a.pos++;
        }
      }
      sim.set(k, c);
    }

// --- forward paper book per cell and a separate aggregate exchange report of the tag
const paper = paperPath && existsSync(paperPath) ? JSON.parse(readFileSync(paperPath, "utf8")) : null;
const paperCells = new Map();
for (const [k, x] of Object.entries(paper?.cells ?? {})) {
  // paper keys are absolute percents (TP · SL · trailing) from the config id
  const [tp, sl, tr] = k.split("|").map(Number);
  if (!(tp > 0)) continue;
  const kk = key(+tp.toFixed(2), Math.round((sl / tp) * 4) / 4, tr > 0 ? Math.round((tr / tp) * 4) / 4 : 0);
  const a = paperCells.get(kk) ?? { n: 0, w: 0, gp: 0, gl: 0, usd: 0, seats: 0 };
  poolReturns(a, x);
  a.usd += x.usd ?? 0;
  a.seats += x.seats ?? 0;
  paperCells.set(kk, a);
}
const exchange = exPath && existsSync(exPath) ? JSON.parse(readFileSync(exPath, "utf8")) : null;

// --- rows: every cell of the grid, line by line
const rows = [];
for (const tr of TRS)
  for (const tp of TPS)
    for (const sl of SLS) {
      const k = key(tp, sl, tr);
      const s = sim.get(k);
      const l = paperCells.get(k);
      const b = s?.base;
      const f = s?.wf;
      const weighted = s?.wfWeighted;
      const r = {
        tp,
        sl,
        executionVerified: false,
        tr,
        slPct: +(tp * sl).toFixed(2),
        trPct: +(tp * tr).toFixed(2),
        simN: b?.n ?? 0,
        ...pfFields("sim", b),
        simNet: knownSums(b) ? +((b.gp - b.gl) * 100 / Math.max(1, b.tapes)).toFixed(2) : null,
        simWr: b?.n && knownSums(b) ? +(b.w / b.n).toFixed(3) : null,
        simPos: b ? `${b.pos}/${b.wins}` : "–",
        wfN: f?.n ?? 0,
        ...pfFields("wf", f),
        wfNet: f?.n && knownSums(f) ? +((f.gp - f.gl) * 100).toFixed(2) : null,
        wfPfBasis: f?.n && knownSums(f) ? "unit-net-return-per-simulated-close" : "unavailable",
        wfWeightedN: weighted?.n ?? 0,
        ...pfFields("wfWeighted", weighted),
        wfWeightedPfBasis: "weighted-simulation-or-legacy-unknown-diagnostic",
        paperSeats: l?.seats ?? 0,
        paperN: l?.n ?? 0,
        ...pfFields("paper", l),
        paperNet: l?.n && knownSums(l) ? +((l.gp - l.gl) * 100).toFixed(2) : null,
        paperWr: l?.n && knownSums(l) ? +(l.w / l.n).toFixed(3) : null,
        paperUsd: l?.n ? +l.usd.toFixed(3) : null,
      };
      // Paper qualification is a candidate-screening diagnostic, not proof of profitable exchange executions.
      r.paperQualified = r.simPf !== null && r.simPf >= 1.1 && r.paperPf !== null && r.paperPf >= 1.1 && r.paperN >= 5;
      r.simOnly = !r.paperQualified && r.simPf !== null && r.simPf >= 1.1 && (r.wfPf ?? 0) >= 1.1;
      rows.push(r);
    }

const meta = {
  generated: new Date().toISOString(),
  pfBasis: "net-return-per-close-after-model-costs",
  returnSumUnits: "fraction",
  noLossGateScore: profitFactor(1, 0),
  simulation: {
    basis: "historical-diagnostic-cell-probe",
    stageQualificationVerified: false,
    unitWfWindows: simFiles.filter((w) => w.wfUnit && typeof w.wfUnit === "object").length,
    legacyWfOnlyWindows: simFiles.filter((w) => !w.wfUnit && w.wf).length,
    note: "The WF cell probe bypasses validation last-N qualification and overrides seating/Block controls; it is not evidence of actual stage qualification.",
  },
  windows: simFiles.map((w) => ({
    from: new Date(w.startT).toISOString().slice(0, 16).replace("T", " "),
    to: new Date(w.endT).toISOString().slice(0, 16).replace("T", " "),
    symbols: w.symbols?.length ?? 12,
    tapes: w.tapes,
    evidence: w.evidence ?? null,
  })),
  paper: paper
    ? {
        basis: "forward-paper-return",
        executionVerified: false,
        tag: paper.tag,
        conn: paper.conn,
        hours: +paper.hours.toFixed(2),
        at: paper.at,
        symbols: paper.symbols ?? [],
        seats: rows.reduce((a, r) => a + r.paperSeats, 0),
        closes: rows.reduce((a, r) => a + r.paperN, 0),
        cellsTrading: rows.filter((r) => r.paperSeats > 0 || r.paperN > 0).length,
      }
    : null,
  exchange: exchange
    ? {
        scope: "tag-aggregate",
        cellAttributionAvailable: false,
        orders: exchange.orders ?? exchange.n ?? null,
        positions: exchange.positions ?? null,
        net: exchange.net ?? null,
        fees: exchange.fees ?? null,
        reportedPf: exchange.pf ?? null,
        reportedPfBasis: exchange.pfBasis ?? "unknown",
      }
    : null,
};

// --- markdown listing
const f2 = (x) => (x === null || x === undefined ? "–" : Number(x).toFixed(2));
const pfText = (r, prefix) => r[`${prefix}UnknownReturns`] > 0 ? "Unavailable" : r[`${prefix}NoLoss`] ? "No losses" : f2(r[`${prefix}Pf`]);
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
  `- WF unit return: diagnostic walk-forward cell probe with qualification bypass (validation last-N disabled and seating/Block overridden), not actual stage qualification. Unit-return results available for ${meta.simulation.unitWfWindows}/${meta.windows.length} windows; legacy weighted/unknown WF values are retained separately as diagnostics and never pooled into the unit-return PF.`,
  `Return PF is primary. **No losses** denotes the shared no-loss score convention (${meta.noLossGateScore}), not a measured finite PF ratio; even a tiny positive gross loss uses its measured ratio. Gross return sums and no-loss metadata are retained in the embedded JSON. Cash figures are separate diagnostics.`,
  "",
  meta.paper
    ? `**Forward paper:** ${meta.paper.conn}, tag ${meta.paper.tag}, ${meta.paper.hours} h, every cell seated (${meta.paper.cellsTrading} cells traded or held a seat, ${meta.paper.closes} closes). Paper PF is the desk's per-cell return book on live prices. It contains no settled cash P&L. The attached exchange report is aggregate evidence and cannot verify individual cells.`
    : "**Forward paper:** not run yet.",
  "",
  "**Paper qualified** = sim return PF ≥ 1.1 and forward paper return PF ≥ 1.1 with at least 5 paper closes. **Sim only** = sim and available WF unit return PF ≥ 1.1 without paper qualification. No cell is verified for execution profitability by this report; that requires attributed, settled owned net returns after actual costs.",
  "",
  "## Paper qualified cells",
  "",
  "| TP % | SL × TP | SL % | trailing | sim closes | sim PF | WF unit return PF | paper closes | paper return PF | paper sum return % |",
  "|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|",
  ...rows
    .filter((r) => r.paperQualified)
    .sort((a, b) => (b.paperPf ?? 0) - (a.paperPf ?? 0))
    .map((r) => `| ${r.tp} | ${r.sl} | ${r.slPct} | ${trName(r.tr)} | ${r.simN} | ${pfText(r, "sim")} | ${pfText(r, "wf")} | ${r.paperN} | ${pfText(r, "paper")} | ${f2(r.paperNet)} |`),
  "",
  "## Every cell",
  "",
  "| # | TP % | SL × TP | SL % | trailing | trail % | sim closes | sim PF | sim win % | sim positive windows | WF unit closes | WF unit return PF | WF unit net % | WF weighted/unknown diagnostic closes | WF weighted/unknown diagnostic PF | paper seats | paper closes | paper return PF | paper win % | paper sum return % | verdict |",
  "|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map(
    (r, i) =>
      `| ${i + 1} | ${r.tp} | ${r.sl} | ${r.slPct} | ${trName(r.tr)} | ${r.trPct} | ${r.simN} | ${pfText(r, "sim")} | ${r.simWr === null ? "–" : (r.simWr * 100).toFixed(0)} | ${r.simPos} | ${r.wfN} | ${pfText(r, "wf")} | ${f2(r.wfNet)} | ${r.wfWeightedN} | ${pfText(r, "wfWeighted")} | ${r.paperSeats} | ${r.paperN} | ${pfText(r, "paper")} | ${r.paperWr === null ? "–" : (r.paperWr * 100).toFixed(0)} | ${f2(r.paperNet)} | ${r.paperQualified ? "paper qualified" : r.simOnly ? "sim only" : "–"} |`,
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
  { k: "wfPf", label: "WF unit return PF (probe)", kind: "pf" },
  { k: "wfWeightedPf", label: "Weighted/unknown WF PF (diagnostic)", kind: "pf" },
  { k: "paperPf", label: "Paper return PF", kind: "pf" },
  { k: "paperN", label: "Paper closes", kind: "count" },
  { k: "paperNet", label: "Paper sum return %", kind: "net" },
];
let metric = D.meta.paper && D.rows.some((r) => r.paperN > 0) ? "paperPf" : "simPf";
let show = "all";
const fmt = (x, d = 2) => (x === null || x === undefined ? "–" : Number(x).toFixed(d));
const pfText = (r, k) => !r ? "–" : r[k.slice(0, -2) + "UnknownReturns"] > 0 ? "Unavailable" : r[k.slice(0, -2) + "NoLoss"] ? "No losses" : fmt(r[k]);
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
const visible = (r) => show === "all" || (show === "paperQualified" ? r.paperQualified : show === "sim" ? r.paperQualified || r.simOnly : r.paperN > 0);
function head() {
  const m = D.meta;
  const w = m.windows;
  document.getElementById("sub").textContent =
    "TP 1–8 % × SL 0.5–3 × TP (step 0.25) × trailing (off, 0.5, 0.75 × TP), 264 cells. Simulation: " + w.length +
    " windows × 24 h on 12 symbols (15 m lane, exact targets)" + (w.length ? ", " + w[0].from + " → " + w[w.length - 1].to + " UTC" : "") +
    ". WF is a diagnostic cell probe with qualification bypass, not actual stage qualification. Unit WF available for " + m.simulation.unitWfWindows + "/" + w.length + " windows; legacy weighted/unknown values remain separate diagnostics." +
    (m.paper ? " Forward paper: " + m.paper.conn + ", tag " + m.paper.tag + ", " + m.paper.hours + " h. Paper returns are not account cash PF; no cell has execution-profitability proof." : " Forward paper run pending; execution profitability unverified.");
  const paperQualified = D.rows.filter((r) => r.paperQualified).length;
  const simOnly = D.rows.filter((r) => r.simOnly).length;
  const bestPaper = D.rows.filter((r) => r.paperN >= 5).sort((a, b) => b.paperPf - a.paperPf)[0];
  const bestSim = D.rows.filter((r) => r.simPf !== null).sort((a, b) => b.simPf - a.simPf)[0];
  const tiles = [
    [paperQualified, "paper qualified cells (sim and paper return PF ≥ 1.1)"],
    [simOnly, "sim-only cells (sim and available WF unit return PF ≥ 1.1)"],
    [m.paper ? m.paper.cellsTrading : "–", "cells seated or closed on paper"],
    [m.paper ? m.paper.closes : "–", "forward paper closes; cash PF unavailable"],
    [bestSim ? bestSim.tp + "% · " + bestSim.sl + "× · " + (bestSim.tr || "no") + " trail" : "–", "best sim cell (PF " + pfText(bestSim, "simPf") + ")"],
    [bestPaper ? bestPaper.tp + "% · " + bestPaper.sl + "× · " + (bestPaper.tr || "no") + " trail" : "–", "best forward paper cell, ≥ 5 closes (PF " + pfText(bestPaper, "paperPf") + ")"],
  ];
  document.getElementById("tiles").innerHTML = tiles.map(([v, l]) => '<div class="tile"><b>' + v + "</b><span>" + l + "</span></div>").join("");
  const seg = (id, items, cur, set) => {
    const el = document.getElementById(id);
    el.innerHTML = items.map(([k, l]) => '<button type="button" data-k="' + k + '" aria-pressed="' + (k === cur) + '">' + l + "</button>").join("");
    el.onclick = (e) => { const b = e.target.closest("button"); if (b) { set(b.dataset.k); render(); } };
  };
  seg("metric", METRICS.map((x) => [x.k, x.label]), metric, (k) => (metric = k));
  seg("show", [["all", "All cells"], ["paperQualified", "Paper qualified"], ["sim", "Paper qualified + sim only"], ["paper", "Closed on paper"]], show, (k) => (show = k));
}
function legend(kind) {
  const el = document.getElementById("legend");
  if (kind === "count") {
    el.innerHTML = "<span>fewer</span>" + [1, 2, 3, 4, 5].map((i) => '<i style="background:var(--p' + i + ')"></i>').join("") + "<span>more closes</span>" + '<span class="muted">· grey = no data · green outline = paper qualified</span>';
    return;
  }
  const lab = kind === "net" ? ["loss", "0", "gain"] : ["PF 0.35", "PF 1", "PF 2.8"];
  el.innerHTML = "<span>" + lab[0] + "</span>" + [5, 4, 3, 2, 1].map((i) => '<i style="background:var(--n' + i + ')"></i>').join("") +
    '<i style="background:var(--neutral)"></i>' + [1, 2, 3, 4, 5].map((i) => '<i style="background:var(--p' + i + ')"></i>').join("") +
    "<span>" + lab[2] + '</span><span class="muted">· grey = no data · green outline = paper qualified</span>';
}
function render() {
  head();
  const M = METRICS.find((x) => x.k === metric);
  legend(M.kind);
  const max = Math.max(1, ...D.rows.map((r) => r.paperN));
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
        const txt = M.kind === "pf" ? pfText(r, metric) : v === null || v === undefined || (M.kind === "count" && !v) ? "–" : M.kind === "count" ? v : Number(v).toFixed(1);
        h += bg
          ? '<td tabindex="0" data-i="' + D.rows.indexOf(r) + '" class="' + (r.paperQualified ? "work" : "") + '" style="background:' + bg + ";color:" + inkOn(bg) + '">' + txt + "</td>"
          : '<td tabindex="0" data-i="' + D.rows.indexOf(r) + '" class="empty">' + (on ? txt : "") + "</td>";
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
  ["simPos", "sim + windows"], ["wfN", "WF unit closes"], ["wfPf", "WF unit return PF"], ["wfWeightedN", "WF weighted/unknown diagnostic closes"], ["wfWeightedPf", "WF weighted/unknown diagnostic PF"], ["paperSeats", "paper seats"], ["paperN", "paper closes"],
  ["paperPf", "paper return PF"], ["paperWr", "paper win %"], ["paperNet", "paper sum return %"], ["verdict", "verdict"],
];
let sortK = "paperPf";
let sortDir = -1;
function rowsTable() {
  const rs = D.rows.filter(visible).map((r) => ({ ...r, verdict: r.paperQualified ? "paper qualified" : r.simOnly ? "sim only" : "" }));
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
      if (k === "verdict") return '<td class="l ' + (v === "paper qualified" ? "ok" : "muted") + '">' + (v || "–") + "</td>";
      if (k.endsWith("Pf")) return "<td>" + pfText(r, k) + "</td>";
      if (k === "paperWr") return "<td>" + (v === null ? "–" : (v * 100).toFixed(0)) + "</td>";
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
    "Sim: " + r.simN + " closes · PF " + pfText(r, "simPf") + " · win " + (r.simWr === null ? "–" : (r.simWr * 100).toFixed(0) + " %") + " · positive windows " + r.simPos + "<br>" +
    "Diagnostic WF probe (qualification bypass): " + r.wfN + " unit closes · return PF " + pfText(r, "wfPf") + (r.wfUnknownReturns ? " · " + r.wfUnknownReturns + " unknown returns" : "") + " · unit net " + fmt(r.wfNet) + " %<br>" +
    "Weighted/unknown WF diagnostic: " + r.wfWeightedN + " closes · PF " + pfText(r, "wfWeightedPf") + "<br>" +
    "Forward paper: " + r.paperSeats + " seats · " + r.paperN + " closes · return PF " + pfText(r, "paperPf") + " · sum return " + fmt(r.paperNet) + " %" +
    (r.paperQualified ? '<br><span class="ok">paper qualified</span>' : r.simOnly ? "<br>sim only" : "");
  tip.style.display = "block";
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 14)) + "px";
  tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 14)) + "px";
};
document.getElementById("panels").addEventListener("mousemove", (e) => { const td = e.target.closest("td[data-i]"); if (td) showTip(td, e.clientX, e.clientY); else tip.style.display = "none"; });
document.getElementById("panels").addEventListener("mouseleave", () => (tip.style.display = "none"));
document.getElementById("panels").addEventListener("focusin", (e) => { const td = e.target.closest("td[data-i]"); if (td) { const b = td.getBoundingClientRect(); showTip(td, b.right, b.top); } });
document.getElementById("panels").addEventListener("focusout", () => (tip.style.display = "none"));
document.getElementById("foot").textContent = "Generated " + D.meta.generated.slice(0, 16).replace("T", " ") + " UTC by scripts/core-heatmap.mjs (CTS-A-O). Return PF = gross positive return ÷ gross negative return after model costs. No losses denotes the shared no-loss score convention (" + D.meta.noLossGateScore + "), not a measured finite ratio. WF is a diagnostic cell probe with qualification bypass; these are not actual stage qualification, settled cash results or execution-profitability proof.";
render();
</script>
</body>
</html>
`;
mkdirSync(dirname(htmlOut), { recursive: true });
writeFileSync(htmlOut, html);
process.stderr.write(
  `heatmap: ${rows.length} cells · ${simFiles.length} sim windows · paper ${meta.paper ? `${meta.paper.closes} closes` : "none"} · paper qualified ${rows.filter((r) => r.paperQualified).length} → ${htmlOut}, ${mdOut}\n`,
);
