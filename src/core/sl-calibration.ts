/**
 * The best MINIMAL and MAXIMAL stop ratio (stop distance ÷ target distance) of one TP step, calculated from its last N
 * settled samples. The configured automatic bounds (AutoSlRatios.min / max) are the hard limits; the calculated interval
 * lies inside them, and with too few samples the configured limits themselves are used (the defaults).
 *
 * One reference run per TP step (stop at the hard maximum, no trailing) supplies each sample's net return `r` and its
 * maximum adverse excursion `mae`. A tighter stop of distance d would have stopped every sample whose `mae` reached d
 * (a loss of d plus the round-trip cost) and left every other sample as it was. That replay is exact for the stop alone and
 * ignores how a different exit would re-time the next entry, so it only chooses WHERE to search: Base then simulates the
 * ratios inside the interval for real and the usual causal gates decide what may trade.
 */

export interface SlSample {
  /** net return of the sample in the reference run (fraction, round-trip cost already deducted) */
  r: number;
  /** maximum adverse excursion before the sample's exit (fraction of entry, ≥ 0) */
  mae: number;
}

export interface SlCalibrationOptions {
  /** target distance, fraction of entry */
  tp: number;
  /** round-trip cost, fraction of notional */
  cost: number;
  /** configured limits (AutoSlRatios.min / max) and candidate spacing (AutoSlRatios.step) */
  hardMin: number;
  hardMax: number;
  step: number;
  /** a ratio is near-optimal while its score is at least (1 − tolerance) × the best score */
  tolerance?: number;
  /** fewer samples than this keep the configured limits */
  minSamples?: number;
  /** extra candidates kept beyond each edge of the near-optimal interval, so Base can still choose around it */
  margin?: number;
}

export interface SlBounds {
  min: number;
  max: number;
  /** "samples": calculated from the last N samples · "default": the configured limits (too few or unusable samples) */
  source: "samples" | "default";
  /** samples used */
  n: number;
  /** the best-scoring ratio inside the limits (samples only) */
  best?: number;
}

export const SL_CALIBRATION_TOLERANCE = 0.1;
export const SL_CALIBRATION_MIN_SAMPLES = 20;
export const SL_CALIBRATION_MARGIN = 1;
const PF_CAP = 100;
const round = (x: number) => +x.toFixed(8);

/** Candidate ratios on the configured grid, by integer index (no accumulated drift), never beyond the maximum. */
export function slGrid(hardMin: number, hardMax: number, step: number): number[] {
  const n = Math.floor((hardMax - hardMin) / step + 1e-9) + 1;
  return Array.from({ length: n }, (_, i) => round(hardMin + i * step));
}

function scoreAt(samples: readonly SlSample[], d: number, cost: number): { score: number; net: number } {
  let gp = 0, gl = 0, net = 0;
  for (const s of samples) {
    const r = s.mae >= d ? -d - cost : s.r;
    net += r;
    if (r > 0) gp += r; else gl -= r;
  }
  return { score: gl > 0 ? gp / gl : gp > 0 ? PF_CAP : 0, net };
}

export function calibrateSlBounds(samples: readonly SlSample[], o: SlCalibrationOptions): SlBounds {
  const fallback = (n: number): SlBounds => ({ min: o.hardMin, max: o.hardMax, source: "default", n });
  const valid = samples.filter((s) => Number.isFinite(s.r) && Number.isFinite(s.mae) && s.mae >= 0);
  const minSamples = o.minSamples ?? SL_CALIBRATION_MIN_SAMPLES;
  if (!(o.tp > 0) || !(o.step > 0) || !(o.hardMin > 0) || !(o.hardMax >= o.hardMin) || !(o.cost >= 0)) return fallback(valid.length);
  if (valid.length < Math.max(1, minSamples)) return fallback(valid.length);
  const grid = slGrid(o.hardMin, o.hardMax, o.step);
  const scores = grid.map((k) => scoreAt(valid, k * o.tp, o.cost));
  let b = 0;
  for (let i = 1; i < grid.length; i++)
    if (scores[i].score > scores[b].score || (scores[i].score === scores[b].score && scores[i].net > scores[b].net)) b = i;
  const floor = (1 - (o.tolerance ?? SL_CALIBRATION_TOLERANCE)) * scores[b].score;
  let lo = b, hi = b;
  while (lo > 0 && scores[lo - 1].score >= floor) lo--;
  while (hi < grid.length - 1 && scores[hi + 1].score >= floor) hi++;
  const margin = Math.max(0, Math.floor(o.margin ?? SL_CALIBRATION_MARGIN));
  lo = Math.max(0, lo - margin);
  hi = Math.min(grid.length - 1, hi + margin);
  return { min: grid[lo], max: grid[hi], source: "samples", n: valid.length, best: grid[b] };
}

/** Whether a stop ratio lies inside the calculated interval (a small tolerance for float representation of the grid). */
export function slWithinBounds(ratio: number, b: Pick<SlBounds, "min" | "max">): boolean {
  return ratio >= b.min - 1e-9 && ratio <= b.max + 1e-9;
}
