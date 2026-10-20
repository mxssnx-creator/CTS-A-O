// Return evidence for CLI reports. Unit returns and sized dollar diagnostics deliberately use separate inputs.
// A missing persisted unit return remains in the sample and invalidates its whole primary PF.
import { profitFactor } from "../../src/core/metrics/stats.ts";
export const returnBucket = () => ({ n: 0, w: 0, gp: 0, gl: 0, usd: 0, unknownReturns: 0, unknownSizedPnl: 0 });
export function addReturnEvidence(bucket, unitReturn, sizedPnl = 0) {
  bucket.n++;
  if (typeof unitReturn !== "number" || !Number.isFinite(unitReturn)) bucket.unknownReturns++;
  else if (unitReturn > 0) { bucket.w++; bucket.gp += unitReturn; }
  else bucket.gl -= unitReturn;
  if (typeof sizedPnl === "number" && Number.isFinite(sizedPnl)) bucket.usd += sizedPnl;
  else bucket.unknownSizedPnl++;
}
export function finishReturnEvidence(bucket) {
  const available = bucket.unknownReturns === 0;
  const noLoss = available && bucket.gp > 0 && bucket.gl <= 0;
  return {
    ...bucket,
    usd: bucket.unknownSizedPnl ? null : bucket.usd,
    gp: available ? bucket.gp : null,
    gl: available ? bucket.gl : null,
    returnGp: available ? bucket.gp * 100 : null,
    returnGl: available ? bucket.gl * 100 : null,
    pf: available && bucket.n ? profitFactor(bucket.gp, bucket.gl) : null,
    noLoss,
    pfBasis: available ? "unit-net-returns" : "unavailable",
    pfConvention: available ? noLoss ? "no-loss-sentinel" : "gross-return-ratio" : "unavailable",
  };
}
export const returnEvidenceText = (row) => row.unknownReturns ? "unit basis unavailable" : !row.n ? "–" : row.noLoss ? "No losses" : row.pf.toFixed(2);

/** Merge finalized groups without converting an unavailable group's null sums into zero. */
export function mergeReturnEvidence(rows) {
  const total = returnBucket();
  for (const row of rows) {
    total.n += row.n;
    total.w += row.w;
    total.unknownSizedPnl += row.unknownSizedPnl ?? 0;
    if (typeof row.usd === "number" && Number.isFinite(row.usd)) total.usd += row.usd;
    else if (!row.unknownSizedPnl) total.unknownSizedPnl++;
    total.unknownReturns += row.unknownReturns;
    if (typeof row.gp === "number" && Number.isFinite(row.gp)) total.gp += row.gp;
    if (typeof row.gl === "number" && Number.isFinite(row.gl)) total.gl += row.gl;
  }
  return finishReturnEvidence(total);
}
