import { modeledUnitReturn } from "../../src/core/metrics/stats.ts";
import { positionOrderCounts } from "../../src/core/positions.ts";
import { dupKey, orderCfgKey } from "../../src/core/sim/walkforward.ts";

/**
 * Audit a modeled session dump whose rows represent whole closed or still-open source orders.
 * This identity rule must not be applied to a venue ledger containing several legitimate fills of one order.
 */
export function auditModeledOrders(data) {
  if (!Array.isArray(data?.trades) || !Array.isArray(data?.openEnd))
    throw new TypeError("A modeled dump must contain trades and openEnd arrays");
  const rows = [...data.trades, ...data.openEnd];
  const exact = new Map(), canonical = new Map(), onsets = new Map(), closed = new Map();
  const configs = new Set(), kinds = new Map();
  let invalid = 0, unknownReturns = 0, gp = 0, gl = 0;
  const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
  for (const [i, row] of rows.entries()) {
    if (typeof row?.cfg !== "string" || !row.cfg || typeof row.sym !== "string" || !row.sym ||
        ![1, -1].includes(row.side) || !Number.isFinite(row.entryT) ||
        !Number.isFinite(row.entry) || !(row.entry > 0) ||
        (i < data.trades.length && (!Number.isFinite(row.exitT) || row.exitT < row.entryT))) {
      invalid++;
      continue;
    }
    configs.add(row.cfg);
    increment(kinds, row.kind ?? "unknown");
    increment(exact, JSON.stringify([row.cfg, row.sym, row.side, row.entryT]));
    increment(canonical, JSON.stringify([orderCfgKey(row.cfg), row.sym, row.side, row.entryT]));
    increment(onsets, JSON.stringify([row.sym, row.side, row.entryT]));
    if (i < data.trades.length) {
      increment(closed, dupKey(row));
      const r = modeledUnitReturn(row);
      if (!Number.isFinite(r)) unknownReturns++;
      else if (r > 0) gp += r;
      else if (r < 0) gl -= r;
    }
  }
  const collisions = (map) => {
    let groups = 0, extraRows = 0;
    for (const count of map.values()) if (count > 1) { groups++; extraRows += count - 1; }
    return { groups, extraRows };
  };
  let simultaneousOnsetGroups = 0, maxOrdersAtOneOnset = 0;
  for (const n of onsets.values()) {
    if (n > 1) simultaneousOnsetGroups++;
    maxOrdersAtOneOnset = Math.max(maxOrdersAtOneOnset, n);
  }
  const primaryAvailable = unknownReturns === 0 && invalid === 0 && Number.isFinite(gp) && Number.isFinite(gl);
  const exactDuplicates = collisions(exact), canonicalDuplicates = collisions(canonical), closedDuplicates = collisions(closed);
  return {
    scope: "modeled whole-order records; not exchange fills",
    ok: primaryAvailable && exactDuplicates.extraRows === 0 && canonicalDuplicates.extraRows === 0 && closedDuplicates.extraRows === 0,
    counts: invalid ? null : positionOrderCounts(data.trades, data.openEnd),
    uniqueConfigurations: configs.size,
    ordersByKind: Object.fromEntries(kinds),
    exactEntryDuplicates: exactDuplicates,
    canonicalEntryCollisions: canonicalDuplicates,
    exactClosedEventDuplicates: closedDuplicates,
    simultaneousOnsetGroups,
    maxOrdersAtOneOnset,
    invalidRecords: invalid,
    unknownSettledReturns: unknownReturns,
    settledReturnPf: primaryAvailable && gl > 0 ? gp / gl : null,
    noLoss: primaryAvailable && data.trades.length > 0 && gp > 0 && gl === 0,
    grossProfit: primaryAvailable ? gp : null,
    grossLoss: primaryAvailable ? gl : null,
  };
}
