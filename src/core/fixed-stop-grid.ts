import { fixedStopsAt, maxStopRatio, stopSelections } from "../../shared/cts-protection/fixed-stop-bands.ts";
import type { Protect, ProtectGridSpec } from "./domain/types.ts";
import { microSlFloor } from "./minimal-coord.ts";
import { minimumStopFraction } from "./protection-policy.ts";

export function fixedProtects(cells: Protect[], grid: ProtectGridSpec, cost: number, limit: number): Protect[] {
  if (!grid.fixedSlBands) return cells;
  const selected = stopSelections(grid.fixedSlBands);
  const ceilingRatio = maxStopRatio(grid.maxStopLossRatio);
  const output: Protect[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    const { sl, ...geometry } = cell;
    const key = JSON.stringify(geometry);
    if (seen.has(key)) continue;
    seen.add(key);
    const range = cell.lowRangeOnly ? grid.lowRange : cell.tag === "mc" ? grid.micro : cell.tag === "mn" ? grid.minimal :
      cell.tag === "sh" ? grid.short : cell.tag === "gn" ? grid.general : cell.tag === "lg" ? grid.long : undefined;
    const amount = cell.tp * 100;
    const floor = Math.max(grid.minSlEval ?? minimumStopFraction(cost), range && "minSl" in range ? Number(range.minSl ?? 0) : 0, cell.tag === "mc" ? (microSlFloor(grid.micro, cost) ?? 0) : 0,
      !cell.tag && !cell.lowRangeOnly ? grid.minSl ?? 0 : 0);
    const ceiling = Math.min(!cell.tag && !cell.lowRangeOnly && grid.maxSl ? grid.maxSl : Infinity, cell.riskCaps?.sl ?? Infinity);
    for (const {band, stopPct} of fixedStopsAt(amount, selected, ceilingRatio)) {
      const fixed = stopPct / 100;
      if (fixed + 1e-12 < floor || fixed > ceiling + 1e-12) continue;
      if (output.length >= limit) throw new RangeError(`Fixed stop grid exceeds ${limit} variants`);
      output.push({ ...geometry, sl: fixed, stopBand: band });
    }
  }
  return output;
}
