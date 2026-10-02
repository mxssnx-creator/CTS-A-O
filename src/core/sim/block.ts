// Block levels from several independent sources. The config source judges the config set's own tape; the others
// judge the Block feed: every Real-stage candidate position (executed or not) with its simulated unit result,
// counted once it has closed before the entry (causal). Judging candidates rather than executed positions keeps
// Block Active from locking itself out (no execution → no level → no execution) and keeps the Block volume from
// feeding back into its own level.
//   config     the config set's own closed positions
//   overall    all Real candidates
//   symbol     candidates on the same symbol
//   direction  candidates on the same side
//   indication candidates of the same indication type
//   type       candidates of the same strategy type (Normal, Trailing, DCA, DCA Active, Axis)
// For n = 1..maxLevel, a positive sum of the last n closed results is one level.
// Types:
//   shared    the strongest enabled source's level (max) raises the volume: 1 + ratio · level
//   additive  the enabled sources' levels add up: 1 + ratio · Σ level
//   overall   every source is its own Block: each source at its level adds its own position
//             (ratio · level of that source), tracked per source; the sources never combine
// Block Active (sub-type -Active): only entries at the minimum level or above are opened — every lower entry is
// skipped (also with Normal on). Without Active a Block level of 1 or more raises the volume.
// Steps: the raise moves in `steps` equal volume steps up to maxMult (0 = continuous).
// Pause: after a raised position of a source closes positive, that source raises nothing for its next `pause`
// closes (then its level is recalculated); 0 = no pause.
import type { BlockConfig } from "../domain/types.ts";

export type BlockSource = "config" | "overall" | "symbol" | "direction" | "indication" | "type";
export const BLOCK_SOURCES: readonly BlockSource[] = [
  "config",
  "overall",
  "symbol",
  "direction",
  "indication",
  "type",
];

export function levelOfTail(rs: readonly number[], maxLevel: number): number {
  let level = 0;
  let sum = 0;
  for (let n = 1; n <= maxLevel && n <= rs.length; n++) {
    sum += rs[rs.length - n];
    if (sum > 0) level++;
  }
  return level;
}

/** A closed candidate as the Block book sees it. `bsrc`: the sources that raised it when it was executed. */
export interface BlockBookEntry {
  sym: string;
  side: number;
  kind: string;
  r: number;
  type?: string;
  cfg?: string;
  bsrc?: readonly BlockSource[];
}

/** Book key of a source for one position (config: the config set itself). */
export function sourceKey(
  s: BlockSource,
  t: { sym: string; side: number; kind: string; type?: string; cfg?: string },
): string {
  switch (s) {
    case "config":
      return `c:${t.cfg ?? ""}`;
    case "overall":
      return "all";
    case "symbol":
      return `s:${t.sym}`;
    case "direction":
      return `d:${t.side}`;
    case "indication":
      return `i:${t.kind}`;
    case "type":
      return `t:${t.type ?? "normal"}`;
  }
}

/** Closed positions by source key, in exit order (append-only), and the sources paused after a positive raise. */
export class BlockBook {
  private lists = new Map<string, number[]>();
  private pauseLeft = new Map<string, number>();
  /** closes a source waits after a positive raised position (0 = no pause) */
  readonly pause: number;
  constructor(pause = 0) {
    this.pause = Math.max(0, Math.floor(pause || 0));
  }
  add(t: BlockBookEntry) {
    const keys = BLOCK_SOURCES.map((s) => sourceKey(s, t));
    for (const k of keys) {
      // a paused source counts its closes down; at 0 its level is recalculated
      const left = this.pauseLeft.get(k);
      if (left !== undefined) {
        if (left <= 1) this.pauseLeft.delete(k);
        else this.pauseLeft.set(k, left - 1);
      }
      if (k.startsWith("c:")) continue; // the config source judges the config's own tape
      const l = this.lists.get(k);
      if (l) {
        l.push(t.r);
        if (l.length > 256) l.splice(0, l.length - 64); // only the tail is ever read
      } else this.lists.set(k, [t.r]);
    }
    // a raised position that closed positive pauses the sources that raised it
    if (this.pause > 0 && t.r > 0 && t.bsrc?.length)
      for (const s of t.bsrc) this.pauseLeft.set(sourceKey(s, t), this.pause);
  }
  level(key: string, maxLevel: number): number {
    return levelOfTail(this.lists.get(key) ?? [], maxLevel);
  }
  paused(key: string): boolean {
    return (this.pauseLeft.get(key) ?? 0) > 0;
  }
}

export interface BlockLevels {
  config: number;
  overall: number;
  symbol: number;
  direction: number;
  indication: number;
  type: number;
}

export function sourcesOf(b: BlockConfig): Record<BlockSource, boolean> {
  const s = b.sources ?? {};
  return {
    config: s.config !== false,
    overall: !!s.overall,
    symbol: !!s.symbol,
    direction: !!s.direction,
    indication: !!s.indication,
    type: !!s.type,
  };
}

export function bookLevels(
  book: BlockBook | null | undefined,
  t: { sym: string; side: number; kind: string; type?: string },
  maxLevel: number,
): Omit<BlockLevels, "config"> {
  if (!book) return { overall: 0, symbol: 0, direction: 0, indication: 0, type: 0 };
  return {
    overall: book.level("all", maxLevel),
    symbol: book.level(`s:${t.sym}`, maxLevel),
    direction: book.level(`d:${t.side}`, maxLevel),
    indication: book.level(`i:${t.kind}`, maxLevel),
    type: book.level(`t:${t.type ?? "normal"}`, maxLevel),
  };
}

/** Combined level of the enabled sources: shared = max, additive = sum, overall = the strongest source. */
export function combineLevels(levels: BlockLevels, b: BlockConfig): number {
  const on = sourcesOf(b);
  const xs = BLOCK_SOURCES.filter((k) => on[k]).map((k) => levels[k]);
  if (!xs.length) return 0;
  return (b.mode ?? "shared") === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
}

export interface BlockDecision {
  /** Block-adjusted: raised (level at least 1, or with Block Active at least the minimum level) */
  adjusted: boolean;
  /** the level the decision used (shared: max, additive: sum, overall: the strongest raising source) */
  level: number;
  /** total volume multiple (1 + every raise), never above 8× */
  vol: number;
  /** overall: the extra volume each source adds as its own position */
  legs?: Partial<Record<BlockSource, number>>;
  /** the sources that raised the entry (they pause after it closes positive) */
  src: BlockSource[];
}

/** Volume steps: a raise rounded to `steps` equal steps between 1 and maxMult (at least one step). */
export function stepRaise(extra: number, b: BlockConfig, capExtra: number): number {
  if (!(extra > 0) || !(capExtra > 0)) return 0;
  const steps = Math.floor(b.steps ?? 0);
  if (steps > 0) {
    const size = (Math.min(8, b.maxMult) - 1) / steps;
    if (size > 0) return Math.min(capExtra, Math.max(1, Math.round(extra / size)) * size);
  }
  return Math.min(capExtra, extra);
}

/**
 * The Block decision for one entry from its source levels: whether it is raised, by how much, and (overall) the
 * extra position of every source. Paused sources (after a positive raise) count as level 0.
 */
export function blockDecide(
  levels: BlockLevels,
  b: BlockConfig,
  active: boolean,
  paused: (s: BlockSource) => boolean = () => false,
): BlockDecision {
  const on = sourcesOf(b);
  const lv = (s: BlockSource) => (on[s] && !paused(s) ? levels[s] : 0);
  const srcs = BLOCK_SOURCES.filter((s) => on[s]);
  const min = active ? Math.max(1, b.minActiveLevel) : 1;
  const cap = Math.min(8, Math.max(1, b.maxMult));
  const mode = b.mode ?? "shared";
  if (mode === "overall") {
    // every source is its own Block: each raising source adds its own position (capped like a stack of its own)
    const legs: Partial<Record<BlockSource, number>> = {};
    const src: BlockSource[] = [];
    let extra = 0;
    let level = 0;
    for (const s of srcs) {
      const l = lv(s);
      if (l < min) continue;
      const leg = stepRaise(b.ratio * l, b, cap - 1);
      if (!(leg > 0)) continue;
      legs[s] = +leg.toFixed(6);
      src.push(s);
      extra += leg;
      level = Math.max(level, l);
    }
    if (!src.length) return { adjusted: false, level: 0, vol: 1, src: [] };
    // the stack never exceeds 8×: every source's position shrinks in proportion
    if (extra > 7) for (const s of src) legs[s] = +((legs[s] ?? 0) * (7 / extra)).toFixed(6);
    return { adjusted: true, level, vol: +Math.min(8, 1 + extra).toFixed(6), legs, src };
  }
  const xs = srcs.map((s) => lv(s));
  const level = !xs.length ? 0 : mode === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
  if (level < min) return { adjusted: false, level: 0, vol: 1, src: [] };
  const src = srcs.filter((s) => (mode === "additive" ? lv(s) > 0 : lv(s) === level && level > 0));
  const extra = stepRaise(b.ratio * level, b, cap - 1);
  return { adjusted: true, level, vol: +(1 + extra).toFixed(6), src };
}
