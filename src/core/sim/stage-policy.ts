import { profitFactor } from "../metrics/stats.ts";

export const SECONDARY_WINDOWS = [5, 10, 15, 20, 25] as const;
export type SecondaryMode = "static" | "multiple" | "auto";
export interface DualStagePolicy {
  primaryN: number;
  secondaryN: number;
  secondaryMode: SecondaryMode;
  secondaryWindows: number[];
}
export interface StageChainSettings {
  enabled: boolean;
  base: DualStagePolicy;
  main: DualStagePolicy;
  /** Main's negative tail creates a new inverse Main set. It never qualifies the original direction. */
  negativeMain: { enabled: boolean; windows: number[] };
  realN: number;
}

const dual = (): DualStagePolicy => ({ primaryN: 50, secondaryN: 15,
  secondaryMode: "static", secondaryWindows: [...SECONDARY_WINDOWS] });
/** Disabled until the execution adapter can prove exact stage ownership, including held recovery. */
export const DEFAULT_STAGE_CHAIN: StageChainSettings = {
  enabled: false, base: dual(), main: dual(), negativeMain: { enabled: true, windows: [5, 10] }, realN: 15,
};

const integer = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;
const windowsValid = (a: unknown, allowed: readonly number[]): a is number[] =>
  Array.isArray(a) && a.length > 0 && a.every((n) => allowed.includes(n)) && new Set(a).size === a.length;
export function checkStageChainSettings(s: StageChainSettings): void {
  if (!s || typeof s.enabled !== "boolean" || !integer(s.realN, 9, 500) ||
    !s.negativeMain || typeof s.negativeMain.enabled !== "boolean" || !windowsValid(s.negativeMain.windows, [5, 10]))
    throw new TypeError("invalid stage-chain settings");
  for (const p of [s.base, s.main]) {
    if (!p || !integer(p.primaryN, 9, 500) || !integer(p.secondaryN, 5, 25) ||
      !SECONDARY_WINDOWS.includes(p.secondaryN as typeof SECONDARY_WINDOWS[number]) ||
      !["static", "multiple", "auto"].includes(p.secondaryMode) || !windowsValid(p.secondaryWindows, SECONDARY_WINDOWS))
      throw new TypeError("invalid dual stage window policy");
  }
}

export interface StageObservation {
  orderId: string;
  entryT: number;
  exitT: number;
  /** When the net result became known. A late fill cannot qualify an earlier decision. */
  knownT: number;
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
}

/** Entries see only completely closed orders whose result was available strictly before the entry. */
export function stageWindow(rows: readonly StageObservation[], n: number, minPf: number, beforeT: number): StageWindow {
  if (!integer(n, 1, 500) || !Number.isFinite(minPf) || minPf <= 1 || !Number.isFinite(beforeT) || beforeT < 0)
    throw new RangeError("invalid stage window");
  // An unorderable observation cannot be dropped in favour of an older win. The ledger rejects such inputs;
  // external historical adapters also fail closed here rather than silently filtering a malformed timestamp.
  if (rows.some((r) => !r || typeof r.orderId !== "string" || !r.orderId.trim() ||
    ![r.entryT, r.exitT, r.knownT].every((t) => Number.isFinite(t) && t >= 0) || r.exitT < r.entryT || r.knownT < r.exitT))
    return { requestedN: n, n: Math.min(rows.length, n), state: "unknown", pf: null, mean: null,
      gp: 0, gl: 0, rows: structuredClone(rows.slice(-n)) };
  const last = rows.filter((r) => r.exitT < beforeT && r.knownT < beforeT).sort(compareStageObservation).slice(-n);
  let gp = 0, gl = 0, unknown = false;
  for (const r of last) {
    if (r.unitReturn === null || !Number.isFinite(r.unitReturn)) unknown = true;
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
  autoScores: ReadonlyMap<number, readonly StageObservation[]> = new Map()): StageGate {
  const primary = stageWindow(rows, policy.primaryN, minPf, beforeT);
  let selectedN = policy.secondaryN;
  let selection: StageGate["selection"] = policy.secondaryMode === "auto" ? "auto-fallback" : policy.secondaryMode;
  if (policy.secondaryMode === "auto") {
    let best: { n: number; pf: number } | undefined;
    for (const n of [...policy.secondaryWindows].sort((a, b) => a - b)) {
      const score = stageWindow(autoScores.get(n) ?? [], policy.primaryN, minPf, beforeT);
      if (score.state === "qualified" && score.pf !== null && (!best || score.pf > best.pf)) best = { n, pf: score.pf };
    }
    if (best) { selectedN = best.n; selection = "auto"; }
  }
  const secondary = (policy.secondaryMode === "multiple" ? policy.secondaryWindows : [selectedN])
    .map((n) => stageWindow(rows, n, minPf, beforeT));
  return { state: combinedState([primary, ...secondary]), primary, secondary,
    selectedN: policy.secondaryMode === "multiple" ? null : selectedN, selection };
}

export function singleStageGate(rows: readonly StageObservation[], n: number, minPf: number, beforeT: number): StageGate {
  const primary = stageWindow(rows, n, minPf, beforeT);
  return { state: primary.state, primary, secondary: [], selectedN: null, selection: "single" };
}

export interface NegativeMainTrigger {
  qualified: boolean;
  primary: StageWindow;
  windows: StageWindow[];
  mean: number | null;
}
/** Negative averages are a request for a separate inverse simulation, never a positive-PF admission. */
export function negativeMainTrigger(rows: readonly StageObservation[], settings: StageChainSettings, minPf: number,
  beforeT: number): NegativeMainTrigger {
  const primary = stageWindow(rows, settings.main.primaryN, minPf, beforeT);
  const windows = settings.negativeMain.windows.map((n) => stageWindow(rows, n, minPf, beforeT));
  const complete = windows.every((w) => w.n === w.requestedN && w.mean !== null);
  const mean = complete ? windows.reduce((a, w) => a + w.mean!, 0) / windows.length : null;
  return { qualified: settings.negativeMain.enabled && primary.state === "qualified" && mean !== null && mean < 0,
    primary, windows, mean };
}
