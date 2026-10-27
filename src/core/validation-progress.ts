import type { ValidationSummary } from "./sim/walkforward.ts";

/** Current engine selection-pool validation, on overlapping historical unit-return windows. */
export interface ValidationProgress {
  at: number;
  evaluated: number;
  passed: number;
  closes: number;
  pf: number | null;
  noLoss: boolean;
}

export function validationProgressOf(summary: ValidationSummary | undefined, at: number): ValidationProgress | null {
  if (!summary || !Number.isFinite(at) || !Number.isSafeInteger(summary.evaluated) ||
      !Number.isSafeInteger(summary.passed) || !Number.isSafeInteger(summary.closes) ||
      summary.evaluated < 0 || summary.passed < 0 || summary.passed > summary.evaluated || summary.closes < 0 ||
      !Number.isFinite(summary.gp) || !Number.isFinite(summary.gl) || summary.gp < 0 || summary.gl < 0)
    return null;
  const ratio = summary.gl > 0 ? summary.gp / summary.gl : null;
  return { at, evaluated: summary.evaluated, passed: summary.passed, closes: summary.closes,
    pf: summary.passed > 0 && ratio !== null && Number.isFinite(ratio) ? ratio : null,
    noLoss: summary.passed > 0 && summary.closes > 0 && summary.gp > 0 && summary.gl === 0 };
}
