// Live validation: every config is judged on its own last N closes since the desk went live (computed causally on
// the live bars as they arrive — the same closes the paper book executes, and the ones it skipped), not on the
// simulated pre-history alone. A config with fewer live closes trades on its simulated validation; one with N or
// more opens new entries only while those N hold PF ≥ the live minimum. It keeps being computed either way, so a
// paused config comes back as soon as its live closes recover. Optionally (live.liveGroupLastN, off by default), until a
// config has its own N its live group (range or signals) decides on the group's pooled last closes (liveGroupGates).
import type { ConfigTape } from "./sim/walkforward.ts";
import { profitFactor } from "./metrics/stats.ts";
import { isSignalInd } from "./indications/registry.ts";
import { RANGE_LABEL, rangeOfId } from "./minimal-coord.ts";
import { eventBar } from "./bot-stats.ts";

export interface LiveGate {
  ok: boolean;
  /** live closes considered (at most N) */
  n: number;
  /** PF over them (null below N: not judged yet) */
  pf: number | null;
  /** what judged it: the exchange's own fills (live-record.ts) or the simulated forward closes */
  source?: "exchange" | "sim";
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
  tp: Pick<ConfigTape, "exitT" | "gp" | "gl">,
  since: number,
  now: number,
  n: number,
  minPf: number,
): LiveGate {
  if (!(n > 0)) return { ok: true, n: 0, pf: null };
  const a = lowerBound(tp.exitT, since);
  const b = lowerBound(tp.exitT, now + 1);
  const k = b - a;
  if (k < n) return { ok: true, n: Math.max(0, k), pf: null };
  const from = b - n;
  const pf = profitFactor(tp.gp[b] - tp.gp[from], tp.gl[b] - tp.gl[from]);
  return { ok: pf >= minPf, n, pf };
}

/**
 * One side of a config's simulated tape as a tape of its own (exit order kept, the same gain / loss sums makeTape
 * keeps): a config judged on its own side's closes (live.sideGates). Built once per tape object and kept with it.
 */
const sideTapes = new WeakMap<object, Map<1 | -1, { exitT: Float64Array; gp: Float64Array; gl: Float64Array }>>();
export function sideTapeOf(
  tp: Pick<ConfigTape, "id" | "exitT" | "r" | "side">,
  side: 1 | -1,
): Pick<ConfigTape, "id" | "exitT" | "gp" | "gl"> {
  let m = sideTapes.get(tp);
  if (!m) sideTapes.set(tp, (m = new Map()));
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
 * The live group of a config: signals apart, every engine config by its target range (Micro … Long, Wide = no range
 * tag) — the categories the desk reports its forward results in.
 */
export function liveGroupOf(cfg: string): string {
  return isSignalInd(cfg.split("|")[1] ?? "") ? "Signals" : RANGE_LABEL[rangeOfId(cfg)];
}

/**
 * Group gates: per live group, its last `n` closes pooled over the given configs (by exit time, in [since, now]) and
 * whether they clear `minPf`. A config gets far fewer closes than its group (x01: ~150–2,900 closes per group in
 * 10 h, while no config reached 25), so the group is judged long before its configs are: a range that loses live
 * stops opening new entries while one that earns keeps trading. Below `n` pooled closes a group is not judged.
 */
export function liveGroupGates(
  tapes: Iterable<Pick<ConfigTape, "id" | "exitT" | "gp" | "gl">>,
  since: number,
  now: number,
  n: number,
  /** one floor for every group, or each group's own (a range's minimum PF) */
  minPf: number | ((group: string) => number),
): Map<string, LiveGate> {
  const out = new Map<string, LiveGate>();
  if (!(n > 0)) return out;
  // each config contributes at most its own last n closes (the group's last n are among them)
  const per = new Map<string, { t: number[]; p: number[]; l: number[] }>();
  for (const tp of tapes) {
    const a = lowerBound(tp.exitT, since);
    const b = lowerBound(tp.exitT, now + 1);
    if (b <= a) continue;
    const g = liveGroupOf(tp.id);
    let acc = per.get(g);
    if (!acc) per.set(g, (acc = { t: [], p: [], l: [] }));
    for (let i = Math.max(a, b - n); i < b; i++) {
      acc.t.push(tp.exitT[i]);
      acc.p.push(tp.gp[i + 1] - tp.gp[i]);
      acc.l.push(tp.gl[i + 1] - tp.gl[i]);
    }
  }
  for (const [g, acc] of per) {
    const k = acc.t.length;
    if (k < n) {
      out.set(g, { ok: true, n: k, pf: null });
      continue;
    }
    // the n latest: every close after the n-th latest exit time, then closes at that time until n
    const sorted = Float64Array.from(acc.t).sort();
    const cut = sorted[k - n];
    let gp = 0;
    let gl = 0;
    let c = 0;
    for (let i = 0; i < k; i++)
      if (acc.t[i] > cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        c++;
      }
    for (let i = 0; i < k && c < n; i++)
      if (acc.t[i] === cut) {
        gp += acc.p[i];
        gl += acc.l[i];
        c++;
      }
    const pf = profitFactor(gp, gl);
    out.set(g, { ok: pf >= (typeof minPf === "function" ? minPf(g) : minPf), n, pf });
  }
  return out;
}

/** The engine proof's PF floor when live.engineProofPf is unset (operator, 13 Oct). */
export const ENGINE_PROOF_PF = 1.2;

/** A unit's closes shaped like a tape (exit times ascending, gain / loss prefix sums), with each close's event. */
export interface ProofTape extends Pick<ConfigTape, "exitT" | "gp" | "gl"> {
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
): { proven: Set<string>; judged: number } {
  const { paper, exchange } = records;
  const { n, minPf } = o;
  const minEvents = o.minEvents ?? 0;
  const proven = new Set<string>();
  let judged = 0;
  if (!(n > 0)) return { proven, judged };
  for (const id of new Set([...paper.keys(), ...exchange.keys()])) {
    if (o.judge && !o.judge(id)) continue;
    const ex = exchange.get(id);
    const exG = ex ? liveGate(ex, 0, now, n, minPf) : null;
    const pp = paper.get(id);
    const onEx = !!exG && exG.pf !== null;
    const g = onEx ? exG : pp ? liveGate(pp, 0, now, n, minPf) : null;
    if (!g || g.pf === null) continue;
    judged++;
    if (g.ok && (minEvents <= 0 || lastNEvents((onEx ? ex : pp)!, now, n) >= minEvents))
      proven.add(id);
  }
  return { proven, judged };
}

/**
 * The engine proof (live.engineProofN): the engine configs whose own forward closes prove them — per config the
 * exchange record once it holds n closes, else the paper book's record; proven when its last n closes hold PF ≥ minPf.
 * A config with fewer than n closes is not proven (it trades on paper only). Signal configs are never judged.
 * The maps are keyed as the caller keyed them: by config, or by config and side with live.sideGates (recordKeyOf),
 * and the proven keys are those keys.
 */
export function engineProven(
  paper: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl">>,
  exchange: ReadonlyMap<string, Pick<ConfigTape, "exitT" | "gp" | "gl">>,
  now: number,
  n: number,
  minPf: number,
): { proven: Set<string>; judged: number } {
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
  r: number;
}

/**
 * The signal unit of a config on a side: its indicator × side (`ind|1`, `ind|-1`); null for an engine config or a
 * close without a side (never counted on either).
 */
export function signalUnitOf(cfg: string, side: number): string | null {
  if (!(side > 0 || side < 0)) return null;
  const i1 = cfg.indexOf("|");
  const i2 = i1 < 0 ? -1 : cfg.indexOf("|", i1 + 1);
  const ind = i1 < 0 ? "" : i2 < 0 ? cfg.slice(i1 + 1) : cfg.slice(i1 + 1, i2);
  return isSignalInd(ind) ? `${ind}|${side > 0 ? 1 : -1}` : null;
}

/** The signal closes per unit as proof tapes (exit order, ties as given); a close's event: symbol × side × entry bar. */
function signalTapes(rows: ReadonlyArray<ProofClose>): Map<string, ProofTape> {
  const by = new Map<string, Array<{ t: number; r: number; ev: string }>>();
  for (const x of rows) {
    const u = signalUnitOf(x.cfg, x.side);
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
    xs.forEach((v, i) => {
      exitT[i] = v.t;
      gp[i + 1] = gp[i] + Math.max(0, v.r);
      gl[i + 1] = gl[i] + Math.max(0, -v.r);
    });
    out.set(u, { exitT, gp, gl, ev: xs.map((v) => v.ev) });
  }
  return out;
}

/**
 * The signal proof (live.signalProofN): the signal units (indicator × side, every config of it) whose own forward
 * closes prove them — per unit the exchange record of its lanes once it holds n closes, else the paper book's closes;
 * proven when the last n closes before `now` hold PF ≥ minPf and span at least minEvents distinct events (symbol ×
 * side × paper entry bar: configs entering one bar are one sample, not n). Engine configs are never judged.
 */
export function signalProven(
  paper: ReadonlyArray<ProofClose>,
  exchange: ReadonlyArray<ProofClose>,
  now: number,
  o: { n: number; minPf: number; minEvents: number },
): { proven: Set<string>; judged: number } {
  if (!(o.n > 0)) return { proven: new Set(), judged: 0 };
  return lastNProven({ paper: signalTapes(paper), exchange: signalTapes(exchange) }, now, o);
}

/**
 * Whether a config may open a new entry: its own last N decide once it has them (a config that earns live trades
 * even in a losing group, one that loses is paused even in an earning group); before that its group's last N decide;
 * neither judged yet: its simulated validation alone (always ok here).
 */
export function liveEntryOk(own: LiveGate, group: LiveGate | undefined): boolean {
  if (own.pf !== null) return own.ok;
  if (group && group.pf !== null) return group.ok;
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
  source?: "exchange" | "sim";
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
  /** live.sideGates on: each config is judged per side (the counts are per config and side) */
  bySide?: true;
}
