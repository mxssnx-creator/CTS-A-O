// An evaluation family (CTS_CORE_FAMILY): one bot × range of the engine, or one signal source × range, run ALONE through
// Base. The label is the family's name in bot-stats (botFamilyOf): "eng follow mn", "eng revert wide",
// "sig follow sar medium". With no label the engine runs every family, as the desk does.
import { botFamilyOf } from "./bot-stats.ts";

export interface EvalFamily {
  label: string;
  kind: "eng" | "sig";
  bot: string;
  /** engine families: the range tag ("" = wide, the untagged grid) */
  tag: string;
}

/** parse a family label; null for no label or one that is not a family */
export function parseEvalFamily(label: string | null | undefined): EvalFamily | null {
  if (!label || !label.trim()) return null;
  // one space between the words, as bot-stats names the family (a label typed with two matched no config)
  const p = label.trim().split(/\s+/);
  const name = p.join(" ");
  if (p[0] === "eng" && p.length === 3) return { label: name, kind: "eng", bot: p[1], tag: p[2] === "wide" ? "" : p[2] };
  if (p[0] === "sig" && p.length >= 4 && (p[p.length - 1] === "short" || p[p.length - 1] === "medium"))
    return { label: name, kind: "sig", bot: p[1], tag: "" };
  throw new Error(`CTS_CORE_FAMILY "${label}" is not a family ("eng <bot> <mc|mp|mn|sh|gn|lg|wide>" or "sig <bot> <source> <short|medium>")`);
}

/**
 * Whether a Base pair belongs to the family. An engine pair (bot, indication) belongs when its bot is the family's and the
 * family's range is one of the ranges the pair passed (`tags`, "" = wide). A signal pair belongs when its family name
 * (bot-stats) is the label. An engine family never admits a signal pair, a signal family never an engine pair.
 */
export function evalFamilyMatch(fam: EvalFamily, bot: string, ind: string, tags: readonly string[]): boolean {
  if (fam.kind === "eng") {
    if (ind.includes("sig-")) return false;
    return bot === fam.bot && tags.includes(fam.tag);
  }
  return ind.includes("sig-") && botFamilyOf(`${bot}|${ind}`) === fam.label;
}

/**
 * Whether an engine family's range builds a cell in the run's protect grid (WalkForwardOptions.protects). A family runs
 * with DCA, Block and Axis off (PROTOCOL.md), so its configs are the grid's Normal / Trailing cells of its range: Micro
 * needs grid.micro, Minimal plus grid.minimalPlus on with cells, Wide a grid.tp (empty by default — the ranges replaced
 * the wide targets). Without a cell the family cannot trade: five causal sessions ended as "no trades on D1", which read
 * as a measured zero. A signal family takes the signal protects, never this grid: always true.
 */
export function evalFamilyHasCells(fam: EvalFamily, protects: ReadonlyArray<{ tag?: string }>): boolean {
  return fam.kind === "sig" || protects.some((p) => (p.tag ?? "") === fam.tag);
}

/** a list of family labels separated by ";" (the positive-PF run of several families at once); null when unset */
export function parseEvalFamilies(value: string | null | undefined): EvalFamily[] | null {
  if (!value || !value.trim()) return null;
  return value
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => parseEvalFamily(l)!);
}

/**
 * The range tags of a pair that belong to the families: an engine pair keeps the tags that some engine family of its bot
 * covers (the other ranges of the pair are other families); a signal pair has no engine tags (`[]`), a signal family
 * admits the signal pairs by name (evalFamilyMatch). `tags` are the pair's passing range tags ("" = wide).
 */
export function familyTags(fams: readonly EvalFamily[], bot: string, ind: string, tags: readonly string[]): string[] {
  return tags.filter((t) => fams.some((f) => f.kind === "eng" && evalFamilyMatch(f, bot, ind, [t])));
}

/**
 * Whether the families narrow Base. A signal is confirmed by the engine's candidates (signal confirmation, on): with a
 * signal family in the list, Base is not narrowed — every engine pair passes, builds its tapes and takes its seats as on
 * the desk, so its candidates confirm the signals — and the families apply at execution only (WalkForwardOptions.family:
 * the labels, matched against each config's botFamilyOf). An engine-only list narrows Base to its bots and ranges
 * (familyTags), as before.
 */
export const familiesNarrowBase = (fams: readonly EvalFamily[]): boolean => !fams.some((f) => f.kind === "sig");
