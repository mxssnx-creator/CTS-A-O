#!/usr/bin/env node
// Render the frozen exploratory study; preserve empty and losing rows.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";
const [dir, output] = process.argv.slice(2);
if (!dir || !output) throw new Error("usage: render-micro-hold-report.mjs <study-dir> <output.html>");
const data = JSON.parse(readFileSync(`${dir}/results.json`));
const esc = (v) => String(v ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const f = (n, d = 3) => Number.isFinite(n) ? n.toFixed(d) : "—";
const pf = (gp, gl) => gl > 0 ? f(gp / gl) : gp > 0 ? "no losses" : "—";
const table = (heads, rows) => `<table><thead><tr>${heads.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const sections = data.items.map((arm) => {
  const bytes = gunzipSync(readFileSync(`${dir}/hold-${arm.cap}-orders.jsonl.gz`)).toString("utf8").trim();
  const orders = bytes ? bytes.split("\n").map(JSON.parse) : [];
  if (orders.length !== arm.modeled.n || arm.directionRows.length !== arm.evaluatedDirections) throw new Error(`incomplete arm ${arm.cap}`);
  const base = arm.baseRows.map((x) => [x.pair, x.micro?.n ?? "—", pf(x.micro?.gp, x.micro?.gl), f(x.micro?.net, 4), x.cellsPassed]);
  const dirs = arm.directionRows.map((x) => [x.cfg, x.kind, x.side === 1 ? "Long" : "Short", x.passed ? "pass" : x.fail, x.n, pf(x.gp, x.gl), f(x.net, 4)]);
  const closes = orders.map((x) => [x.cfg, x.kind, x.sym, x.side === 1 ? "Long" : "Short", new Date(x.entryT).toISOString(),
    new Date(x.exitT).toISOString(), f(x.entry, 8), f(x.exit, 8), (x.exitT - x.entryT) / 60_000, x.reason, f(modeledUnitReturn(x), 9)]);
  return `<section><h2 id="h${arm.cap}">${arm.cap}-minute cap</h2><p>Micro Base passed ${arm.microBasePairsPassed}/${arm.basePairsEvaluated} scoped pairs; ${arm.baseCellsPassed} exact cells. Validation ${arm.validatedDirections}/${arm.evaluatedDirections} directions, historical PF ${f(arm.historicalPf)}. Forward ${arm.modeled.n} model closes, PF ${f(arm.modeled.pf)}. Zero-close and ineligible contexts remain included in the declared scope.</p><h3>Base: each scoped indication and lane</h3>${table(["Pair", "Best cell closes", "Best cell PF", "Best cell net %", "Passed exact cells"], base)}<h3>Each built config and direction</h3>${table(["Exact config ID", "Type", "Side", "Validation", "Closes", "Historical PF", "Net %"], dirs)}<h3>Every forward model close</h3>${table(["Exact config ID", "Type", "Symbol", "Side", "Entry UTC", "Exit UTC", "Entry", "Exit", "Minutes", "Exit reason", "Unit return after cost"], closes)}</section>`;
}).join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Micro hold-cap replay</title><style>body{font:14px system-ui,sans-serif;margin:2rem;color:#18202a}p{max-width:95rem;line-height:1.45}table{border-collapse:collapse;font-size:12px;margin:1rem 0;display:block;overflow-x:auto}th,td{border:1px solid #c8d0d8;padding:5px;text-align:left;vertical-align:top}th{background:#edf1f5}td:first-child{min-width:18rem;overflow-wrap:anywhere}section{margin-top:3rem}nav a{margin-right:1rem}</style></head><body><h1>Micro hold-cap replay</h1><p>Exploratory cached-feed comparison, not exchange fills, a fresh holdout, or a profitable recommendation. Historical evaluation: 2026-10-08 12:00–2026-10-09 12:00 UTC. Forward: 2026-10-09 12:00–2026-10-10 12:00 UTC. Twenty symbols; 1/5/15m lanes; four Micro net TP steps; one stop ratio; Normal, capped Trailing and trailing-only. 1m eligibility was enabled for this research only. One 0.15% round-trip model cost is included. Validation Last-N is 15; the newer Base 40 / Validation 12 request is not part of this completed run.</p><nav>${data.items.map((a) => `<a href="#h${a.cap}">${a.cap}m</a>`).join("")}</nav>${sections}</body></html>\n`;
writeFileSync(output, html);
console.log(JSON.stringify({ output, arms: data.items.length }));
