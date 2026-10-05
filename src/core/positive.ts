// The positive coordinations (docs/positive-coordinations.md): validated as positive and kept on in every change.
// A desk prints these warnings at start and on every settings patch that leaves one of them off or weaker.
import type { SignalSettings } from "./signal-config.ts";
import type { WalkForwardOptions } from "./sim/walkforward.ts";

/** the operator's signal PF evaluation */
export const SIGNAL_EVAL_MIN_PF = 1.3;

export function positiveCoordWarnings(
  s: { signals?: Partial<SignalSettings>; toggles?: { axis?: boolean } },
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
  return out.map((x) => `positive coordination: ${x} — docs/positive-coordinations.md`);
}
