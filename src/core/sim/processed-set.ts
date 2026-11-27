import {blockPrefix,blockRequired,blockPolicyKey,checkBlockPolicy,evaluateBlocks,blockWindow,type BlockPolicy} from "../../../shared/cts-lastn/blocks.ts";
import { profitFactor } from "../metrics/stats.ts";
import { negativeLastN, negativeLastNDecision, type NegativeLastN } from "../negative-last-n.ts";

/** A processed set remains tied to the complete Base configuration and its economic policy. */
export interface ProcessedSetIdentity {
  baseConfigId: string;
  symbol: string;
  side: 1 | -1;
  kind: string;
  lane: string;
  economicRevision: string;
}

export type ProcessedStage = "postBase" | "validated" | "real" | "active";
type LegacyStage = Exclude<ProcessedStage, "real">;
export type ProcessedGate = "validation" | "real" | "exec";
export interface ProcessedAutoPf {
  mode: "independent" | "main";
  ratio: number;
}
export const PROCESSED_AUTO_PF_SAMPLES = 24;
const MAX_AUTO_PF_INCREASE = 0.5;
export type ProcessedBasis = "model" | "paper" | "venue";
export type ProcessedVerdict = {
  state: "insufficient" | "unknown" | "failed" | "qualified";
  n: number;
  pf: number | null;
  blockedBy?: "negative-filter" | "signed-block";
  blockPolicyKey?: string;
  autoPf?: { floor: number; source: "own" | "fallback" | "main" };
};
export interface ProcessedPolicy {
  blocks?: Partial<Record<ProcessedGate, BlockPolicy>>;
  validationN: number;
  realN: number;
  /** When configured, active/Exec can only use settled orders in the separate Real set. */
  execN?: number;
  autoPf?: ProcessedAutoPf;
  minPf: number;
  negativeFilter?: NegativeLastN;
}
interface Close {
  entryId: string;
  sliceId: string;
  entryT: number;
  exitT: number;
  /** Complete parent net unit return, summed from its own settled contributions. */
  unitReturn: number | null;
}
/** The fields needed for a chronological, bounded Last-N calculation. */
export type ProcessedHistoryRow = Pick<Close, "exitT" | "unitReturn">;

export function processedHistoryEnd(history: readonly ProcessedHistoryRow[], beforeT?: number): number {
  let end = history.length;
  if (beforeT !== undefined) {
    let start = 0;
    while (start < end) {
      const mid = (start + end) >>> 1;
      if (history[mid].exitT < beforeT) start = mid + 1; else end = mid;
    }
  }
  return end;
}

/** Retain a full strictly prior window in addition to the current same-time batch. */
export function appendProcessedHistory<T extends ProcessedHistoryRow>(history: T[], row: T, capacity: number): void {
  history.push(row);
  let currentStart = processedHistoryEnd(history, row.exitT);
  if (currentStart > capacity) {
    const remove = currentStart - capacity;
    history.splice(0, remove);
    currentStart -= remove;
  }
  const currentCount = history.length - currentStart;
  if (currentCount > capacity) history.splice(currentStart, currentCount - capacity);
}

export function processedWindowEconomics(history: readonly ProcessedHistoryRow[], n: number, at: number) {
  const end = processedHistoryEnd(history, at);
  if (end < n) return null;
  let gp = 0, gl = 0;
  for (let i = end - n; i < end; i++) {
    const r = history[i].unitReturn;
    if (r === null || !Number.isFinite(r)) return null;
    if (r > 0) gp += r; else gl -= r;
  }
  return Number.isFinite(gp) && Number.isFinite(gl) ? { gp, gl } : null;
}
interface SetRows {
  identity: ProcessedSetIdentity;
  postBase: Close[];
  validated: Close[];
  real?: Close[];
  active: Close[];
  counts: Record<LegacyStage, StageCounts> & { real?: StageCounts };
  evaluations: { validation: VerdictCounts; real: VerdictCounts; exec?: VerdictCounts };
}
interface StageCounts {
  openedOrders: number;
  closedOrders: number;
  settledSlices: number;
  grossProfit: number;
  grossLoss: number;
  unknownReturns: number;
  aggregateUnknown: boolean;
}
type VerdictCounts = Record<ProcessedVerdict["state"], number>;
export interface ProcessedSetSummary {
  identity: ProcessedSetIdentity;
  basis: ProcessedBasis;
  stages: Record<LegacyStage, StageSummary> & { real?: StageSummary };
  evaluations: SetRows["evaluations"];
  lineage?: Array<{ stage: ProcessedStage; setId: string; parentSetId: string }>;
}
type StageSummary = StageCounts & { heldOrders: number; returnPf: number | null };
export interface ProcessedOpen {
  identity: ProcessedSetIdentity;
  entryId: string;
  entryT: number;
  /** Admission policy frozen at entry, so restored decisions can be checked against the actual windows and floor. */
  policy: ProcessedPolicy;
  validation: ProcessedVerdict;
  real: ProcessedVerdict | null;
  exec?: ProcessedVerdict | null;
  stage: ProcessedStage;
  /** Already settled slices for this still-open order, preventing repeated cumulative updates. */
  slices: string[];
  /** Sum of settled net contributions on the original parent notional. Null retains any unknown slice. */
  settledUnitReturn: number | null;
}
export type ProcessedStageDecision = Pick<ProcessedOpen, "stage" | "validation" | "real" | "exec">;
export interface ProcessedSetSnapshot {
  version: 3;
  basis: ProcessedBasis;
  capacity: number;
  clock: number;
  sets: SetRows[];
  open: ProcessedOpen[];
  seenAtClock: string[];
}

const legacyStages = ["postBase", "validated", "active"] as const;
const execStages = ["postBase", "validated", "real", "active"] as const;
const stagesFor = (exec: boolean): readonly ProcessedStage[] => exec ? execStages : legacyStages;
const counts = (): StageCounts => ({ openedOrders: 0, closedOrders: 0, settledSlices: 0,
  grossProfit: 0, grossLoss: 0, unknownReturns: 0, aggregateUnknown: false });
const verdictCounts = (): VerdictCounts => ({ insufficient: 0, unknown: 0, failed: 0, qualified: 0 });
// Most modeled contexts remain cold in later stages. Immutable empty state is shared until the first write.
const EMPTY_HISTORY = Object.freeze([]) as unknown as Close[];
const EMPTY_COUNTS = Object.freeze(counts()) as StageCounts;
const EMPTY_VERDICTS = Object.freeze(verdictCounts()) as VerdictCounts;
const zeroCounts = (c: StageCounts) => c.openedOrders === 0 && c.closedOrders === 0 && c.settledSlices === 0 &&
  c.grossProfit === 0 && c.grossLoss === 0 && c.unknownReturns === 0 && !c.aggregateUnknown;
const zeroVerdicts = (v: VerdictCounts) => v.insufficient === 0 && v.unknown === 0 && v.failed === 0 && v.qualified === 0;
const nonempty = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
function identityValid(i: ProcessedSetIdentity): boolean {
  return !!i && nonempty(i.baseConfigId) && nonempty(i.symbol) && (i.side === 1 || i.side === -1) &&
    nonempty(i.kind) && nonempty(i.lane) && nonempty(i.economicRevision);
}
/** JSON encoding avoids collisions when config or lane IDs themselves contain separators. */
export function assertProcessedSetIdentity(i: ProcessedSetIdentity): void {
  if (!identityValid(i)) throw new TypeError("invalid processed-set identity");
}
export function processedSetKey(i: ProcessedSetIdentity): string {
  assertProcessedSetIdentity(i);
  return JSON.stringify([i.baseConfigId, i.symbol, i.side, i.kind, i.lane, i.economicRevision]);
}
const entryKey = (i: ProcessedSetIdentity, id: string, entryT: number) =>
  JSON.stringify([processedSetKey(i), id, entryT]);
export function checkProcessedAutoPf(p: ProcessedAutoPf): void {
  if (!p || !["independent", "main"].includes(p.mode) ||
    !Number.isSafeInteger(p.ratio) || p.ratio < 1 || p.ratio > 10)
    throw new RangeError("invalid processed Auto PF policy");
}

export function processedPolicyCapacity(p: Omit<ProcessedPolicy, "minPf">): number {
  return Math.max(p.validationN, p.realN, p.execN ?? 0,
    ...Object.values(p.blocks ?? {}).map(blockRequired), ...negativeLastN(p.negativeFilter)?.windows ?? []) +
    (p.autoPf ? PROCESSED_AUTO_PF_SAMPLES : 0);
}

function validPolicy(p: ProcessedPolicy | undefined, capacity: number): p is ProcessedPolicy {
  if (!p || ![p.validationN, p.realN, p.execN ?? 1].every(n => Number.isSafeInteger(n) && n >= 1) ||
    !Number.isFinite(p.minPf) || p.minPf <= 1) return false;
  try {
    if (p.autoPf !== undefined) checkProcessedAutoPf(p.autoPf);
    for (const [stage, block] of Object.entries(p.blocks ?? {})) {
      if (!(stage === "validation" || stage === "real" || (stage === "exec" && p.execN !== undefined))) return false;
      checkBlockPolicy(block);
    }
    return processedPolicyCapacity(p) <= capacity;
  } catch { return false; }
}
function validVerdict(v: ProcessedVerdict | null | undefined, n: number, minPf: number, negative?: NegativeLastN,blocks?:BlockPolicy): v is ProcessedVerdict {
  if(blocks)n=blockRequired(blocks);
  if((v?.blockPolicyKey??null)!==(blocks?blockPolicyKey(blocks):null))return false;
  if (!v || !Number.isSafeInteger(v.n) || v.n < 0 || v.n > n) return false;
  if (v.blockedBy && (v.state !== "failed" || !(v.blockedBy==="signed-block"?blocks:negative) || !["negative-filter","signed-block"].includes(v.blockedBy))) return false;
  if (v.state === "insufficient") return v.n < n && v.pf === null;
  if (v.state === "unknown") return v.n > 0 && v.pf === null;
  if (v.state === "failed") return v.n === n && typeof v.pf === "number" && Number.isFinite(v.pf) && v.pf >= 0 && (v.pf < minPf || Boolean(v.blockedBy));
  if (v.state === "qualified") return v.n === n && typeof v.pf === "number" && Number.isFinite(v.pf) && v.pf >= minPf;
  return false;
}

/** The same owned-stage gate is used by full checkpoints and summary-only replays. */
export function processedWindowVerdict(history: readonly ProcessedHistoryRow[], capacity: number,
  n: number, minPf: number, beforeT?: number, negative?: NegativeLastN, blocks?: BlockPolicy): ProcessedVerdict {
  if (blocks) { checkBlockPolicy(blocks); n = blockRequired(blocks); }
  const filter = negativeLastN(negative);
  if (filter?.windows.some(w => w > capacity)) throw new RangeError("negative window exceeds capacity");
  if (!Number.isSafeInteger(n) || n < 1 || n > capacity || !Number.isFinite(minPf) || minPf <= 1 ||
    (beforeT !== undefined && (!Number.isFinite(beforeT) || beforeT < 0)))
    throw new RangeError("invalid processed-set policy or decision time");
  const end = processedHistoryEnd(history, beforeT);
  const recentLoss = () => negativeLastNDecision(history.slice(Math.max(0,end-Math.max(0,...filter?.windows ?? [])),end)
    .reverse().map(x=>x.unitReturn), filter);
  if (blocks) {
    const sample = history.slice(Math.max(0,end-n),end).reverse().map(close=>close.unitReturn);
    const prefix = blockPrefix(sample,n);
    const result = evaluateBlocks(prefix,blocks,minPf);
    const decision = { n:result.count, blockPolicyKey:result.key };
    if (result.state === "unknown" || result.state === "insufficient") return {...decision,state:result.state,pf:null};
    const aggregate = blockWindow(prefix,0,n,minPf);
    const pf = profitFactor(aggregate.gp,aggregate.gl);
    if (!Number.isFinite(pf)) return {...decision,state:"unknown",pf:null};
    if (result.state === "failed" || aggregate.state !== "qualified") return {...decision,state:"failed",pf,blockedBy:"signed-block"};
    if (filter) {
      const loss = recentLoss();
      if (loss.state === "unknown" || loss.state === "insufficient") return {...decision,state:"unknown",pf:null};
      if (!loss.pass) return {...decision,state:"failed",pf,blockedBy:"negative-filter"};
    }
    return {...decision,state:"qualified",pf};
  }
  // Coverage scans visit millions of empty or short contexts. Read the existing bounded window directly
  // instead of allocating a sliced array for every verdict, including contexts without a set.
  const start = Math.max(0, end - n), length = end - start;
  for (let i = start; i < end; i++)
    if (history[i].unitReturn === null || !Number.isFinite(history[i].unitReturn))
      return { state: "unknown", n: length, pf: null };
  if (length < n) return { state: "insufficient", n: length, pf: null };
  let gp = 0, gl = 0;
  for (let i = start; i < end; i++) {
    const r = history[i].unitReturn!;
    if (r > 0) gp += r; else gl -= r;
  }
  if (!Number.isFinite(gp) || !Number.isFinite(gl)) return { state: "unknown", n: length, pf: null };
  const pf = profitFactor(gp, gl);
  if (!Number.isFinite(pf)) return { state: "unknown", n: length, pf: null };
  if (filter) {
    const loss = recentLoss();
    if (loss.state === "unknown" || loss.state === "insufficient") return {state:"unknown", n:length,pf:null};
    if (!loss.pass) return {state:"failed",n:length,pf,blockedBy:"negative-filter"};
  }
  return { state: gp > gl && pf >= minPf ? "qualified" : "failed", n: length, pf };
}

export const processedGateSize = (p: ProcessedPolicy, gate: ProcessedGate): number => {
  const block = p.blocks?.[gate];
  return block ? blockRequired(block) : (gate === "validation" ? p.validationN : gate === "real" ? p.realN : p.execN!);
};

/** Fit on two older disjoint halves. No winning or losing row in the decision window trains its own floor. */
function autoFloor(history: readonly ProcessedHistoryRow[], offset: number, at: number, minPf: number,
  ratio: number): NonNullable<ProcessedVerdict["autoPf"]> {
  const end = processedHistoryEnd(history, at) - offset;
  if (end < PROCESSED_AUTO_PF_SAMPLES) return { floor: minPf, source: "fallback" };
  const half = PROCESSED_AUTO_PF_SAMPLES / 2;
  const halfPf = (start: number) => {
    let gp = 0, gl = 0;
    for (let i = start; i < start + half; i++) {
      const r = history[i].unitReturn;
      if (r === null || !Number.isFinite(r)) return NaN;
      if (r > 0) gp += r; else gl -= r;
    }
    return gl > 0 ? gp / gl : NaN;
  };
  const earlier = halfPf(end - 2 * half), later = halfPf(end - half);
  if (!Number.isFinite(earlier) || !Number.isFinite(later)) return { floor: minPf, source: "fallback" };
  const pf = Math.min(earlier, later);
  const increase = Math.min(MAX_AUTO_PF_INCREASE, Math.max(0, pf - minPf) * (ratio / 6));
  return { floor: minPf + increase, source: "own" };
}

export function processedGateVerdict(history: readonly ProcessedHistoryRow[], capacity: number,
  p: ProcessedPolicy, gate: ProcessedGate, at: number, main?: ProcessedVerdict): ProcessedVerdict {
  const n = processedGateSize(p, gate);
  const trainingOffset = Math.max(n, ...p.negativeFilter?.windows ?? []);
  const autoPf = p.autoPf && (p.autoPf.mode === "main" && gate !== "validation"
    ? { floor: main?.autoPf?.floor ?? p.minPf, source: "main" as const }
    : autoFloor(history, trainingOffset, at, p.minPf, p.autoPf.ratio));
  const verdict = processedWindowVerdict(history, capacity, n, autoPf?.floor ?? p.minPf, at, p.negativeFilter, p.blocks?.[gate]);
  return autoPf ? { ...verdict, autoPf } : verdict;
}

/** Main sees only post-Base closes, Real sees Main closes, and Exec sees only this lane's Real closes. */
export function processedStageDecision(history: (stage: ProcessedStage) => readonly ProcessedHistoryRow[],
  capacity: number, policy: ProcessedPolicy, at: number): ProcessedStageDecision {
  const validation = processedGateVerdict(history("postBase"), capacity, policy, "validation", at);
  const real = validation.state === "qualified"
    ? processedGateVerdict(history("validated"), capacity, policy, "real", at, validation) : null;
  if (policy.execN === undefined) {
    const stage = validation.state !== "qualified" ? "postBase" : real?.state === "qualified" ? "active" : "validated";
    return { stage, validation, real };
  }
  const exec = real?.state === "qualified"
    ? processedGateVerdict(history("real"), capacity, policy, "exec", at, validation) : null;
  const stage = !real ? "postBase" : !exec ? "validated" : exec.state === "qualified" ? "active" : "real";
  return { stage, validation, real, exec };
}

function validGateReceipt(v: ProcessedVerdict | null | undefined, p: ProcessedPolicy, gate: ProcessedGate,
  main?: ProcessedVerdict): v is ProcessedVerdict {
  const floor = v?.autoPf?.floor ?? p.minPf;
  if (p.autoPf) {
    const a = v?.autoPf;
    if (!a || !Number.isFinite(a.floor) || a.floor < p.minPf || a.floor > p.minPf + MAX_AUTO_PF_INCREASE) return false;
    if (gate !== "validation" && p.autoPf.mode === "main") {
      if (a.source !== "main" || a.floor !== main?.autoPf?.floor) return false;
    } else if (a.source !== "own" && (a.source !== "fallback" || a.floor !== p.minPf)) return false;
  } else if (v?.autoPf !== undefined) return false;
  return validVerdict(v, processedGateSize(p, gate), floor, p.negativeFilter, p.blocks?.[gate]);
}

function validStageReceipt(item: ProcessedOpen, p: ProcessedPolicy): boolean {
  if (!validGateReceipt(item.validation, p, "validation") ||
    (p.execN !== undefined ? item.exec === undefined : item.exec !== undefined)) return false;
  if (item.validation.state !== "qualified") return item.real === null && item.exec == null && item.stage === "postBase";
  if (!validGateReceipt(item.real, p, "real", item.validation)) return false;
  if (item.real.state !== "qualified") return item.exec == null && item.stage === "validated";
  if (p.execN === undefined) return item.stage === "active";
  return validGateReceipt(item.exec, p, "exec", item.validation) &&
    item.stage === (item.exec.state === "qualified" ? "active" : "real");
}

/**
 * Causal, separate records for Base-processed, Validation-processed and Active orders. The caller may
 * add a post-Base entry only after its exact Base admission and normal processing controls have passed.
 * A later stage is admitted using only completed closes of its immediate predecessor. A cold or unknown
 * window is not a pass; it keeps collecting in the preceding stage until it has enough evidence.
 *
 * Events must arrive in chronological order. This object does not reconstruct fills, allocate funds,
 * prove Base admission, or submit exchange orders; its caller must provide those facts and a unique
 * slice ID for each verified close. Model, paper and venue records are kept in separate books.
 */
export class ProcessedSetBook {
  readonly basis: ProcessedBasis;
  readonly capacity: number;
  private readonly sets = new Map<string, SetRows>();
  private readonly open = new Map<string, ProcessedOpen>();
  private readonly seenAtClock = new Set<string>();
  private clock = -1;

  constructor(basis: ProcessedBasis, capacity: number) {
    if (!(["model", "paper", "venue"] as string[]).includes(basis) ||
      !Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError("invalid processed-set book");
    this.basis = basis;
    this.capacity = capacity;
  }

  private advance(t: number): void {
    if (!Number.isFinite(t) || t < 0 || t < this.clock) throw new RangeError("processed events must be chronological");
    if (t > this.clock) this.seenAtClock.clear();
    this.clock = t;
  }

  private rows(identity: ProcessedSetIdentity, exec: boolean): SetRows {
    const key = processedSetKey(identity);
    let rows = this.sets.get(key);
    if (!rows) {
      rows = { identity: { ...identity }, postBase: EMPTY_HISTORY, validated: EMPTY_HISTORY, active: EMPTY_HISTORY,
        ...(exec && { real: EMPTY_HISTORY }),
        counts: { postBase: EMPTY_COUNTS, validated: EMPTY_COUNTS, active: EMPTY_COUNTS, ...(exec && { real: EMPTY_COUNTS }) },
        evaluations: { validation: verdictCounts(), real: EMPTY_VERDICTS, ...(exec && { exec: EMPTY_VERDICTS }) } };
      this.sets.set(key, rows);
    } else if ((rows.real !== undefined) !== exec) throw new Error("processed stage topology changed for the same set");
    return rows;
  }

  windowEconomics(identity: ProcessedSetIdentity, source: ProcessedStage, n: number, at: number) {
    const history = this.sets.get(processedSetKey(identity))?.[source] ?? EMPTY_HISTORY;
    return processedWindowEconomics(history, n, at);
  }

  /** A decision reads only the strictly earlier completed closes of its own predecessor. */
  verdict(identity: ProcessedSetIdentity, source: ProcessedStage, n: number, minPf: number,
    beforeT?: number, negative?: NegativeLastN, blocks?: BlockPolicy): ProcessedVerdict {
    if (!execStages.includes(source) || (beforeT !== undefined && beforeT < this.clock))
      throw new RangeError("invalid processed-set policy or decision time");
    const history = this.sets.get(processedSetKey(identity))?.[source] ?? EMPTY_HISTORY;
    return processedWindowVerdict(history, this.capacity, n, minPf, beforeT, negative, blocks);
  }

  /** Separate policy histories, including after restart. No lane inherits another lane's later-stage passes. */
  acceptParallelPostBase(identity: ProcessedSetIdentity, entryId: string, entryT: number,
    lanes: Array<ProcessedPolicy & { id: string; role: "major" | "minor" | "independent" | "additional" }>): ProcessedOpen[] {
    if (!Array.isArray(lanes) || !lanes.length || lanes.length > 8) throw new RangeError("invalid processed lanes");
    const ids = new Set<string>();
    const prepared = lanes.map(p => {
      if (!nonempty(p.id) || ids.has(p.id) || !["major", "minor", "independent", "additional"].includes(p.role) || !validPolicy(p, this.capacity))
        throw new RangeError("invalid processed lane policy");
      ids.add(p.id);
      const own = { ...identity, lane: JSON.stringify([identity.lane, p.id, p.role, p.validationN, p.realN, p.minPf,
        negativeLastN(p.negativeFilter), ...(p.blocks ? [p.blocks] : []),
        ...(p.execN !== undefined || p.autoPf ? [p.execN ?? null, p.autoPf ?? null] : [])]) };
      this.preview(own, entryT, p);
      const key = entryKey(own, entryId, entryT);
      if (this.open.has(key) || (entryT === this.clock && this.seenAtClock.has(key))) throw new Error("duplicate processed entry");
      return { own, policy: { validationN: p.validationN, realN: p.realN, minPf: p.minPf,
        ...(p.execN !== undefined && { execN: p.execN }),
        ...(p.autoPf && { autoPf: p.autoPf }),
        ...(p.blocks?{blocks:structuredClone(p.blocks)}:{}),
        ...(p.negativeFilter ? {negativeFilter:negativeLastN(p.negativeFilter)} : {}) } };
    });
    if (!nonempty(entryId)) throw new TypeError("invalid processed entry");
    return prepared.map(p => this.acceptPostBase(p.own, entryId, entryT, p.policy));
  }

  /** Inspect the strictly prior owned windows without opening an order or retiring an observation. */
  preview(identity: ProcessedSetIdentity, entryT: number, policy: ProcessedPolicy): ProcessedStageDecision {
    if (!validPolicy(policy,this.capacity)) throw new RangeError("invalid processed-set policy");
    if (!Number.isFinite(entryT) || entryT < 0 || entryT < this.clock)
      throw new RangeError("invalid processed-set policy or decision time");
    const rows = this.sets.get(processedSetKey(identity));
    if (rows && (rows.real !== undefined) !== (policy.execN !== undefined))
      throw new Error("processed stage topology changed for the same set");
    return processedStageDecision(stage => rows?.[stage] ?? EMPTY_HISTORY, this.capacity, policy, entryT);
  }

  /** Independent readiness snapshots use the same per-stage floor rules as the actual entry decision. */
  gate(identity: ProcessedSetIdentity, source: ProcessedStage, p: ProcessedPolicy, gate: ProcessedGate,
    at: number, main?: ProcessedVerdict): ProcessedVerdict {
    if (!Number.isFinite(at) || at < this.clock) throw new RangeError("invalid processed-set gate time");
    return processedGateVerdict(this.sets.get(processedSetKey(identity))?.[source] ?? EMPTY_HISTORY,
      this.capacity, p, gate, at, main);
  }

  /** Record one actually processed, Base-qualified entry and freeze its stage at admission. */
  acceptPostBase(identity: ProcessedSetIdentity, entryId: string, entryT: number, policy: ProcessedPolicy): ProcessedOpen {
    if (!identityValid(identity) || !nonempty(entryId)) throw new TypeError("invalid processed entry");
    if (!Number.isFinite(entryT) || entryT < 0 || entryT < this.clock) throw new RangeError("processed events must be chronological");
    const decision = this.preview(identity, entryT, policy);
    const { stage, validation, real, exec } = decision;
    const key = entryKey(identity, entryId, entryT);
    if (this.open.has(key) || (entryT === this.clock && this.seenAtClock.has(key))) throw new Error("duplicate processed entry");
    this.advance(entryT);
    const hasExec = policy.execN !== undefined;
    const rows = this.rows(identity, hasExec);
    rows.evaluations.validation[validation.state]++;
    if (real) {
      if (rows.evaluations.real === EMPTY_VERDICTS) rows.evaluations.real = verdictCounts();
      rows.evaluations.real[real.state]++;
    }
    if (exec) {
      if (rows.evaluations.exec === EMPTY_VERDICTS) rows.evaluations.exec = verdictCounts();
      rows.evaluations.exec![exec.state]++;
    }
    const stages = stagesFor(hasExec);
    for (let i = 0; i <= stages.indexOf(stage); i++) {
      const key = stages[i];
      if (rows.counts[key] === EMPTY_COUNTS) rows.counts[key] = counts();
      rows.counts[key]!.openedOrders++;
    }
    const opened: ProcessedOpen = { identity: { ...identity }, entryId, entryT, policy: structuredClone(policy),
      ...decision, slices: [], settledUnitReturn: 0 };
    this.open.set(key, opened);
    this.seenAtClock.add(key);
    return structuredClone(opened);
  }

  /**
   * Each slice is a net contribution on the same original parent notional (including its cost once).
   * Partial fills are tracked but are not Last-N samples; the complete parent contributes once at final close.
   */
  close(identity: ProcessedSetIdentity, entryId: string, entryT: number, sliceId: string, exitT: number,
    unitReturn: number | null, final: boolean): void {
    if (!nonempty(entryId) || !nonempty(sliceId) || (unitReturn !== null && !Number.isFinite(unitReturn)) ||
      !Number.isFinite(exitT) || exitT < entryT || exitT < this.clock || typeof final !== "boolean")
      throw new TypeError("invalid processed close");
    const key = entryKey(identity, entryId, entryT), held = this.open.get(key);
    if (!held) throw new Error("processed close has no matching open entry");
    if (held.slices.includes(sliceId)) throw new Error("duplicate processed close slice");
    this.advance(exitT);
    const sum = held.settledUnitReturn === null || unitReturn === null ? null : held.settledUnitReturn + unitReturn;
    held.settledUnitReturn = sum !== null && Number.isFinite(sum) ? sum : null;
    const row: Close = { entryId, sliceId, entryT, exitT, unitReturn: held.settledUnitReturn };
    const hasExec = held.policy.execN !== undefined;
    const rows = this.rows(identity, hasExec);
    const stages = stagesFor(hasExec);
    const lastStage = stages.indexOf(held.stage);
    for (let i = 0; i <= lastStage; i++) {
      const stats = rows.counts[stages[i]]!;
      stats.settledSlices++;
      if (!final) continue;
      stats.closedOrders++;
      const key = stages[i];
      if (rows[key] === EMPTY_HISTORY) rows[key] = [];
      const history = rows[key]!;
      appendProcessedHistory(history, row, this.capacity);
      if (row.unitReturn === null) stats.unknownReturns++;
      else if (row.unitReturn > 0) stats.grossProfit += row.unitReturn;
      else stats.grossLoss -= row.unitReturn;
      if (!Number.isFinite(stats.grossProfit) || !Number.isFinite(stats.grossLoss)) {
        stats.aggregateUnknown = true;
        // Keep snapshots JSON-safe without pretending an overflow is a measured finite result.
        stats.grossProfit = Number.isFinite(stats.grossProfit) ? stats.grossProfit : 0;
        stats.grossLoss = Number.isFinite(stats.grossLoss) ? stats.grossLoss : 0;
      }
    }
    held.slices.push(sliceId);
    if (final) this.open.delete(key);
  }

  /** Active remains the entry-time decision until this position closes; no exchange Last-N revalidation. */
  activePositions(): ProcessedOpen[] {
    return [...this.open.values()].filter((x) => x.stage === "active").map((x) => structuredClone(x));
  }

  /** Whole-book return PF and order counts; rolling gate windows remain separate in verdict(). */
  summary(identity: ProcessedSetIdentity): ProcessedSetSummary | undefined {
    const identityKey = processedSetKey(identity);
    const rows = this.sets.get(identityKey);
    if (!rows) return undefined;
    const byStage = {} as ProcessedSetSummary["stages"];
    const lineage: NonNullable<ProcessedSetSummary["lineage"]> = [];
    let parentSetId = JSON.stringify(["base", identityKey]);
    for (const stage of stagesFor(rows.real !== undefined)) {
      const c = rows.counts[stage]!;
      const pf = c.closedOrders && !c.unknownReturns && !c.aggregateUnknown
        ? profitFactor(c.grossProfit, c.grossLoss) : null;
      byStage[stage] = { ...c, heldOrders: c.openedOrders - c.closedOrders,
        returnPf: pf !== null && Number.isFinite(pf) ? pf : null };
      if (rows.real !== undefined && c.openedOrders) {
        const setId = JSON.stringify([stage, identityKey]);
        lineage.push({ stage, setId, parentSetId });
        parentSetId = setId;
      }
    }
    return { identity: { ...rows.identity }, basis: this.basis, stages: byStage,
      evaluations: structuredClone(rows.evaluations), ...(lineage.length && { lineage }) };
  }

  snapshot(): ProcessedSetSnapshot {
    const result = structuredClone({ version: 3 as const, basis: this.basis, capacity: this.capacity, clock: this.clock,
      sets: [...this.sets.values()], open: [...this.open.values()], seenAtClock: [...this.seenAtClock] });
    // A checkpoint is mutable public data: shared internal zero objects must not alias across its sets/stages.
    for (const set of result.sets) {
      for (const stage of stagesFor(set.real !== undefined)) {
        if (!set[stage]!.length) set[stage] = [];
        if (zeroCounts(set.counts[stage]!)) set.counts[stage] = counts();
      }
      if (zeroVerdicts(set.evaluations.real)) set.evaluations.real = verdictCounts();
      if (set.evaluations.exec && zeroVerdicts(set.evaluations.exec)) set.evaluations.exec = verdictCounts();
    }
    return result;
  }

  /** Restore only structurally consistent books; corrupted state is not turned into qualification evidence. */
  static restore(snapshot: ProcessedSetSnapshot): ProcessedSetBook {
    if (!snapshot || snapshot.version !== 3 || !Number.isFinite(snapshot.clock) || snapshot.clock < -1 ||
      !Array.isArray(snapshot.sets) || !Array.isArray(snapshot.open) || !Array.isArray(snapshot.seenAtClock))
      throw new TypeError("invalid processed-set snapshot");
    const book = new ProcessedSetBook(snapshot.basis, snapshot.capacity);
    book.clock = snapshot.clock;
    for (const set of snapshot.sets) {
      const key = processedSetKey(set.identity);
      if (book.sets.has(key)) throw new Error("duplicate processed set");
      const hasExec = set.real !== undefined;
      const stages = stagesFor(hasExec);
      if ((set.counts?.real !== undefined) !== hasExec || (set.evaluations?.exec !== undefined) !== hasExec)
        throw new TypeError("invalid processed-stage topology");
      for (const stage of stages) {
        const rows = set[stage];
        if (!Array.isArray(rows) || rows.length > 2 * snapshot.capacity) throw new TypeError("invalid processed history");
        const c = set.counts?.[stage];
        if (!c || ![c.openedOrders, c.closedOrders, c.settledSlices, c.unknownReturns].every(Number.isSafeInteger) ||
          c.openedOrders < 0 || c.closedOrders < 0 || c.closedOrders > c.openedOrders ||
          c.settledSlices < c.closedOrders || c.closedOrders < rows.length || c.unknownReturns < 0 ||
          c.unknownReturns > c.closedOrders || !Number.isFinite(c.grossProfit) || c.grossProfit < 0 ||
          !Number.isFinite(c.grossLoss) || c.grossLoss < 0 || typeof c.aggregateUnknown !== "boolean")
          throw new TypeError("invalid processed totals");
        let prior = -1;
        const seenSlices = new Set<string>();
        for (const row of rows) {
          if (!nonempty(row.entryId) || !nonempty(row.sliceId) || !Number.isFinite(row.entryT) ||
            !Number.isFinite(row.exitT) || row.entryT < 0 || row.exitT < row.entryT || row.exitT < prior ||
            row.exitT > snapshot.clock || (row.unitReturn !== null && !Number.isFinite(row.unitReturn)))
            throw new TypeError("invalid processed close history");
          const slice = JSON.stringify([row.entryId, row.entryT, row.sliceId]);
          if (seenSlices.has(slice)) throw new TypeError("duplicate processed close history");
          seenSlices.add(slice);
          prior = row.exitT;
        }
        const latestT = rows.at(-1)?.exitT;
        const latestCount = rows.filter((row) => row.exitT === latestT).length;
        if (latestCount > snapshot.capacity || rows.length - latestCount > snapshot.capacity)
          throw new TypeError("invalid processed history boundary");
        if (rows.filter((row) => row.unitReturn === null).length > c.unknownReturns)
          throw new TypeError("invalid unknown-return total");
      }
      const validCounts = (v: VerdictCounts | undefined) => !!v &&
        (["insufficient", "unknown", "failed", "qualified"] as const).every((k) => Number.isSafeInteger(v[k]) && v[k] >= 0);
      const v = set.evaluations?.validation, r = set.evaluations?.real, e = set.evaluations?.exec;
      const total = (x: VerdictCounts) => x.insufficient + x.unknown + x.failed + x.qualified;
      if (!validCounts(v) || !validCounts(r) || total(v) !== set.counts.postBase.openedOrders ||
        v.qualified !== set.counts.validated.openedOrders || total(r) !== set.counts.validated.openedOrders ||
        r.qualified !== (set.counts.real ?? set.counts.active).openedOrders ||
        (hasExec && (!e || !validCounts(e) || total(e) !== set.counts.real!.openedOrders ||
          e.qualified !== set.counts.active.openedOrders)) ||
        stages.slice(1).some((stage, i) => {
          const child = set.counts[stage]!, parent = set.counts[stages[i]]!;
          return child.closedOrders > parent.closedOrders || child.settledSlices > parent.settledSlices;
        }))
        throw new TypeError("invalid processed-stage progression");
      const copy = structuredClone(set);
      for (const stage of stages) {
        if (!copy[stage]!.length) copy[stage] = EMPTY_HISTORY;
        if (zeroCounts(copy.counts[stage]!)) copy.counts[stage] = EMPTY_COUNTS;
      }
      if (zeroVerdicts(copy.evaluations.real)) copy.evaluations.real = EMPTY_VERDICTS;
      if (copy.evaluations.exec && zeroVerdicts(copy.evaluations.exec)) copy.evaluations.exec = EMPTY_VERDICTS;
      book.sets.set(key, copy);
    }
    for (const item of snapshot.open) {
      const key = entryKey(item.identity, item.entryId, item.entryT);
      const p = item.policy;
      const stored = book.sets.get(processedSetKey(item.identity));
      const decisionValid = validPolicy(p, snapshot.capacity) && validStageReceipt(item, p) &&
        (p.execN !== undefined) === (stored?.real !== undefined);
      if (!nonempty(item.entryId) || !Number.isFinite(item.entryT) || item.entryT < 0 || item.entryT > snapshot.clock ||
        !Array.isArray(item.slices) || item.slices.some((s) => !nonempty(s)) ||
        new Set(item.slices).size !== item.slices.length ||
        (item.settledUnitReturn !== null && !Number.isFinite(item.settledUnitReturn)) ||
        (!item.slices.length && item.settledUnitReturn !== 0) || !stored ||
        book.open.has(key) || !decisionValid)
        throw new TypeError("invalid processed open entry");
      book.open.set(key, structuredClone(item));
    }
    const heldCounts = new Map<string, Partial<Record<ProcessedStage, number>>>();
    for (const entry of book.open.values()) {
      const key = processedSetKey(entry.identity), count = heldCounts.get(key) ?? {};
      const stages = stagesFor(entry.policy.execN !== undefined);
      for (let i = 0; i <= stages.indexOf(entry.stage); i++) {
        const stage = stages[i];
        count[stage] = (count[stage] ?? 0) + 1;
      }
      heldCounts.set(key, count);
    }
    for (const [key, set] of book.sets) {
      for (const stage of stagesFor(set.real !== undefined)) {
        const stats = set.counts[stage]!;
        if (stats.openedOrders - stats.closedOrders !== (heldCounts.get(key)?.[stage] ?? 0))
          throw new TypeError("invalid processed held-order count");
      }
    }
    for (const key of snapshot.seenAtClock) {
      if (!nonempty(key) || book.seenAtClock.has(key)) throw new TypeError("invalid processed entry deduplication");
      book.seenAtClock.add(key);
    }
    return book;
  }
}
