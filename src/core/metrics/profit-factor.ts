/**
 * Gross gains / gross losses on the same sample, with 1 as neutral at any representable scale.
 * A strictly positive gain without a loss is a no-loss sample; an entirely flat or empty input has no ratio
 * and retains the legacy zero gate score. Callers must use sample/provenance metadata when displaying it.
 * Invalid sums and finite-sum division overflow are unknown, not profitable evidence.
 */
export function rawProfitFactor(gp: number, gl: number): number {
  if (!(Number.isFinite(gp) && Number.isFinite(gl) && gp >= 0 && gl >= 0)) return NaN;
  if (gl === 0) return gp > 0 ? Infinity : 0;
  const pf = gp / gl;
  return Number.isFinite(pf) ? pf : NaN;
}
