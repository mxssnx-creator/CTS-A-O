import { profitFactor } from "../metrics/stats.ts";

/** A processed set remains tied to the complete Base configuration and its economic policy. */
export interface ProcessedSetIdentity {
  baseConfigId: string;
  symbol: string;
  side: 1 | -1;
  kind: string;
  lane: string;
  economicRevision: string;
}

export type ProcessedStage = "postBase" | "validated" | "active";
export type ProcessedBasis = "model" | "paper" | "venue";
export type ProcessedVerdict = {
  state: "insufficient" | "unknown" | "failed" | "qualified";
  n: number;
  pf: number | null;
};
export interface ProcessedPolicy {
  validationN: number;
  realN: number;
  minPf: number;
}
interface Close {
  entryId: string;
  sliceId: string;
  entryT: number;
  exitT: number;
  /** Actual, already cost-adjusted unit return. Null is an observation with unknown return. */
  unitReturn: number | null;
}
interface SetRows {
  identity: ProcessedSetIdentity;
  postBase: Close[];
  validated: Close[];
  active: Close[];
  counts: Record<ProcessedStage, StageCounts>;
  evaluations: { validation: VerdictCounts; real: VerdictCounts };
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
  stages: Record<ProcessedStage, StageCounts & { heldOrders: number; returnPf: number | null }>;
  evaluations: { validation: VerdictCounts; real: VerdictCounts };
}
export interface ProcessedOpen {
  identity: ProcessedSetIdentity;
  entryId: string;
  entryT: number;
  validation: ProcessedVerdict;
  real: ProcessedVerdict | null;
  stage: ProcessedStage;
  /** Already settled slices for this still-open order, preventing repeated cumulative updates. */
  slices: string[];
}
export interface ProcessedSetSnapshot {
  version: 1;
  basis: ProcessedBasis;
  capacity: number;
  clock: number;
  sets: SetRows[];
  open: ProcessedOpen[];
  seenAtClock: string[];
}

const stages: ProcessedStage[] = ["postBase", "validated", "active"];
const counts = (): StageCounts => ({ openedOrders: 0, closedOrders: 0, settledSlices: 0,
  grossProfit: 0, grossLoss: 0, unknownReturns: 0, aggregateUnknown: false });
const verdictCounts = (): VerdictCounts => ({ insufficient: 0, unknown: 0, failed: 0, qualified: 0 });
const nonempty = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
function identityValid(i: ProcessedSetIdentity): boolean {
  return !!i && nonempty(i.baseConfigId) && nonempty(i.symbol) && (i.side === 1 || i.side === -1) &&
    nonempty(i.kind) && nonempty(i.lane) && nonempty(i.economicRevision);
}
/** JSON encoding avoids collisions when config or lane IDs themselves contain separators. */
export function processedSetKey(i: ProcessedSetIdentity): string {
  if (!identityValid(i)) throw new TypeError("invalid processed-set identity");
  return JSON.stringify([i.baseConfigId, i.symbol, i.side, i.kind, i.lane, i.economicRevision]);
}
const entryKey = (i: ProcessedSetIdentity, id: string, entryT: number) =>
  JSON.stringify([processedSetKey(i), id, entryT]);

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
      !Number.isSafeInteger(capacity) || capacity < 9) throw new RangeError("invalid processed-set book");
    this.basis = basis;
    this.capacity = capacity;
  }

  private advance(t: number): void {
    if (!Number.isFinite(t) || t < 0 || t < this.clock) throw new RangeError("processed events must be chronological");
    if (t > this.clock) this.seenAtClock.clear();
    this.clock = t;
  }

  private rows(identity: ProcessedSetIdentity): SetRows {
    const key = processedSetKey(identity);
    let rows = this.sets.get(key);
    if (!rows) {
      rows = { identity: { ...identity }, postBase: [], validated: [], active: [],
        counts: { postBase: counts(), validated: counts(), active: counts() },
        evaluations: { validation: verdictCounts(), real: verdictCounts() } };
      this.sets.set(key, rows);
    }
    return rows;
  }

  /**
   * No empty, partial, or unknown window is promoted to a passing PF. A decision at beforeT can
   * use only closes strictly earlier than that time, including when same-time closes arrived first.
   * Without beforeT this reports the latest completed record, including closes at the book's clock.
   */
  verdict(identity: ProcessedSetIdentity, source: ProcessedStage, n: number, minPf: number,
    beforeT?: number): ProcessedVerdict {
    if (!stages.includes(source) || !Number.isSafeInteger(n) || n < 8 || n > this.capacity ||
      !Number.isFinite(minPf) || minPf <= 1 ||
      (beforeT !== undefined && (!Number.isFinite(beforeT) || beforeT < 0 || beforeT < this.clock)))
      throw new RangeError("invalid processed-set policy or decision time");
    const history = this.sets.get(processedSetKey(identity))?.[source] ?? [];
    let end = history.length;
    if (beforeT !== undefined) {
      let lo = 0, hi = end;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (history[mid].exitT < beforeT) lo = mid + 1; else hi = mid;
      }
      end = lo;
    }
    const values = history.slice(Math.max(0, end - n), end);
    if (values.some((x) => x.unitReturn === null || !Number.isFinite(x.unitReturn)))
      return { state: "unknown", n: values.length, pf: null };
    if (values.length < n) return { state: "insufficient", n: values.length, pf: null };
    let gp = 0, gl = 0;
    for (const row of values) {
      const r = row.unitReturn!;
      if (r > 0) gp += r; else gl -= r;
    }
    if (!Number.isFinite(gp) || !Number.isFinite(gl)) return { state: "unknown", n: values.length, pf: null };
    const pf = profitFactor(gp, gl);
    if (!Number.isFinite(pf)) return { state: "unknown", n: values.length, pf: null };
    return { state: gp > gl && pf >= minPf ? "qualified" : "failed", n: values.length, pf };
  }

  /** Record one actually processed, Base-qualified entry and freeze its stage at admission. */
  acceptPostBase(identity: ProcessedSetIdentity, entryId: string, entryT: number, policy: ProcessedPolicy): ProcessedOpen {
    if (!identityValid(identity) || !nonempty(entryId)) throw new TypeError("invalid processed entry");
    if (!Number.isFinite(entryT) || entryT < 0 || entryT < this.clock) throw new RangeError("processed events must be chronological");
    // Validate both windows before mutating the clock or records.
    const validation = this.verdict(identity, "postBase", policy.validationN, policy.minPf, entryT);
    const real = validation.state === "qualified" ? this.verdict(identity, "validated", policy.realN, policy.minPf, entryT) : null;
    if (real === null && (!Number.isSafeInteger(policy.realN) || policy.realN < 8 || policy.realN > this.capacity))
      throw new RangeError("invalid processed-set policy");
    const key = entryKey(identity, entryId, entryT);
    if (this.open.has(key) || (entryT === this.clock && this.seenAtClock.has(key))) throw new Error("duplicate processed entry");
    this.advance(entryT);
    const stage = validation.state !== "qualified" ? "postBase" : real?.state === "qualified" ? "active" : "validated";
    const rows = this.rows(identity);
    rows.evaluations.validation[validation.state]++;
    if (real) rows.evaluations.real[real.state]++;
    for (let i = 0; i <= stages.indexOf(stage); i++) rows.counts[stages[i]].openedOrders++;
    const opened: ProcessedOpen = { identity: { ...identity }, entryId, entryT, validation, real, stage, slices: [] };
    this.open.set(key, opened);
    this.seenAtClock.add(key);
    return structuredClone(opened);
  }

  /** A partial close counts once; a final close removes the held order only after recording its own slice. */
  close(identity: ProcessedSetIdentity, entryId: string, entryT: number, sliceId: string, exitT: number,
    unitReturn: number | null, final: boolean): void {
    if (!nonempty(entryId) || !nonempty(sliceId) || (unitReturn !== null && !Number.isFinite(unitReturn)) ||
      !Number.isFinite(exitT) || exitT < entryT || exitT < this.clock || typeof final !== "boolean")
      throw new TypeError("invalid processed close");
    const key = entryKey(identity, entryId, entryT), held = this.open.get(key);
    if (!held) throw new Error("processed close has no matching open entry");
    if (held.slices.includes(sliceId)) throw new Error("duplicate processed close slice");
    this.advance(exitT);
    const row: Close = { entryId, sliceId, entryT, exitT, unitReturn };
    const rows = this.rows(identity);
    const lastStage = stages.indexOf(held.stage);
    for (let i = 0; i <= lastStage; i++) {
      const history = rows[stages[i]];
      history.push(row);
      // Preserve the latest full prior window separately from this timestamp's closes. A batch of
      // same-time closes may arrive before an entry, but must not evict the entry's prior evidence.
      let lo = 0, hi = history.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (history[mid].exitT < exitT) lo = mid + 1; else hi = mid;
      }
      let currentStart = lo;
      if (currentStart > this.capacity) {
        const remove = currentStart - this.capacity;
        history.splice(0, remove);
        currentStart -= remove;
      }
      const currentCount = history.length - currentStart;
      if (currentCount > this.capacity) history.splice(currentStart, currentCount - this.capacity);
      const stats = rows.counts[stages[i]];
      stats.settledSlices++;
      if (final) stats.closedOrders++;
      if (unitReturn === null) stats.unknownReturns++;
      else if (unitReturn > 0) stats.grossProfit += unitReturn;
      else stats.grossLoss -= unitReturn;
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
    const rows = this.sets.get(processedSetKey(identity));
    if (!rows) return undefined;
    const byStage = {} as ProcessedSetSummary["stages"];
    for (const stage of stages) {
      const c = rows.counts[stage];
      const pf = c.settledSlices && !c.unknownReturns && !c.aggregateUnknown
        ? profitFactor(c.grossProfit, c.grossLoss) : null;
      byStage[stage] = { ...c, heldOrders: c.openedOrders - c.closedOrders,
        returnPf: pf !== null && Number.isFinite(pf) ? pf : null };
    }
    return { identity: { ...rows.identity }, basis: this.basis, stages: byStage,
      evaluations: structuredClone(rows.evaluations) };
  }

  snapshot(): ProcessedSetSnapshot {
    return structuredClone({ version: 1 as const, basis: this.basis, capacity: this.capacity, clock: this.clock,
      sets: [...this.sets.values()], open: [...this.open.values()], seenAtClock: [...this.seenAtClock] });
  }

  /** Restore only structurally consistent books; corrupted state is not turned into qualification evidence. */
  static restore(snapshot: ProcessedSetSnapshot): ProcessedSetBook {
    if (!snapshot || snapshot.version !== 1 || !Number.isFinite(snapshot.clock) || snapshot.clock < -1 ||
      !Array.isArray(snapshot.sets) || !Array.isArray(snapshot.open) || !Array.isArray(snapshot.seenAtClock))
      throw new TypeError("invalid processed-set snapshot");
    const book = new ProcessedSetBook(snapshot.basis, snapshot.capacity);
    book.clock = snapshot.clock;
    for (const set of snapshot.sets) {
      const key = processedSetKey(set.identity);
      if (book.sets.has(key)) throw new Error("duplicate processed set");
      for (const stage of stages) {
        const rows = set[stage];
        if (!Array.isArray(rows) || rows.length > 2 * snapshot.capacity) throw new TypeError("invalid processed history");
        const c = set.counts?.[stage];
        if (!c || ![c.openedOrders, c.closedOrders, c.settledSlices, c.unknownReturns].every(Number.isSafeInteger) ||
          c.openedOrders < 0 || c.closedOrders < 0 || c.closedOrders > c.openedOrders ||
          c.settledSlices < c.closedOrders || c.settledSlices < rows.length || c.unknownReturns < 0 ||
          c.unknownReturns > c.settledSlices || !Number.isFinite(c.grossProfit) || c.grossProfit < 0 ||
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
      const v = set.evaluations?.validation, r = set.evaluations?.real;
      const total = (x: VerdictCounts) => x.insufficient + x.unknown + x.failed + x.qualified;
      if (!validCounts(v) || !validCounts(r) || total(v) !== set.counts.postBase.openedOrders ||
        v.qualified !== set.counts.validated.openedOrders || total(r) !== set.counts.validated.openedOrders ||
        r.qualified !== set.counts.active.openedOrders ||
        set.counts.validated.closedOrders > set.counts.postBase.closedOrders ||
        set.counts.active.closedOrders > set.counts.validated.closedOrders ||
        set.counts.validated.settledSlices > set.counts.postBase.settledSlices ||
        set.counts.active.settledSlices > set.counts.validated.settledSlices)
        throw new TypeError("invalid processed-stage progression");
      book.sets.set(key, structuredClone(set));
    }
    for (const item of snapshot.open) {
      const key = entryKey(item.identity, item.entryId, item.entryT);
      if (!nonempty(item.entryId) || !Number.isFinite(item.entryT) || item.entryT < 0 || item.entryT > snapshot.clock ||
        !stages.includes(item.stage) || !Array.isArray(item.slices) || item.slices.some((s) => !nonempty(s)) ||
        new Set(item.slices).size !== item.slices.length || !book.sets.has(processedSetKey(item.identity)) ||
        book.open.has(key) || !item.validation || (item.stage === "active" && item.real?.state !== "qualified") ||
        (item.stage !== "postBase" && item.validation.state !== "qualified"))
        throw new TypeError("invalid processed open entry");
      book.open.set(key, structuredClone(item));
    }
    const heldCounts = new Map<string, number[]>();
    for (const entry of book.open.values()) {
      const key = processedSetKey(entry.identity), count = heldCounts.get(key) ?? [0, 0, 0];
      for (let i = 0; i <= stages.indexOf(entry.stage); i++) count[i]++;
      heldCounts.set(key, count);
    }
    for (const [key, set] of book.sets) {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        if (set.counts[stage].openedOrders - set.counts[stage].closedOrders !== (heldCounts.get(key)?.[i] ?? 0))
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
