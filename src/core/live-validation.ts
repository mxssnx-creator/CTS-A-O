// Live validation: every config is judged on its own last N closes since the desk went live (computed causally on
// the live bars as they arrive — the same closes the paper book executes, and the ones it skipped), not on the
// simulated pre-history alone. A config with fewer live closes trades on its simulated validation; one with N or
// more opens new entries only while those N hold PF ≥ the live minimum. It keeps being computed either way, so a
// paused config comes back as soon as its live closes recover.
import type { ConfigTape } from "./sim/walkforward.ts";
import { profitFactor } from "./metrics/stats.ts";

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
}
