// Normalized lane diagnostic: exchange-attributed returns (live_lane_trades, live-record.ts) next to the same order in
// the system's paper book (paper_trades). Both carry the paper position's identity (config × symbol × entry time),
// so the orders match one to one. The difference per order is what the simulation does not see — slippage, fees,
// the merged position's fills, a stop the exchange took earlier or later. A close present on only one side is
// unmatched in this window; it does not establish whether the other side is still open or exited outside the window.
// The attribution has no filled quantity or settled cash P&L. These unweighted return PFs are NOT account cash PF
// or execution-profitability proof; repeated closes of a paper identity remain separate samples in its side's stats.
import { profitFactor } from "./metrics/stats.ts";
import { liveGroupOf } from "./live-validation.ts";

export interface DiffPaper {
  cfg: string;
  sym: string;
  side: number;
  entryT: number;
  exitT: number;
  /** Verified unit return; null when a legacy paper record did not retain the execution multiplier. */
  r: number | null;
}
export interface DiffLive {
  /** the paper position's identity `${cfg}|${sym}|${side}|${paper entryT}` (live-record.ts laneKeyOf) */
  id: string;
  cfg: string;
  sym: string;
  exitT: number;
  r: number | null;
  reason: string;
}

export interface DiffSide {
  n: number;
  /** Unweighted return PF, never quantity-weighted cash PF. */
  pf: number | null;
  /** Gross net-return sums in percentage points, on this side's own settled sample. */
  returnGp: number | null;
  returnGl: number | null;
  noLoss: boolean;
  pfConvention: "gross-return-ratio" | "no-loss-sentinel" | "unavailable";
  pfBasis: "unit-net-returns" | "unavailable";
  unknownReturns: number;
  /** Σ r × 100 (trade %) */
  net: number | null;
}
export interface DiffRow {
  key: string;
  system: DiffSide;
  exchange: DiffSide;
  /** paper identities with a close on both sides in the selected window */
  matched: number;
  matchedReturns: number;
  /** mean (exchange r − system r) × 100 over the matched orders, trade % per order */
  meanGap: number | null;
  /** system identities without an attributed close / attributed closes without a system close in the window */
  systemOnly: number;
  exchangeOnly: number;
}
export interface LiveDiff {
  basis: "normalized-return";
  cashPfAvailable: false;
  total: DiffRow;
  byRange: DiffRow[];
  byHour: DiffRow[];
  /** the matched orders the exchange did worst against the system */
  worst: Array<{ id: string; system: number; exchange: number; gap: number; reason: string }>;
  /** exchange stop-outs of orders the system closed otherwise */
  stopMismatch: number;
}

const H = 3_600_000;
const groupOf = liveGroupOf;
const knownReturn = (r: number | null): r is number => typeof r === "number" && Number.isFinite(r);
const side = (rs: Array<number | null>): DiffSide => {
  let gp = 0;
  let gl = 0;
  let unknownReturns = 0;
  for (const r of rs) {
    if (!knownReturn(r)) { unknownReturns++; continue; }
    if (r > 0) gp += r;
    else gl -= r;
  }
  const noLoss = gp > 0 && gl <= 0;
  return {
    n: rs.length,
    pf: unknownReturns ? null : rs.length ? profitFactor(gp, gl) : 0,
    returnGp: unknownReturns ? null : gp * 100,
    returnGl: unknownReturns ? null : gl * 100,
    noLoss: !unknownReturns && noLoss,
    pfConvention: unknownReturns ? "unavailable" : noLoss ? "no-loss-sentinel" : "gross-return-ratio",
    pfBasis: unknownReturns ? "unavailable" : "unit-net-returns",
    unknownReturns,
    net: unknownReturns ? null : (gp - gl) * 100,
  };
};

export function liveDiff(paper: readonly DiffPaper[], live: readonly DiffLive[], since = 0): LiveDiff {
  const sys = new Map<string, DiffPaper>();
  for (const p of paper) if (p.exitT >= since) sys.set(`${p.cfg}|${p.sym}|${p.side > 0 ? 1 : -1}|${p.entryT}`, p);
  const ex = new Map<string, DiffLive>();
  // The durable key is (id, exit_t): a lane may leave and rejoin the same paper position. Do not overwrite its
  // earlier losing closes with its last close. Match their summed normalized return to the paper identity, while
  // every close still contributes separately to the exchange side's PF and sample count below.
  for (const l of live) if (l.exitT >= since) {
    const prev = ex.get(l.id);
    ex.set(l.id, prev ? { ...(prev.exitT > l.exitT ? prev : l), r: knownReturn(prev.r) && knownReturn(l.r) ? prev.r + l.r : null } : l);
  }
  const rows = new Map<string, { s: Array<number | null>; e: Array<number | null>; gaps: number[]; matched: number; so: number; eo: number }>();
  const at = (k: string) => {
    let x = rows.get(k);
    if (!x) rows.set(k, (x = { s: [], e: [], gaps: [], matched: 0, so: 0, eo: 0 }));
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
    add(keys, (x) => x.matched++);
    if (!knownReturn(l.r) || !knownReturn(p.r)) continue;
    const gap = (l.r - p.r) * 100;
    add(keys, (x) => x.gaps.push(gap));
    worst.push({ id, system: p.r * 100, exchange: l.r * 100, gap, reason: l.reason });
    if (l.reason === "stop" && p.r > 0) stopMismatch++;
  }
  for (const l of live) {
    if (l.exitT < since) continue;
    // exchange closes are counted at their own exit hour
    const keys = ["total", `r:${groupOf(l.cfg)}`, hourOf(l.exitT)];
    add(keys, (x) => x.e.push(l.r));
    if (!sys.has(l.id)) add(keys, (x) => x.eo++);
  }
  const row = (key: string): DiffRow => {
    const x = rows.get(key) ?? { s: [], e: [], gaps: [], matched: 0, so: 0, eo: 0 };
    return {
      key: key.replace(/^[rh]:/, ""),
      system: side(x.s),
      exchange: side(x.e),
      matched: x.matched,
      matchedReturns: x.gaps.length,
      meanGap: x.gaps.length ? x.gaps.reduce((a, b) => a + b, 0) / x.gaps.length : null,
      systemOnly: x.so,
      exchangeOnly: x.eo,
    };
  };
  worst.sort((a, b) => a.gap - b.gap);
  return {
    basis: "normalized-return",
    cashPfAvailable: false,
    total: row("total"),
    byRange: [...rows.keys()].filter((k) => k.startsWith("r:")).sort().map(row),
    byHour: [...rows.keys()].filter((k) => k.startsWith("h:")).sort().map(row),
    worst: worst.slice(0, 10),
    stopMismatch,
  };
}

/** The diff as Markdown tables (desk log, report). */
export function liveDiffMd(d: LiveDiff): string {
  const f = (x: number | null, k = 2) => x === null ? "–" : Number.isFinite(x) ? x.toFixed(k) : "∞";
  const pfText = (s: DiffSide) => s.unknownReturns ? "Unit basis unavailable" : !s.n ? "–" : s.noLoss ? "No losses" : f(s.pf);
  const head =
    "| | system closes | system return PF | system sum return % | attributed closes | attributed return PF | attributed sum return % | matched identities | known matched returns | mean gap % / known identity | system only | attributed only |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|";
  const line = (r: DiffRow) =>
    `| ${r.key} | ${r.system.n} | ${pfText(r.system)} | ${f(r.system.net, 1)} | ${r.exchange.n} | ${pfText(r.exchange)} | ${f(r.exchange.net, 1)} | ${r.matched} | ${r.matchedReturns} | ${f(r.meanGap, 3)} | ${r.systemOnly} | ${r.exchangeOnly} |`;
  return [
    "### Live vs system",
    "Normalized lane-return diagnostic only. Attributed returns have no filled quantities or settled cash amounts: these PFs are not account cash PF or execution-profitability proof. Sum return % is a sum across trades, not an account balance return. Repeated attributed closes are retained; matched gaps sum them per paper identity. No losses denotes the engine's no-loss score convention, not a measured finite PF ratio. A legacy close without verified unit-return evidence makes its side's whole primary PF unavailable; it is never dropped to manufacture a positive ratio. Gaps use only the separately counted known matched returns.",
    "",
    head,
    line(d.total),
    ...d.byRange.map(line),
    "",
    "### Per hour (each side's exit hour; matched gaps use the system exit hour)",
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
