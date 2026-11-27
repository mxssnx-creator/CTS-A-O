import { blockPolicyKey, blockRequired, type BlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import { checkedProcessedWindowGrid, count, countBlockedParent, coverage, finishCoverage, furthestProcessedDecision, type ProcessedBaseCheck,
  type ProcessedReplayContext, type ProcessedReplayPolicy, type ProcessedReplaySummary, type ReplayContext,
  type ReplayEntry } from "./processed-replay.ts";
import { appendProcessedHistory, isOppositeMainWindow, processedAdmission, PROCESSED_AUTO_PF_SAMPLES, processedWindowEconomics, ProcessedWindowIndex,
  type ProcessedHistoryRow, type ProcessedOpen, type ProcessedStageDecision, type ProcessedVerdict } from "./processed-set.ts";
import { negativeLastN } from "../negative-last-n.ts";

const stages = ["base", "validation", "real", "exec"] as const;
const ownedStage = ["postBase", "validated", "real", "active"] as const;
const empty: readonly ProcessedHistoryRow[] = Object.freeze([]);
const insufficient: ProcessedVerdict = { state: "insufficient", n: 0, pf: null };

interface Window {
  block: BlockPolicy;
  key: string;
  size: number;
  bit: bigint;
  opposite: boolean;
}
interface Group {
  /** Choices sharing economically identical history and children at this parent. */
  mask: bigint;
  count: number;
  history: readonly ProcessedHistoryRow[];
  children?: Group[];
}
interface Accepted {
  mask: bigint;
  children?: Accepted[];
}
interface EntryPlan {
  accepted: Accepted[];
  best: ProcessedStageDecision;
  oppositeSourceMissing: number;
}
interface StageScan {
  mask: bigint;
  missing: number;
}
interface Context {
  groups?: Group[];
  directT?: number;
  oppositeT?: number;
}
export interface OppositeProcessedSource extends ReplayContext {
  base?: ProcessedBaseCheck;
}
interface AcceptedPath {
  key: string;
  plan: EntryPlan;
  inverse: boolean;
}
const contextKey = (tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number) =>
  JSON.stringify([tp.id, tp.kind, tp.ind, symbol, side, minPf]);
function popcount(mask: bigint): number {
  let count = 0;
  while (mask) { mask &= mask - 1n; count++; }
  return count;
}

/**
 * Evaluates a Cartesian grid without constructing full paths. Each child owns only settlements
 * admitted by its immediate parent. Choices stay grouped while they admit identical events.
 * Settlement splits a group using the frozen entry mask and copies its history once, even when
 * several choices reached the same outcome. Readiness never depends on a later close or sibling.
 */
export class ProcessedWindowGridReplay {
  readonly checksBase = true;
  readonly usesOppositeSource: boolean;
  private readonly levels: Window[][];
  private readonly initial: Group[][];
  private readonly capacity: number;
  private readonly negative;
  private readonly contexts = new Map<string, Context>();
  private readonly open = new WeakMap<ProcessedStageDecision, { entryT: number; paths: AcceptedPath[] }>();
  private clock = -1;
  private missing = 0;
  private inverseEntries = 0;
  private inverseExecEntries = 0;
  private pending?: { key: string; at: number; base?: ProcessedBaseCheck; source?: OppositeProcessedSource;
    paths: AcceptedPath[]; best: ProcessedStageDecision | null };

  private readonly policy: ProcessedReplayPolicy;

  constructor(policy: ProcessedReplayPolicy) {
    this.policy = policy;
    const grid = checkedProcessedWindowGrid(policy);
    this.negative = negativeLastN(policy.negativeFilter);
    this.levels = stages.map(stage => grid[stage].map((block, i) => ({ block, key: blockPolicyKey(block),
      size: blockRequired(block), bit: 1n << BigInt(i), opposite: stage === "validation" && isOppositeMainWindow(block),
    })).sort((a, b) => a.size - b.size));
    this.usesOppositeSource = this.levels[1].some(window => window.opposite);
    this.initial = this.levels.map(level => [{ mask: (1n << BigInt(level.length)) - 1n, count: level.length, history: empty }]);
    this.capacity = Math.max(...this.levels.flatMap(level => level.map(window => window.size)), ...this.negative?.windows ?? []) +
      (policy.autoPf ? PROCESSED_AUTO_PF_SAMPLES : 0);
  }

  private baseMask(base?: ProcessedBaseCheck): bigint {
    if (!base) return 0n;
    const auto = this.policy.autoBase === false ? undefined : this.policy.autoPf;
    const available = base.available?.() ?? Infinity;
    const windows = this.levels[0];
    if (available < windows[0].size) return 0n;
    const capacity = windows.at(-1)!.size + (auto ? PROCESSED_AUTO_PF_SAMPLES : 0);
    const check = base.prepare?.(capacity, auto);
    let root = 0n;
    for (const window of windows) {
      if (window.size > available) break;
      if (check ? check(window.block, window.key) : base(window.block, auto, "context")) root |= window.bit;
    }
    return root;
  }

  private plan(key: string, at: number, minPf: number, base: ProcessedBaseCheck | undefined,
    inverse: boolean, oppositeAvailable: boolean): EntryPlan | null {
    const existing = this.contexts.get(key)?.groups;
    // An opposite order can only open a Main child. It cannot warm up a cold Base parent.
    if (inverse && !existing) return null;
    const root = this.baseMask(base);
    let plan: EntryPlan | null = null;
    if (root) {
      const result: EntryPlan = { accepted: [], best: { stage: "postBase", validation: insufficient, real: null, exec: null },
        oppositeSourceMissing: 0 };
      let deepest = 0;
      const indexes = new Map<readonly ProcessedHistoryRow[], { view: ProcessedWindowIndex; scans: StageScan[] }>();
      const decide = (depth: number, parent: Group, path: ProcessedVerdict[], multiplicity: number) => {
        if (!parent.history.length) return undefined;
        let indexed = indexes.get(parent.history);
        if (!indexed) {
          indexed = { view: new ProcessedWindowIndex(parent.history, at, this.capacity, minPf, this.policy.autoPf, this.negative), scans: [] };
          indexes.set(parent.history, indexed);
        }
        const { view, scans } = indexed;
        let scan = scans[depth];
        if (!scan) {
          scan = { mask: 0n, missing: 0 };
          for (const window of this.levels[depth]) {
            if (window.size > view.size) break;
            if (!view.qualifies(window.block, window.key)) continue;
            if (depth === 1 && window.opposite !== inverse) {
              if (!inverse && !oppositeAvailable) scan.missing++;
            } else scan.mask |= window.bit;
          }
          scans[depth] = scan;
        }
        result.oppositeSourceMissing += scan.missing * multiplicity;
        if (!scan.mask) return undefined;
        if (depth === this.levels.length - 1) {
          // Exec has no child to update. Only the qualifying receipt is needed for funding.
          if (depth > deepest) {
            const sample = this.levels[depth].find(window => (window.bit & scan.mask) !== 0n)!;
            deepest = depth;
            result.best = { stage: "active", validation: path[0], real: path[1], exec: view.evaluate(sample.block, sample.key) };
          }
          return undefined;
        }
        const children: Accepted[] = [];
        for (const group of parent.children ?? this.initial[depth]) {
          const mask = group.mask & scan.mask;
          if (!mask) continue;
          const needReceipt = deepest < this.levels.length - 1;
          if (needReceipt) {
            const sample = this.levels[depth].find(window => (window.bit & mask) !== 0n)!;
            path.push(view.evaluate(sample.block, sample.key));
          }
          if (depth > deepest) {
            deepest = depth;
            result.best = { stage: ownedStage[depth], validation: path[0],
              real: path[1] ?? insufficient, exec: path[2] ?? (depth === 2 ? insufficient : null) };
          }
          const next = decide(depth + 1, group, path, multiplicity * (mask === group.mask ? group.count : popcount(mask)));
          children.push({ mask, children: next });
          if (needReceipt) path.pop();
        }
        return children;
      };
      for (const group of existing ?? this.initial[0]) {
        const mask = group.mask & root;
        if (!mask) continue;
        const children = decide(1, group, [], mask === group.mask ? group.count : popcount(mask));
        if (!inverse || children?.length) result.accepted.push({ mask, children });
      }
      if (result.accepted.length) plan = result;
    }
    return plan;
  }

  private prepare(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, at: number, minPf: number,
    base?: ProcessedBaseCheck, source?: OppositeProcessedSource) {
    if (!Number.isFinite(at) || at < 0 || at < this.clock || !Number.isFinite(minPf) || minPf <= 1)
      throw new RangeError("invalid processed window grid decision");
    if (source && (source.symbol !== symbol || source.side !== -side || source.tp.id === tp.id ||
        !Number.isFinite(source.minPf) || source.minPf <= 1))
      throw new Error("opposite Main requires a separate configuration on the same market onset");
    const key = contextKey(tp, symbol, side, minPf);
    if (this.pending?.key === key && this.pending.at === at && this.pending.base === base && this.pending.source === source)
      return this.pending;
    const paths: AcceptedPath[] = [];
    const direct = this.plan(key, at, minPf, base, false, source !== undefined);
    if (direct) paths.push({ key, plan: direct, inverse: false });
    if (source) {
      const own = contextKey(source.tp, symbol, source.side, source.minPf);
      const opposite = this.plan(own, at, source.minPf, source.base, true, true);
      if (opposite) paths.push({ key: own, plan: opposite, inverse: true });
    }
    const best = paths.length ? furthestProcessedDecision(paths.map(path => path.plan.best)) : null;
    return this.pending = { key, at, base, source, paths, best };
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, at: number, minPf: number,
    base?: ProcessedBaseCheck, source?: OppositeProcessedSource): ProcessedStageDecision | null {
    return this.prepare(tp, symbol, side, at, minPf, base, source).best;
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, at: number, minPf: number,
    base?: ProcessedBaseCheck, source?: OppositeProcessedSource, allowExec = true): ProcessedStageDecision {
    const { best, paths } = this.prepare(tp, symbol, side, at, minPf, base, source);
    if (!best) throw new Error("no Base-qualified processed window");
    for (const { key, inverse } of paths) {
      if (this.contexts.get(key)?.[inverse ? "oppositeT" : "directT"] === at)
        throw new Error("duplicate processed window grid entry");
    }
    for (const { key, plan, inverse } of paths) {
      let context = this.contexts.get(key);
      if (!context) { context = {}; this.contexts.set(key, context); }
      context[inverse ? "oppositeT" : "directT"] = at;
      this.missing += plan.oppositeSourceMissing;
      if (inverse) {
        this.inverseEntries++;
        if (allowExec && plan.best.stage === "active") this.inverseExecEntries++;
      }
    }
    this.clock = at;
    const admission = processedAdmission(best, allowExec);
    this.open.set(admission, { entryT: at, paths });
    this.pending = undefined;
    return admission;
  }

  settle(opened: ProcessedOpen | ProcessedStageDecision | ReplayEntry, at: number, value: number | null): void {
    const order = this.open.get(opened);
    if (!order || !Number.isFinite(at) || at < order.entryT || at < this.clock)
      throw new Error("invalid processed window grid settlement");
    this.clock = at;
    this.open.delete(opened);
    this.pending = undefined;
    const row = { exitT: at, unitReturn: value !== null && Number.isFinite(value) ? value : null };
    const changed = new Map<readonly ProcessedHistoryRow[], ProcessedHistoryRow[]>();
    const append = (old: readonly ProcessedHistoryRow[]) => {
      let next = changed.get(old);
      if (!next) {
        next = old.slice();
        appendProcessedHistory(next, row, this.capacity);
        changed.set(old, next);
      }
      return next;
    };
    const apply = (groups: Group[] | undefined, accepted: Accepted[], depth: number, inverse: boolean): Group[] => {
      const next: Group[] = [];
      for (const group of groups ?? this.initial[depth]) {
        let remaining = group.mask;
        for (const lane of accepted) {
          const mask = remaining & lane.mask;
          if (!mask) continue;
          // The accepted Exec order is already in the funded replay ledger. No stage reads an Exec
          // history, so the final frontier never needs a second copy of those closes.
          const children = depth + 1 < ownedStage.length - 1 && lane.children
            ? apply(group.children, lane.children, depth + 1, inverse) : group.children;
          const history = depth === 0 && inverse ? group.history : append(group.history);
          next.push({ mask, count: mask === group.mask ? group.count : popcount(mask), history, children });
          remaining ^= mask;
          if (!remaining) break;
        }
        if (remaining) next.push(remaining === group.mask ? group : { ...group, mask: remaining, count: popcount(remaining) });
      }
      return next;
    };
    for (const { key, plan, inverse } of order.paths) {
      const context = this.contexts.get(key)!;
      context.groups = apply(context.groups, plan.accepted, 0, inverse);
    }
  }

  *reportGen(at: number, contexts: () => Iterable<ReplayContext>): Generator<number, ProcessedReplaySummary> {
    if (at < this.clock) throw new Error("processed window grid report precedes its settlements");
    const gates = [coverage(), coverage(), coverage()];
    const byDepth = [1];
    for (const level of this.levels) byDepth.push(byDepth.at(-1)! * level.length);
    let countContexts = 0, yieldedAt = performance.now();
    for (const { tp, symbol, side, minPf, baseAt } of contexts()) {
      countContexts++;
      const rows = this.contexts.get(contextKey(tp, symbol, side, minPf));
      const visit = (depth: number, groups: Group[] | undefined, multiplicity: number, eligible: bigint) => {
        if (!groups || !eligible || depth >= gates.length) return;
        for (const group of groups) {
          const mask = group.mask & eligible;
          if (!mask || !group.history.length) continue;
          const represented = multiplicity * (mask === group.mask ? group.count : popcount(mask));
          const view = new ProcessedWindowIndex(group.history, at, this.capacity, minPf, this.policy.autoPf, this.negative);
          let pass = 0n;
          for (const window of this.levels[depth + 1]) {
            let proof = view.evaluate(window.block, window.key);
            if (depth === 0 && proof.state === "qualified" && window.opposite && rows?.oppositeT === undefined)
              proof = { ...proof, state: "unknown", pf: null, unavailable: "opposite-main-source" };
            if (proof.state === "qualified") pass |= window.bit;
            count(gates[depth], proof, window.size, () => processedWindowEconomics(group.history, window.size, at), represented);
          }
          visit(depth + 1, group.children, represented, pass);
        }
      };
      if (rows?.groups) {
        const eligible = baseAt ? this.baseMask(baseAt()) : this.initial[0][0].mask;
        if (baseAt) countBlockedParent(gates[0], (this.levels[0].length - popcount(eligible)) * this.levels[1].length);
        visit(0, rows.groups, 1, eligible);
      }
      if (countContexts % 32 === 0 && performance.now() - yieldedAt > 8) { yield -15; yieldedAt = performance.now(); }
    }
    for (let i = 0; i < gates.length; i++) {
      const row = gates[i], possible = countContexts * byDepth[i + 2];
      const reachable = i === 0 ? possible : gates[i - 1].qualified * this.levels[i + 1].length;
      const missing = reachable - row.contexts;
      if (!Number.isSafeInteger(missing) || missing < 0) throw new RangeError("processed window grid coverage exceeds integer precision");
      row.contexts += missing;
      row.insufficient += missing;
      row.passingWindows.evaluated += missing;
      const blocked = possible - reachable;
      if (!Number.isSafeInteger(possible) || blocked < 0) throw new RangeError("processed window grid coverage exceeds integer precision");
      countBlockedParent(row, blocked);
      finishCoverage(row);
    }
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction-window-path", seededFromCandidates: false,
      validation: gates[0], real: gates[1], exec: gates[2],
      windowGrid: { choices: { base: this.levels[0].length, validation: this.levels[1].length,
        real: this.levels[2].length, exec: this.levels[3].length }, oppositeSourceMissing: this.missing,
          inverseEntries: this.inverseEntries, inverseExecEntries: this.inverseExecEntries } };
  }
}
