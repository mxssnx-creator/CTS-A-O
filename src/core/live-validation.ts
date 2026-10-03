// Live validation: every config is judged on its own last N closes since the desk went live (computed causally on
// the live bars as they arrive — the same closes the paper book executes, and the ones it skipped), not on the
// simulated pre-history alone. A config with fewer live closes trades on its simulated validation; one with N or
// more opens new entries only while those N hold PF ≥ the live minimum. It keeps being computed either way, so a
// paused config comes back as soon as its live closes recover. Optionally (live.liveGroupLastN, off by default), until a
// config has its own N its live group (range or signals) decides on the group's pooled last closes (liveGroupGates).
import type { ConfigTape } from "./sim/walkforward.ts";
import { profitFactor } from "./metrics/stats.ts";
import { isSignalInd } from "./indications/registry.ts";
import { RANGE_LABEL, rangeOfId } from "./minimal-coord.ts";

export interface LiveGate {
  ok: boolean;
  /** live closes considered (at most N) */
  n: number;
  /** PF over them (null below N: not judged yet) */
  pf: number | null;
}

/** First index with exitT >= t (exitT ascending). */
function lowerBound(xs: Float64Array, t: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The config's last `n` closes in [since, now] and whether they clear `minPf`. */
export function liveGate(
  tp: Pick<ConfigTape, "exitT" | "gp" | "gl">,
  since: number,
  now: number,
  n: number,
  minPf: number,
): LiveGate {
  if (!(n > 0)) return { ok: true, n: 0, pf: null };
  const a = lowerBound(tp.exitT, since);
  const b = lowerBound(tp.exitT, now + 1);
  const k = b - a;
  if (k < n) return { ok: true, n: Math.max(0, k), pf: null };
  const from = b - n;
  const pf = profitFactor(tp.gp[b] - tp.gp[from], tp.gl[b] - tp.gl[from]);
  return { ok: pf >= minPf, n, pf };
}

/**
 * The live group of a config: signals apart, every engine config by its target range (Micro … Long, Wide = no range
 * tag) — the categories the desk reports its forward results in.
 */
export function liveGroupOf(cfg: string): string {
  return isSignalInd(cfg.split("|")[1] ?? "") ? "Signals" : RANGE_LABEL[rangeOfId(cfg)];
}

/**
 * Group gates: per live group, its last `n` closes pooled over the given configs (by exit time, in [since, now]) and
 * whether they clear `minPf`. A config gets far fewer closes than its group (x01: ~150–2,900 closes per group in
 * 10 h, while no config reached 25), so the group is judged long before its configs are: a range that loses live
 * stops opening new entries while one that earns keeps trading. Below `n` pooled closes a group is not judged.
 */
export function liveGroupGates(
  tapes: Iterable<Pick<ConfigTape, "id" | "exitT" | "gp" | "gl">>,
  since: number,
  now: number,
  n: number,
  minPf: number,
): Map<string, LiveGate> {
  const out = new Map<string, LiveGate>();
  if (!(n > 0)) return out;
  // each config contributes at most its own last n closes (the group's last n are among them)
  const per = new Map<string, { t: number[]; p: number[]; l: number[] }>();
  for (const tp of tapes) {
    const a = lowerBound(tp.exitT, since);
    const b = lowerBound(tp.exitT, now + 1);
    if (b <= a) continue;
    const g = liveGroupOf(tp.id);
    let acc = per.get(g);
    if (!acc) per.set(g, (acc = { t: [], p: [], l: [] }));
    for (let i = Math.max(a, b - n); i < b; i++) {
      acc.t.push(tp.exitT[i]);
      acc.p.push(tp.gp[i + 1] - tp.gp[i]);
      acc.l.push(tp.gl[i + 1] - tp.gl[i]);
    }
  }
  for (const [g, acc] of per) {
    const k = acc.t.length;
    if (k < n) {
      out.set(g, { ok: true, n: k, pf: null });
      continue;
    }
    // the n latest: every close after the n-th latest exit time, then closes at that time until n
    const sorted = Float64Array.from(acc.t).sort();
    const cut = sorted[k - n];
    let gp = 0;
    let gl = 0;
    let c = 0;
    for (let i = 0; i < k; i++)
      if (acc.t[i] > cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        c++;
      }
    for (let i = 0; i < k && c < n; i++)
      if (acc.t[i] === cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        c++;
      }
    const pf = profitFactor(gp, gl);
    out.set(g, { ok: pf >= minPf, n, pf });
  }
  return out;
}

/**
 * Whether a config may open a new entry: its own last N decide once it has them (a config that earns live trades
 * even in a losing group, one that loses is paused even in an earning group); before that its group's last N decide;
 * neither judged yet: its simulated validation alone (always ok here).
 */
export function liveEntryOk(own: LiveGate, group: LiveGate | undefined): boolean {
  if (own.pf !== null) return own.ok;
  if (group && group.pf !== null) return group.ok;
  return true;
}

export interface LiveGroupStatus {
  group: string;
  /** pooled live closes considered (at most the group N) */
  n: number;
  pf: number | null;
  ok: boolean;
}

export interface LiveValidationStatus {
  lastN: number;
  minPf: number;
  since: number;
  /** configs with at least N live closes */
  judged: number;
  passing: number;
  /** configs paused by their live closes */
  paused: number;
  /** new entries skipped this step */
  skipped: number;
  /** group last N (0 = off) and each group's verdict */
  groupLastN?: number;
  groups?: LiveGroupStatus[];
}
