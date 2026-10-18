// Exact-lane promotion. Legacy live_lane_trades records nominal attribution without funded quantities and cannot
// prove ownership. Complete post-Base model and settled owned-execution samples must be supplied separately.
import { isSignalInd } from "./indications/registry.ts";
import { rangeOfId } from "./minimal-coord.ts";
import { kindOfId } from "./pipeline/pipeline.ts";
import { profitFactor } from "./metrics/stats.ts";

export const PROMOTE_RANGES = ["mc", "mn", "mp", "sh", "gn", "lg", "wide"] as const;
export type PromoteRange = (typeof PROMOTE_RANGES)[number];
export const PROMOTE_GROUPS = [...PROMOTE_RANGES, "exit"] as const;
export type PromoteGroup = (typeof PROMOTE_GROUPS)[number];
export const PROMOTE_EVIDENCE_SCHEMA = "cts-live-promotion/v2";
// Same monetary ownership boundary as the allocated book: floating-point capacity residue is not funding.
const OWNED_NOTIONAL_EPS_USD = 1e-9;

/** The managed range of a Normal / Trailing config; null for Historic Exit, signals and ladders. */
export function promoteRangeOf(cfg: string): PromoteRange | null {
  if (isSignalInd(cfg.split("|")[1] ?? "")) return null;
  const kind = kindOfId(cfg);
  if (kind !== "normal" && kind !== "trailing" && kind !== "trailing-only")
    return null;
  return rangeOfId(cfg) || "wide";
}

/** Exit is its own promotion group and never aliases the Wide range. */
export function promoteGroupOf(cfg: string): PromoteGroup | null {
  if (kindOfId(cfg) === "exit") return "exit";
  return promoteRangeOf(cfg);
}

export interface PromoteOpts {
  lastN: number;
  minN: number;
  onPf: number;
  offPf: number;
}

export const DEFAULT_PROMOTE: PromoteOpts = { lastN: 30, minN: 20, onPf: 1.2, offPf: 1.0 };

interface PromoteIdentity {
  cfg: string;
  sym: string;
  side: 1 | -1;
}
interface PromoteClose extends PromoteIdentity {
  id: string;
  entryT: number;
  exitT: number;
  eligibilityId: string;
}
export interface PromoteModelClose extends PromoteClose {
  /** Settled post-Base qualified VIRTUAL order before allocation. External sizing is removed; null is unknown. */
  unitR: number | null;
}
export interface PromoteExecutionClose extends PromoteClose {
  /** A settled owned reduction slice, not an accepted order or nominal lane attribution. */
  ownedQty: number;
  entryNotional: number;
  entryFillIds: string[];
  exitFillIds: string[];
  grossPnl: number;
  fees: number;
  funding: number;
  netPnl: number;
  netReturn: number | null;
}
interface PromoteTape<T> {
  complete: true;
  fromT: number;
  toT: number;
  asOf: number;
  closes: T[];
}
export interface PromoteEvidenceLane extends PromoteIdentity {
  /** Full indication, including its exact lane suffix, as encoded in cfg. */
  source: string;
  group: PromoteGroup;
  kind: "normal" | "trailing" | "trailing-only" | "exit";
  eligibility: { id: string; stage: "after-base"; passed: true; at: number };
  model: PromoteTape<PromoteModelClose> & { basis: "unit-net-returns" };
  execution: PromoteTape<PromoteExecutionClose> & {
    basis: "owned-net-returns";
    executionSource: "verified-venue" | "owned-paper";
  };
}
/** Both complete tapes cover this settled-close window. Validity is supplied explicitly by the evidence producer. */
export interface PromoteEvidence {
  schema: typeof PROMOTE_EVIDENCE_SCHEMA;
  referenceId: string;
  complete: true;
  fromT: number;
  toT: number;
  asOf: number;
  validUntilT: number;
  lanes: PromoteEvidenceLane[];
}
/** Stored with target settings so identity, basis and validity survive patch application. */
export interface PromotedLaneProof extends PromoteIdentity {
  modelPf: number;
  executionPf: number;
  modelN: number;
  executionN: number;
  asOf: number;
  fromT: number;
  toT: number;
  validUntilT: number;
  proofId: string;
  referenceId: string;
  minPf: number;
  minN: number;
  modelBasis: "unit-net-returns";
  executionBasis: "owned-net-returns";
  executionSource: "verified-venue" | "owned-paper";
  afterBase: true;
  modelNoLoss: boolean;
  executionNoLoss: boolean;
  /** Exact judged settled owned-execution sample; admission recomputes its current last-N from these returns. */
  executionCloses: Array<{ id: string; exitT: number; unitR: number }>;
}
export interface PromoteDecision {
  /** Summary only: an ON group never grants permission to an unlisted config/symbol/direction. */
  on: Record<PromoteGroup, boolean>;
  byIdentity: Record<string, boolean>;
  promotedLanes: PromotedLaneProof[];
  lines: string[];
  changed: boolean;
}
export interface PromoteContext {
  referenceId: string;
  /** SHA-256 of the original evidence bytes, computed by its reader. */
  proofId: string;
  nowT?: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const count = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v > 0;
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f\d]{64}$/i.test(v);
const ids = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(text) && new Set(v).size === v.length;
const near = (a: number, b: number) =>
  Number.isFinite(a) &&
  Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
const identity = (v: unknown): v is PromoteIdentity =>
  object(v) && text(v.cfg) && text(v.sym) && (v.side === 1 || v.side === -1);
export const promoteLaneKey = (lane: PromoteIdentity): string =>
  JSON.stringify([lane.cfg, lane.sym, lane.side]);

function validWindow(v: Record<string, unknown>, nowT: number): boolean {
  return (
    finite(nowT) &&
    finite(v.fromT) &&
    finite(v.toT) &&
    finite(v.asOf) &&
    finite(v.validUntilT) &&
    v.fromT >= 0 &&
    v.fromT < v.toT &&
    v.asOf === v.toT &&
    v.asOf <= nowT &&
    nowT <= v.validUntilT
  );
}

/** Shared by settings validation and admission. No implicit evidence lifetime is invented. */
export function validPromotedLaneProof(v: unknown, nowT = Date.now()): v is PromotedLaneProof {
  if (!object(v) || !identity(v) || !promoteGroupOf(v.cfg) || !validWindow(v, nowT)) return false;
  if (!(
    hash(v.proofId) &&
    text(v.referenceId) &&
    v.afterBase === true &&
    v.modelBasis === "unit-net-returns" &&
    v.executionBasis === "owned-net-returns" &&
    (v.executionSource === "verified-venue" || v.executionSource === "owned-paper") &&
    finite(v.minPf) &&
    v.minPf > 0 &&
    count(v.minN) &&
    count(v.modelN) &&
    v.modelN >= v.minN &&
    count(v.executionN) &&
    v.executionN >= v.minN &&
    finite(v.modelPf) &&
    v.modelPf >= v.minPf &&
    finite(v.executionPf) &&
    v.executionPf >= v.minPf &&
    typeof v.modelNoLoss === "boolean" &&
    typeof v.executionNoLoss === "boolean" &&
    Array.isArray(v.executionCloses) &&
    v.executionCloses.length === v.executionN
  ))
    return false;
  let gp = 0,
    gl = 0;
  let lastT = -Infinity,
    lastId = "";
  const seen = new Set<string>();
  for (const c of v.executionCloses) {
    if (
      !object(c) ||
      !text(c.id) ||
      seen.has(c.id) ||
      !finite(c.exitT) ||
      !finite(c.unitR) ||
      c.exitT < (v.fromT as number) ||
      c.exitT > (v.toT as number) ||
      c.exitT < lastT ||
      (c.exitT === lastT && c.id.localeCompare(lastId) < 0)
    )
      return false;
    seen.add(c.id);
    lastT = c.exitT;
    lastId = c.id;
    if (c.unitR > 0) gp += c.unitR;
    else gl -= c.unitR;
  }
  const pf = profitFactor(gp, gl);
  return (
    finite(gp) &&
    finite(gl) &&
    near(pf, v.executionPf as number) &&
    v.executionNoLoss === (gp > 0 && gl === 0) &&
    (!v.modelNoLoss || near(v.modelPf as number, profitFactor(1, 0)))
  );
}
function validOptions(o: PromoteOpts): boolean {
  return (
    count(o.lastN) &&
    count(o.minN) &&
    o.minN <= o.lastN &&
    finite(o.onPf) &&
    finite(o.offPf) &&
    o.onPf > 0 &&
    o.offPf > 0 &&
    o.offPf <= o.onPf
  );
}
function laneShape(v: unknown): v is PromoteEvidenceLane {
  if (!object(v) || !identity(v)) return false;
  const ranges = v.cfg.match(/\|(mc|mp|mn|sh|gn|lg)(?=\||$)/g) ?? [];
  const group = promoteGroupOf(v.cfg);
  return (
    group !== null &&
    ranges.length <= 1 &&
    v.cfg.split("|").length >= 6 &&
    text(v.source) &&
    v.source === v.cfg.split("|")[1] &&
    v.group === group &&
    !("range" in v) &&
    (group !== "exit" || rangeOfId(v.cfg) === "") &&
    v.kind === kindOfId(v.cfg) &&
    object(v.eligibility) &&
    text(v.eligibility.id) &&
    v.eligibility.stage === "after-base" &&
    v.eligibility.passed === true &&
    finite(v.eligibility.at) &&
    v.eligibility.at >= 0
  );
}
function sample(
  lane: PromoteEvidenceLane,
  value: unknown,
  basis: "unit-net-returns" | "owned-net-returns",
  e: PromoteEvidence,
  o: PromoteOpts,
): { n: number; pf: number; noLoss: boolean; closes: PromotedLaneProof["executionCloses"] } | null {
  if (
    !object(value) ||
    value.complete !== true ||
    value.basis !== basis ||
    value.fromT !== e.fromT ||
    value.toT !== e.toT ||
    value.asOf !== e.asOf ||
    !Array.isArray(value.closes)
  )
    return null;
  if (
    basis === "owned-net-returns" &&
    value.executionSource !== "verified-venue" &&
    value.executionSource !== "owned-paper"
  )
    return null;
  const seen = new Set<string>();
  const exitFills = new Set<string>();
  const ordered: Array<Record<string, unknown> & { exitT: number }> = [];
  for (const c of value.closes) {
    // Never drop a malformed/unknown current close to expose older winners.
    if (
      !object(c) ||
      !identity(c) ||
      promoteLaneKey(c) !== promoteLaneKey(lane) ||
      !text(c.id) ||
      seen.has(c.id) ||
      c.eligibilityId !== lane.eligibility.id ||
      !finite(c.entryT) ||
      !finite(c.exitT) ||
      c.entryT < lane.eligibility.at ||
      c.exitT < c.entryT ||
      c.exitT < e.fromT ||
      c.exitT > e.toT
    )
      return null;
    seen.add(c.id);
    if (basis === "owned-net-returns") {
      if (!ids(c.exitFillIds) || c.exitFillIds.some((id) => exitFills.has(id))) return null;
      for (const id of c.exitFillIds) exitFills.add(id);
    }
    ordered.push({ ...c, exitT: c.exitT });
  }
  const xs = ordered
    .sort((a, b) => a.exitT - b.exitT || String(a.id).localeCompare(String(b.id)))
    .slice(-o.lastN);
  if (xs.length < o.minN) return null;
  let gp = 0;
  let gl = 0;
  const closes: PromotedLaneProof["executionCloses"] = [];
  for (const c of xs) {
    let r: unknown = c.unitR;
    if (basis === "owned-net-returns") {
      if (
        !finite(c.ownedQty) ||
        c.ownedQty <= 0 ||
        !finite(c.entryNotional) ||
        c.entryNotional <= OWNED_NOTIONAL_EPS_USD ||
        !ids(c.entryFillIds) ||
        !ids(c.exitFillIds) ||
        !finite(c.grossPnl) ||
        !finite(c.fees) ||
        c.fees < 0 ||
        !finite(c.funding) ||
        !finite(c.netPnl) ||
        !finite(c.netReturn)
      )
        return null;
      const netPnl = c.grossPnl - c.fees + c.funding;
      const netReturn = netPnl / c.entryNotional;
      if (
        !near(c.netPnl, netPnl) ||
        !near(c.netReturn, netReturn) ||
        Math.sign(c.netPnl) !== Math.sign(netPnl) ||
        Math.sign(c.netReturn) !== Math.sign(netReturn)
      )
        return null;
      // Tolerance reconciles floating arithmetic; it never becomes a declared gain or changes the scored return.
      r = netReturn;
    }
    if (!finite(r)) return null;
    closes.push({ id: String(c.id), exitT: c.exitT, unitR: r });
    if (r > 0) gp += r;
    else gl -= r;
  }
  const pf = profitFactor(gp, gl);
  return finite(gp) && finite(gl) && finite(pf)
    ? { n: xs.length, pf, noLoss: gl === 0 && gp > 0, closes }
    : null;
}

/** Both samples must pass; hysteresis belongs to the exact identity. Missing/invalid proof always turns off. */
export function promoteDecide(
  prev: Readonly<Record<string, boolean>>,
  evidence: unknown,
  o: PromoteOpts = DEFAULT_PROMOTE,
  context?: PromoteContext,
): PromoteDecision {
  if (!validOptions(o))
    throw new Error(
      "Invalid promotion thresholds: require integer 0 < minN <= lastN and 0 < offPf <= onPf",
    );
  const nowT = context?.nowT ?? Date.now();
  const on = Object.fromEntries(PROMOTE_GROUPS.map((r) => [r, false])) as Record<
    PromoteGroup,
    boolean
  >;
  const byIdentity: Record<string, boolean> = {};
  const promotedLanes: PromotedLaneProof[] = [];
  const lines: string[] = [];
  if (
    !object(evidence) ||
    evidence.schema !== PROMOTE_EVIDENCE_SCHEMA ||
    evidence.complete !== true ||
    !Array.isArray(evidence.lanes) ||
    !context ||
    !hash(context.proofId) ||
    !text(context.referenceId) ||
    evidence.referenceId !== context.referenceId ||
    !validWindow(evidence, nowT)
  ) {
    lines.push(
      "engine promotion off: complete, current post-Base and owned-execution evidence unavailable",
    );
  } else {
    const e = evidence as unknown as PromoteEvidence;
    const keys = new Map<string, number>();
    for (const lane of e.lanes)
      if (identity(lane)) {
        const k = promoteLaneKey(lane);
        keys.set(k, (keys.get(k) ?? 0) + 1);
      }
    for (const lane of e.lanes) {
      if (!identity(lane)) {
        lines.push("invalid lane identity: off");
        continue;
      }
      const key = promoteLaneKey(lane);
      byIdentity[key] = false;
      const shape = laneShape(lane) && lane.eligibility.at <= e.asOf && keys.get(key) === 1;
      const model = shape ? sample(lane, lane.model, "unit-net-returns", e, o) : null;
      const execution = shape ? sample(lane, lane.execution, "owned-net-returns", e, o) : null;
      const minPf = prev[key] === true ? o.offPf : o.onPf;
      const passed = !!model && !!execution && model.pf >= minPf && execution.pf >= minPf;
      byIdentity[key] = passed;
      const pfText = (s: typeof model) =>
        s ? `${s.pf.toFixed(2)}${s.noLoss ? " (no-loss score)" : ""} n=${s.n}` : "unavailable";
      const executionLabel =
        lane.execution?.executionSource === "verified-venue"
          ? "owned venue"
          : lane.execution?.executionSource === "owned-paper"
            ? "owned paper"
            : "unknown";
      lines.push(
        `${lane.cfg} ${lane.sym} ${lane.side === 1 ? "long" : "short"}: post-Base qualified virtual PF ${pfText(model)}, ${executionLabel} execution PF ${pfText(execution)} → ${passed ? "on" : "off"}`,
      );
      if (passed && model && execution) {
        on[lane.group] = true;
        promotedLanes.push({
          cfg: lane.cfg,
          sym: lane.sym,
          side: lane.side,
          modelPf: model.pf,
          executionPf: execution.pf,
          modelN: model.n,
          executionN: execution.n,
          asOf: e.asOf,
          fromT: e.fromT,
          toT: e.toT,
          validUntilT: e.validUntilT,
          proofId: context.proofId,
          referenceId: e.referenceId,
          minPf,
          minN: o.minN,
          modelBasis: "unit-net-returns",
          executionBasis: "owned-net-returns",
          afterBase: true,
          executionSource: lane.execution.executionSource,
          executionCloses: execution.closes,
          modelNoLoss: model.noLoss,
          executionNoLoss: execution.noLoss,
        });
      }
    }
  }
  if (!lines.length) lines.push("engine promotion off: no exact-lane evidence");
  const keys = new Set([...Object.keys(prev), ...Object.keys(byIdentity)]);
  const changed = [...keys].some((k) => (prev[k] === true) !== (byIdentity[k] === true));
  return { on, byIdentity, promotedLanes, lines, changed };
}

/** The summary and mandatory exact allowlist are applied together; preserve selected kinds including trailing-only. */
export function promoteLive<
  T extends { source?: string; kinds?: readonly string[]; excludeRanges?: readonly string[] },
>(
  live: T,
  decision: Pick<PromoteDecision, "on" | "promotedLanes">,
): T & {
  source: "all";
  kinds?: string[];
  excludeRanges: PromoteRange[];
  promotedLanes: PromotedLaneProof[];
} {
  return {
    ...live,
    source: "all",
    kinds: live.kinds === undefined ? undefined : [...live.kinds],
    excludeRanges: PROMOTE_RANGES.filter((k) => !decision.on[k]),
    promotedLanes: [...decision.promotedLanes],
  };
}
