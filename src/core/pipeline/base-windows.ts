// Two-window Base (Gates.baseWindows): a pair's Base cell judged on windows of its lane's own Base history as well as
// on the whole of it. Base keeps a pair on one window (the whole causal history) and its PF there has no forward rank;
// consistency over two windows is a different property — it drops a cell whose edge came in one stretch. Causal: the
// windows lie in [the lane's first bar, the Base cut), the cut being the stage universe's nowT (the run start under
// causalBase). `report` rules only read; the `gate` rule fails the cell in passesBase.
import type { BaseWindowRule, BaseWindowsResult, Gates } from "../domain/types.ts";
import { profitFactor } from "../metrics/stats.ts";

const H = 3_600_000;

/** One rule with its defaults, kept within the bounds checkSettings enforces (a desk patch is taken as asked). */
export interface BaseWindowJudge {
  /** equal time blocks (0 = none) and how many of them must pass */
  split: number;
  need: number;
  /** the recent window, ms before the cut (0 = none), widened to twice that with fewer than minN closes */
  recentMs: number;
  widen: boolean;
  minPf: number;
  minN: number;
  /** the tags judged ("wide" = the default cell); null = every one */
  ranges: ReadonlySet<string> | null;
}

/** Gates.baseWindows resolved for one Base stage: the gate (null = none) and the report rules in their order. */
export interface BaseWindowsPlan {
  gate: BaseWindowJudge | null;
  report: BaseWindowJudge[];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** The report rules a Base stage computes (checkSettings refuses more). */
export const BASE_WINDOWS_REPORT_MAX = 8;

/** A rule with its defaults: split / recentH absent or 0 = that window is not used (a rule using neither passes). */
export function baseWindowJudge(r: BaseWindowRule, floor: number): BaseWindowJudge {
  const split = r.split ? clamp(Math.round(r.split), 2, 6) : 0;
  return {
    split,
    need: split ? clamp(Math.round(r.need ?? split), 1, split) : 0,
    recentMs: r.recentH ? clamp(r.recentH, 1, 336) * H : 0,
    widen: r.widen === true,
    minPf: clamp(r.minPf ?? floor, 0.5, 3),
    minN: clamp(Math.round(r.minN ?? 3), 1, 100),
    ranges: r.ranges?.length ? new Set(r.ranges) : null,
  };
}

/**
 * The plan of a Base stage, or null while Gates.baseWindows is unset (or holds no rule): nothing is then computed.
 * A window's default PF floor is the Base floor (gates.baseSetsMinPf, the PF a pair's sets are built from), else 1.
 */
export function baseWindowsPlan(g: Gates | undefined): BaseWindowsPlan | null {
  const bw = g?.baseWindows;
  if (!bw || (!bw.gate && !bw.report?.length)) return null;
  const floor = g.baseSetsMinPf ?? 1;
  const j = bw.gate ? baseWindowJudge(bw.gate, floor) : null;
  // a gate judging no window gates nothing
  const gate = j && (j.split || j.recentMs) ? j : null;
  // (every report rule keeps its index: the readers name rule k by its place in the settings; at most 8)
  const report = (bw.report ?? [])
    .slice(0, BASE_WINDOWS_REPORT_MAX)
    .map((r) => baseWindowJudge(r, floor));
  return gate || report.length ? { gate, report } : null;
}

/** One window passes: too few closes to judge, or PF ≥ the floor with a positive net (dropped under PF 1, as passesBase). */
const windowOk = (j: BaseWindowJudge, n: number, gp: number, gl: number, net: number) =>
  n < j.minN || (profitFactor(gp, gl) >= j.minPf && (net > 0 || j.minPf < 1));

/** Whether a cell's closes (exit order: exit times and returns) pass one rule over [fromT, nowT). */
export function passesWindows(
  j: BaseWindowJudge,
  fromT: number,
  nowT: number,
  n: number,
  exitT: ArrayLike<number>,
  r: ArrayLike<number>,
): boolean {
  if (j.split) {
    const span = nowT - fromT;
    const bn = new Array<number>(j.split).fill(0);
    const gp = new Array<number>(j.split).fill(0);
    const gl = new Array<number>(j.split).fill(0);
    const net = new Array<number>(j.split).fill(0);
    if (span > 0)
      for (let i = 0; i < n; i++) {
        // a close at the cut (or before the first bar) counts in the last (first) block
        const b = clamp(Math.floor(((exitT[i] - fromT) / span) * j.split), 0, j.split - 1);
        const x = r[i];
        bn[b]++;
        if (x > 0) gp[b] += x;
        else gl[b] -= x;
        net[b] += x;
      }
    let ok = 0;
    for (let b = 0; b < j.split; b++) if (windowOk(j, bn[b], gp[b], gl[b], net[b])) ok++;
    if (ok < j.need) return false;
  }
  if (j.recentMs) {
    const a1 = nowT - j.recentMs;
    const a2 = nowT - 2 * j.recentMs;
    let n1 = 0;
    let gp1 = 0;
    let gl1 = 0;
    let net1 = 0;
    let n2 = 0;
    let gp2 = 0;
    let gl2 = 0;
    let net2 = 0;
    for (let i = 0; i < n; i++) {
      const t = exitT[i];
      const x = r[i];
      if (t >= a1) {
        n1++;
        if (x > 0) gp1 += x;
        else gl1 -= x;
        net1 += x;
      }
      if (j.widen && t >= a2) {
        n2++;
        if (x > 0) gp2 += x;
        else gl2 -= x;
        net2 += x;
      }
    }
    if (
      !(j.widen && n1 < j.minN ? windowOk(j, n2, gp2, gl2, net2) : windowOk(j, n1, gp1, gl1, net1))
    )
      return false;
  }
  return true;
}

/**
 * A Base cell against the plan: the gate's verdict when the gate judges its tag ("" = the default cell, "wide"), each
 * report rule's (a rule that does not judge the tag passes it). Undefined when neither applies.
 */
export function judgeBaseWindows(
  plan: BaseWindowsPlan,
  tag: string,
  fromT: number,
  nowT: number,
  n: number,
  exitT: ArrayLike<number>,
  r: ArrayLike<number>,
): BaseWindowsResult | undefined {
  const name = tag || "wide";
  const judges = (j: BaseWindowJudge) => !j.ranges || j.ranges.has(name);
  const out: BaseWindowsResult = {};
  if (plan.gate && judges(plan.gate)) out.gate = passesWindows(plan.gate, fromT, nowT, n, exitT, r);
  if (plan.report.length)
    out.report = plan.report.map((j) => !judges(j) || passesWindows(j, fromT, nowT, n, exitT, r));
  return out.gate === undefined && !out.report ? undefined : out;
}
