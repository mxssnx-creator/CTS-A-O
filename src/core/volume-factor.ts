// Extra per-type execution multipliers. Applied after the normal sizing and Block / relation stack.
import { INDICATION_BY_ID, laneOf } from "./indications/registry.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import type { SignalVolumeFactors } from "./signal-config.ts";

const factorOf = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.min(22, Math.max(1, Math.round(value!))) : fallback;

/** Returns the configured extra multiplier for one indication lane (1 = neutral). */
export function volumeFactorForIndication(ind: string, factors?: SignalVolumeFactors): number {
  if (ind.startsWith("sig-coord-v1-") && isSignalCoordinationInd(ind))
    return factorOf(factors?.coordination, 8);
  const lane = laneOf(ind);
  if (!lane.combined) return 1;
  const kind = INDICATION_BY_ID.get(lane.base)?.kind;
  return kind ? factorOf(factors?.combined[kind], 1) : 1;
}
