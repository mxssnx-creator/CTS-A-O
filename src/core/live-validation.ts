// Paper deactivation uses causal, settled post-Base accepted orders (before account allocation), never raw
// independent candidate tapes. Strict new live promotion separately requires BOTH that exact lane's accepted PF
// and sufficient owned execution return PF. Unknown, absent, unallocated and endpoint-mark samples cannot qualify.
// Groups are secondary paper coordinators; a winning sibling never supplies another lane's strict proof.
import type { ConfigTape } from "./sim/walkforward.ts";
import { profitFactor } from "./metrics/stats.ts";
import { isSignalInd } from "./indications/registry.ts";
import { RANGE_LABEL, rangeOfId } from "./minimal-coord.ts";
import { eventBar } from "./bot-stats.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import { kindOfId } from "./pipeline/pipeline.ts";

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
  /** Whether the modeled-only window is an admission gate or a separately displayed diagnostic. */
  modelRequired?: boolean;
  /** Exact handled-return validation window in Last-N-only mode. */
  processed?: PromotionWindow;
  execution?: PromotionWindow;
  /** Real gate's own cost-adjusted execution return; paper prices are never attributed venue fills. */
  real?: PromotionWindow;
  /** Separately labeled dollar-weighted reconciliation; never used to decide the return-PF gate. */
  realCash?: PromotionWindow;
  realLastN?: number;
  realState?: RealExecutionState;
  realBasis?: "paper-effective-return" | "verified-venue-return";
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
    insufficient: lanes.filter((l) => l.state === "model-insufficient" || l.state === "execution-insufficient" || l.state === "real-insufficient").length,
    unknown: lanes.filter((l) => (l.unknown ?? 0) > 0).length,
    failed: lanes.filter((l) => l.state === "model-failed" || l.state === "execution-failed" || l.state === "real-failed").length,
    ineligible: lanes.filter((l) => l.state === "ineligible").length,
    verifiedVenue: lanes.filter((l) => l.execution?.source === "verified-venue").length,
    nominalAttribution: "unverified-not-promotion-proof", lanes: lanes.slice(0, 200) };
}
export type PromotionState = "qualified" | "ineligible" | "model-insufficient" | "execution-insufficient" | "real-insufficient" | "unknown" | "model-failed" | "execution-failed" | "real-failed";
export type RealExecutionState = "qualified" | "real-insufficient" | "unknown" | "real-failed";
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

/** A separate chronological gate for owned executable-price returns, with no time-window heuristic. */
export function realExecutionGate(record: ReturnRecord | undefined, now: number, n: number, minPf: number,
  verifiedExecution?: PromotionWindow): {
  ok: boolean; state: RealExecutionState; window: PromotionWindow;
} {
  const valid = Number.isInteger(n) && n > 0 && Number.isFinite(now) && now >= 0 && Number.isFinite(minPf) && minPf >= 0;
  const window = promotionGate(undefined, record, 0, now, n, minPf, verifiedExecution).execution!;
  if (!valid) window.unknown = Math.max(window.unknown, 1);
  const state: RealExecutionState = window.unknown ? "unknown" : window.pf === null ? "real-insufficient"
    : window.pf <= 1 || window.pf < minPf ? "real-failed" : "qualified";
  return { ok: state === "qualified", state, window };
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

/** One side's columns of a tape: exit times ascending, gain / loss prefix sums (makeTape's shape). */
export interface SideColumns {
  exitT: Float64Array;
  gp: Float64Array;
  gl: Float64Array;
}
/**
 * The per-side copies sideTapeOf built, by tape object. The caller owns it and drops it with its compute (one memo
 * per compute), so the copies are not kept on the tapes between computes.
 */
export type SideTapeMemo = Map<object, Map<1 | -1, SideColumns>>;
/**
 * One side of a config's simulated tape as a tape of its own (exit order kept, the same gain / loss sums makeTape
 * keeps): a config judged on its own side's closes (live.sideGates). With a `memo` each side is built once per tape
 * within it; without one, every call builds its own copy.
 */
export function sideTapeOf(
  tp: Pick<ConfigTape, "id" | "exitT" | "r" | "side">,
  side: 1 | -1,
  memo?: SideTapeMemo,
): Pick<ConfigTape, "id" | "exitT" | "gp" | "gl"> {
  let m = memo?.get(tp);
  if (!m) {
    m = new Map();
    memo?.set(tp, m);
  }
  let s = m.get(side);
  if (!s) {
    const n = tp.exitT.length;
    let c = 0;
    for (let i = 0; i < n; i++) if (tp.side[i] === side) c++;
    const exitT = new Float64Array(c);
    const gp = new Float64Array(c + 1);
    const gl = new Float64Array(c + 1);
    let j = 0;
    for (let i = 0; i < n; i++) {
      if (tp.side[i] !== side) continue;
      const r = tp.r[i];
      exitT[j] = tp.exitT[i];
      gp[j + 1] = gp[j] + (r > 0 ? r : 0);
      gl[j + 1] = gl[j] + (r < 0 ? -r : 0);
      j++;
    }
    s = { exitT, gp, gl };
    m.set(side, s);
  }
  return { id: tp.id, exitT: s.exitT, gp: s.gp, gl: s.gl };
}

/** A live group's key: the group alone, or the group and its side when live.sideGates judges each side apart. */
export function liveGroupKeyOf(group: string, side?: 1 | -1): string {
  return side === undefined ? group : `${group}|${side}`;
}

/**
 * Signals Coordination ranges and Historic Exit retain independent report groups; other engine configs use ranges.
 */
export function liveGroupOf(cfg: string): string {
  const ind = cfg.split("|")[1] ?? "";
  if (isSignalCoordinationInd(ind)) {
    const tag = rangeOfId(cfg);
    return `Signals Coordination${tag ? ` · ${RANGE_LABEL[tag]}` : ""}`;
  }
  if (isSignalInd(ind)) return "Signals";
  if (kindOfId(cfg) === "exit") return "Historic Exit";
  return RANGE_LABEL[rangeOfId(cfg)];
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
  const per = new Map<string, Array<{ t: number; p: number; l: number; u: number; id: string; i: number }>>();
  for (const tp of tapes) {
    const a = lowerBound(tp.exitT, since);
    const b = lowerBound(tp.exitT, now + 1);
    if (b <= a) continue;
    const g = liveGroupOf(tp.id);
    let acc = per.get(g);
    if (!acc) per.set(g, (acc = []));
    for (let i = Math.max(a, b - n); i < b; i++) {
      acc.push({
        t: tp.exitT[i],
        p: tp.gp[i + 1] - tp.gp[i],
        l: tp.gl[i + 1] - tp.gl[i],
        u: (tp.unknown?.[i + 1] ?? 0) - (tp.unknown?.[i] ?? 0),
        id: tp.id,
        i,
      });
    }
  }
  for (const [g, acc] of per) {
    const k = acc.length;
    if (k < n) {
      const unknown = acc.reduce((sum, x) => sum + x.u, 0);
      out.set(g, { ok: unknown === 0, n: k, pf: null, ...(unknown ? { unknown } : {}) });
      continue;
    }
    // Tied exit times are ordered by exact config identity and then tape index. Without a stable
    // tie-breaker, the selected boundary sample depended on iterable/worker completion order.
    acc.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || a.i - b.i);
    const latest = acc.slice(k - n);
    let gp = 0;
    let gl = 0;
    let unknown = 0;
    for (const x of latest) { gp += x.p; gl += x.l; unknown += x.u; }
    const pf = unknown ? null : profitFactor(gp, gl);
    out.set(g, { ok: pf !== null && pf >= (typeof minPf === "function" ? minPf(g) : minPf), n, pf, ...(unknown ? { unknown } : {}) });
  }
  return out;
}

/** The engine proof's PF floor when live.engineProofPf is unset (operator, 13 Oct). */
export const ENGINE_PROOF_PF = 1.2;

/** A unit's closes shaped like a tape (exit times ascending, gain / loss prefix sums), with each close's event. */
export interface ProofTape extends Pick<ConfigTape, "exitT" | "gp" | "gl"> {
  /** prefix counts of closes whose return is unknown (a unit with one among its last n is counted apart, never judged) */
  unknown?: Uint32Array;
  /** per close, in exit order: the event it belongs to (closes of one event are one sample); unset = each close its own */
  ev?: ReadonlyArray<string>;
}

/** Distinct events among the last `n` closes up to `now` (the closes liveGate judged). */
function lastNEvents(tp: ProofTape, now: number, n: number): number {
  const b = lowerBound(tp.exitT, now + 1);
  const a = Math.max(0, b - n);
  if (!tp.ev) return b - a;
  const seen = new Set<string>();
  for (let i = a; i < b; i++) seen.add(tp.ev[i]);
  return seen.size;
}

/**
 * The proof of a unit's own forward closes, shared by the engine proof (unit: a config) and the signal proof (unit:
 * indicator × side): per unit the exchange record once it holds n closes up to `now`, else the paper book's record;
 * proven when that record's last n closes hold PF ≥ minPf and (with minEvents) span at least minEvents distinct
 * events. A unit with fewer than n closes on both is not judged and not proven (it trades on paper only). `judge`
 * picks the units judged (unset = every unit on either record).
 */
export function lastNProven(
  records: { paper: ReadonlyMap<string, ProofTape>; exchange: ReadonlyMap<string, ProofTape> },
  now: number,
  o: { n: number; minPf: number; minEvents?: number; judge?: (unit: string) => boolean },
): { proven: Set<string>; judged: number; unknown: number; unknownConfigs: number } {
  const { paper, exchange } = records;
  const { n, minPf } = o;
  const minEvents = o.minEvents ?? 0;
  const proven = new Set<string>();
  let judged = 0;
  let unknown = 0;
  let unknownConfigs = 0;
  if (!(n > 0)) return { proven, judged, unknown, unknownConfigs };
  for (const id of new Set([...paper.keys(), ...exchange.keys()])) {
    if (o.judge && !o.judge(id)) continue;
    const ex = exchange.get(id);
    const exG = ex ? liveGate(ex, 0, now, n, minPf) : null;
    const pp = paper.get(id);
    const onEx = !!exG && (exG.pf !== null || (exG.unknown ?? 0) > 0);
    const g = onEx ? exG : pp ? liveGate(pp, 0, now, n, minPf) : null;
    if ((g?.unknown ?? 0) > 0) {
      unknown += g!.unknown!;
      unknownConfigs++;
      continue;
    }
    if (!g || g.pf === null) continue;
    judged++;
    if (g.ok && (minEvents <= 0 || lastNEvents((onEx ? ex : pp)!, now, n) >= minEvents))
      proven.add(id);
  }
  return { proven, judged, unknown, unknownConfigs };
}

/**
 * The engine proof (live.engineProofN): the engine configs whose own forward closes prove them — per config the
 * exchange record once it holds n closes, else the paper book's record; proven when its last n closes hold PF ≥ minPf.
 * A config with fewer than n closes is not proven (it trades on paper only). Signal configs are never judged.
 * The maps are keyed as the caller keyed them: by config, or by config and side with live.sideGates (recordKeyOf),
 * and the proven keys are those keys.
 */
export function engineProven(
  paper: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl"> & { unknown?: Uint32Array }>,
  exchange: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl">>,
  now: number,
  n: number,
  minPf: number,
): { proven: Set<string>; judged: number; unknown: number; unknownConfigs: number } {
  return lastNProven({ paper, exchange }, now, {
    n,
    minPf,
    judge: (id) => !isSignalInd(id.split("|")[1] ?? ""),
  });
}

/** The signal proof's PF floor and event floor when live.signalProofPf / signalProofEvents are unset (14 Oct). */
export const SIGNAL_PROOF_PF = 1.2;
export const SIGNAL_PROOF_EVENTS = 2;

/** A signal close as the proof reads it: a paper position (or its lane on the exchange) closed at exitT. */
export interface ProofClose {
  /** the position's identity — the lane id cfg|sym|side|paper entryT, or the paper entry time alone */
  id: string;
  cfg: string;
  sym: string;
  side: number;
  exitT: number;
  r: number | null;
}

/**
 * The signal unit of a config on a side: its indicator × side (`ind|1`, `ind|-1`); null for an engine config or a
 * close without a side (never counted on either). With `bySide` (live.sideGates) a side that is not +1 or -1 is no side
 * either, as liveRecords keeps it: a close of side 2 is in no unit.
 */
export function signalUnitOf(cfg: string, side: number, bySide = false): string | null {
  if (!(side > 0 || side < 0)) return null;
  if (bySide && side !== 1 && side !== -1) return null;
  const i1 = cfg.indexOf("|");
  const i2 = i1 < 0 ? -1 : cfg.indexOf("|", i1 + 1);
  const ind = i1 < 0 ? "" : i2 < 0 ? cfg.slice(i1 + 1) : cfg.slice(i1 + 1, i2);
  return isSignalInd(ind) ? `${ind}|${side > 0 ? 1 : -1}` : null;
}

/** The signal closes per unit as proof tapes (exit order, ties as given); a close's event: symbol × side × entry bar. */
function signalTapes(rows: ReadonlyArray<ProofClose>, bySide: boolean): Map<string, ProofTape> {
  const by = new Map<string, Array<{ t: number; r: number | null; ev: string }>>();
  for (const x of rows) {
    const u = signalUnitOf(x.cfg, x.side, bySide);
    if (!u) continue;
    // the event as bot-stats counts it: configs that enter one bar on one symbol × side are one event (a Block leg's
    // id `…|blk:src` is the same lane: its paper entry time precedes the suffix)
    const b = x.id.indexOf("|blk:");
    const ev = `${x.sym}|${x.side > 0 ? 1 : -1}|${eventBar(b < 0 ? x.id : x.id.slice(0, b))}`;
    (by.get(u) ?? by.set(u, []).get(u)!).push({ t: x.exitT, r: x.r, ev });
  }
  const out = new Map<string, ProofTape>();
  for (const [u, xs] of by) {
    xs.sort((a, b) => a.t - b.t);
    const exitT = new Float64Array(xs.length);
    const gp = new Float64Array(xs.length + 1);
    const gl = new Float64Array(xs.length + 1);
    const unknown = new Uint32Array(xs.length + 1);
    xs.forEach((v, i) => {
      exitT[i] = v.t;
      const r = typeof v.r === "number" && Number.isFinite(v.r) ? v.r : null;
      const p = r === null ? gp[i] : gp[i] + Math.max(0, r);
      const l = r === null ? gl[i] : gl[i] + Math.max(0, -r);
      const valid = r !== null && Number.isFinite(p) && Number.isFinite(l);
      gp[i + 1] = valid ? p : gp[i];
      gl[i + 1] = valid ? l : gl[i];
      unknown[i + 1] = unknown[i] + Number(!valid);
    });
    out.set(u, { exitT, gp, gl, unknown, ev: xs.map((v) => v.ev) });
  }
  return out;
}

/**
 * The signal proof (live.signalProofN): the signal units (indicator × side, every config of it) whose own forward
 * closes prove them — per unit the exchange record of its lanes once it holds n closes, else the paper book's closes;
 * proven when the last n closes before `now` hold PF ≥ minPf and span at least minEvents distinct events (symbol ×
 * side × paper entry bar: configs entering one bar are one sample, not n). Engine configs are never judged. `o.bySide`
 * (live.sideGates) reads a side that is not +1 or -1 as no side (signalUnitOf).
 */
export function signalProven(
  paper: ReadonlyArray<ProofClose>,
  exchange: ReadonlyArray<ProofClose>,
  now: number,
  o: { n: number; minPf: number; minEvents: number; bySide?: boolean },
): { proven: Set<string>; judged: number; unknown: number; unknownConfigs: number } {
  if (!(o.n > 0)) return { proven: new Set(), judged: 0, unknown: 0, unknownConfigs: 0 };
  const bySide = o.bySide === true;
  return lastNProven(
    { paper: signalTapes(paper, bySide), exchange: signalTapes(exchange, bySide) },
    now,
    o,
  );
}

/**
 * Whether a config may open a paper entry: only its own forward record can pause it. Insufficient own history is
 * unjudged paper warmup, not evidence of a pass or of funded promotion; the caller still applies the exact historical
 * config gate. A group's pooled status is diagnostic and cannot prove or veto this configuration.
 */
export function liveEntryOk(own: LiveGate, _group?: LiveGate): boolean {
  if (own.required) return own.ok;
  if ((own.unknown ?? 0) > 0) return false;
  if (own.pf !== null) return own.ok;
  return true;
}

export interface LiveGroupStatus {
  group: string;
  /** the side the group's gate judges (live.sideGates only; unset = both sides pooled) */
  side?: 1 | -1;
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
  /** Latest snapshot time; paper and accepted modeled outcomes are distinct from venue fills. */
  at: number;
  basis: "post-base-accepted" | "owned-paper";
  /** Selected config × symbol × direction contexts, including unjudged and unknown contexts. */
  evaluated: number;
  /** Fewer than N known own closes: unproven paper warm-up. */
  unjudged: number;
  /** Contexts with unknown own return provenance (or a missing selected tape). */
  unknown: number;
  /** Contexts with enough known closes to be judged, including failures. */
  judged: number;
  passing: number;
  /** Judged contexts paused by their own modeled closes. */
  paused: number;
  /** new entries skipped this step */
  skipped: number;
  /** configs judged on their exchange closes (live_lane_trades), and the exchange closes on record since `since` */
  onExchange?: number;
  exchangeCloses?: number;
  /** group last N (0 = off) and its diagnostic statistics; these do not qualify or veto a config */
  groupLastN?: number;
  groups?: LiveGroupStatus[];
  /** Each config and symbol is judged per side. */
  bySide?: true;
}
