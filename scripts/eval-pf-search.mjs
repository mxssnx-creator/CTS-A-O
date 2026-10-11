#!/usr/bin/env node
// The PF search of docs/evaluation-2026-10/PROTOCOL-2.md, on the family files of scripts/eval-families.mjs (schema 2):
// the units are the families, each family's long and short side, and each config (cell). The D1a half chooses the unit
// with the best PF at 0.2 % among those with at least MIN_TRADES trades on D1a (the top TOP are listed); the D1b half
// judges it with the protocol's criteria. Nothing is re-selected on D1b. Every unit tried is counted: the multiplicity
// is printed with the result.
//
//   node --experimental-strip-types scripts/eval-pf-search.mjs [--dir runs/eval] [--top 10] [--min-trades 30]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { botStatsFromRows } from "../src/core/bot-stats.ts";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const DIR = arg("dir", "runs/eval");
const TOP = Number(arg("top", "10"));
const MIN_TRADES = Number(arg("min-trades", "30"));
// the protocol's judge (PROTOCOL-2): D1b only
const JUDGE = { pf: 1.2, trades: 30, events: 30, blockShare: 2 / 3 };

const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "feed.json");
const fams = [];
for (const f of files) {
  const x = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  if (x.schema !== 2 || !Array.isArray(x.rows)) continue;
  fams.push(x);
}
const C = (x) => ({ cfg: x[0], sym: x[1], side: x[2], entryT: x[3], exitT: x[4], entry: x[5], exit: x[6], r: x[7], reason: x[8] });
const toRow = (c) => ({
  id: `${c.cfg}|${c.sym}|${c.side}|${c.entryT}`, cfg: c.cfg, sym: c.sym, side: c.side, entry: c.entry, exit: c.exit,
  exit_t: c.exitT, r: c.r, reason: c.reason,
});

/** a unit's D1b statistics against the protocol's judge */
function judge(rows) {
  const s = botStatsFromRows(rows).families[0];
  if (!s) return { n: 0, events: 0, pf02: NaN, long: 0, short: 0, blockShare: NaN, pass: false, why: ["no trades"] };
  const why = [];
  if (s.pf02 < JUDGE.pf) why.push(`PF ${s.pf02.toFixed(2)} < ${JUDGE.pf}`);
  if (s.trades < JUDGE.trades) why.push(`trades ${s.trades} < ${JUDGE.trades}`);
  if (s.events < JUDGE.events) why.push(`events ${s.events} < ${JUDGE.events}`);
  if (s.long.n < 1 || s.short.n < 1) why.push(`a side has no trades (long ${s.long.n}, short ${s.short.n})`);
  if (!(s.blockPassRate >= JUDGE.blockShare)) why.push(`blocks ${Number.isNaN(s.blockPassRate) ? "none judged" : (100 * s.blockPassRate).toFixed(0) + "%"} < 67%`);
  return { n: s.trades, events: s.events, pf02: s.pf02, long: s.long.n, short: s.short.n, blockShare: s.blockPassRate, pass: why.length === 0, why };
}

// the units: family, family × side, cell (config) — every unit's halves come from the same trades
const units = [];
for (const fam of fams) {
  const all = fam.rows.map(C);
  const add = (name, xs) => units.push({ name, fam: fam.label, xs });
  add(`${fam.label}`, all);
  add(`${fam.label} | long`, all.filter((x) => x.side === 1));
  add(`${fam.label} | short`, all.filter((x) => x.side === -1));
  const cfgs = new Map();
  for (const x of all) (cfgs.get(x.cfg) ?? cfgs.set(x.cfg, []).get(x.cfg)).push(x);
  for (const [cfg, xs] of cfgs) add(`${cfg}`, xs);
}

const H = (xs, lo, hi) => xs.filter((x) => x.entryT >= lo && x.entryT < hi).map(toRow);
const D1A = { from: Date.parse("2026-09-26T11:00:00Z"), to: Date.parse("2026-10-02T11:00:00Z") };
const D1B = { from: Date.parse("2026-10-02T11:00:00Z"), to: Date.parse("2026-10-09T11:00:00Z") };
const scored = [];
for (const u of units) {
  const a = H(u.xs, D1A.from, D1A.to);
  const b = H(u.xs, D1B.from, D1B.to);
  const sa = botStatsFromRows(a).families[0];
  if (!sa || sa.trades < MIN_TRADES) continue;
  scored.push({ name: u.name, fam: u.fam, nA: sa.trades, pfA: sa.pf02, judgeB: judge(b), nB: b.length });
}
scored.sort((x, y) => y.pfA - x.pfA);
const best = scored[0];
const f = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
console.log(`units tried: ${units.length} (families ${fams.length}, with ≥${MIN_TRADES} D1a trades: ${scored.length})`);
if (!best) {
  console.log("no unit has the minimum trades on D1a");
} else {
  console.log(`\nbest on D1a (frozen): ${best.name}`);
  console.log(`  D1a: ${best.nA} trades, PF at 0.2% ${f(best.pfA)}`);
  console.log(`  D1b: ${best.judgeB.n} trades, ${best.judgeB.events} events, PF at 0.2% ${f(best.judgeB.pf02)}, long ${best.judgeB.long}, short ${best.judgeB.short}, blocks ${f(best.judgeB.blockShare)}`);
  console.log(`  verdict: ${best.judgeB.pass ? "PASS (in-sample until the forward record confirms it)" : "FAIL: " + best.judgeB.why.join("; ")}`);
}
console.log(`\ntop ${TOP} on D1a, judged on D1b (no re-selection):`);
console.log("PF_a   n_a  PF_b   n_b  ev_b  long short blocks  verdict   unit");
for (const s of scored.slice(0, TOP)) {
  const j = s.judgeB;
  console.log(
    `${f(s.pfA).padEnd(6)} ${String(s.nA).padEnd(4)} ${f(j.pf02).padEnd(6)} ${String(j.n).padEnd(4)} ${String(j.events).padEnd(5)} ${String(j.long).padEnd(4)} ${String(j.short).padEnd(5)} ${f(j.blockShare).padEnd(6)} ${(j.pass ? "PASS" : "fail").padEnd(8)} ${s.name}`,
  );
}
const passing = scored.filter((s) => s.judgeB.pass);
console.log(`\nunits passing the D1b judge among the ${scored.length} tried on D1a: ${passing.length}`);
