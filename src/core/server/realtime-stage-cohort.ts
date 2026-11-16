import { isBreakRelInd } from "../indications/break-config.ts";
import { stageBaseAllowsTape, type ConfigTape, type WalkForwardOptions } from "../sim/walkforward.ts";

/** Bound the additional config × symbol × direction continuations owned by one realtime worker. */
export const REALTIME_STAGE_CONTEXT_BUDGET = 8_192;
export interface RealtimeStageCoverage {
  eligible: number;
  tracked: number;
  waiting: number;
  extraContexts: number;
  contextBudget: number;
}

/**
 * Selected and held sets always remain in the cohort. Additional Base-proven sets rotate across
 * research generations when they cannot all fit; no untracked set is reported as continuous.
 */
export function* realtimeStageCohortGen(
  tapes: readonly ConfigTape[], options: WalkForwardOptions, initial: ReadonlySet<string>, held: ReadonlySet<string>,
  mode: "all" | "break" | "off", cursor = 0, contextBudget = REALTIME_STAGE_CONTEXT_BUDGET,
  clock: () => number = () => performance.now(),
): Generator<number, { ids: Set<string>; coverage: RealtimeStageCoverage; nextCursor: number }> {
  if (!Number.isSafeInteger(contextBudget) || contextBudget < 0) throw new RangeError("invalid realtime stage budget");
  const ids = new Set(initial), candidates: ConfigTape[] = [];
  let eligible = 0, tracked = 0, visited = 0, lastYield = clock();
  for (const tp of tapes) {
    if (stageBaseAllowsTape(tp, options)) {
      eligible++;
      const admittedMode = held.has(tp.id) || mode === "all" || (mode === "break" && isBreakRelInd(tp.ind));
      if (admittedMode && ids.has(tp.id)) tracked++;
      else if (admittedMode) candidates.push(tp);
    }
    if (++visited % 128 === 0 && clock() - lastYield >= 8) { yield 0; lastYield = clock(); }
  }
  const start = candidates.length && Number.isFinite(cursor) ? Math.max(0, Math.floor(cursor)) % candidates.length : 0;
  let extraContexts = 0, considered = 0;
  while (considered < candidates.length) {
    const tp = candidates[(start + considered) % candidates.length];
    const cost = Math.max(2, tp.syms.length * 2);
    if (cost <= contextBudget && extraContexts + cost > contextBudget) break;
    considered++;
    if (cost <= contextBudget) { ids.add(tp.id); tracked++; extraContexts += cost; }
    if (considered % 128 === 0 && clock() - lastYield >= 8) { yield 0; lastYield = clock(); }
  }
  const nextCursor = candidates.length ? (start + Math.max(1, considered)) % candidates.length : 0;
  return { ids, coverage: { eligible, tracked, waiting: eligible - tracked, extraContexts, contextBudget }, nextCursor };
}
