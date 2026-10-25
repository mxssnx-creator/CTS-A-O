// Extra per-type execution multipliers. Applied after the normal sizing and Block / relation stack.
import { INDICATION_BY_ID, laneOf } from "./indications/registry.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import type { SignalVolumeFactors } from "./signal-config.ts";
import { volumeRatio } from "./volume-ratio.ts";

/** Returns the configured extra multiplier for one indication lane (1 = neutral). */
export function volumeFactorForIndication(ind: string, factors?: SignalVolumeFactors): number {
  if ((ind.startsWith("sig-coord-v1-") || ind.startsWith("sig-coord-v2-")) && isSignalCoordinationInd(ind))
    return volumeRatio(factors?.coordination);
  const lane = laneOf(ind);
  const kind = INDICATION_BY_ID.get(lane.base)?.kind;
  return kind ? volumeRatio(factors?.combined[kind]) : 1;
}

/** External sizing only. Intrinsic Axis ladder weights and all unit-return gates remain in the source tape. */
export function volumeFactorForStrategy(
  tp: {ind: string; kind: string},
  o: {indicationVolumeFactors?: SignalVolumeFactors; axisVolumeFactor?: number},
): number {
  const axis = volumeRatio(o.axisVolumeFactor);
  return volumeFactorForIndication(tp.ind, o.indicationVolumeFactors) * (tp.kind === "axis" ? axis : 1);
}
