#!/usr/bin/env node
// Render the frozen screen and walk-forward ledgers as an inspectable static report.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { configId } from "../src/core/pipeline/pipeline.ts";
import { modeledUnitReturn } from "../src/core/metrics/stats.ts";

const [dir, output] = process.argv.slice(2);
if (!dir || !output) throw new Error("usage: render-base60-replay-report.mjs <evidence-dir> <output.html>");
const read = (path) => JSON.parse(readFileSync(path));
const lines = (path) => gunzipSync(readFileSync(path)).toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const esc = (v) => String(v ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const number = (v, digits = 4) => Number.isFinite(v) ? v.toFixed(digits) : v === "no-loss" ? "no losses" : "—";
const ratio = (gp, gl) => gl > 0 ? number(gp / gl, 3) : gp > 0 ? "no losses" : "—";
const table = (headers, rows) => `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const runtime = read(`${dir}/walkforward/results.json`);
const sections = [];
for (const n of [8, 10, 12]) {
  const source = `${dir}/validation-${n}`;
  const screen = read(`${source}/results.json`), cells = lines(`${source}/cells.jsonl.gz`);
  const arm = runtime.arms.find((r) => r.validLastN === n && r.coordination === "default");
  const orders = lines(`${dir}/walkforward/${arm.orderFile}`);
  if (orders.length !== arm.modeled.closes || cells.length !== screen.total.cells) throw new Error(`incomplete evidence for Validation ${n}`);
  const byDirection = new Map();
  for (const trade of orders) {
    const key = JSON.stringify([trade.cfg, trade.side]);
    const value = byDirection.get(key) ?? { n: 0, gp: 0, gl: 0 };
    const r = modeledUnitReturn(trade);
    if (!Number.isFinite(r)) throw new Error(`unknown unit return: ${trade.cfg}`);
    value.n++; value.gp += Math.max(0, r); value.gl += Math.max(0, -r); byDirection.set(key, value);
  }
  const detail = [];
  for (const cell of cells.filter((c) => c.base.passed)) {
    const id = configId("follow", cell.ind, cell.protect);
    for (const d of cell.directions) {
      const actual = byDirection.get(JSON.stringify([id, d.side])) ?? { n: 0, gp: 0, gl: 0 };
      detail.push([id, d.side === 1 ? "Long" : "Short", cell.initiallyValidated ? "yes" : "no",
        `${d.initial.passed ? "pass" : `fail: ${d.initial.fail}`} (${d.initial.n})`, number(d.initial.pf, 3),
        `${d.forwardGate.passed}/${d.forwardGate.candidates}`, d.forward.settled, ratio(d.forward.gp, d.forward.gl),
        actual.n, ratio(actual.gp, actual.gl), number(actual.gp - actual.gl, 6)]);
    }
  }
  const sorted = [...orders].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || a.cfg.localeCompare(b.cfg));
  sections.push(`<section><h2 id="n${n}">Validation ${n}</h2><p>Initial validation ${arm.directionValidated}/${arm.directionEvaluated} (${number(100 * arm.directionValidated / arm.directionEvaluated, 2)}%), historical PF ${number(arm.initialHistoricalPf, 3)}. Unallocated walk-forward: ${arm.modeled.closes} closes, PF ${number(arm.modeled.pf, 3)}, ${arm.openAtEnd} held. Screen forward PF ${number(screen.total.forwardPf, 3)} on ${screen.total.settled} closes.</p>
  <h3>Hourly selection and entry decisions</h3>${table(["Hour UTC", "Selected configs", "Taken", "Skipped"], arm.steps.map((s) => [new Date(s.t).toISOString(), s.selected, s.taken, s.skipped]))}
  <h3>Every Base-passing config and direction</h3><p>Initial direction verdicts are evaluated at 2026-10-09 12:00 UTC. An initially failing direction can be reconsidered by the later rolling entry gate. Screen and walk-forward are different models, and overlapping config results are not allocated account returns.</p>${table(["Exact config ID", "Side", "Initial Active ID", "Initial direction / closes", "Historical PF", "Screen entry pass / candidates", "Screen closes", "Screen PF", "Walk-forward closes", "Walk-forward PF", "Walk-forward net units"], detail)}
  <h3>Every walk-forward close</h3><p>Prices are stored at tape precision (float32); returns and price-path audit use the sealed source simulation. Each return includes one 0.15% modeled round-trip cost. No venue fills are represented.</p>${table(["Exact config ID", "Symbol", "Side", "Entry UTC", "Exit UTC", "Entry", "Exit", "Hold minutes", "Exit reason", "Unit return after cost"], sorted.map((t) => [t.cfg, t.sym, t.side === 1 ? "Long" : "Short", new Date(t.entryT).toISOString(), new Date(t.exitT).toISOString(), number(t.entry, 8), number(t.exit, 8), (t.exitT - t.entryT) / 60_000, t.reason, number(modeledUnitReturn(t), 9)]))}</section>`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Base 60 / Validation 8, 10, 12 — modeled replay</title><style>body{font:14px system-ui,sans-serif;margin:2rem;color:#18202a}h1,h2,h3{line-height:1.2}p{max-width:95rem;line-height:1.45}table{border-collapse:collapse;font-size:12px;margin:1rem 0;display:block;overflow-x:auto}th,td{border:1px solid #c8d0d8;padding:5px;text-align:left;vertical-align:top}th{background:#edf1f5;position:sticky;top:0}td:first-child{min-width:18rem;overflow-wrap:anywhere}section{margin-top:3rem}nav a{margin-right:1rem}</style></head><body><h1>Base 60 / Validation 8, 10, 12</h1><p>Retrospective unallocated Low-Range research, not exchange fills or an untouched holdout. Evaluation: 2026-10-08 12:00–2026-10-09 12:00 UTC; forward: 2026-10-09 12:00–2026-10-10 12:00 UTC. Short range only, Normal and capped Trailing, 1/5/15m, 20 symbols, 60-minute hold, 0.15% modeled round-trip cost. Base 60 is an additional research gate after the aggregate Base gate; live x01 normally applies a Validation Last-N floor of 50.</p><nav><a href="#n8">Validation 8</a><a href="#n10">Validation 10</a><a href="#n12">Validation 12</a></nav>${sections.join("\n")}</body></html>\n`;
writeFileSync(output, html);
console.log(JSON.stringify({ output, variants: sections.length }));
