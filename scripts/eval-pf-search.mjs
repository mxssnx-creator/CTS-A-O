#!/usr/bin/env node
// The PF search of docs/evaluation-2026-10/PROTOCOL-3.md (PROTOCOL-2 rules), on recorded family tuples (schemas 3 and 7):
// the units are the families, each family's long and short side, and each config (cell). The D1a half chooses the unit
// with the best PF at 0.2 % among those with at least MIN_TRADES trades on D1a (the top TOP are listed); the D1b half
// judges it with the protocol's criteria. Nothing is re-selected on D1b. Every unit tried is counted: the multiplicity
// is printed with the result.
//
//   node --experimental-strip-types scripts/eval-pf-search.mjs [--dir runs/eval] [--top 10] [--min-trades 30]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PF_SEARCH_OBJECTIVE,
  pfSearchFamilyRows,
  pfSearchObjectiveText,
  scorePfSearchUnits,
} from "./lib/pf-search-evidence.mjs";

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
  if (![3, 7].includes(x.schema) || !Array.isArray(x.rows)) continue;
  fams.push(x);
}

// the units: family, family × side, cell (config) — every unit's halves come from the same trades
const units = [];
for (const fam of fams) {
  const all = pfSearchFamilyRows(fam);
  const add = (name, xs) => units.push({ name, fam: fam.label, xs });
  add(`${fam.label}`, all);
  add(
    `${fam.label} | long`,
    all.filter((x) => x.side === 1),
  );
  add(
    `${fam.label} | short`,
    all.filter((x) => x.side === -1),
  );
  const cfgs = new Map();
  for (const x of all) (cfgs.get(x.cfg) ?? cfgs.set(x.cfg, []).get(x.cfg)).push(x);
  for (const [cfg, xs] of cfgs) add(`${cfg}`, xs);
}

// the halves of PROTOCOL-3, cut by entry time: D1a 2026-09-29 11:00Z to 10-04 11:00Z, D1b 10-04 11:00Z to 10-09 11:00Z
const D1A = { from: Date.parse("2026-09-29T11:00:00Z"), to: Date.parse("2026-10-04T11:00:00Z") };
const D1B = { from: Date.parse("2026-10-04T11:00:00Z"), to: Date.parse("2026-10-09T11:00:00Z") };
const { scored, unavailable, minimumSample } = scorePfSearchUnits(units, {
  training: D1A,
  validation: D1B,
  minTrades: MIN_TRADES,
  judge: JUDGE,
});
const best = scored[0];
const f = (x) => (Number.isFinite(x) ? x.toFixed(2) : "–");
console.log(
  `units tried: ${units.length} (families ${fams.length}, with ≥${MIN_TRADES} D1a trades: ${minimumSample}; scored ${scored.length}; unavailable ${unavailable.length})`,
);
console.log(
  `Objective: ${PF_SEARCH_OBJECTIVE.kind}, round trip ${PF_SEARCH_OBJECTIVE.roundTrip * 100}%; ${PF_SEARCH_OBJECTIVE.costPolicy}. ${PF_SEARCH_OBJECTIVE.sample}. ${PF_SEARCH_OBJECTIVE.noLossConvention}.`,
);
for (const x of unavailable)
  console.log(`unscored D1a: ${x.name} · n ${x.nA} · ${x.objectiveA.unavailableReason}`);
if (!best) {
  console.log("no unit has both the minimum trades and complete unit/price evidence on D1a");
} else {
  console.log(`\nbest on D1a (frozen): ${best.name}`);
  console.log(`  D1a: ${best.nA} trades, PF at 0.2% ${pfSearchObjectiveText(best.objectiveA)}`);
  console.log(
    `  D1b: ${best.judgeB.n} trades, ${best.judgeB.events ?? "–"} events, PF at 0.2% ${pfSearchObjectiveText(best.judgeB.objective)}, long ${best.judgeB.long}, short ${best.judgeB.short}, blocks ${f(best.judgeB.blockShare)}`,
  );
  console.log(
    `  verdict: ${best.judgeB.pass ? "PASS (in-sample until the forward record confirms it)" : "FAIL: " + best.judgeB.why.join("; ")}`,
  );
}
console.log(`\ntop ${TOP} on D1a, judged on D1b (no re-selection):`);
console.log("PF_a   n_a  PF_b   n_b  ev_b  long short blocks  verdict   unit");
for (const s of scored.slice(0, TOP)) {
  const j = s.judgeB;
  console.log(
    `${pfSearchObjectiveText(s.objectiveA).padEnd(6)} ${String(s.nA).padEnd(4)} ${pfSearchObjectiveText(j.objective).padEnd(6)} ${String(j.n).padEnd(4)} ${String(j.events ?? "–").padEnd(5)} ${String(j.long).padEnd(4)} ${String(j.short).padEnd(5)} ${f(j.blockShare).padEnd(6)} ${(j.pass ? "PASS" : "fail").padEnd(8)} ${s.name}`,
  );
}
const passing = scored.filter((s) => s.judgeB.pass);
console.log(
  `\nunits passing the D1b judge among the ${scored.length} tried on D1a: ${passing.length}`,
);
