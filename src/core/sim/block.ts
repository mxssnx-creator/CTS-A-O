// Block levels from several independent sources. The config source judges the config set's own tape; the others
// judge causal closed unit results. Overall reads only orders admitted at the final modeled Real boundary;
// auxiliary relations retain Real-selected candidates, including those execution later rejects. Unraised qualified
// base entries and independent auxiliary relations can bootstrap a cold Overall book without inventing admissions.
//   config     the config set's own closed positions
//   overall    final-Real admitted modeled orders (capital allocation and venue fills remain separate)
//   symbol     candidates on the same symbol and side (long and short judged apart)
//   direction  candidates on the same side
//   indication candidates of the same indication type and side (long and short judged apart)
//   type       candidates of the same strategy type (Normal, Trailing, DCA, DCA Active, Axis)
// For n = 1..maxLevel, a positive sum of the last n closed results is one level.
// Types:
//   shared    the strongest enabled source's level (max) raises the volume: 1 + ratio · level
//   additive  the enabled sources' levels add up: 1 + ratio · Σ level
//   overall   every source is its own Block: each source at its level adds its own position
//             (ratio · level of that source), tracked per source; all sources share the total maxMult cap
// Block Active (sub-type -Active): only entries at the minimum level or above are opened — every lower entry is
// skipped (also with Normal on). Without Active a Block level of 1 or more raises the volume.
// Steps: full steps round down, never above ratio × level. A smaller-than-one-step raise retains its fraction
// so a valid relation still contributes without being inflated to an exchange lot (0 = continuous).
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

/** Levels 1..maxLevel: level n counts when the sum of the last n × window closes is positive (all of them present). */
export function levelOfTail(rs: readonly number[], maxLevel: number, window = 1): number {
  const w = Math.max(1, Math.floor(window || 1));
  let level = 0;
  let sum = 0;
  let i = 0;
  for (let n = 1; n <= maxLevel && n * w <= rs.length; n++) {
    for (; i < n * w; i++) {
      const r = rs[rs.length - 1 - i];
      // This close remains in every larger window. Unknown units or overflow cannot become a positive level;
      // a smaller, already complete finite window keeps its own independent verdict.
      if (!Number.isFinite(r) || !Number.isFinite(sum + r)) return level;
      sum += r;
    }
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
  entryT?: number;
  bsrc?: readonly BlockSource[];
  /** AutoBlockBook: bit i set when candidate window i would have raised it at its entry (stampEntry) */
  autoRaise?: number;
  /** Entry-time auto-window verdicts split by evidence universe; rejected candidates can score auxiliary sources only. */
  autoOverallRaise?: number;
  autoAuxRaise?: number;
  /** Set only after all modeled Real entry checks and accepted-order registration; never proof of funded ownership. */
  realAccepted?: boolean;
}

/** Book key of a source for one position (config: the config set itself). */
export function sourceKey(
  s: BlockSource,
  t: { sym: string; side: number; kind: string; type?: string; cfg?: string },
): string {
  switch (s) {
    case "config":
      return `c:${t.cfg ?? ""}|${t.sym}|${t.side > 0 ? 1 : -1}`;
    case "overall":
      return "all";
    // long and short run independently: a symbol's / an indication type's shorts never raise or hold its longs
    case "symbol":
      return `s:${t.sym}|${t.side > 0 ? 1 : -1}`;
    case "direction":
      return `d:${t.side}`;
    case "indication":
      return `i:${t.kind}|${t.side > 0 ? 1 : -1}`;
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
  /** pooled sources' judging window (BlockConfig.window; the window in use for an AutoBlockBook) */
  window: number;
  private keep: number;
  constructor(pause = 0, window = 1) {
    this.pause = Math.max(0, Math.floor(pause || 0));
    this.window = Math.max(1, Math.floor(window || 1));
    // the tail a level can read (up to 12 levels × window), kept with room to spare
    this.keep = Math.max(64, 12 * this.window);
  }
  add(t: BlockBookEntry) {
    const keys = BLOCK_SOURCES.map((s) => sourceKey(s, t));
    for (const k of keys) {
      // The global relation judges only final modeled admissions. Rejected candidates neither teach it nor
      // consume its pause, while the independent auxiliary candidate books continue unchanged.
      if (k === "all" && t.realAccepted !== true) continue;
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
        if (l.length > 4 * this.keep) l.splice(0, l.length - this.keep); // only the tail is ever read
      } else this.lists.set(k, [t.r]);
    }
    // a raised position that closed positive pauses the sources that raised it
    if (this.pause > 0 && t.r > 0 && t.bsrc?.length)
      for (const s of t.bsrc)
        if (s !== "overall" || t.realAccepted === true) this.pauseLeft.set(sourceKey(s, t), this.pause);
  }
  level(key: string, maxLevel: number): number {
    return levelOfTail(this.lists.get(key) ?? [], maxLevel, this.window);
  }
  paused(key: string): boolean {
    return (this.pauseLeft.get(key) ?? 0) > 0;
  }
  /** Closed candidates available in the tail the source's levels can inspect; O(1), for opt-in audit capture. */
  sampleCount(key: string, maxLevel: number): number {
    return Math.min(this.lists.get(key)?.length ?? 0, Math.max(0, Math.floor(maxLevel)) * this.window);
  }
  /** A candidate enters (the book holds the closes before it): the auto-window book stamps its windows' verdicts. */
  stampEntry(_t: BlockBookEntry): void {}
  /** Sum of a source's last n closes, and how many there were (fewer than n while the book is young; n ≤ 64). */
  tailSum(key: string, n: number): { n: number; sum: number } {
    const l = this.lists.get(key) ?? [];
    const k = Math.min(Math.max(0, Math.floor(n)), l.length);
    let sum = 0;
    for (let i = l.length - k; i < l.length; i++) sum += l[i];
    return { n: k, sum };
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
    symbol: book.level(sourceKey("symbol", t), maxLevel),
    direction: book.level(`d:${t.side}`, maxLevel),
    indication: book.level(sourceKey("indication", t), maxLevel),
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
  /** total volume multiple (1 + every raise), never above maxMult or 8× */
  vol: number;
  /** overall: the extra volume each source adds as its own position */
  legs?: Partial<Record<BlockSource, number>>;
  /** the sources that raised the entry (they pause after it closes positive) */
  src: BlockSource[];
}

/** One total external stack bound for Block and relation volume, including every source's extra position. */
export function blockStackCap(b: Pick<BlockConfig, "maxMult">): number {
  return Number.isFinite(b.maxMult) ? Math.min(8, Math.max(1, b.maxMult)) : 1;
}

/** Conservative volume steps: round full steps down, retaining a raw fractional raise below the first step. */
export function stepRaise(extra: number, b: BlockConfig, capExtra: number): number {
  if (!(extra > 0) || !(capExtra > 0)) return 0;
  const requested = Math.min(extra, capExtra);
  const steps = Math.floor(b.steps ?? 0);
  if (steps > 0) {
    const size = (blockStackCap(b) - 1) / steps;
    if (size > 0 && requested >= size)
      return Math.min(requested, Math.floor(requested / size + 1e-12) * size);
  }
  return requested;
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
  const cap = blockStackCap(b);
  const mode = b.mode ?? "shared";
  if (mode === "overall") {
    // Every source remains its own position, but maxMult bounds the base plus ALL source additions together.
    const legs: Partial<Record<BlockSource, number>> = {};
    const src: BlockSource[] = [];
    let level = 0;
    for (const s of srcs) {
      const l = lv(s);
      if (l < min) continue;
      const leg = stepRaise(b.ratio * l, b, cap - 1);
      if (!(leg > 0)) continue;
      legs[s] = Math.floor(leg * 1_000_000) / 1_000_000;
      src.push(s);
      level = Math.max(level, l);
    }
    if (!src.length) return { adjusted: false, level: 0, vol: 1, src: [] };
    // Allocate in the same six-decimal units the recorded legs use. Largest-remainder rounding conserves the
    // cap even with six fractional legs (independent rounding could overshoot it by several micro-units).
    const scale = 1_000_000;
    const budget = Math.floor((cap - 1) * scale + 1e-8);
    const desired = src.map((s) => Math.round((legs[s] ?? 0) * scale));
    const total = desired.reduce((a, x) => a + x, 0);
    const units = total <= budget ? desired : desired.map((x) => Math.floor((x * budget) / total));
    if (total > budget) {
      let left = budget - units.reduce((a, x) => a + x, 0);
      const rank = desired.map((x, i) => ({ i, remainder: (x * budget) / total - units[i] }))
        .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
      for (const { i } of rank) if (left-- > 0) units[i]++;
    }
    let extra = 0;
    for (let i = 0; i < src.length; i++) {
      if (units[i] > 0) {
        legs[src[i]] = units[i] / scale;
        extra += units[i];
      } else delete legs[src[i]];
    }
    const kept = src.filter((s) => (legs[s] ?? 0) > 0);
    if (!kept.length) return { adjusted: false, level: 0, vol: 1, src: [] };
    return { adjusted: true, level, vol: (scale + extra) / scale, legs, src: kept };
  }
  const xs = srcs.map((s) => lv(s));
  const level = !xs.length ? 0 : mode === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
  if (level < min) return { adjusted: false, level: 0, vol: 1, src: [] };
  const src = srcs.filter((s) => (mode === "additive" ? lv(s) > 0 : lv(s) === level && level > 0));
  const extra = stepRaise(b.ratio * level, b, cap - 1);
  const rounded = Math.min(extra, Math.floor(extra * 1_000_000) / 1_000_000);
  if (!(rounded > 0)) return { adjusted: false, level: 0, vol: 1, src: [] };
  return { adjusted: true, level, vol: Math.min(cap, 1 + rounded), src };
}

export const DEFAULT_WINDOW_CANDIDATES: readonly number[] = [5, 10, 15, 25, 35];

/**
 * Block book that picks its pooled window by results (BlockConfig.windowAuto). One BlockBook per candidate window is
 * fed every close. Each candidate window's level for a position at its entry (the highest enabled pooled source,
 * from the closes before the entry: stampEntry) tells whether that window would have raised it; the window whose
 * raised closes had the best PF over its last `lookback` raised closes is the one used for levels and pauses. Causal:
 * a close is scored when it closes, on the closes before its entry. Until every candidate has 30 raised closes the
 * configured window stays.
 */
export class AutoBlockBook extends BlockBook {
  readonly windows: readonly number[];
  private books: BlockBook[];
  private recent: number[][];
  private cur: number;
  private readonly lookback: number;
  private readonly maxLevel: number;
  private readonly minLevel: number;
  private readonly pooled: BlockSource[];
  constructor(b: BlockConfig) {
    const fallback = Math.max(1, Math.floor(b.window ?? 1));
    super(b.pause ?? 0, fallback);
    const ws = [...new Set((b.windowCandidates?.length ? b.windowCandidates : DEFAULT_WINDOW_CANDIDATES)
      .map((w) => Math.max(1, Math.min(500, Math.floor(w))))
      .filter((w) => Number.isFinite(w)))];
    if (!ws.includes(fallback)) ws.push(fallback);
    this.windows = ws;
    this.books = ws.map((w) => new BlockBook(b.pause ?? 0, w));
    this.recent = ws.map(() => []);
    this.cur = ws.indexOf(fallback);
    this.lookback = Math.max(30, Math.floor(b.windowLookback ?? 300));
    this.maxLevel = b.maxLevel;
    this.minLevel = Math.max(1, b.minActiveLevel ?? 1);
    const on = sourcesOf(b);
    this.pooled = BLOCK_SOURCES.filter((s) => s !== "config" && on[s]);
  }
  /** whether window i's book raises `t` now (the strongest enabled pooled source at the minimum level) */
  private raises(i: number, t: BlockBookEntry, group: "overall" | "aux"): boolean {
    let lv = 0;
    for (const s of this.pooled) {
      if ((s === "overall") !== (group === "overall")) continue;
      lv = Math.max(lv, this.books[i].level(sourceKey(s, t), this.maxLevel));
    }
    return lv >= this.minLevel;
  }
  /**
   * Each window's verdict at the entry. Judged at the exit instead, the books held closes made after the entry (its
   * sibling configs on the same move close first with the same sign): winners looked raised, losers not.
   */
  override stampEntry(t: BlockBookEntry) {
    if (this.books.length > 31) return; // one bit per window
    let overall = 0;
    let aux = 0;
    for (let i = 0; i < this.books.length; i++) {
      if (this.raises(i, t, "overall")) overall |= 1 << i;
      if (this.raises(i, t, "aux")) aux |= 1 << i;
    }
    t.autoOverallRaise = overall;
    t.autoAuxRaise = aux;
    t.autoRaise = overall | aux;
  }
  override add(t: BlockBookEntry) {
    for (let i = 0; i < this.books.length; i++) {
      // Entry-time masks preserve causal replay. A legacy union-only mask can score an admitted order, but
      // cannot prove an auxiliary verdict for a rejected candidate; do not infer one using later close-time data.
      const split = t.autoOverallRaise !== undefined && t.autoAuxRaise !== undefined;
      const raised = split
        ? !!(((t.autoAuxRaise ?? 0) >> i) & 1) ||
          (t.realAccepted === true && !!(((t.autoOverallRaise ?? 0) >> i) & 1))
        : t.autoRaise !== undefined
          ? t.realAccepted === true && !!((t.autoRaise >> i) & 1)
          : t.entryT === undefined &&
            (this.raises(i, t, "aux") || (t.realAccepted === true && this.raises(i, t, "overall")));
      if (raised) {
        const r = this.recent[i];
        r.push(t.r);
        if (r.length > 2 * this.lookback) r.splice(0, r.length - this.lookback);
      }
      this.books[i].add(t);
    }
    this.choose();
  }
  /** PF of each candidate's last `lookback` raised closes (null below 30). */
  scores(): Array<{ window: number; n: number; pf: number | null }> {
    return this.windows.map((w, i) => {
      const xs = this.recent[i].slice(-this.lookback);
      if (xs.length < 30 || xs.some((x) => !Number.isFinite(x))) return { window: w, n: xs.length, pf: null };
      let gp = 0;
      let gl = 0;
      for (const x of xs) {
        if (x > 0) gp += x;
        else gl -= x;
      }
      if (!Number.isFinite(gp) || !Number.isFinite(gl)) return { window: w, n: xs.length, pf: null };
      return { window: w, n: xs.length, pf: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0 };
    });
  }
  private choose() {
    const sc = this.scores();
    if (sc.some((x) => x.pf === null)) return;
    let best = this.cur;
    for (let i = 0; i < sc.length; i++) if ((sc[i].pf as number) > (sc[best].pf as number)) best = i;
    this.cur = best;
    this.window = this.windows[best];
  }
  override level(key: string, maxLevel: number): number {
    return this.books[this.cur].level(key, maxLevel);
  }
  override paused(key: string): boolean {
    return this.books[this.cur].paused(key);
  }
  override sampleCount(key: string, maxLevel: number): number {
    return this.books[this.cur].sampleCount(key, maxLevel);
  }
  override tailSum(key: string, n: number): { n: number; sum: number } {
    return this.books[this.cur].tailSum(key, n);
  }
}

/** The Block book of a config: windowAuto → AutoBlockBook, else a fixed-window BlockBook. */
export function blockBookOf(b: BlockConfig): BlockBook {
  return b.windowAuto ? new AutoBlockBook(b) : new BlockBook(b.pause ?? 0, b.window ?? 1);
}
