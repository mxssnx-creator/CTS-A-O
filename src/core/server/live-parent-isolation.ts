import { laneKeyOf, type LaneOpen } from "../live-record.ts";
import type { ControlContribution } from "./live.ts";

/** Parent admission only: existing live parents remain under their prior exit and protection path. */
export function isolateNewParents(
  lanes: readonly ControlContribution[],
  options: {
    aggregate: boolean;
    oneway: boolean;
    /** Confirmed, unresolved, or otherwise not-yet-disproved symbol × side ownership. */
    occupied: ReadonlySet<string>;
    /** Existing logical parent records; these do not prove per-parent venue quantity. */
    tracked: Readonly<Record<string, LaneOpen>>;
  },
): { lanes: ControlContribution[]; blocked: Array<{ lane: ControlContribution; why: string }>; unknown: Set<string>; ambiguous: Set<string> } {
  const trackedByKey = new Map<string, Set<string>>();
  for (const [id, row] of Object.entries(options.tracked)) {
    const key = `${row.sym}|${row.side}`;
    const set = trackedByKey.get(key) ?? new Set<string>();
    set.add(id);
    trackedByKey.set(key, set);
  }
  const occupiedSides = new Map<string, Set<number>>();
  for (const key of options.occupied) {
    const split = key.lastIndexOf("|");
    const sym = key.slice(0, split), side = Number(key.slice(split + 1));
    if (split <= 0 || (side !== 1 && side !== -1)) continue;
    const sides = occupiedSides.get(sym) ?? new Set<number>();
    sides.add(side);
    occupiedSides.set(sym, sides);
  }
  const vacantSides = new Map<string, Set<number>>();
  if (options.oneway) for (const lane of lanes) {
    if (occupiedSides.has(lane.sym)) continue;
    const sides = vacantSides.get(lane.sym) ?? new Set<number>();
    sides.add(lane.side);
    vacantSides.set(lane.sym, sides);
  }
  const selected = new Map<string, string>();
  const selectedSide = new Map<string, number>();
  const kept: ControlContribution[] = [], blocked: Array<{ lane: ControlContribution; why: string }> = [];
  const unknown = new Set<string>();
  const ambiguous = new Set<string>();
  if (options.aggregate || options.oneway)
    for (const key of options.occupied) {
      const parents = trackedByKey.get(key)?.size ?? 0;
      if (!parents) unknown.add(key);
      else if (options.aggregate && parents > 1) ambiguous.add(key);
    }
  for (const lane of lanes) {
    const key = `${lane.sym}|${lane.side}`;
    const id = lane.id ? (lane.lk ?? laneKeyOf({ id: lane.id, cfg: lane.cfg, sym: lane.sym, side: lane.side })) : undefined;
    const owned = !!id && options.occupied.has(key) && !!trackedByKey.get(key)?.has(id);
    let why = "";
    if ((options.aggregate || options.oneway) && !id && !owned) why = "parent identity unavailable";
    if (!why && options.oneway && !owned) {
      const sides = occupiedSides.get(lane.sym);
      if (sides && [...sides].some((side) => side !== lane.side)) why = "one-way symbol has held or pending opposite ownership";
      else if (!sides && (vacantSides.get(lane.sym)?.size ?? 0) > 1)
        why = "one-way symbol has simultaneous opposite parents with no independent ownership";
      else if (selectedSide.has(lane.sym) && selectedSide.get(lane.sym) !== lane.side)
        why = "one-way symbol already reserved for the other direction";
    }
    if (!why && options.aggregate && !owned) {
      if (options.occupied.has(key)) why = "aggregate position has held or pending ownership of another or unknown parent";
      else if (selected.has(key) && selected.get(key) !== id)
        why = "aggregate position reserved for another parent";
    }
    if (why) {
      blocked.push({ lane, why });
      if (options.occupied.has(key) && !trackedByKey.get(key)?.size) unknown.add(key);
      continue;
    }
    kept.push(lane);
    if (id && options.aggregate && !options.occupied.has(key)) selected.set(key, id);
    if (options.oneway && !selectedSide.has(lane.sym)) selectedSide.set(lane.sym, lane.side);
  }
  return { lanes: kept, blocked, unknown, ambiguous };
}
