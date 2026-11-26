import {blockRequired,checkBlockPolicy,type BlockPolicy} from "../../../shared/cts-lastn/blocks.ts";
import { negativeLastN, type NegativeLastN } from "../negative-last-n.ts";
import { ProcessedSetBook, type ProcessedOpen, type ProcessedSetIdentity,
  type ProcessedSetSnapshot, type ProcessedSetSummary, type ProcessedVerdict } from "./processed-set.ts";

/** Opt-in modeled progression. Native paper/venue admission requires its own persistent adapter. */
export interface ProcessedReplayPolicy {
  blocks?: {validation?:BlockPolicy;real?:BlockPolicy};
  validationN: number;
  realN: number;
  negativeFilter?: NegativeLastN;
}

/** Reject malformed or unrecognized stages before they can be silently ignored in replay or native admission. */
export function checkedProcessedReplayPolicy(policy: ProcessedReplayPolicy): ProcessedReplayPolicy {
  if (!policy || typeof policy !== "object" || Array.isArray(policy) ||
    Object.keys(policy).some(k => !["validationN", "realN", "blocks", "negativeFilter"].includes(k)) ||
    ![policy.validationN, policy.realN].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 200))
    throw new RangeError("invalid processed-stage policy");
  if (policy.blocks !== undefined) {
    if (!policy.blocks || typeof policy.blocks !== "object" || Array.isArray(policy.blocks))
      throw new RangeError("invalid processed-stage blocks");
    for (const [stage, block] of Object.entries(policy.blocks)) {
      if (!["validation", "real"].includes(stage) || !block || typeof block !== "object" || Array.isArray(block) ||
        Object.keys(block).some(k => !["long", "short", "minimal", "shortPolarity", "minimalPolarity"].includes(k)))
        throw new RangeError("invalid processed-stage block");
      checkBlockPolicy(block);
    }
  }
  const filter = negativeLastN(policy.negativeFilter);
  return { validationN: policy.validationN, realN: policy.realN,
    ...(policy.blocks ? { blocks: structuredClone(policy.blocks) } : {}),
    ...(filter ? { negativeFilter: filter } : {}) };
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
}
export interface ProcessedReplayReport {
  basis: "model";
  at: number;
  coverageScope: "visible-config-symbol-direction";
  /** Raw candidate history is never imported into either processed window. */
  seededFromCandidates: false;
  validation: ProcessedReplayCoverage;
  real: ProcessedReplayCoverage;
  sets: ProcessedSetSummary[];
  /** Causal ledger checkpoint, not permission to restore paper or venue ownership. */
  snapshot: ProcessedSetSnapshot;
}
const coverage = (): ProcessedReplayCoverage => ({ contexts: 0, full: 0, qualified: 0,
  insufficient: 0, unknown: 0, failed: 0, fullPct: null, qualifiedPct: null });
function count(c: ProcessedReplayCoverage, v: ProcessedVerdict, n: number) {
  c.contexts++;
  // Unknown economics is unavailable evidence, even if the count is complete.
  if (v.n === n && v.state !== "unknown") c.full++;
  c[v.state]++;
  c.fullPct = 100 * c.full / c.contexts;
  c.qualifiedPct = 100 * c.qualified / c.contexts;
}

/** Connects actual native replay admissions/settlements to the independently tested processed book. */
export class ProcessedReplay {
  readonly book: ProcessedSetBook;
  readonly policy: ProcessedReplayPolicy;
  private readonly revision: string;

  constructor(policy: ProcessedReplayPolicy, cost: number) {
    if (!Number.isFinite(cost) || cost < 0) throw new RangeError("invalid processed replay cost");
    this.policy = checkedProcessedReplayPolicy(policy);
    const negativeFilter = this.policy.negativeFilter;
    this.revision = processedReplayRevision(this.policy, cost);
    this.book = new ProcessedSetBook("model", Math.max(policy.validationN, policy.realN, ...Object.values(policy.blocks??{}).map(blockRequired), ...negativeFilter?.windows ?? []));
  }

  identity(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, minPf: number): ProcessedSetIdentity {
    if (!Number.isFinite(minPf) || minPf <= 1) throw new RangeError("processed PF floor must exceed one");
    return { baseConfigId: tp.id, symbol, side, kind: tp.kind,
      lane: JSON.stringify([tp.ind, this.policy.validationN, this.policy.realN, minPf]), economicRevision: this.revision };
  }

  /** Read the exact predecessor windows without opening an entry or mutating their counters. */
  readyForActive(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number): boolean {
    const identity = this.identity(tp, symbol, side, minPf);
    const validation = this.book.verdict(identity, "postBase", this.policy.validationN, minPf, entryT,
      this.policy.negativeFilter, this.policy.blocks?.validation);
    return validation.state === "qualified" && this.book.verdict(identity, "validated", this.policy.realN, minPf,
      entryT, this.policy.negativeFilter, this.policy.blocks?.real).state === "qualified";
  }

  enter(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number,
    allowActive = true): ProcessedOpen {
    const identity = this.identity(tp, symbol, side, minPf);
    // An onset has one parent. Future exit price/time/return cannot change its identity.
    const entryId = JSON.stringify([tp.id, symbol, side, entryT]);
    return this.book.acceptPostBase(identity, entryId, entryT, { ...this.policy, minPf }, allowActive);
  }

  settle(open: ProcessedOpen, exitT: number, unitReturn: number | null): void {
    this.book.close(open.identity, open.entryId, open.entryT, "final", exitT,
      unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null, true);
  }

  report(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>): ProcessedReplayReport {
    const validation = coverage(), real = coverage(), sets: ProcessedSetSummary[] = [];
    for (const { identity, minPf } of contexts) {
      count(validation, this.book.verdict(identity, "postBase", this.policy.validationN, minPf, at, this.policy.negativeFilter,this.policy.blocks?.validation), this.policy.blocks?.validation?blockRequired(this.policy.blocks.validation):this.policy.validationN);
      count(real, this.book.verdict(identity, "validated", this.policy.realN, minPf, at, this.policy.negativeFilter,this.policy.blocks?.real), this.policy.blocks?.real?blockRequired(this.policy.blocks.real):this.policy.realN);
      const summary = this.book.summary(identity);
      if (summary) sets.push(summary);
    }
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real, sets, snapshot: this.book.snapshot() };
  }
}
