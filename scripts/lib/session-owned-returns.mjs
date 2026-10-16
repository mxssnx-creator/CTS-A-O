import { modeledUnitReturn, profitFactor } from "../../src/core/metrics/stats.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./book-notional.mjs";

// Allocation membership is evidence. A missing allocation cannot become a funded
// fill through a default notional, and a known zero cannot contribute a return.
export function sessionAllocation(row, allocations, keyOf) {
  const key = keyOf(row);
  const unit = allocations.get(key);
  const volume = row.vol ?? 1;
  if (!allocations.has(key) || typeof unit !== "number" || !Number.isFinite(unit) || unit < 0 ||
      typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0 || !Number.isFinite(unit * volume)) return "unknown";
  return unit * volume > BOOK_NOTIONAL_EPS_USD ? "funded" : "zero";
}

export function sessionOwnedReturns(rows, allocations, keyOf) {
  let gpR = 0, glR = 0, wins = 0, losses = 0, flats = 0, funded = 0, zero = 0, unknownAllocations = 0, unknownReturns = 0;
  let cumulative = 0, peak = 0, mddU = 0;
  const ownedRows = [];
  for (const row of rows) {
    const allocation = sessionAllocation(row, allocations, keyOf);
    if (allocation === "zero") { zero++; continue; }
    ownedRows.push(row);
    if (allocation === "unknown") { unknownAllocations++; continue; }
    funded++;
    const r = modeledUnitReturn(row);
    if (!Number.isFinite(r)) { unknownReturns++; continue; }
    if (r > 0) { gpR += r; wins++; }
    else if (r < 0) { glR -= r; losses++; }
    else flats++;
    cumulative += r;
    peak = Math.max(peak, cumulative);
    mddU = Math.max(mddU, peak - cumulative);
  }
  const available = unknownAllocations === 0 && unknownReturns === 0;
  return {
    rows: ownedRows, n: ownedRows.length, fundedOrders: funded, zeroAllocatedOrders: zero,
    unknownAllocations, unknownReturns, wins, losses, flats,
    wr: ownedRows.length && available ? wins / ownedRows.length : 0,
    gpR: available ? gpR : NaN, glR: available ? glR : NaN,
    pf: available ? profitFactor(gpR, glR) : NaN,
    pfBasis: available && ownedRows.length ? "unit-net-returns" : "unavailable",
    netU: available ? gpR - glR : NaN, mddU: available ? mddU : NaN,
    noLoss: available && gpR > 0 && glR === 0,
  };
}

export function sessionVirtualReturns(rows) {
  let gpR = 0, glR = 0, unknownReturns = 0;
  for (const row of rows) {
    const r = modeledUnitReturn(row);
    if (!Number.isFinite(r)) unknownReturns++;
    else if (r > 0) gpR += r;
    else glR -= r;
  }
  return { n: rows.length, gpR: unknownReturns ? NaN : gpR, glR: unknownReturns ? NaN : glR,
    pf: unknownReturns ? NaN : profitFactor(gpR, glR), unknownReturns,
    noLoss: !unknownReturns && gpR > 0 && glR === 0, basis: "all-virtual-modeled-closes" };
}
