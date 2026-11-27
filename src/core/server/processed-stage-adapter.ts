import { frozenProcessedPolicy, furthestProcessedDecision, processedLaneKey, processedLanes,
  qualifiesProcessedBase, requiresOppositeMainSource, requiresProcessedBaseCheck,
  type ProcessedBaseCheck, type ProcessedReplayContext, type ProcessedReplayPolicy } from "../sim/processed-replay.ts";
import {
  processedPolicyCapacity,
  PROCESSED_AUTO_PF_SAMPLES,
  ProcessedSetBook,
  processedSetKey,
  type ProcessedOpen,
  type ProcessedSetIdentity,
  type ProcessedSetSnapshot,
  type ProcessedStage,
  type ProcessedStageDecision,
} from "../sim/processed-set.ts";

const STANDARD_CAPACITY = 500;
const MAX_BLOCK_CAPACITY = 500 + 200 + 5 + PROCESSED_AUTO_PF_SAMPLES;
function capacityFor(policy: ProcessedReplayPolicy): number {
  return Math.max(STANDARD_CAPACITY, ...processedLanes(policy).map(l => processedPolicyCapacity(l.policy)));
}
const SETTLED_LIMIT = 20_000;

export interface NativeProcessedSnapshot {
  version: 1;
  book: ProcessedSetSnapshot;
  /** Recent terminal parents make a checkpoint replay idempotent across a paper-book/checkpoint boundary. */
  settled: string[];
}

export type NativeProcessedDecision = ProcessedStageDecision;

const entryId = (cfg: string, sym: string, side: number, entryT: number) =>
  `${cfg}|${sym}|${side > 0 ? 1 : -1}|${entryT}`;

function checkedPolicy(policy: ProcessedReplayPolicy): ProcessedReplayPolicy {
  const checked = frozenProcessedPolicy(policy);
  if (capacityFor(checked) > MAX_BLOCK_CAPACITY) throw new RangeError("native processed-stage window exceeds capacity");
  return checked;
}

/** Stable native paper/venue stage identity for the exact windows, filters, blocks and modeled cost. */
export function nativeProcessedRevision(policy: ProcessedReplayPolicy, cost: number): string {
  if (!Number.isFinite(cost) || cost < 0)
    throw new RangeError("invalid native processed-stage cost");
  return JSON.stringify(["processed-native-v2", cost, checkedPolicy(policy)]);
}

/**
 * Durable paper-stage bridge for the native Base -> Main -> Real -> Exec pipeline.
 *
 * It never imports candidate history. Only entries that survived the runtime's ordinary execution controls are
 * admitted, and only their exact terminal paper result settles the parent. The entry-time verdict is frozen in the
 * ProcessedSetBook, so later losses can block new exposure without reclassifying or closing a held parent.
 */
export class NativeProcessedStageAdapter {
  readonly book: ProcessedSetBook;
  readonly policy: ProcessedReplayPolicy;
  /** Exact processed-stage policy and modeled-cost identity frozen into every admitted parent. */
  readonly revision: string;
  readonly checksBase: boolean;
  readonly hasNativeSource: boolean;
  private readonly lanes: Array<ReturnType<typeof processedLanes>[number] & { revision: string }>;
  private readonly open = new Map<string, ProcessedOpen[]>();
  private readonly settledQueue: string[];
  private readonly settled: Set<string>;

  constructor(policy: ProcessedReplayPolicy, cost: number, snapshot?: NativeProcessedSnapshot) {
    this.policy = checkedPolicy(policy);
    this.revision = nativeProcessedRevision(this.policy, cost);
    // The native paper entry receives the Base side's price path. A negative Main lane needs a separate
    // opposite-side source and cannot use this parent's same-side receipt to create fresh exposure.
    this.lanes = processedLanes(this.policy).filter(l => !requiresOppositeMainSource(l.policy))
      .map(l => ({ ...l, revision: nativeProcessedRevision(l.policy, cost) }));
    this.checksBase = this.lanes.some(l => requiresProcessedBaseCheck(l.policy));
    this.hasNativeSource = this.lanes.length > 0;
    if (snapshot) {
      if (
        snapshot.version !== 1 ||
        !Array.isArray(snapshot.settled) ||
        snapshot.settled.some((x) => typeof x !== "string")
      )
        throw new TypeError("invalid native processed-stage snapshot");
      const previous = ProcessedSetBook.restore(snapshot.book);
      if (previous.basis !== "paper" || previous.capacity < STANDARD_CAPACITY || previous.capacity > MAX_BLOCK_CAPACITY)
        throw new TypeError("invalid native processed-stage book");
      const capacity = Math.max(previous.capacity, capacityFor(this.policy));
      this.book = previous.capacity === capacity ? previous : ProcessedSetBook.restore({ ...snapshot.book, capacity });
      this.settledQueue = snapshot.settled.slice(-SETTLED_LIMIT);
    } else {
      this.book = new ProcessedSetBook("paper", capacityFor(this.policy));
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
      const laneKey: unknown = JSON.parse(item.identity.lane);
      if (!Array.isArray(laneKey) || (laneKey.length !== 4 && laneKey.length !== 5) ||
        (laneKey.length === 5 && typeof laneKey[4] !== "string"))
        throw new TypeError("invalid native processed-stage lane");
      const group = this.open.get(key);
      if (key !== item.entryId || this.settled.has(key) ||
        group?.some(o => processedSetKey(o.identity) === processedSetKey(item.identity)))
        throw new TypeError("invalid native processed-stage ownership");
      if (group) group.push(item); else this.open.set(key, [item]);
    }
  }

  identity(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    minPf: number,
    lane = this.lanes[0],
  ): ProcessedSetIdentity {
    if (!lane || !tp.id || !tp.kind || !tp.ind || !symbol || !Number.isFinite(minPf) || minPf <= 1)
      throw new RangeError("invalid native processed-stage identity");
    return {
      baseConfigId: tp.id,
      symbol,
      side,
      kind: tp.kind,
      lane: processedLaneKey(tp, lane.policy, minPf, lane.id),
      economicRevision: lane.revision,
    };
  }

  preview(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    at: number,
    minPf: number,
    base?: ProcessedBaseCheck,
  ): NativeProcessedDecision | null {
    const lanes = this.lanes.filter(({ policy: p }) => qualifiesProcessedBase(p, base));
    return lanes.length ? furthestProcessedDecision(lanes.map(lane =>
      this.book.preview(this.identity(tp, symbol, side, minPf, lane), at, { ...lane.policy, minPf }))) : null;
  }

  enter(
    tp: ProcessedReplayContext,
    symbol: string,
    side: 1 | -1,
    at: number,
    minPf: number,
    base?: ProcessedBaseCheck,
  ): ProcessedOpen {
    const id = entryId(tp.id, symbol, side, at);
    if (this.open.has(id) || this.settled.has(id))
      throw new Error("duplicate native processed-stage parent");
    const set = this.lanes.filter(({ policy: p }) => qualifiesProcessedBase(p, base)).map(lane => ({
      identity: this.identity(tp, symbol, side, minPf, lane), policy: { ...lane.policy, minPf },
    }));
    if (!set.length) throw new Error("no Base-qualified native processed lane");
    for (const own of set) this.book.preview(own.identity, at, own.policy);
    const opened = set.map(own => this.book.acceptPostBase(own.identity, id, at, own.policy));
    this.open.set(id, opened);
    return structuredClone(furthestProcessedDecision(opened));
  }

  stageFor(id: string): ProcessedStage | null {
    const opened = this.open.get(id);
    return opened ? furthestProcessedDecision(opened).stage : null;
  }

  decisionFor(id: string): NativeProcessedDecision | null {
    const current = this.open.get(id)?.filter(o => {
      const laneKey = JSON.parse(o.identity.lane) as unknown[];
      const laneId = laneKey[4] ?? "";
      return this.lanes.some(l => l.id === laneId && l.revision === o.identity.economicRevision);
    });
    const opened = current?.length ? furthestProcessedDecision(current) : undefined;
    return opened
      ? structuredClone({ stage: opened.stage, validation: opened.validation, real: opened.real,
          ...(opened.exec !== undefined && { exec: opened.exec }) })
      : null;
  }

  settle(id: string, exitT: number, unitReturn: number | null): "settled" | "already-settled" {
    if (this.settled.has(id)) return "already-settled";
    const opened = this.open.get(id);
    if (!opened) throw new Error("native processed-stage parent is not open");
    for (const order of opened) this.book.close(
      order.identity,
      order.entryId,
      order.entryT,
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
      .sort((a, b) => a[1][0].entryT - b[1][0].entryT);
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
