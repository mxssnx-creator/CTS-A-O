// The orders of one causal evaluation window (scripts/eval-gate.mjs, scripts/eval-families.mjs): those its entry falls in
// that closed, and those still open at the window's end marked to market at its last close (the engine's
// sim.openAtEnd, dumped as openEnd: every gate, cap and volume applied). Counting only the closed ones kept a signal's
// targets and trails inside its 48 h hold and dropped its losers still short of their stop — an upper bound on PF.
import { modeledUnitReturn as unitReturn } from "../../src/core/metrics/stats.ts";

/**
 * @param {{ trades?: Array<{cfg: string, sym: string, side: number, entryT: number, entry: number, exitT: number, exit: number, r: number, reason: string}>, openEnd?: Array<{cfg: string, sym: string, side: number, entryT: number, entry: number, mtmR: number}> }} raw a session dump
 * @param {{ from: number, to: number }} w the window (entries in [from, to))
 */
export function windowOrders(raw, w) {
  const closed = (raw.trades ?? []).filter((t) => t.entryT >= w.from && t.entryT < w.to);
  const open = (raw.openEnd ?? [])
    .filter((o) => o.entryT >= w.from && o.entryT < w.to)
    .map((o) => ({ cfg: o.cfg, sym: o.sym, side: o.side, entryT: o.entryT, entry: o.entry, exitT: w.to, exit: null, r: o.mtmR, reason: "open-end", ...(o.mult !== undefined ? { mult: o.mult } : {}), ...(o.unitR !== undefined ? { unitR: o.unitR } : {}) }));
  return { closed, open, all: [...closed, ...open] };
}

/**
 * An order's UNIT return: the engine stores an executed order's r sized by its Block volume multiple (r × mult, the
 * multiple beside it); the gates and the Base stage judge the per-order return at one unit. The eval scores every
 * order at one unit too, so a Block-raised order never weighs more than its edge (an eval with Block on summed the
 * sized returns before; with Block off, mult is 1 and nothing changes).
 */
export function unitR(t) {
  return unitReturn(t);
}

const pf4 = (rs) => {
  let gp = 0;
  let gl = 0;
  for (const r of rs) {
    if (r > 0) gp += r;
    else gl -= r;
  }
  return gl > 1e-12 ? +(gp / gl).toFixed(4) : null;
};

/**
 * What Block did to a set of orders (stored basis: r sized by its multiple, `mult` beside it). The eval's own PF is
 * unit (unitR), which cannot see Block at all: an eval with Block on and off scored the same per-order edge. This adds
 * the volume-weighted PF (what the book earns with Block's sizes) and the unit PF of the raised and the unraised orders
 * apart (does Block raise the better entries?). null = no losing order (or no order) in that group.
 * @param {Array<{ r: number, mult?: number }>} orders
 */
export function blockSplit(orders) {
  const raised = [];
  const unraised = [];
  let multSum = 0;
  for (const t of orders) {
    const m = Number.isFinite(Number(t.mult)) && Number(t.mult) > 0 ? Number(t.mult) : 1;
    multSum += m;
    if (m > 1 + 1e-9) raised.push(t);
    else unraised.push(t);
  }
  return {
    n: orders.length,
    raised: raised.length,
    meanMult: orders.length ? +(multSum / orders.length).toFixed(4) : null,
    pfVol: pf4(orders.map((t) => t.r)),
    pfUnit: pf4(orders.map(unitR)),
    raisedPfUnit: pf4(raised.map(unitR)),
    raisedPfVol: pf4(raised.map((t) => t.r)),
    unraisedPfUnit: pf4(unraised.map(unitR)),
  };
}
