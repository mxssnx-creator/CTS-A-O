import { botStatsFromRows, COST_RT, repriced } from "../../src/core/bot-stats.ts";
import { guardedStressStats, unitReturnEvidence } from "./eval-stress.mjs";

export const PF_SEARCH_OBJECTIVE = Object.freeze({
  kind: "unit-net-returns-repriced-round-trip",
  roundTrip: COST_RT,
  costPolicy: "subtract only max(0, target round trip minus implied stored cost)",
  sample: "protocol entry-time window; settled closes plus recorded endpoint marks",
  noLossConvention: "unbounded PF objective; distinct from the primary engine's no-loss score",
});

/** Family tuples are already normalized by their producer: never divide r by a size a second time. */
export function pfSearchFamilyRows(family) {
  const columns = Array.isArray(family.rowsCols) ? family.rowsCols : [];
  const index = (key, legacy) => columns.includes(key) ? columns.indexOf(key) : legacy;
  const recordedBasis = family.pfBasis === "unit-net-returns" || family.pfBasis === "unavailable";
  const unitIndex = columns.indexOf("unitR");
  const get = (tuple, key, fallback) => tuple[index(key, fallback)];
  return family.rows.map((tuple) => {
    const cfg = get(tuple, "cfg", 0);
    const sym = get(tuple, "sym", 1);
    const side = get(tuple, "side", 2);
    const entryT = get(tuple, "entryT", 3);
    const recordedR = get(tuple, "r", 7);
    const explicit = unitIndex >= 0 ? tuple[unitIndex] : undefined;
    const unitR = recordedBasis && typeof explicit === "number" && Number.isFinite(explicit) ? explicit : null;
    return {
      id: `${cfg}|${sym}|${side}|${entryT}`,
      cfg, sym, side, entryT,
      exit_t: get(tuple, "exitT", 4),
      entry: get(tuple, "entry", 5),
      exit: get(tuple, "exit", 6),
      r: unitR ?? NaN,
      unitR,
      recordedR,
      rWeighted: columns.includes("rWeighted") ? tuple[columns.indexOf("rWeighted")] : null,
      reason: get(tuple, "reason", 8),
      returnEvidence: unitR === null ? "unavailable" : "recorded-unit-return",
    };
  });
}

/** The entire period must have unit evidence and a valid price basis before its frozen cost objective is scored. */
export function pfSearchSample(rows) {
  const primary = unitReturnEvidence(rows);
  const { stress, stats } = guardedStressStats(rows, (xs) => botStatsFromRows(xs).families[0] ?? null);
  const priced = stress.available
    ? unitReturnEvidence(rows.map((row) => ({ ...row, unitR: repriced(row, COST_RT) })))
    : null;
  const noLoss = stats && priced ? priced.noLoss : null;
  const objective = {
    ...PF_SEARCH_OBJECTIVE,
    available: stress.available && stats !== null,
    n: rows.length,
    pf: stats?.pf02 ?? null,
    returnGp: priced?.returnGp ?? null,
    returnGl: priced?.returnGl ?? null,
    noLoss,
    exactRatio: noLoss ? null : stats?.pf02 ?? null,
    pfConvention: !stress.available || !stats ? "unavailable" : noLoss ? "no-loss-unbounded-objective" : "gross-return-ratio",
    unavailableReason: stress.available ? stats ? null : "no trades" : stress.reason,
  };
  return { n: rows.length, primary, stress, stats, objective };
}

export function judgePfSearchRows(rows, judge) {
  const sample = pfSearchSample(rows);
  const s = sample.stats;
  if (!sample.objective.available) {
    return {
      ...sample,
      events: null,
      pf02: null,
      long: rows.filter((x) => x.side === 1).length,
      short: rows.filter((x) => x.side === -1).length,
      blockShare: null,
      pass: false,
      why: [sample.objective.unavailableReason],
    };
  }
  const why = [];
  if (s.pf02 < judge.pf) why.push(`PF ${s.pf02.toFixed(2)} < ${judge.pf}`);
  if (s.trades < judge.trades) why.push(`trades ${s.trades} < ${judge.trades}`);
  if (s.events < judge.events) why.push(`events ${s.events} < ${judge.events}`);
  if (s.long.n < 1 || s.short.n < 1) why.push(`a side has no trades (long ${s.long.n}, short ${s.short.n})`);
  if (!(s.blockPassRate >= judge.blockShare)) why.push(`blocks ${Number.isNaN(s.blockPassRate) ? "none judged" : (100 * s.blockPassRate).toFixed(0) + "%"} < 67%`);
  return {
    ...sample,
    n: s.trades, events: s.events, pf02: s.pf02, long: s.long.n, short: s.short.n,
    blockShare: s.blockPassRate, pass: why.length === 0, why,
  };
}

/** Only D1a determines eligibility and order. D1b remains an unchanged holdout judgement. */
export function scorePfSearchUnits(units, { training, validation, minTrades, judge }) {
  const half = (xs, bounds) => xs.filter((x) => x.entryT >= bounds.from && x.entryT < bounds.to);
  const assessed = units.map((unit) => {
    const a = half(unit.xs, training);
    const b = half(unit.xs, validation);
    const sampleA = pfSearchSample(a);
    return {
      name: unit.name, fam: unit.fam, nA: a.length, pfA: sampleA.objective.pf,
      primaryA: sampleA.primary, objectiveA: sampleA.objective,
      judgeB: judgePfSearchRows(b, judge), nB: b.length,
    };
  });
  const minimumSample = assessed.filter((x) => x.nA >= minTrades);
  const scored = minimumSample.filter((x) => x.objectiveA.available);
  scored.sort((x, y) => x.pfA === y.pfA ? 0 : x.pfA > y.pfA ? -1 : 1);
  return { scored, unavailable: minimumSample.filter((x) => !x.objectiveA.available), minimumSample: minimumSample.length };
}

export function pfSearchObjectiveText(objective) {
  if (!objective.available) return "unavailable";
  if (objective.noLoss) return "No losses (unbounded objective)";
  return Number.isFinite(objective.pf) ? objective.pf.toFixed(2) : "unavailable";
}
