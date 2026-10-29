// Historic trailing configs of a signal (operator, 13 Oct: "Signals run with multiple trailing configs related to the
// historic calcs in their spec"). Every signal has the same 42 Normal + 35 Trailing percent configs; these add
// Trailing configs of its OWN, from what its own entries did before: the maximum favourable move each historic entry
// reached within the hold (MFE, after the entry at the next bar's open, as the simulator enters), pooled over the
// symbols and both sides of the signal's lane. Its MFE quantiles become targets; each target trails at every share
// and stops at every multiple. Each is a config of its own — its own tape, its own PF validation and seat — built on
// the worker pool with the signal's other configs.
//
// Causal: only entries whose whole hold ended before `cutT` (the stage cut: the run start of a causal evaluation, now
// on a desk) are read. The values are rounded to a 0.25 % grid, so the configs of a signal stay the same from compute
// to compute while its history moves little (a config id is its distances).
import type { Bars, Gates, Protect } from "./domain/types.ts";
import { minPfOf } from "./minimal-coord.ts";
import type { Tactics } from "./domain/types.ts";
import type { SignalSettings } from "./signal-config.ts";
import { entrySignal } from "./bots/bots.ts";
import { laneOf } from "./indications/registry.ts";
import {
  configId,
  evaluationSignal,
  kindOfId,
  laneProtect,
  parseConfigId,
  REF_TF,
  seriesOf,
  type Universe,
} from "./pipeline/pipeline.ts";
import { ddrFails, statsOf } from "./metrics/stats.ts";
import { tacticCooldown } from "./indications/filters.ts";
import { simulate, splitSides } from "./sim/backtest.ts";
import { filterEntries } from "./sim/walkforward.ts";
import { adjustProtect } from "./adjust.ts";
import { isSignalCoordinationInd } from "./signal-coordination.ts";
import { capSignalProtect } from "./sim/trailing.ts";
import { POSITION_COST_RT } from "./model-cost.ts";
import { SIGNAL_MIN_PF, SIGNAL_VALID_LAST_N } from "./signal-policy.ts";

export interface SignalHistValidation {
  cost: number;
  minPf: number;
  minTrades: number;
  maxDdr?: number;
  lastN?: number;
  /** Qualify on a complete own-context recent sample, independently of calendar windows. */
  lastNOnly?: boolean;
  /** Coordinator historic configs qualify independently against each enabled exit range's stage PF floor. */
  rangeMinPf?: Partial<Record<"sh" | "gn" | "lg", number>>;
  /** Runtime coordinators qualify in Signals only; legacy studies retain explicit range gates. */
  coordinationSignalRange?: boolean;
}

/** Range-tagged coordinator identities that clear their own PF floor; undefined keeps classic untagged history behavior. */
export function signalHistPassingRanges(
  pf: number,
  minPf: number,
  rangeMinPf?: SignalHistValidation["rangeMinPf"],
): Array<"sh" | "gn" | "lg" | undefined> {
  minPf = Math.max(SIGNAL_MIN_PF, minPf);
  if (rangeMinPf === undefined) return pf >= minPf ? [undefined] : [];
  const ranges = Object.entries(rangeMinPf).filter(
    (entry): entry is ["sh" | "gn" | "lg", number] =>
      (entry[0] === "sh" || entry[0] === "gn" || entry[0] === "lg") &&
      Number.isFinite(entry[1]),
  );
  return ranges.filter(([, threshold]) => pf >= Math.max(minPf, threshold)).map(([tag]) => tag);
}

/** Signals retain the configured stage PF floor; the lower engine Wide prefilter cannot relax it. */
export function signalHistValidationOf(
  cost: number,
  gates: Pick<Gates, "minPf" | "rangeMinPf" | "baseSetsMinPf" | "minTrades" | "maxDdr" | "lastNOnly">,
  lastN = SIGNAL_VALID_LAST_N,
): SignalHistValidation {
  return {
    cost,
    minPf: Math.max(SIGNAL_MIN_PF, minPfOf(gates, undefined), gates.baseSetsMinPf ?? gates.minPf),
    lastN,
    minTrades: gates.minTrades,
    maxDdr: gates.maxDdr,
    ...(gates.lastNOnly ? { lastNOnly: true } : {}),
  };
}

export interface SignalHistDiagnostics {
  pairs: number;
  insufficientEntries: number;
  trailTooShort: number;
  candidates: number;
  evaluated: number;
  insufficientTrades: number;
  pfRejected: number;
  ddrRejected: number;
  qualified: number;
}

export const emptySignalHistDiagnostics = (): SignalHistDiagnostics => ({
  pairs: 0,
  insufficientEntries: 0,
  trailTooShort: 0,
  candidates: 0,
  evaluated: 0,
  insufficientTrades: 0,
  pfRejected: 0,
  ddrRejected: 0,
  qualified: 0,
});

/** the grid historic targets, stops and trails are rounded to (0.25 % of price) */
export const HIST_STEP = 0.0025;
/** the smallest historic target: five round trips of the 0.2% PositionCost baseline */
export const HIST_MIN_TP = POSITION_COST_RT * 5;

/** Hold horizon admitted by the available causal sample; short histories reserve 75 % for matured PF evidence. */
export function signalHistHoldH(configHoldH: number, availableH: number, laneTf: number): number {
  return Math.max((2 * laneTf) / 60, Math.min(configHoldH, Math.max(0, availableH) / 4));
}

/** The q-quantile (0–1) of ascending `xs`, linear between neighbours; NaN when empty. */
export function quantileSorted(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const pos = Math.min(1, Math.max(0, q)) * (xs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

/**
 * The MFE (fraction of the entry price) of every historic entry of a signal pair whose hold ended before `cutT`:
 * long max(high) ÷ entry − 1, short 1 − min(low) ÷ entry, over the hold's bars after the entry at the next open.
 */
export function signalMfe(
  u: Universe,
  bot: string,
  ind: string,
  holdH: number,
  tactics: Tactics | null | undefined,
  cutT: number,
  entry?: SignalSettings["filter"] | null,
): number[] {
  const g = signalMfeGen(u, bot, ind, holdH, tactics, cutT, entry);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}

/** signalMfe, yielding after each series (a desk computes it between its live ticks). */
export function* signalMfeGen(
  u: Universe,
  bot: string,
  ind: string,
  holdH: number,
  tactics: Tactics | null | undefined,
  cutT: number,
  entry?: SignalSettings["filter"] | null,
  fromT?: number,
): Generator<void, number[]> {
  const out: number[] = [];
  for (const s of seriesOf(u, ind)) {
    yield;
    const b = u.bars[s];
    let sig = entrySignal(bot as "follow", ind, u.caches[s], tactics);
    if (!sig) continue;
    if (entry && (entry.trendH > 0 || entry.volFloor > 0))
      sig = filterEntries(sig, b, u.caches[s], entry);
    entryMfes(
      b,
      sig,
      Math.max(2, Math.round((holdH * 60) / b.tfMin)),
      cutT,
      out,
      u.evaluationFromT === undefined ? fromT : Math.max(u.evaluationFromT, fromT ?? -Infinity),
    );
  }
  return out;
}

interface PreparedSignalHistSeries {
  bars: Bars;
  /** Immutable long/short views are split once per signal pair and reused by every protect candidate. */
  sides: Int8Array[];
}

/** Filter and clip each pair's entries once, then reuse the prepared history for MFE and every protect candidate. */
function* prepareSignalHistGen(
  u: Universe,
  bot: string,
  ind: string,
  tactics: Tactics | null | undefined,
  sig: SignalSettings,
  holdH: number,
  fromT: number,
  cutT: number,
): Generator<void, { series: PreparedSignalHistSeries[]; mfe: number[] }> {
  const series: PreparedSignalHistSeries[] = [];
  const mfe: number[] = [];
  const effectiveFromT = u.evaluationFromT === undefined ? fromT : Math.max(u.evaluationFromT, fromT);
  for (const s of seriesOf(u, ind)) {
    yield;
    const b = u.bars[s];
    let entries = entrySignal(bot as "follow", ind, u.caches[s], tactics);
    if (!entries) continue;
    if (sig.filter.trendH > 0 || sig.filter.volFloor > 0)
      entries = filterEntries(entries, b, u.caches[s], sig.filter);
    // Historic targets use every complete causal excursion; replay warmup still cannot add evaluated entries.
    entryMfes(b, entries, Math.max(2, Math.round((holdH * 60) / b.tfMin)), cutT, mfe, effectiveFromT);
    const clipped = barsThroughCut(b, cutT);
    if (clipped.n < 2) continue;
    entries = Int8Array.from(evaluationSignal(u, b, entries));
    for (let i = 0; i < entries.length; i++) {
      const entryT = i + 1 < b.n ? b.t[i + 1] : b.t[i] + b.tfMin * 60_000;
      if (entryT < fromT || i + 1 >= clipped.n) entries[i] = 0;
    }
    series.push({ bars: clipped, sides: splitSides(entries.subarray(0, clipped.n)) });
  }
  return { series, mfe };
}

/** The config-specific PF/DD evidence on complete closes before the causal cut. */
function signalHistStats(
  prepared: readonly PreparedSignalHistSeries[],
  id: string,
  lane: Protect,
  sig: SignalSettings,
  validation: SignalHistValidation,
  cooldown: number,
) {
  const trades: import("./domain/types.ts").Trade[] = [];
  const actual = capSignalProtect(adjustProtect(lane, { minSl: sig.minSl, minTrail: sig.minTrail }));
  for (const { bars, sides } of prepared) {
    for (const side of sides) {
      const result = simulate(id, bars, side, actual, { cost: validation.cost, cooldown });
      trades.push(...result.trades);
    }
  }
  trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side);
  const groups = new Map<string, typeof trades>();
  for (const tr of trades) {
    const key = `${tr.sym}|${tr.side}`;
    const own = groups.get(key) ?? [];
    if (!groups.has(key)) groups.set(key, own);
    own.push(tr);
  }
  const n = validation.lastN ?? SIGNAL_VALID_LAST_N;
  return [...groups.values()].map((own) => ({ history: statsOf(own), last: statsOf(n > 0 ? own.slice(-n) : own), required: n }));
}

/** Keep the simulator's bars to completed candles at or before the historic cut. */
function barsThroughCut(b: Bars, cutT: number): Bars {
  let n = 0;
  const tf = b.tfMin * 60_000;
  while (n < b.n && b.t[n] + tf <= cutT) n++;
  return n === b.n
    ? b
    : {
        ...b,
        n,
        t: b.t.slice(0, n),
        o: b.o.slice(0, n),
        h: b.h.slice(0, n),
        l: b.l.slice(0, n),
        c: b.c.slice(0, n),
        v: b.v.slice(0, n),
      };
}

/**
 * The MFE of each entry of `sig` on `b` (decided on bar i's close, entered at bar i + 1's open, over the `hold` bars
 * from there), for entries whose hold's last bar closed before `cutT`. Appended to `out`.
 */
export function entryMfes(
  b: Bars,
  sig: Int8Array,
  hold: number,
  cutT: number,
  out: number[] = [],
  fromT?: number,
): number[] {
  const tfMs = b.tfMin * 60_000;
  if (!Number.isInteger(hold) || hold < 1 || hold >= b.n) return out;
  // Monotone extrema queues: every overlapping candle is visited once, instead of
  // scanning up to thousands of one-minute candles again for each historic entry.
  const highs = new Int32Array(hold), lows = new Int32Array(hold);
  let highHead = 0, highSize = 0, lowHead = 0, lowSize = 0, lastBar = 0;
  for (let i = 0; i + hold < b.n; i++) {
    const d = sig[i];
    if (d === 0) continue;
    // the lookback: only entries made at or after `fromT` (the historic signal configs look back a few days, not the
    // whole history; 13 Oct, operator: "do only few days historic checks")
    if (fromT !== undefined && b.t[i + 1] < fromT) continue;
    // the hold's last bar closes before the cut (entries run in time order: every later one crosses it too)
    if (b.t[i + hold] + tfMs > cutT) break;
    const e = b.o[i + 1];
    if (!(e > 0)) continue;
    const first = i + 1, end = i + hold;
    if (first > lastBar) {
      highHead = highSize = lowHead = lowSize = 0;
      lastBar = first - 1;
    }
    for (let j = lastBar + 1; j <= end; j++) {
      const windowFirst = j - hold + 1;
      while (highSize && highs[highHead] < windowFirst) { highHead = (highHead + 1) % hold; highSize--; }
      while (lowSize && lows[lowHead] < windowFirst) { lowHead = (lowHead + 1) % hold; lowSize--; }
      if (!Number.isNaN(b.h[j])) {
        while (highSize && b.h[highs[(highHead + highSize - 1) % hold]] <= b.h[j]) highSize--;
        highs[(highHead + highSize) % hold] = j; highSize++;
      }
      if (!Number.isNaN(b.l[j])) {
        while (lowSize && b.l[lows[(lowHead + lowSize - 1) % hold]] >= b.l[j]) lowSize--;
        lows[(lowHead + lowSize) % hold] = j; lowSize++;
      }
    }
    lastBar = end;
    // Preserve the scalar comparison semantics even for nonfinite input prices.
    let m = 0;
    if (e === Infinity) {
      for (let j = first; j <= end; j++) {
        const x = d > 0 ? b.h[j] / e - 1 : 1 - b.l[j] / e;
        if (x > m) m = x;
      }
    } else {
      const x = d > 0 ? (highSize ? b.h[highs[highHead]] / e - 1 : 0)
        : (lowSize ? 1 - b.l[lows[lowHead]] / e : 0);
      if (x > m) m = x;
    }
    out.push(m);
  }
  return out;
}

const onGrid = (x: number) => +(Math.round(x / HIST_STEP) * HIST_STEP).toFixed(4);

/**
 * Each signal pair's historic Trailing configs (`sig.hist`), on the 15m reference like signalProtects (the lane
 * scaling of the tape builder then gives back the distances measured on the signal's own lane). Pairs with fewer
 * than `hist.minN` historic entries get none.
 */
export function signalHistProtects(
  u: Universe,
  pairs: Iterable<string>,
  sig: SignalSettings,
  tactics: Tactics | null | undefined,
  cutT: number,
  validation?: SignalHistValidation,
): Record<string, Protect[]> {
  const g = signalHistProtectsGen(u, pairs, sig, tactics, cutT, validation);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}

export interface SignalHistProgress {
  done: number;
  total: number;
}

/** Pair-weighted work progress: MFE sampling (25%) and independent config evaluations (75%). */
export function* signalHistProtectsGen(
  u: Universe,
  pairs: Iterable<string>,
  sig: SignalSettings,
  tactics: Tactics | null | undefined,
  cutT: number,
  validation?: SignalHistValidation,
  diagnostics?: SignalHistDiagnostics,
): Generator<SignalHistProgress, Record<string, Protect[]>> {
  const h = sig.hist;
  const out: Record<string, Protect[]> = {};
  if (!h?.enabled) return out;
  const cooldown = tacticCooldown(tactics);
  const order = [...pairs];
  const total = order.length;
  for (let pairIndex = 0; pairIndex < total; pairIndex++) {
    const pair = order[pairIndex];
    yield { done: pairIndex, total };
    const [bot, ind] = pair.split("|");
    if (!bot || !ind) continue;
    if (diagnostics) diagnostics.pairs++;
    const series = seriesOf(u, ind);
    const earliest = series.reduce((t, s) => Math.min(t, u.bars[s].t[0] ?? Infinity), Infinity);
    // Signals always use the requested minimal historic range when the replay sets one. A configured lookback can
    // narrow it further; otherwise live research begins at the earliest available candle for this lane.
    const fromT = Math.max(
      u.evaluationFromT ?? earliest,
      !validation?.lastNOnly && h.lookbackH > 0 ? cutT - h.lookbackH * 3_600_000 : -Infinity,
    );
    if (!Number.isFinite(fromT) || fromT >= cutT) {
      if (diagnostics) diagnostics.insufficientEntries++;
      continue;
    }
    // Long configured holds cannot mature inside a short, bounded replay history. Use at most one quarter of the
    // available sample for MFE/hold so the remaining three quarters can supply complete entries and closed PF rows.
    const laneTf = laneOf(ind).tf ?? REF_TF;
    const availableH = (cutT - fromT) / 3_600_000;
    const holdH = signalHistHoldH(sig.holdH, availableH, laneTf);
    const hold = Math.max(2, Math.round((holdH * 60) / REF_TF));
    const sample = prepareSignalHistGen(
      u,
      bot,
      ind,
      tactics,
      sig,
      holdH,
      fromT,
      cutT,
    );
    let sampled = 0;
    let step = sample.next();
    while (!step.done) {
      yield { done: pairIndex + 0.25 * sampled / Math.max(1, series.length), total };
      sampled++;
      step = sample.next();
    }
    const prepared = step.value;
    const mfe = prepared.mfe.sort((a, b) => a - b);
    if (mfe.length < h.minN) {
      if (diagnostics) diagnostics.insufficientEntries++;
      continue;
    }
    const ps: Protect[] = [];
    const seen = new Set<string>();
    const trails = [0, ...h.trailOfTp.filter((t) => t > 0)];
    const candidateTotal = h.quantiles.length * h.slOfTp.length *
      trails.reduce((n, t) => n + (t > 0 && sig.trailRatios?.length ? sig.trailRatios.length : 1), 0);
    let candidate = 0;
    for (const q of h.quantiles) {
      const laneTp = Math.max(HIST_MIN_TP, onGrid(quantileSorted(mfe, q)));
      const tpRef = onGrid(
        invertLaneField(
          laneTp,
          (ref) => laneProtect({ tp: ref, sl: 0, trail: 0, hold }, ind).tp,
        ) ?? laneTp,
      );
      for (const m of h.slOfTp)
        for (const t of trails)
        for (const ratio of t > 0 && sig.trailRatios?.length ? sig.trailRatios : [1]) {
          // Yield before every candidate, including duplicates/rejections, so the runtime can check cancellation
          // and memory pressure between independent simulations. The current candidate is not complete yet.
          yield { done: pairIndex + 0.25 + 0.75 * candidate++ / Math.max(1, candidateTotal), total };
          const p: Protect = {
            tp: tpRef,
            sl: Math.max(sig.minSl, onGrid(tpRef * m)),
            trail: onGrid(tpRef * t),
            ...(ratio !== 1 ? { trailStep: ratio } : {}),
            hold,
            ...(sig.trailMax !== undefined ? { trailMax: sig.trailMax } : {}),
          };
          const lane = laneProtect(p, ind);
          if (lane.trail > 0 && lane.trail * (lane.trailStep ?? 1) + 1e-12 < sig.minTrail) {
            if (diagnostics) diagnostics.trailTooShort++;
            continue;
          }
          const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}|${p.trailStep ?? 1}|${p.trailMax ?? 0.02}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (diagnostics) diagnostics.candidates++;
          if (validation) {
            const contexts = signalHistStats(prepared.series, configId(bot as "follow", ind, lane), lane, sig, validation, cooldown);
            if (diagnostics) diagnostics.evaluated++;
            // hist.minN already validated the pooled mature excursions used to fit this source's quantiles.
            // Each exact symbol/direction must satisfy its configured close minimum, without borrowing a
            // sibling's returns or inheriting the separate pooled fitting count as an extra own-context gate.
            const sampled = contexts.filter(({ history, last, required }) => validation.lastNOnly
              ? Number.isSafeInteger(required) && required >= 9 && last.n === required && last.n >= validation.minTrades
              : history.n >= validation.minTrades && last.n >= required);
            if (!sampled.length) {
              if (diagnostics) diagnostics.insufficientTrades++;
              continue;
            }
            const minPf = Math.max(SIGNAL_MIN_PF, validation.minPf);
            const profitable = sampled.filter(({ history, last }) =>
              last.net > 0 && Number.isFinite(last.pf) && last.pf >= minPf &&
              (validation.lastNOnly || (history.net > 0 && history.pf >= minPf)));
            if (!profitable.length) {
              if (diagnostics) diagnostics.pfRejected++;
              continue;
            }
            const passing = validation.lastNOnly ? profitable : profitable.filter(({ history, last }) =>
              !ddrFails(history.mdd, history.net, validation.maxDdr) && !ddrFails(last.mdd, last.net, validation.maxDdr));
            if (!passing.length) {
              if (diagnostics) diagnostics.ddrRejected++;
              continue;
            }
            const passingRanges = [...new Set(passing.flatMap(({ history, last }) => signalHistPassingRanges(
              validation.lastNOnly ? last.pf : Math.min(history.pf, last.pf), minPf,
              isSignalCoordinationInd(ind) && !validation.coordinationSignalRange ? (validation.rangeMinPf ?? {}) : undefined,
            )))];
            if (!passingRanges.length) {
              if (diagnostics) diagnostics.pfRejected++;
              continue;
            }
            for (const tag of passingRanges) {
              ps.push(tag ? { ...p, tag } : p);
              if (diagnostics) diagnostics.qualified++;
            }
          } else {
            ps.push(p);
            if (diagnostics) diagnostics.qualified++;
          }
        }
    }
    if (ps.length) out[pair] = ps;
  }
  yield { done: total, total };
  return out;
}

/**
 * The 15m-reference protect of a held signal config id when the tape builder rebuilds exactly that id from it (a
 * historic config whose distances moved since keeps its own tape for its open position); null otherwise.
 */
export function heldSignalProtect(id: string): { pair: string; protect: Protect } | null {
  const x = parseConfigId(id);
  if (!x || !x.ind.startsWith("sig-") || x.protect.atr || x.protect.tag || !(x.protect.tp > 0 || x.protect.trail > 0)) return null;
  const tf = laneOf(x.ind).tf ?? REF_TF;
  // the lane's distances are a soft floor on the scaled reference (laneProtect: √(x² + lo²) on the sub-15m lanes), so
  // the reference is found by inverting each field's monotone map, not by dividing by √(tf/15) (bug hunt, 13 Oct: a
  // held config on a 1m or 5m signal lane lost its tape at the next compute)
  const fields = ["tp", "sl", "trail"] as const;
  const p: Protect = {
    tp: 0,
    sl: 0,
    trail: 0,
    hold: Math.max(2, Math.round((x.protect.hold * tf) / REF_TF)),
    ...(x.protect.trailMax !== undefined ? { trailMax: x.protect.trailMax } : {}),
    ...(x.protect.trailOnly ? { trailOnly: true } : {}),
    ...(x.protect.trailStep !== undefined ? { trailStep: x.protect.trailStep } : {}),
    ...(x.protect.trailFree ? { trailFree: true } : {}),
  };
  for (const f of fields) {
    if (f === "tp" && p.trailOnly) continue;
    const target = x.protect[f];
    if (target === 0) { p[f] = 0; continue; }
    const r = invertLaneField(
      target,
      (ref) =>
        laneProtect(
          {
            ...p,
            tp: f === "tp" ? ref : p.tp,
            sl: f === "sl" ? ref : p.sl,
            trail: f === "trail" ? ref : p.trail,
            hold: p.hold,
          },
          x.ind,
        )[f],
    );
    if (r === null) return null;
    p[f] = r;
  }
  return configId(x.bot, x.ind, laneProtect(p, x.ind)) === id
    ? { pair: `${x.bot}|${x.ind}`, protect: p }
    : null;
}

/** The reference value whose lane image is `target` (4 decimals), by bisection on the monotone lane map; null if none. */
function invertLaneField(target: number, image: (ref: number) => number): number | null {
  let lo = 0;
  let hi = Math.max(target * 4, 0.01);
  while (image(hi) < target - 1e-9) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (image(mid) < target) lo = mid;
    else hi = mid;
  }
  // the smallest reference whose lane image reaches the target (the map is a step function: no rounding of the reference,
  // the id's own check below decides)
  return Math.abs(image(hi) - target) < 1e-4 ? hi : null;
}

/**
 * The historic configs a compute must keep building for the positions they hold (their distances moved since they
 * entered): only configs with an OPEN position — a merely seated config needs no tape of its own — and never one of
 * the standard signal configs (signalProtects, built anyway). Seated ids re-added every compute made stale historic
 * configs pile up, take seats and trade (bug hunt, 13 Oct).
 */
export function heldHistProtects(
  openCfgs: Iterable<string>,
  sigPairs: ReadonlySet<string>,
  standard: readonly Protect[],
): Record<string, Protect[]> {
  const same = (a: Protect, b: Protect) =>
    a.tp === b.tp &&
    a.sl === b.sl &&
    a.trail === b.trail &&
    a.hold === b.hold &&
    !!a.trailOnly === !!b.trailOnly &&
    (a.trailStep ?? 1) === (b.trailStep ?? 1) &&
    a.trailMax === b.trailMax;
  const out: Record<string, Protect[]> = {};
  for (const id of openCfgs) {
    const h = heldSignalProtect(id);
    if (!h || !sigPairs.has(h.pair) || standard.some((q) => same(q, h.protect))) continue;
    const list = (out[h.pair] ??= []);
    if (!list.some((p) => same(p, h.protect))) list.push(h.protect);
  }
  return out;
}

/**
 * Exact open coordinator configs survive an exit-range toggle or a changed grid. Rebuild their reference protect from
 * the persisted lane config, keep its range tag, and let the tape builder mark the recovered config held-only.
 */
export function heldCoordinationProtects(
  openCfgs: Iterable<string>,
  pairs: ReadonlySet<string>,
  current: readonly Protect[],
): Record<string, Protect[]> {
  const out: Record<string, Protect[]> = {};
  for (const id of openCfgs) {
    const x = parseConfigId(id);
    if (!x || !isSignalCoordinationInd(x.ind) || x.protect.atr) continue;
    const pair = `${x.bot}|${x.ind}`;
    if (!pairs.has(pair)) continue;
    const kind = kindOfId(id);
    const p: Protect = {
      tp: 0,
      sl: 0,
      trail: 0,
      hold: Math.max(2, Math.round((x.protect.hold * (laneOf(x.ind).tf ?? REF_TF)) / REF_TF)),
      ...(x.protect.trailMax !== undefined ? { trailMax: x.protect.trailMax } : {}),
      ...(x.protect.tag ? { tag: x.protect.tag } : {}),
      ...(x.protect.trailOnly ? { trailOnly: true } : {}),
      ...(x.protect.trailStep !== undefined ? { trailStep: x.protect.trailStep } : {}),
      ...(x.protect.trailFree ? { trailFree: true } : {}),
    };
    let valid = true;
    for (const field of ["tp", "sl", "trail"] as const) {
      if (field === "tp" && p.trailOnly) continue;
      const ref = invertLaneField(x.protect[field], (value) =>
        laneProtect({ ...p, [field]: value }, x.ind)[field],
      );
      if (ref === null) {
        valid = false;
        break;
      }
      p[field] = ref;
    }
    if (!valid) continue;
    const expected = configId(x.bot, x.ind, laneProtect(p, x.ind), kind);
    const withoutAxisVariant = id.replace(/\|axd?-[a-z0-9]+(?=\|axis$)/, "");
    if (expected !== withoutAxisVariant) continue;
    const idOf = (q: Protect) => configId(x.bot, x.ind, laneProtect(q, x.ind), kind);
    if (current.some((q) => idOf(q) === expected)) continue;
    const list = (out[pair] ??= []);
    if (!list.some((q) => idOf(q) === expected)) list.push(p);
  }
  return out;
}
