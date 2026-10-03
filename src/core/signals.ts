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
import { laneInd, signalSourceOf } from "./indications/registry.ts";
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
  return new Set(rows.slice(0, sig.count).map((x) => x.key));
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
    const l = this.accepted.get(key);
    if (l) {
      l.push({ t: exitT, r });
      // trimmed by time, never by count: a busy group passed 1000 closes inside a 336 h acceptance window
      if (l.length > 2000) trimBefore(l, exitT - ACCEPT_KEEP_MS);
    } else this.accepted.set(key, [{ t: exitT, r }]);
  }
  /** profit factor of the group's closes in (t − hours, t] and their count (t only sees what closed before it) */
  acceptStats(key: string, t: number, hours: number): { n: number; pf: number } {
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
  /** true when the group has enough closes and a profit factor of at least the minimum */
  accepts(key: string, t: number, a: SignalAccept): boolean {
    const s = this.acceptStats(key, t, a.hours);
    return s.n >= a.minTrades && s.pf >= a.minPf;
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
