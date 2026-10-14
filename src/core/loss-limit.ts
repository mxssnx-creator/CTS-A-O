// The desk's loss limit (scripts/core-live-test.mjs): a fixed USDT amount, a share of the wallet balance at the start of
// the desk's SESSION, or both — the larger one holds. Every session counts its own losses from its own start: a launch
// (or a relaunch after a restart or a stop at the limit) starts a new budget, the run's first start does not count
// against it. The balance is the one read at the session's start, so losses that come from outside the desk lower the
// wallet but never lower the limit mid-session.

/**
 * The loss limit in USDT (0 = none): max(fixed, pct % of the session's starting wallet); an unread balance keeps the fixed
 * part. Pass the session's starting wallet as `wallet` — not a balance read at a later check.
 */
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
 * Since when a desk counts its own result against the loss limit: from this session's start, always. A session is one
 * process's life: a launch, a restart (SIGUSR2 keeps the positions but starts a new session) or a relaunch after a stop
 * at the limit. The run's first start (t0) and the last stop at the limit (lossStopAt) do not move it: before, a
 * relaunch counted the losses that had stopped the desk and stopped again at once (x01, 7 Oct 23:50), and a restart
 * kept counting a budget the operator had not set for the new session.
 */
export function sessionBaseline(sessionStartedAt: number): number {
  return sessionStartedAt;
}

/** A loss check older than this leaves the limit unverified: opening pauses until a check succeeds again. */
export const LOSS_STALE_MS = 5 * 60_000;

/**
 * The session's starting wallet from a balance read: a positive number only. A 0, an empty or a missing balance (a
 * non-USDT first row, a reply without the field) is no wallet — it is read again at the next check instead of arming a
 * limit of 0 for the whole session (bug hunt, 13 Oct).
 */
export function sessionWalletOf(v: unknown): number | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The reason opening pauses because the loss limit cannot be checked, or null (checked, or no limit set). */
export function lossGuard(o: {
  fixed: number;
  pct: number;
  wallet: number | null | undefined;
  /** the last successful loss check */
  lastOkAt: number;
  now: number;
  staleMs?: number;
}): string | null {
  const fixed = o.fixed > 0;
  if (!fixed && !(o.pct > 0)) return null;
  if (!fixed && !(typeof o.wallet === "number" && o.wallet > 0))
    return "loss limit unverified: the session's starting wallet is not read yet";
  if (o.now - o.lastOkAt > (o.staleMs ?? LOSS_STALE_MS))
    return `loss limit unverified: no successful check for over ${Math.round((o.staleMs ?? LOSS_STALE_MS) / 60_000)} min`;
  return null;
}

/** A pause set by lossGuard (lifted by the next successful check), not by a loss. */
export const isLossGuardPause = (p: unknown): boolean => typeof p === "string" && p.startsWith("loss limit unverified");
