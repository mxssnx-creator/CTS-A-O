import type { ValidationProgress } from "../../core/validation-progress.ts";
import { combineValidatedSetPf } from "../../core/validated-set-pf.ts";

/** The validation headline uses passing historical windows; execution results retain their own full cohort. */
export function validationCohortView(value?: ValidationProgress | null) {
  const available = !!value && Number.isFinite(value.at) && value.at >= 0 &&
    [value.evaluated, value.passed, value.closes].every((n) => Number.isSafeInteger(n) && n >= 0) &&
    value.passed <= value.evaluated && typeof value.noLoss === "boolean";
  if (!available) return { available: false, pf: null, pfText: "Unavailable", fraction: null, counts: "Unavailable", at: null,
    basisText: "Passing-set validation evidence unavailable" };
  const sets = value.pfBasis === "validated-set-mean" ? combineValidatedSetPf([value.setPf]) : null;
  const measured = value.passed > 0 && value.closes > 0 && sets?.sets === value.passed;
  const pf = measured ? sets.pf : null;
  const basisText = !sets || sets.sets !== value.passed ? "Per-set PF unavailable; legacy pooled scores are not used"
    : `${sets.finiteSets} finite PF sets · ${sets.noLossSets} no-loss sets · ${sets.unavailableSets} unknown; mean uses finite sets`;
  return { available: true, pf, pfText: measured && sets.noLoss ? "No losses" : pf === null ? "Unavailable" : pf.toFixed(2),
    fraction: value.evaluated > 0 ? value.passed / value.evaluated : null,
    counts: `${value.passed} / ${value.evaluated}`, at: value.at, basisText };
}
