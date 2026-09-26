// Prehistoric (pre-realtime) result statistics: what the complete computation produced before realtime starts.
import type { Trade } from "./domain/types.ts";
import { profitFactor, statsOf } from "./metrics/stats.ts";

export interface PrehistStats {
  pf: number;
  ddtH: number;
  n: number;
  wr: number;
  greenHours: number;
  net: number;
  /** time-weighted average number of positions open (processing) over the run */
  avgOpen: number;
  maxOpen: number;
  perSymbol: Array<{ sym: string; n: number; pf: number; net: number }>;
}

export function prehistStats(trades: readonly Trade[], startT: number, endT: number): PrehistStats {
  const sorted = [...trades].sort((a, b) => a.exitT - b.exitT);
  const st = statsOf(sorted);
  const span = Math.max(1, endT - startT);
  let openTime = 0;
  const ev: Array<[number, number]> = [];
  for (const t of sorted) {
    const a = Math.max(startT, t.entryT);
    const b = Math.min(endT, t.exitT);
    if (b > a) openTime += b - a;
    ev.push([t.entryT, 1], [t.exitT, -1]);
  }
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0;
  let maxOpen = 0;
  for (const [, d] of ev) {
    cur += d;
    if (cur > maxOpen) maxOpen = cur;
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
  return {
    pf: st.pf,
    ddtH: st.ddt,
    n: st.n,
    wr: st.wr,
    greenHours: st.gh,
    net: st.net,
    avgOpen: openTime / span,
    maxOpen,
    perSymbol: [...bySym.entries()]
      .map(([sym, e]) => ({ sym, n: e.n, pf: profitFactor(e.gp, e.gl), net: e.net }))
      .sort((a, b) => b.n - a.n),
  };
}
