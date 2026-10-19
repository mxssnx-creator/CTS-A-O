// Reporting supplement only. Engine returns, account allocations and minute
// curves are inputs, never reconstructed or changed here.
export const ENGINE_MARK_BASIS = 'engine endpoint return: per-leg ladder returns, with external execution weighting';
export const BOOK_MARK_BASIS = 'existing minute account model: arithmetic aggregate entry and final volume from parent entry';
const M = 60_000;
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const own = (x, k) => Object.prototype.hasOwnProperty.call(x, k);

/** The existing minute book uses the last bar CLOSED at the mark time. */
export function endpointMarkPrice(closes, sym, endT) {
  if (!finite(endT)) throw new Error('Unknown endpoint mark time');
  const rows = closes?.[sym];
  if (!Array.isArray(rows)) throw new Error(`Unknown endpoint price for ${sym}`);
  let selected = null;
  for (const row of rows) {
    if (!Array.isArray(row) || !finite(row[0])) throw new Error('Invalid endpoint price timestamp');
    if (row[0] <= endT - M && (!selected || row[0] >= selected[0])) selected = row;
  }
  if (!selected || !finite(selected[1]) || selected[1] <= 0) throw new Error(`Unknown or invalid closed endpoint price for ${sym}`);
  return { markT: endT, markBarOpenT: selected[0], markPrice: selected[1] };
}

function engineUnitReturn(open, allocation) {
  if (own(allocation, 'unitR')) return finite(allocation.unitR) ? allocation.unitR : null;
  if (open.unitR !== undefined) return finite(open.unitR) ? open.unitR : null;
  return finite(open.mtmR) && finite(open.mult) && open.mult > 0 ? open.mtmR / open.mult : null;
}

/**
 * Supplement an original endpoint row without replacing any original field.
 * DCA leg timing/prices are absent from raw records: this reproduces the current
 * aggregate-parent minute model, not a causal replay of individual ladder fills.
 */
export function endpointBookMark(open, allocation, { closes, endT, cost, mark } = {}) {
  if (!open || !allocation || !finite(allocation.unitNotional) || allocation.unitNotional < 0)
    throw new Error('Unknown or invalid endpoint allocation');
  if (!finite(open.entry) || open.entry <= 0 || ![1, -1].includes(open.side) || !finite(cost) || cost < 0 || !finite(endT))
    throw new Error('Invalid endpoint entry, side or cost');
  const vol = open.vol ?? 1, unit = allocation.unitNotional;
  if (!finite(vol) || vol <= 0 || (own(allocation, 'volume') && allocation.volume !== vol))
    throw new Error('Invalid or inconsistent endpoint volume');
  if (own(allocation, 'allocatedNotional') && (!finite(allocation.allocatedNotional) || allocation.allocatedNotional < 0 || allocation.allocatedNotional !== unit * vol))
    throw new Error('Unknown or inconsistent allocated endpoint notional');
  const price = mark ?? endpointMarkPrice(closes, open.sym, endT);
  if (price.markT !== endT || !finite(price.markBarOpenT) || price.markBarOpenT > endT - M || !finite(price.markPrice) || price.markPrice <= 0)
    throw new Error('Invalid endpoint mark price provenance');
  const perNotional = (open.side * (price.markPrice - open.entry)) / open.entry - cost;
  // Preserve the exact multiplication order of core-session's minute loop.
  const bookSizedPnl = perNotional * unit * vol;
  const bookMtmR = perNotional * vol;
  const engineMarkSizedReturn = finite(open.mtmR) ? open.mtmR : null;
  const engineMarkSizedPnl = engineMarkSizedReturn === null ? null : engineMarkSizedReturn * unit;
  if (!finite(bookSizedPnl) || !finite(bookMtmR) || (engineMarkSizedPnl !== null && !finite(engineMarkSizedPnl)))
    throw new Error('Nonfinite endpoint mark calculation');
  return {
    markT: price.markT, markBarOpenT: price.markBarOpenT, markPrice: price.markPrice,
    engineMarkBasis: ENGINE_MARK_BASIS,
    engineMarkSizedReturn,
    engineMarkUnitReturn: engineUnitReturn(open, allocation),
    engineMarkSizedPnl,
    bookMarkBasis: BOOK_MARK_BASIS,
    bookMtmR,
    bookSizedPnl,
    engineMinusBookMarkUsd: engineMarkSizedPnl === null ? null : engineMarkSizedPnl - bookSizedPnl,
  };
}
