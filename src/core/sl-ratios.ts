/** Requested SL/target candidates. Floors/caps and causal per-cell validation remain separate. */
export interface AutoSlRatios {
  enabled: boolean;
  min: number;
  max: number;
  step: number;
  /** Single construction candidate when a persisted legacy policy is unusable; never an admission override. */
  fallback: number;
}

export const DEFAULT_AUTO_SL: Readonly<AutoSlRatios> = { enabled: true, min: .25, max: 2.5, step: .25, fallback: 1 };
export const DEFAULT_FINE_AUTO_SL: Readonly<AutoSlRatios> = { enabled: true, min: .2, max: 1.6, step: .1, fallback: 1 };
const validRatio = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= .2 && x <= 2.5;

/** Validate writes strictly. Recovery below is only for absent or malformed persisted construction settings. */
export function checkAutoSlRatios(value: unknown, limit = 64): asserts value is AutoSlRatios {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Auto SL: settings object required");
  const p = value as AutoSlRatios;
  if (typeof p.enabled !== "boolean" || !validRatio(p.min) || !validRatio(p.max) || !validRatio(p.fallback) ||
      !Number.isFinite(p.step) || p.step < .01 || p.step > 2.3 || p.min > p.max ||
      p.fallback < p.min || p.fallback > p.max)
    throw new Error("Auto SL: ordered min/max in 0.2–2.5, step 0.01–2.3 and fallback inside bounds required");
  if (Math.floor((p.max - p.min) / p.step + 1e-9) + 1 > limit)
    throw new Error(`Auto SL: at most ${limit} independent ratios`);
}

export function slRatioCandidates(
  value: { slOfTp?: readonly number[]; slAuto?: AutoSlRatios },
  limit = 64,
): { ratios: readonly number[]; source: "manual" | "auto" | "fallback" } {
  const p = value.slAuto;
  if (p?.enabled) {
    try {
      checkAutoSlRatios(p, limit);
      const n = Math.floor((p.max - p.min) / p.step + 1e-9) + 1;
      // Integer indices prevent accumulation drift. Never force a final value beyond the configured maximum.
      return { ratios: Array.from({ length: n }, (_, i) => +(p.min + i * p.step).toFixed(8)), source: "auto" };
    } catch { /* a malformed saved policy never expands unbounded work */ }
  } else if (Array.isArray(value.slOfTp) && value.slOfTp.length > 0 && value.slOfTp.length <= limit && value.slOfTp.every(x => typeof x === "number" && Number.isFinite(x) && x > 0)) {
    return { ratios: value.slOfTp, source: "manual" };
  }
  // Keep a valid fallback inside valid persisted bounds; corrupt/reversed bounds use the factory fallback.
  const bounds = p && validRatio(p.min) && validRatio(p.max) && p.min <= p.max;
  const fallback = validRatio(p?.fallback) && (!bounds || (p!.fallback >= p!.min && p!.fallback <= p!.max))
    ? p!.fallback : bounds ? Math.min(p!.max, Math.max(p!.min, DEFAULT_AUTO_SL.fallback)) : DEFAULT_AUTO_SL.fallback;
  return { ratios: [fallback], source: "fallback" };
}

export function slRatiosOf(value: { slOfTp?: readonly number[]; slAuto?: AutoSlRatios }, limit = 64): readonly number[] {
  return slRatioCandidates(value, limit).ratios;
}

/** A supplied manual list must not be shadowed by the previous automatic policy. */
export function mergeSlRatioSettings<T extends { slOfTp: readonly number[]; slAuto?: AutoSlRatios }>(base: T, patch?: Partial<T>): T {
  const out = { ...base, ...patch };
  if (patch?.slOfTp !== undefined && patch.slAuto === undefined) delete out.slAuto;
  return out;
}
