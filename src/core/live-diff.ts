// Live vs system: each order as the exchange executed it (live_lane_trades, live-record.ts) next to the same order in
// the system's paper book (paper_trades). Both carry the paper position's identity (config × symbol × entry time),
// so the orders match one to one. The difference per order is what the simulation does not see — slippage, fees,
// the merged position's fills, a stop the exchange took earlier or later — and an order on one side only is one the
// exchange never held (not sent, under a cap, held back) or one the paper book has not closed yet.
import { profitFactor } from "./metrics/stats.ts";
import { isSignalInd } from "./indications/registry.ts";
import { RANGE_LABEL, rangeOfId } from "./minimal-coord.ts";

export interface DiffPaper {
  cfg: string;
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
  r: number;
}
export interface DiffLive {
  /** the paper position's identity `${cfg}|${sym}|${side}|${paper entryT}` (live-record.ts laneKeyOf) */
  id: string;
  cfg: string;
  sym: string;
  exitT: number;
  r: number;
  reason: string;
}

export interface DiffSide {
  n: number;
  pf: number;
  /** Σ r × 100 (trade %) */
  net: number;
}
export interface DiffRow {
  key: string;
  system: DiffSide;
  exchange: DiffSide;
  /** orders closed on both sides */
  matched: number;
  /** mean (exchange r − system r) × 100 over the matched orders, trade % per order */
  meanGap: number;
  /** system closes the exchange never held / exchange closes the paper book has not closed */
  systemOnly: number;
  exchangeOnly: number;
}
export interface LiveDiff {
  total: DiffRow;
  byRange: DiffRow[];
  byHour: DiffRow[];
  /** the matched orders the exchange did worst against the system */
  worst: Array<{ id: string; system: number; exchange: number; gap: number; reason: string }>;
  /** exchange stop-outs of orders the system closed otherwise */
  stopMismatch: number;
}

const H = 3_600_000;
const groupOf = (cfg: string) =>
  isSignalInd(cfg.split("|")[1] ?? "") ? "Signals" : RANGE_LABEL[rangeOfId(cfg)];
const side = (rs: number[]): DiffSide => {
  let gp = 0;
  let gl = 0;
  for (const r of rs) {
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { n: rs.length, pf: rs.length ? profitFactor(gp, gl) : 0, net: (gp - gl) * 100 };
};

export function liveDiff(paper: readonly DiffPaper[], live: readonly DiffLive[], since = 0): LiveDiff {
  const sys = new Map<string, DiffPaper>();
  for (const p of paper) if (p.exitT >= since) sys.set(`${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`, p);
  const ex = new Map<string, DiffLive>();
  for (const l of live) if (l.exitT >= since) ex.set(l.id, l);
  const rows = new Map<string, { s: number[]; e: number[]; gaps: number[]; so: number; eo: number }>();
  const at = (k: string) => {
    let x = rows.get(k);
    if (!x) rows.set(k, (x = { s: [], e: [], gaps: [], so: 0, eo: 0 }));
    return x;
  };
  const worst: LiveDiff["worst"] = [];
  let stopMismatch = 0;
  const add = (keys: string[], f: (x: ReturnType<typeof at>) => void) => keys.forEach((k) => f(at(k)));
  const hourOf = (t: number) => `h:${new Date(Math.floor(t / H) * H).toISOString().slice(0, 13)}:00Z`;
  for (const [id, p] of sys) {
    const keys = ["total", `r:${groupOf(p.cfg)}`, hourOf(p.exitT)];
    const l = ex.get(id);
    add(keys, (x) => x.s.push(p.r));
    if (!l) {
      add(keys, (x) => x.so++);
      continue;
    }
    const gap = (l.r - p.r) * 100;
    add(keys, (x) => x.gaps.push(gap));
    worst.push({ id, system: p.r * 100, exchange: l.r * 100, gap, reason: l.reason });
    if (l.reason === "stop" && p.r > 0) stopMismatch++;
  }
  for (const [id, l] of ex) {
    // exchange closes are counted at their own exit hour
    const keys = ["total", `r:${groupOf(l.cfg)}`, hourOf(l.exitT)];
    add(keys, (x) => x.e.push(l.r));
    if (!sys.has(id)) add(keys, (x) => x.eo++);
  }
  const row = (key: string): DiffRow => {
    const x = rows.get(key) ?? { s: [], e: [], gaps: [], so: 0, eo: 0 };
    return {
      key: key.replace(/^[rh]:/, ""),
      system: side(x.s),
      exchange: side(x.e),
      matched: x.gaps.length,
      meanGap: x.gaps.length ? x.gaps.reduce((a, b) => a + b, 0) / x.gaps.length : 0,
      systemOnly: x.so,
      exchangeOnly: x.eo,
    };
  };
  worst.sort((a, b) => a.gap - b.gap);
  return {
    total: row("total"),
    byRange: [...rows.keys()].filter((k) => k.startsWith("r:")).sort().map(row),
    byHour: [...rows.keys()].filter((k) => k.startsWith("h:")).sort().map(row),
    worst: worst.slice(0, 10),
    stopMismatch,
  };
}

/** The diff as Markdown tables (desk log, report). */
export function liveDiffMd(d: LiveDiff): string {
  const f = (x: number, k = 2) => (Number.isFinite(x) ? x.toFixed(k) : "∞");
  const head =
    "| | system orders | system PF | system net % | exchange orders | exchange PF | exchange net % | matched | mean gap % / order | system only | exchange only |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|";
  const line = (r: DiffRow) =>
    `| ${r.key} | ${r.system.n} | ${f(r.system.pf)} | ${f(r.system.net, 1)} | ${r.exchange.n} | ${f(r.exchange.pf)} | ${f(r.exchange.net, 1)} | ${r.matched} | ${f(r.meanGap, 3)} | ${r.systemOnly} | ${r.exchangeOnly} |`;
  return [
    "### Live vs system",
    head,
    line(d.total),
    ...d.byRange.map(line),
    "",
    "### Per hour (exit hour)",
    head,
    ...d.byHour.map(line),
    "",
    `Exchange stop-outs of orders the system closed in profit: ${d.stopMismatch}`,
    "",
    "### Worst matched orders (exchange − system, trade %)",
    "| order | system % | exchange % | gap % | exchange exit |\n|---|---:|---:|---:|---|",
    ...d.worst.map((w) => `| ${w.id} | ${f(w.system, 3)} | ${f(w.exchange, 3)} | ${f(w.gap, 3)} | ${w.reason} |`),
  ].join("\n");
}
