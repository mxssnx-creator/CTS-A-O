// Block levels from several independent sources. The config source judges the config set's own tape; the others
// judge the Block feed: every Real-stage candidate position (executed or not) with its simulated unit result,
// counted once it has closed before the entry (causal). Judging candidates rather than executed positions keeps
// Block Active from locking itself out (no execution → no level → no execution) and keeps the Block volume from
// feeding back into its own level.
//   config     the config set's own closed positions (per direction with sideKeys: long and short apart)
//   overall    all Real candidates
//   symbol     candidates on the same symbol and side (long and short judged apart)
//   direction  candidates on the same side
//   indication candidates of the same indication type and side (long and short judged apart)
//   type       candidates of the same strategy type (Normal, Trailing, DCA, DCA Active, Axis)
// For n = 1..maxLevel, a positive sum of the last n closed results is one level.
// Types:
//   shared    the strongest enabled source's level (max) raises the volume: 1 + ratio · level
//   additive  the enabled sources' levels add up: 1 + ratio · Σ level
//   overall   every source is its own Block: each source at its level adds its own position
//             (ratio · level of that source), tracked per source; the sources never combine
// Block Active (sub-type -Active): only entries at the minimum level or above are opened — every lower entry is
// skipped (also with Normal on). Without Active a Block level of 1 or more raises the volume.
// Steps: the raise moves in `steps` equal volume steps up to maxMult (0 = continuous). With `stepFloor` on (the
// default) any raise adds at least one step; off, a raise rounds to the nearest step and one under half a step adds
// nothing (an Overall leg of ratio 0.1 × level 1 is 0.1 units, not a full unit).
// maxMult caps the total stack in every type (Overall: every leg shrinks in proportion when the legs exceed it).
// Window: pooled sources judge n × window closes per level; `windowHours` scales each pooled source's window with its
// activity (its closes in the last windowHours hours ÷ maxLevel, never below `window`), so the top level spans
// about windowHours of that source whatever its rate. `levelMinWin`: a level also needs that share of winning closes.
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

/**
 * Levels 1..maxLevel: level n counts when the sum of the last n × window closes is positive (all of them present)
 * and, with `minWin` > 0, at least that share of them won (one big win after seven losses is not level 8).
 */
export function levelOfTail(rs: readonly number[], maxLevel: number, window = 1, minWin = 0): number {
  const w = Math.max(1, Math.floor(window || 1));
  let level = 0;
  let sum = 0;
  let wins = 0;
  let i = 0;
  for (let n = 1; n <= maxLevel && n * w <= rs.length; n++) {
    for (; i < n * w; i++) {
      const r = rs[rs.length - 1 - i];
      sum += r;
      if (r > 0) wins++;
    }
    if (sum > 0 && !(minWin > 0 && wins < minWin * n * w)) level++;
  }
  return level;
}

/** Book options beyond pause and window (BlockConfig.windowHours, levelMinWin). */
export interface BlockBookOpts {
  windowHours?: number;
  levelMinWin?: number;
  /** BlockConfig.poolSignals: false = signal closes never enter the pooled sources */
  poolSignals?: boolean;
  /** BlockConfig.poolDedupe: identical closes count once in the pooled sources */
  poolDedupe?: boolean;
  /** BlockConfig.sideKeys: the config source's pause is kept per direction (the caller reads its level per direction) */
  sideKeys?: boolean;
}

const HOUR_MS = 3_600_000;

/** Index of the first time after `t` in an ascending list (the closes are kept in exit order). */
function firstAfter(ts: readonly number[], t: number): number {
  let lo = 0;
  let hi = ts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
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
  /** AutoBlockBook: bit i set when candidate window i would have raised it at its entry (stampEntry) */
  autoRaise?: number;
  /** exit time (ms): windowHours measures each pooled source's activity on it */
  exitT?: number;
  /** entry time (ms): poolDedupe recognises the same close under another config by it */
  entryT?: number;
}

/**
 * Book key of a source for one position (config: the config set itself). `sideKeys` (BlockConfig.sideKeys): the config
 * source is keyed per direction too, so its pause and countdown are its own direction's; its level is read per
 * direction by blockLevel.
 */
export function sourceKey(
  s: BlockSource,
  t: { sym: string; side: number; kind: string; type?: string; cfg?: string },
  sideKeys = false,
): string {
  switch (s) {
    case "config":
      return sideKeys ? `c:${t.cfg ?? ""}|${t.side > 0 ? 1 : -1}` : `c:${t.cfg ?? ""}`;
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
  /** windowHours: each list's exit times (same order as its results) */
  private times = new Map<string, number[]>();
  private pauseLeft = new Map<string, number>();
  /** closes a source waits after a positive raised position (0 = no pause) */
  readonly pause: number;
  /** pooled sources' judging window (BlockConfig.window; the window in use for an AutoBlockBook) */
  window: number;
  /** activity-scaled window: a source's window is its closes in the last windowHours ÷ maxLevel (0 = off) */
  readonly windowHours: number;
  /** share of winning closes a level needs on top of a positive sum (0 = off) */
  readonly levelMinWin: number;
  /** signal closes enter the pooled sources (true, today's) */
  readonly poolSignals: boolean;
  readonly poolDedupe: boolean;
  /** the config source's pause is keyed per direction (BlockConfig.sideKeys; false = today's) */
  readonly sideKeys: boolean;
  private seenCloses = new Set<string>();
  private keep: number;
  constructor(pause = 0, window = 1, opts: BlockBookOpts = {}) {
    this.poolSignals = opts.poolSignals !== false;
    this.poolDedupe = !!opts.poolDedupe;
    this.sideKeys = !!opts.sideKeys;
    this.pause = Math.max(0, Math.floor(pause || 0));
    this.window = Math.max(1, Math.floor(window || 1));
    this.windowHours = opts.windowHours && opts.windowHours > 0 ? opts.windowHours : 0;
    this.levelMinWin = opts.levelMinWin && opts.levelMinWin > 0 ? Math.min(1, opts.levelMinWin) : 0;
    // the tail a level can read (up to 12 levels × window), kept with room to spare
    this.keep = Math.max(64, 12 * this.window);
  }
  /**
   * Whether a close enters the pooled sources: a signal's only with poolSignals, a close identical to one already in
   * (same symbol, side, entry, exit and result: one entry under two indication names) only once with poolDedupe.
   */
  protected pooledClose(t: BlockBookEntry, signal: boolean): boolean {
    if (signal && !this.poolSignals) return false;
    if (!this.poolDedupe) return true;
    const k = `${t.sym}|${t.side > 0 ? 1 : -1}|${t.entryT ?? ""}|${t.exitT ?? ""}|${t.r}`;
    if (this.seenCloses.has(k)) return false;
    // bounded: the closes of a run's recent past (a duplicate closes with its twin)
    if (this.seenCloses.size >= 200_000) this.seenCloses.clear();
    this.seenCloses.add(k);
    return true;
  }
  /**
   * One closed candidate. `signal`: a signal's close (poolSignals decides whether it enters the pooled sources). A close
   * kept out of the pooled sources still counts down its config's pause.
   */
  add(t: BlockBookEntry, signal = false, pooled = this.pooledClose(t, signal)) {
    const keys = BLOCK_SOURCES.map((s) => sourceKey(s, t, this.sideKeys));
    const timed = this.windowHours > 0;
    for (const k of keys) {
      if (!pooled && !k.startsWith("c:")) continue;
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
        if (timed) {
          const ts = this.times.get(k)!;
          ts.push(t.exitT ?? ts[ts.length - 1] ?? 0);
          // only the closes inside the activity span (and the fixed window's tail) are ever read
          if (l.length > 4 * this.keep) {
            const cut = Math.min(l.length - this.keep, firstAfter(ts, ts[ts.length - 1] - 2 * this.windowHours * HOUR_MS));
            // trimmed in batches (amortized): a splice per close would copy the list every time
            if (cut >= this.keep) {
              l.splice(0, cut);
              ts.splice(0, cut);
            }
          }
        } else if (l.length > 4 * this.keep) l.splice(0, l.length - this.keep); // only the tail is ever read
      } else {
        this.lists.set(k, [t.r]);
        if (timed) this.times.set(k, [t.exitT ?? 0]);
      }
    }
    // a raised position that closed positive pauses the sources that raised it
    if (this.pause > 0 && t.r > 0 && t.bsrc?.length)
      for (const s of t.bsrc) this.pauseLeft.set(sourceKey(s, t, this.sideKeys), this.pause);
  }
  /** The judging window of a source: `window`, or (windowHours) its closes in its last windowHours ÷ maxLevel. */
  windowOf(key: string, maxLevel: number): number {
    if (!(this.windowHours > 0)) return this.window;
    const ts = this.times.get(key);
    if (!ts?.length) return this.window;
    const n = ts.length - firstAfter(ts, ts[ts.length - 1] - this.windowHours * HOUR_MS);
    return Math.max(this.window, Math.floor(n / Math.max(1, maxLevel)));
  }
  level(key: string, maxLevel: number): number {
    return levelOfTail(this.lists.get(key) ?? [], maxLevel, this.windowOf(key, maxLevel), this.levelMinWin);
  }
  paused(key: string): boolean {
    return (this.pauseLeft.get(key) ?? 0) > 0;
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
  /** total volume multiple (1 + every raise), never above maxMult (itself at most 8×) */
  vol: number;
  /** overall: the extra volume each source adds as its own position */
  legs?: Partial<Record<BlockSource, number>>;
  /** the sources that raised the entry (they pause after it closes positive) */
  src: BlockSource[];
}

/** The total Block volume cap of every type: maxMult, within [1, 8]. */
export function blockStackCap(b: Pick<BlockConfig, "maxMult">): number {
  return Math.min(8, Math.max(1, b.maxMult));
}

/**
 * Volume steps: a raise rounded to `steps` equal steps between 1 and maxMult — at least one step with `stepFloor`
 * on (the default), else the nearest step (under half a step: no raise).
 */
export function stepRaise(extra: number, b: BlockConfig, capExtra: number): number {
  if (!(extra > 0) || !(capExtra > 0)) return 0;
  const steps = Math.floor(b.steps ?? 0);
  if (steps > 0) {
    const size = (Math.min(8, b.maxMult) - 1) / steps;
    if (size > 0) {
      const n = Math.round(extra / size);
      return Math.min(capExtra, (b.stepFloor === false ? n : Math.max(1, n)) * size);
    }
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
  const cap = blockStackCap(b);
  const mode = b.mode ?? "shared";
  if (mode === "overall") {
    // every source is its own Block: each raising source adds its own position (each leg within maxMult − 1)
    const legs: Partial<Record<BlockSource, number>> = {};
    const src: BlockSource[] = [];
    let extra = 0;
    let level = 0;
    let reached = 0;
    for (const s of srcs) {
      const l = lv(s);
      if (l < min) continue;
      reached = Math.max(reached, l);
      const leg = stepRaise(b.ratio * l, b, cap - 1);
      if (!(leg > 0)) continue;
      legs[s] = +leg.toFixed(6);
      src.push(s);
      extra += leg;
      level = Math.max(level, l);
    }
    // stepFloor off: a source at its level whose raise rounds to no step still counts for Block Active (as in shared /
    // additive), at its unit
    if (!src.length)
      return b.stepFloor === false && reached > 0
        ? { adjusted: true, level: reached, vol: 1, src: [] }
        : { adjusted: false, level: 0, vol: 1, src: [] };
    // the stack never exceeds maxMult (the total volume cap): every source's position shrinks in proportion
    if (extra > cap - 1) for (const s of src) legs[s] = +((legs[s] ?? 0) * ((cap - 1) / extra)).toFixed(6);
    return { adjusted: true, level, vol: +Math.min(cap, 1 + extra).toFixed(6), legs, src };
  }
  const xs = srcs.map((s) => lv(s));
  const level = !xs.length ? 0 : mode === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
  if (level < min) return { adjusted: false, level: 0, vol: 1, src: [] };
  const src = srcs.filter((s) => (mode === "additive" ? lv(s) > 0 : lv(s) === level && level > 0));
  const extra = stepRaise(b.ratio * level, b, cap - 1);
  return { adjusted: true, level, vol: +(1 + extra).toFixed(6), src };
}

const bookOpts = (b: BlockConfig): BlockBookOpts => ({
  windowHours: b.windowHours,
  levelMinWin: b.levelMinWin,
  poolSignals: b.poolSignals,
  poolDedupe: b.poolDedupe,
  sideKeys: b.sideKeys,
});

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
    super(b.pause ?? 0, fallback, bookOpts(b));
    const ws = [...new Set((b.windowCandidates?.length ? b.windowCandidates : DEFAULT_WINDOW_CANDIDATES)
      .map((w) => Math.max(1, Math.min(500, Math.floor(w))))
      .filter((w) => Number.isFinite(w)))];
    if (!ws.includes(fallback)) ws.push(fallback);
    this.windows = ws;
    this.books = ws.map((w) => new BlockBook(b.pause ?? 0, w, bookOpts(b)));
    this.recent = ws.map(() => []);
    this.cur = ws.indexOf(fallback);
    this.lookback = Math.max(30, Math.floor(b.windowLookback ?? 300));
    this.maxLevel = b.maxLevel;
    this.minLevel = Math.max(1, b.minActiveLevel ?? 1);
    const on = sourcesOf(b);
    this.pooled = BLOCK_SOURCES.filter((s) => s !== "config" && on[s]);
  }
  /** whether window i's book raises `t` now (the strongest enabled pooled source at the minimum level) */
  private raises(i: number, t: BlockBookEntry): boolean {
    let lv = 0;
    for (const s of this.pooled) lv = Math.max(lv, this.books[i].level(sourceKey(s, t), this.maxLevel));
    return lv >= this.minLevel;
  }
  /**
   * Each window's verdict at the entry. Judged at the exit instead, the books held closes made after the entry (its
   * sibling configs on the same move close first with the same sign): winners looked raised, losers not.
   */
  override stampEntry(t: BlockBookEntry) {
    if (this.books.length > 31) return; // one bit per window
    let m = 0;
    for (let i = 0; i < this.books.length; i++) if (this.raises(i, t)) m |= 1 << i;
    t.autoRaise = m;
  }
  override add(t: BlockBookEntry, signal = false, pooled = this.pooledClose(t, signal)) {
    for (let i = 0; i < this.books.length; i++) {
      // stamped at its entry (a run's feed); unstamped, judged on the closes before this one
      if (pooled && (t.autoRaise !== undefined ? (t.autoRaise >> i) & 1 : this.raises(i, t))) {
        const r = this.recent[i];
        r.push(t.r);
        if (r.length > 2 * this.lookback) r.splice(0, r.length - this.lookback);
      }
      this.books[i].add(t, signal, pooled);
    }
    this.choose();
  }
  /** PF of each candidate's last `lookback` raised closes (null below 30). */
  scores(): Array<{ window: number; n: number; pf: number | null }> {
    return this.windows.map((w, i) => {
      const xs = this.recent[i].slice(-this.lookback);
      if (xs.length < 30) return { window: w, n: xs.length, pf: null };
      let gp = 0;
      let gl = 0;
      for (const x of xs) {
        if (x > 0) gp += x;
        else gl -= x;
      }
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
  override windowOf(key: string, maxLevel: number): number {
    return this.books[this.cur].windowOf(key, maxLevel);
  }
  override level(key: string, maxLevel: number): number {
    return this.books[this.cur].level(key, maxLevel);
  }
  override paused(key: string): boolean {
    return this.books[this.cur].paused(key);
  }
  override tailSum(key: string, n: number): { n: number; sum: number } {
    return this.books[this.cur].tailSum(key, n);
  }
}

/** The Block book of a config: windowAuto → AutoBlockBook, else a fixed-window BlockBook. */
export function blockBookOf(b: BlockConfig): BlockBook {
  return b.windowAuto ? new AutoBlockBook(b) : new BlockBook(b.pause ?? 0, b.window ?? 1, bookOpts(b));
}
