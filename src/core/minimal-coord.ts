/**
 * Minimal Coord.
 * Short, minimal, and micro ranges, independent of the wide protect grid.
 * Wide targets stay in the main grid.
 */
import type { ProtectGridSpec } from "./domain/types.ts";

export const MINIMAL_COORD = "Minimal Coord.";

/** Round-trip cost these ranges are built on: 0.1% per side. */
const COST = 0.002;

export interface CoordRange {
  tp: readonly number[];
  slOfTp: readonly number[];
  trailOfTp: readonly number[];
  trailSlOfTp?: number;
  minSl?: number;
  minTrail?: number;
}

/** None, plus one trailing distance. The half-steps were the overload. */
export const TRAIL_CONFIGS = [0, 0.5] as const;

/** 0.2%–0.8% in 0.2% steps. Stops 1× and 2×. One trailing distance. */
export const MINIMAL_RANGE: CoordRange = {
  tp: [0.002, 0.004, 0.006, 0.008],
  slOfTp: [1, 2],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 2,
  minSl: 0.002,
  minTrail: 0.001,
};

/** 3x-6x cost (0.6-1.2%). Stops 1×, 2× and 3×. */
export const SHORT_RANGE: CoordRange = {
  tp: [3, 4, 5, 6].map((n) => +(COST * n).toFixed(4)),
  slOfTp: [1, 2, 3],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 2,
  minSl: +(COST * 3).toFixed(4),
  minTrail: +COST.toFixed(4),
};

/** 0.10%–0.40% in 0.10% steps. Stops 1×, 2× and 3×. Two trailing distances, the micro rule. */
export const MICRO_TP: readonly number[] = [0.001, 0.002, 0.003, 0.004];
export const MICRO_SL: readonly number[] = [1, 2, 3];
export const MICRO_RANGE: CoordRange = {
  tp: MICRO_TP,
  slOfTp: MICRO_SL,
  trailOfTp: [0, 0.5, 0.75],
  /** Trailing cells keep the stated stop ratio. */
  trailSlOfTp: 1,
  minSl: 0.001,
  minTrail: 0.0005,
};

type GridSlice = Pick<ProtectGridSpec, "holdH" | "minSl" | "minTrail" | "short" | "minimal" | "micro">;

/** Cells a range adds before identical distances collapse. */
export function coordVariants(holdN: number, range: CoordRange | false | undefined): number {
  if (!range) return 0;
  const hold = holdN || 1;
  return range.tp.length * range.slOfTp.length * range.trailOfTp.length * hold;
}

/** Emit every short and minimal cell. Trailing cells use at least trailSlOfTp. */
export function forEachCoord(
  g: GridSlice,
  emit: (
    tp: number,
    slRatio: number,
    trailRatio: number,
    holdH: number,
    minSl: number,
    minTrail: number,
  ) => void,
): void {
  for (const range of [g.short, g.minimal]) {
    if (!range) continue;
    const minSl = range.minSl ?? g.minSl;
    const minTrail = range.minTrail ?? g.minTrail;
    const trailStop = range.trailSlOfTp ?? 2;
    for (const tp of range.tp)
      for (const k of range.slOfTp)
        for (const tr of range.trailOfTp)
          for (const h of g.holdH)
            emit(tp, tr > 0 ? Math.max(k, trailStop) : k, tr, h, minSl, minTrail);
  }
}


/** Every micro cell. The stop ratio is the one configured, including on a trailing cell. */
export function forEachMicro(
  g: { holdH: readonly number[]; micro?: CoordRange | false },
  emit: (
    tp: number,
    slRatio: number,
    trailRatio: number,
    holdH: number,
    minSl: number,
    minTrail: number,
  ) => void,
): void {
  const range = g.micro;
  if (!range) return;
  const minSl = range.minSl ?? 0.001;
  const minTrail = range.minTrail ?? 0.0005;
  for (const tp of range.tp)
    for (const k of range.slOfTp)
      for (const tr of range.trailOfTp)
        for (const h of g.holdH) emit(tp, k, tr, h, minSl, minTrail);
}

/** 2×–5× position cost, whole steps. Stops 0.5×, 1×, 2× and 3×. Off unless a setting enables it. */
export const MINIMAL_PLUS_TP = steps(2, 5, 1).map((n) => +(COST * n).toFixed(4));
export const MINIMAL_PLUS_SL = [0.5, 1, 2, 3];
export const MINIMAL_PLUS_TRAIL = TRAIL_CONFIGS;
/** Trailing cells use a higher stop than the short range (2×): at least 2.5× the target. */
export const MINIMAL_PLUS_TRAIL_SL = 2.5;

export const MINIMAL_PLUS_RANGE: CoordRange = {
  tp: MINIMAL_PLUS_TP,
  slOfTp: MINIMAL_PLUS_SL,
  trailOfTp: MINIMAL_PLUS_TRAIL,
  trailSlOfTp: MINIMAL_PLUS_TRAIL_SL,
  minSl: +(COST * 0.5).toFixed(4),
  minTrail: +(COST * 0.5).toFixed(4),
};

export interface MinimalPlusSettings {
  /** Off by default. On: only the selected cells are built, then kept if the last N clear min PF. */
  enabled: boolean;
  /** Previous closes required. Never below 50. */
  lastN: number;
  /** Higher than the usual 1.1 gate. */
  minPf: number;
  /** Cells the test kept. Empty until a run clears the gate. */
  cells?: ReadonlyArray<{ tp: number; sl: number; trail: number }>;
}

export function minimalPlusSettings(p?: Partial<MinimalPlusSettings> | null): MinimalPlusSettings {
  const lastN = Number(p?.lastN);
  const minPf = Number(p?.minPf);
  return {
    enabled: p?.enabled === true,
    lastN: Number.isFinite(lastN) ? Math.max(50, Math.round(lastN)) : 50,
    minPf: Number.isFinite(minPf) ? Math.max(1.2, minPf) : 1.35,
    cells: p?.cells ?? [],
  };
}

/** Cells a enabled plus-range adds. Disabled, or enabled with no selected cells, adds none. */
export function plusVariants(enabled: boolean, cells: number, holdN: number): number {
  if (!enabled || cells < 1) return 0;
  return cells * (holdN || 1);
}

/**
 * Drop plus-range tapes that do not have `lastN` previous closes at `minPf`.
 * When the range is off, every plus-range tape is dropped.
 */
export function gateMinimalPlus<T extends { id: string; n: number; gp: ArrayLike<number>; gl: ArrayLike<number> }>(
  tapes: readonly T[],
  plus: { enabled?: boolean; lastN?: number; minPf?: number } | false | null | undefined,
): T[] {
  const on = !!plus && plus.enabled === true;
  if (!on) return tapes.filter((t) => !t.id.includes("|mp"));
  const lastN = Math.max(50, Math.round(plus.lastN ?? 50));
  const minPf = Math.max(1.2, plus.minPf ?? 1.35);
  return tapes.filter((t) => {
    if (!t.id.includes("|mp")) return true;
    if (t.n < lastN) return false;
    const from = t.n - lastN;
    const gp = t.gp[t.n] - t.gp[from];
    const gl = t.gl[t.n] - t.gl[from];
    const pf = gl > 1e-12 ? gp / gl : gp > 0 ? 99 : 0;
    const allGl = t.gl[t.n] - t.gl[0];
    const allGp = t.gp[t.n] - t.gp[0];
    const allPf = allGl > 1e-12 ? allGp / allGl : allGp > 0 ? 99 : 0;
    // the last window and the whole tape both have to clear: a hot tail on a losing book does not seat
    return pf + 1e-12 >= minPf && allPf + 1e-12 >= minPf;
  });
}

function steps(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to + 1e-9; n += step) out.push(+n.toFixed(2));
  return out;
}
