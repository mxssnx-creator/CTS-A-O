import type { Protect, ProtectGridSpec, RangeTag } from "./domain/types.ts";
import { microSlFloor, ownSlFloor } from "./minimal-coord.ts";
import { minimumStopFraction } from "./protection-policy.ts";

export const PRICE_DISTANCE_RANGES = ["wide", "mc", "mn", "mp", "sh", "gn", "lg", "lr"] as const;
export type PriceDistanceRange = RangeTag | "wide";

/** Distances in percentage points of price, with exact tenths in Settings. */
export interface PriceDistanceGrid {
  enabled: boolean;
  ranges: readonly PriceDistanceRange[];
  stopPcts: readonly number[];
  trailPcts: readonly number[];
  trailingBasis: "entry" | "peak" | "both";
}

export const PRICE_STOP_PCTS = Array.from({ length: 21 }, (_, i) => (i + 2) / 10);
export const PRICE_TRAIL_PCTS = Array.from({ length: 25 }, (_, i) => (i + 2) / 10);
export const DEFAULT_PRICE_DISTANCE_GRID: PriceDistanceGrid = {
  enabled: false, ranges: ["lr"], stopPcts: PRICE_STOP_PCTS, trailPcts: PRICE_TRAIL_PCTS, trailingBasis: "both",
};

export function checkPriceDistanceGrid(grid: PriceDistanceGrid): void {
  if (!grid || typeof grid !== "object" || typeof grid.enabled !== "boolean")
    throw new Error("Price-distance grid requires an enabled switch");
  if (!Array.isArray(grid.ranges) || !grid.ranges.length || new Set(grid.ranges).size !== grid.ranges.length ||
      grid.ranges.some(tag => !PRICE_DISTANCE_RANGES.includes(tag)))
    throw new Error("Price-distance grid requires unique ranges");
  if (grid.trailingBasis !== "entry" && grid.trailingBasis !== "peak" && grid.trailingBasis !== "both")
    throw new Error("Price-distance trailing basis must be entry, peak or both");
  for (const [label, values, max] of [["SL", grid.stopPcts, 22], ["trailing", grid.trailPcts, 26]] as const) {
    if (!Array.isArray(values) || !values.length || new Set(values).size !== values.length || values.some(value => {
      const tenths = Math.round(value * 10);
      return !Number.isFinite(value) || Math.abs(tenths - value * 10) > 1e-8 || tenths < 2 || tenths > max;
    })) throw new Error(`Price-distance ${label} requires distinct 0.1 percentage-point values from 0.2 to ${max / 10}`);
  }
}

/** Selected ranges retain their targets, holds and limits. Each exact priced stop and trailing basis has its own proof. */
export function applyPriceDistanceGrid(cells: Protect[], grid: ProtectGridSpec, cost: number, limit: number): Protect[] {
  const policy = grid.priceDistances;
  if (!policy?.enabled) return cells;
  checkPriceDistanceGrid(policy);

  const selected = new Set(policy.ranges);
  const settings = { mc: grid.micro, mn: grid.minimal, sh: grid.short, gn: grid.general, lg: grid.long };
  const globalFloor = grid.minSlEval ?? minimumStopFraction(cost);
  const out: Protect[] = [];
  const seen = new Set<string>();
  const stops = policy.stopPcts.map(value => Math.round(value * 10) / 1000);
  const trails = policy.trailPcts.map(value => Math.round(value * 10) / 1000);
  for (const p of cells) {
    const tag = p.lowRangeOnly ? "lr" : p.tag ?? "wide";
    if (!selected.has(tag)) { out.push(p); continue; }
    const key = `${tag}|${p.tag ?? ""}|${p.tp}|${p.hold}|${p.maxHoldMin ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const tagged = tag === "wide" || tag === "mp" || tag === "lr" ? undefined : settings[tag] || undefined;
    const range = tag === "wide" ? grid : tagged;
    const low = tag === "lr" ? grid.lowRange : undefined;
    const globalOrOwnSl = ownSlFloor(low ?? tagged, cost) ?? globalFloor;
    const minSl = Math.max(globalOrOwnSl, range?.minSlEval ?? 0, range?.minSl ?? 0,
      tag === "mc" ? microSlFloor(grid.micro, cost) ?? 0 : 0, low ? cost + low.step : 0);
    const minTrail = Math.max(range?.minTrail ?? 0, low ? cost + 2 * low.step : 0);
    const maxSl = Math.min(p.riskCaps?.sl ?? Infinity, tag === "wide" && (grid.maxSl ?? 0) > 0 ? grid.maxSl! : Infinity);
    const maxTrail = Math.min(p.riskCaps?.trail ?? Infinity, tag === "wide" && (grid.maxTrail ?? 0) > 0 ? grid.maxTrail! : Infinity);
    const allowedTrails = trails.filter(value => value + 1e-12 >= minTrail && value - 1e-12 <= maxTrail);
    for (const sl of stops) {
      if (sl + 1e-12 < minSl || sl - 1e-12 > maxSl) continue;
      const plain: Protect = {
        tp: p.tp, sl, trail: 0, hold: p.hold, priceDistance: true,
        ...(p.tag ? { tag: p.tag } : {}),
        ...(p.lowRangeOnly ? { lowRangeOnly: true } : {}),
        ...(p.maxHoldMin !== undefined ? { maxHoldMin: p.maxHoldMin } : {}),
        ...(p.riskCaps ? { riskCaps: p.riskCaps } : {}),
      };
      out.push(plain);
      for (const trail of allowedTrails) {
        const trailing = { ...plain, trail, trailStep: 1, trailFree: grid.trailFree ?? false };
        if (policy.trailingBasis !== "entry") out.push(trailing);
        if (policy.trailingBasis !== "peak") out.push({ ...trailing, trailFixed: true });
      }
      if (out.length > limit) throw new Error(`protect grid too large (max ${limit} variants)`);
    }
  }
  return out;
}
