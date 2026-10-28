import { profitFactor, type TradeLike } from "../metrics/stats.ts";
import type { BaseLastNStats } from "../domain/types.ts";

/** Call with closes in stable exit/entry order and no observations after the Base cut. */
export function baseLastNOf(trades: readonly TradeLike[], requested: number, stop: number): BaseLastNStats | undefined {
  if (!(Number.isSafeInteger(requested) && requested >= 0)) throw new RangeError("invalid Base last-N");
  if (requested === 0) return undefined;
  const selected = trades.slice(-requested);
  // An unknown or out-of-order timestamp anywhere in the source makes its most-recent window unknowable.
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i], previous = trades[i - 1];
    if (!(Number.isFinite(t.entryT) && Number.isFinite(t.exitT) && t.exitT >= t.entryT) ||
      (previous && (t.exitT < previous.exitT || (t.exitT === previous.exitT && t.entryT < previous.entryT))))
      return { requested, n: selected.length, gp: 0, gl: 0, stop: 0, invalid: true };
  }
  let gp = 0, gl = 0;
  for (const trade of selected) {
    if (!Number.isFinite(trade.r)) return { requested, n: selected.length, gp: 0, gl: 0, stop, invalid: true };
    gp += Math.max(0, trade.r); gl += Math.max(0, -trade.r);
  }
  gp *= 100; gl *= 100;
  if (!(Number.isFinite(gp) && Number.isFinite(gl) && Number.isFinite(stop) && stop >= 0))
    return { requested, n: selected.length, gp: 0, gl: 0, stop: 0, invalid: true };
  return { requested, n: selected.length, gp, gl, stop };
}

/** Apply the existing last-N sample-floor rule without silently qualifying unknown or stale evidence. */
export function passesBaseLastN(
  total: number,
  recent: BaseLastNStats | undefined,
  gates: { baseLastN?: number; lastNFloor?: number; minPf: number; lossPrior?: boolean },
): boolean {
  const requested = gates.baseLastN ?? 0;
  if (requested === 0) return true;
  if (!(Number.isSafeInteger(requested) && requested > 0 && Number.isSafeInteger(total) && total >= 0) ||
    !recent || recent.invalid || recent.requested !== requested || recent.n !== Math.min(total, requested) ||
    !(Number.isFinite(recent.gp) && recent.gp >= 0 && Number.isFinite(recent.gl) && recent.gl >= 0 &&
      Number.isFinite(recent.stop) && recent.stop >= 0)) return false;
  if (recent.n < requested && (!(gates.lastNFloor && gates.lastNFloor > 0) || recent.n < gates.lastNFloor)) return false;
  const pf = profitFactor(recent.gp, recent.gl + (gates.lossPrior ? recent.stop : 0));
  return Number.isFinite(pf) && pf >= gates.minPf;
}
