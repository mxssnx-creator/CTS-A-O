// Block levels from independent relation sources. Accepted-order history judges only Real orders that passed all
// entry gates and subsequently closed, using their intrinsic unit returns. Legacy real-candidates history is an
// explicitly different diagnostic: all selected Real candidates feed pooled sources and the raw tape judges the
// config source. Neither source reads future closes or feeds the Block volume back into its own level.
//   config     the exact config × symbol × side's closed orders (raw tape only in the legacy diagnostic; its key is
//              per direction already, so block.sideKeys adds nothing to it)
//   overall    all accepted Real orders (all Real candidates only in the legacy diagnostic)
//   symbol     candidates on the same symbol and side (long and short judged apart)
//   direction  candidates on the same side
//   indication candidates of the same exact indication and lane, on the same side
//   type       candidates of the same strategy type (Normal, Trailing, DCA, DCA Active, Axis)
// For n = 1..maxLevel, a positive sum of the last n closed results is one level.
// Types:
//   shared    the strongest enabled source's level (max) raises the volume: 1 + ratio · level
//   additive  the enabled sources' levels add up: 1 + ratio · Σ level
//   overall   every source is its own Block: each source at its level adds its own position
//             (ratio · level of that source), tracked per source; all sources share the total maxMult cap
// Block Active (sub-type -Active): only entries at the minimum level or above are opened — every lower entry is
// skipped (also with Normal on). Without Active a Block level of 1 or more raises the volume.
// Steps: the raise moves in `steps` equal volume steps up to maxMult (0 = continuous). By default (`stepFloor`
// unset or true) larger raises round down to complete steps and a positive raise below one step retains its exact
// ratio: no step can increase the requested extra volume. `stepFloor` false (opt-in proposal): a raise rounds to the
// nearest step and one under half a step adds nothing (an entry at its level is still Block-adjusted, at its unit).
// maxMult caps the total stack in every type (Overall: base plus every source leg share it).
// Window: pooled sources judge n × window closes per level; `windowHours` scales each pooled source's window with its
// activity (its closes in the last windowHours hours ÷ maxLevel, never below `window`), so the top level spans
// about windowHours of that source whatever its rate. `levelMinWin`: a level also needs that share of winning closes.
// Pause: after a raised position of a source closes positive, that source raises nothing for its next `pause`
// closes (then its level is recalculated); 0 = no pause.
import type { BlockAttribution, BlockConfig } from "../domain/types.ts";
import { MAX_EXTERNAL_STACK } from "../config.ts";
import { exitScopeSuffix } from "../exit-scope.ts";
import { rangeOfId } from "../minimal-coord.ts";

export type BlockSource = "config" | "lane" | "overall" | "symbol" | "direction" | "indication" | "type" | "range";
// Order fixes the bit of each source in stored window stamps (autoSources): new relations are appended, never inserted.
export const BLOCK_SOURCES: readonly BlockSource[] = [
  "config",
  "overall",
  "symbol",
  "direction",
  "indication",
  "type",
  "lane",
  "range",
];
/** The config's own relations (config-wide and its symbol × side lane): window 1, never pooled with another config. */
export const OWN_BLOCK_SOURCES: readonly BlockSource[] = ["config", "lane"];
const isOwnKey = (k: string) => k.startsWith("c:") || k.startsWith("l:");

/**
 * Levels 1..maxLevel: level n counts when the sum of the last n × window closes is positive (all of them present)
 * and, with `minWin` > 0, at least that share of them won (one big win after seven losses is not level 8).
 */
export function levelOfTail(rs: readonly number[], maxLevel: number, window = 1, minWin = 0, end = rs.length): number {
  const w = Math.max(1, Math.floor(window || 1));
  let level = 0;
  let sum = 0;
  let wins = 0;
  let i = 0;
  for (let n = 1; n <= maxLevel && n * w <= end; n++) {
    for (; i < n * w; i++) {
      const r = rs[end - 1 - i];
      // This close remains in every larger window. Unknown units or overflow cannot become a positive level;
      // a smaller, already complete finite window keeps its own independent verdict.
      if (!Number.isFinite(r) || !Number.isFinite(sum + r)) return level;
      sum += r;
      if (r > 0) wins++;
    }
    if (sum > 0 && !(minWin > 0 && wins < minWin * n * w)) level++;
  }
  return level;
}

/** BlockConfig.auto: every relation × block count (level) decides by its own newest results whether it raises. */
export interface BlockAutoConfig {
  enabled?: boolean;
  /** newest results a count is judged on (default 30) */
  n?: number;
  /** results a count needs before Auto decides; below it the relation's manual switch holds (default 15) */
  min?: number;
  /** a count raises while the PF of its newest n results is at least this (default 1.1) */
  pf?: number;
  /** "rule" (default): one record per relation × count; "key": per relation key × count (per config for own relations) */
  scope?: "rule" | "key";
}
export const DEFAULT_BLOCK_AUTO: Required<BlockAutoConfig> = { enabled: true, n: 30, min: 15, pf: 1.1, scope: "rule" };

/** One count's verdict: raises (auto), does not raise (auto), or not yet decided (the manual switch holds). */
export interface BlockAutoVerdict {
  source: BlockSource;
  level: number;
  n: number;
  pf: number;
  /** true / false = Auto decided; null = fewer than min results */
  raise: boolean | null;
}

/**
 * The per relation × count record. A position's unit result is recorded, once it closes, under every relation at the
 * level that relation stood at when the position entered (from the closes before the entry), whether that relation
 * raised it or only observed. So a switched-off count is judged on paper exactly like a raising one, and each count is
 * judged on its own results only: another count's or relation's results never move it.
 */
export class BlockAutoEval {
  readonly n: number;
  readonly min: number;
  readonly pf: number;
  readonly scope: "rule" | "key";
  readonly maxLevel: number;
  private results = new Map<string, number[]>();
  constructor(a: BlockAutoConfig, maxLevel: number) {
    this.n = Math.max(1, Math.floor(a.n ?? DEFAULT_BLOCK_AUTO.n));
    this.min = Math.max(1, Math.min(this.n, Math.floor(a.min ?? DEFAULT_BLOCK_AUTO.min)));
    this.pf = Number.isFinite(a.pf) ? a.pf! : DEFAULT_BLOCK_AUTO.pf;
    this.scope = a.scope === "key" ? "key" : "rule";
    this.maxLevel = maxLevel;
  }
  private keyFor(source: BlockSource, key: string, level: number): string {
    return this.scope === "key" ? `${key}#${level}` : `${source}#${level}`;
  }
  record(source: BlockSource, key: string, level: number, r: number): void {
    const k = this.keyFor(source, key, level);
    let l = this.results.get(k);
    if (!l) this.results.set(k, (l = []));
    l.push(r);
    // only the newest n are judged (trimmed in batches)
    if (l.length > 4 * this.n) l.splice(0, l.length - this.n);
  }
  verdict(source: BlockSource, key: string, level: number): BlockAutoVerdict {
    const l = this.results.get(this.keyFor(source, key, level)) ?? [];
    const from = Math.max(0, l.length - this.n);
    let gp = 0, gl = 0;
    for (let i = from; i < l.length; i++) {
      if (l[i] > 0) gp += l[i];
      else gl -= l[i];
    }
    const n = l.length - from;
    const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
    return { source, level, n, pf, raise: n < this.min ? null : pf >= this.pf };
  }
  /** Every recorded count (rule scope: relation × level; key scope: relation key × level), for the statistics. */
  table(): Array<{ key: string; n: number; pf: number; raise: boolean | null }> {
    const out: Array<{ key: string; n: number; pf: number; raise: boolean | null }> = [];
    for (const [k, l] of this.results) {
      const from = Math.max(0, l.length - this.n);
      let gp = 0, gl = 0;
      for (let i = from; i < l.length; i++) if (l[i] > 0) gp += l[i]; else gl -= l[i];
      const n = l.length - from;
      const pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0;
      out.push({ key: k, n, pf, raise: n < this.min ? null : pf >= this.pf });
    }
    return out.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
  }
}

/** Book options beyond pause and window (BlockConfig.windowHours, levelMinWin). */
export interface BlockBookOpts {
  holdUntilNet?: boolean;
  windowHours?: number;
  levelMinWin?: number;
  /** BlockConfig.poolSignals: false = signal closes never enter the pooled sources */
  poolSignals?: boolean;
  /** BlockConfig.poolDedupe: identical closes count once in the pooled sources */
  poolDedupe?: boolean;
  /** BlockConfig.sideKeys: the config source per direction (the exact config key already is; kept for its callers) */
  sideKeys?: boolean;
  /** BlockConfig.configScope: "config" (default) = the config source keys the config alone, every symbol and side */
  configScope?: "config" | "context";
  /** BlockConfig.auto: the per relation × count evaluation (recorded when set; maxLevel bounds the counts) */
  auto?: BlockAutoConfig;
  maxLevel?: number;
  /** BlockConfig.historySource "accepted-orders": only settled accepted Real orders enter the book */
  acceptedOnly?: boolean;
  /** Explicit independently processed, gate-qualified modeled predecessor book. */
  processedOnly?: boolean;
  /** Auto candidates may evaluate the exact config's own window as well as pooled sources. */
  configWindow?: boolean;
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
  blockAttribution?: BlockAttribution;
  sym: string;
  side: number;
  kind: string;
  /** Exact indication ID including its independent timeframe lane. Legacy callers may only supply kind. */
  ind?: string;
  r: number;
  type?: string;
  cfg?: string;
  /** Passed every Real entry gate. Missing/false is never an accepted order. */
  accepted?: boolean;
  /** All independent predecessor gates/caps passed; modeled only, never funded execution evidence. */
  blockProcessed?: boolean;
  bsrc?: readonly BlockSource[];
  /** AutoBlockBook: bit i set when candidate window i would have raised it at its entry (stampEntry) */
  autoRaise?: number;
  /** AutoBlockBook pause attribution: per-window bitmask of BLOCK_SOURCES that raised the entry. */
  autoSources?: number[];
  /** exit time (ms): windowHours measures each pooled source's activity on it */
  exitT?: number;
  /** entry time (ms): poolDedupe recognises the same close under another config by it */
  entryT?: number;
}

/**
 * Book key of a source for one position. The config source is the exact config × symbol × direction, so its level,
 * pause and countdown are its own direction's in every case (BlockConfig.sideKeys, which made the config key per
 * direction, is accepted and adds nothing beyond it).
 */
export function sourceKey(
  s: BlockSource,
  t: { sym: string; side: number; kind: string; ind?: string; type?: string; cfg?: string },
  // block.sideKeys: accepted for its callers; the exact config key is per direction (and symbol) in every case
  _sideKeys = false,
  // BlockConfig.configScope: "config" keys the config source by the config alone (all its symbols and sides)
  configScope: "config" | "context" = "context",
): string {
  const scope = exitScopeSuffix(t.cfg, t.type);
  switch (s) {
    case "config":
      return configScope === "config"
        ? `c:${t.cfg ?? ""}${scope}`
        : `c:${t.cfg ?? ""}|${t.sym}|${t.side > 0 ? 1 : -1}${scope}`;
    // the same config's own symbol × side lane (window 1, like the config source)
    case "lane":
      return `l:${t.cfg ?? ""}|${t.sym}|${t.side > 0 ? 1 : -1}${scope}`;
    // the range (Micro, Minimal, Short, General, Long, Wide; untagged = wide) × side
    case "range":
      return `r:${rangeOfId(t.cfg) || "wide"}|${t.side > 0 ? 1 : -1}${scope}`;
    case "overall":
      return `all${scope}`;
    // Long and short run independently. A different indication or lane never raises or pauses its sibling.
    case "symbol":
      return `s:${t.sym}|${t.side > 0 ? 1 : -1}${scope}`;
    case "direction":
      return `d:${t.side}${scope}`;
    case "indication":
      return `i:${t.ind ?? t.kind}|${t.side > 0 ? 1 : -1}${scope}`;
    case "type":
      return `t:${t.type ?? "normal"}${scope}`;
  }
}

/** Closed positions by source key, in exit order (append-only), and the sources paused after a positive raise. */
export class BlockBook {
  private recovery = new Map<string, { net: number; level: number; closes: number }>();
  readonly holdUntilNet: boolean;
  private lists = new Map<string, number[]>();
  /** windowHours: each list's exit times (same order as its results) */
  private times = new Map<string, number[]>();
  private pauseLeft = new Map<string, number>();
  /** closes a source waits after a positive raised position (0 = no pause) */
  readonly pause: number;
  /** Only settled accepted Real orders can contribute evidence; missing acceptance is unknown. */
  readonly acceptedOnly: boolean;
  readonly processedOnly: boolean;
  private readonly configWindow: boolean;
  /** pooled sources' judging window (BlockConfig.window; the window in use for an AutoBlockBook) */
  window: number;
  /** activity-scaled window: a source's window is its closes in the last windowHours ÷ maxLevel (0 = off) */
  readonly windowHours: number;
  /** share of winning closes a level needs on top of a positive sum (0 = off) */
  readonly levelMinWin: number;
  /** signal closes enter the pooled sources (true, today's) */
  readonly poolSignals: boolean;
  readonly poolDedupe: boolean;
  /** BlockConfig.sideKeys (the exact config key is per direction whatever its value) */
  readonly sideKeys: boolean;
  /** BlockConfig.configScope of the config source's key */
  readonly configScope: "config" | "context";
  /** The book key of a source for a position, under this book's config scope. */
  keyOf(s: BlockSource, t: { sym: string; side: number; kind: string; ind?: string; type?: string; cfg?: string }): string {
    return sourceKey(s, t, this.sideKeys, this.configScope);
  }
  private seenCloses = new Set<string>();
  private keep: number;
  /** A follower has independent pause state but reads another candidate's identical close history. */
  private historyFollower = false;
  /** `opts`: the book options, or (a boolean) acceptedOnly alone */
  constructor(pause = 0, window = 1, options: BlockBookOpts | boolean = {}) {
    const opts: BlockBookOpts = typeof options === "boolean" ? { acceptedOnly: options } : options;
    this.acceptedOnly = !!opts.acceptedOnly;
    this.processedOnly = !!opts.processedOnly;
    this.configWindow = !!opts.configWindow;
    this.holdUntilNet = !!opts.holdUntilNet;
    this.poolSignals = opts.poolSignals !== false;
    this.poolDedupe = !!opts.poolDedupe;
    this.sideKeys = !!opts.sideKeys;
    this.configScope = opts.configScope === "config" ? "config" : "context";
    this.pause = Math.max(0, Math.floor(pause || 0));
    this.window = Math.max(1, Math.floor(window || 1));
    this.windowHours = opts.windowHours && opts.windowHours > 0 ? opts.windowHours : 0;
    this.levelMinWin = opts.levelMinWin && opts.levelMinWin > 0 ? Math.min(1, opts.levelMinWin) : 0;
    // the tail a level can read (up to 12 levels × window), kept with room to spare
    this.keep = Math.max(64, 12 * this.window);
    this.auto = opts.auto?.enabled ? new BlockAutoEval(opts.auto, Math.max(1, Math.floor(opts.maxLevel ?? 8))) : null;
  }
  /** The per relation × count evaluation (BlockConfig.auto), or null when it is off. */
  readonly auto: BlockAutoEval | null;
  /**
   * The level a key stood at when a position entered: the closes of that key with an exit at or before the entry (the
   * book holds them in exit order). Unknown (-1) when the kept tail no longer reaches back to the entry.
   */
  levelAt(key: string, entryT: number, maxLevel: number): number {
    const l = this.lists.get(key), ts = this.times.get(key);
    if (!l || !ts) return 0;
    const end = firstAfter(ts, entryT);
    const w = isOwnKey(key) ? 1 : this.window;
    // a trimmed list starts later than the entry's judging tail: that entry's level is not known
    if (this.trimmed.has(key) && end < maxLevel * w) return -1;
    return levelOfTail(l, maxLevel, w, this.levelMinWin, end);
  }
  private trimmed = new Set<string>();
  /**
   * Whether a close enters the pooled sources: a signal's only with poolSignals, a close identical to one already in
   * (same symbol, side, entry, exit and result: one entry under two indication names) only once with poolDedupe.
   */
  protected pooledClose(t: BlockBookEntry, signal: boolean): boolean {
    if (signal && !this.poolSignals) return false;
    if (!this.poolDedupe) return true;
    const k = `${t.sym}|${t.side > 0 ? 1 : -1}|${t.entryT ?? ""}|${t.exitT ?? ""}|${t.r}${exitScopeSuffix(t.cfg, t.type)}`;
    if (this.seenCloses.has(k)) return false;
    // bounded: the closes of a run's recent past (a duplicate closes with its twin)
    if (this.seenCloses.size >= 200_000) this.seenCloses.clear();
    this.seenCloses.add(k);
    return true;
  }
  /**
   * One closed candidate. `signal`: a signal's close (poolSignals decides whether it enters the pooled sources). A close
   * kept out of the pooled sources still counts down its config's pause. An accepted-orders book takes only settled
   * accepted Real orders (anything else never enters it, not even a pause countdown).
   */
  accepts(t: Pick<BlockBookEntry, "accepted" | "blockProcessed">): boolean {
    return !this.acceptedOnly || t.accepted === true || (this.processedOnly && t.blockProcessed === true);
  }
  add(t: BlockBookEntry, signal = false, pooledIn?: boolean) {
    if (!this.accepts(t)) return;
    const pooled = pooledIn ?? this.pooledClose(t, signal);
    if (this.holdUntilNet && t.accepted === true && t.blockAttribution) {
      for (const s of BLOCK_SOURCES) {
        const leg = t.blockAttribution[s];
        if (!leg || (!OWN_BLOCK_SOURCES.includes(s) && !pooled)) continue;
        const key = this.keyOf(s, t);
        const prev = this.recovery.get(key);
        if (!(Number.isFinite(leg.extra) && leg.extra > 0 && Number.isFinite(leg.level) && leg.level > 0)) continue;
        const delta = typeof t.r === "number" && Number.isFinite(t.r) ? t.r * leg.extra : NaN;
        const net = (prev?.net ?? 0) + delta;
        // Unknown outcomes remain unresolved. They never count as recovered or authorize an extra raise.
        if (!Number.isFinite(net)) this.recovery.set(key, { net: NaN, level: 0, closes: (prev?.closes ?? 0) + 1 });
        else if (net >= 0) this.recovery.delete(key);
        else this.recovery.set(key, { net, level: Math.max(prev?.level ?? 0, leg.level), closes: (prev?.closes ?? 0) + 1 });
      }
    }
    const keys = BLOCK_SOURCES.map((s) => this.keyOf(s, t));
    // the per relation × count evaluation: this accepted close is one result of every relation at the level it stood
    // at when the position entered (judged on the closes before that entry, whether the relation raised or observed)
    if (this.auto && t.accepted === true && Number.isFinite(t.entryT) && Number.isFinite(t.r))
      for (let i = 0; i < BLOCK_SOURCES.length; i++) {
        const k = keys[i];
        if (!pooled && !isOwnKey(k)) continue;
        const level = this.levelAt(k, t.entryT!, this.auto.maxLevel);
        if (level >= 1) this.auto.record(BLOCK_SOURCES[i], k, level, t.r);
      }
    const timed = this.windowHours > 0;
    for (const k of keys) {
      if (!pooled && !isOwnKey(k)) continue;
      // a paused source counts its closes down; at 0 its level is recalculated
      const left = this.pauseLeft.get(k);
      if (left !== undefined) {
        if (left <= 1) this.pauseLeft.delete(k);
        else this.pauseLeft.set(k, left - 1);
      }
      if (isOwnKey(k) && !this.acceptedOnly) continue; // legacy config source judges its raw tape
      const l = this.lists.get(k);
      if (l) {
        l.push(t.r);
        // every list keeps its exit times (levelAt reads the level at an entry; windowHours the activity span)
        const ts = this.times.get(k)!;
        ts.push(t.exitT ?? ts[ts.length - 1] ?? 0);
        if (timed) {
          // only the closes inside the activity span (and the fixed window's tail) are ever read
          if (l.length > 4 * this.keep) {
            const cut = Math.min(l.length - this.keep, firstAfter(ts, ts[ts.length - 1] - 2 * this.windowHours * HOUR_MS));
            // trimmed in batches (amortized): a splice per close would copy the list every time
            if (cut >= this.keep) {
              l.splice(0, cut);
              ts.splice(0, cut);
              this.trimmed.add(k);
            }
          }
        } else if (l.length > 4 * this.keep) {
          // only the tail is ever read
          const cut = l.length - this.keep;
          l.splice(0, cut);
          ts.splice(0, cut);
          this.trimmed.add(k);
        }
      } else {
        this.lists.set(k, [t.r]);
        this.times.set(k, [t.exitT ?? 0]);
      }
    }
    // a raised position that closed positive pauses the sources that raised it
    if (this.pause > 0 && t.r > 0 && t.bsrc?.length)
      for (const s of t.bsrc) this.pauseLeft.set(this.keyOf(s, t), this.pause);
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
    if (this.recoveryUnknown(key)) return 0;
    // the exact config source always judges one close per level; pooled sources their (activity-scaled) window
    return Math.max(this.recoveryLevel(key, maxLevel), levelOfTail(
      this.lists.get(key) ?? [],
      maxLevel,
      isOwnKey(key) ? 1 : this.windowOf(key, maxLevel),
      this.levelMinWin,
    ));
  }
  /** Realized extra-leg unit balance, independent of PF scoring and every sibling relation. */
  recoveryState(key: string): { net: number; level: number; closes: number } | null {
    const state = this.recovery.get(key);
    return state ? { ...state } : null;
  }
  recoveryLevel(key: string, maxLevel: number): number {
    return Math.min(maxLevel, this.recovery.get(key)?.level ?? 0);
  }
  recoveryUnknown(key: string): boolean {
    const state = this.recovery.get(key);
    return !!state && !Number.isFinite(state.net);
  }
  /** Available rows in the exact judging tail, including unknown outcomes; config always uses window 1. */
  sampleCount(key: string, maxLevel: number): number {
    const n = Math.max(0, Math.floor(maxLevel)) * (isOwnKey(key) ? 1 : this.windowOf(key, maxLevel));
    return Math.min((this.lists.get(key) ?? []).length, n);
  }
  paused(key: string): boolean {
    return this.recoveryLevel(key, 12) === 0 && (this.pauseLeft.get(key) ?? 0) > 0;
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
  /** the new relations (17 Nov) are optional for older callers: a missing level is 0 */
  lane?: number;
  overall: number;
  symbol: number;
  direction: number;
  indication: number;
  type: number;
  range?: number;
}

export function sourcesOf(b: BlockConfig): Record<BlockSource, boolean> {
  const s = b.sources ?? {};
  return {
    config: s.config !== false,
    lane: !!s.lane,
    overall: !!s.overall,
    symbol: !!s.symbol,
    direction: !!s.direction,
    indication: !!s.indication,
    type: !!s.type,
    range: !!s.range,
  };
}

export function bookLevels(
  book: BlockBook | null | undefined,
  t: { sym: string; side: number; kind: string; ind?: string; type?: string; cfg?: string },
  maxLevel: number,
): Omit<BlockLevels, "config"> {
  if (!book) return { lane: 0, overall: 0, symbol: 0, direction: 0, indication: 0, type: 0, range: 0 };
  return {
    lane: book.level(sourceKey("lane", t), maxLevel),
    overall: book.level(sourceKey("overall", t), maxLevel),
    symbol: book.level(sourceKey("symbol", t), maxLevel),
    direction: book.level(sourceKey("direction", t), maxLevel),
    indication: book.level(sourceKey("indication", t), maxLevel),
    type: book.level(sourceKey("type", t), maxLevel),
    range: book.level(sourceKey("range", t), maxLevel),
  };
}

/** Combined level of the enabled sources: shared = max, additive = sum, overall = the strongest source. */
export function combineLevels(levels: BlockLevels, b: BlockConfig): number {
  const on = sourcesOf(b);
  const xs = BLOCK_SOURCES.filter((k) => on[k]).map((k) => levels[k] ?? 0);
  if (!xs.length) return 0;
  return (b.mode ?? "shared") === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
}

export interface BlockDecision {
  blockAttribution?: BlockAttribution;
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

/**
 * One total external stack bound for Block and relation volume, including every source's extra position: maxMult,
 * within [1, 8] (a non-finite maxMult raises nothing).
 */
export function blockStackCap(b: Pick<BlockConfig, "maxMult">): number {
  return Number.isFinite(b.maxMult) ? Math.min(MAX_EXTERNAL_STACK, Math.max(1, b.maxMult)) : 1;
}

/** Shared may choose its own per-level raise; unset keeps the historic common ratio. Invalid ratios never raise. */
export function blockRatioOf(b: Pick<BlockConfig, "ratio" | "mode" | "sourceRatios"> & { sharedRatio?: number }, source?: BlockSource): number {
  const ratio = (b.mode ?? "shared") === "shared" && b.sharedRatio !== undefined ? b.sharedRatio : b.ratio;
  const multiplier = source ? b.sourceRatios?.[source] ?? 1 : 1;
  return Number.isFinite(ratio) && ratio >= 0 && Number.isFinite(multiplier) && multiplier >= 0
    ? ratio * multiplier : 0;
}

/**
 * Volume steps. Default (stepFloor unset or true): conservative — round complete steps down, retaining a positive
 * requested raise below one step. stepFloor false (opt-in): the nearest step (under half a step: no raise).
 */
export function stepRaise(extra: number, b: BlockConfig, capExtra: number): number {
  if (!Number.isFinite(extra) || !Number.isFinite(capExtra) || !(extra > 0) || !(capExtra > 0)) return 0;
  const requested = Math.min(extra, capExtra);
  const steps = Math.floor(b.steps ?? 0);
  if (steps > 0) {
    const size = (blockStackCap(b) - 1) / steps;
    if (size > 0 && b.stepFloor === false) return Math.min(capExtra, Math.round(extra / size) * size);
    if (size > 0 && requested >= size)
      return Math.min(requested, Math.floor(requested / size + 1e-12) * size);
  }
  return requested;
}

/**
 * The Block decision for one entry from its source levels: whether it is raised, by how much, and (overall) the
 * extra position of every source. Paused sources (after a positive raise) count as level 0.
 */
function calculateBlock(
  levels: BlockLevels,
  b: BlockConfig,
  active: boolean,
  paused: (s: BlockSource) => boolean = () => false,
): BlockDecision {
  const on = sourcesOf(b);
  const lv = (s: BlockSource) => (on[s] && !paused(s) ? levels[s] ?? 0 : 0);
  const srcs = BLOCK_SOURCES.filter((s) => on[s]);
  const min = active ? Math.max(1, b.minActiveLevel) : 1;
  const cap = blockStackCap(b);
  const mode = b.mode ?? "shared";
  const ratio = blockRatioOf(b);
  if (mode === "overall") {
    // Every source remains its own position, but maxMult bounds the base plus ALL source additions together.
    const legs: Partial<Record<BlockSource, number>> = {};
    const src: BlockSource[] = [];
    let level = 0;
    let reached = 0;
    for (const s of srcs) {
      const l = lv(s);
      if (l < min) continue;
      const requested = blockRatioOf(b, s) * l;
      if (!(requested > 0)) continue;
      reached = Math.max(reached, l);
      const leg = stepRaise(requested, b, cap - 1);
      if (!(leg > 0)) continue;
      legs[s] = Math.floor(leg * 1_000_000) / 1_000_000;
      src.push(s);
      level = Math.max(level, l);
    }
    // stepFloor off (opt-in): a source at its level whose raise rounds to no step still counts for Block Active (as
    // in shared / additive), at its unit
    const atUnit = (): BlockDecision =>
      b.stepFloor === false && reached > 0 && ratio > 0 && cap > 1
        ? { adjusted: true, level: reached, vol: 1, src: [] }
        : { adjusted: false, level: 0, vol: 1, src: [] };
    if (!src.length) return atUnit();
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
    if (!kept.length) return atUnit();
    return { adjusted: true, level, vol: (scale + extra) / scale, legs, src: kept };
  }
  const xs = srcs.map((s) => lv(s));
  let level = !xs.length ? 0 : mode === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
  if (level < min) return { adjusted: false, level: 0, vol: 1, src: [] };
  const additions = srcs.map((s) => ({ source: s, value: blockRatioOf(b, s) * lv(s) }));
  const requested = mode === "additive"
    ? additions.reduce((sum, x) => sum + x.value, 0)
    : Math.max(0, ...additions.filter((x) => lv(x.source) >= min).map((x) => x.value));
  // A below-threshold relation can tie the requested value through its ratio without qualifying in Shared Active.
  const src = additions.filter((x) => x.value > 0 &&
    (mode === "additive" || lv(x.source) >= min && x.value === requested)).map((x) => x.source);
  if (mode === "shared" && src.length) level = Math.max(...src.map(lv));
  const extra = stepRaise(requested, b, cap - 1);
  const rounded = Math.min(extra, Math.floor(extra * 1_000_000) / 1_000_000);
  if (!(rounded > 0))
    // stepFloor off (opt-in): an entry at its level whose raise rounds to no step is still Block-adjusted, at its unit
    return b.stepFloor === false && level > 0 && requested > 0 && cap > 1
      ? { adjusted: true, level, vol: 1, src: [] }
      : { adjusted: false, level: 0, vol: 1, src: [] };
  return { adjusted: true, level, vol: Math.min(cap, 1 + rounded), src };
}

export function blockDecide(
  levels: BlockLevels, b: BlockConfig, active: boolean,
  paused: (s: BlockSource) => boolean = () => false,
): BlockDecision {
  const decision = calculateBlock(levels, b, active, paused);
  if (!b.holdUntilNet || decision.vol <= 1 || !decision.src.length) return decision;
  const weights = decision.src.map((s) => decision.legs?.[s] ?? blockRatioOf(b, s) * (levels[s] ?? 0));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (!(sum > 0)) return decision;
  const attribution: BlockAttribution = {};
  for (let i = 0; i < decision.src.length; i++) {
    const source = decision.src[i];
    attribution[source] = { level: levels[source] ?? 0, extra: decision.legs?.[source] ?? (decision.vol - 1) * weights[i] / sum };
  }
  return { ...decision, blockAttribution: attribution };
}

const bookOpts = (b: BlockConfig): BlockBookOpts => ({
  holdUntilNet: b.holdUntilNet,
  windowHours: b.windowHours,
  levelMinWin: b.levelMinWin,
  poolSignals: b.poolSignals,
  poolDedupe: b.poolDedupe,
  sideKeys: b.sideKeys,
  // BlockConfig.configScope: DEFAULT_BLOCK sets "config" (config-wide); an object without it keeps the exact key
  configScope: b.configScope === "config" ? "config" : "context",
  auto: b.auto,
  maxLevel: b.maxLevel,
  acceptedOnly: b.historySource === "accepted-orders" || b.historySource === "processed-orders",
  processedOnly: b.historySource === "processed-orders",
});

export const DEFAULT_WINDOW_CANDIDATES: readonly number[] = [5, 10, 15, 25, 35];

/**
 * Block book that picks its pooled window by results (BlockConfig.windowAuto). One BlockBook per candidate window is
 * fed every close. Each candidate window applies the configured mode, Active threshold and source pauses to the
 * pooled levels at a position's entry (from the closes before the entry: stampEntry). The window whose
 * raised closes had the best PF over its last `lookback` raised closes is the one used for levels and pauses. Causal:
 * a close is scored when it closes, on the closes before its entry. Until every candidate has 30 raised closes the
 * configured window stays.
 */
export class AutoBlockBook extends BlockBook {
  readonly windows: readonly number[];
  private books: BlockBook[];
  private recent: number[][];
  private cur: number;
  private readonly exitStates = new Map<string, { recent: number[][]; cur: number }>();
  private readonly initial: number;
  private readonly lookback: number;
  private readonly minSamples: number;
  private readonly independent: boolean;
  private readonly sourceStates = new Map<string, { recent: number[][]; cur: number; veto: boolean }>();
  private readonly config: BlockConfig;
  private readonly active: boolean;
  // Direct legacy callers historically judged against minActiveLevel; production passes the actual toggle.
  constructor(b: BlockConfig, active = true) {
    const fallback = Math.max(1, Math.floor(b.window ?? 1));
    super(b.pause ?? 0, fallback, bookOpts(b));
    const ws = [...new Set((b.windowCandidates?.length ? b.windowCandidates : DEFAULT_WINDOW_CANDIDATES)
      .map((w) => Math.max(1, Math.min(500, Math.floor(w))))
      .filter((w) => Number.isFinite(w)))];
    if (!ws.includes(fallback)) ws.push(fallback);
    this.windows = ws;
    this.independent = b.windowIndependent === true;
    this.books = ws.map((w) => new BlockBook(b.pause ?? 0, w, { ...bookOpts(b), holdUntilNet: false, configWindow: this.independent }));
    this.recent = ws.map(() => []);
    this.cur = ws.indexOf(fallback);
    this.initial = this.cur;
    this.minSamples = Math.max(30, Math.floor(b.windowMinSamples ?? 30));
    this.lookback = Math.max(this.minSamples, Math.floor(b.windowLookback ?? 300));
    // The accepted config record is available in every candidate book; legacy raw config tapes are not.
    const sources = sourcesOf(b);
    this.config = { ...b, sources: { ...sources, config: this.acceptedOnly && sources.config } };
    this.active = active;
  }
  /** Whether this pooled window actually raises the entry under the configured mode, Active toggle and pauses. */
  private decide(i: number, t: BlockBookEntry): BlockDecision {
    const book = this.books[i];
    return blockDecide(
      { config: book.level(book.keyOf("config", t), this.config.maxLevel), ...bookLevels(book, t, this.config.maxLevel) },
      this.config,
      this.active,
      (s) => book.paused(book.keyOf(s, t)),
    );
  }
  /**
   * Each window's verdict at the entry. Judged at the exit instead, the books held closes made after the entry (its
   * sibling configs on the same move close first with the same sign): winners looked raised, losers not.
   */
  override stampEntry(t: BlockBookEntry) {
    if (this.books.length > 31) return; // one bit per window
    let m = 0;
    const sources = this.pause > 0 || this.independent ? [] as number[] : undefined;
    for (let i = 0; i < this.books.length; i++) {
      const d = this.decide(i, t);
      if (d.vol > 1) m |= 1 << i;
      if (sources) sources.push(d.src.reduce((mask, source) => mask | (1 << BLOCK_SOURCES.indexOf(source)), 0));
    }
    t.autoRaise = m;
    if (sources) t.autoSources = sources;
  }
  override add(t: BlockBookEntry, signal = false, pooledIn?: boolean) {
    if (!this.accepts(t)) return;
    const pooled = pooledIn ?? this.pooledClose(t, signal);
    const scope = exitScopeSuffix(t.cfg, t.type);
    const recent = this.recentFor(scope);
    const updated = new Set<string>();
    // Recovery is tied to actual entry attribution, not rewritten when an automatic window changes.
    if (this.holdUntilNet) super.add(t, signal, pooled);
    // Legacy unstamped closes must be judged against each candidate's pre-close state. Once the first book
    // records the shared history, the other candidates see that close as well, so take all verdicts first.
    const priorRaised = pooled && t.autoRaise === undefined
      ? this.books.map((_, i) => this.decide(i, t).vol > 1) : undefined;
    for (let i = 0; i < this.books.length; i++) {
      // stamped at its entry (a run's feed); unstamped, judged on the closes before this one
      if (pooled && (priorRaised ? priorRaised[i] : ((t.autoRaise ?? 0) >> i) & 1)) {
        const r = recent[i];
        r.push(t.r);
        if (r.length > 2 * this.lookback) r.splice(0, r.length - this.lookback);
      }
      const mask = t.autoSources?.[i];
      // Only entry-time source attribution is eligible. An old unstamped close cannot be reconstructed at exit.
      if (this.independent && mask !== undefined) for (let j = 0; j < BLOCK_SOURCES.length; j++) {
        const source = BLOCK_SOURCES[j];
        if (!(mask & (1 << j)) || (!pooled && source !== "config")) continue;
        const key = sourceKey(source, t);
        let state = this.sourceStates.get(key);
        if (!state) { state = { recent: this.windows.map(() => []), cur: this.initial, veto: false }; this.sourceStates.set(key, state); }
        const rows = state.recent[i];
        rows.push(t.r);
        if (rows.length > 2 * this.lookback) rows.splice(0, rows.length - this.lookback);
        updated.add(key);
      }
      this.books[i].add(mask === undefined ? t : {
        ...t,
        bsrc: BLOCK_SOURCES.filter((_, source) => !!(mask & (1 << source))),
      }, signal, pooled);
    }
    this.choose(scope);
    if (this.independent) for (const key of updated) this.chooseSource(key);
  }
  private state(scope: string) {
    let state = this.exitStates.get(scope);
    if (!state) {
      state = { recent: this.windows.map(() => []), cur: this.initial };
      this.exitStates.set(scope, state);
    }
    return state;
  }
  private recentFor(scope: string): number[][] { return scope ? this.state(scope).recent : this.recent; }
  private curForKey(key: string): number {
    if (this.independent) return this.sourceStates.get(key)?.cur ?? this.initial;
    const at = key.lastIndexOf("|#exit:");
    return at < 0 ? this.cur : this.state(key.slice(at)).cur;
  }
  /** Score the bounded tail in place; scoring each source must not allocate a copy on every close. */
  private score(window: number, rows: readonly number[] | undefined): { window: number; n: number; pf: number | null } {
    const length = rows?.length ?? 0;
    // Array.slice(-NaN) and slice(-Infinity) start at zero, including for malformed legacy settings.
    const start = Number.isNaN(this.lookback) ? 0 : Math.max(0, length - this.lookback);
    const n = length - start;
    if (n < this.minSamples) return { window, n, pf: null };
    let gp = 0, gl = 0;
    for (let i = start; i < length; i++) {
      const x = rows![i];
      if (!Number.isFinite(x)) return { window, n, pf: null };
      if (x > 0) gp += x;
      else gl -= x;
    }
    return { window, n, pf: !Number.isFinite(gp) || !Number.isFinite(gl) ? null : gl > 0 ? gp / gl : gp > 0 ? Infinity : 0 };
  }
  /** PF of each candidate's last `lookback` raised closes (null below 30). */
  scores(scope = ""): Array<{ window: number; n: number; pf: number | null }> {
    const recent = this.recentFor(scope);
    return this.windows.map((window, i) => this.score(window, recent[i]));
  }
  /** The candidate evidence for one exact source key. */
  sourceScores(key: string): Array<{ window: number; n: number; pf: number | null }> {
    const state = this.sourceStates.get(key);
    return this.windows.map((window, i) => this.score(window, state?.recent[i]));
  }
  private chooseSource(key: string) {
    const state = this.sourceStates.get(key)!;
    const scores = this.sourceScores(key);
    let best = -1;
    for (let i = 0; i < scores.length; i++)
      if (scores[i].pf !== null && scores[i].pf! > 1 && (best < 0 || scores[i].pf! > scores[best].pf!)) best = i;
    state.cur = best >= 0 ? best : this.initial;
    // Keep gathering causal candidate observations while a measured losing source stops raising new volume.
    state.veto = best < 0 && scores.some((score) => score.n >= this.minSamples);
  }
  private choose(scope: string) {
    const sc = this.scores(scope);
    if (sc.some((x) => x.pf === null)) return;
    let best = scope ? this.state(scope).cur : this.cur;
    for (let i = 0; i < sc.length; i++) if ((sc[i].pf as number) > (sc[best].pf as number)) best = i;
    if (scope) this.state(scope).cur = best;
    else { this.cur = best; this.window = this.windows[best]; }
  }
  override windowOf(key: string, maxLevel: number): number {
    return this.books[this.curForKey(key)].windowOf(key, maxLevel);
  }
  override level(key: string, maxLevel: number): number {
    if (this.recoveryUnknown(key)) return 0;
    if (this.independent && this.sourceStates.get(key)?.veto) return this.recoveryLevel(key, maxLevel);
    return Math.max(this.recoveryLevel(key, maxLevel), this.books[this.curForKey(key)].level(key, maxLevel));
  }
  override paused(key: string): boolean {
    return this.recoveryLevel(key, 12) === 0 && this.books[this.curForKey(key)].paused(key);
  }
  override sampleCount(key: string, maxLevel: number): number {
    return this.books[this.curForKey(key)].sampleCount(key, maxLevel);
  }
  override tailSum(key: string, n: number): { n: number; sum: number } {
    return this.books[this.curForKey(key)].tailSum(key, n);
  }
}

/** The Block book of a config: windowAuto → AutoBlockBook, else a fixed-window BlockBook. */
export function blockBookOf(b: BlockConfig, active = true): BlockBook {
  return b.windowAuto ? new AutoBlockBook(b, active) : new BlockBook(b.pause ?? 0, b.window ?? 1, bookOpts(b));
}
