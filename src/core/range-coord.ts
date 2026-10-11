// A range's own allow-lists (RangeGrid.coord): which bots and indication families may build the range's configs. A
// range without an allow-list builds every combo, as before. The lists act where a range's tapes are decided (the Base
// pass and the tape stage), so a restricted range has fewer configs and every other range keeps its own tapes.
import type { BotType, RangeCoord } from "./domain/types.ts";
import { INDICATION_BY_ID, laneOf } from "./indications/registry.ts";

/**
 * Indication families by the registry's kinds: trend-following (the trend, moving-average, MACD, parabolic, direction,
 * smoothing and momentum-continuation kinds), mean-reverting (RSI, oscillators, Bollinger bands) and breakout (range
 * breaks and channels). The activity regimes (active) and the volume flows (volume) belong to no family.
 */
export const INDICATION_FAMILIES = {
  trend: ["trend", "ema", "macd", "sar", "ichimoku", "smooth", "direction", "move"],
  reversion: ["rsi", "osc", "bollinger"],
  breakout: ["break", "channel"],
} as const;
export type IndicationFamily = keyof typeof INDICATION_FAMILIES;

/** The families' indication kinds, as a set (a lane id reads its base indication's kind) */
const KIND_FAMILY = new Map<string, IndicationFamily>(
  (Object.keys(INDICATION_FAMILIES) as IndicationFamily[]).flatMap((f) => INDICATION_FAMILIES[f].map((k) => [k, f] as const)),
);

/**
 * May a range's own coordination build this bot × indication? Undefined coordination, or no list in it, allows every
 * combo. An indication outside the registry (a signal, an unknown id) is refused by a family list.
 */
export function rangeAllows(coord: RangeCoord | undefined, bot: string, ind: string): boolean {
  if (!coord) return true;
  if (coord.bots && !coord.bots.includes(bot as BotType)) return false;
  if (coord.indFamilies) {
    const kind = INDICATION_BY_ID.get(laneOf(ind).base)?.kind;
    const family = kind ? KIND_FAMILY.get(kind) : undefined;
    if (!family || !coord.indFamilies.includes(family)) return false;
  }
  return true;
}
