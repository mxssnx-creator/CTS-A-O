// Continuous independent evaluations: each config is scored on its own, over several time windows and
// last-trade windows ending "now". A window with too few trades is idle (neither pass nor fail).
import { EVAL_TIME_WINDOWS_H, EVAL_TRADE_WINDOWS } from "../config.ts";
import type { EvalResult, EvalWindow, Gates, Trade } from "../domain/types.ts";
import { scoreStats, statsOf } from "../metrics/stats.ts";

const H = 3_600_000;

export interface EvalOptions {
  gates: Gates;
  nowT: number;
  bestN?: number;
  timeWindowsH?: readonly number[];
  tradeWindows?: readonly number[];
}

function minTradesFor(hours: number, g: Gates): number {
  return Math.max(3, Math.round((g.minTrades * hours) / 72));
}

/** `tape` must be in exit order. */
export function evaluateConfig(cfg: string, tape: readonly Trade[], o: EvalOptions): EvalResult {
  const g = o.gates;
  // The caller may retain a complete replay tape. Only settled closes at this
  // decision clock belong to its time windows, Last-N and ranking score.
  const after = (time: number, end = tape.length) => {
    let lo = 0, hi = end;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (tape[mid].exitT <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const end = after(o.nowT);
  const windows: EvalWindow[] = [];
  const push = (
    key: string,
    kind: EvalWindow["kind"],
    span: number,
    sel: readonly Trade[],
    minN: number,
  ) => {
    const s = statsOf(sel, o.nowT);
    const active = s.n >= minN;
    windows.push({
      key,
      kind,
      span,
      n: s.n,
      pf: s.pf,
      net: s.net,
      ddt: s.ddt,
      wr: s.wr,
      pass: active && s.net > 0 && s.pf >= g.minPf && s.ddt <= g.maxDdtH,
    });
    return active;
  };
  const active: boolean[] = [];
  for (const h of o.timeWindowsH ?? EVAL_TIME_WINDOWS_H) {
    const from = o.nowT - h * H;
    active.push(push(`${h}h`, "time", h, tape.slice(after(from, end), end), minTradesFor(h, g)));
  }
  const tw = new Set<number>(o.tradeWindows ?? EVAL_TRADE_WINDOWS);
  if (o.bestN && o.bestN > 0) tw.add(o.bestN);
  for (const nN of [...tw].sort((a, b) => a - b)) {
    active.push(
      push(
        `N${nN}`,
        "trades",
        nN,
        tape.slice(Math.max(0, end - nN), end),
        Math.min(nN, Math.max(3, Math.round(nN * 0.8))),
      ),
    );
  }
  let counted = 0;
  let passed = 0;
  windows.forEach((w, i) => {
    if (!active[i]) return;
    counted++;
    if (w.pass) passed++;
  });
  const passRatio = counted ? passed / counted : 0;
  const success = counted >= 2 && passRatio >= g.quorum;
  const recentFrom = o.nowT - 72 * H;
  const recent = tape.slice(after(recentFrom, end), end);
  const score = passRatio * Math.max(0, scoreStats(statsOf(recent, o.nowT), 3));
  return { cfg, at: o.nowT, windows, passRatio, success, score };
}
