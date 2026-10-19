// The positive coordinations (docs/positive-coordinations.md): validated as positive and kept on in every change.
// A desk prints these warnings at start and on every settings patch that leaves one of them off or weaker.
import type { SignalSettings } from "./signal-config.ts";
import type { WalkForwardOptions } from "./sim/walkforward.ts";

/** the operator's signal PF evaluation */
export const SIGNAL_EVAL_MIN_PF = 1.3;

export function positiveCoordWarnings(
  s: {
    signals?: Partial<SignalSettings>;
    toggles?: { axis?: boolean; normal?: boolean; trailing?: boolean; block?: boolean; blockActive?: boolean };
    grid?: { baseTargets?: boolean };
    gates?: { baseSetsMinPf?: number; warmup?: boolean };
  },
  wf: Partial<WalkForwardOptions>,
): string[] {
  const out: string[] = [];
  const sig = s.signals;
  const c = wf.coord;
  if (sig?.enabled !== false) {
    if (!c?.enabled || !c.confirm)
      out.push("signal confirmation is off (wf.coord.enabled + confirm): unconfirmed signals lost (x01: PF 0.57 vs 7.29 confirmed)");
    if (!sig?.accept?.enabled || (sig.accept.minPf ?? 0) < SIGNAL_EVAL_MIN_PF)
      out.push(`signal acceptance below PF ${SIGNAL_EVAL_MIN_PF} or off (signals.accept)`);
    if (!sig?.sideAccept?.enabled || (sig.sideAccept.minPf ?? 0) < SIGNAL_EVAL_MIN_PF)
      out.push(`signal direction acceptance below PF ${SIGNAL_EVAL_MIN_PF} or off (signals.sideAccept)`);
    if (sig?.ownBase === false) out.push("signals do not trade their own base (signals.ownBase)");
  }
  if (c?.enabled && (c.hourLock > 0 || c.cooldown !== "off" || c.conflict))
    out.push("hour lock / cooldown / conflict blocking on: each cost net in the validation");
  if (s.toggles?.axis === false) out.push("Axis is off (profitable on both sides on x01)");
  if (s.toggles?.normal === false || s.toggles?.trailing === false)
    out.push("Normal / Trailing is off: they run by default (operator)");
  if (s.grid?.baseTargets === false)
    out.push("Base-validated targets off: a pair trades range targets Base never validated (40-50 % more cells, same passes)");
  if ((s.gates?.baseSetsMinPf ?? 1) > 1)
    out.push(
      `Base builds a pair's sets only from PF ${s.gates!.baseSetsMinPf} (gates.baseSetsMinPf): sets between PF 1 and that floor are never computed or evaluated`,
    );
  if (s.gates?.warmup === false)
    out.push(
      "the sample warm-up is off (gates.warmup): a check it cannot compute yet — a last-N drawdown, a symbol with no close, one stability block — refuses the config instead of waiting for the sample",
    );
  if (wf.seatPer === "pair") out.push("seats per pair: only the best config of each set trades (every config is its own seat by default)");
  // Trailing is built on the Normal base: with Normal and Block both off nothing trailing is executable, and a desk
  // that set "Trailing only" this way traded nothing at all (kindExecutable). The live kind list is the way to run
  // trailing alone (live.kinds), which leaves the base computing.
  if (s.toggles?.trailing && s.toggles.normal === false && !s.toggles.block)
    out.push(
      "Trailing is on with Normal and Block both off: no trailing config is executable (Trailing runs on the Normal base). Use live.kinds = [\"trailing\"] to send only Trailing to the exchange",
    );
  if (s.toggles?.blockActive) out.push("Block Active is on: only Block-raised entries open — Normal / Trailing barely run");
  return out.map((x) => `positive coordination: ${x} — docs/positive-coordinations.md`);
}
