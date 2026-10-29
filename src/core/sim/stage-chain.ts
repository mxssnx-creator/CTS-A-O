import { processedSetKey, type ProcessedBasis, type ProcessedSetIdentity } from "./processed-set.ts";
import {
  checkStageChainSettings, compareStageObservation, dualStageGate, negativeMainTrigger, singleStageGate, stageWindow,
  minimalStageWindow, secondaryWindowsFor, stageObservationAvailability,
  type NegativeMainTrigger, type StageChainSettings, type StageGate, type StageObservation,
} from "./stage-policy.ts";

export type ChainStage = "base" | "main" | "real" | "active";
export interface StageSet {
  id: string;
  stage: ChainStage;
  identity: ProcessedSetIdentity;
  parentSetId: string | null;
  processingId: string;
  /** Exact upstream admission policy: changed gates cannot reuse a derived set's execution history. */
  admissionPolicy: string;
  variant: "direct" | "inverse";
  minPf: number;
}
interface AdmissionProof {
  sourceSetId: string;
  parentOrderId: string | null;
  gate: StageGate | null;
  negative: NegativeMainTrigger | null;
  autoScores: Array<[number, StageObservation[]]>;
}
export interface StageOrder {
  setId: string;
  orderId: string;
  positionId: string;
  entryT: number;
  admissionSeq: number;
  proof: AdmissionProof | null;
  /** Realized contributions on the original order unit; partials are not extra Last-N orders. */
  slices: Array<{ id: string; unitReturn: number | null; exitT: number; knownT: number; knownSeq: number }>;
  autoCandidates: number[];
}
interface Totals {
  openedOrders: number;
  closedOrders: number;
  openedPositions: number;
  closedPositions: number;
  settledSlices: number;
  unknownSlices: number;
  grossProfit: number;
  grossLoss: number;
  overflow: boolean;
}
interface SetRecord {
  set: StageSet;
  history: StageObservation[];
  scores: Array<[number, StageObservation[]]>;
  totals: Totals;
  evaluations: { evaluated: number; qualified: number; insufficient: number; unknown: number; failed: number;
    /** An intent outside the accepted parent stream is not a validation of a processed parent order. */
    parentMissing: number };
}
export interface StageChainSnapshot {
  version: 4;
  basis: ProcessedBasis;
  settings: StageChainSettings;
  clock: number;
  sequence: number;
  records: SetRecord[];
  open: StageOrder[];
  seenAtClock: string[];
  parentMissesAtClock: string[];
}
export interface StageSetStats extends Totals {
  set: StageSet;
  basis: ProcessedBasis;
  heldOrders: number;
  heldPositions: number;
  /** Measured return ratio of realized slices; the gate separately uses complete order contributions. */
  returnPf: number | null;
  /** A positive sample without losses has no finite measured ratio; never display the gate score 4 as PF. */
  noLoss: boolean;
  evaluations: SetRecord["evaluations"] & { percent: number | null };
}
export type StageAdmission = { ok: true; order: StageOrder } | {
  ok: false; reason: "parent-order" | "negative-trigger" | "insufficient" | "unknown" | "failed";
  gate?: StageGate; negative?: NegativeMainTrigger;
};

const nonempty = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const time = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const orderKey = (s: string, id: string, t: number) => JSON.stringify([s, id, t]);
const totals = (): Totals => ({ openedOrders: 0, closedOrders: 0, openedPositions: 0, closedPositions: 0,
  settledSlices: 0, unknownSlices: 0, grossProfit: 0, grossLoss: 0, overflow: false });
const evaluations = (): SetRecord["evaluations"] => ({ evaluated: 0, qualified: 0, insufficient: 0, unknown: 0, failed: 0, parentMissing: 0 });
const idOf = (s: Omit<StageSet, "id">) => JSON.stringify([s.stage, s.parentSetId, processedSetKey(s.identity), s.processingId, s.variant, s.minPf, s.admissionPolicy]);
const CLOCK_POLICY = "observed-before-entry-v1";
const dualKey = (p: StageChainSettings["base"]) => JSON.stringify([CLOCK_POLICY, p.primaryN, p.secondaryN, p.secondaryMode,
  [...p.secondaryWindows].sort((a, b) => a - b), p.maxShortRatio ?? .5, p.minimal ?? null]);
const sameLineage = (a: ProcessedSetIdentity, b: ProcessedSetIdentity) =>
  processedSetKey({ ...a, side: b.side }) === processedSetKey(b);
const observationValid = (r: StageObservation) => r && nonempty(r.orderId) && time(r.entryT) &&
  time(r.exitT) && r.exitT >= r.entryT && time(r.knownT) && r.knownT >= r.exitT &&
  Number.isSafeInteger(r.knownSeq) && r.knownSeq! > 0 &&
  (r.unitReturn === null || Number.isFinite(r.unitReturn));

/**
 * Distinct Base → Main → Real → Active sets, with explicit parentage and independent economics.
 * An inverse Main is a separate child of its direct Main parent. No return is copied or negated into it.
 * Callers open only after that stage's processing controls, then provide that order's own cost-adjusted closes.
 * This ledger neither reconstructs prices/fills nor sends exchange orders.
 */
export class StageChainBook {
  readonly basis: ProcessedBasis;
  private readonly policy: StageChainSettings;
  private readonly records = new Map<string, SetRecord>();
  private readonly open = new Map<string, StageOrder>();
  private readonly seenAtClock = new Set<string>();
  private readonly parentMissesAtClock = new Set<string>();
  private readonly heldPositions = new Map<string, Map<string, number>>();
  private clock = -1;
  private sequence = 0;
  private readonly capacity: number;

  constructor(basis: ProcessedBasis, settings: StageChainSettings) {
    checkStageChainSettings(settings);
    if (!(["model", "paper", "venue"] as string[]).includes(basis)) throw new TypeError("invalid stage basis");
    this.basis = basis;
    this.policy = structuredClone(settings);
    this.capacity = Math.max(settings.base.primaryN, settings.main.primaryN, settings.realN, 25);
  }

  get settings(): StageChainSettings { return structuredClone(this.policy); }

  private at(t: number): void {
    if (!time(t) || t < this.clock) throw new RangeError("stage events must follow their observation clock");
    if (t > this.clock) { this.seenAtClock.clear(); this.parentMissesAtClock.clear(); }
    this.clock = t;
  }
  private record(id: string): SetRecord {
    const r = this.records.get(id);
    if (!r) throw new Error("unknown stage set");
    return r;
  }
  private nextSequence(): number {
    if (!Number.isSafeInteger(this.sequence + 1)) throw new RangeError("stage observation sequence exhausted");
    return ++this.sequence;
  }
  private register(set: Omit<StageSet, "id">): StageSet {
    processedSetKey(set.identity);
    if (!nonempty(set.processingId) || !nonempty(set.admissionPolicy) || !Number.isFinite(set.minPf) || set.minPf <= 1)
      throw new TypeError("invalid stage set policy");
    const id = idOf(set), old = this.records.get(id);
    if (old) return structuredClone(old.set);
    const descriptor = { ...structuredClone(set), id };
    this.records.set(id, { set: descriptor, history: [], scores: [], totals: totals(), evaluations: evaluations() });
    return structuredClone(descriptor);
  }
  base(identity: ProcessedSetIdentity, minPf: number): StageSet {
    return this.register({ stage: "base", identity, parentSetId: null, processingId: "source", variant: "direct", minPf,
      admissionPolicy: dualKey(this.policy.base) });
  }
  main(baseSetId: string, processingId: string): StageSet {
    const parent = this.record(baseSetId).set;
    if (parent.stage !== "base") throw new TypeError("Main needs its exact Base parent");
    return this.register({ stage: "main", identity: parent.identity, parentSetId: parent.id,
      processingId, variant: "direct", minPf: parent.minPf, admissionPolicy: dualKey(this.policy.base) });
  }
  inverseMain(mainSetId: string, processingId: string): StageSet {
    const parent = this.record(mainSetId).set;
    if (parent.stage !== "main" || parent.variant !== "direct") throw new TypeError("inverse Main needs a direct Main parent");
    return this.register({ stage: "main", identity: { ...parent.identity, side: parent.identity.side === 1 ? -1 : 1 },
      parentSetId: parent.id, processingId, variant: "inverse", minPf: parent.minPf,
      admissionPolicy: JSON.stringify([CLOCK_POLICY, this.policy.main.primaryN, this.policy.negativeMain.enabled,
        [...this.policy.negativeMain.windows].sort((a, b) => a - b), this.policy.negativeMain.combination ?? "mean"]) });
  }
  real(mainSetId: string, processingId: string): StageSet {
    const parent = this.record(mainSetId).set;
    if (parent.stage !== "main") throw new TypeError("Real needs its exact processed Main parent");
    return this.register({ stage: "real", identity: parent.identity, parentSetId: parent.id,
      processingId, variant: parent.variant, minPf: parent.minPf, admissionPolicy: dualKey(this.policy.main) });
  }
  active(realSetId: string): StageSet {
    const parent = this.record(realSetId).set;
    if (parent.stage !== "real") throw new TypeError("Active needs its exact processed Real parent");
    return this.register({ stage: "active", identity: parent.identity, parentSetId: parent.id,
      processingId: "execution", variant: parent.variant, minPf: parent.minPf, admissionPolicy: JSON.stringify([CLOCK_POLICY, this.policy.realN]) });
  }

  gate(setId: string, entryT: number): StageGate {
    return this.decisionGate(setId, entryT, this.sequence + 1);
  }
  private decisionGate(setId: string, entryT: number, decisionSeq: number): StageGate {
    if (!time(entryT) || entryT < this.clock) throw new RangeError("invalid stage decision time");
    const r = this.record(setId), s = r.set;
    if (s.stage === "active") throw new TypeError("Active mirror has no further Last-N gate");
    return s.stage === "real" ? singleStageGate(r.history, this.policy.realN, s.minPf, entryT, decisionSeq)
      : dualStageGate(r.history, this.policy[s.stage], s.minPf, entryT, new Map(r.scores), decisionSeq);
  }

  /** A child points to a currently processed parent order at the same entry, never a raw sibling. */
  enter(setId: string, orderId: string, positionId: string, entryT: number, parentOrderId?: string): StageAdmission {
    if (!nonempty(orderId) || !nonempty(positionId) || !time(entryT) || entryT < this.clock)
      throw new TypeError("invalid stage entry");
    const r = this.record(setId), s = r.set, key = orderKey(setId, orderId, entryT);
    if (this.open.has(key) || (entryT === this.clock && this.seenAtClock.has(key))) throw new Error("duplicate stage entry");
    this.at(entryT);
    const admissionSeq = this.nextSequence();
    let proof: AdmissionProof | null = null;
    if (s.parentSetId) {
      const source = this.record(s.parentSetId);
      // Base source evidence qualifies independent Main simulations before taking their slot. Later stages
      // additionally require the exact preceding stage's accepted order, including inverse Main's trigger.
      if (source.set.stage !== "base" && (!parentOrderId || !this.open.has(orderKey(source.set.id, parentOrderId, entryT)))) {
        if (!this.parentMissesAtClock.has(key)) {
          this.parentMissesAtClock.add(key); r.evaluations.parentMissing++;
        }
        return { ok: false, reason: "parent-order" };
      }
      // An outside-parent intent does not consume a processed entry identity. The actual parent may
      // arrive later at this same observation clock; only a real evaluation/admission is deduplicated here.
      this.seenAtClock.add(key);
      if (s.stage === "main" && s.variant === "inverse") {
        const negative = negativeMainTrigger(source.history, this.policy, s.minPf, entryT, admissionSeq);
        r.evaluations.evaluated++;
        if (!negative.qualified) {
          const state = negative.primary.state === "unknown" || negative.windows.some((w) => w.state === "unknown") ? "unknown"
            : negative.primary.state === "insufficient" || negative.windows.some((w) => w.state === "insufficient") ? "insufficient" : "failed";
          r.evaluations[state]++;
          return { ok: false, reason: "negative-trigger", negative };
        }
        r.evaluations.qualified++;
        proof = { sourceSetId: source.set.id, parentOrderId: parentOrderId!, gate: null, negative, autoScores: [] };
      } else {
        const gate = this.decisionGate(source.set.id, entryT, admissionSeq);
        r.evaluations.evaluated++; r.evaluations[gate.state]++;
        if (gate.state !== "qualified") return { ok: false, reason: gate.state, gate };
        proof = { sourceSetId: source.set.id, parentOrderId: parentOrderId ?? null, gate, negative: null,
          autoScores: (source.set.stage === "base" || source.set.stage === "main") && this.policy[source.set.stage].secondaryMode === "auto"
            ? source.scores.map(([n, rows]) => [n, structuredClone(rows.filter((x) => stageObservationAvailability(x, entryT, admissionSeq) === "available")
              .slice(-this.policy[source.set.stage as "base" | "main"].primaryN))]) : [] };
      }
    } else this.seenAtClock.add(key);
    const policy = s.stage === "base" || s.stage === "main" ? this.policy[s.stage] : null;
    const primaryOk = policy && stageWindow(r.history, policy.primaryN, s.minPf, entryT, admissionSeq).state === "qualified" &&
      (!policy.minimal?.enabled || minimalStageWindow(r.history, policy.minimal, s.minPf, entryT, admissionSeq)?.state === "qualified");
    const autoCandidates = policy && primaryOk ? secondaryWindowsFor(policy).filter((n) =>
      stageWindow(r.history, n, s.minPf, entryT, admissionSeq).state === "qualified") : [];
    let positions = this.heldPositions.get(setId);
    if (!positions) { positions = new Map(); this.heldPositions.set(setId, positions); }
    const held = positions.get(positionId) ?? 0;
    if (!held) r.totals.openedPositions++;
    positions.set(positionId, held + 1);
    r.totals.openedOrders++;
    const order: StageOrder = { setId, orderId, positionId, entryT, admissionSeq, proof, slices: [], autoCandidates };
    this.open.set(key, order);
    return { ok: true, order: structuredClone(order) };
  }

  private append(rows: StageObservation[], row: StageObservation): void {
    rows.push(row); rows.sort(compareStageObservation);
    // Keep a full prior window even when many closes arrive together before an equal-time entry.
    const prior = rows.filter((x) => x.knownT < row.knownT).slice(-this.capacity);
    const current = rows.filter((x) => x.knownT === row.knownT).slice(-this.capacity);
    rows.splice(0, rows.length, ...prior, ...current); rows.sort(compareStageObservation);
  }

  /** No parent close is propagated to a child: every processed set supplies its own measured result. */
  close(setId: string, orderId: string, entryT: number, sliceId: string, exitT: number,
    unitReturn: number | null, final: boolean, knownT = exitT): void {
    if (!nonempty(sliceId) || !time(exitT) || !time(knownT) || exitT < entryT || knownT < exitT ||
      knownT < this.clock || (unitReturn !== null && !Number.isFinite(unitReturn)) || typeof final !== "boolean")
      throw new TypeError("invalid stage close");
    const key = orderKey(setId, orderId, entryT), order = this.open.get(key);
    if (!order) throw new Error("stage close has no matching processed order");
    if (order.slices.some((s) => s.id === sliceId)) throw new Error("duplicate stage close slice");
    if (order.slices.some((s) => s.exitT > exitT)) throw new Error("stage close slices must follow execution time");
    this.at(knownT);
    const knownSeq = this.nextSequence();
    const r = this.record(setId), t = r.totals;
    order.slices.push({ id: sliceId, exitT, knownT, knownSeq, unitReturn });
    t.settledSlices++;
    if (unitReturn === null) t.unknownSlices++;
    else if (unitReturn > 0) t.grossProfit += unitReturn; else t.grossLoss -= unitReturn;
    if (!Number.isFinite(t.grossProfit) || !Number.isFinite(t.grossLoss)) {
      t.overflow = true; t.grossProfit = 0; t.grossLoss = 0;
    }
    if (!final) return;
    let sum: number | null = order.slices.some((s) => s.unitReturn === null) ? null
      : order.slices.reduce((a, s) => a + s.unitReturn!, 0);
    if (sum !== null && !Number.isFinite(sum)) sum = null;
    const row = { orderId, entryT, exitT, knownT, knownSeq, unitReturn: sum };
    this.append(r.history, row);
    for (const n of order.autoCandidates) {
      let scores = r.scores.find(([k]) => k === n)?.[1];
      if (!scores) { scores = []; r.scores.push([n, scores]); r.scores.sort(([a], [b]) => a - b); }
      this.append(scores, row);
    }
    t.closedOrders++; this.open.delete(key);
    const positions = this.heldPositions.get(setId)!, held = positions.get(order.positionId)!;
    if (held === 1) { positions.delete(order.positionId); t.closedPositions++; }
    else positions.set(order.positionId, held - 1);
  }

  /** Entry-time Active admission remains valid until its own final close, regardless of later gate results. */
  activeOrders(): Array<{ set: StageSet; order: StageOrder }> {
    return [...this.open.values()].filter((o) => this.record(o.setId).set.stage === "active")
      .map((order) => structuredClone({ set: this.record(order.setId).set, order }));
  }
  summary(setId: string): StageSetStats {
    const r = this.record(setId), t = r.totals, known = t.settledSlices > 0 && !t.unknownSlices && !t.overflow,
      pf = known && t.grossLoss > 0 ? t.grossProfit / t.grossLoss : null;
    return structuredClone({ ...t, set: r.set, basis: this.basis,
      heldOrders: t.openedOrders - t.closedOrders, heldPositions: t.openedPositions - t.closedPositions,
      returnPf: pf !== null && Number.isFinite(pf) ? pf : null,
      noLoss: known && t.grossProfit > 0 && t.grossLoss === 0,
      evaluations: { ...r.evaluations, percent: r.evaluations.evaluated ? 100 * r.evaluations.qualified / r.evaluations.evaluated : null } });
  }
  summaries(): StageSetStats[] { return [...this.records.keys()].map((id) => this.summary(id)); }
  snapshot(): StageChainSnapshot {
    return structuredClone({ version: 4, basis: this.basis, settings: this.policy, clock: this.clock, sequence: this.sequence,
      records: [...this.records.values()], open: [...this.open.values()], seenAtClock: [...this.seenAtClock],
      parentMissesAtClock: [...this.parentMissesAtClock] });
  }

  static restore(snapshot: StageChainSnapshot): StageChainBook {
    if (!snapshot || snapshot.version !== 4 || !Number.isFinite(snapshot.clock) || snapshot.clock < -1 ||
      !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < 0 ||
      (snapshot.clock === -1) !== (snapshot.sequence === 0) ||
      !Array.isArray(snapshot.records) || !Array.isArray(snapshot.open) || !Array.isArray(snapshot.seenAtClock) ||
      !Array.isArray(snapshot.parentMissesAtClock))
      throw new TypeError("invalid stage-chain snapshot");
    const book = new StageChainBook(snapshot.basis, snapshot.settings);
    book.clock = snapshot.clock;
    book.sequence = snapshot.sequence;
    const events = new Map<number, string>();
    const remember = (sequence: number, value: unknown) => {
      const stamp = JSON.stringify(value), previous = events.get(sequence);
      if (previous !== undefined && previous !== stamp) throw new TypeError("conflicting stage observation event");
      events.set(sequence, stamp);
    };
    const rememberClose = (setId: string, x: StageObservation) => remember(x.knownSeq!,
      ["close", setId, x.orderId, x.entryT, x.exitT, x.knownT, x.unitReturn]);
    let minimumEvents = 0;
    const validHistory = (rows: StageObservation[]) => Array.isArray(rows) && rows.length <= 2 * book.capacity &&
      rows.every((x, i) => observationValid(x) && x.knownT <= snapshot.clock && x.knownSeq! <= snapshot.sequence &&
        (!i || compareStageObservation(rows[i - 1], x) <= 0)) &&
      new Set(rows.map((x) => JSON.stringify([x.orderId, x.entryT]))).size === rows.length;
    for (const r of snapshot.records) {
      const s = r.set;
      if (!s || s.id !== idOf(s) || book.records.has(s.id)) throw new TypeError("invalid stage set identity");
      let expected: StageSet;
      if (s.stage === "base") expected = book.base(s.identity, s.minPf);
      else if (!s.parentSetId) throw new TypeError("stage set has no parent");
      else if (s.stage === "main") expected = s.variant === "inverse" ? book.inverseMain(s.parentSetId, s.processingId)
        : book.main(s.parentSetId, s.processingId);
      else if (s.stage === "real") expected = book.real(s.parentSetId, s.processingId);
      else if (s.stage === "active") expected = book.active(s.parentSetId);
      else throw new TypeError("invalid stage");
      if (expected.id !== s.id || !sameLineage(expected.identity, s.identity) || expected.identity.side !== s.identity.side)
        throw new TypeError("invalid stage lineage");
      const t = r.totals, e = r.evaluations;
      if (!t || !e || !validHistory(r.history) || !Array.isArray(r.scores) ||
        r.scores.some(([n, rows]) => !book.policy.base.secondaryWindows.includes(n) && !book.policy.main.secondaryWindows.includes(n) || !validHistory(rows)) ||
        new Set(r.scores.map(([n]) => n)).size !== r.scores.length ||
        ![t.openedOrders, t.closedOrders, t.openedPositions, t.closedPositions, t.settledSlices, t.unknownSlices,
          e.evaluated, e.qualified, e.insufficient, e.unknown, e.failed, e.parentMissing].every((v) => Number.isSafeInteger(v) && v >= 0) ||
        t.closedOrders > t.openedOrders || t.closedPositions > t.openedPositions || t.openedPositions > t.openedOrders ||
        t.closedPositions > t.closedOrders || t.settledSlices < t.closedOrders || t.unknownSlices > t.settledSlices ||
        r.history.length > t.closedOrders || !Number.isFinite(t.grossProfit) || t.grossProfit < 0 ||
        !Number.isFinite(t.grossLoss) || t.grossLoss < 0 || typeof t.overflow !== "boolean" ||
        e.evaluated !== e.qualified + e.insufficient + e.unknown + e.failed ||
        (s.stage === "base" ? e.evaluated !== 0 : e.qualified !== t.openedOrders) ||
        ((s.stage === "base" || s.stage === "main" && s.variant === "direct") && e.parentMissing !== 0))
        throw new TypeError("invalid stage totals or history");
      book.records.set(s.id, structuredClone(r));
      minimumEvents += t.settledSlices + (s.stage === "base" ? t.openedOrders : e.evaluated + e.parentMissing);
      if (!Number.isSafeInteger(minimumEvents) || minimumEvents > snapshot.sequence) throw new TypeError("invalid stage event totals");
      for (const x of r.history) rememberClose(s.id, x);
      for (const [, rows] of r.scores) for (const x of rows) rememberClose(s.id, x);
    }
    for (const o of snapshot.open) {
      const r = book.record(o.setId), s = r.set;
      if (!nonempty(o.orderId) || !nonempty(o.positionId) || !time(o.entryT) || o.entryT > snapshot.clock ||
        !Number.isSafeInteger(o.admissionSeq) || o.admissionSeq < 1 || o.admissionSeq > snapshot.sequence ||
        !Array.isArray(o.slices) || o.slices.some((x, i) => !nonempty(x.id) ||
          !observationValid({ ...x, orderId: o.orderId, entryT: o.entryT }) || x.knownT > snapshot.clock ||
          x.knownSeq <= o.admissionSeq || x.knownSeq > snapshot.sequence || i > 0 &&
          (x.knownSeq <= o.slices[i - 1].knownSeq || x.knownT < o.slices[i - 1].knownT || x.exitT < o.slices[i - 1].exitT)) ||
        new Set(o.slices.map((x) => x.id)).size !== o.slices.length || !Array.isArray(o.autoCandidates) ||
        new Set(o.autoCandidates).size !== o.autoCandidates.length ||
        o.autoCandidates.some((n) => !(s.stage === "base" || s.stage === "main") || !secondaryWindowsFor(book.policy[s.stage]).includes(n)))
        throw new TypeError("invalid held stage order");
      remember(o.admissionSeq, ["entry", o.setId, o.orderId, o.entryT]);
      for (const x of o.slices) remember(x.knownSeq, ["partial", o.setId, o.orderId, x.id, x.exitT, x.knownT, x.unitReturn]);
      const p = o.proof;
      if (s.stage === "base") {
        if (p !== null) throw new TypeError("Base cannot carry a promotion proof");
      } else {
        if (!p || p.sourceSetId !== s.parentSetId || !Array.isArray(p.autoScores)) throw new TypeError("missing stage admission proof");
        const source = book.record(p.sourceSetId).set;
        if (source.stage !== "base" && !nonempty(p.parentOrderId)) throw new TypeError("missing parent processed order");
        if (s.stage === "main" && s.variant === "inverse") {
          if (!p.negative || p.gate !== null) throw new TypeError("missing inverse trigger proof");
          const rows = p.negative.windows.reduce((a, w) => w.rows.length > a.length ? w.rows : a, p.negative.primary.rows);
          const expected = negativeMainTrigger(rows, book.policy, s.minPf, o.entryT, o.admissionSeq);
          if (!rows.every((x) => observationValid(x) && x.knownSeq! < o.admissionSeq &&
              stageObservationAvailability(x, o.entryT, o.admissionSeq) === "available") || !expected.qualified || JSON.stringify(expected) !== JSON.stringify(p.negative))
            throw new TypeError("invalid inverse trigger proof");
          for (const x of rows) rememberClose(source.id, x);
        } else {
          if (!p.gate || p.negative !== null || p.gate.state !== "qualified") throw new TypeError("missing positive stage proof");
          const sourceRows = p.gate.primary.rows.length >= Math.max(0, ...p.gate.secondary.map((w) => w.requestedN))
            ? p.gate.primary.rows : p.gate.secondary.reduce((a, w) => w.rows.length > a.length ? w.rows : a, p.gate.primary.rows);
          const available = (x: StageObservation) => observationValid(x) && x.knownSeq! < o.admissionSeq &&
            stageObservationAvailability(x, o.entryT, o.admissionSeq) === "available";
          if (!sourceRows.every(available) ||
            p.autoScores.some(([, rows]) => !Array.isArray(rows) || !rows.every(available)))
            throw new TypeError("invalid stage source evidence");
          const expected = source.stage === "real" ? singleStageGate(sourceRows, book.policy.realN, s.minPf, o.entryT, o.admissionSeq)
            : dualStageGate(sourceRows, book.policy[source.stage as "base" | "main"], s.minPf, o.entryT, new Map(p.autoScores), o.admissionSeq);
          if (JSON.stringify(expected) !== JSON.stringify(p.gate)) throw new TypeError("invalid frozen stage gate");
          for (const x of sourceRows) rememberClose(source.id, x);
          for (const [, rows] of p.autoScores) for (const x of rows) rememberClose(source.id, x);
        }
      }
      const key = orderKey(o.setId, o.orderId, o.entryT);
      if (book.open.has(key)) throw new TypeError("duplicate held stage order");
      book.open.set(key, structuredClone(o));
      let positions = book.heldPositions.get(o.setId);
      if (!positions) { positions = new Map(); book.heldPositions.set(o.setId, positions); }
      positions.set(o.positionId, (positions.get(o.positionId) ?? 0) + 1);
    }
    for (const [id, r] of book.records) {
      const orders = [...book.open.values()].filter((o) => o.setId === id);
      if (r.totals.openedOrders - r.totals.closedOrders !== orders.length ||
        r.totals.openedPositions - r.totals.closedPositions !== new Set(orders.map((o) => o.positionId)).size)
        throw new TypeError("invalid held stage totals");
    }
    for (const k of snapshot.seenAtClock) {
      if (!nonempty(k) || book.seenAtClock.has(k)) throw new TypeError("invalid stage deduplication");
      let entry: unknown;
      try { entry = JSON.parse(k); } catch { throw new TypeError("invalid stage deduplication"); }
      if (!Array.isArray(entry) || entry.length !== 3 || !book.records.has(entry[0]) || !nonempty(entry[1]) || entry[2] !== book.clock)
        throw new TypeError("invalid stage deduplication identity");
      book.seenAtClock.add(k);
    }
    for (const o of book.open.values()) if (o.entryT === book.clock && !book.seenAtClock.has(orderKey(o.setId, o.orderId, o.entryT)))
      throw new TypeError("missing held stage deduplication");
    const misses = new Map<string, number>();
    for (const k of snapshot.parentMissesAtClock) {
      if (!nonempty(k) || book.parentMissesAtClock.has(k)) throw new TypeError("invalid parent intent deduplication");
      let entry: unknown;
      try { entry = JSON.parse(k); } catch { throw new TypeError("invalid parent intent deduplication"); }
      if (!Array.isArray(entry) || entry.length !== 3 || !book.records.has(entry[0]) || !nonempty(entry[1]) || entry[2] !== book.clock)
        throw new TypeError("invalid parent intent identity");
      book.parentMissesAtClock.add(k); misses.set(entry[0], (misses.get(entry[0]) ?? 0) + 1);
    }
    for (const [id, n] of misses) if (n > book.record(id).evaluations.parentMissing)
      throw new TypeError("invalid parent intent totals");
    for (const [id, r] of book.records) for (const row of r.history)
      if (row.entryT === book.clock && !book.seenAtClock.has(orderKey(id, row.orderId, row.entryT)))
        throw new TypeError("missing completed stage deduplication");
    return book;
  }
}
