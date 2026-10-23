// Signals processing: proven classic signal sources (see SIGNAL_SOURCES in the registry) processed per
// source × symbol, independently of the engine's bot × indication combos.
//   combos     every enabled source × range (short / medium) × signal lane, entered on the source's own onsets
//   active     the best N configs (full source indication × protect × type × symbol × direction); causal records rank
//              each config context independently, while Base-only discovery records have no config evidence
//   configs    each signal: 42 Normal, 35 target-capped Trailing and 9 independent Trailing only sets by default;
//              every stop × trailing range is expressed on the 15m reference and scaled per lane
//   guard      every config runs independently per symbol and direction; a config set (source × type × symbol ×
//              direction, each of its configs on its own) is disabled while the average of its last N (8) closed
//              results is negative (judged on the closes of the units active at their step: an inactive unit's candidates
//              never reach the feed) and re-enabled once it is positive again
import type { ExitConfigSet, Protect } from "./domain/types.ts";
import { atrProtect } from "./sim/backtest.ts";
import { isSignalInd, laneInd } from "./indications/registry.ts";
import { SIGNAL_MIN_PF } from "./signal-policy.ts";
import {
  SIGNAL_SOURCES,
  signalId,
  type SignalAccept,
  type SignalClusterSettings,
  type SignalSettings,
} from "./signal-config.ts";
import {
  isSignalCoordinationInd,
  SIGNAL_COORDINATION_RATIOS,
  signalCoordinationId,
} from "./signal-coordination.ts";

export {
  DEFAULT_SIGNALS,
  mergeSignals,
  SIGNAL_COUNT_CHOICES,
  signalSettings,
  type SignalSettings,
} from "./signal-config.ts";

/** Every signal combo to score in Base (bot "follow": the source's own onsets). */
export function signalCombos(
  sig: SignalSettings,
  engineTfs: readonly number[],
): Array<{ bot: "follow"; ind: string }> {
  if (!sig.enabled) return [];
  const lanes = sig.lanes.filter((tf) => engineTfs.includes(tf));
  const out: Array<{ bot: "follow"; ind: string }> = [];
  // "deny" (default): a source runs unless it is set false; "allow": only the sources set true run
  const allow = sig.sourcesMode === "allow";
  for (const src of SIGNAL_SOURCES) {
    if (allow ? sig.sources[src.name] !== true : sig.sources[src.name] === false) continue;
    for (const range of ["short", "medium"] as const) {
      if (!sig.ranges[range]) continue;
      for (const tf of lanes)
        out.push({ bot: "follow", ind: laneInd(signalId(src.name, range), tf) });
    }
  }
  const coord = sig.coordination;
  if (coord.enabled) {
    const sources = SIGNAL_SOURCES.filter((src) =>
      allow ? sig.sources[src.name] === true : sig.sources[src.name] !== false,
    ).map((src) => src.name);
    if (sources.length >= coord.minSources) {
      const inputs: Array<{ mask: 1 | 2 | 3; short: boolean; medium: boolean }> = [];
      if (sig.ranges.short) inputs.push({ mask: 1, short: true, medium: false });
      if (sig.ranges.medium) inputs.push({ mask: 2, short: false, medium: true });
      if (sig.ranges.short && sig.ranges.medium)
        inputs.push({ mask: 3, short: true, medium: true });
      for (const input of inputs) {
        for (const ratio of SIGNAL_COORDINATION_RATIOS) {
          const id = signalCoordinationId(sources, ratio, coord.minSources, input.mask);
          for (const tf of lanes) out.push({ bot: "follow", ind: laneInd(id, tf) });
        }
      }
    }
  }
  return out;
}

/**
 * The configs of every signal (15m reference; lanes scale them): percent exits = 42 Normal + 35 capped Trailing,
 * ATR exits = every stop × target-ratio cell without trail and once per trail value, by `sig.exits`.
 * Enabled Trailing only sets add every independent hard-stop × peak-trail cell, without any target.
 */
export function signalProtects(sig: SignalSettings): Protect[] {
  const hold = Math.max(2, Math.round((sig.holdH * 60) / 15));
  const out: Protect[] = [];
  const exits = sig.exits ?? "pct";
  if (exits !== "atr") {
    for (const tp of sig.normal.tp)
      for (const k of sig.normal.slOfTp) out.push({ tp, sl: +(tp * k).toFixed(4), trail: 0, hold });
    for (const tp of sig.trailing.tp)
      for (const t of sig.trailing.trailOfTp)
        out.push({
          tp,
          sl: +(tp * sig.trailing.slOfTp).toFixed(4),
          trail: +(tp * t).toFixed(4),
          hold,
        });
  }
  if (exits !== "pct" && sig.atr) {
    const a = sig.atr;
    const h = a.holdBars > 0 ? Math.max(2, Math.round(a.holdBars)) : hold;
    for (const sl of a.sl)
      for (const tpRatio of a.tpRatio) {
        out.push(atrProtect({ sl, tpRatio }, h));
        for (const trail of a.trail) out.push(atrProtect({ sl, tpRatio, trail }, h));
      }
  }
  const only = sig.trailingOnly;
  if (only?.enabled)
    for (const sl of only.sl)
      for (const trail of only.trail)
        out.push({ tp: 0, sl, trail, hold, trailOnly: true, trailStep: only.trailStep });
  // A short trail is an inactive configuration, not a tighter distance that should be silently widened later.
  // The tape builder repeats this check after lane scaling because fast lanes can shrink a valid reference trail.
  const ratios = sig.trailRatios?.length ? [...new Set(sig.trailRatios)] : [1];
  const variants = out.flatMap((p) => p.trail > 0
    ? ratios.map((ratio) => ratio === 1 ? p : { ...p, trailStep: (p.trailStep ?? 1) * ratio })
    : [p]);
  return variants.map((p) => sig.trailMax === undefined ? p : { ...p, trailMax: sig.trailMax }).filter(
    (p) => !(p.trail > 0 && p.trail * (p.trailStep ?? 1) + 1e-12 < sig.minTrail),
  );
}

/** Signal pairs ("bot|ind") with at least `minTrades` Base trades on some symbol: the candidates to rank. */
export function signalCandidates(
  runs: ReadonlyArray<{ bot: string; ind: string; bySym: Record<string, { n: number }> | string }>,
  minTrades: number,
): Set<string> {
  const out = new Set<string>();
  for (const r of runs) {
    if (!r.ind.includes("sig-")) continue;
    const by =
      typeof r.bySym === "string"
        ? (JSON.parse(r.bySym) as Record<string, { n: number }>)
        : r.bySym;
    if (Object.values(by ?? {}).some((x) => x.n >= minTrades)) out.add(`${r.bot}|${r.ind}`);
  }
  return out;
}

/**
 * Discovery is calculation eligibility, not qualification. With the representative Base gate off, every configured
 * initialized pair computes its own protection histories; a sparse/unrelated default protect cannot veto them.
 * The caller's initializer/family filter and all later type/config PF, sample and execution gates remain in force.
 */
export function signalEvaluationPairs<
  R extends {
    bot: string;
    ind: string;
    bySym: Record<string, { n: number }> | string;
  },
>(
  configured: ReadonlyArray<{ bot: string; ind: string }>,
  runs: readonly R[],
  sig: Pick<SignalSettings, "enabled" | "baseGate" | "minTrades">,
  representativePass: (run: R) => boolean,
): Set<string> {
  if (!sig.enabled) return new Set();
  const initialized = new Set(
    configured.filter((c) => isSignalInd(c.ind)).map((c) => `${c.bot}|${c.ind}`),
  );
  if (sig.baseGate === false) return initialized;
  return new Set(
    [...signalCandidates(runs.filter(representativePass), sig.minTrades)].filter((pair) =>
      initialized.has(pair),
    ),
  );
}

/**
 * Active qualification: full pair × protect × symbol × direction × strategy type. Base/discovery records omit
 * config evidence; causal ranking and hedge records include the exact cfg suffix. Every context uses its own closes.
 * Every lookup of the active set (simulation, paper, pending entries, the live lane filter) builds its key here.
 */
export const sigActiveKey = (
  bot: string,
  ind: string,
  sym: string,
  side: number,
  kind?: string,
  cfg?: string,
) =>
  `${bot}|${ind}|${sym}|${side > 0 ? 1 : -1}${kind ? `|${kind}` : ""}${cfg ? `|cfg=${encodeURIComponent(cfg)}` : ""}`;

/** Exact qualification; production callers always supply cfg and never fall back to broad discovery keys. */
export function signalActiveHas(
  active: { has(key: string): boolean } & Partial<Iterable<string>>,
  bot: string,
  ind: string,
  sym: string,
  side: number,
  kind: string,
  cfg: string,
): boolean {
  // Base/discovery keys establish that a pair was calculated. They contain no
  // strategy-type result and cannot authorize an unmeasured recovered type.
  // A malformed recovered direction must not normalize into a valid short key.
  return (
    (side === 1 || side === -1) &&
    typeof kind === "string" &&
    kind.trim().length > 0 &&
    typeof cfg === "string" &&
    cfg.trim().length > 0 &&
    active.has(sigActiveKey(bot, ind, sym, side, kind, cfg))
  );
}

/**
 * The active signals (pair × protect × type × symbol × direction, at least `minTrades` own closes), the
 * best `count`: drawdown ranking (default) = profitable and positive in ≥ minBlockShare of its 4-hour blocks, by
 * net ÷ max drawdown; net ranking = by net then PF. Causal keys `sigActiveKey` ("bot|ind|sym|side|kind").
 *
 * A symbol's stats carry `sides` ({"1": long, "-1": short}: Base's per-side record): each side is judged on its own.
 * Stats without `sides` (a record made before the split) are one pooled unit that activates both directions.
 */
type ActiveSignalRun = {
  bot: string;
  ind: string;
  /** Absent only on Base/discovery records, before strategy tapes exist. */
  kind?: string;
  /** Exact protection identity, present on causal config qualification records. */
  cfg?: string;
  bySym:
    | Record<
        string,
        {
          n: number;
          net: number;
          pf: number;
          dd?: number;
          okShare?: number;
          recentN?: number;
          recentNet?: number;
          sides?: Partial<Record<"1" | "-1", SignalSideStat>>;
        }
      >
    | string;
};

export function activeSignals(
  runs: Iterable<ActiveSignalRun | null>,
  sig: SignalSettings,
  /** optional collector: one row per judged unit with the first test it failed (decisions are unchanged) */
  report?: SignalUnitReport[],
): Set<string> {
  const gen = activeSignalsGen(runs, sig, report);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** Time-sliced form used by the runtime's causal per-hour ranking. Null rows are bounded-work checkpoints. */
export function* activeSignalsGen(
  runs: Iterable<ActiveSignalRun | null>,
  sig: SignalSettings,
  /** optional collector: one row per judged unit with the first test it failed (decisions are unchanged) */
  report?: SignalUnitReport[],
): Generator<number, Set<string>> {
  type St = SignalSideStat & { sides?: Partial<Record<"1" | "-1", SignalSideStat>> };
  // The latest validation window must have positive own-config results when measured. No empty sibling protect
  // can divide this context's count; discovery/status records without recent fields retain their existing meaning.
  const recentOk = (st: St) =>
    sig.validate === false ||
    st.recentN === undefined ||
    (st.recentN > 0 && (st.recentNet ?? 0) > 0);
  const rank = sig.rank ?? "drawdown";
  const byDd = rank === "drawdown" || rank === "lowdd";
  // one row per unit; a pooled (pre-split) record is one unit holding both directions' keys
  const rows: Array<{
    key: string;
    keys: string[];
    score: number;
    pf: number;
    side: 1 | -1 | 0;
    st: SignalSideStat;
    coordination: boolean;
  }> = [];
  const note = (keys: string[], side: 1 | -1 | 0, st: SignalSideStat, reason: SignalFail) =>
    report?.push({
      key: keys[0],
      side,
      reason,
      n: st.n,
      net: st.net,
      dd: st.dd ?? 0,
      okShare: st.okShare ?? 0,
      recentN: st.recentN,
      recentNet: st.recentNet,
    });
  const judge = (keys: string[], st: SignalSideStat, side: 1 | -1 | 0, coordination: boolean) => {
    if (st.n < sig.minTrades) return void note(keys, side, st, "minTrades");
    if (!recentOk(st)) return void note(keys, side, st, "recent");
    if (!Number.isFinite(st.pf) || st.pf < SIGNAL_MIN_PF || !(st.net > 0)) return void note(keys, side, st, "net");
    if (byDd) {
      // drawdown-aware: profitable, positive in enough 4-hour blocks, ranked by net ÷ max drawdown
      if (!(st.net > 0)) return void note(keys, side, st, "net");
      if ((st.okShare ?? 0) < (sig.minBlockShare ?? 0)) return void note(keys, side, st, "block");
      const dd = Math.max(st.dd ?? 0, 0.5);
      // low drawdown: recovered its worst drawdown at least once, ranked by net ÷ drawdown²
      if (rank === "lowdd" && st.net < dd) return void note(keys, side, st, "lowdd");
      rows.push({
        key: keys[0],
        keys,
        score: rank === "lowdd" ? st.net / (dd * dd) : st.net / dd,
        pf: st.pf,
        side,
        st,
        coordination,
      });
    } else rows.push({ key: keys[0], keys, score: st.net, pf: st.pf, side, st, coordination });
  };
  let visited = 0;
  for (const r of runs) {
    if (!r) {
      yield -1;
      continue;
    }
    if (!r.ind.includes("sig-")) continue;
    const by = typeof r.bySym === "string" ? (JSON.parse(r.bySym) as Record<string, St>) : r.bySym;
    const coordination = isSignalCoordinationInd(r.ind);
    for (const [sym, st] of Object.entries(by ?? {})) {
      const L = sigActiveKey(r.bot, r.ind, sym, 1, r.kind, r.cfg);
      const S = sigActiveKey(r.bot, r.ind, sym, -1, r.kind, r.cfg);
      if (st.sides) {
        if (st.sides["1"]) judge([L], st.sides["1"], 1, coordination);
        if (st.sides["-1"]) judge([S], st.sides["-1"], -1, coordination);
      } else judge([L, S], st, 0, coordination);
    }
    if (++visited % 8 === 0) yield -1;
  }
  const sort = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    b.score - a.score || b.pf - a.pf || (a.key < b.key ? -1 : 1);
  const classic = rows.filter((x) => !x.coordination).sort(sort);
  const coordinated = rows.filter((x) => x.coordination).sort(sort);
  // Each family has a distinct active-unit cap, in both the initial ranking and the causal hourly ranking.
  // signals.count 0 = no cap: every validated signal unit is active (operator: process freely, many orders)
  const kept = [
    ...(sig.count > 0 ? classic.slice(0, sig.count) : classic),
    ...(sig.coordination.count > 0 ? coordinated.slice(0, sig.coordination.count) : coordinated),
  ];
  if (report) {
    const keptKeys = new Set(kept.map((x) => x.key));
    for (const x of [...classic, ...coordinated])
      note(x.keys, x.side, x.st, keptKeys.has(x.key) ? "active" : "cap");
  }
  return new Set(kept.flatMap((x) => x.keys));
}

/** The first test a signal unit failed in activeSignals ("active" = it is in the set, "cap" = ranked out by signals.count). */
export type SignalFail = "minTrades" | "recent" | "net" | "block" | "lowdd" | "cap" | "active";

/** One judged unit: its key, direction (0 = a pooled record that holds both), the verdict and the numbers it was judged on. */
export interface SignalUnitReport {
  key: string;
  side: 1 | -1 | 0;
  reason: SignalFail;
  n: number;
  net: number;
  dd: number;
  okShare: number;
  recentN?: number;
  recentNet?: number;
}

/** The compact end-of-run activation report: counts per direction and reason, and the long units with the most net. */
export interface SignalActivationEnd {
  counts: ReturnType<typeof summarizeActivation>;
  /** the ten long units with the highest net, with the test each failed (or "active") */
  topLong: SignalUnitReport[];
}

export function activationEnd(report: readonly SignalUnitReport[]): SignalActivationEnd {
  const topLong = report
    .filter((u) => u.side === 1)
    .sort((a, b) => b.net - a.net || (a.key < b.key ? -1 : 1))
    .slice(0, 10);
  return { counts: summarizeActivation(report), topLong };
}

/** Per direction: how many units are active and how many failed each test (the status block of the activation report). */
export function summarizeActivation(report: readonly SignalUnitReport[]) {
  const out: Record<"long" | "short" | "pooled", Record<SignalFail, number>> = {
    long: { minTrades: 0, recent: 0, net: 0, block: 0, lowdd: 0, cap: 0, active: 0 },
    short: { minTrades: 0, recent: 0, net: 0, block: 0, lowdd: 0, cap: 0, active: 0 },
    pooled: { minTrades: 0, recent: 0, net: 0, block: 0, lowdd: 0, cap: 0, active: 0 },
  };
  for (const u of report) out[u.side === 1 ? "long" : u.side === -1 ? "short" : "pooled"][u.reason]++;
  return out;
}

/** One unit's ranking record (a symbol's pooled stats, or one direction of them). */
export interface SignalSideStat {
  n: number;
  net: number;
  pf: number;
  dd?: number;
  okShare?: number;
  recentN?: number;
  recentNet?: number;
}

/**
 * Guard key: one config (source × range × lane × protect, which fixes the type) on one symbol and direction —
 * each capped or Trailing only config is judged independently per symbol and direction.
 */
export const guardKey = (cfg: string, sym: string, side: number, kind: string) =>
  `${cfg}|${sym}|${side > 0 ? 1 : -1}|${kind}`;

/** Closed results per guard key, causal (filled as candidates close); the average of the last N decides. */
/**
 * Acceptance group: one exact config (source, parameter range, lane, protection and type) on one symbol/direction.
 * Production passes cfg; unqualified broad keys are retained only for explicit pooled diagnostics.
 */
export const acceptKey = (ind: string, sym: string, side: number, kind: string, cfg?: string) =>
  `${ind}|${sym}|${side > 0 ? 1 : -1}|${kind}${cfg ? `|cfg=${encodeURIComponent(cfg)}` : ""}`;

/** The tape columns the acceptance record reads (a ConfigTape has them). */
export interface AcceptTape {
  /** Present on production config tapes; absent only on explicitly pooled diagnostic fixtures. */
  id?: string;
  ind: string;
  kind: string;
  /** Recovered config kept only for an existing position; it supplies no new-entry qualification. */
  heldOnly?: boolean;
  n: number;
  syms: readonly string[];
  symI: ArrayLike<number>;
  side: ArrayLike<number>;
  exitT: ArrayLike<number>;
  r: ArrayLike<number>;
  /** entry times: the k configs of one signal entry share it and count once (without it every close counts) */
  entryT?: ArrayLike<number>;
}

/**
 * The acceptance record from the signal tapes: every candidate of every signal config closed so far, per acceptance
 * group (full config × symbol × direction × type), in exit order with running gains / losses. It is the record the group
 * has at any time t (closes at or before t), independent of which signals the run held active and of where the run
 * started — fed only by the run's own active candidates, a group had no closes at the start of every run (nothing was
 * accepted for its first hours) and never the closes of its lanes / ranges that were not active.
 *
 * The count a group is judged on is its signal ENTRIES (lane indication × entry time inside the group): the k configs
 * of one entry close k times, and counted per close one onset alone reached the minimum (6 / 20) of the acceptance.
 * The profit factor stays over every close. The direction groups (sideAcceptKey) are NOT in this record: they pool
 * the run's active candidates only, fed to the guard as they close.
 */
/** the pooled acceptance group of every signal candidate on one side (direction acceptance) */
export function sideAcceptKey(side: number, coordination = false): string {
  const prefix = coordination ? "coord-side" : "side";
  return side > 0 ? `${prefix}|1` : `${prefix}|-1`;
}
/** a direction acceptance group (judged on the fed closes of the run's active candidates, never the tape record) */
export const isSideAcceptKey = (k: string) => /^(?:coord-)?side\|(?:1|-1)$/.test(k);

/** True once ~8 ms of work passed since the last true (then it starts over): where a filling generator yields. */
function sliceClock(ms = 8): () => boolean {
  let t0 = performance.now();
  return () => {
    const now = performance.now();
    if (now - t0 < ms) return false;
    t0 = now;
    return true;
  };
}

type AcceptColumns = { t: Float64Array; gp: Float64Array; gl: Float64Array; cn: Int32Array };
type AcceptSymbols = { syms: string[]; slots: Uint32Array };
type LazyAcceptSource = { tp: AcceptTape; counts: Int32Array; symbols: AcceptSymbols };
const acceptSymbolsCache = new WeakMap<readonly string[], AcceptSymbols>();
function acceptanceSymbols(input: readonly string[]): AcceptSymbols {
  const hit = acceptSymbolsCache.get(input);
  if (hit) return hit;
  const unique = new Map<string, number>(), syms: string[] = [], slots = new Uint32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let slot = unique.get(input[i]);
    if (slot === undefined) { slot = syms.length; unique.set(input[i], slot); syms.push(input[i]); }
    slots[i] = slot;
  }
  const value = { syms, slots };
  acceptSymbolsCache.set(input, value);
  return value;
}
// These bound derived caches, never evidence. Evicted groups are reconstructed from immutable original columns.
const ACCEPT_CACHE_GROUPS = 4096;
const ACCEPT_CACHE_BYTES = 32 * 1024 * 1024;

export class SignalAcceptIndex {
  /** Share immutable group columns, replacing only changed groups in the next published generation. */
  fork(): SignalAcceptIndex {
    const next = new SignalAcceptIndex([], this.lazy);
    next.groups = new Map(this.groups);
    next.sources = new Map(this.sources);
    // Each generation has its own LRU. Immutable tape columns are shared; old qualification remains unchanged.
    return next;
  }
  private groups = new Map<string, AcceptColumns>();
  private sources = new Map<string, LazyAcceptSource>();
  private cached = new Map<string, { source: LazyAcceptSource; columns: AcceptColumns; bytes: number }>();
  private cachedBytes = 0;
  private lazy: boolean;
  constructor(tapes: readonly AcceptTape[] = [], lazy = false) {
    this.lazy = lazy;
    for (const _ of this.fill(tapes));
  }
  /**
   * Fills the record in time-bounded slices. A unique exact config's exit-sorted tape already contains every
   * symbol/direction group in order, so it writes final prefixes directly. Pooled, duplicate or unordered inputs
   * retain the generic stable sort and onset de-duplication below.
   */
  *fill(tapes: readonly AcceptTape[]): Generator<number, void> {
    this.cached.clear();
    this.cachedBytes = 0;
    // time-boxed: a yield every ~8 ms of work (a count of closes left 1–2.6 s slices on x02, 7 Oct profile)
    const clock = sliceClock();
    const keysOf = (tp: AcceptTape) => {
      const keys: Array<string | undefined> = [];
      return (i: number) => {
        const slot = tp.symI[i] * 2 + (tp.side[i] > 0 ? 1 : 0);
        return (keys[slot] ??= acceptKey(tp.ind, tp.syms[tp.symI[i]], tp.side[i], tp.kind, tp.id));
      };
    };
    const sigTapes = tapes.filter((tp) => isSignalInd(tp.ind) && !tp.heldOnly);
    const identities = new Map<string, number>();
    let identified = 0;
    for (const tp of sigTapes) {
      if (tp.id?.trim()) {
        // Config IDs already own their full source/lane/type identity. Reuse their immutable strings.
        const key = tp.id;
        identities.set(key, (identities.get(key) ?? 0) + 1);
      }
      if ((++identified & 1023) === 0 && clock()) yield 0;
    }
    const fallback: AcceptTape[] = [];
    for (const tp of sigTapes) {
      if (
        !tp.id?.trim() ||
        identities.get(tp.id) !== 1
      ) {
        fallback.push(tp);
        continue;
      }
      // Runtime universes repeat each symbol once per lane. Coalesce dictionary aliases while retaining
      // every close in its original order; aliases must not force the entire large catalog into generic expansion.
      const symbols = acceptanceSymbols(tp.syms);
      const counts = new Int32Array(symbols.syms.length * 2);
      const slots: number[] = [];
      let ordered = true;
      let previous = -Infinity;
      for (let i = 0; i < tp.n; i++) {
        const sym = tp.symI[i];
        const t = tp.exitT[i];
        if (
          !Number.isInteger(sym) ||
          sym < 0 ||
          sym >= tp.syms.length ||
          !Number.isFinite(t) ||
          t < previous
        ) {
          ordered = false;
          break;
        }
        previous = t;
        const slot = symbols.slots[sym] * 2 + (tp.side[i] > 0 ? 1 : 0);
        if (counts[slot]++ === 0) slots.push(slot);
        if ((i & 8191) === 8191 && clock()) yield 0;
      }
      if (!ordered) {
        fallback.push(tp);
        continue;
      }
      if (this.lazy) {
        this.sources.set(tp.id, { tp, counts, symbols });
        if (clock()) yield 0;
        continue;
      }
      const cols: Array<
        | {
            t: Float64Array;
            gp: Float64Array;
            gl: Float64Array;
            cn: Int32Array;
            next: number;
            seen: Set<number> | null;
          }
        | undefined
      > = new Array(counts.length);
      for (const slot of slots) {
        const n = counts[slot];
        cols[slot] = {
          t: new Float64Array(n),
          gp: new Float64Array(n + 1),
          gl: new Float64Array(n + 1),
          cn: new Int32Array(n + 1),
          next: 0,
          seen: tp.entryT ? new Set() : null,
        };
      }
      for (let i = 0; i < tp.n; i++) {
        const x = cols[symbols.slots[tp.symI[i]] * 2 + (tp.side[i] > 0 ? 1 : 0)]!;
        const j = x.next++;
        const r = +tp.r[i];
        x.t[j] = tp.exitT[i];
        x.gp[j + 1] = x.gp[j] + (r > 0 ? r : 0);
        x.gl[j + 1] = x.gl[j] + (r > 0 ? 0 : -r);
        const entry = tp.entryT ? +tp.entryT[i] : 0;
        const first = !x.seen?.has(entry);
        x.seen?.add(entry);
        x.cn[j + 1] = x.cn[j] + (first ? 1 : 0);
        if ((i & 8191) === 8191 && clock()) yield 0;
      }
      for (const slot of slots) {
        const { t, gp, gl, cn } = cols[slot]!;
        this.groups.set(acceptKey(tp.ind, symbols.syms[slot >> 1], slot % 2 ? 1 : -1, tp.kind, tp.id), {
          t,
          gp,
          gl,
          cn,
        });
      }
      if (clock()) yield 0;
    }
    const count = new Map<string, number>();
    for (const tp of fallback) {
      // A refreshed duplicate/unordered identity must use the complete generic record, not a stale lazy source.
      if (tp.id) this.sources.delete(tp.id);
      const key = keysOf(tp);
      for (let i = 0; i < tp.n; i++) {
        const k = key(i);
        count.set(k, (count.get(k) ?? 0) + 1);
      }
      if (clock()) yield 0;
    }
    // per close: exit, result, entry time and the lane indication (its index in `inds`; −1 = no entry time known)
    const inds = new Map<string, number>();
    const cols = new Map<
      string,
      { t: Float64Array; r: Float64Array; e: Float64Array; ii: Int32Array; n: number }
    >();
    for (const [k, n] of count)
      cols.set(k, {
        t: new Float64Array(n),
        r: new Float64Array(n),
        e: new Float64Array(n),
        ii: new Int32Array(n),
        n: 0,
      });
    for (const tp of fallback) {
      const key = keysOf(tp);
      let ix = inds.get(tp.ind);
      if (ix === undefined) inds.set(tp.ind, (ix = inds.size));
      const et = tp.entryT;
      for (let i = 0; i < tp.n; i++) {
        const c = cols.get(key(i))!;
        c.t[c.n] = tp.exitT[i];
        c.r[c.n] = tp.r[i];
        c.e[c.n] = et ? et[i] : 0;
        c.ii[c.n++] = et ? ix : -1;
      }
      if (clock()) yield 0;
    }
    for (const [k, c] of cols) {
      // (a typed index order: stable as the array sort was, without a boxed array per group)
      const order = new Uint32Array(c.n);
      for (let i = 0; i < c.n; i++) order[i] = i;
      order.sort((a, b) => c.t[a] - c.t[b]);
      const t = new Float64Array(c.n);
      const gp = new Float64Array(c.n + 1);
      const gl = new Float64Array(c.n + 1);
      // (counts: integers, 4 B each)
      const cn = new Int32Array(c.n + 1);
      // an entry counts at its first close (causal: the later closes of its other configs add no count); keyed by
      // its lane indication and entry time as numbers (a string per close before)
      const seen = new Map<number, Set<number>>();
      for (let j = 0; j < c.n; j++) {
        const i = order[j];
        const r = c.r[i];
        t[j] = c.t[i];
        gp[j + 1] = gp[j] + (r > 0 ? r : 0);
        gl[j + 1] = gl[j] + (r > 0 ? 0 : -r);
        let first = true;
        if (c.ii[i] >= 0) {
          let es = seen.get(c.ii[i]);
          if (!es) seen.set(c.ii[i], (es = new Set()));
          if (es.has(c.e[i])) first = false;
          else es.add(c.e[i]);
        }
        cn[j + 1] = cn[j] + (first ? 1 : 0);
      }
      this.groups.set(k, { t, gp, gl, cn });
      // the group's scratch columns are done with: released now, not with the whole set at the end (60 B a close)
      cols.delete(k);
      if (clock()) yield 0;
    }
  }
  /** Materialize only a requested exact context, preserving original addition order and onset de-duplication. */
  private context(key: string): AcceptColumns | undefined {
    const hit = this.cached.get(key);
    if (hit) {
      this.cached.delete(key);
      this.cached.set(key, hit);
      return hit.columns;
    }
    const at = key.lastIndexOf("|cfg=");
    if (at < 0) return this.groups.get(key);
    const parts = key.slice(0, at).split("|");
    const kind = parts.pop()!, side = Number(parts.pop()), sym = parts.pop()!, ind = parts.join("|");
    let id: string;
    try { id = decodeURIComponent(key.slice(at + 5)); } catch { return this.groups.get(key); }
    const source = this.sources.get(id);
    if (!source || source.tp.ind !== ind || source.tp.kind !== kind) return this.groups.get(key);
    const { tp, counts, symbols } = source;
    const symI = symbols.syms.indexOf(sym), slot = symI * 2 + (side > 0 ? 1 : 0);
    const n = symI < 0 || (side !== 1 && side !== -1) ? 0 : counts[slot];
    if (!n) return undefined;
    const columns: AcceptColumns = {
      t: new Float64Array(n), gp: new Float64Array(n + 1), gl: new Float64Array(n + 1), cn: new Int32Array(n + 1),
    };
    const seen = tp.entryT ? new Set<number>() : null;
    let j = 0;
    for (let i = 0; i < tp.n; i++) {
      if (symbols.slots[tp.symI[i]] !== symI || (tp.side[i] > 0 ? 1 : -1) !== side) continue;
      const r = +tp.r[i], entry = tp.entryT ? +tp.entryT[i] : 0;
      columns.t[j] = tp.exitT[i];
      columns.gp[j + 1] = columns.gp[j] + (r > 0 ? r : 0);
      columns.gl[j + 1] = columns.gl[j] + (r > 0 ? 0 : -r);
      columns.cn[j + 1] = columns.cn[j] + (seen?.has(entry) ? 0 : 1);
      seen?.add(entry);
      j++;
    }
    const bytes = columns.t.byteLength + columns.gp.byteLength + columns.gl.byteLength + columns.cn.byteLength;
    while (this.cached.size && (this.cached.size >= ACCEPT_CACHE_GROUPS || this.cachedBytes + bytes > ACCEPT_CACHE_BYTES)) {
      const first = this.cached.keys().next().value!;
      this.cachedBytes -= this.cached.get(first)!.bytes;
      this.cached.delete(first);
    }
    if (bytes <= ACCEPT_CACHE_BYTES) {
      this.cached.set(key, { source, columns, bytes });
      this.cachedBytes += bytes;
    }
    return columns;
  }
  /** profit factor (every close) and count (signal entries) of the group's closes in (t − hours, t] */
  stats(key: string, t: number, hours: number): { n: number; pf: number } {
    const g = this.lazy ? this.context(key) : this.groups.get(key);
    if (!g) return { n: 0, pf: 0 };
    // first index with exit > x
    const above = (x: number) => {
      let lo = 0;
      let hi = g.t.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (g.t[m] <= x) lo = m + 1;
        else hi = m;
      }
      return lo;
    };
    const a = above(t - hours * 3_600_000);
    const b = above(t);
    if (b <= a) return { n: 0, pf: 0 };
    const gp = g.gp[b] - g.gp[a];
    const gl = g.gl[b] - g.gl[a];
    return { n: g.cn[b] - g.cn[a], pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
  }
}

/** a tape whose closes feed the engine direction record (type family × range × side) */
export interface SideTape {
  ind: string;
  kind: string;
  n: number;
  protect: { tag?: string; exitSet?: ExitConfigSet };
  side: ArrayLike<number>;
  exitT: ArrayLike<number>;
  r: ArrayLike<number>;
}

const HOUR_MS = 3_600_000;

/**
 * The acceptance rule every hour-window validation shares (signals, signal directions, engine directions). A window
 * with at least `minTrades` closes is judged on its own: PF >= `minPf`. A window with fewer is widened to twice its
 * hours; when that still has fewer than `minTrades`, there is no sample to judge and the group counts as VALID —
 * otherwise it is judged on the wider window (operator, 6 Oct: "if last hours x2 are less than min count for
 * validation, calc as valid"). Before, a sparse signal group was refused until it had built a sample, while an engine
 * group in the same position was let through at once; both now follow this one rule.
 */
export function acceptOnWindow(
  stats: (hours: number) => { n: number; pf: number },
  o: { minPf: number; hours: number; minTrades: number },
): boolean {
  const s = stats(o.hours);
  if (s.n >= o.minTrades) return s.pf >= o.minPf;
  const w = stats(o.hours * 2);
  return w.n < o.minTrades || w.pf >= o.minPf;
}

/**
 * The desk's own exchange closes, keyed like the acceptance groups (live-record.ts `exchangeAcceptIndex`): a group
 * with `minTrades` exchange closes in its window is judged on them, with fewer on the simulated candidates.
 */
export interface ExchangeAccept {
  stats(key: string, t: number, hours: number): { n: number; pf: number };
}

/** The acceptance rule on the exchange record once it holds enough closes in the window, else `sim`. */
export function acceptPreferExchange(
  ex: ExchangeAccept | null | undefined,
  key: string,
  t: number,
  o: { minPf: number; hours: number; minTrades: number },
  sim: () => boolean,
): boolean {
  if (ex && ex.stats(key, t, o.hours).n >= o.minTrades)
    return acceptOnWindow((h) => ex.stats(key, t, h), o);
  return sim();
}

/** direction families: Normal + Trailing ("base"), DCA, Axis, and each Historic Exit tactic independently */
export const sideFamilyOf = (kind: string, exitSet?: ExitConfigSet) =>
  kind === "exit"
    ? `exit-${exitSet ?? "legacy"}`
    : kind === "axis"
      ? "axis"
      : kind.startsWith("dca")
        ? "dca"
        : "base";
/** the engine direction group of a tape and side: type family × range × side; Exit uses its own tactic key */
export function engineSideKey(
  kind: string,
  tag: string | undefined,
  side: number,
  ind?: string,
  exitSet?: ExitConfigSet,
): string {
  const family = sideFamilyOf(kind, exitSet);
  const range = kind === "exit" ? "independent" : (tag ?? "wide");
  return `${family}|${range}|${side > 0 ? 1 : -1}${ind ? `|${ind}` : ""}`;
}
/**
 * The group an engine candidate is judged in: its type family × range × side, or — for a range listed in
 * `perInd` — that group split per indication (with its lane), so one indication's record decides for it alone.
 */
export function engineSideKeyFor(
  kind: string,
  tag: string | undefined,
  side: number,
  ind: string,
  perInd: readonly string[] | undefined,
  exitSet?: ExitConfigSet,
): string {
  return engineSideKey(
    kind,
    tag,
    side,
    kind !== "exit" && perInd?.includes(tag ?? "wide") ? ind : undefined,
    exitSet,
  );
}

/**
 * The engine direction record: every engine candidate (executed or not) per type family × range × side, in hourly
 * buckets with running sums. A group is judged on the hours that closed before the entry (a close inside the entry's
 * own hour is never seen: causal by construction). Memory: one bucket per group and hour, not per close.
 */
export class EngineSideIndex {
  fork(): EngineSideIndex {
    const next = new EngineSideIndex();
    next.groups = new Map(this.groups);
    return next;
  }
  private groups = new Map<
    string,
    { h: Float64Array; gp: Float64Array; gl: Float64Array; n: Float64Array }
  >();
  /** Extend the hourly record with strictly newer closes, retaining every earlier candidate and hour. */
  *append(tapes: readonly SideTape[]): Generator<number, void> {
    const additions = new EngineSideIndex();
    yield* additions.fill(tapes);
    for (const [key, extra] of additions.groups) {
      const old = this.groups.get(key);
      if (!old?.h.length) {
        this.groups.set(key, extra);
        continue;
      }
      const last = old.h[old.h.length - 1];
      if (extra.h[0] < last)
        throw new Error("engine acceptance append precedes its existing history");
      const overlap = Number(extra.h[0] === last);
      const n = old.h.length + extra.h.length - overlap;
      const next = {
        h: new Float64Array(n),
        gp: new Float64Array(n + 1),
        gl: new Float64Array(n + 1),
        n: new Float64Array(n + 1),
      };
      next.h.set(old.h);
      for (const col of ["gp", "gl", "n"] as const) next[col].set(old[col]);
      for (let i = 0; i < extra.h.length; i++) {
        const j = old.h.length - overlap + i;
        next.h[j] = extra.h[i];
        for (const col of ["gp", "gl", "n"] as const) {
          const before = overlap && i === 0 ? old[col][old.h.length] : next[col][j];
          next[col][j + 1] = before + extra[col][i + 1] - extra[col][i];
        }
      }
      this.groups.set(key, next);
      yield 0;
    }
  }
  // (the index is shared — cached per tape set, by the simulation and the live step alike — so it never holds the
  // exchange record itself: the live step's guard passes it per call)
  *fill(tapes: readonly SideTape[]): Generator<number, void> {
    const acc = new Map<string, Map<number, [number, number, number]>>();
    const clock = sliceClock();
    for (const tp of tapes) {
      if (isSignalInd(tp.ind)) continue;
      // every candidate enters its range group and its indication's group (engineSideAccept.perInd picks)
      const keys = [-1, 1].map((sd) => [
        engineSideKey(tp.kind, tp.protect.tag, sd, undefined, tp.protect.exitSet),
        engineSideKey(tp.kind, tp.protect.tag, sd, tp.ind, tp.protect.exitSet),
      ]);
      for (let i = 0; i < tp.n; i++) {
        const h = Math.floor(tp.exitT[i] / HOUR_MS);
        const r = tp.r[i];
        for (const k of keys[tp.side[i] > 0 ? 1 : 0]) {
          let g = acc.get(k);
          if (!g) acc.set(k, (g = new Map()));
          let b = g.get(h);
          if (!b) g.set(h, (b = [0, 0, 0]));
          if (r > 0) b[0] += r;
          else b[1] -= r;
          b[2]++;
        }
      }
      if (clock()) yield 0;
    }
    for (const [k, g] of acc) {
      if (clock()) yield 0;
      const hs = [...g.keys()].sort((a, b) => a - b);
      const m = hs.length;
      const x = {
        h: new Float64Array(m),
        gp: new Float64Array(m + 1),
        gl: new Float64Array(m + 1),
        n: new Float64Array(m + 1),
      };
      for (let j = 0; j < m; j++) {
        const b = g.get(hs[j])!;
        x.h[j] = hs[j];
        x.gp[j + 1] = x.gp[j] + b[0];
        x.gl[j + 1] = x.gl[j] + b[1];
        x.n[j + 1] = x.n[j] + b[2];
      }
      this.groups.set(k, x);
      // The prefix columns replace this group's boxed hourly buckets. Release each
      // completed group while the remaining groups are encoded, rather than doubling the whole index.
      acc.delete(k);
    }
  }
  /** PF and count of the group over the `hours` whole hours before the hour of t */
  stats(key: string, t: number, hours: number): { n: number; pf: number } {
    const g = this.groups.get(key);
    if (!g) return { n: 0, pf: 0 };
    const cur = Math.floor(t / HOUR_MS);
    const first = (x: number) => {
      let lo = 0;
      let hi = g.h.length;
      while (lo < hi) {
        const md = (lo + hi) >> 1;
        if (g.h[md] < x) lo = md + 1;
        else hi = md;
      }
      return lo;
    };
    const a = first(cur - Math.max(1, Math.round(hours)));
    const b = first(cur); // buckets before the entry's own hour
    if (b <= a) return { n: 0, pf: 0 };
    const gp = g.gp[b] - g.gp[a];
    const gl = g.gl[b] - g.gl[a];
    return { n: g.n[b] - g.n[a], pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
  }
  /**
   * A per-indication group (engineSideAccept.perInd) decides once it holds minTrades closes in twice its window
   * (simulated or on the exchange); until then its pooled range group decides — a thin group accepted by default let
   * 238 Micro shorts through at −335 % (24 h, 5–6 Oct) that the pooled group refused.
   */
  acceptsPerInd(
    key: string,
    pooled: string,
    t: number,
    o: { minPf: number; hours: number; minTrades: number },
    /** the desk's own exchange closes (live step only; the simulation passes none) */
    exchange?: ExchangeAccept | null,
  ): boolean {
    if (key === pooled) return this.accepts(key, t, o, exchange);
    const judged =
      this.stats(key, t, o.hours * 2).n >= o.minTrades ||
      (exchange?.stats(key, t, o.hours * 2).n ?? 0) >= o.minTrades;
    return this.accepts(judged ? key : pooled, t, o, exchange);
  }
  /** the shared acceptance rule (`acceptOnWindow`) on this group's hours before t (the exchange record first) */
  accepts(
    key: string,
    t: number,
    o: { minPf: number; hours: number; minTrades: number },
    exchange?: ExchangeAccept | null,
  ): boolean {
    return acceptPreferExchange(exchange, key, t, o, () =>
      acceptOnWindow((h) => this.stats(key, t, h), o),
    );
  }
}

/** the longest windows the guard may judge (settings-check: accept.hours ≤ 336, cluster.windowMin ≤ 720) */
const ACCEPT_KEEP_MS = 336 * 3_600_000;
const CLUSTER_KEEP_MS = 720 * 60_000;
/** drop the entries closed at or before `cut` (the list is in exit order) */
function trimBefore(l: Array<{ t: number }>, cut: number) {
  let k = 0;
  while (k < l.length && l[k].t <= cut) k++;
  if (k > 0) l.splice(0, k);
}

export class SignalGuard {
  /**
   * the acceptance record from the signal tapes (set by the run, the live step and the audit alike); without it the
   * groups judge on the closes fed to addAccept
   */
  acceptIndex: SignalAcceptIndex | null = null;
  /** the engine direction record (engine direction acceptance on) */
  engineSide: EngineSideIndex | null = null;
  /** the exchange's own closes (live): a signal / side acceptance group is judged on them once they number minTrades */
  exchange: ExchangeAccept | null = null;
  private lists = new Map<string, number[]>();
  /** `o`: false for a later close of an entry already counted in the group (it adds to the PF, not to the count) */
  private accepted = new Map<string, Array<{ t: number; r: number; o?: false }>>();
  /**
   * a group's acceptStats at the last time it was asked, per window: the run, the audit and the pending entries ask
   * one direction group once per signal candidate, every candidate of a bar at the same time (x02 profile, 7 Oct:
   * 5.8 s of 600 s in this scan), and nothing changes the group between those asks — the group's next close clears it
   */
  private acceptMemo = new Map<
    string,
    { t: number; byHours: Map<number, { n: number; pf: number }> }
  >();
  /**
   * every closed signal candidate in exit order with its direction (loss-cluster guard: judged per side — a cluster
   * of losing shorts never pauses the longs)
   */
  private closed: Array<{
    t: number;
    r: number;
    side: number;
    population: "signals" | "coordination";
  }> = [];
  /**
   * signal entries already counted ("group#onset" → exit of their first close): the k configs of one entry share it
   * and count once in the loss cluster and the acceptance counts. Pruned by time (an entry's configs all close within
   * its hold; two weeks is far past every hold and window).
   */
  private onsets = new Map<string, number>();
  private onsetsCap = 200_000;
  /** true the first time an entry is seen in `group` (no onset known: every close is its own) */
  private firstOnset(group: string, onset: string | undefined, exitT: number): boolean {
    if (onset === undefined) return true;
    const k = `${group}#${onset}`;
    if (this.onsets.has(k)) return false;
    this.onsets.set(k, exitT);
    if (this.onsets.size > this.onsetsCap) {
      const cut = exitT - ACCEPT_KEEP_MS;
      for (const [x, t] of this.onsets) if (t <= cut) this.onsets.delete(x);
      // the next prune once the map doubled again (a scan per add while nothing ages out would be quadratic)
      this.onsetsCap = Math.max(200_000, this.onsets.size * 2);
    }
    return true;
  }
  /**
   * `side`: the close's direction (1 / −1; 0 = unknown, then it counts only for a side-less cluster check); `onset`:
   * the signal entry it belongs to (indication × symbol × direction × entry time) — the loss cluster judges each entry
   * once, on its first close (one entry's k configs losing together are one loss, not k); `population` isolates
   * classic sources from coordination ratios.
   */
  add(
    key: string,
    r: number,
    exitT?: number,
    side = 0,
    onset?: string,
    population: "signals" | "coordination" = "signals",
  ) {
    if (exitT !== undefined && this.firstOnset(`cluster:${population}`, onset, exitT)) {
      this.closed.push({ t: exitT, r, side: side > 0 ? 1 : side < 0 ? -1 : 0, population });
      // trimmed by time, never by count: the cluster window (≤ 720 min) must always see every close inside it
      if (this.closed.length > 20_000) trimBefore(this.closed, exitT - CLUSTER_KEEP_MS);
    }
    const l = this.lists.get(key);
    if (l) {
      l.push(r);
      // keep at least the longest window a guard may judge (lastN ≤ 50)
      if (l.length > 128) l.splice(0, l.length - 64);
    } else this.lists.set(key, [r]);
  }
  /**
   * a closed candidate enters its acceptance group (`onset`: its signal entry — counted once in the group, every close
   * still in the PF). With the tape record set, only the direction groups are fed: they pool the run's active
   * candidates, never every tape.
   */
  addAccept(key: string, r: number, exitT: number, onset?: string) {
    if (this.acceptIndex && !isSideAcceptKey(key)) return;
    const x: { t: number; r: number; o?: false } = { t: exitT, r };
    if (!this.firstOnset(key, onset, exitT)) x.o = false;
    const l = this.accepted.get(key);
    if (l) {
      l.push(x);
      // trimmed by time, never by count: a busy group passed 1000 closes inside a 336 h acceptance window
      if (l.length > 2000) trimBefore(l, exitT - ACCEPT_KEEP_MS);
    } else this.accepted.set(key, [x]);
    this.acceptMemo.delete(key);
  }
  /**
   * profit factor of the group's closes in (t − hours, t] and their count in signal entries (t only sees what closed
   * before it)
   */
  acceptStats(key: string, t: number, hours: number): { n: number; pf: number } {
    if (this.acceptIndex && !isSideAcceptKey(key)) return this.acceptIndex.stats(key, t, hours);
    const l = this.accepted.get(key);
    if (!l) return { n: 0, pf: 0 };
    let m = this.acceptMemo.get(key);
    if (m && m.t === t) {
      const hit = m.byHours.get(hours);
      if (hit) return hit;
    } else this.acceptMemo.set(key, (m = { t, byHours: new Map() }));
    const from = t - hours * 3_600_000;
    let n = 0;
    let gp = 0;
    let gl = 0;
    for (let i = l.length - 1; i >= 0; i--) {
      const x = l[i];
      if (x.t > t) continue;
      if (x.t <= from) break;
      if (x.o !== false) n++;
      if (x.r > 0) gp += x.r;
      else gl -= x.r;
    }
    const res = { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
    m.byHours.set(hours, res);
    return res;
  }
  /** the shared acceptance rule (`acceptOnWindow`) on this group's closes before t */
  accepts(key: string, t: number, a: SignalAccept): boolean {
    return acceptPreferExchange(this.exchange, key, t, a, () =>
      acceptOnWindow((h) => this.acceptStats(key, t, h), a),
    );
  }
  /** true when the last n results average below zero (a set with fewer than n results is not judged) */
  disabled(key: string, n: number): boolean {
    const l = this.lists.get(key);
    if (!l || l.length < n) return false;
    let s = 0;
    for (let i = l.length - n; i < l.length; i++) s += l[i];
    return s / n < 0;
  }
  /**
   * Loss cluster: signal executions pause while the signal candidates closed in the last `windowMin` minutes before
   * `t` lost together — at least `minLosses` losing closes, a loss share ≥ `lossShare` and a negative sum (each signal
   * entry once, on its first close: the k configs of one entry are one result, not k). The
   * pause ends by itself when those losses age out of the window. With `side` (1 / −1) only that direction's closes
   * are judged and only that direction pauses (long and short run independently); without it every close counts. Stateless in time (only closes before `t`
   * count), so the simulation, the paper book, the live step and the audit replay decide alike. Candidates keep
   * being computed and fed while paused (the internal calculations never stop).
   */
  clustered(
    t: number,
    c: SignalClusterSettings,
    side = 0,
    population: "signals" | "coordination" = "signals",
  ): boolean {
    if (!c.enabled) return false;
    const from = t - c.windowMin * 60_000;
    const sd = side > 0 ? 1 : side < 0 ? -1 : 0;
    let n = 0;
    let losses = 0;
    let sum = 0;
    for (let i = this.closed.length - 1; i >= 0; i--) {
      const x = this.closed[i];
      if (x.t > t) continue;
      if (x.t <= from) break;
      if (x.population !== population) continue;
      if (sd && x.side !== sd) continue;
      n++;
      sum += x.r;
      if (x.r < 0) losses++;
    }
    return losses >= c.minLosses && sum < 0 && losses / Math.max(1, n) >= c.lossShare;
  }
  /** keys disabled right now (for status) */
  disabledKeys(n: number): string[] {
    return [...this.lists.keys()].filter((k) => this.disabled(k, n));
  }
}

/**
 * The symbols (indexes into `syms`) a signal tape is seated on: those its exact config is active on in either direction. The
 * walk-forward gates a signal per pair × type × symbol × direction (`sigActiveKey`: `bot|ind|sym|side|kind`), so a
 * report that keyed the active set by the pair alone counted every symbol's closes of an active pair as seated (840
 * "seated" signal configs at PF 72 next to a book without one signal order) — and a lookup by `bot|ind|sym` alone
 * finds none of the engine's per-side keys.
 */
export function signalSeatSymbols(
  tp: { id: string; bot: string; ind: string; kind?: string; syms: readonly string[] },
  active: ReadonlySet<string>,
): Set<number> {
  const out = new Set<number>();
  tp.syms.forEach((s, i) => {
    if (
      signalActiveHas(active, tp.bot, tp.ind, s, 1, tp.kind ?? "normal", tp.id) ||
      signalActiveHas(active, tp.bot, tp.ind, s, -1, tp.kind ?? "normal", tp.id)
    )
      out.add(i);
  });
  return out;
}
