// Hourly validation of the causal D1 windows (scripts/core-session.mjs --wf {"recordValidation":true} dumps): per range, the configs that reach the validation check each hour, the ones validated, their PF before and after validation, and the realized orders and PF of the run.
//   node --experimental-strip-types scripts/eval-validation.mjs <dir with val-YYYY-MM-DD.json dumps>
import { readFileSync, readdirSync } from "node:fs";
const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => /^val-2026-10-\d\d\.json$/.test(f)).sort();
const RANGE = { mc: "Micro", mp: "Minimal plus", mn: "Minimal", sh: "Short", gn: "General", lg: "Long" };
const ranges = ["Wide", "Micro", "Minimal", "Minimal plus", "Short", "General", "Long", "Signals"];
const rangeOf = (id) => { if (id.includes("|sig-")) return "Signals"; const m = /\|(mc|mp|mn|sh|gn|lg)(?=\||$)/.exec(id); return m ? RANGE[m[1]] : "Wide"; };
const pf = (gp, gl) => (gl < 1e-12 ? (gp > 0 ? 9 : 0) : gp / gl);
const agg = Object.fromEntries(ranges.map((r) => [r, { before: [], after: [], pfB: [], pfA: [], trades: [], base: [], basePass: [] }]));
let hours = 0;
for (const f of files) {
  const d = JSON.parse(readFileSync(dir + "/" + f, "utf8"));
  for (const st of d.validation) {
    hours++;
    const per = Object.fromEntries(ranges.map((r) => [r, { n: 0, v: 0, gpB: 0, glB: 0, gpA: 0, glA: 0 }]));
    for (const [id, ok, , , gp, gl] of st.checks) { const p = per[rangeOf(id)]; if (!p) continue; p.n++; p.gpB += gp; p.glB += gl; if (ok === 1) { p.v++; p.gpA += gp; p.glA += gl; } }
    for (const r of ranges) { const p = per[r]; agg[r].before.push(p.n); agg[r].after.push(p.v); if (p.n) agg[r].pfB.push(pf(p.gpB, p.glB)); if (p.v) agg[r].pfA.push(pf(p.gpA, p.glA)); }
  }
  for (const t of d.trades) agg[rangeOf(t.cfg)].trades.push(t.r);
  for (const b of d.engine.baseByRange ?? []) { const r = b.range === "Wide" ? "Wide" : b.range; if (agg[r]) { agg[r].base.push(b.pfMedian); if (b.passed) agg[r].basePass.push(b.pfPassedMedian); } }
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pfList = (rs) => {
  let gp = 0, gl = 0;
  for (const v of rs) {
    if (v > 0) gp += v;
    else gl -= v;
  }
  return pf(gp, gl);
};
console.log(`${files.length} windows, ${hours} hourly steps (full engine, default settings, mode fixed, causal, 48 h windows)`);
console.log("range".padEnd(13), "cand/h".padStart(7), "valid/h".padStart(8), "rate".padStart(5), "PF cand".padStart(8), "PF valid".padStart(9), "orders/h".padStart(9), "PF realized".padStart(12), "Base PF med".padStart(12));
for (const r of ranges) {
  const a = agg[r];
  const cb = avg(a.before), cv = avg(a.after);
  const realizedOrders = a.trades.length / hours;
  console.log(r.padEnd(13), cb.toFixed(1).padStart(7), cv.toFixed(1).padStart(8), (cb ? (100 * cv / cb).toFixed(0) + "%" : "–").padStart(5), avg(a.pfB).toFixed(2).padStart(8), avg(a.pfA).toFixed(2).padStart(9), realizedOrders.toFixed(1).padStart(9), (a.trades.length ? pfList(a.trades).toFixed(2) : "–").padStart(12), (a.base.length ? avg(a.base).toFixed(2) : "–").padStart(12));
}
