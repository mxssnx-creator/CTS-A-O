import { blockRequired, checkBlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import { negativeLastN } from "../negative-last-n.ts";
import type { ProcessedReplayContext, ProcessedReplayPolicy } from "../sim/processed-replay.ts";
import {
  ProcessedSetBook,
  type ProcessedOpen,
  type ProcessedSetIdentity,
  type ProcessedSetSnapshot,
  type ProcessedStage,
  type ProcessedVerdict,
} from "../sim/processed-set.ts";

const CAPACITY = 500;
const SETTLED_LIMIT = 20_000;

export interface NativeProcessedSnapshot {
  version: 1;
  book: ProcessedSetSnapshot;
  /** Recent terminal parents make a checkpoint replay idempotent across a paper-book/checkpoint boundary. */
  settled: string[];
}

export interface NativeProcessedDecision {
  stage: ProcessedStage;
  validation: ProcessedVerdict;
  real: ProcessedVerdict | null;
}

const entryId = (cfg: string, sym: string, side: number, entryT: number) =>
  `${cfg}|${sym}|${side > 0 ? 1 : -1}|${entryT}`;

function checkedPolicy(policy: ProcessedReplayPolicy): ProcessedReplayPolicy {
  if (
    !policy ||
    ![policy.validationN, policy.realN].every((n) => Number.isSafeInteger(n) && n >= 1 && n <= 200)
  )
    throw new RangeError("invalid native processed-stage policy");
  if (policy.blocks) for (const block of Object.values(policy.blocks)) checkBlockPolicy(block);
  const negativeFilter = negativeLastN(policy.negativeFilter);
  const required = Math.max(
    policy.validationN,
    policy.realN,
    ...Object.values(policy.blocks ?? {}).map(blockRequired),
    ...(negativeFilter?.windows ?? []),
  );
  if (required > CAPACITY) throw new RangeError("native processed-stage window exceeds capacity");
  return {
    validationN: policy.validationN,
    realN: policy.realN,
    ...(policy.blocks ? { blocks: structuredClone(policy.blocks) } : {}),
    ...(negativeFilter ? { negativeFilter } : {}),
  };
}

/**
 * Durable paper-stage bridge for the native Base -> Main -> Real pipeline.
 *
 * It never imports candidate history. Only entries that survived the runtime's ordinary execution controls are
 * admitted, and only their exact terminal paper result settles the parent. The entry-time verdict is frozen in the
 * ProcessedSetBook, so later losses can block new exposure without reclassifying or closing a held parent.
 */
export class NativeProcessedStageAdapter {
  readonly book: ProcessedSetBook;
  readonly policy: ProcessedReplayPolicy;
  private readonly revision: string;
  private readonly open = new Map<string, ProcessedOpen>();
  private readonly settledQueue: string[];
  private readonly settled: Set<string>;

  constructor(policy: ProcessedReplayPolicy, cost: number, snapshot?: NativeProcessedSnapshot) {
    this.policy = checkedPolicy(policy);
    if (!Number.isFinite(cost) || cost < 0)
      throw new RangeError("invalid native processed-stage cost");
    this.revision = JSON.stringify(["processed-native-v1", cost, this.policy]);
    if (snapshot) {
      if (
        snapshot.version !== 1 ||
        !Array.isArray(snapshot.settled) ||
        snapshot.settled.some((x) => typeof x !== "string")
      )
        throw new TypeError("invalid native processed-stage snapshot");
      this.book = ProcessedSetBook.restore(snapshot.book);
      if (this.book.basis !== "paper" || this.book.capacity !== CAPACITY)
        throw new TypeError("invalid native processed-stage book");
      this.settledQueue = snapshot.settled.slice(-SETTLED_LIMIT);
    } else {
      this.book = new ProcessedSetBook("paper", CAPACITY);
      this.settledQueue = [];
    }
    this.settled = new Set(this.settledQueue);
    for (const item of this.book.snapshot().open) {
      const key = entryId(
        item.identity.baseConfigId,
        item.identity.symbol,
        item.identity.side,
        item.entryT,
      );
      if (key !== item.entryId || this.open.has(key) || this.settled.has(key))
        throw new TypeError("invalid native processed-stage ownership");
      this.open.set(key, item);
    }
  }

  identity(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    minPf: number,
  ): ProcessedSetIdentity {
    if (!tp.id || !tp.kind || !tp.ind || !symbol || !Number.isFinite(minPf) || minPf <= 1)
      throw new RangeError("invalid native processed-stage identity");
    return {
      baseConfigId: tp.id,
      symbol,
      side,
      kind: tp.kind,
      lane: JSON.stringify([tp.ind, this.policy.validationN, this.policy.realN, minPf]),
      economicRevision: this.revision,
    };
  }

  preview(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    at: number,
    minPf: number,
  ): NativeProcessedDecision {
    const identity = this.identity(tp, symbol, side, minPf);
    const validation = this.book.verdict(
      identity,
      "postBase",
      this.policy.validationN,
      minPf,
      at,
      this.policy.negativeFilter,
      this.policy.blocks?.validation,
    );
    const real =
      validation.state === "qualified"
        ? this.book.verdict(
            identity,
            "validated",
            this.policy.realN,
            minPf,
            at,
            this.policy.negativeFilter,
            this.policy.blocks?.real,
          )
        : null;
    return {
      stage:
        validation.state !== "qualified"
          ? "postBase"
          : real?.state === "qualified"
            ? "active"
            : "validated",
      validation,
      real,
    };
  }

  enter(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    at: number,
    minPf: number,
  ): ProcessedOpen {
    const id = entryId(tp.id, symbol, side, at);
    if (this.open.has(id) || this.settled.has(id))
      throw new Error("duplicate native processed-stage parent");
    const identity = this.identity(tp, symbol, side, minPf);
    const opened = this.book.acceptPostBase(identity, id, at, { ...this.policy, minPf });
    this.open.set(id, opened);
    return structuredClone(opened);
  }

  stageFor(id: string): ProcessedStage | null {
    return this.open.get(id)?.stage ?? null;
  }

  decisionFor(id: string): NativeProcessedDecision | null {
    const opened = this.open.get(id);
    return opened
      ? structuredClone({ stage: opened.stage, validation: opened.validation, real: opened.real })
      : null;
  }

  settle(id: string, exitT: number, unitReturn: number | null): "settled" | "already-settled" {
    if (this.settled.has(id)) return "already-settled";
    const opened = this.open.get(id);
    if (!opened) throw new Error("native processed-stage parent is not open");
    this.book.close(
      opened.identity,
      opened.entryId,
      opened.entryT,
      "final",
      exitT,
      unitReturn !== null && Number.isFinite(unitReturn) ? unitReturn : null,
      true,
    );
    this.open.delete(id);
    this.settled.add(id);
    this.settledQueue.push(id);
    while (this.settledQueue.length > SETTLED_LIMIT)
      this.settled.delete(this.settledQueue.shift()!);
    return "settled";
  }

  /** A durable stage parent without a paper position after restart has unknown execution, never an invented return. */
  reconcile(knownOpenIds: ReadonlySet<string>, at: number): number {
    const missing = [...this.open]
      .filter(([id]) => !knownOpenIds.has(id))
      .sort((a, b) => a[1].entryT - b[1].entryT);
    if (!missing.length) return 0;
    const clock = this.book.snapshot().clock;
    const exitT = Math.max(at, clock);
    for (const [id] of missing) this.settle(id, exitT, null);
    return missing.length;
  }

  snapshot(): NativeProcessedSnapshot {
    return { version: 1, book: this.book.snapshot(), settled: [...this.settledQueue] };
  }
}
