import { checkBlockPolicy, type BlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import { negativeLastN, type NegativeLastN } from "../negative-last-n.ts";
import type { PositionWindows } from "../position-windows.ts";
import { addValidatedSetPf, emptyValidatedSetPf, mergeValidatedSetPf } from "../validated-set-pf.ts";
import type { ValidationSummary } from "./walkforward.ts";
import { appendProcessedHistory, assertProcessedSetIdentity, checkProcessedAutoPf, processedGateSize,
  processedGateVerdict, processedPolicyCapacity, processedStageDecision, processedWindowEconomics,
  ProcessedSetBook, type ProcessedHistoryRow, type ProcessedOpen, type ProcessedSetIdentity,
  type ProcessedPolicy, type ProcessedSetSnapshot, type ProcessedSetSummary, type ProcessedStageDecision,
  type ProcessedVerdict } from "./processed-set.ts";

/** Opt-in modeled progression. Native paper/venue admission requires its own persistent adapter. */
export interface ProcessedReplayPolicy extends Omit<ProcessedPolicy, "minPf" | "negativeFilter"> {
  negativeFilter?: NegativeLastN;
  /** Optional exact side/config Base window in addition to the engine's published Base proof. */
  baseBlock?: BlockPolicy;
  /** Discover and admit Base samples on the exact symbol and side. */
  baseScope?: "context";
  /** Use the manual Base floor while leaving Main, Real and Exec Auto PF enabled. */
  autoBase?: false;
  /** Summary mode omits the modeled per-set checkpoint from this replay result; economic decisions are unchanged. */
  reportDetail?: "summary";
  /** Each named policy gets the entire causal stage chain and its own Short and Last signs. */
  lanes?: readonly ProcessedLaneOptions[];
}
type SinglePolicy = Omit<ProcessedReplayPolicy, "lanes" | "reportDetail">;
type ProcessedLaneOptions = Partial<Omit<SinglePolicy, "baseScope" | "autoBase">> & { id: string };

export function ownedProcessedPolicy(policy: ProcessedReplayPolicy, windows?: PositionWindows | null): ProcessedReplayPolicy {
  const validation = policy.blocks?.validation ?? windows?.blocks?.main;
  const real = policy.blocks?.real ?? windows?.blocks?.real;
  const exec = policy.execN !== undefined ? policy.blocks?.exec ?? windows?.blocks?.entry : undefined;
  const baseBlock = policy.baseBlock ?? (policy.execN !== undefined ? windows?.blocks?.base : undefined);
  return { ...policy, ...(baseBlock && { baseBlock }), ...((validation || real || exec) && { blocks: {
    ...(validation && {validation}), ...(real && {real}), ...(exec && {exec}),
  } }) };
}

/** Canonical persisted economics. Reporting detail never changes the qualifying lane's identity. */
export function checkedProcessedPolicy(policy: SinglePolicy): SinglePolicy {
  if (!policy || ![policy.validationN, policy.realN, ...(policy.execN === undefined ? [] : [policy.execN])].every(n =>
    Number.isSafeInteger(n) && n >= 1 && n <= 200)) throw new RangeError("invalid processed-stage policy counts");
  for (const [stage, block] of Object.entries(policy.blocks ?? {})) {
    if (!(stage === "validation" || stage === "real" || (stage === "exec" && policy.execN !== undefined)))
      throw new RangeError("invalid processed signed block stage");
    checkBlockPolicy(block);
  }
  if (policy.baseBlock !== undefined) checkBlockPolicy(policy.baseBlock);
  if (policy.baseScope !== undefined && policy.baseScope !== "context") throw new RangeError("invalid processed Base scope");
  if (policy.autoBase !== undefined && policy.autoBase !== false) throw new RangeError("invalid processed Base PF selection");
  if (policy.autoPf !== undefined) checkProcessedAutoPf(policy.autoPf);
  const negativeFilter = negativeLastN(policy.negativeFilter);
  return { validationN: policy.validationN, realN: policy.realN,
    ...(policy.blocks && { blocks: structuredClone(policy.blocks) }),
    ...(negativeFilter && { negativeFilter }),
    ...(policy.execN !== undefined && { execN: policy.execN }),
    ...(policy.autoPf && { autoPf: { mode: policy.autoPf.mode, ratio: policy.autoPf.ratio } }),
    ...(policy.baseBlock && { baseBlock: structuredClone(policy.baseBlock) }),
    ...(policy.baseScope && { baseScope: policy.baseScope }),
    ...(policy.autoBase === false && { autoBase: false }),
  };
}

export function processedLanes(policy: ProcessedReplayPolicy) {
  const base = checkedProcessedPolicy(policy);
  if (policy.lanes === undefined) return [{ id: "", policy: base }];
  if (!Array.isArray(policy.lanes) || !policy.lanes.length)
    throw new RangeError("processed lanes require at least one named policy");
  const ids = new Set<string>();
  return policy.lanes.map(({ id, ...patch }) => {
    if (typeof id !== "string" || !id.trim() || ids.has(id)) throw new RangeError("invalid or duplicate processed lane ID");
    ids.add(id);
    const blocks = patch.blocks ? { ...base.blocks, ...patch.blocks } : base.blocks;
    return { id, policy: checkedProcessedPolicy({ ...base, execN: base.execN ?? base.realN, ...patch, blocks,
      baseScope: base.baseScope, autoBase: base.autoBase }) };
  });
}

export function frozenProcessedPolicy(policy: ProcessedReplayPolicy): ProcessedReplayPolicy {
  const base = checkedProcessedPolicy(policy);
  const lanes = policy.lanes && processedLanes(policy).map(({ id, policy }) => ({ id, ...policy }));
  return { ...base, ...(lanes && { lanes }) };
}

export function furthestProcessedDecision<T extends ProcessedStageDecision>(lanes: readonly T[]): T {
  const rank = { postBase: 0, validated: 1, real: 2, active: 3 };
  return lanes.reduce((a, b) => rank[b.stage] > rank[a.stage] ? b : a);
}

export const processedLaneKey = (tp: ProcessedReplayContext, policy: SinglePolicy, minPf: number, id: string) =>
  JSON.stringify([tp.ind, policy.validationN, policy.realN, minPf, ...(id ? [id] : [])]);
export type ProcessedBaseCheck = (block?: BlockPolicy, autoPf?: SinglePolicy["autoPf"], scope?: "context") => boolean;
export const requiresProcessedBaseCheck = (policy: SinglePolicy) => !!(policy.baseBlock || policy.baseScope);
/** A negative Main trigger requires a separately priced order on the other side. */
export function requiresOppositeMainSource(policy: SinglePolicy): boolean {
  const block = policy.blocks?.validation;
  return policy.execN !== undefined && !!block &&
    ((block.short > 0 && block.shortPolarity === "negative") ||
     (block.minimal > 0 && block.minimalPolarity === "negative"));
}
export const qualifiesProcessedBase = (policy: SinglePolicy, check?: ProcessedBaseCheck) =>
  !requiresProcessedBaseCheck(policy) || check?.(policy.baseBlock, policy.autoBase === false ? undefined : policy.autoPf,
    policy.baseScope) === true;

/** Stable economic-policy identity carried from modeled admission through paper and venue ownership. */
export function processedReplayRevision(policy: ProcessedReplayPolicy, cost: number): string {
  if (!Number.isFinite(cost) || cost < 0) throw new RangeError("invalid processed replay cost");
  return JSON.stringify(["processed-replay-v1", cost, policy]);
}
export interface ProcessedReplayContext {
  id: string;
  kind: string;
  ind: string;
}
/** The offline summary walker only needs the frozen admission decision while an order is open. */
export type ProcessedSummaryOpen = ProcessedStageDecision;
export interface ProcessedReplayCoverage {
  contexts: number;
  full: number;
  qualified: number;
  insufficient: number;
  unknown: number;
  failed: number;
  fullPct: number | null;
  qualifiedPct: number | null;
  passingWindows: ValidationSummary;
}
export interface ProcessedReplaySummary {
  basis: "model";
  at: number;
  coverageScope: "visible-config-symbol-direction";
  /** Raw candidate history is never imported into either processed window. */
  seededFromCandidates: false;
  validation: ProcessedReplayCoverage;
  real: ProcessedReplayCoverage;
  exec?: ProcessedReplayCoverage;
  lanes?: Array<{ id: string; policy: SinglePolicy; validation: ProcessedReplayCoverage;
    real: ProcessedReplayCoverage; exec?: ProcessedReplayCoverage }>;
}
export interface ProcessedReplayReport extends ProcessedReplaySummary {
  sets: ProcessedSetSummary[];
  /** Causal ledger checkpoint, not permission to restore paper or venue ownership. */
  snapshot: ProcessedSetSnapshot;
}
const coverage = (): ProcessedReplayCoverage => ({ contexts: 0, full: 0, qualified: 0,
  insufficient: 0, unknown: 0, failed: 0, fullPct: null, qualifiedPct: null,
  passingWindows: { evaluated: 0, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() } });
function count(c: ProcessedReplayCoverage, v: ProcessedVerdict, n: number,
  economics: () => { gp: number; gl: number } | null) {
  c.contexts++;
  // Unknown economics is unavailable evidence, even if the count is complete.
  if (v.n === n && v.state !== "unknown") c.full++;
  c[v.state]++;
  c.passingWindows.evaluated++;
  if (v.state === "qualified") {
    const rows = economics();
    const summary = c.passingWindows;
    summary.passed++;
    if (rows) {
      summary.closes += v.n;
      summary.gp += rows.gp;
      summary.gl += rows.gl;
    }
    addValidatedSetPf(summary.setPf!, v.n, rows?.gp, rows?.gl);
  }
}
function finishCoverage(c: ProcessedReplayCoverage) {
  if (!c.contexts) return;
  c.fullPct = 100 * c.full / c.contexts;
  c.qualifiedPct = 100 * c.qualified / c.contexts;
}

/** Connects actual native replay admissions/settlements to the independently tested processed book. */
export class ProcessedReplay {
  readonly book: ProcessedSetBook;
  readonly policy: ProcessedReplayPolicy;
  private readonly revision: string;
  private readonly compactEntryIds: boolean;
  private readonly laneId: string;

  constructor(policy: ProcessedReplayPolicy, cost: number, laneId = "") {
    this.laneId = laneId;
    this.policy = checkedProcessedPolicy(policy);
    // Summary-only model replays never emit a checkpoint. Identity already owns config/symbol/side,
    // so the onset timestamp is a unique compact parent ID within that identity.
    this.compactEntryIds = policy.reportDetail === "summary";
    this.revision = processedReplayRevision(this.policy, cost);
    this.book = new ProcessedSetBook("model", processedPolicyCapacity(this.policy));
  }

  identity(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number): ProcessedSetIdentity {
    if (!Number.isFinite(minPf) || minPf <= 1) throw new RangeError("processed PF floor must exceed one");
    return { baseConfigId: tp.id, symbol, side, kind: tp.kind,
      lane: processedLaneKey(tp, this.policy, minPf, this.laneId), economicRevision: this.revision };
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number): ProcessedOpen {
    const identity = this.identity(tp, symbol, side, minPf);
    // An onset has one parent. Future exit price/time/return cannot change its identity.
    const entryId = this.compactEntryIds ? String(entryT) : JSON.stringify([tp.id, symbol, side, entryT]);
    return this.book.acceptPostBase(identity, entryId, entryT, { ...this.policy, minPf });
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number) {
    return this.book.preview(this.identity(tp, symbol, side, minPf), entryT, { ...this.policy, minPf });
  }

  settle(open: ProcessedOpen, exitT: number, unitReturn: number | null): void {
    this.book.close(open.identity, open.entryId, open.entryT, "final", exitT,
      unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null, true);
  }

  /** Yield during large coverage scans; summary mode avoids copying per-set details or the modeled checkpoint. */
  *reportGen(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>,
    detail: "full" | "summary" = "full"): Generator<number, ProcessedReplaySummary | ProcessedReplayReport> {
    const validation = coverage(), real = coverage(), sets: ProcessedSetSummary[] = [];
    const exec = this.policy.execN !== undefined ? coverage() : undefined;
    let scanned = 0, lastYield = performance.now();
    for (const { identity, minPf } of contexts) {
      const p = { ...this.policy, minPf }, mainN = processedGateSize(p, "validation"), realN = processedGateSize(p, "real");
      const main = this.book.gate(identity, "postBase", p, "validation", at);
      count(validation, main, mainN,
        () => this.book.windowEconomics(identity, "postBase", mainN, at));
      count(real, this.book.gate(identity, "validated", p, "real", at, main), realN,
        () => this.book.windowEconomics(identity, "validated", realN, at));
      if (exec) {
        const n = processedGateSize(p, "exec");
        count(exec, this.book.gate(identity, "real", p, "exec", at, main), n,
          () => this.book.windowEconomics(identity, "real", n, at));
      }
      if (detail === "full") {
        const summary = this.book.summary(identity);
        if (summary) sets.push(summary);
      }
      if (++scanned % 64 === 0 && performance.now() - lastYield >= 8) {
        yield -15;
        lastYield = performance.now();
      }
    }
    finishCoverage(validation);
    finishCoverage(real);
    if (exec) finishCoverage(exec);
    const result: ProcessedReplaySummary = { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real, ...(exec && { exec }) };
    return detail === "summary" ? result : { ...result, sets, snapshot: this.book.snapshot() };
  }

  report(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>): ProcessedReplayReport {
    const gen = this.reportGen(at, contexts);
    for (let next = gen.next(); ; next = gen.next()) if (next.done) return next.value as ProcessedReplayReport;
  }
}

interface SummaryRows {
  postBase: ProcessedHistoryRow[];
  validated?: ProcessedHistoryRow[];
  real?: ProcessedHistoryRow[];
  lastEntryT: number;
}
interface SummaryConfig {
  group: string;
  primary: Map<number, SummaryRows>;
  others?: Map<string, Map<number, SummaryRows>>;
}
const NEGATIVE_ZERO = Symbol("negative zero return");
const SAME_TIME_CLOSE_CACHE_LIMIT = 4096;

/**
 * Offline, summary-only replay ledger. It retains exactly the predecessor close windows needed for
 * decisions and coverage, not per-set counters, Active history or a restorable checkpoint. Full
 * model checkpoints and all paper/venue books continue to use ProcessedSetBook.
 */
export class ProcessedSummaryReplay {
  readonly policy: ProcessedReplayPolicy;
  private readonly capacity: number;
  private readonly contexts = new Map<string, SummaryConfig>();
  // A configuration usually has one kind/policy lane but many symbol-direction histories.
  // Store the group once per configuration and share compact symbol-direction keys globally.
  private readonly slots = new Map<string, number>();
  private readonly held = new WeakMap<ProcessedSummaryOpen, { rows: SummaryRows; entryT: number; stage: ProcessedOpen["stage"] }>();
  private clock = -1;
  private readonly empty: ProcessedHistoryRow[] = [];
  private readonly economicRevision: string;
  // Close rows are read-only inside this summary ledger. Reuse identical values only within the
  // current chronological timestamp, and bound the cache even when every return is different.
  private readonly closeRows = new Map<number | null | symbol, ProcessedHistoryRow>();
  private closeRowsT = -1;
  private readonly laneId: string;

  constructor(policy: ProcessedReplayPolicy, cost: number, laneId = "") {
    this.laneId = laneId;
    if (policy.reportDetail !== "summary") throw new Error("compact replay requires summary-only reporting");
    const validated = new ProcessedReplay(policy, cost);
    this.policy = validated.policy;
    this.capacity = validated.book.capacity;
    this.economicRevision = processedReplayRevision(this.policy, cost);
  }

  identity(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number): ProcessedSetIdentity {
    if (!Number.isFinite(minPf) || minPf <= 1) throw new RangeError("processed PF floor must exceed one");
    return { baseConfigId: tp.id, symbol, side, kind: tp.kind,
      lane: processedLaneKey(tp, this.policy, minPf, this.laneId), economicRevision: this.economicRevision };
  }

  private rows(identity: ProcessedSetIdentity, create: boolean): SummaryRows | undefined {
    // The economic revision is fixed for this instance; foreign revisions cannot borrow its evidence.
    if (identity.economicRevision !== this.economicRevision) {
      if (create) throw new Error("foreign processed economic revision");
      return undefined;
    }
    // Lane contains the indication, windows and PF floor. A changed lane or kind retains
    // a separate group even when it has the same Base config ID.
    let config = this.contexts.get(identity.baseConfigId);
    if (!config && !create) return undefined;
    const group = JSON.stringify([identity.kind, identity.lane]);
    let byContext = config?.group === group ? config.primary : config?.others?.get(group);
    if (!byContext && !create) return undefined;
    if (!config) {
      config = { group, primary: new Map() };
      this.contexts.set(identity.baseConfigId, config);
      byContext = config.primary;
    } else if (!byContext) {
      config.others ??= new Map();
      config.others.set(group, (byContext = new Map()));
    }
    const key = JSON.stringify([identity.symbol, identity.side]);
    let slot = this.slots.get(key);
    if (slot === undefined) {
      if (!create) return undefined;
      slot = this.slots.size;
      this.slots.set(key, slot);
    }
    let row = byContext!.get(slot);
    if (!row && create) {
      byContext!.set(slot, (row = { postBase: [], lastEntryT: -1 }));
    }
    return row;
  }

  private decision(identity: ProcessedSetIdentity, entryT: number, minPf: number) {
    // Keep identity and event validation equivalent to the full owned ledger.
    assertProcessedSetIdentity(identity);
    if (!Number.isFinite(entryT) || entryT < 0 || entryT < this.clock)
      throw new RangeError("invalid processed-set policy or decision time");
    const rows = this.rows(identity, false);
    return processedStageDecision(stage => stage === "active" ? this.empty : rows?.[stage] ?? this.empty,
      this.capacity, { ...this.policy, minPf }, entryT);
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number) {
    return this.decision(this.identity(tp, symbol, side, minPf), entryT, minPf);
  }

  private admit(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number) {
    const identity = this.identity(tp, symbol, side, minPf), decision = this.decision(identity, entryT, minPf);
    const rows = this.rows(identity, true)!;
    if (rows.lastEntryT === entryT) throw new Error("duplicate processed entry");
    rows.lastEntryT = entryT;
    this.clock = entryT;
    return { identity, decision, rows };
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number): ProcessedOpen {
    const { identity, decision, rows } = this.admit(tp, symbol, side, entryT, minPf);
    const opened: ProcessedOpen = { identity, entryId: String(entryT), entryT,
      policy: { ...this.policy, minPf }, ...decision, slices: [], settledUnitReturn: 0 };
    this.held.set(opened, { rows, entryT, stage: decision.stage });
    return opened;
  }

  /** No checkpoint is emitted in summary mode, so the walker need not retain full per-entry metadata. */
  enterCompact(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number): ProcessedSummaryOpen {
    const { decision, rows } = this.admit(tp, symbol, side, entryT, minPf);
    const opened: ProcessedSummaryOpen = { ...decision };
    this.held.set(opened, { rows, entryT, stage: decision.stage });
    return opened;
  }

  settle(open: ProcessedSummaryOpen, exitT: number, unitReturn: number | null): void {
    const own = this.held.get(open);
    if (!own) throw new Error("processed close has no matching open entry");
    if (!Number.isFinite(exitT) || exitT < own.entryT || exitT < this.clock)
      throw new TypeError("invalid processed close");
    this.clock = exitT;
    const value = unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null;
    if (!Object.is(exitT, this.closeRowsT)) { this.closeRows.clear(); this.closeRowsT = exitT; }
    const key = Object.is(value, -0) ? NEGATIVE_ZERO : value;
    let row = this.closeRows.get(key);
    if (!row) {
      row = { exitT, unitReturn: value };
      if (this.closeRows.size < SAME_TIME_CLOSE_CACHE_LIMIT) this.closeRows.set(key, row);
    }
    appendProcessedHistory(own.rows.postBase, row, this.capacity);
    if (own.stage !== "postBase") {
      own.rows.validated ??= [];
      appendProcessedHistory(own.rows.validated, row, this.capacity);
    }
    if (this.policy.execN !== undefined && (own.stage === "active" || own.stage === "real")) {
      own.rows.real ??= [];
      appendProcessedHistory(own.rows.real, row, this.capacity);
    }
    this.held.delete(open);
  }

  *reportGen(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>,
    detail: "full" | "summary" = "full"): Generator<number, ProcessedReplaySummary | ProcessedReplayReport> {
    if (detail !== "summary") throw new Error("summary-only replay has no modeled checkpoint");
    const validation = coverage(), real = coverage(), cap = this.capacity;
    const exec = this.policy.execN !== undefined ? coverage() : undefined;
    let scanned = 0, lastYield = performance.now();
    for (const { identity, minPf } of contexts) {
      if (at < this.clock) throw new RangeError("invalid processed-set policy or decision time");
      assertProcessedSetIdentity(identity);
      const p = { ...this.policy, minPf }, mainN = processedGateSize(p, "validation"), realN = processedGateSize(p, "real");
      const rows = this.rows(identity, false), main = rows?.postBase ?? this.empty, later = rows?.validated ?? this.empty;
      const mainVerdict = processedGateVerdict(main, cap, p, "validation", at);
      count(validation, mainVerdict,
        mainN, () => processedWindowEconomics(main, mainN, at));
      count(real, processedGateVerdict(later, cap, p, "real", at, mainVerdict),
        realN, () => processedWindowEconomics(later, realN, at));
      if (exec) {
        const n = processedGateSize(p, "exec"), history = rows?.real ?? this.empty;
        count(exec, processedGateVerdict(history, cap, p, "exec", at, mainVerdict),
          n, () => processedWindowEconomics(history, n, at));
      }
      if (++scanned % 64 === 0 && performance.now() - lastYield >= 8) { yield -15; lastYield = performance.now(); }
    }
    finishCoverage(validation);
    finishCoverage(real);
    if (exec) finishCoverage(exec);
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real, ...(exec && { exec }) };
  }
}

type ReplayLedger = ProcessedReplay | ProcessedSummaryReplay;
type ReplayContext = { tp: ProcessedReplayContext; symbol: string; side: 1 | -1; minPf: number };
type ReplayEntry = ProcessedSummaryOpen & { lanes: Array<{ index: number; open: ProcessedOpen | ProcessedSummaryOpen }> };

function combineCoverage(rows: readonly ProcessedReplayCoverage[]): ProcessedReplayCoverage {
  const result = coverage(), passing = result.passingWindows;
  for (const row of rows) {
    for (const key of ["contexts", "full", "qualified", "insufficient", "unknown", "failed"] as const)
      result[key] += row[key];
    for (const key of ["evaluated", "passed", "closes", "gp", "gl"] as const) passing[key] += row.passingWindows[key];
    mergeValidatedSetPf(passing.setPf!, row.passingWindows.setPf!);
  }
  finishCoverage(result);
  return result;
}

/**
 * Named Last-N lanes each advance their own predecessor sets. A physical candidate
 * can satisfy several lanes but is admitted to the account at most once.
 */
export class ProcessedLaneReplay {
  readonly checksBase: boolean;
  private readonly ledgers: Array<{ id: string; ledger: ReplayLedger }>;
  private readonly policy: ProcessedReplayPolicy;

  constructor(policy: ProcessedReplayPolicy, cost: number) {
    this.policy = policy;
    this.ledgers = processedLanes(policy).map(({ id, policy: p }) => ({
      id, ledger: policy.reportDetail === "summary"
        ? new ProcessedSummaryReplay({ ...p, reportDetail: "summary" }, cost, id)
        : new ProcessedReplay(p, cost, id),
    }));
    this.checksBase = this.ledgers.some(x => requiresProcessedBaseCheck(x.ledger.policy));
  }

  private eligible(base?: ProcessedBaseCheck) {
    return this.ledgers.flatMap(({ ledger }, index) => {
      return qualifiesProcessedBase(ledger.policy, base) ? [{ ledger, index }] : [];
    });
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, at: number, minPf: number,
    base?: ProcessedBaseCheck): ProcessedStageDecision | null {
    const ledgers = this.ledgers;
    if (ledgers.length === 1 && !this.checksBase)
      return ledgers[0].ledger.preview(tp, symbol, side, at, minPf);
    const eligible = this.eligible(base);
    return eligible.length ? furthestProcessedDecision(eligible.map(({ ledger }) =>
      ledger.preview(tp, symbol, side, at, minPf))) : null;
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, at: number, minPf: number, base?: ProcessedBaseCheck):
    ProcessedOpen | ProcessedSummaryOpen | ReplayEntry {
    const enter = (ledger: ReplayLedger) => ledger instanceof ProcessedSummaryReplay
      ? ledger.enterCompact(tp, symbol, side, at, minPf) : ledger.enter(tp, symbol, side, at, minPf);
    const ledgers = this.ledgers;
    if (ledgers.length === 1 && !this.checksBase) return enter(ledgers[0].ledger);
    const lanes = this.eligible(base).map(({ ledger, index }) => ({ index, open: enter(ledger) }));
    if (!lanes.length) throw new Error("no Base-qualified processed lane");
    const { stage, validation, real, exec } = furthestProcessedDecision(lanes.map(l => l.open));
    return { stage, validation, real, ...(exec !== undefined && { exec }), lanes };
  }

  settle(entry: ProcessedOpen | ProcessedSummaryOpen | ReplayEntry, at: number, r: number | null): void {
    const entries = "lanes" in entry ? entry.lanes : [{ index: 0, open: entry }];
    for (const { index, open } of entries) {
      const book = this.ledgers[index].ledger;
      if (book instanceof ProcessedSummaryReplay) book.settle(open, at, r);
      else if ("identity" in open) book.settle(open, at, r);
      else throw new Error("processed open does not belong to its ledger");
    }
  }

  *reportGen(at: number, contexts: () => Iterable<ReplayContext>): Generator<number, ProcessedReplaySummary | ProcessedReplayReport> {
    const reports: Array<ProcessedReplaySummary | ProcessedReplayReport> = [];
    const detail = this.policy.reportDetail ?? "full";
    for (const { ledger } of this.ledgers) {
      reports.push(yield* ledger.reportGen(at, (function* () {
        for (const { tp, symbol, side, minPf } of contexts())
          yield { identity: ledger.identity(tp, symbol, side, minPf), minPf };
      })(), detail));
    }
    if (!this.policy.lanes) return reports[0];
    const lanes = reports.map(({ validation, real, exec }, i) => ({
      id: this.ledgers[i].id, policy: this.ledgers[i].ledger.policy, validation, real, ...(exec && { exec }),
    }));
    const exec = lanes.flatMap(l => l.exec ? [l.exec] : []);
    const result: ProcessedReplaySummary = { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation: combineCoverage(lanes.map(l => l.validation)),
      real: combineCoverage(lanes.map(l => l.real)), ...(exec.length && { exec: combineCoverage(exec) }), lanes };
    if (detail === "summary") return result;
    const full = reports as ProcessedReplayReport[];
    const clock = Math.max(...full.map(r => r.snapshot.clock));
    return { ...result, sets: full.flatMap(r => r.sets), snapshot: {
      version: 3, basis: "model", clock, capacity: Math.max(...full.map(r => r.snapshot.capacity)),
      sets: full.flatMap(r => r.snapshot.sets), open: full.flatMap(r => r.snapshot.open),
      seenAtClock: full.flatMap(r => r.snapshot.clock === clock ? r.snapshot.seenAtClock : []),
    } };
  }
}
