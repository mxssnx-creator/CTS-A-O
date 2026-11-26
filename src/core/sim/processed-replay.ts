import {blockRequired,checkBlockPolicy,type BlockPolicy} from "../../../shared/cts-lastn/blocks.ts";
import { negativeLastN, type NegativeLastN } from "../negative-last-n.ts";
import type { PositionWindows } from "../position-windows.ts";
import { addValidatedSetPf, emptyValidatedSetPf } from "../validated-set-pf.ts";
import type { ValidationSummary } from "./walkforward.ts";
import { ProcessedSetBook, type ProcessedOpen, type ProcessedSetIdentity,
  type ProcessedSetSnapshot, type ProcessedSetSummary, type ProcessedVerdict } from "./processed-set.ts";

/** Opt-in modeled progression. Native paper/venue admission requires its own persistent adapter. */
export interface ProcessedReplayPolicy {
  blocks?: {validation?:BlockPolicy;real?:BlockPolicy};
  validationN: number;
  realN: number;
  negativeFilter?: NegativeLastN;
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

  constructor(policy: ProcessedReplayPolicy, cost: number) {
    if (!policy || ![policy.validationN, policy.realN].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 200) ||
      !Number.isFinite(cost) || cost < 0) throw new RangeError("invalid processed replay policy");
    if(policy.blocks)for(const b of Object.values(policy.blocks))checkBlockPolicy(b);
    const negativeFilter = negativeLastN(policy.negativeFilter);
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
    const entryId = JSON.stringify([tp.id, symbol, side, entryT]);
    return this.book.acceptPostBase(identity, entryId, entryT, { ...this.policy, minPf });
  }

  preview(tp: ProcessedReplayContext, symbol: string, side: 1 | -1, entryT: number, minPf: number) {
    return this.book.preview(this.identity(tp, symbol, side, minPf), entryT, { ...this.policy, minPf });
  }

  settle(open: ProcessedOpen, exitT: number, unitReturn: number | null): void {
    this.book.close(open.identity, open.entryId, open.entryT, "final", exitT,
      unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null, true);
  }

  report(at: number, contexts: Iterable<{ identity: ProcessedSetIdentity; minPf: number }>): ProcessedReplayReport {
    const validation = coverage(), real = coverage(), sets: ProcessedSetSummary[] = [];
    const mainN = this.policy.blocks?.validation ? blockRequired(this.policy.blocks.validation) : this.policy.validationN;
    const realN = this.policy.blocks?.real ? blockRequired(this.policy.blocks.real) : this.policy.realN;
    for (const { identity, minPf } of contexts) {
      count(validation, this.book.verdict(identity, "postBase", this.policy.validationN, minPf, at,
        this.policy.negativeFilter, this.policy.blocks?.validation), mainN,
        () => this.book.windowEconomics(identity, "postBase", mainN, at));
      count(real, this.book.verdict(identity, "validated", this.policy.realN, minPf, at,
        this.policy.negativeFilter, this.policy.blocks?.real), realN,
        () => this.book.windowEconomics(identity, "validated", realN, at));
      const summary = this.book.summary(identity);
      if (summary) sets.push(summary);
    }
    finishCoverage(validation);
    finishCoverage(real);
    return { basis: "model", at, coverageScope: "visible-config-symbol-direction",
      seededFromCandidates: false, validation, real, sets, snapshot: this.book.snapshot() };
  }
}
