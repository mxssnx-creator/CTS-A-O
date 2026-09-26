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
// For n = 1..maxLevel, a positive sum of the last n closed results is one level.
// Shared: the strongest enabled source's level (max). Additive: the enabled sources' levels add up. The volume is
// 1 + ratio · level, capped by maxMult; Block Active executes only at level ≥ min active level.
import type { BlockConfig } from "../domain/types.ts";

export type BlockSource = "config" | "overall" | "symbol" | "direction" | "indication";
export const BLOCK_SOURCES: readonly BlockSource[] = [
  "config",
  "overall",
  "symbol",
  "direction",
  "indication",
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

/** Closed positions by source key, in exit order (append-only). */
export class BlockBook {
  private lists = new Map<string, number[]>();
  add(t: { sym: string; side: number; kind: string; r: number }) {
    for (const k of ["all", `s:${t.sym}`, `d:${t.side}`, `i:${t.kind}`]) {
      const l = this.lists.get(k);
      if (l) {
        l.push(t.r);
        if (l.length > 256) l.splice(0, l.length - 64); // only the tail is ever read
      } else this.lists.set(k, [t.r]);
    }
  }
  level(key: string, maxLevel: number): number {
    return levelOfTail(this.lists.get(key) ?? [], maxLevel);
  }
}

export interface BlockLevels {
  config: number;
  overall: number;
  symbol: number;
  direction: number;
  indication: number;
}

export function sourcesOf(b: BlockConfig): Record<BlockSource, boolean> {
  const s = b.sources ?? {};
  return {
    config: s.config !== false,
    overall: !!s.overall,
    symbol: !!s.symbol,
    direction: !!s.direction,
    indication: !!s.indication,
  };
}

export function bookLevels(
  book: BlockBook | null | undefined,
  t: { sym: string; side: number; kind: string },
  maxLevel: number,
): Omit<BlockLevels, "config"> {
  if (!book) return { overall: 0, symbol: 0, direction: 0, indication: 0 };
  return {
    overall: book.level("all", maxLevel),
    symbol: book.level(`s:${t.sym}`, maxLevel),
    direction: book.level(`d:${t.side}`, maxLevel),
    indication: book.level(`i:${t.kind}`, maxLevel),
  };
}

/** Combined level of the enabled sources: shared = max, additive = sum. */
export function combineLevels(levels: BlockLevels, b: BlockConfig): number {
  const on = sourcesOf(b);
  const xs = BLOCK_SOURCES.filter((k) => on[k]).map((k) => levels[k]);
  if (!xs.length) return 0;
  return (b.mode ?? "shared") === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
}
