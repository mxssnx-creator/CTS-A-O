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

/**
 * Since when a desk counts its own result against the loss limit. A restart (a deploy) continues the run: the loss
 * counts from the run's first start (t0). A stop AT the loss limit ends that budget: the desk records when
 * (`lossStopAt` in its start file), and a launch after it counts from there — before, the relaunch the operator
 * asked for counted the losses that had stopped the desk and stopped again at once (x01, 7 Oct 23:50).
 */
export function lossBaseline(start: { t0: number; lossStopAt?: number | null }): number {
  const s = Number(start.lossStopAt);
  return Number.isFinite(s) && s > start.t0 ? s : start.t0;
}
