// Signals processing: proven classic signal sources (see SIGNAL_SOURCES in the registry) processed per
// source × symbol, independently of the engine's bot × indication combos.
//   combos     every enabled source × range (short / medium) × signal lane, entered on the source's own onsets
//   active     the best N signals (source × lane × symbol) by their Base results; only those trade
//   configs    each signal: 15 Normal (medium–high targets × stop ratios) and 15 Trailing (medium–high targets
//              × trail widths, with wider stops); expressed on the 15m reference and scaled per lane
//   guard      every config runs independently per symbol and direction; a config set (source × type × symbol ×
//              direction, each of its configs on its own) is disabled while the average of its last N (8) closed
//              results is negative (judged on every candidate, causal) and re-enabled once it is positive again
import type { Protect } from "./domain/types.ts";
import { atrProtect } from "./sim/backtest.ts";
import { isSignalInd, laneInd, signalSourceOf } from "./indications/registry.ts";
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
  for (const src of SIGNAL_SOURCES) {
    if (sig.sources[src.name] === false) continue;
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
 * The active signals (pair × symbol, at least `minTrades` Base trades on that symbol), the best `count`:
 * drawdown ranking (default) = profitable and positive in ≥ minBlockShare of its 4-hour blocks, by net ÷ max
 * drawdown; net ranking = by net then PF. Keys "bot|ind|sym".
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
          }
        >
      | string;
  }>,
  sig: SignalSettings,
): Set<string> {
  type St = {
    n: number;
    net: number;
    pf: number;
    dd?: number;
    okShare?: number;
    recentN?: number;
    recentNet?: number;
  };
  // automatic validation: the most recent part of the history must be positive too (when measured)
  const recentOk = (st: St) =>
    sig.validate === false ||
    st.recentN === undefined ||
    (st.recentN > 0 && (st.recentNet ?? 0) > 0);
  const rank = sig.rank ?? "drawdown";
  const byDd = rank === "drawdown" || rank === "lowdd";
  const rows: Array<{ key: string; score: number; pf: number }> = [];
  for (const r of runs) {
    if (!r.ind.includes("sig-")) continue;
    const by = typeof r.bySym === "string" ? (JSON.parse(r.bySym) as Record<string, St>) : r.bySym;
    for (const [sym, st] of Object.entries(by ?? {})) {
      if (st.n < sig.minTrades || !recentOk(st)) continue;
      if (byDd) {
        // drawdown-aware: profitable, positive in enough 4-hour blocks, ranked by net ÷ max drawdown
        if (!(st.net > 0) || (st.okShare ?? 0) < (sig.minBlockShare ?? 0)) continue;
        const dd = Math.max(st.dd ?? 0, 0.5);
        // low drawdown: recovered its worst drawdown at least once, ranked by net ÷ drawdown²
        if (rank === "lowdd" && st.net < dd) continue;
        rows.push({
          key: `${r.bot}|${r.ind}|${sym}`,
          score: rank === "lowdd" ? st.net / (dd * dd) : st.net / dd,
          pf: st.pf,
        });
      } else rows.push({ key: `${r.bot}|${r.ind}|${sym}`, score: st.net, pf: st.pf });
    }
  }
  rows.sort((a, b) => b.score - a.score || b.pf - a.pf || (a.key < b.key ? -1 : 1));
  // signals.count 0 = no cap: every validated signal unit is active (operator: process freely, many orders)
  return new Set((sig.count > 0 ? rows.slice(0, sig.count) : rows).map((x) => x.key));
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
}

/**
 * The acceptance record from the signal tapes: every candidate of every signal config closed so far, per acceptance
 * group (source × symbol × direction × type), in exit order with running gains / losses. It is the record the group
 * has at any time t (closes at or before t), independent of which signals the run held active and of where the run
 * started — fed only by the run's own active candidates, a group had no closes at the start of every run (nothing was
 * accepted for its first hours) and never the closes of its lanes / ranges that were not active.
 */
/** the pooled acceptance group of every signal candidate on one side (direction acceptance) */
export function sideAcceptKey(side: number): string {
  return side > 0 ? "side|1" : "side|-1";
}

export class SignalAcceptIndex {
  private groups = new Map<string, { t: Float64Array; gp: Float64Array; gl: Float64Array }>();
  constructor(tapes: readonly AcceptTape[] = []) {
    for (const _ of this.fill(tapes));
  }
  /**
   * Fills the record from the tapes in slices (yields about every 100k closes: a large book holds millions of signal
   * closes, built in one piece it held the event loop for seconds). Two passes over the tape columns, no per-close
   * objects.
   */
  *fill(tapes: readonly AcceptTape[]): Generator<number, void> {
    const SLICE = 100_000;
    let work = 0;
    const keysOf = (tp: AcceptTape) => {
      const keys: Array<string | undefined> = [];
      return (i: number) => {
        const slot = tp.symI[i] * 2 + (tp.side[i] > 0 ? 1 : 0);
        return (keys[slot] ??= acceptKey(tp.ind, tp.syms[tp.symI[i]], tp.side[i], tp.kind));
      };
    };
    const sigTapes = tapes.filter((tp) => isSignalInd(tp.ind));
    const count = new Map<string, number>();
    const LONG = sideAcceptKey(1);
    const SHORT = sideAcceptKey(-1);
    for (const tp of sigTapes) {
      const key = keysOf(tp);
      for (let i = 0; i < tp.n; i++) {
        const k = key(i);
        count.set(k, (count.get(k) ?? 0) + 1);
        // every close also enters its side's pooled group
        const sk = tp.side[i] > 0 ? LONG : SHORT;
        count.set(sk, (count.get(sk) ?? 0) + 1);
      }
      if ((work += tp.n) >= SLICE) yield (work = 0);
    }
    const cols = new Map<string, { t: Float64Array; r: Float64Array; n: number }>();
    for (const [k, n] of count) cols.set(k, { t: new Float64Array(n), r: new Float64Array(n), n: 0 });
    for (const tp of sigTapes) {
      const key = keysOf(tp);
      for (let i = 0; i < tp.n; i++) {
        const c = cols.get(key(i))!;
        c.t[c.n] = tp.exitT[i];
        c.r[c.n++] = tp.r[i];
        const s = cols.get(tp.side[i] > 0 ? LONG : SHORT)!;
        s.t[s.n] = tp.exitT[i];
        s.r[s.n++] = tp.r[i];
      }
      if ((work += tp.n) >= SLICE) yield (work = 0);
    }
    for (const [k, c] of cols) {
      const order = Array.from({ length: c.n }, (_, i) => i).sort((a, b) => c.t[a] - c.t[b]);
      const t = new Float64Array(c.n);
      const gp = new Float64Array(c.n + 1);
      const gl = new Float64Array(c.n + 1);
      for (let j = 0; j < c.n; j++) {
        const i = order[j];
        const r = c.r[i];
        t[j] = c.t[i];
        gp[j + 1] = gp[j] + (r > 0 ? r : 0);
        gl[j + 1] = gl[j] + (r > 0 ? 0 : -r);
      }
      this.groups.set(k, { t, gp, gl });
      if ((work += c.n * 4) >= SLICE) yield (work = 0);
    }
  }
  /** profit factor and count of the group's closes in (t − hours, t] */
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
    return { n: b - a, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
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
  if (ex && ex.stats(key, t, o.hours).n >= o.minTrades) return acceptOnWindow((h) => ex.stats(key, t, h), o);
  return sim();
}

/** the type family a direction group pools: Normal + Trailing ("base"), DCA (both kinds), Axis */
export const sideFamilyOf = (kind: string) => (kind === "axis" ? "axis" : kind.startsWith("dca") ? "dca" : "base");
/** the engine direction group of a tape and side: type family × range × side */
export function engineSideKey(kind: string, tag: string | undefined, side: number): string {
  return `${sideFamilyOf(kind)}|${tag ?? "wide"}|${side > 0 ? 1 : -1}`;
}

/**
 * The engine direction record: every engine candidate (executed or not) per type family × range × side, in hourly
 * buckets with running sums. A group is judged on the hours that closed before the entry (a close inside the entry's
 * own hour is never seen: causal by construction). Memory: one bucket per group and hour, not per close.
 */
export class EngineSideIndex {
  private groups = new Map<string, { h: Float64Array; gp: Float64Array; gl: Float64Array; n: Float64Array }>();
  /** the exchange's own closes (live): they judge a group once they number minTrades in its window */
  exchange: ExchangeAccept | null = null;
  *fill(tapes: readonly SideTape[]): Generator<number, void> {
    const acc = new Map<string, Map<number, [number, number, number]>>();
    let work = 0;
    for (const tp of tapes) {
      if (isSignalInd(tp.ind)) continue;
      const keys = [engineSideKey(tp.kind, tp.protect.tag, -1), engineSideKey(tp.kind, tp.protect.tag, 1)];
      for (let i = 0; i < tp.n; i++) {
        const k = keys[tp.side[i] > 0 ? 1 : 0];
        let g = acc.get(k);
        if (!g) acc.set(k, (g = new Map()));
        const h = Math.floor(tp.exitT[i] / HOUR_MS);
        let b = g.get(h);
        if (!b) g.set(h, (b = [0, 0, 0]));
        const r = tp.r[i];
        if (r > 0) b[0] += r;
        else b[1] -= r;
        b[2]++;
      }
      if ((work += tp.n) >= 200_000) yield (work = 0);
    }
    for (const [k, g] of acc) {
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
  /** the shared acceptance rule (`acceptOnWindow`) on this group's hours before t */
  accepts(key: string, t: number, o: { minPf: number; hours: number; minTrades: number }): boolean {
    return acceptPreferExchange(this.exchange, key, t, o, () => acceptOnWindow((h) => this.stats(key, t, h), o));
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
  private accepted = new Map<string, Array<{ t: number; r: number }>>();
  /** every closed signal candidate in exit order (loss-cluster guard) */
  private closed: Array<{ t: number; r: number }> = [];
  add(key: string, r: number, exitT?: number) {
    if (exitT !== undefined) {
      this.closed.push({ t: exitT, r });
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
  /** a closed candidate enters its acceptance group */
  addAccept(key: string, r: number, exitT: number) {
    if (this.acceptIndex) return;
    const l = this.accepted.get(key);
    if (l) {
      l.push({ t: exitT, r });
      // trimmed by time, never by count: a busy group passed 1000 closes inside a 336 h acceptance window
      if (l.length > 2000) trimBefore(l, exitT - ACCEPT_KEEP_MS);
    } else this.accepted.set(key, [{ t: exitT, r }]);
  }
  /** profit factor of the group's closes in (t − hours, t] and their count (t only sees what closed before it) */
  acceptStats(key: string, t: number, hours: number): { n: number; pf: number } {
    if (this.acceptIndex) return this.acceptIndex.stats(key, t, hours);
    const l = this.accepted.get(key);
    if (!l) return { n: 0, pf: 0 };
    const from = t - hours * 3_600_000;
    let n = 0;
    let gp = 0;
    let gl = 0;
    for (let i = l.length - 1; i >= 0; i--) {
      const x = l[i];
      if (x.t > t) continue;
      if (x.t <= from) break;
      n++;
      if (x.r > 0) gp += x.r;
      else gl -= x.r;
    }
    return { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
  }
  /** the shared acceptance rule (`acceptOnWindow`) on this group's closes before t */
  accepts(key: string, t: number, a: SignalAccept): boolean {
    return acceptPreferExchange(this.exchange, key, t, a, () => acceptOnWindow((h) => this.acceptStats(key, t, h), a));
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
   * `t` lost together — at least `minLosses` losing closes, a loss share ≥ `lossShare` and a negative sum. The
   * pause ends by itself when those losses age out of the window. Stateless in time (only closes before `t`
   * count), so the simulation, the paper book, the live step and the audit replay decide alike. Candidates keep
   * being computed and fed while paused (the internal calculations never stop).
   */
  clustered(t: number, c: SignalClusterSettings): boolean {
    if (!c.enabled) return false;
    const from = t - c.windowMin * 60_000;
    let n = 0;
    let losses = 0;
    let sum = 0;
    for (let i = this.closed.length - 1; i >= 0; i--) {
      const x = this.closed[i];
      if (x.t > t) continue;
      if (x.t <= from) break;
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
 * The symbols (indexes into `syms`) a signal tape is seated on: those its pair is active on. The walk-forward gates a
 * signal per pair × symbol (`bot|ind|sym`), so a report that keyed the active set by the pair alone counted every
 * symbol's closes of an active pair as seated (840 "seated" signal configs at PF 72 next to a book without one
 * signal order).
 */
export function signalSeatSymbols(
  tp: { bot: string; ind: string; syms: readonly string[] },
  active: ReadonlySet<string>,
): Set<number> {
  const pair = `${tp.bot}|${tp.ind}|`;
  const out = new Set<number>();
  tp.syms.forEach((s, i) => {
    if (active.has(pair + s)) out.add(i);
  });
  return out;
}
