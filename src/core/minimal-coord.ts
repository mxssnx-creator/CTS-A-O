/**
 * Minimal Coord.
 * Position-cost ranges, independent of the wide protect grid. TP in multiples of the 0.2 % round-trip cost:
 *   Minimal  4–8×   (0.8–1.6 %, step 1×)
 *   Short    8–14×  (1.6–2.8 %, step 1×)
 *   General  14–22× (2.8–4.4 %, step 2×)
 *   Long     22–32× (4.4–6.4 %, step 2×)
 * A boundary multiple (8, 14, 22) belongs to the lower range, so no cell is computed twice.
 * Micro (0.1–0.4 %) and Minimal plus stay optional. Wide targets stay in the main grid.
 */
import type { Gates, ProtectGridSpec, RangeMinPfKey, RangeTag } from "./domain/types.ts";

export const MINIMAL_COORD = "Minimal Coord.";

/** Display names of the ranges ("" = the wide grid). */
export const RANGE_LABEL: Record<RangeTag | "", string> = {
  "": "Wide",
  mn: "Minimal",
  sh: "Short",
  gn: "General",
  lg: "Long",
  mc: "Micro",
  mp: "Minimal plus",
};

/** Every range tag, smallest targets first. */
export const RANGE_TAGS: readonly RangeTag[] = ["mc", "mn", "mp", "sh", "gn", "lg"];

/** Range of a config id ("" = the wide grid). */
export function rangeOfId(id: string | undefined): RangeTag | "" {
  const m = id ? /\|(mc|mp|mn|sh|gn|lg)(?=\||$)/.exec(id) : null;
  return m ? (m[1] as RangeTag) : "";
}

/** Round-trip cost these ranges are built on: 0.1% per side. */
const COST = 0.002;

export interface CoordRange {
  tp: readonly number[];
  slOfTp: readonly number[];
  trailOfTp: readonly number[];
  trailSlOfTp?: number;
  minSl?: number;
  minTrail?: number;
  /**
   * Shortest lane (minutes) this range trades on; 0 = every lane. Unset: the range's default (RANGE_MIN_TF).
   */
  minTf?: number;
  /**
   * Base judges a pair for this range at the range's own cell (true) or at the default protect, TP 2.6 % (false).
   * Unset: the range's default (RANGE_OWN_BASE): Micro and Minimal own, far below the default's distances.
   */
  ownBase?: boolean;
  /**
   * Micro only: the range trades only the Micro indications ("mc-…"), and they trade only Micro cells — independent
   * of the indications and ranges of the others. Unset = on.
   */
  ownInds?: boolean;
}

/**
 * Ranges judged in Base at their own cell by default. 12 h, 3 October 04-16 UTC: Minimal at its own cell 375
 * trades PF 2.14 (+119) against 106 / 1.15 at the default; Short, General and Long at their own cells let 3x the
 * pairs through and fell to PF 1.02 / 0.85 / 0.84 (1.61 / 1.10 / 4.00 at the default).
 */
export const RANGE_OWN_BASE: Readonly<Partial<Record<RangeTag, boolean>>> = { mc: true, mn: true };

/**
 * Default shortest lane per range. Short: 24 h of x01's live settings (2 Oct 18:00 – 3 Oct 18:00, 20 symbols) lost
 * −5,558 on Short's 1m / 5m lanes (11,327 orders, PF 0.66 of the whole run); on 15m and slower PF 1.12, +38.8 %.
 * General and Long targets (3.2–6.4 %) are hours of movement: on 1m / 5m lanes
 * the signal says nothing about a move that size (12 h, 3 October, 02–14 UTC: General PF 0.16 on 1m and 0.45 on
 * 5m against 1.52 on 15m; Long 0.17 / 0.45 against 1.25 on 15m and 3.12 on 30m).
 */
export const RANGE_MIN_TF: Readonly<Partial<Record<RangeTag, number>>> = { sh: 15, gn: 15, lg: 15 };

/** Shortest lane per range tag of a grid (tags without one are absent: every lane). */
export function rangeMinTfOf(g: {
  micro?: CoordRange | false;
  minimal?: CoordRange | false;
  short?: CoordRange | false;
  general?: CoordRange | false;
  long?: CoordRange | false;
}): Partial<Record<RangeTag, number>> {
  const out: Partial<Record<RangeTag, number>> = {};
  for (const [tag, r] of [
    ["mc", g.micro],
    ["mn", g.minimal],
    ["sh", g.short],
    ["gn", g.general],
    ["lg", g.long],
  ] as const) {
    const v = r ? (r.minTf ?? RANGE_MIN_TF[tag]) : undefined;
    if (typeof v === "number" && v > 0) out[tag] = v;
  }
  return out;
}

/** Plain plus two trailing distances. Every range keeps both; one trailing config is not a range. */
export const TRAIL_CONFIGS = [0, 0.5, 0.75] as const;

/** TP multiples of the round-trip cost, lo..hi by step (whole multiples). */
export const costTps = (lo: number, hi: number, step: number): number[] =>
  steps(lo, hi, step).map((n) => +(COST * n).toFixed(4));

/**
 * Minimal: 4–8× cost (0.8–1.6 %), step 1×. Stops 1–2× the target. Both trailing distances; a trailing cell keeps its
 * own stop ratio from 1× (a forced 2× stop made each loss twice the trailed win: 12 h, 3 October, Trailing PF 1.04 →
 * 1.47 and the engine 1.15 → 1.49 with 1×).
 */
export const MINIMAL_RANGE: CoordRange = {
  tp: costTps(4, 8, 1),
  slOfTp: [1, 1.5, 2],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 1,
  minSl: +(COST * 2).toFixed(4),
  minTrail: +COST.toFixed(4),
};

/** Short: 8–14× cost (1.6–2.8 %), step 1× (8× belongs to Minimal). Stops 1–2× the target, trailing cells too. */
export const SHORT_RANGE: CoordRange = {
  tp: costTps(9, 14, 1),
  slOfTp: [1, 1.5, 2],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 1,
  minSl: +(COST * 3).toFixed(4),
  minTrail: +COST.toFixed(4),
};

/** General: 14–22× cost (2.8–4.4 %), step 2× (14× belongs to Short). Stops 0.5–1× the target. */
export const GENERAL_RANGE: CoordRange = {
  tp: costTps(16, 22, 2),
  slOfTp: [0.5, 0.75, 1],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 1,
  minSl: +(COST * 5).toFixed(4),
  minTrail: +(COST * 2).toFixed(4),
};

/** Long: 22–32× cost (4.4–6.4 %), step 2× (22× belongs to General). Stops 0.5–1× the target. */
export const LONG_RANGE: CoordRange = {
  tp: costTps(24, 32, 2),
  slOfTp: [0.5, 0.75, 1],
  trailOfTp: TRAIL_CONFIGS,
  trailSlOfTp: 1,
  minSl: +(COST * 8).toFixed(4),
  minTrail: +(COST * 3).toFixed(4),
};

/**
 * Micro: TP 0.20–0.40 % step 0.05 %, every stop ratio 0.5–2× for each target, plain and both trailing distances.
 * Traded only by the Micro indications (ownInds); the Base PF evaluation decides which cells run. Measured on
 * 3 October (13 symbols, 2 days of 1m bars, 600 cells): no cell above PF 1 even at a 0.04 % round trip — the
 * results follow the TP / SL geometry, not the entry (follow and revert alike), so Base rejects them all.
 */
export const MICRO_TP: readonly number[] = [0.002, 0.0025, 0.003, 0.0035, 0.004];
export const MICRO_SL: readonly number[] = [0.5, 0.75, 1, 1.5, 2];
export const MICRO_RANGE: CoordRange = {
  tp: MICRO_TP,
  slOfTp: MICRO_SL,
  trailOfTp: TRAIL_CONFIGS,
  /** Trailing cells keep the stated stop ratio from 1×. */
  trailSlOfTp: 1,
  minSl: 0.001,
  minTrail: 0.0005,
};

type GridSlice = Pick<
  ProtectGridSpec,
  "holdH" | "minSl" | "minTrail" | "short" | "minimal" | "general" | "long" | "micro"
>;
/** The position-cost ranges built by forEachCoord, smallest first. */
export type CoordTag = "mn" | "sh" | "gn" | "lg";

/** Cells a range adds before identical distances collapse. */
export function coordVariants(holdN: number, range: CoordRange | false | undefined): number {
  if (!range) return 0;
  const hold = holdN || 1;
  return range.tp.length * range.slOfTp.length * range.trailOfTp.length * hold;
}

/** Emit every minimal, short, general and long cell. Trailing cells use at least trailSlOfTp. */
export function forEachCoord(
  g: GridSlice,
  emit: (
    tp: number,
    slRatio: number,
    trailRatio: number,
    holdH: number,
    minSl: number,
    minTrail: number,
    tag: CoordTag,
  ) => void,
): void {
  for (const [tag, range] of [
    ["mn", g.minimal],
    ["sh", g.short],
    ["gn", g.general],
    ["lg", g.long],
  ] as const) {
    if (!range) continue;
    const minSl = range.minSl ?? g.minSl;
    const minTrail = range.minTrail ?? g.minTrail;
    const trailStop = range.trailSlOfTp ?? 2;
    for (const tp of range.tp)
      for (const k of range.slOfTp)
        for (const tr of range.trailOfTp)
          for (const h of g.holdH)
            emit(tp, tr > 0 ? Math.max(k, trailStop) : k, tr, h, minSl, minTrail, tag);
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

/** 2×–5× position cost, step 0.25. Stops 0.5×–3× in steps of 0.25. Off unless a setting enables it. */
export const MINIMAL_PLUS_TP = steps(2, 5, 0.25).map((n) => +(COST * n).toFixed(4));
export const MINIMAL_PLUS_SL = steps(0.5, 3, 0.25);
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
  /** min PF over the last N closes (default 1.35; never below the Base minimum 1.05) */
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
    minPf: Number.isFinite(minPf) ? Math.max(1.05, minPf) : 1.35,
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
  const minPf = Math.max(1.05, plus.minPf ?? 1.35);
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

/** Range gate defaults: 50 previous closes at PF 1.35 (the usual gate is 1.1–1.25). Never below 50 closes. */
export const RANGE_GATE = { enabled: true, lastN: 50, minPf: 1.35 } as const;

/**
 * The ranges the range gate (and its min-closes pruning) applies to: the small targets that close often and can
 * churn the cost (micro, minimal, short, plus). General and Long replace the former wide targets and are judged like
 * them (the stage gates, the validation last-N) — with the 50-close gate a slow lane would lose its whole plain base.
 */
export const GATED_RANGES: ReadonlySet<string> = new Set(["mc", "mn", "sh", "mp"]);
export const rangeGated = (tag: string | undefined | null) => !!tag && GATED_RANGES.has(tag);

/** Walk-forward form of the range gate (null = off). lastN never below 50, min PF never below the Base minimum 1.05. */
export function rangeGateOf(
  g: { rangeGate?: { enabled?: boolean; lastN?: number; minPf?: number } } | null | undefined,
): { lastN: number; minPf: number } | null {
  const r = g?.rangeGate;
  if (!r || r.enabled === false) return null;
  const lastN = Number(r.lastN);
  const minPf = Number(r.minPf);
  return {
    lastN: Number.isFinite(lastN) ? Math.max(50, Math.round(lastN)) : RANGE_GATE.lastN,
    minPf: Number.isFinite(minPf) ? Math.max(1.05, minPf) : RANGE_GATE.minPf,
  };
}

const RANGE_MIN_PF_KEY: Readonly<Record<RangeTag, RangeMinPfKey>> = {
  mc: "micro",
  mn: "minimal",
  mp: "minimal",
  sh: "short",
  gn: "general",
  lg: "long",
};

/**
 * The stage minimum PF of a config with this range tag: its range's own value (Gates.rangeMinPf, 1.05–3) or the
 * stage minimum. Untagged configs (Wide, the signals) keep the stage minimum.
 */
export function minPfOf(gates: Pick<Gates, "minPf" | "rangeMinPf">, tag: string | null | undefined): number {
  const key = tag ? RANGE_MIN_PF_KEY[tag as RangeTag] : undefined;
  const v = key ? gates.rangeMinPf?.[key] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? Math.min(3, Math.max(1.05, v)) : gates.minPf;
}
