import type { ValidationSummary } from "./sim/walkforward.ts";
import { validatedSetPf, type ValidatedSetPf } from "./validated-set-pf.ts";

/** Current passing sets' historical validation, separate from later processed/executed returns. */
export interface ValidationProgress {
  at: number;
  evaluated: number;
  passed: number;
  closes: number;
  pf: number | null;
  noLoss: boolean;
  pfBasis?: "validated-set-mean" | "unavailable";
  setPf?: ValidatedSetPf | null;
  /** Separately labeled diagnostic: weights each passing window by its gross loss. */
  pooledPf?: number | null;
}

export function validationProgressOf(summary: ValidationSummary | undefined, at: number): ValidationProgress | null {
  if (!summary || !Number.isFinite(at) || !Number.isSafeInteger(summary.evaluated) ||
      !Number.isSafeInteger(summary.passed) || !Number.isSafeInteger(summary.closes) ||
      summary.evaluated < 0 || summary.passed < 0 || summary.passed > summary.evaluated || summary.closes < 0 ||
      !Number.isFinite(summary.gp) || !Number.isFinite(summary.gl) || summary.gp < 0 || summary.gl < 0)
    return null;
  const ratio = summary.gl > 0 ? summary.gp / summary.gl : null;
  const setPf = validatedSetPf(summary.setPf);
  if (setPf && setPf.sets !== summary.passed) return null;
  return { at, evaluated: summary.evaluated, passed: summary.passed, closes: summary.closes,
    pf: setPf?.pf ?? null, noLoss: setPf?.noLoss ?? false, setPf,
    pfBasis: setPf ? "validated-set-mean" : "unavailable",
    pooledPf: summary.passed > 0 && ratio !== null && Number.isFinite(ratio) ? ratio : null };
}
