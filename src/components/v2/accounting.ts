/** The user's primary PF metric: net returns after costs, independent of account size or order notional. */
export function returnPf(
  row?: ComparisonPf | null,
): number | null {
  return !isFlatUnitSample(row) && row?.pfBasis !== "unavailable" &&
    typeof row?.n === "number" &&
    row.n > 0 &&
    typeof row.pf === "number" &&
    Number.isFinite(row.pf)
    ? row.pf
    : null;
}

/** The finite engine sentinel is a ranking convention, not an exact ratio when the sample has no losses. */
export function returnPfText(
  row?: ComparisonPf | null,
): string {
  if (isFlatUnitSample(row)) return "Flat (no ratio)";
  const value = returnPf(row);
  if (value === null) return "–";
  return row?.noLoss === true ? "No losses" : value.toFixed(2);
}

type ComparisonPf = {
  n?: unknown;
  pf?: unknown;
  gp?: unknown;
  gl?: unknown;
  returnGp?: unknown;
  returnGl?: unknown;
  noLoss?: unknown;
  pfConvention?: unknown;
  pfBasis?: unknown;
  unknownReturns?: unknown;
};

/** Zero gains and zero losses have no ratio; they are not a measured losing PF of zero. */
function isFlatUnitSample(row?: ComparisonPf | null): boolean {
  if (!hasUnitReturnBasis(row) || typeof row?.n !== "number" || row.n <= 0) return false;
  // Execution group rows name their normalized sums explicitly; never substitute cash sums.
  return "returnGp" in row || "returnGl" in row
    ? row.returnGp === 0 && row.returnGl === 0
    : row.gp === 0 && row.gl === 0;
}

/** PF 1 is neutral. An explicit qualification floor may warn on a positive but unqualified ratio. */
export function pfTone(value: unknown, min = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 1) return "";
  if (value < 1) return "v2-down";
  return value >= min ? "v2-up" : "v2-warn";
}

/** Signed presentation only. Qualification still uses conventional PF (breakeven = 1). */
export function returnPfEdge(row?: ComparisonPf | null): number | null {
  if (!hasUnitReturnBasis(row)) return null;
  const pf = measuredComparisonPf(row);
  return pf === null ? null : pf - 1;
}

export function returnPfEdgeText(row?: ComparisonPf | null): string {
  const edge = returnPfEdge(row);
  if (edge !== null) return `${edge > 0 ? "+" : ""}${edge.toFixed(2)}`;
  if (hasUnitReturnBasis(row) && comparisonPfText(row) === "No losses") return "No losses";
  return "–";
}

/** A valid empty unit sample is different from an archive whose execution weighting cannot be recovered. */
export function hasUnitReturnBasis(
  stats?: { pfBasis?: unknown; unknownReturns?: unknown } | null,
): boolean {
  return stats?.pfBasis === "unit-net-returns" && stats.unknownReturns === 0;
}

/** Shared simulator stats carry gross returns directly, without the report row's separate noLoss flag. */
export function unitStatsPfText(
  stats?: (ComparisonPf & { unknownReturns?: unknown }) | null,
): string {
  if (!hasUnitReturnBasis(stats)) return "Basis unavailable";
  const noLoss = typeof stats?.gp === "number" && stats.gp > 0 && stats.gl === 0;
  return comparisonPfText({
    ...stats,
    noLoss,
    pfConvention: noLoss ? "no-loss-sentinel" : "gross-return-ratio",
  });
}

/** Fixed research metrics have their disclosed study basis; saved engine results require unit-return evidence. */
export function presetMetricsPfText(kind: unknown, stats?: (ComparisonPf & { unknownReturns?: unknown }) | null): string {
  return kind === "research" ? returnPfText(stats) : unitStatsPfText(stats);
}

function measuredComparisonPf(row?: ComparisonPf | null): number | null {
  const pf = returnPf(row);
  return pf !== null &&
    row?.pfBasis === "unit-net-returns" &&
    row.pfConvention === "gross-return-ratio" &&
    row.noLoss === false &&
    typeof row.gp === "number" &&
    Number.isFinite(row.gp) &&
    row.gp >= 0 &&
    typeof row.gl === "number" &&
    Number.isFinite(row.gl) &&
    row.gl > 0
    ? pf
    : null;
}

/** Cached comparisons may predate gross-return provenance; their finite score is not a verified ratio. */
export function comparisonPfText(row?: ComparisonPf | null): string {
  if (isFlatUnitSample(row)) return "Flat (no ratio)";
  const pf = returnPf(row);
  if (pf === null)
    return typeof row?.n === "number" && row.n > 0 && row.pfBasis === "unavailable"
      ? "Basis unavailable"
      : "–";
  if (
    row?.pfBasis === "unit-net-returns" &&
    row.pfConvention === "no-loss-sentinel" &&
    row.noLoss === true &&
    typeof row.gp === "number" &&
    Number.isFinite(row.gp) &&
    row.gp > 0 &&
    row.gl === 0
  )
    return "No losses";
  return measuredComparisonPf(row) !== null
    ? pf.toFixed(2)
    : `${pf.toFixed(2)} (basis unavailable)`;
}

/** Never subtract a no-loss sentinel or a legacy score as though it were a finite return ratio. */
export function comparisonPfDelta(
  withSide?: ComparisonPf | null,
  withoutSide?: ComparisonPf | null,
): number | null {
  const withPf = measuredComparisonPf(withSide);
  const withoutPf = measuredComparisonPf(withoutSide);
  return withPf !== null && withoutPf !== null ? withPf - withoutPf : null;
}

/** Cash PF is a separately labeled reconciliation diagnostic and never substitutes for return PF. */
export function cashPf(row?: { n?: unknown; cashPf?: unknown } | null): number | null {
  return typeof row?.n === "number" &&
    row.n > 0 &&
    typeof row.cashPf === "number" &&
    Number.isFinite(row.cashPf)
    ? row.cashPf
    : null;
}

/** A measured cash ratio of four remains four unless explicit no-loss provenance identifies the sentinel. */
export function cashPfText(row?: { n?: unknown; cashPf?: unknown; cashNoLoss?: unknown } | null): string {
  const value = cashPf(row);
  if (value === null) return "–";
  return row?.cashNoLoss === true ? "No losses" : value.toFixed(2);
}

/** Paper `r` carries execution weighting; only the separately persisted field certifies its unit return. */
export function paperUnitReturn(row: { unit_r?: unknown }): number | null {
  return typeof row.unit_r === "number" && Number.isFinite(row.unit_r) ? row.unit_r : null;
}

/** One label for snapshots whose balance fields come from the exchange, or only from observed positions. */
export function accountSource(account?: { source?: string; at?: number } | null): string {
  return account?.source === "exchange"
    ? "Exchange account snapshot"
    : "Account balance unavailable";
}

/** Request identity includes the selected connection and every result filter. */
export function sameDataScope(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

/** A live ledger has no account balance level until a verified exchange baseline exists. */
export function liveBalanceUnavailable(source: unknown, balanceFrom: unknown): boolean {
  return source === "live" && balanceFrom !== "account equity";
}
