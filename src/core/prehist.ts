// Prehistoric (pre-realtime) result statistics: what the complete computation produced before realtime starts.
import type { Trade } from "./domain/types.ts";
import { profitFactor, statsOf } from "./metrics/stats.ts";
import { closedPositions, openTimeline } from "./positions.ts";

export interface PrehistStats {
  pf: number;
  ddtH: number;
  n: number;
  wr: number;
  greenHours: number;
  net: number;
  /** time-weighted average number of ORDERS open (processing) over the run (partials, every lane) */
  avgOpen: number;
  maxOpen: number;
  /** positions = symbol × direction: closed episodes, time-weighted average / peak open */
  positions: number;
  avgPositions: number;
  maxPositions: number;
  perSymbol: Array<{ sym: string; n: number; pf: number; net: number }>;
}

export function prehistStats(trades: readonly Trade[], startT: number, endT: number): PrehistStats {
  const g = prehistStatsGen(trades, startT, endT);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/**
 * prehistStats in slices: yields between its passes over the trades (a desk's run has 100k+ of them; in one piece it
 * held the event loop for up to 0.9 s on x01 at the end of every compute).
 */
export function* prehistStatsGen(
  trades: readonly Trade[],
  startT: number,
  endT: number,
): Generator<number, PrehistStats> {
  const sorted = [...trades].sort((a, b) => a.exitT - b.exitT);
  yield 0;
  const st = statsOf(sorted);
  yield 1;
  const span = Math.max(1, endT - startT);
  let openTime = 0;
  // the most orders open at once: entries and exits each sorted natively, merged with exits first at the same
  // instant (the same order as one event list sorted by time, then close before open — that list of small arrays
  // took ~0.2 s at 100k trades in one slice of the compute)
  const ins = new Float64Array(sorted.length);
  const outs = new Float64Array(sorted.length);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const a = Math.max(startT, t.entryT);
    const b = Math.min(endT, t.exitT);
    if (b > a) openTime += b - a;
    ins[i] = t.entryT;
    outs[i] = t.exitT;
  }
  ins.sort();
  outs.sort();
  yield 2;
  let cur = 0;
  let maxOpen = 0;
  for (let i = 0, j = 0; i < ins.length; ) {
    if (j < outs.length && outs[j] <= ins[i]) {
      cur--;
      j++;
    } else {
      cur++;
      i++;
      if (cur > maxOpen) maxOpen = cur;
    }
  }
  const bySym = new Map<string, { n: number; gp: number; gl: number; net: number }>();
  for (const t of sorted) {
    const e = bySym.get(t.sym) ?? { n: 0, gp: 0, gl: 0, net: 0 };
    e.n++;
    e.net += t.r * 100;
    if (t.r > 0) e.gp += t.r;
    else e.gl -= t.r;
    bySym.set(t.sym, e);
  }
  yield 3;
  const tl = openTimeline(sorted, startT, endT);
  yield 4;
  const positions = closedPositions(sorted);
  return {
    pf: st.pf,
    ddtH: st.ddt,
    n: st.n,
    wr: st.wr,
    greenHours: st.gh,
    net: st.net,
    avgOpen: openTime / span,
    maxOpen,
    positions,
    avgPositions: tl.avgPositions,
    maxPositions: tl.maxPositions,
    perSymbol: [...bySym.entries()]
      .map(([sym, e]) => ({ sym, n: e.n, pf: profitFactor(e.gp, e.gl), net: e.net }))
      .sort((a, b) => b.n - a.n),
  };
}
