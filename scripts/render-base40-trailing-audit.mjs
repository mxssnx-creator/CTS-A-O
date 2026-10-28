#!/usr/bin/env node
// Render a sealed candidate screen and matched walk-forward as a readable, line-by-line research report.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
import { configId } from "../src/core/pipeline/pipeline.ts";
const [dir, output] = process.argv.slice(2);
if (!dir || !output) throw new Error("usage: render-base40-trailing-audit.mjs <audit-directory> <report.html>");
const json = (p) => JSON.parse(readFileSync(`${dir}/${p}`, "utf8"));
const lines = (p) => gunzipSync(readFileSync(`${dir}/${p}`)).toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const p = json("screen/protocol.json"), s = json("screen/results.json"), replay = json("walkforward/results.json");
const cells = lines("screen/cells.jsonl.gz"), a = replay.arms.find((x) => x.coordination === "default" && x.validLastN === 12);
if (!p.productionBase || !a || cells.length !== s.total.cells || a.exactTapeMatches !== a.modeled.closes)
  throw new Error("incomplete or unverified evidence");
const trades = lines(`walkforward/${a.orderFile}`);
if (trades.length !== a.modeled.closes) throw new Error("modeled order count differs");
const byId = new Map(cells.map((c) => [configId("follow", c.ind, c.protect), c]));
const esc = (x) => String(x ?? "—").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = (x, n = 3) => Number.isFinite(x) ? x.toFixed(n) : esc(x ?? "unavailable");
const utc = (x) => Number.isFinite(x) ? new Date(x).toISOString().replace("T", " ").replace(".000Z", " UTC") : "—";
const pf = (gp, gl, n) => !n ? "unavailable" : gl > 0 ? num(gp / gl) : gp > 0 ? "no losses" : "unavailable";
const table = (headers, rows, id) => `<div class="scroll"><table${id ? ` id="${id}"` : ""}><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const kindRows = ["normal", "trailing", "trailing-only", "dca", "dca-active", "axis", "signal", "exit", "block"].map((kind) => {
  const x = a.modeled.byKind[kind];
  const notes = { normal: "fixed TP / stop / time", trailing: "TP plus independently armed trailing stop", "trailing-only": "not enabled in this replay",
    dca: "not enabled; own target, stop and hold", "dca-active": "not enabled; own limit entry and exits", axis: "not enabled; own ladder and managed exit",
    signal: "not enabled; independent source and stop policy", exit: "not enabled; separate opt-in category", block: "not enabled; sizing/admission overlay, not a separate close" };
  return [kind, x?.n ?? 0, x ? pf(x.gp, x.gl, x.n) : "unavailable", notes[kind]];
});
const reasonRows = Object.entries(a.modeled.reasons).map(([reason, x]) => [reason, x.n, pf(x.gp, x.gl, x.n), num(x.gp, 5), num(x.gl, 5)]);
const tfRows = Object.entries(a.modeled.byTf).map(([tf, x]) => [`${tf}m`, x.n, pf(x.gp, x.gl, x.n)]);
const hours = new Map();
for (const t of trades) {
  const k = settledHourT(t.exitT), x = hours.get(k) ?? { n: 0, gp: 0, gl: 0 };
  const r = modeledUnitReturn(t); if (!Number.isFinite(r)) throw new Error("unknown modeled return");
  x.n++; x.gp += Math.max(0, r); x.gl += Math.max(0, -r); hours.set(k, x);
}
const hourRows = Array.from({ length: 24 }, (_, i) => {
  const t = p.start + i * 3600000, x = hours.get(t) ?? { n: 0, gp: 0, gl: 0 };
  const step = a.steps.find((z) => z.t === t);
  return [utc(t), step?.selected ?? "unavailable", step?.taken ?? "unavailable", step?.skipped ?? "unavailable", x.n, pf(x.gp, x.gl, x.n)];
});
const orderRows = trades.map((t, i) => {
  const c = byId.get(t.cfg); if (!c?.base.passed) throw new Error(`missing Base cell: ${t.cfg}`);
  return [i + 1, t.kind, t.cfg, t.sym, t.side === 1 ? "long" : "short", utc(t.entryT), utc(t.exitT),
    num((t.exitT - t.entryT) / 60000, 0), `${c.protect.maxHoldMin}m`, t.reason, num(t.entry, 6), num(t.exit, 6), num(modeledUnitReturn(t) * 10000, 2)];
});
const dirs = [];
for (const c of cells) if (c.base.passed) for (const d of c.directions)
  dirs.push([configId("follow", c.ind, c.protect), c.tf, c.protect.trail ? "trailing" : "normal", d.side === 1 ? "long" : "short",
    d.initial.passed ? "passed" : "failed", d.initial.n,
    d.initial.passed ? pf(d.initial.gp, d.initial.gl, d.initial.n) : d.initial.fail,
    d.forwardGate.candidates, d.forwardGate.passed, d.forward.settled]);
if (dirs.length !== a.directionEvaluated || dirs.filter((d) => d[4] === "passed").length !== a.directionValidated)
  throw new Error("direction validation inventory differs");
const baseRows = cells.map((c) => [configId("follow", c.ind, c.protect), c.tf, c.protect.trail ? "trailing" : "normal",
  c.base.n, c.base.noLoss ? "no losses" : num(c.base.pf), c.base.lastN?.n ?? "off",
  c.base.lastN?.pf === 4 ? "4 or no-loss sentinel" : num(c.base.lastN?.pf),
  c.base.lastN?.passed ? "pass" : "fail", c.base.passed ? "pass" : "fail"]);
const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Base 40 and trailing execution audit</title><style>
body{font:15px system-ui,sans-serif;line-height:1.45;color:#172033;background:#f4f6fa;margin:0}main{max-width:1500px;margin:auto;padding:28px}h1,h2{color:#11233b}h1{margin-bottom:4px}p{max-width:1050px}.card{background:white;padding:20px;border-radius:10px;margin:18px 0;box-shadow:0 1px 4px #ccd3df}.scroll{overflow:auto;max-height:640px;border:1px solid #dce2ea}table{border-collapse:collapse;width:100%;background:#fff;font-size:12px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e5eaf1;vertical-align:top}th{position:sticky;top:0;background:#eaf0f8;z-index:1}td:nth-child(2){white-space:nowrap}input{width:min(100%,600px);padding:10px;margin:8px 0;border:1px solid #aab8cb;border-radius:6px}.muted{color:#546479}.pill{display:inline-block;padding:4px 8px;background:#edf3fb;border-radius:20px;margin:3px}code{word-break:break-all}</style></head><body><main>
<h1>Base 40, validation 12 and trailing audit</h1><p class="muted">Retrospective 20-symbol Low-Range Short research · 1/5/15-minute candles · modeled cost 15 bp per round trip</p>
<section class="card"><h2>What was measured</h2><p>The production Base recent-close gate was applied to 3,900 candidate cells. ${s.total.basePassed} passed Base; ${a.directionValidated}/${a.directionEvaluated} direction contexts (${num(100 * a.directionValidated / a.directionEvaluated, 2)}%) validated on ${utc(p.start)} using the preceding 24 hours, with historical pooled return PF ${num(a.initialHistoricalPf)}. In the separate next 24 hours, the walk-forward selector produced ${a.modeled.closes} modeled closes at PF ${num(a.modeled.pf)}. Positions opened / closed / held: ${a.positionsAndOrders.openedPositions} / ${a.positionsAndOrders.closedPositions} / ${a.positionsAndOrders.openPositions}; orders opened / settled / held: ${a.positionsAndOrders.openedOrders} / ${a.positionsAndOrders.settledOrders} / ${a.positionsAndOrders.openOrders}.</p>
<p>This is a bounded research screen feeding the actual selector, not a full runtime deployment, a fresh holdout, funded venue fills, or a promise of future PF. The 74 candidate-screen closes at PF ${num(s.total.forwardPf)} include orders the selector did not execute and must not be mixed with the ${a.modeled.closes} modeled executions below. Candle bars cannot establish the exact intrabar path.</p></section>
<section class="card"><h2>Strategy types, independently</h2>${table(["Type", "Modeled closes", "Later PF", "Scope / exit policy"], kindRows)}<p>Only Normal and Trailing were enabled in this run. Unavailable means not measured; it is not zero PF. Block changes sizing or admission and is not itself an exit family.</p></section>
<section class="card"><h2>What closed the modeled orders</h2>${table(["Reason", "Closes", "PF", "Unit gross gains", "Unit gross losses"], reasonRows)}<p>Trailing arms after a completed bar reaches its activation distance; the resulting stop applies to a later bar. A gap can fill worse than the stop. TP, stop and hold expiry remain separate reasons.</p><h3>By lane</h3>${table(["Lane", "Closes", "Later PF"], tfRows)}</section>
<section class="card"><h2>Progression by UTC hour</h2><p>Selection counts are decisions at the start of each hour; close counts and PF belong to orders settling in that hour, so the two columns have different clocks.</p>${table(["Hour start", "Selected", "Taken", "Skipped", "Settled", "Settled PF"], hourRows)}</section>
<section class="card"><h2>Every modeled executed close</h2><p>Net return is per order in basis points, after one modeled round-trip cost. Identical simultaneous signals remain separate when their full config identities differ.</p><input aria-label="Filter modeled orders" placeholder="Filter by config, symbol, type, reason or lane" oninput="filterRows('orders',this.value)">${table(["#", "Type", "Full configuration", "Symbol", "Side", "Entry UTC", "Exit UTC", "Held min", "Max hold", "Reason", "Entry", "Exit", "Net bp"], orderRows, "orders")}</section>
<section class="card"><h2>All ${dirs.length} Base-admitted direction checks</h2><p>Each row is one full config and direction. An insufficient or failed context remains in the denominator.</p><input aria-label="Filter direction checks" placeholder="Filter direction checks" oninput="filterRows('directions',this.value)">${table(["Full configuration", "Lane min", "Type", "Side", "Validation", "Historical closes", "Historical PF or failure", "Later candidates", "Entry gate passed", "Candidate closes"], dirs, "directions")}</section>
<section class="card"><h2>All ${cells.length} Base cells</h2><p>The Base PF is over the cell history; Last-40 is the recent closed sample. Last-N partial samples follow the configured floor. A Base pass needs both gates.</p><input aria-label="Filter Base cells" placeholder="Filter Base cells by indication, type, lane or verdict" oninput="filterRows('base',this.value)">${table(["Full configuration", "Lane min", "Type", "Closes", "Base PF", "Recent closes", "Recent PF", "Recent gate", "Base verdict"], baseRows, "base")}</section>
<section class="card"><h2>Related funded-model comparison</h2><p>A different 5-minute Short replay from 2026-10-19 to 2026-10-20 UTC validated 10,439/14,702 configs (71.00%) at historical PF 4.571. Its later 135,811 funded-modeled closes had PF 0.275: Normal 23,872 at 0.312, Trailing 55,194 at 0.296, and Trailing-only 56,745 at 0.232. It used a 180-minute hold; its trailing-stop closes had PF 5.021, while time exits had PF 0.081. The periods, cohort and allocation differ from the primary report and cannot be combined.</p></section>
<script>function filterRows(id,q){q=q.toLowerCase().trim();for(const r of document.querySelectorAll('#'+id+' tbody tr'))r.hidden=q&&!r.textContent.toLowerCase().includes(q)}</script></main></body></html>`;
writeFileSync(output, body, { flag: "wx" });
console.log(JSON.stringify({ cells: cells.length, basePassed: s.total.basePassed, directions: dirs.length, modeledCloses: trades.length, output }));
