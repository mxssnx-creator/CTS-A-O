// The desk's loss limit (scripts/core-live-test.mjs): a fixed USDT amount, a share of the wallet balance read at each
// check, or both — the larger one holds. A balance-relative limit follows the account: a deposit or a profit raises
// it, a drawdown lowers it with the balance it is measured on.

/** The loss limit in USDT (0 = none): max(fixed, pct % of the wallet balance); an unread balance keeps the fixed part. */
export function lossLimitUsd(o: { fixed: number; pct: number; wallet: number | null | undefined }): number {
  const fixed = o.fixed > 0 ? o.fixed : 0;
  const rel = o.pct > 0 && typeof o.wallet === "number" && o.wallet > 0 ? (o.pct / 100) * o.wallet : 0;
  return Math.max(fixed, rel);
}

/** How a limit reads in events and the status: "6.82 USDT (20 % of wallet 34.10)" / "2 USDT". */
export function lossLimitText(o: { fixed: number; pct: number; wallet: number | null | undefined }): string {
  const limit = lossLimitUsd(o);
  const rel = o.pct > 0 && typeof o.wallet === "number" && o.wallet > 0;
  return rel && limit > (o.fixed > 0 ? o.fixed : 0)
    ? `${limit.toFixed(2)} USDT (${o.pct} % of wallet ${o.wallet!.toFixed(2)})`
    : `${limit.toFixed(2)} USDT`;
}
