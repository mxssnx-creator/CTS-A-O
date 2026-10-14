/** The user's primary PF metric: net returns after costs, independent of account size or order notional. */
export function returnPf(row?: { n?: unknown; pf?: unknown } | null): number | null {
  return typeof row?.n === "number" && row.n > 0 &&
    typeof row.pf === "number" && Number.isFinite(row.pf)
    ? row.pf
    : null;
}

/** The finite engine sentinel is a ranking convention, not an exact ratio when the sample has no losses. */
export function returnPfText(row?: { n?: unknown; pf?: unknown; noLoss?: unknown } | null): string {
  const value = returnPf(row);
  if (value === null) return "–";
  return row?.noLoss === true ? "No losses" : value.toFixed(2);
}

/** Cash PF is a separately labeled reconciliation diagnostic and never substitutes for return PF. */
export function cashPf(row?: { n?: unknown; cashPf?: unknown } | null): number | null {
  return typeof row?.n === "number" && row.n > 0 &&
    typeof row.cashPf === "number" && Number.isFinite(row.cashPf)
    ? row.cashPf
    : null;
}

/** One label for snapshots whose balance fields come from the exchange, or only from observed positions. */
export function accountSource(account?: { source?: string; at?: number } | null): string {
  return account?.source === "exchange" ? "Exchange account snapshot" : "Account balance unavailable";
}

/** Request identity includes the selected connection and every result filter. */
export function sameDataScope(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

/** A live ledger has no account balance level until a verified exchange baseline exists. */
export function liveBalanceUnavailable(source: unknown, balanceFrom: unknown): boolean {
  return source === "live" && balanceFrom !== "account equity";
}
