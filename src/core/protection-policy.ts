/** Price percentages in settings; modeled costs are fractions of notional. */
export const SL_TP_RATIOS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5] as const;
export type SlTpRatio = (typeof SL_TP_RATIOS)[number];
export const SL_TP_MIN = SL_TP_RATIOS[0];
export const SL_TP_MAX = SL_TP_RATIOS[SL_TP_RATIOS.length - 1];
export const SL_TP_STEP = SL_TP_RATIOS[1] - SL_TP_RATIOS[0];
/**
 * Micro and Low-Range (operator, 11 Nov 2026: "SL ratios von 0.2–1.6 step 0.1"): fifteen requested stop ratios of the
 * price target. Every other range keeps SL_TP_RATIOS. A requested ratio under the initial-stop floor still resolves
 * to the floor, so distinct requests may share one cell; each distinct resulting cell is its own config.
 */
export const FINE_SL_TP_RATIOS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6] as const;
export const FINE_SL_TP_MIN = FINE_SL_TP_RATIOS[0];
export const FINE_SL_TP_MAX = FINE_SL_TP_RATIOS[FINE_SL_TP_RATIOS.length - 1];
/**
 * Micro and Low-Range trailing shares of the target (same instruction: "trailing ebenfalls thinner"): plain plus six
 * arming distances from a tenth to six tenths of the target, step 0.1 (was a quarter / half / three quarters).
 */
export const FINE_TRAIL_RATIOS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6] as const;
/** The ladders these two ranges shipped with from 8 Nov until 11 Nov; the settings migration moves an unchanged copy. */
export const FORMER_FINE_SL_TP_RATIOS: readonly number[] = SL_TP_RATIOS;
export const FORMER_FINE_TRAIL_RATIOS: readonly number[] = [0, 0.25, 0.5, 0.75];
export const MIN_SL_DISTANCE_PCT = 0.1;
export const MAX_SL_DISTANCE_PCT = 1;
export const DEFAULT_MIN_SL_DISTANCE_PCT = MIN_SL_DISTANCE_PCT;

export function normalizeMinSlDistancePct(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(MAX_SL_DISTANCE_PCT, Math.max(MIN_SL_DISTANCE_PCT, n))
    : DEFAULT_MIN_SL_DISTANCE_PCT;
}

/** The initial stop pays for one modeled round trip plus the configured net distance. */
export function minimumStopFraction(costFraction: number, minSlDistancePct: unknown = DEFAULT_MIN_SL_DISTANCE_PCT): number {
  if (!Number.isFinite(costFraction) || costFraction < 0) throw new RangeError("Invalid modeled cost");
  return costFraction + normalizeMinSlDistancePct(minSlDistancePct) / 100;
}

export function minimumStopDistance(entry: number, costFraction: number, minSlDistancePct: unknown = DEFAULT_MIN_SL_DISTANCE_PCT): number {
  if (!Number.isFinite(entry) || entry <= 0) throw new RangeError("Invalid entry price");
  return entry * minimumStopFraction(costFraction, minSlDistancePct);
}

/** Raise only the initial stop. A ratio under the floor never silently moves the requested target. */
export function initialProtection(side: "long" | "short", entry: number, requestedSl: number, requestedTp: number,
  costFraction: number, minSlDistancePct: unknown = DEFAULT_MIN_SL_DISTANCE_PCT, venueMinFraction = 0) {
  if (![requestedSl, requestedTp, venueMinFraction].every(Number.isFinite) || requestedSl < 0 ||
      requestedTp <= 0 || venueMinFraction < 0) throw new RangeError("Invalid protection distance");
  const slDist = Math.max(requestedSl, minimumStopDistance(entry, costFraction, minSlDistancePct), entry * venueMinFraction);
  const tpDist = requestedTp;
  const signed = side === "long" ? 1 : -1;
  const sl = entry - signed * slDist, tp = entry + signed * tpDist;
  if (!(sl > 0) || !(tp > 0)) throw new RangeError("Protection lies outside positive prices");
  return { sl, tp, slDist, tpDist };
}
