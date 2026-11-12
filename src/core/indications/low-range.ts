/** Low-Range registry and Short-grid bridge. Its signals remain independently gated research candidates. */
import type { IndicationSpec } from "./registry.ts";
import type { LowRangeGrid, Protect } from "../domain/types.ts";
import { RT_COST } from "../model-cost.ts";
import {
  DEFAULT_LOW_RANGE_POLICY, LOW_RANGE_IDS as LOW_RANGE_BASE_IDS, LOW_RANGE_METHODS, LOW_RANGE_RELATIONS, LOW_RANGE_WINDOWS,
  lowRangeProtects, lowRangeState,
} from "./low-range-research.ts";

import { lowRangeExtraSpecs } from "./low-range-extra.ts";

export { LOW_RANGE_BASE_IDS, LOW_RANGE_METHODS, LOW_RANGE_RELATIONS, LOW_RANGE_WINDOWS };
export const LOW_RANGE_IDS = [...LOW_RANGE_BASE_IDS, ...LOW_RANGE_BASE_IDS.map(id => `${id}-inverse`),
  ...lowRangeExtraSpecs().map(s => s.id)];
export const LOW_RANGE_TIMEFRAMES = [1, 5, 15, 30] as const;
export const isLowRangeInd = (id: string) => id.startsWith("low-range-");

/** Candidate calculation is registered; protection cells remain opt-in until forward validation supports them. */
export const DEFAULT_LOW_RANGE_GRID: LowRangeGrid = {
  enabled: false, step: DEFAULT_LOW_RANGE_POLICY.step, steps: [...DEFAULT_LOW_RANGE_POLICY.steps],
  coordination: "independent", minTf: 1, volumeFactor: 1, holdAuto: true,
  holdCandidatesMin: [5, 15, 30, 60], maxSlRatio: 2.5, maxTrailRatio: 1,
  // A research ceiling, not a promise of optimal future returns; each hold is separately evaluated.
  slRatios: [...DEFAULT_LOW_RANGE_POLICY.slRatios], trailRatios: [...DEFAULT_LOW_RANGE_POLICY.trailRatios], maxHoldMin: 60,
};

export const lowRangeTag = (grid?: LowRangeGrid): "lr" | "sh" => grid?.coordination === "independent" ? "lr" : "sh";
export const lowRangeEnabled = (grid: { lowRange?: LowRangeGrid; short?: unknown }): boolean =>
  grid.lowRange?.enabled === true && (lowRangeTag(grid.lowRange) === "lr" || !!grid.short);

export function lowRangeHolds(grid: LowRangeGrid): number[] {
  const values = grid.holdAuto ? grid.holdCandidatesMin ?? [grid.maxHoldMin] : [grid.maxHoldMin];
  if (!values.length || values.length > 50 || values.some(n => !Number.isInteger(n) || n < 1 || n > 1440))
    throw new RangeError("Low-Range auto hold needs 1–50 distinct whole-minute candidates");
  if (new Set(values).size !== values.length) throw new RangeError("Low-Range hold candidates must be distinct");
  const out = values.filter(n => n <= grid.maxHoldMin).sort((a, b) => a - b);
  if (!out.length) throw new RangeError("Low-Range needs a hold candidate at or below its maximum");
  return out;
}

export function lowRangeSpecs(): IndicationSpec[] {
  const originals: IndicationSpec[] = LOW_RANGE_WINDOWS.flatMap((window) => LOW_RANGE_METHODS.flatMap((method) =>
    LOW_RANGE_RELATIONS.map((relation) => ({
      id: `low-range-${window}-${method}-${relation}`,
      kind: "low-range" as const,
      label: `Low-Range · ${method} · ${window} bars · ${relation}`,
      params: { window },
      fn: (k) => lowRangeState(k, window, method, relation),
    })),
  ));
  return [...originals, ...originals.map(spec => ({ ...spec, id: `${spec.id}-inverse`,
    label: `${spec.label} · Inverse`, fn: (k: Parameters<IndicationSpec["fn"]>[0]) => {
      const base = spec.fn(k);
      const name = `low-range:inverse:${spec.id}`;
      return k.memo(name, () => k.streamMath ? k.streamMath.run<{ value: Int8Array }, null>(
        name, k.b.n, ["value"], () => null, (i, out) => { out.value[i] = -base[i]; }, ["value"],
      ).value : Int8Array.from(base, n => -n));
    } })), ...lowRangeExtraSpecs()];
}

/** Exact same effective cells are supplied to Base and tape construction. */
export function lowRangeGridProtects(grid: LowRangeGrid | undefined, cost = RT_COST, tfMin = 15, minSlDistancePct = 0.1, minSlFloor = 0): Protect[] {
  if (!grid?.enabled) return [];
  if (!(Number.isFinite(grid.maxHoldMin) && grid.maxHoldMin >= 1 && Number.isFinite(tfMin) && tfMin > 0))
    throw new RangeError("invalid Low-Range hold/timeframe");
  const cells = lowRangeProtects({ step: grid.step, cost, minSlDistancePct, steps: grid.steps, slRatios: grid.slRatios,
    trailRatios: grid.trailRatios, tags: ["sh"] }).map(p => ({ ...p, sl: Math.max(minSlFloor, p.sl) }));
  return lowRangeHolds(grid).flatMap(minutes => cells.filter(p =>
    p.sl / p.tp <= (grid.maxSlRatio ?? Infinity) + 1e-12 &&
    (!p.trail || p.trail * (p.trailStep ?? 1) / p.tp <= (grid.maxTrailRatio ?? Infinity) + 1e-12))
    .map(p => ({ ...p, tag: lowRangeTag(grid), lowRangeOnly: true,
      ...(grid.maxSlRatio !== undefined || grid.maxTrailRatio !== undefined ? {
        riskCaps: { sl: Math.floor(p.tp * (grid.maxSlRatio ?? 2.5) * 1e6 + 1e-9) / 1e6,
          trail: Math.floor(p.tp * (grid.maxTrailRatio ?? 1) * 1e6 + 1e-9) / 1e6 },
      } : {}),
      hold: Math.floor(minutes / tfMin), maxHoldMin: minutes })));
}
