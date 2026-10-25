import { gateMinimalPlus } from "../minimal-coord.ts";
import type { ConfigTape, TapeBuildStat } from "../sim/walkforward.ts";
import { withHistoryMetadata } from "./history-store.server.ts";

/** Publish the range gate without losing held ownership or conflating built and eligible sets. */
export function publishMinimalPlus(
  input: readonly ConfigTape[],
  stats: readonly TapeBuildStat[],
  plus: Parameters<typeof gateMinimalPlus>[1],
  before: number,
  heldIds: ReadonlySet<string>,
  probe = false,
): { tapes: ConfigTape[]; buildStats: TapeBuildStat[] } {
  const passed = new Set(probe ? input : gateMinimalPlus(input, plus, before));
  const key = (ind: string, tag: string, kind: string) => JSON.stringify([ind, tag, kind]);
  const rejected = new Map<string, number>();
  const tapes: ConfigTape[] = [];
  for (const tape of input) {
    if (passed.has(tape)) { tapes.push(tape); continue; }
    if (!tape.heldOnly && !tape.carried) {
      const k = key(tape.ind, tape.protect.tag ?? "", tape.kind);
      rejected.set(k, (rejected.get(k) ?? 0) + 1);
    }
    if (tape.heldOnly || heldIds.has(tape.id))
      tapes.push(tape.heldOnly ? tape : withHistoryMetadata(tape, { heldOnly: true }));
  }
  const buildStats = stats.map(stat => {
    const k = key(stat.ind, stat.tag, stat.kind);
    const postGateRejected = rejected.get(k) ?? 0;
    rejected.delete(k);
    if (postGateRejected > stat.kept) throw new Error("Minimal Plus rejection exceeds built retained sets");
    return { ...stat, postGateRejected };
  });
  if (rejected.size) throw new Error("Minimal Plus rejection has no matching build record");
  return { tapes, buildStats };
}
