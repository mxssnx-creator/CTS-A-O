import { isSignalInd } from "../indications/registry.ts";
import type { ConfigTape } from "../sim/walkforward.ts";

export interface StrategyCoverageRow {
  engine: number;
  signals: number;
  /** Included in the source counts; retained only to manage an existing holding. */
  heldOnly: number;
  /** Included in the source counts; carried from an earlier compute under memory fallback. */
  carried: number;
}

export interface StrategyCoverage {
  completedAt: number;
  through: number;
  total: number;
  byKind: Record<string, StrategyCoverageRow>;
}

/** Count only tapes in the cohort that will be published, including held-only and carried tapes explicitly. */
export function* strategyCoverageGen(
  tapes: readonly Pick<ConfigTape, "ind" | "kind" | "heldOnly" | "carried">[],
): Generator<void, Pick<StrategyCoverage, "total" | "byKind">> {
  const byKind: Record<string, StrategyCoverageRow> = Object.create(null);
  let n = 0;
  for (const tape of tapes) {
    const row = (byKind[tape.kind] ??= { engine: 0, signals: 0, heldOnly: 0, carried: 0 });
    if (isSignalInd(tape.ind)) row.signals++;
    else row.engine++;
    if (tape.heldOnly) row.heldOnly++;
    if (tape.carried) row.carried++;
    if ((++n & 255) === 0) yield;
  }
  return { total: tapes.length, byKind };
}
