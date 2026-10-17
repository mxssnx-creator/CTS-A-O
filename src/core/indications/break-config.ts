/** Lightweight Break identities and routing metadata; safe for client-side settings and reporting imports. */
export const BREAK_TIMEFRAMES = [1, 5, 15] as const;
export const BREAK_SUBSETS = [
  [1],
  [5],
  [15],
  [1, 5],
  [1, 15],
  [5, 15],
  [1, 5, 15],
] as const;

export const BREAK_CORES = [
  { id: "don", label: "Donchian break" },
  { id: "squeeze", label: "Squeeze expansion" },
  { id: "retest", label: "Break retest" },
] as const;
export type BreakCore = (typeof BREAK_CORES)[number]["id"];

export const BREAK_PROFILES = [
  {
    id: "guarded",
    label: "Guarded",
    priceDrawdownMax: 1.25,
    marketDrawdownMax: 1.1,
    marketAgainstZMax: 0.75,
    residualMin: -0.25,
    activityLastMin: 0.8,
    activityLastMax: 3.0,
    activityPartMin: 0.75,
    activityChangeMin: 0.8,
    marketActivityMax: 3.0,
    marketActivityPartMax: 1.8,
    atrRatioMin: 0.75,
    atrRatioMax: 1.8,
    rangeRatioMin: 0.75,
    rangeRatioMax: 2.4,
  },
  {
    id: "balanced",
    label: "Balanced",
    priceDrawdownMax: 2.0,
    marketDrawdownMax: 1.8,
    marketAgainstZMax: 1.5,
    residualMin: -1.0,
    activityLastMin: 0.55,
    activityLastMax: 4.0,
    activityPartMin: 0.5,
    activityChangeMin: 0.5,
    marketActivityMax: 4.0,
    marketActivityPartMax: 2.5,
    atrRatioMin: 0.5,
    atrRatioMax: 2.8,
    rangeRatioMin: 0.5,
    rangeRatioMax: 3.2,
  },
] as const;
export type BreakProfile = (typeof BREAK_PROFILES)[number]["id"];

/** Each Break config selects its own rolling drawdown horizon. */
export const BREAK_DRAWDOWN_WINDOWS = [
  { id: "24", bars: 24 },
  { id: "48", bars: 48 },
] as const;
export type BreakDrawdownWindow = (typeof BREAK_DRAWDOWN_WINDOWS)[number]["id"];

const subsetCode = (tfs: readonly number[]) => tfs.join("x");
export const breakConfigId = (
  core: BreakCore,
  tfs: readonly number[],
  ddWindow: BreakDrawdownWindow,
  profile: BreakProfile,
  micro: boolean,
) => `break-${micro ? "mc-" : ""}rel-${core}-${subsetCode(tfs)}-dd${ddWindow}-${profile}`;

export const isBreakRelInd = (base: string) => base.startsWith("break-rel-") || base.startsWith("break-mc-rel-");
export const isBreakMicroInd = (base: string) => base.startsWith("break-mc-rel-");

const anchorById = new Map<string, number>();
/** The exact anchor lane: the fastest timeframe included in the selected trend subset. */
export function breakAnchorTf(base: string): number | null {
  return anchorById.get(base) ?? null;
}

/** Seven trend subsets × three sources × two drawdown horizons × two profiles, plus Micro aliases at 5m and 15m. */
export const BREAK_CONFIG_IDS = BREAK_SUBSETS.flatMap((tfs) =>
  BREAK_CORES.flatMap((core) =>
    BREAK_DRAWDOWN_WINDOWS.flatMap((ddWindow) =>
      BREAK_PROFILES.flatMap((profile) => [
        breakConfigId(core.id, tfs, ddWindow.id, profile.id, false),
        ...(Math.min(...tfs) >= 5 ? [breakConfigId(core.id, tfs, ddWindow.id, profile.id, true)] : []),
      ]),
    ),
  ),
);
for (const tfs of BREAK_SUBSETS)
  for (const core of BREAK_CORES)
    for (const ddWindow of BREAK_DRAWDOWN_WINDOWS)
      for (const profile of BREAK_PROFILES) {
        anchorById.set(breakConfigId(core.id, tfs, ddWindow.id, profile.id, false), Math.min(...tfs));
        if (Math.min(...tfs) >= 5)
          anchorById.set(breakConfigId(core.id, tfs, ddWindow.id, profile.id, true), Math.min(...tfs));
      }
