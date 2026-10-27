// Session reports use the runtime's qualification rules; stored aggregates are never requalified on replay.
import { PF_NO_LOSS } from "../../src/core/config.ts";
import { minPfOf } from "../../src/core/minimal-coord.ts";
import { modeledUnitReturn as unitReturn } from "../../src/core/metrics/stats.ts";
import { basePairRows, baseSetsGates, rangeCellPass, setsPassTags } from "../../src/core/pipeline/pipeline.ts";

export const SESSION_QUALIFICATION = Object.freeze({
  version: 1,
  rule: "full-indication-runtime-helpers",
  tacticMinPf: minPfOf({ minPf: 0 }, "", "tactic-trend-s"),
  noLossGateScore: PF_NO_LOSS,
});

export const SESSION_EXECUTION_RETURNS = Object.freeze({ version: 1, encoding: "tape-return-times-execution-mult" });

export function sessionReturnEvidence(raw) {
  const rows = raw.trades ?? [];
  let missingMultRows = 0;
  let unknownReturns = 0;
  let verifiedUnitRows = 0;
  for (const row of rows) {
    if (!(typeof row.mult === "number" && Number.isFinite(row.mult) && row.mult > 0)) missingMultRows++;
    if (!Number.isFinite(unitReturn(row))) unknownReturns++;
    if (typeof row.unitR === "number" && Number.isFinite(row.unitR)) verifiedUnitRows++;
  }
  const recorded = raw.executionReturns?.version === SESSION_EXECUTION_RETURNS.version && raw.executionReturns.encoding === SESSION_EXECUTION_RETURNS.encoding;
  const state = unknownReturns ? "unavailable" : recorded || rows.length > 0 && verifiedUnitRows === rows.length ? "recorded" : "legacy-unverified";
  return {
    state, missingMultRows, unknownReturns, verifiedUnitRows,
    executionMultiplier: "recorded combined external execution multiplier",
    ladderTapeLegs: "retained",
    note: "Direct walk-forward unit returns exclude the recorded combined external execution multiplier, including any Block, Relate, coordination, range and strategy factors; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results." +
      (missingMultRows ? ` ${missingMultRows} of ${rows.length} closed orders lack a valid execution multiplier; they require explicit verified unit returns or remain unknown.` : "") +
      (unknownReturns ? ` ${unknownReturns} returns are explicitly unknown or invalid; primary PF is unavailable for any sample containing them.` : "") +
      (!recorded ? " Historical source encoding was not recorded. Archived coverage, variant and preset aggregates are retained, not recomputed or certified as unit returns." : ""),
  };
}

/** Preserve archived values while preventing an aggregate without a recorded unit basis from claiming unit PF. */
export function sessionStoredSummary(summary) {
  if (!summary) return summary;
  return summary.pfBasis === "unit-net-returns" || summary.pfBasis === "unavailable" ? summary : { ...summary, pfBasis: "legacy-unverified" };
}

export function sessionStoredVariants(variants) {
  if (!variants) return variants;
  return { ...variants, rows: variants.rows.map((row) => row.summary ? { ...row, summary: sessionStoredSummary(row.summary) } : row) };
}

export function sessionBaseTags(run, gates, applies, allTags) {
  return setsPassTags(run, baseSetsGates(gates), applies, allTags);
}

export function sessionOwnRangePassed(run, gates) {
  const pass = rangeCellPass(gates, run.ind);
  return Object.entries(run.ranges ?? {}).some(([tag, stats]) => pass(tag, stats));
}

/** A range/type bucket can mix Tactic and other indications with different effective minimum PF values. */
export function recordSessionMinimum(row, gates, tag, ind) {
  const minimum = minPfOf(gates, tag, ind);
  row.minPfByInd ??= {};
  row.minPfByInd[ind] = minimum;
  row.minPf = Math.min(row.minPf ?? minimum, minimum);
  row.minPfMax = Math.max(row.minPfMax ?? minimum, minimum);
}

export function sessionQualificationEvidence(saved) {
  if (saved?.version === SESSION_QUALIFICATION.version && saved.rule === SESSION_QUALIFICATION.rule && Number.isFinite(saved.tacticMinPf) && Number.isFinite(saved.noLossGateScore))
    return { ...saved, state: "recorded", note: `Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF ${saved.tacticMinPf}, preserving stricter settings. No-loss qualification uses the runtime score ${saved.noLossGateScore}.` };
  return { state: "legacy-unverified", note: "Historical dump: indication-aware qualification provenance was not recorded. Archived qualification counts and thresholds are retained, not recomputed or certified against current gates." };
}

/** Independent Exit Base proof cannot be inferred from ordinary range qualification or headline PF. */
export function sessionBasePairRows(runs, pairTags, targets, exitBasePassed) {
  return basePairRows(runs, pairTags, targets).map(row => {
    if (!row.pair.startsWith("exit|")) return row;
    const recorded = exitBasePassed instanceof Set;
    const passed = recorded && exitBasePassed.has(row.pair);
    return { ...row, passed, tags: passed ? ["exit"] : [],
      qualificationPath: "independent-exit", qualificationRecorded: recorded };
  });
}
