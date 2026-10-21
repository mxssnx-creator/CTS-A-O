import type { CoreSettings } from "../config.ts";
import type { WalkForwardOptions } from "../sim/walkforward.ts";
import { tacticWarmupBars } from "../indications/filters.ts";

/** Source requirements for an explicitly extended engine window, without changing saved lane preferences. */
export function evaluationHistorySettings(
  s: CoreSettings,
  wf: Pick<WalkForwardOptions, "longH" | "preH" | "simH" | "symH">,
): CoreSettings {
  const lookH = Math.max(wf.longH, wf.preH, wf.symH ?? 0);
  // Ordinary 24h evaluation retains its configured lane histories. Longer requests must not be silently
  // clipped to 1m's 3-day / 5m's 8-day defaults, or the 45-day preference ceiling for a supported 60-day window.
  if (lookH <= 24) return s;
  const tfDays = { ...s.tfDays };
  for (const tf of s.tfs) {
    const days = Math.ceil((lookH + wf.simH + 24 + tacticWarmupBars(s.tactics) * tf / 60) / 24);
    tfDays[String(tf)] = Math.max(tfDays[String(tf)] ?? s.historyDays, days);
  }
  return { ...s, tfDays, historyDays: Math.max(...s.tfs.map((tf) => tfDays[String(tf)])) };
}
