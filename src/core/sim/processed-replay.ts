import {blockRequired,checkBlockPolicy,type BlockPolicy} from "../../../shared/cts-lastn/blocks.ts";
import { negativeLastN, type NegativeLastN } from "../negative-last-n.ts";
import type { PositionWindows } from "../position-windows.ts";
import { addValidatedSetPf, emptyValidatedSetPf } from "../validated-set-pf.ts";
import type { ValidationSummary } from "./walkforward.ts";
import { appendProcessedHistory, assertProcessedSetIdentity, processedWindowEconomics, processedWindowVerdict,
  ProcessedSetBook, type ProcessedHistoryRow, type ProcessedOpen, type ProcessedSetIdentity,
  type ProcessedSetSnapshot, type ProcessedSetSummary, type ProcessedVerdict } from "./processed-set.ts";

/** Opt-in modeled progression. Native paper/venue admission requires its own persistent adapter. */
export interface ProcessedReplayPolicy {
  blocks?: {validation?:BlockPolicy;real?:BlockPolicy};
  validationN: number;
  realN: number;
  negativeFilter?: NegativeLastN;
  /** Summary mode omits the modeled per-set checkpoint from this replay result; economic decisions are unchanged. */
  reportDetail?: "summary";
}

export function ownedProcessedPolicy(policy: ProcessedReplayPolicy, windows?: PositionWindows | null): ProcessedReplayPolicy {
  const validation = policy.blocks?.validation ?? windows?.blocks?.main;
  const real = policy.blocks?.real ?? windows?.blocks?.real;
  return validation || real ? {...policy, blocks: {
    ...(validation && {validation}), ...(real && {real}),
  }} : policy;
}

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

  constructor(policy: ProcessedReplayPolicy, cost: number) {
    if (!policy || ![policy.validationN, policy.realN].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 200) ||
      !Number.isFinite(cost) || cost < 0) throw new RangeError("invalid processed replay policy");
    if(policy.blocks)for(const b of Object.values(policy.blocks))checkBlockPolicy(b);
    const negativeFilter = negativeLastN(policy.negativeFilter);
    // Summary-only model replays never emit a checkpoint. Identity already owns config/symbol/side,
    // so the onset timestamp is a unique compact parent ID within that identity.
    this.compactEntryIds = policy.reportDetail === "summary";
    this.policy = { validationN: policy.validationN, realN: policy.realN,
      ...(policy.blocks?{blocks:structuredClone(policy.blocks)}:{}),
      ...(negativeFilter ? { negativeFilter } : {}) };
    this.revision = processedReplayRevision(this.policy, cost);
    this.book = new ProcessedSetBook("model", Math.max(policy.validationN, policy.realN, ...Object.values(policy.blocks??{}).map(blockRequired), ...negativeFilter?.windows ?? []));
  }

  identity(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number): ProcessedSetIdentity {
    if (!Number.isFinite(minPf) || minPf <= 1) throw new RangeError("processed PF floor must exceed one");
    return { baseConfigId: tp.id, symbol, side, kind: tp.kind,
      lane: JSON.stringify([tp.ind, this.policy.validationN, this.policy.realN, minPf]), economicRevision: this.revision };
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
    const mainN = this.policy.blocks?.validation ? blockRequired(this.policy.blocks.validation) : this.policy.validationN;
    const realN = this.policy.blocks?.real ? blockRequired(this.policy.blocks.real) : this.policy.realN;
    let scanned = 0, lastYield = performance.now();
    for (const { identity, minPf } of contexts) {
      count(validation, this.book.verdict(identity, "postBase", this.policy.validationN, minPf, at,
        this.policy.negativeFilter, this.policy.blocks?.validation), mainN,
        () => this.book.windowEconomics(identity, "postBase", mainN, at));
      count(real, this.book.verdict(identity, "validated", this.policy.realN, minPf, at,
        this.policy.negativeFilter, this.policy.blocks?.real), realN,
        () => this.book.windowEconomics(identity, "validated", realN, at));
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
    const result: ProcessedReplaySummary = { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real };
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
  lastEntryT: number;
}
interface SummaryConfig {
  group: string;
  primary: Map<number, SummaryRows>;
  others?: Map<string, Map<number, SummaryRows>>;
}

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
  private readonly held = new WeakMap<ProcessedOpen, { rows: SummaryRows; entryT: number; stage: ProcessedOpen["stage"] }>();
  private clock = -1;
  private readonly empty: ProcessedHistoryRow[] = [];
  private readonly economicRevision: string;

  constructor(policy: ProcessedReplayPolicy, cost: number) {
    if (policy.reportDetail !== "summary") throw new Error("compact replay requires summary-only reporting");
    const validated = new ProcessedReplay(policy, cost);
    this.policy = validated.policy;
    this.capacity = validated.book.capacity;
    this.economicRevision = processedReplayRevision(this.policy, cost);
  }

  identity(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number): ProcessedSetIdentity {
    if (!Number.isFinite(minPf) || minPf <= 1) throw new RangeError("processed PF floor must exceed one");
    return { baseConfigId: tp.id, symbol, side, kind: tp.kind,
      lane: JSON.stringify([tp.ind, this.policy.validationN, this.policy.realN, minPf]), economicRevision: this.economicRevision };
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
    const rows = this.rows(identity, false), p = this.policy, cap = this.capacity;
    const validation = processedWindowVerdict(rows?.postBase ?? this.empty, cap, p.validationN, minPf, entryT,
      p.negativeFilter, p.blocks?.validation);
    const real = validation.state === "qualified"
      ? processedWindowVerdict(rows?.validated ?? this.empty, cap, p.realN, minPf, entryT,
        p.negativeFilter, p.blocks?.real) : null;
    const stage = validation.state !== "qualified" ? "postBase" : real?.state === "qualified" ? "active" : "validated";
    return { stage, validation, real } as const;
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number) {
    return this.decision(this.identity(tp, symbol, side, minPf), entryT, minPf);
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number): ProcessedOpen {
    const identity = this.identity(tp, symbol, side, minPf), decision = this.decision(identity, entryT, minPf);
    const rows = this.rows(identity, true)!;
    if (rows.lastEntryT === entryT) throw new Error("duplicate processed entry");
    rows.lastEntryT = entryT;
    this.clock = entryT;
    const opened: ProcessedOpen = { identity, entryId: String(entryT), entryT,
      policy: { ...this.policy, minPf }, ...decision, slices: [], settledUnitReturn: 0 };
    this.held.set(opened, { rows, entryT, stage: decision.stage });
    return opened;
  }

  settle(open: ProcessedOpen, exitT: number, unitReturn: number | null): void {
    const own = this.held.get(open);
    if (!own) throw new Error("processed close has no matching open entry");
    if (!Number.isFinite(exitT) || exitT < own.entryT || exitT < this.clock)
      throw new TypeError("invalid processed close");
    this.clock = exitT;
    const row = { exitT, unitReturn: unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null };
    appendProcessedHistory(own.rows.postBase, row, this.capacity);
    if (own.stage !== "postBase") {
      own.rows.validated ??= [];
      appendProcessedHistory(own.rows.validated, row, this.capacity);
    }
    this.held.delete(open);
  }

  *reportGen(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>,
    detail: "full" | "summary" = "full"): Generator<number, ProcessedReplaySummary | ProcessedReplayReport> {
    if (detail !== "summary") throw new Error("summary-only replay has no modeled checkpoint");
    const validation = coverage(), real = coverage(), p = this.policy, cap = this.capacity;
    const mainN = p.blocks?.validation ? blockRequired(p.blocks.validation) : p.validationN;
    const realN = p.blocks?.real ? blockRequired(p.blocks.real) : p.realN;
    let scanned = 0, lastYield = performance.now();
    for (const { identity, minPf } of contexts) {
      if (at < this.clock) throw new RangeError("invalid processed-set policy or decision time");
      assertProcessedSetIdentity(identity);
      const rows = this.rows(identity, false), main = rows?.postBase ?? this.empty, later = rows?.validated ?? this.empty;
      count(validation, processedWindowVerdict(main, cap, p.validationN, minPf, at, p.negativeFilter, p.blocks?.validation),
        mainN, () => processedWindowEconomics(main, mainN, at));
      count(real, processedWindowVerdict(later, cap, p.realN, minPf, at, p.negativeFilter, p.blocks?.real),
        realN, () => processedWindowEconomics(later, realN, at));
      if (++scanned % 64 === 0 && performance.now() - lastYield >= 8) { yield -15; lastYield = performance.now(); }
    }
    finishCoverage(validation);
    finishCoverage(real);
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real };
  }
}
