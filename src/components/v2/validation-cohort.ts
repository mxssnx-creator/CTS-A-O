import type { ValidationProgress } from "../../core/validation-progress.ts";

/** The validation headline uses passing historical windows; execution results retain their own full cohort. */
export function validationCohortView(value?: ValidationProgress | null) {
  const available = !!value && Number.isFinite(value.at) && value.at >= 0 &&
    [value.evaluated, value.passed, value.closes].every((n) => Number.isSafeInteger(n) && n >= 0) &&
    value.passed <= value.evaluated && typeof value.noLoss === "boolean";
  if (!available) return { available: false, pf: null, pfText: "Unavailable", fraction: null, counts: "Unavailable", at: null };
  const measured = value.passed > 0 && value.closes > 0;
  const pf = measured && !value.noLoss && typeof value.pf === "number" && Number.isFinite(value.pf) && value.pf >= 0
    ? value.pf : null;
  return { available: true, pf, pfText: measured && value.noLoss ? "No losses" : pf === null ? "Unavailable" : pf.toFixed(2),
    fraction: value.evaluated > 0 ? value.passed / value.evaluated : null,
    counts: `${value.passed} / ${value.evaluated}`, at: value.at };
}
