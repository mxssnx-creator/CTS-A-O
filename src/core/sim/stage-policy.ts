import { profitFactor } from "../metrics/stats.ts";
import { checkDualStagePolicy, secondaryWindowsFor, type DualStagePolicy, type MinimalStagePolicy,
  type StageChainSettings } from "./stage-settings.ts";
export { DEFAULT_STAGE_CHAIN, SECONDARY_WINDOWS, NEGATIVE_WINDOWS, checkStageChainSettings,
  checkDualStagePolicy, shortWindowLimit, secondaryWindowsFor, mergeStageSettings } from "./stage-settings.ts";
export type { StageChainSettings, DualStagePolicy, SecondaryMode, MinimalStagePolicy, StageChainPatch } from "./stage-settings.ts";

const integer = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;

export interface StageObservation {
  orderId: string;
  entryT: number;
  exitT: number;
  /** When the net result became known. A late fill cannot qualify an earlier decision. */
  knownT: number;
  /** Observation event order, when equal-clock close/entry ordering is explicitly known. */
  knownSeq?: number;
  unitReturn: number | null;
}
export const compareStageObservation = (a: StageObservation, b: StageObservation): number =>
  a.exitT - b.exitT || a.entryT - b.entryT || a.orderId.localeCompare(b.orderId);
export type WindowState = "insufficient" | "unknown" | "failed" | "qualified";
export interface StageWindow {
  requestedN: number;
  n: number;
  state: WindowState;
  pf: number | null;
  mean: number | null;
  gp: number;
  gl: number;
  /** Complete bounded source evidence for independent replay and persisted admission checks. */
  rows: StageObservation[];
}
export interface StageGate {
  state: WindowState;
  primary: StageWindow;
  secondary: StageWindow[];
  selectedN: number | null;
  selection: "single" | "static" | "multiple" | "auto" | "auto-fallback";
  /** Signed recent-net condition, distinct from the positive PF required by long/short windows. */
  minimal?: StageWindow & { polarity: MinimalStagePolicy["polarity"]; criterion: "net-sign" };
  decisionSeq?: number;
}

export function stageObservationAvailability(r: StageObservation, t: number, decisionSeq?: number): "available" | "not-yet" | "unknown" {
  if (r.entryT >= t || r.exitT > t || r.knownT > t) return "not-yet";
  if (r.exitT === t || r.knownT === t) {
    if (decisionSeq === undefined) return "not-yet";
    if (r.knownSeq === undefined) return "unknown";
    return r.knownSeq < decisionSeq ? "available" : "not-yet";
  }
  return "available";
}

/** Equal-clock closes count only with explicit prior observation order; the current entry's outcome never counts. */
export function stageWindow(rows: readonly StageObservation[], n: number, minPf: number, beforeT: number, decisionSeq?: number): StageWindow {
  if (!integer(n, 1, 500) || !Number.isFinite(minPf) || minPf <= 1 || !Number.isFinite(beforeT) || beforeT < 0 ||
      decisionSeq !== undefined && (!Number.isSafeInteger(decisionSeq) || decisionSeq < 0))
    throw new RangeError("invalid stage window");
  // An unorderable observation cannot be dropped in favour of an older win. The ledger rejects such inputs;
  // external historical adapters also fail closed here rather than silently filtering a malformed timestamp.
  if (rows.some((r) => !r || typeof r.orderId !== "string" || !r.orderId.trim() ||
    ![r.entryT, r.exitT, r.knownT].every((t) => Number.isFinite(t) && t >= 0) || r.exitT < r.entryT || r.knownT < r.exitT ||
    r.knownSeq !== undefined && (!Number.isSafeInteger(r.knownSeq) || r.knownSeq < 0)))
    return { requestedN: n, n: Math.min(rows.length, n), state: "unknown", pf: null, mean: null,
      gp: 0, gl: 0, rows: structuredClone(rows.slice(-n)) };
  const last = rows.filter((r) => stageObservationAvailability(r, beforeT, decisionSeq) !== "not-yet")
    .sort(compareStageObservation).slice(-n);
  let gp = 0, gl = 0, unknown = false;
  for (const r of last) {
    if (stageObservationAvailability(r, beforeT, decisionSeq) === "unknown" || r.unitReturn === null || !Number.isFinite(r.unitReturn)) unknown = true;
    else if (r.unitReturn > 0) gp += r.unitReturn;
    else gl -= r.unitReturn;
  }
  unknown ||= !Number.isFinite(gp) || !Number.isFinite(gl);
  const pf = unknown || last.length < n ? null : profitFactor(gp, gl);
  const mean = unknown || last.length < n ? null : (gp - gl) / n;
  const state: WindowState = unknown ? "unknown" : last.length < n ? "insufficient"
    : pf !== null && Number.isFinite(pf) && gp > gl && pf >= minPf ? "qualified" : "failed";
  return { requestedN: n, n: last.length, state, pf, mean, gp, gl, rows: structuredClone(last) };
}

function combinedState(windows: readonly StageWindow[]): WindowState {
  if (windows.some((w) => w.state === "unknown")) return "unknown";
  if (windows.some((w) => w.state === "insufficient")) return "insufficient";
  return windows.every((w) => w.state === "qualified") ? "qualified" : "failed";
}

/**
 * Auto selects on completed, earlier outcomes of the candidate gates, never the entry being decided.
 * Each candidate needs primaryN such outcomes; until then the explicit static secondary is used.
 * Multiple means every selected window must pass, not a best-looking tail chosen after its result.
 */
export function dualStageGate(rows: readonly StageObservation[], policy: DualStagePolicy, minPf: number, beforeT: number,
  autoScores: ReadonlyMap<number, readonly StageObservation[]> = new Map(), decisionSeq?: number): StageGate {
  checkDualStagePolicy(policy);
  const primary = stageWindow(rows, policy.primaryN, minPf, beforeT, decisionSeq);
  const minimal = minimalStageWindow(rows, policy.minimal, minPf, beforeT, decisionSeq);
  let selectedN = policy.secondaryN;
  let selection: StageGate["selection"] = policy.secondaryMode === "auto" ? "auto-fallback" : policy.secondaryMode;
  if (policy.secondaryMode === "auto") {
    let best: { n: number; pf: number } | undefined;
    for (const n of secondaryWindowsFor(policy).sort((a, b) => a - b)) {
      const score = stageWindow(autoScores.get(n) ?? [], policy.primaryN, minPf, beforeT, decisionSeq);
      if (score.state === "qualified" && score.pf !== null && (!best || score.pf > best.pf)) best = { n, pf: score.pf };
    }
    if (best) { selectedN = best.n; selection = "auto"; }
  }
  const secondary = (policy.secondaryMode === "multiple" ? secondaryWindowsFor(policy) : [selectedN])
    .map((n) => stageWindow(rows, n, minPf, beforeT, decisionSeq));
  return { state: combinedState([primary, ...secondary, ...(minimal ? [minimal] : [])]), primary, secondary,
    selectedN: policy.secondaryMode === "multiple" ? null : selectedN, selection, ...(minimal ? { minimal } : {}),
    ...(decisionSeq !== undefined ? { decisionSeq } : {}) };
}

export function minimalStageWindow(rows: readonly StageObservation[], policy: MinimalStagePolicy | undefined,
  minPf: number, beforeT: number, decisionSeq?: number): StageGate["minimal"] {
  if (!policy?.enabled) return undefined;
  if (!integer(policy.n, 1, 3) || !["positive", "negative"].includes(policy.polarity))
    throw new TypeError("invalid minimal signed Last-N window");
  const w = stageWindow(rows, policy.n, minPf, beforeT, decisionSeq);
  const state = w.state === "unknown" || w.state === "insufficient" ? w.state
    : w.mean !== null && (policy.polarity === "positive" ? w.mean > 0 : w.mean < 0) ? "qualified" : "failed";
  return { ...w, state, polarity: policy.polarity, criterion: "net-sign" };
}

export function singleStageGate(rows: readonly StageObservation[], n: number, minPf: number, beforeT: number, decisionSeq?: number): StageGate {
  const primary = stageWindow(rows, n, minPf, beforeT, decisionSeq);
  return { state: primary.state, primary, secondary: [], selectedN: null, selection: "single",
    ...(decisionSeq !== undefined ? { decisionSeq } : {}) };
}

export interface NegativeMainTrigger {
  qualified: boolean;
  primary: StageWindow;
  windows: StageWindow[];
  mean: number | null;
  decisionSeq?: number;
}
/** Negative averages are a request for a separate inverse simulation, never a positive-PF admission. */
export function negativeMainTrigger(rows: readonly StageObservation[], settings: StageChainSettings, minPf: number,
  beforeT: number, decisionSeq?: number): NegativeMainTrigger {
  const primary = stageWindow(rows, settings.main.primaryN, minPf, beforeT, decisionSeq);
  const windows = settings.negativeMain.windows.map((n) => stageWindow(rows, n, minPf, beforeT, decisionSeq));
  const complete = windows.every((w) => w.n === w.requestedN && w.mean !== null);
  const mean = complete ? windows.reduce((a, w) => a + w.mean!, 0) / windows.length : null;
  return { qualified: settings.negativeMain.enabled && primary.state === "qualified" && mean !== null &&
      (settings.negativeMain.combination === "all" ? windows.every((w) => w.mean !== null && w.mean < 0) : mean < 0),
    primary, windows, mean, ...(decisionSeq !== undefined ? { decisionSeq } : {}) };
}
