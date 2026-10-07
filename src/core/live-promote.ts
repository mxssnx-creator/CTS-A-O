// Promotion from a demo twin to a real-money desk: an engine range reaches the target desk's exchange only once the
// reference desk (the same settings on the demo account) proved it there — its last closes on the reference's
// exchange record (live_lane_trades) clear a PF, with hysteresis (operator, 7 Oct: "adjust … until its working on
// live then put the working ones live on x01"). The decision lands in the target's live.excludeRanges, so a range
// left out keeps computing and paper-trading on the target too (and keeps its auto-adjust state); signals are not a
// range and are not managed here (live.source, the readiness check and the live validation judge them).
import { isSignalInd } from "./indications/registry.ts";
import { rangeOfId } from "./minimal-coord.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { profitFactor } from "./metrics/stats.ts";

/** The engine ranges a target desk takes from its reference ("wide" = the untagged Normal / Trailing grid). */
export const PROMOTE_RANGES = ["mc", "mn", "mp", "sh", "gn", "lg", "wide"] as const;
export type PromoteRange = (typeof PROMOTE_RANGES)[number];

/** The managed range of a config: its range tag, "wide" for the untagged grid; null for signals and ladders. */
export function promoteRangeOf(cfg: string): PromoteRange | null {
  if (isSignalInd(cfg.split("|")[1] ?? "")) return null;
  const tag = rangeOfId(cfg);
  if (tag) return tag;
  const kind = kindOfId(cfg);
  return kind === "normal" || kind === "trailing" ? "wide" : null;
}

export interface PromoteOpts {
  /** the reference's last closes per range that are judged */
  lastN: number;
  /** a range is decided only with at least this many of them */
  minN: number;
  /** on at or above this PF … */
  onPf: number;
  /** … off below this one (between the two a range keeps its state) */
  offPf: number;
}

export const DEFAULT_PROMOTE: PromoteOpts = { lastN: 30, minN: 20, onPf: 1.2, offPf: 1.0 };

/**
 * Which ranges the target sends. Every range starts off: nothing reaches the real-money desk before the reference
 * proved it on its exchange. A range goes on once its last `lastN` reference closes (at least `minN`) hold PF ≥
 * onPf, and off again below offPf.
 */
export function promoteDecide(
  prev: Readonly<Partial<Record<PromoteRange, boolean>>>,
  closes: ReadonlyArray<{ cfg: string; r: number; exitT: number }>,
  o: PromoteOpts = DEFAULT_PROMOTE,
): { on: Record<PromoteRange, boolean>; lines: string[]; changed: boolean } {
  const by = new Map<PromoteRange, Array<{ r: number; exitT: number }>>();
  for (const c of closes) {
    const k = promoteRangeOf(c.cfg);
    if (k) (by.get(k) ?? by.set(k, []).get(k)!).push(c);
  }
  const on = {} as Record<PromoteRange, boolean>;
  const lines: string[] = [];
  let changed = false;
  for (const k of PROMOTE_RANGES) {
    const was = prev[k] ?? false;
    const xs = (by.get(k) ?? []).sort((a, b) => a.exitT - b.exitT).slice(-o.lastN);
    let gp = 0;
    let gl = 0;
    for (const x of xs) {
      if (x.r > 0) gp += x.r;
      else gl -= x.r;
    }
    const pf = profitFactor(gp, gl);
    let now = was;
    if (xs.length >= o.minN && pf >= o.onPf) now = true;
    else if (xs.length >= o.minN && pf < o.offPf) now = false;
    on[k] = now;
    if (now !== was) changed = true;
    if (xs.length || now !== was)
      lines.push(
        `${k}: last ${xs.length} reference closes PF ${xs.length ? pf.toFixed(2) : "–"} → ${now ? "on" : "off"}${now !== was ? " (changed)" : ""}`,
      );
  }
  return { on, lines, changed };
}

/** The target's live settings for a decision: engine ranges as decided, signals as they are, ladders left out. */
export function promoteLive<T extends { source?: string; kinds?: readonly string[]; excludeRanges?: readonly string[] }>(
  live: T,
  on: Readonly<Record<PromoteRange, boolean>>,
): T {
  return {
    ...live,
    // engine configs can reach the exchange (their ranges decide); Axis / DCA ladders are not ranges: left out
    source: "all",
    kinds: ["normal", "trailing"],
    excludeRanges: PROMOTE_RANGES.filter((k) => !on[k]),
  };
}
