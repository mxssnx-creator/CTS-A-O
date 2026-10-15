// CLI evaluation only. Primary rows already carry unit returns; endpoint marks stay in that complete sample.
import { profitFactor, unitReturn } from "../../src/core/metrics/stats.ts";

export function unitReturnEvidence(rows) {
  let gp = 0, gl = 0, unknownReturns = 0;
  for (const row of rows) {
    const r = unitReturn(row);
    if (!Number.isFinite(r)) unknownReturns++;
    else if (r > 0) gp += r;
    else gl -= r;
  }
  const noLoss = !unknownReturns && gp > 0 && gl === 0;
  return {
    n: rows.length, pfBasis: unknownReturns ? "unavailable" : "unit-net-returns", unknownReturns,
    pf: unknownReturns ? null : profitFactor(gp, gl),
    returnGp: unknownReturns ? null : gp, returnGl: unknownReturns ? null : gl,
    netReturnSum: unknownReturns ? null : gp - gl, returnSumUnits: "fraction", noLoss,
    pfConvention: unknownReturns ? "unavailable" : noLoss ? "no-loss-sentinel" : "gross-return-ratio",
  };
}

/** Repricing needs an actual finite positive price basis. null is a missing mark price, never a zero-price exit. */
export function stressPricingEvidence(rows) {
  let unknownReturns = 0, invalidPriceBasis = 0, invalidGrossBasis = 0;
  for (const row of rows) {
    const r = unitReturn(row);
    if (!Number.isFinite(r)) unknownReturns++;
    if (!Number.isFinite(row.entry) || row.entry <= 0 || !Number.isFinite(row.exit) || row.exit <= 0) {
      invalidPriceBasis++;
      continue;
    }
    const gross = row.side * (row.exit - row.entry) / row.entry;
    if ((row.side !== 1 && row.side !== -1) || !Number.isFinite(gross) || (Number.isFinite(r) && !Number.isFinite(gross - r))) invalidGrossBasis++;
  }
  const reasons = [
    ...(unknownReturns ? [`${unknownReturns} unknown unit return(s)`] : []),
    ...(invalidPriceBasis ? [`${invalidPriceBasis} missing, malformed or nonpositive entry/exit price basis(es)`] : []),
    ...(invalidGrossBasis ? [`${invalidGrossBasis} invalid side/gross-price basis(es)`] : []),
  ];
  return { available: !reasons.length, state: reasons.length ? "unavailable" : "available", n: rows.length,
    unknownReturns, invalidPriceBasis, invalidGrossBasis, reason: reasons.length ? reasons.join("; ") : null };
}

/** No filtered closed subset: either reprice the entire supplied sample, or withhold its stress diagnostics. */
export function guardedStressStats(rows, calculate) {
  const stress = stressPricingEvidence(rows);
  return { stress, stats: stress.available ? calculate(rows) : null };
}
