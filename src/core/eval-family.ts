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
  const p = label.trim().split(" ");
  if (p[0] === "eng" && p.length === 3) return { label: label.trim(), kind: "eng", bot: p[1], tag: p[2] === "wide" ? "" : p[2] };
  if (p[0] === "sig" && p.length >= 4 && (p[p.length - 1] === "short" || p[p.length - 1] === "medium"))
    return { label: label.trim(), kind: "sig", bot: p[1], tag: "" };
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
