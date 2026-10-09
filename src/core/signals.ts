// Signals processing: proven classic signal sources (see SIGNAL_SOURCES in the registry) processed per
// source × symbol, independently of the engine's bot × indication combos.
//   combos     every enabled source × range (short / medium) × signal lane, entered on the source's own onsets
//   active     the best N signals (source × lane × symbol × direction) by their Base results; only those trade —
//              long and short of one signal on one symbol are ranked and activated independently
//   configs    each signal: 15 Normal (medium–high targets × stop ratios) and 15 Trailing (medium–high targets
//              × trail widths, with wider stops); expressed on the 15m reference and scaled per lane
//   guard      every config runs independently per symbol and direction; a config set (source × type × symbol ×
//              direction, each of its configs on its own) is disabled while the average of its last N (8) closed
//              results is negative (judged on every candidate, causal) and re-enabled once it is positive again
import type { Protect } from "./domain/types.ts";
import { atrProtect } from "./sim/backtest.ts";
import { isSignalInd, laneInd, signalSourceOf } from "./indications/registry.ts";
import { SIGNAL_MIN_CLOSES, SIGNAL_PF_FLOOR } from "./signal-config.ts";
import {
  SIGNAL_SOURCES,
  signalId,
  type SignalAccept,
  type SignalClusterSettings,
  type SignalSettings,
} from "./signal-config.ts";

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
  return out;
}

/**
 * The configs of every signal (15m reference; lanes scale them): percent exits = 15 Normal + 15 Trailing, ATR
 * exits (Stable-02 model) = every stop × ratio cell without trail and once per trail value — by `sig.exits`.
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
  return out;
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
 * The key of an active signal: pair × symbol × direction ("bot|ind|sym|1" long, "bot|ind|sym|-1" short). Long and
 * short of one signal on one symbol are separate units: each is ranked, activated and validated on its own record.
 * Every lookup of the active set (simulation, paper, pending entries, the live lane filter) builds its key here.
 */
export const sigActiveKey = (bot: string, ind: string, sym: string, side: number) =>
  `${bot}|${ind}|${sym}|${side > 0 ? 1 : -1}`;

/**
 * The active signals (pair × symbol × direction, at least `minTrades` Base trades on that symbol and side), the
 * best `count`: drawdown ranking (default) = profitable and positive in ≥ minBlockShare of its 4-hour blocks, by
 * net ÷ max drawdown; net ranking = by net then PF. Keys `sigActiveKey` ("bot|ind|sym|side").
 *
 * A symbol's stats carry `sides` ({"1": long, "-1": short}: Base's per-side record): each side is judged on its own.
 * Stats without `sides` (a record made before the split) are one pooled unit that activates both directions.
 */
export function activeSignals(
  runs: ReadonlyArray<{
    bot: string;
    ind: string;
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
  }>,
  sig: SignalSettings,
): Set<string> {
  type St = SignalSideStat & { sides?: Partial<Record<"1" | "-1", SignalSideStat>> };
  // automatic validation: the most recent part of the history must be positive too (when measured) — a unit without
  // a close in it is never activated. (At least one close PER CONFIG — the step ranking's recentN is closes ÷ configs —
  // was tried on 6 Oct and left no unit active on the synthetic desk: configs hold for up to 48 h, so most units
  // average under one close per config in 24 h. That is a ranking change, not a fix: not applied.)
  const recentOk = (st: St) =>
    sig.validate === false ||
    st.recentN === undefined ||
    (st.recentN > 0 && (st.recentNet ?? 0) > 0);
  const rank = sig.rank ?? "drawdown";
  const byDd = rank === "drawdown" || rank === "lowdd";
  // one row per unit; a pooled (pre-split) record is one unit holding both directions' keys
  const rows: Array<{ key: string; keys: string[]; score: number; pf: number }> = [];
  const judge = (keys: string[], st: SignalSideStat) => {
    // judged on at least SIGNAL_MIN_CLOSES closes (9 Oct): a thinner unit is not active
    if (st.n < Math.max(sig.minTrades, SIGNAL_MIN_CLOSES) || !recentOk(st)) return;
    if (byDd) {
      // drawdown-aware: profitable, positive in enough 4-hour blocks, ranked by net ÷ max drawdown
      if (!(st.net > 0) || (st.okShare ?? 0) < (sig.minBlockShare ?? 0)) return;
      const dd = Math.max(st.dd ?? 0, 0.5);
      // low drawdown: recovered its worst drawdown at least once, ranked by net ÷ drawdown²
      if (rank === "lowdd" && st.net < dd) return;
      rows.push({ key: keys[0], keys, score: rank === "lowdd" ? st.net / (dd * dd) : st.net / dd, pf: st.pf });
    } else if (st.net > 0) {
      // rank net: a losing unit never activates (9 Oct)
      rows.push({ key: keys[0], keys, score: st.net, pf: st.pf });
    }
  };
  for (const r of runs) {
    if (!r.ind.includes("sig-")) continue;
    const by = typeof r.bySym === "string" ? (JSON.parse(r.bySym) as Record<string, St>) : r.bySym;
    for (const [sym, st] of Object.entries(by ?? {})) {
      const L = sigActiveKey(r.bot, r.ind, sym, 1);
      const S = sigActiveKey(r.bot, r.ind, sym, -1);
      if (st.sides) {
        if (st.sides["1"]) judge([L], st.sides["1"]);
        if (st.sides["-1"]) judge([S], st.sides["-1"]);
      } else judge([L, S], st);
    }
  }
  rows.sort((a, b) => b.score - a.score || b.pf - a.pf || (a.key < b.key ? -1 : 1));
  // signals.count 0 = no cap: every validated signal unit is active (operator: process freely, many orders)
  return new Set((sig.count > 0 ? rows.slice(0, sig.count) : rows).flatMap((x) => x.keys));
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
 * each of a signal's 15 Normal and 15 Trailing configs is judged independently per symbol and direction.
 */
export const guardKey = (cfg: string, sym: string, side: number, kind: string) =>
  `${cfg}|${sym}|${side > 0 ? 1 : -1}|${kind === "trailing" ? "trailing" : "normal"}`;

/** Closed results per guard key, causal (filled as candidates close); the average of the last N decides. */
/**
 * Acceptance group: one source (every lane, range and config) on one symbol, direction and type. Judged by its
 * profit factor over the last hours (SignalAccept).
 */
export const acceptKey = (ind: string, sym: string, side: number, kind: string) =>
  `${signalSourceOf(ind)}|${sym}|${side > 0 ? 1 : -1}|${kind}`;

/** The tape columns the acceptance record reads (a ConfigTape has them). */
export interface AcceptTape {
  ind: string;
  kind: string;
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
 * group (source × symbol × direction × type), in exit order with running gains / losses. It is the record the group
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
export function sideAcceptKey(side: number): string {
  return side > 0 ? "side|1" : "side|-1";
}
/** a direction acceptance group (judged on the fed closes of the run's active candidates, never the tape record) */
export const isSideAcceptKey = (k: string) => k === "side|1" || k === "side|-1";

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

export class SignalAcceptIndex {
  private groups = new Map<string, { t: Float64Array; gp: Float64Array; gl: Float64Array; cn: Float64Array }>();
  constructor(tapes: readonly AcceptTape[] = []) {
    for (const _ of this.fill(tapes));
  }
  /**
   * Fills the record from the tapes in slices (yields about every 100k closes: a large book holds millions of signal
   * closes, built in one piece it held the event loop for seconds). Two passes over the tape columns, no per-close
   * objects.
   */
  *fill(tapes: readonly AcceptTape[]): Generator<number, void> {
    // time-boxed: a yield every ~8 ms of work (a count of closes left 1–2.6 s slices on x02, 7 Oct profile)
    const clock = sliceClock();
    const keysOf = (tp: AcceptTape) => {
      const keys: Array<string | undefined> = [];
      return (i: number) => {
        const slot = tp.symI[i] * 2 + (tp.side[i] > 0 ? 1 : 0);
        return (keys[slot] ??= acceptKey(tp.ind, tp.syms[tp.symI[i]], tp.side[i], tp.kind));
      };
    };
    const sigTapes = tapes.filter((tp) => isSignalInd(tp.ind));
    const count = new Map<string, number>();
    for (const tp of sigTapes) {
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
    for (const tp of sigTapes) {
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
      const cn = new Float64Array(c.n + 1);
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
      if (clock()) yield 0;
    }
  }
  /** profit factor (every close) and count (signal entries) of the group's closes in (t − hours, t] */
  stats(key: string, t: number, hours: number): { n: number; pf: number } {
    const g = this.groups.get(key);
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
  protect: { tag?: string };
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
  /** a group with fewer closes than minTrades in twice its window: "valid" (engine groups) or "refused" (signals, 9 Oct) */
  thin: Thin = "valid",
): boolean {
  const s = stats(o.hours);
  if (s.n >= o.minTrades) return s.pf >= o.minPf;
  const w = stats(o.hours * 2);
  return thin === "valid" ? w.n < o.minTrades || w.pf >= o.minPf : w.n >= o.minTrades && w.pf >= o.minPf;
}

/** What a group with too few closes is: valid (the engine's rule, 6 Oct) or refused (a signal set, unjudged, 9 Oct). */
export type Thin = "valid" | "refused";

/**
 * The floors of a signal's acceptance (9 Oct, operator): a signal group is judged on at least SIGNAL_MIN_CLOSES closes and
 * its PF is never below 1. No setting lowers either. The engine's groups keep their own options.
 */
export function signalAcceptFloors<T extends { minPf: number; minTrades: number }>(o: T): T {
  return { ...o, minTrades: Math.max(o.minTrades, SIGNAL_MIN_CLOSES), minPf: Math.max(SIGNAL_PF_FLOOR, o.minPf) };
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
  thin: Thin = "valid",
): boolean {
  if (ex && ex.stats(key, t, o.hours).n >= o.minTrades) return acceptOnWindow((h) => ex.stats(key, t, h), o, thin);
  return sim();
}

/** the type family a direction group pools: Normal + Trailing ("base"), DCA (both kinds), Axis */
export const sideFamilyOf = (kind: string) => (kind === "axis" ? "axis" : kind.startsWith("dca") ? "dca" : "base");
/** the engine direction group of a tape and side: type family × range × side */
export function engineSideKey(kind: string, tag: string | undefined, side: number, ind?: string): string {
  return `${sideFamilyOf(kind)}|${tag ?? "wide"}|${side > 0 ? 1 : -1}${ind ? `|${ind}` : ""}`;
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
): string {
  return engineSideKey(kind, tag, side, perInd?.includes(tag ?? "wide") ? ind : undefined);
}

/**
 * The engine direction record: every engine candidate (executed or not) per type family × range × side, in hourly
 * buckets with running sums. A group is judged on the hours that closed before the entry (a close inside the entry's
 * own hour is never seen: causal by construction). Memory: one bucket per group and hour, not per close.
 */
export class EngineSideIndex {
  private groups = new Map<string, { h: Float64Array; gp: Float64Array; gl: Float64Array; n: Float64Array }>();
  // (the index is shared — cached per tape set, by the simulation and the live step alike — so it never holds the
  // exchange record itself: the live step's guard passes it per call)
  *fill(tapes: readonly SideTape[]): Generator<number, void> {
    const acc = new Map<string, Map<number, [number, number, number]>>();
    const clock = sliceClock();
    for (const tp of tapes) {
      if (isSignalInd(tp.ind)) continue;
      // every candidate enters its range group and its indication's group (engineSideAccept.perInd picks)
      const keys = [-1, 1].map((sd) => [
        engineSideKey(tp.kind, tp.protect.tag, sd),
        engineSideKey(tp.kind, tp.protect.tag, sd, tp.ind),
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
      const x = { h: new Float64Array(m), gp: new Float64Array(m + 1), gl: new Float64Array(m + 1), n: new Float64Array(m + 1) };
      for (let j = 0; j < m; j++) {
        const b = g.get(hs[j])!;
        x.h[j] = hs[j];
        x.gp[j + 1] = x.gp[j] + b[0];
        x.gl[j + 1] = x.gl[j] + b[1];
        x.n[j + 1] = x.n[j] + b[2];
      }
      this.groups.set(k, x);
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
    return acceptPreferExchange(exchange, key, t, o, () => acceptOnWindow((h) => this.stats(key, t, h), o));
  }
}

/** the longest windows the guard may judge (settings-check: accept.hours ≤ 336, cluster.windowMin ≤ 720) */
const ACCEPT_KEEP_MS = 336 * 3_600_000;
/** the longest read the acceptance rule makes: a window of accept.hours falls back to twice its hours (≤ 2 × 336 h) */
const ACCEPT_READ_MS = 2 * ACCEPT_KEEP_MS;
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
  private acceptMemo = new Map<string, { t: number; byHours: Map<number, { n: number; pf: number }> }>();
  /**
   * every closed signal candidate in exit order with its direction (loss-cluster guard: judged per side — a cluster
   * of losing shorts never pauses the longs)
   */
  private closed: Array<{ t: number; r: number; side: number }> = [];
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
   * once, on its first close (one entry's k configs losing together are one loss, not k)
   */
  add(key: string, r: number, exitT?: number, side = 0, onset?: string) {
    if (exitT !== undefined && this.firstOnset("cluster", onset, exitT)) {
      this.closed.push({ t: exitT, r, side: side > 0 ? 1 : side < 0 ? -1 : 0 });
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
      // trimmed by time, never by count: a busy group passed 1000 closes inside a 336 h acceptance window. The keep
      // window is the fallback read (2 × hours), not the window itself: trimming at 336 h hid the closes a 2 × 200 h
      // read needs (side group, past 2000 entries)
      if (l.length > 2000) trimBefore(l, exitT - ACCEPT_READ_MS);
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
  /**
   * The shared acceptance rule (`acceptOnWindow`) on this group's closes before t, with the signal floors: a group with
   * fewer than SIGNAL_MIN_CLOSES closes is unjudged and refused (9 Oct)
   */
  accepts(key: string, t: number, a: SignalAccept): boolean {
    const f = signalAcceptFloors(a);
    return acceptPreferExchange(
      this.exchange,
      key,
      t,
      f,
      () => acceptOnWindow((h) => this.acceptStats(key, t, h), f, "refused"),
      "refused",
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
  clustered(t: number, c: SignalClusterSettings, side = 0): boolean {
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
 * The symbols (indexes into `syms`) a signal tape is seated on for one direction: those whose unit (pair × symbol ×
 * side, `sigActiveKey`) is active. The walk-forward gates a signal per pair × symbol × direction, so a report that
 * keyed the active set by the pair alone counted every symbol's closes of an active pair as seated (840 "seated"
 * signal configs at PF 72 next to a book without one signal order). The key carries the side, as every active key does.
 */
export function signalSeatSymbols(
  tp: { bot: string; ind: string; syms: readonly string[] },
  active: ReadonlySet<string>,
  side: number,
): Set<number> {
  const out = new Set<number>();
  tp.syms.forEach((s, i) => {
    if (active.has(sigActiveKey(tp.bot, tp.ind, s, side))) out.add(i);
  });
  return out;
}
