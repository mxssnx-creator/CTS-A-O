// The orders of one causal evaluation window (scripts/eval-gate.mjs, scripts/eval-families.mjs): those its entry falls in
// that closed, and those still open at the window's end marked to market at its last close (the engine's
// sim.openAtEnd, dumped as openEnd: every gate, cap and volume applied). Counting only the closed ones kept a signal's
// targets and trails inside its 48 h hold and dropped its losers still short of their stop — an upper bound on PF.

/**
 * @param {{ trades?: Array<{cfg: string, sym: string, side: number, entryT: number, entry: number, exitT: number, exit: number, r: number, reason: string}>, openEnd?: Array<{cfg: string, sym: string, side: number, entryT: number, entry: number, mtmR: number}> }} raw a session dump
 * @param {{ from: number, to: number }} w the window (entries in [from, to))
 */
export function windowOrders(raw, w) {
  const closed = (raw.trades ?? []).filter((t) => t.entryT >= w.from && t.entryT < w.to);
  const open = (raw.openEnd ?? [])
    .filter((o) => o.entryT >= w.from && o.entryT < w.to && Number.isFinite(o.mtmR))
    .map((o) => ({ cfg: o.cfg, sym: o.sym, side: o.side, entryT: o.entryT, entry: o.entry, exitT: w.to, exit: null, r: o.mtmR, reason: "open-end" }));
  return { closed, open, all: [...closed, ...open] };
}
