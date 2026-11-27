import { blockPolicyKey, blockRequired, type BlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import { checkedProcessedWindowGrid, count, countBlockedParent, coverage, finishCoverage, furthestProcessedDecision, type ProcessedBaseCheck,
  type PreparedProcessedBaseCheck, type ProcessedReplayContext, type ProcessedReplayPolicy, type ProcessedReplaySummary, type ReplayContext,
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
  /** Direct Base×Exec Set pairs actually qualified at this candidate. */
  directPairs?: number[];
}
interface EntryPlan {
  accepted: Accepted[];
  best: ProcessedStageDecision;
  oppositeSourceMissing: number;
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
interface DirectExecStats {
  openedOrders: number;
  settledOrders: number;
  wins: number;
  losses: number;
  unknownReturns: number;
  grossProfit: number;
  grossLoss: number;
  hourly: Map<number, { orders: number; net: number }>;
}
interface DirectContextStats {
  evaluatedContexts: number;
  baseQualifiedContexts: number;
  qualifiedContexts: number;
  insufficientContexts: number;
  failedContexts: number;
  parentBlockedContexts: number;
}
const emptyDirectExecStats = (): DirectExecStats => ({ openedOrders: 0, settledOrders: 0,
  wins: 0, losses: 0, unknownReturns: 0, grossProfit: 0, grossLoss: 0, hourly: new Map() });
function bitIndex(bit: bigint): number {
  let index = 0;
  while (bit > 1n) { bit >>= 1n; index++; }
  return index;
}
const contextKey = (tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number) =>
  JSON.stringify([tp.id, tp.kind, tp.ind, symbol, side, minPf]);
const directPathKey = (key: string, pair: number) => JSON.stringify([key, pair]);
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
  private readonly directExec: boolean;
  private readonly contexts = new Map<string, Context>();
  private readonly open = new WeakMap<ProcessedStageDecision, { entryT: number; paths: AcceptedPath[];
    directPairs?: Array<{ key: string; pair: number }> }>();
  private readonly directBaseBlocks: readonly BlockPolicy[];
  private readonly directExecBlocks: readonly BlockPolicy[];
  private readonly directBaseStats = new Map<number, { evaluated: number; passed: number; insufficient: number; failed: number }>();
  private readonly directStats = new Map<number, DirectExecStats>();
  /** A separate rolling history for every exact config×symbol×side×Base×Exec lane. */
  private readonly directHistories = new Map<string, readonly ProcessedHistoryRow[]>();
  private clock = -1;
  private missing = 0;
  private inverseEntries = 0;
  private inverseExecEntries = 0;
  private pending?: { key: string; at: number; base?: ProcessedBaseCheck; source?: OppositeProcessedSource;
    paths: AcceptedPath[]; best: ProcessedStageDecision | null };

  private readonly policy: ProcessedReplayPolicy;

  constructor(policy: ProcessedReplayPolicy) {
    this.policy = policy;
    this.directExec = policy.directExec === true;
    const grid = checkedProcessedWindowGrid(policy);
    this.negative = negativeLastN(policy.negativeFilter);
    const windowsFor = (stage: typeof stages[number]): readonly BlockPolicy[] => {
      if (this.directExec && (stage === "validation" || stage === "real")) return [];
      if (stage === "base") return grid.base;
      if (stage === "exec") return grid.exec;
      return "validation" in grid ? grid[stage] : [];
    };
    this.levels = stages.map(stage => windowsFor(stage).map((block, i) => ({ block, key: blockPolicyKey(block),
      size: blockRequired(block), bit: 1n << BigInt(i), opposite:
        stage === "validation" && isOppositeMainWindow(block),
    })).sort((a, b) => a.size - b.size));
    this.directBaseBlocks = this.levels[0].map(window => window.block);
    this.directExecBlocks = this.levels[3].map(window => window.block);
    this.usesOppositeSource = !this.directExec && this.levels[1].some(window => window.opposite);
    this.initial = this.levels.map(level => [{ mask: (1n << BigInt(level.length)) - 1n, count: level.length, history: empty }]);
    this.capacity = Math.max(...this.levels.flatMap(level => level.map(window => window.size)), ...this.negative?.windows ?? []) +
      (policy.autoPf ? PROCESSED_AUTO_PF_SAMPLES : 0);
  }

  private plan(key: string, at: number, minPf: number, base: ProcessedBaseCheck | undefined,
    inverse: boolean, oppositeAvailable: boolean): EntryPlan | null {
    let root = 0n;
    let check: PreparedProcessedBaseCheck | undefined;
    if (base) {
      const auto = this.policy.autoBase === false ? undefined : this.policy.autoPf;
      const available = base.available?.() ?? Infinity;
      const maxBase = this.levels[0].at(-1)!.size;
      const baseMinPf = this.directExec ? this.policy.directBaseMinPf : undefined;
      check = base.prepare?.(maxBase + (auto ? PROCESSED_AUTO_PF_SAMPLES : 0), auto, baseMinPf);
      if (this.directExec) {
        for (const window of this.levels[0]) {
          const index = bitIndex(window.bit);
          const stats = this.directBaseStats.get(index) ?? { evaluated: 0, passed: 0, insufficient: 0, failed: 0 };
          stats.evaluated++;
          if (window.size > available) stats.insufficient++;
          else if (check ? check(window.block, window.key) : base(window.block, auto, "context", baseMinPf)) {
            root |= window.bit;
            stats.passed++;
          } else stats.failed++;
          this.directBaseStats.set(index, stats);
        }
      } else if (available >= this.levels[0][0].size) {
        for (const window of this.levels[0]) {
          if (window.size > available) break;
          if (check ? check(window.block, window.key) : base(window.block, auto, "context", baseMinPf)) root |= window.bit;
        }
      }
    }
    let plan: EntryPlan | null = null;
    if (root) {
      const result: EntryPlan = { accepted: [], best: { stage: "postBase", validation: insufficient, real: null, exec: null },
        oppositeSourceMissing: 0 };
      if (this.directExec) {
        const execMinPf = this.policy.directExecMinPf ?? minPf;
        const execAuto = this.policy.autoPf;
        let receipt: ProcessedVerdict | undefined;
        const directPairs: number[] = [];
        for (const baseWindow of this.levels[0]) {
          if (!(root & baseWindow.bit)) continue;
          const seed = check?.history?.(baseWindow.block, baseWindow.key);
          for (const execWindow of this.levels[3]) {
            const pair = bitIndex(baseWindow.bit) * this.directExecBlocks.length + bitIndex(execWindow.bit);
            const historyKey = directPathKey(key, pair);
            const history = this.directHistories.get(historyKey) ?? seed;
            if (!history?.length) continue;
            const view = new ProcessedWindowIndex(history, at, this.capacity, execMinPf, execAuto, this.negative);
            const proof = view.evaluate(execWindow.block, execWindow.key);
            if (proof.state !== "qualified") continue;
            if (!this.directHistories.has(historyKey)) this.directHistories.set(historyKey, history.slice());
            directPairs.push(pair);
            receipt ??= proof;
          }
          if (directPairs.length) result.accepted.push({ mask: baseWindow.bit, directPairs: directPairs.splice(0) });
        }
        if (receipt) result.best = { stage: "active", validation: insufficient, real: insufficient, exec: receipt };
        if (result.accepted.length) plan = result;
      } else {
      let deepest = 0;
      const indexes = new Map<readonly ProcessedHistoryRow[], ProcessedWindowIndex>();
      const decide = (depth: number, parent: Group, path: ProcessedVerdict[], multiplicity: number) => {
        if (!parent.history.length || depth >= this.levels.length) return undefined;
        let view = indexes.get(parent.history);
        if (!view) {
          view = new ProcessedWindowIndex(parent.history, at, this.capacity, minPf, this.policy.autoPf, this.negative);
          indexes.set(parent.history, view);
        }
        let passed = 0n;
        let receipt: ProcessedVerdict | undefined;
        for (const window of this.levels[depth]) {
          if (window.size > view.size) break;
          if (!view.qualifies(window.block, window.key)) continue;
          if (depth === 1 && window.opposite !== inverse) {
            if (!inverse && !oppositeAvailable) result.oppositeSourceMissing += multiplicity;
            continue;
          }
          receipt ??= view.evaluate(window.block, window.key);
          passed |= window.bit;
        }
        if (!receipt) return undefined;
        const children: Accepted[] = [];
        for (const group of parent.children ?? this.initial[depth]) {
          const mask = group.mask & passed;
          if (!mask) continue;
          // Each direct sibling uses the same stage floor policy. Window receipts are
          // materialized here for the reported furthest stage, never used as another gate's input.
          const sample = this.levels[depth].find(window => (window.bit & mask) !== 0n)!;
          const own = receipt.blockPolicyKey === sample.key ? receipt : view.evaluate(sample.block, sample.key);
          path.push(own);
          if (depth > deepest) {
            deepest = depth;
            result.best = { stage: ownedStage[depth], validation: path[0],
              real: path[1] ?? insufficient, exec: path[2] ?? (depth === 2 ? insufficient : null) };
          }
          const next = decide(depth + 1, group, path, multiplicity * popcount(mask));
          children.push({ mask, children: next });
          path.pop();
        }
        return children;
      };
      for (const group of this.contexts.get(key)?.groups ?? this.initial[0]) {
        const mask = group.mask & root;
        if (!mask) continue;
        const children = decide(1, group, [], popcount(mask));
        if (!inverse || children?.length) result.accepted.push({ mask, children });
      }
      if (result.accepted.length) plan = result;
      }
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
    const directPairs = this.directExec && allowExec && best.stage === "active"
      ? [...new Map(paths.flatMap(({ key, plan }) => plan.accepted.flatMap(lane => (lane.directPairs ?? [])
          .map(pair => [`${key}:${pair}`, { key, pair }] as const)))).values()]
      : [];
    for (const { pair } of directPairs) {
      const stats = this.directStats.get(pair) ?? emptyDirectExecStats();
      stats.openedOrders++;
      this.directStats.set(pair, stats);
    }
    this.open.set(admission, { entryT: at, paths, ...(directPairs.length && { directPairs }) });
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
    for (const { key, pair } of order.directPairs ?? []) {
      const stats = this.directStats.get(pair) ?? emptyDirectExecStats();
      stats.settledOrders++;
      if (row.unitReturn === null) stats.unknownReturns++;
      else {
        if (row.unitReturn > 0) { stats.wins++; stats.grossProfit += row.unitReturn; }
        else if (row.unitReturn < 0) { stats.losses++; stats.grossLoss -= row.unitReturn; }
        const hour = Math.floor((at - 1) / 3_600_000) * 3_600_000;
        const summary = stats.hourly.get(hour) ?? { orders: 0, net: 0 };
        summary.orders++;
        summary.net += row.unitReturn;
        stats.hourly.set(hour, summary);
      }
      this.directStats.set(pair, stats);
      const prior = this.directHistories.get(directPathKey(key, pair));
      if (prior) {
        const next = prior.slice();
        appendProcessedHistory(next, row, this.capacity);
        this.directHistories.set(directPathKey(key, pair), next);
      }
    }
    if (this.directExec) return;
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
    if (this.directExec) return yield* this.reportDirectExecGen(at, contexts);
    const gates = [coverage(), coverage(), coverage()];
    const byDepth = [1];
    for (const level of this.levels) byDepth.push(byDepth.at(-1)! * level.length);
    let countContexts = 0, yieldedAt = performance.now();
    for (const { tp, symbol, side, minPf } of contexts()) {
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
      visit(0, rows?.groups, 1, this.initial[0][0].mask);
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

  private *reportDirectExecGen(at: number, contexts: () => Iterable<ReplayContext>): Generator<number, ProcessedReplaySummary> {
    const exec = coverage();
    let countContexts = 0, yieldedAt = performance.now();
    const baseChoices = this.levels[0].length, execChoices = this.levels[3].length;
    const baseAudit = new Map<number, { contextsEvaluated: number; contextsPassed: number;
      contextsInsufficient: number; contextsFailed: number }>();
    const pathAudit = new Map<number, DirectContextStats>();
    const maxBase = this.levels[0].at(-1)!.size;
    const autoBase = this.policy.autoBase === false ? undefined : this.policy.autoPf;
    const baseMinPf = this.policy.directBaseMinPf;
    const execMinPf = this.policy.directExecMinPf;
    for (const { tp, symbol, side, minPf, base: contextBase } of contexts()) {
      countContexts++;
      const key = contextKey(tp, symbol, side, minPf);
      // Report the final exact source contexts as their own Base×Exec paths. A passing Base Set
      // seeds each child with those valid positions; its later direct fills are appended only to
      // that child's private history.
      const baseCheck = contextBase?.prepare?.(maxBase + (autoBase ? PROCESSED_AUTO_PF_SAMPLES : 0), autoBase, baseMinPf);
      const available = contextBase?.available?.() ?? 0;
      for (const baseWindow of this.levels[0]) {
        const baseIndex = bitIndex(baseWindow.bit);
        const baseStats = baseAudit.get(baseIndex) ?? { contextsEvaluated: 0, contextsPassed: 0,
          contextsInsufficient: 0, contextsFailed: 0 };
        baseStats.contextsEvaluated++;
        const baseProof: ProcessedVerdict = baseWindow.size > available
          ? { state: "insufficient", n: available, pf: null }
          : baseCheck?.evaluate?.(baseWindow.block, baseWindow.key) ?? {
            state: baseCheck?.(baseWindow.block, baseWindow.key) ? "qualified" : "failed",
            n: baseWindow.size, pf: null,
          };
        if (baseProof.state === "qualified") baseStats.contextsPassed++;
        else if (baseProof.state === "insufficient") baseStats.contextsInsufficient++;
        else baseStats.contextsFailed++;
        baseAudit.set(baseIndex, baseStats);
        const seed = baseProof.state === "qualified"
          ? baseCheck?.history?.(baseWindow.block, baseWindow.key) : undefined;
        for (const execWindow of this.levels[3]) {
          const pair = baseIndex * execChoices + bitIndex(execWindow.bit);
          const stats = pathAudit.get(pair) ?? { evaluatedContexts: 0, baseQualifiedContexts: 0,
            qualifiedContexts: 0, insufficientContexts: 0, failedContexts: 0, parentBlockedContexts: 0 };
          stats.evaluatedContexts++;
          if (baseProof.state !== "qualified") {
            stats.parentBlockedContexts++;
            countBlockedParent(exec);
          } else {
            stats.baseQualifiedContexts++;
            const historyKey = directPathKey(key, pair);
            const history = this.directHistories.get(historyKey) ?? seed ?? empty;
            const view = new ProcessedWindowIndex(history, at, this.capacity,
              execMinPf ?? minPf, this.policy.autoPf, this.negative);
            const proof = view.evaluate(execWindow.block, execWindow.key);
            count(exec, proof, execWindow.size,
              () => processedWindowEconomics(history, execWindow.size, at));
            if (proof.state === "qualified") stats.qualifiedContexts++;
            else if (proof.state === "insufficient") stats.insufficientContexts++;
            else stats.failedContexts++;
          }
          pathAudit.set(pair, stats);
        }
      }
      if (countContexts % 32 === 0 && performance.now() - yieldedAt > 8) {
        yield -15; yieldedAt = performance.now();
      }
    }
    const expected = countContexts * baseChoices * execChoices;
    if (exec.contexts !== expected) throw new RangeError("direct Exec coverage does not match its exact Base×Exec grid");
    finishCoverage(exec);
    const validation = coverage(), real = coverage();
    const directExecDetails = this.directBaseBlocks.flatMap((base, baseIndex) => this.directExecBlocks.map((exec, execIndex) => {
      const pair = baseIndex * execChoices + execIndex;
      const stats = this.directStats.get(pair) ?? emptyDirectExecStats();
      const audit = pathAudit.get(pair) ?? { evaluatedContexts: 0, baseQualifiedContexts: 0,
        qualifiedContexts: 0, insufficientContexts: 0, failedContexts: 0, parentBlockedContexts: 0 };
      const hourly = [...stats.hourly].sort(([a], [b]) => a - b)
        .map(([t, value]) => ({ t, orders: value.orders, net: value.net }));
      return { base, exec, openedOrders: stats.openedOrders, settledOrders: stats.settledOrders,
        wins: stats.wins, losses: stats.losses, unknownReturns: stats.unknownReturns,
        grossProfit: stats.grossProfit, grossLoss: stats.grossLoss,
        positiveHours: hourly.filter(hour => hour.net > 0).length,
        activeHours: hourly.filter(hour => hour.orders > 0).length, hourly, ...audit };
    }));
    const directBaseDetails = this.directBaseBlocks.map((base, index) => ({ base,
      ...(this.directBaseStats.get(index) ?? { evaluated: 0, passed: 0, insufficient: 0, failed: 0 }),
      ...(baseAudit.get(index) ?? { contextsEvaluated: 0, contextsPassed: 0, contextsInsufficient: 0, contextsFailed: 0 }) }));
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction-window-path",
      seededFromCandidates: false, validation, real, exec, directBaseDetails,
      directExecDetails,
      windowGrid: { choices: { base: baseChoices, validation: this.levels[1].length,
        real: this.levels[2].length, exec: execChoices }, oppositeSourceMissing: this.missing,
        inverseEntries: this.inverseEntries, inverseExecEntries: this.inverseExecEntries,
        directExec: true, directBaseMinPf: this.policy.directBaseMinPf,
        directExecMinPf: this.policy.directExecMinPf } };
  }
}
