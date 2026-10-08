// The range categories a config belongs to, for independent processing (8 Oct). Signals are their own class (the
// coordination-only units of pair × symbol × side); every Normal indication belongs to one engine range (micro,
// minimal, minimal plus, short, general, long); Axis and DCA are strategy families of their own; an untagged Normal or
// Trailing config is the wide grid. A category run processes its own configs and nothing else.
import { isSignalInd } from "./indications/registry.ts";
import { rangeOfId, type RangeTag } from "./minimal-coord.ts";
import { kindOfId } from "./pipeline/pipeline.ts";

export const RANGE_CATEGORIES = [
  "signals",
  "micro",
  "minimal",
  "minimalPlus",
  "short",
  "general",
  "long",
  "wide",
  "axis",
  "dca",
] as const;

export type RangeCategory = (typeof RANGE_CATEGORIES)[number];

/** The category of each engine range tag. */
export const CATEGORY_OF_TAG: Readonly<Record<RangeTag, RangeCategory>> = {
  mc: "micro",
  mn: "minimal",
  mp: "minimalPlus",
  sh: "short",
  gn: "general",
  lg: "long",
};

/** The Normal range categories: each is processed on its own (the engine ranges, not Signals, Axis or DCA). */
export const NORMAL_RANGE_CATEGORIES: readonly RangeCategory[] = [
  "micro",
  "minimal",
  "minimalPlus",
  "short",
  "general",
  "long",
];

/**
 * The category of a config id. Signals are read from the indication (`sig-`), so a range tag on a signal config
 * changes nothing; the strategy family comes from the id's kind (axis, dca); the range comes from the tag.
 */
export function categoryOfConfig(id: string): RangeCategory {
  const ind = id.split("|")[1] ?? "";
  if (isSignalInd(ind)) return "signals";
  const kind = kindOfId(id);
  if (kind === "axis") return "axis";
  if (kind === "dca" || kind === "dca-active") return "dca";
  const tag = rangeOfId(id);
  return tag ? CATEGORY_OF_TAG[tag] : "wide";
}
