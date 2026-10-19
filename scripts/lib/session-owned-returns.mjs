import { modeledUnitReturn, modeledUnitStatsOf } from "../../src/core/metrics/stats.ts";
import { BOOK_NOTIONAL_EPS_USD } from "./book-notional.mjs";

// Allocation membership is evidence. A missing allocation cannot become a funded
// fill through a default notional, and a known zero cannot contribute a return.
export function sessionAllocation(row, allocations, keyOf) {
  const key = keyOf(row);
  const unit = allocations.get(key);
  const volume = row.vol === undefined ? 1 : row.vol;
  if (!allocations.has(key) || typeof unit !== "number" || !Number.isFinite(unit) || unit < 0 ||
      typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0 || !Number.isFinite(unit * volume)) return "unknown";
  return unit * volume > BOOK_NOTIONAL_EPS_USD ? "funded" : "zero";
}

export function sessionUnitNotional(row, allocations, keyOf) {
  return sessionAllocation(row, allocations, keyOf) === "unknown" ? NaN : allocations.get(keyOf(row));
}

export function sessionCashPnl(row, allocations, keyOf) {
  const allocation = sessionAllocation(row, allocations, keyOf);
  if (allocation === "zero") return 0;
  if (allocation === "unknown" || typeof row.r !== "number" || !Number.isFinite(row.r)) return NaN;
  // Cash PF uses the usual base-one return convention: an order starts at 1,
  // ends at 1 + its execution-weighted net return, and its cash change is the
  // difference, scaled by the funded unit notional. `r` already contains
  // Block/coordination and ladder volume, so multiplying `row.vol` again
  // would count the same exposure twice. Keep the algebraic `r` form to avoid
  // losing tiny returns to `(1 + r) - 1` floating-point cancellation.
  const endingValueOnOne = 1 + row.r;
  const computedBaseOneReturn = endingValueOnOne - 1;
  const baseOneReturn = computedBaseOneReturn === 0 && row.r !== 0 ? row.r : computedBaseOneReturn;
  const value = baseOneReturn * allocations.get(keyOf(row));
  return Number.isFinite(value) ? value : NaN;
}

export function sessionOwnedReturns(rows, allocations, keyOf) {
  let wins = 0, losses = 0, flats = 0, funded = 0, zero = 0, unknownAllocations = 0;
  const ownedRows = [];
  for (const row of rows) {
    const allocation = sessionAllocation(row, allocations, keyOf);
    if (allocation === "zero") { zero++; continue; }
    ownedRows.push(row);
    if (allocation === "unknown") { unknownAllocations++; continue; }
    funded++;
    const r = modeledUnitReturn(row);
    if (!Number.isFinite(r)) continue;
    if (r > 0) wins++;
    else if (r < 0) losses++;
    else flats++;
  }
  // Canonical modeled arithmetic also rejects finite rows whose totals, percentages or PF overflow.
  // Unknown ownership stays in the sample; a known return never supplies missing allocation evidence.
  const stats = modeledUnitStatsOf(ownedRows);
  const available = ownedRows.length > 0 && unknownAllocations === 0 && stats.pfBasis === "unit-net-returns";
  const gpR = available ? stats.gp / 100 : NaN;
  const glR = available ? stats.gl / 100 : NaN;
  return {
    rows: ownedRows, n: ownedRows.length, fundedOrders: funded, zeroAllocatedOrders: zero,
    unknownAllocations, unknownReturns: stats.unknownReturns,
    unknownReturnTotals: stats.unknownReturnTotals ?? 0, wins, losses, flats,
    wr: available ? wins / ownedRows.length : NaN,
    gpR, glR, pf: available ? stats.pf : NaN,
    pfBasis: available ? "unit-net-returns" : "unavailable",
    netU: available ? stats.net / 100 : NaN, mddU: available ? stats.mdd / 100 : NaN,
    noLoss: available && gpR > 0 && glR === 0,
    pfConvention: !available ? "unavailable" : gpR > 0 && glR === 0 ? "no-loss-sentinel" : "gross-return-ratio",
  };
}

export function sessionVirtualReturns(rows) {
  const stats = modeledUnitStatsOf(rows);
  const available = rows.length > 0 && stats.pfBasis === "unit-net-returns";
  const gpR = available ? stats.gp / 100 : NaN, glR = available ? stats.gl / 100 : NaN;
  return { n: rows.length, gpR, glR, pf: available ? stats.pf : NaN,
    unknownReturns: stats.unknownReturns, unknownReturnTotals: stats.unknownReturnTotals ?? 0,
    pfBasis: available ? "unit-net-returns" : "unavailable",
    noLoss: available && gpR > 0 && glR === 0, basis: "all-virtual-modeled-closes" };
}
