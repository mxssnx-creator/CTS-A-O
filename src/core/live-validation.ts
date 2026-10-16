// Paper deactivation uses causal, settled post-Base accepted orders (before account allocation), never raw
// independent candidate tapes. Strict new live promotion separately requires BOTH that exact lane's accepted PF
// and sufficient owned execution return PF. Unknown, absent, unallocated and endpoint-mark samples cannot qualify.
// Groups are secondary paper coordinators; a winning sibling never supplies another lane's strict proof.
import type { ConfigTape } from "./sim/walkforward.ts";
import { profitFactor } from "./metrics/stats.ts";
import { isSignalInd } from "./indications/registry.ts";
import { RANGE_LABEL, rangeOfId } from "./minimal-coord.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";

export interface LiveGate {
  ok: boolean;
  /** live closes considered (at most N) */
  n: number;
  /** PF over them (null below N: not judged yet) */
  pf: number | null;
  /** what judged it: the exchange's own fills (live-record.ts) or the simulated forward closes */
  source?: "exchange" | "sim" | "post-base-accepted" | "owned-paper" | "verified-venue";
  /** Unit-return evidence missing inside this exact chronological window. Such a window cannot qualify. */
  unknown?: number;
  /** A strict promotion verdict never falls back to an unjudged group or candidate tape. */
  required?: true;
  model?: PromotionWindow;
  execution?: PromotionWindow;
  state?: PromotionState;
  minN?: number;
  minPf?: number;
  evidenceBasis?: "settled-post-base-and-owned-execution";
  referenceIgnored?: "newer-local-owned-closes" | "local-owned-proof-preferred";
}

export interface PromotionWindow {
  source: "post-base-accepted" | "owned-paper" | "verified-venue";
  n: number;
  pf: number | null;
  unknown: number;
  fromT: number | null;
  toT: number | null;
  noLoss: boolean | null;
  pfConvention: "ratio" | "no-loss-score" | "empty" | "unavailable";
  /** Required for externally supplied execution proof; local measured rows use their chronological record. */
  validUntilT?: number;
}
export interface LivePromotionStatus {
  at: number;
  evidenceBasis: "settled-post-base-and-owned-execution";
  qualified: number;
  insufficient: number;
  unknown: number;
  failed: number;
  ineligible: number;
  verifiedVenue: number;
  nominalAttribution: "unverified-not-promotion-proof";
  lanes: Array<{ cfg: string; sym: string; side: number } & LiveGate>;
}
export function promotionStatus(lanes: LivePromotionStatus["lanes"], at = Date.now()): LivePromotionStatus {
  return { at, evidenceBasis: "settled-post-base-and-owned-execution", qualified: lanes.filter((l) => l.ok).length,
    insufficient: lanes.filter((l) => l.state === "model-insufficient" || l.state === "execution-insufficient").length,
    unknown: lanes.filter((l) => (l.unknown ?? 0) > 0).length,
    failed: lanes.filter((l) => l.state === "model-failed" || l.state === "execution-failed").length,
    ineligible: lanes.filter((l) => l.state === "ineligible").length,
    verifiedVenue: lanes.filter((l) => l.execution?.source === "verified-venue").length,
    nominalAttribution: "unverified-not-promotion-proof", lanes: lanes.slice(0, 200) };
}
export type PromotionState = "qualified" | "ineligible" | "model-insufficient" | "execution-insufficient" | "unknown" | "model-failed" | "execution-failed";
type ReturnRecord = Pick<ConfigTape, "exitT" | "gp" | "gl"> & { unknown?: Uint32Array };
const validRecordTimes = new WeakMap<object, { times: Float64Array; valid: boolean }>();
function recordTimesOk(record: ReturnRecord): boolean {
  const cached = validRecordTimes.get(record);
  if (cached?.times === record.exitT) return cached.valid;
  let valid = record.gp.length >= record.exitT.length + 1 && record.gl.length >= record.exitT.length + 1;
  for (let i = 0; valid && i < record.exitT.length; i++)
    valid = Number.isFinite(record.exitT[i]) && (i === 0 || record.exitT[i] >= record.exitT[i - 1]);
  validRecordTimes.set(record, { times: record.exitT, valid });
  return valid;
}

/** Both independent settled windows must prove a lane. No candidate outcomes or endpoint marks are evidence. */
export function promotionGate(
  model: ReturnRecord | undefined,
  execution: ReturnRecord | undefined,
  since: number,
  now: number,
  n: number,
  minPf: number,
  verifiedExecution?: PromotionWindow,
): LiveGate {
  const validRequest = Number.isInteger(n) && n > 0 && Number.isFinite(minPf) && minPf >= 0 &&
    Number.isFinite(since) && Number.isFinite(now) && since <= now;
  const count = validRequest ? n : 0;
  const window = (record: ReturnRecord | undefined, source: PromotionWindow["source"]): PromotionWindow => {
    const g = record && count > 0 ? liveGate(record, since, now, count, minPf) : { n: 0, pf: null, unknown: 0 };
    const b = record ? lowerBound(record.exitT, now + 1) : 0;
    const a = record ? Math.max(lowerBound(record.exitT, since), b - count) : 0;
    const gp = record ? record.gp[b] - record.gp[a] : 0, gl = record ? record.gl[b] - record.gl[a] : 0;
    const invalid = (record ? !recordTimesOk(record) : false) || !Number.isFinite(gp) || !Number.isFinite(gl) || gp < 0 || gl < 0 || (g.pf !== null && !Number.isFinite(g.pf));
    const unknown = (g.unknown ?? 0) + Number(invalid);
    return { source, n: g.n, pf: unknown ? null : g.pf, unknown,
      noLoss: unknown ? null : gp > 0 && gl === 0,
      pfConvention: unknown ? "unavailable" : gp > 0 && gl === 0 ? "no-loss-score" : gl > 0 ? "ratio" : "empty",
      fromT: record && b > a ? record.exitT[a] : null, toT: record && b > a ? record.exitT[b - 1] : null };
  };
  const m = window(model, "post-base-accepted");
  if (!validRequest) m.unknown = Math.max(1, m.unknown);
  const local = window(execution, "owned-paper");
  let e = verifiedExecution ? { ...verifiedExecution } : local;
  let referenceIgnored: LiveGate["referenceIgnored"];
  if (verifiedExecution) {
    const invalid = !(n > 0 && Number.isInteger(n)) || !Number.isFinite(minPf) ||
      !["owned-paper", "verified-venue"].includes(e.source) ||
      !Number.isInteger(e.n) || e.n < 0 || e.n > n || !Number.isInteger(e.unknown) || e.unknown < 0 ||
      (e.pf !== null && (!Number.isFinite(e.pf) || e.pf < 0)) ||
      e.fromT === null || e.toT === null || !Number.isFinite(e.fromT) || !Number.isFinite(e.toT) ||
      e.fromT < since || e.toT < e.fromT || e.toT > now ||
      typeof e.validUntilT !== "number" || !Number.isFinite(e.validUntilT) || e.validUntilT < now || e.validUntilT < e.toT ||
      (e.noLoss === true ? e.pfConvention !== "no-loss-score" || e.pf !== profitFactor(1, 0)
        : e.noLoss !== false || e.pfConvention !== "ratio");
    if (invalid) e = { ...e, pf: null, unknown: Math.max(1, Number.isFinite(e.unknown) ? e.unknown : 0) };
    else if (e.n < n) e = { ...e, pf: null };
    if (!invalid && e.unknown === 0 && local.toT !== null && e.toT !== null && local.toT > e.toT) {
      e = local; referenceIgnored = "newer-local-owned-closes";
    } else if (!invalid && e.unknown === 0 && e.source === "owned-paper" && local.n > 0) {
      e = local; referenceIgnored = "local-owned-proof-preferred";
    }
  }
  const state: PromotionState = m.unknown || e.unknown ? "unknown"
    : m.pf === null ? "model-insufficient"
      : e.pf === null ? "execution-insufficient"
        : m.pf <= 1 || m.pf < minPf ? "model-failed"
          : e.pf <= 1 || e.pf < minPf ? "execution-failed" : "qualified";
  return { required: true, ok: state === "qualified", n: Math.min(m.n, e.n),
    pf: m.pf !== null && e.pf !== null ? Math.min(m.pf, e.pf) : null,
    unknown: m.unknown + e.unknown, source: e.source, model: m, execution: e, state,
    minN: n, minPf, evidenceBasis: "settled-post-base-and-owned-execution", ...(referenceIgnored ? { referenceIgnored } : {}) };
}

/** First index with exitT >= t (exitT ascending). */
function lowerBound(xs: Float64Array, t: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The config's last `n` closes in [since, now] and whether they clear `minPf`. */
export function liveGate(
  tp: Pick<ConfigTape, "exitT" | "gp" | "gl"> & { unknown?: Uint32Array },
  since: number,
  now: number,
  n: number,
  minPf: number,
): LiveGate {
  if (!(n > 0)) return { ok: true, n: 0, pf: null };
  const a = lowerBound(tp.exitT, since);
  const b = lowerBound(tp.exitT, now + 1);
  const k = b - a;
  const from = Math.max(a, b - n);
  const unknown = (tp.unknown?.[b] ?? 0) - (tp.unknown?.[from] ?? 0);
  if (unknown > 0) return { ok: false, n: Math.min(n, Math.max(0, k)), pf: null, unknown };
  if (k < n) return { ok: true, n: Math.max(0, k), pf: null };
  const pf = profitFactor(tp.gp[b] - tp.gp[from], tp.gl[b] - tp.gl[from]);
  return { ok: pf >= minPf, n, pf };
}

/**
 * The live group of a config: signals apart, every engine config by its target range (Micro … Long, Wide = no range
 * tag) — the categories the desk reports its forward results in.
 */
export function liveGroupOf(cfg: string): string {
  const ind = cfg.split("|")[1] ?? "";
  if (isSignalCoordinationInd(ind)) {
    const tag = rangeOfId(cfg);
    return `Signals Coordination${tag ? ` · ${RANGE_LABEL[tag]}` : ""}`;
  }
  return isSignalInd(ind) ? "Signals" : RANGE_LABEL[rangeOfId(cfg)];
}

/**
 * Group gates: per live group, its last `n` closes pooled over the given configs (by exit time, in [since, now]) and
 * whether they clear `minPf`. A config gets far fewer closes than its group (x01: ~150–2,900 closes per group in
 * 10 h, while no config reached 25), so the group is judged long before its configs are: a range that loses live
 * stops opening new entries while one that earns keeps trading. Below `n` pooled closes a group is not judged.
 */
export function liveGroupGates(
  tapes: Iterable<Pick<ConfigTape, "id" | "exitT" | "gp" | "gl"> & { unknown?: Uint32Array }>,
  since: number,
  now: number,
  n: number,
  /** one floor for every group, or each group's own (a range's minimum PF) */
  minPf: number | ((group: string) => number),
): Map<string, LiveGate> {
  const out = new Map<string, LiveGate>();
  if (!(n > 0)) return out;
  // each config contributes at most its own last n closes (the group's last n are among them)
  const per = new Map<string, { t: number[]; p: number[]; l: number[]; u: number[] }>();
  for (const tp of tapes) {
    const a = lowerBound(tp.exitT, since);
    const b = lowerBound(tp.exitT, now + 1);
    if (b <= a) continue;
    const g = liveGroupOf(tp.id);
    let acc = per.get(g);
    if (!acc) per.set(g, (acc = { t: [], p: [], l: [], u: [] }));
    for (let i = Math.max(a, b - n); i < b; i++) {
      acc.t.push(tp.exitT[i]);
      acc.p.push(tp.gp[i + 1] - tp.gp[i]);
      acc.l.push(tp.gl[i + 1] - tp.gl[i]);
      acc.u.push((tp.unknown?.[i + 1] ?? 0) - (tp.unknown?.[i] ?? 0));
    }
  }
  for (const [g, acc] of per) {
    const k = acc.t.length;
    if (k < n) {
      const unknown = acc.u.reduce((a, b) => a + b, 0);
      out.set(g, { ok: unknown === 0, n: k, pf: null, ...(unknown ? { unknown } : {}) });
      continue;
    }
    // the n latest: every close after the n-th latest exit time, then closes at that time until n
    const sorted = Float64Array.from(acc.t).sort();
    const cut = sorted[k - n];
    let gp = 0;
    let gl = 0;
    let c = 0;
    let unknown = 0;
    for (let i = 0; i < k; i++)
      if (acc.t[i] > cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        unknown += acc.u[i];
        c++;
      }
    for (let i = 0; i < k && c < n; i++)
      if (acc.t[i] === cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        unknown += acc.u[i];
        c++;
      }
    const pf = unknown ? null : profitFactor(gp, gl);
    out.set(g, { ok: pf !== null && pf >= (typeof minPf === "function" ? minPf(g) : minPf), n, pf, ...(unknown ? { unknown } : {}) });
  }
  return out;
}

/** The engine proof's PF floor when live.engineProofPf is unset (operator, 13 Oct). */
export const ENGINE_PROOF_PF = 1.2;

/**
 * The engine proof (live.engineProofN): the engine configs whose own forward closes prove them — per config the
 * exchange record once it holds n closes, else the paper book's record; proven when its last n closes hold PF ≥ minPf.
 * A config with fewer than n closes is not proven (it trades on paper only). Signal configs are never judged.
 */
export function engineProven(
  paper: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl"> & { unknown?: Uint32Array }>,
  exchange: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl">>,
  now: number,
  n: number,
  minPf: number,
): { proven: Set<string>; judged: number; unknown: number; unknownConfigs: number } {
  const proven = new Set<string>();
  let judged = 0;
  let unknown = 0;
  let unknownConfigs = 0;
  if (!(n > 0)) return { proven, judged, unknown, unknownConfigs };
  for (const id of new Set([...paper.keys(), ...exchange.keys()])) {
    if (isSignalInd(id.split("|")[1] ?? "")) continue;
    const ex = exchange.get(id);
    const exG = ex ? liveGate(ex, 0, now, n, minPf) : null;
    const pp = paper.get(id);
    const g = exG && exG.pf !== null ? exG : pp ? liveGate(pp, 0, now, n, minPf) : null;
    if ((g?.unknown ?? 0) > 0) { unknown += g!.unknown!; unknownConfigs++; continue; }
    if (!g || g.pf === null) continue;
    judged++;
    if (g.ok) proven.add(id);
  }
  return { proven, judged, unknown, unknownConfigs };
}

/**
 * Whether a config may open a new entry: its own last N decide once it has them (a config that earns live trades
 * even in a losing group, one that loses is paused even in an earning group); before that its group's last N decide;
 * neither judged yet: its simulated validation alone (always ok here).
 */
export function liveEntryOk(own: LiveGate, group: LiveGate | undefined): boolean {
  if (own.required) return own.ok;
  if ((own.unknown ?? 0) > 0) return false;
  if (own.pf !== null) return own.ok;
  if ((group?.unknown ?? 0) > 0) return false;
  if (group && group.pf !== null) return group.ok;
  return true;
}

export interface LiveGroupStatus {
  group: string;
  /** pooled live closes considered (at most the group N) */
  n: number;
  pf: number | null;
  ok: boolean;
  /** judged on the exchange's own closes, or on the simulated forward closes */
  source?: LiveGate["source"];
}

export interface LiveValidationStatus {
  lastN: number;
  minPf: number;
  since: number;
  /** configs with at least N live closes */
  judged: number;
  passing: number;
  /** configs paused by their live closes */
  paused: number;
  /** new entries skipped this step */
  skipped: number;
  /** configs judged on their exchange closes (live_lane_trades), and the exchange closes on record since `since` */
  onExchange?: number;
  exchangeCloses?: number;
  /** group last N (0 = off) and each group's verdict */
  groupLastN?: number;
  groups?: LiveGroupStatus[];
}
