// Historic trailing configs of a signal (operator, 13 Oct: "Signals run with multiple trailing configs related to the
// historic calcs in their spec"). Every signal has the same 15 Normal + 15 Trailing percent configs; these add
// Trailing configs of its OWN, from what its own entries did before: the maximum favourable move each historic entry
// reached within the hold (MFE, after the entry at the next bar's open, as the simulator enters), pooled over the
// symbols and both sides of the signal's lane. Its MFE quantiles become targets; each target trails at every share
// and stops at every multiple. Each is a config of its own — its own tape, its own PF validation and seat — built on
// the worker pool with the signal's other configs.
//
// Causal: only entries whose whole hold ended before `cutT` (the stage cut: the run start of a causal evaluation, now
// on a desk) are read. The values are rounded to a 0.25 % grid, so the configs of a signal stay the same from compute
// to compute while its history moves little (a config id is its distances).
import type { Bars, Protect } from "./domain/types.ts";
import type { Tactics } from "./domain/types.ts";
import type { SignalSettings } from "./signal-config.ts";
import { entrySignal } from "./bots/bots.ts";
import { laneOf } from "./indications/registry.ts";
import {
  configId,
  evaluationSignal,
  laneProtect,
  parseConfigId,
  REF_TF,
  seriesOf,
  type Universe,
} from "./pipeline/pipeline.ts";
import { ddrFails, statsOf } from "./metrics/stats.ts";
import { tacticCooldown } from "./indications/filters.ts";
import { bothSides, simulate } from "./sim/backtest.ts";
import { filterEntries } from "./sim/walkforward.ts";
import { adjustProtect } from "./adjust.ts";

export interface SignalHistValidation {
  cost: number;
  minPf: number;
  minTrades: number;
  maxDdr?: number;
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
/** the smallest historic target: five round trips of the 0.2 % cost */
export const HIST_MIN_TP = 0.01;

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

/** The config-specific PF/DD evidence on complete closes before the causal cut. */
function signalHistStats(
  u: Universe,
  bot: string,
  ind: string,
  lane: Protect,
  tactics: Tactics | null | undefined,
  sig: SignalSettings,
  fromT: number,
  cutT: number,
  validation: SignalHistValidation,
  cooldown: number,
) {
  const trades: import("./domain/types.ts").Trade[] = [];
  const id = configId(bot as "follow", ind, lane);
  for (const s of seriesOf(u, ind)) {
    const b = u.bars[s];
    const clipped = barsThroughCut(b, cutT);
    if (clipped.n < 2) continue;
    let entries = entrySignal(bot as "follow", ind, u.caches[s], tactics);
    if (!entries) continue;
    if (sig.filter.trendH > 0 || sig.filter.volFloor > 0)
      entries = filterEntries(entries, b, u.caches[s], sig.filter);
    entries = Int8Array.from(evaluationSignal(u, b, entries));
    for (let i = 0; i < entries.length; i++) {
      const entryT = i + 1 < b.n ? b.t[i + 1] : b.t[i] + b.tfMin * 60_000;
      if (entryT < fromT || i + 1 >= clipped.n) entries[i] = 0;
    }
    const actual = adjustProtect(lane, { minSl: sig.minSl, minTrail: sig.minTrail });
    const results = bothSides(entries.subarray(0, clipped.n), (side) =>
      simulate(id, clipped, side, actual, { cost: validation.cost, cooldown }),
    );
    for (const result of results) trades.push(...result.trades);
  }
  trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side);
  return statsOf(trades);
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
    let m = 0;
    for (let j = i + 1; j <= i + hold; j++) {
      const x = d > 0 ? b.h[j] / e - 1 : 1 - b.l[j] / e;
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

/** signalHistProtects, yielding after each series of each pair. */
export function* signalHistProtectsGen(
  u: Universe,
  pairs: Iterable<string>,
  sig: SignalSettings,
  tactics: Tactics | null | undefined,
  cutT: number,
  validation?: SignalHistValidation,
  diagnostics?: SignalHistDiagnostics,
): Generator<void, Record<string, Protect[]>> {
  const h = sig.hist;
  const out: Record<string, Protect[]> = {};
  if (!h?.enabled) return out;
  const cooldown = tacticCooldown(tactics);
  for (const pair of pairs) {
    const [bot, ind] = pair.split("|");
    if (!bot || !ind) continue;
    diagnostics && diagnostics.pairs++;
    const series = seriesOf(u, ind);
    const earliest = series.reduce((t, s) => Math.min(t, u.bars[s].t[0] ?? Infinity), Infinity);
    // Signals always use the requested minimal historic range when the replay sets one. A configured lookback can
    // narrow it further; otherwise live research begins at the earliest available candle for this lane.
    const fromT = Math.max(
      u.evaluationFromT ?? earliest,
      h.lookbackH > 0 ? cutT - h.lookbackH * 3_600_000 : -Infinity,
    );
    if (!Number.isFinite(fromT) || fromT >= cutT) {
      diagnostics && diagnostics.insufficientEntries++;
      continue;
    }
    // Long configured holds cannot mature inside a short, bounded replay history. Use at most one quarter of the
    // available sample for MFE/hold so the remaining three quarters can supply complete entries and closed PF rows.
    const laneTf = laneOf(ind).tf ?? REF_TF;
    const availableH = (cutT - fromT) / 3_600_000;
    const holdH = signalHistHoldH(sig.holdH, availableH, laneTf);
    const hold = Math.max(2, Math.round((holdH * 60) / REF_TF));
    const mfe = (yield* signalMfeGen(
      u,
      bot,
      ind,
      holdH,
      tactics,
      cutT,
      sig.filter,
      fromT,
    )).sort((a, b) => a - b);
    if (mfe.length < h.minN) {
      diagnostics && diagnostics.insufficientEntries++;
      continue;
    }
    const ps: Protect[] = [];
    const seen = new Set<string>();
    for (const q of h.quantiles) {
      const laneTp = Math.max(HIST_MIN_TP, onGrid(quantileSorted(mfe, q)));
      const tpRef = onGrid(
        invertLaneField(
          laneTp,
          (ref) => laneProtect({ tp: ref, sl: 0, trail: 0, hold }, ind).tp,
        ) ?? laneTp,
      );
      for (const m of h.slOfTp)
        for (const t of h.trailOfTp) {
          const p: Protect = {
            tp: tpRef,
            sl: Math.max(sig.minSl, onGrid(tpRef * m)),
            trail: onGrid(tpRef * t),
            hold,
          };
          const lane = laneProtect(p, ind);
          if (lane.trail * (lane.trailStep ?? 1) + 1e-12 < sig.minTrail) {
            diagnostics && diagnostics.trailTooShort++;
            continue;
          }
          const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}`;
          if (seen.has(key)) continue;
          seen.add(key);
          diagnostics && diagnostics.candidates++;
          if (validation) {
            const st = signalHistStats(u, bot, ind, lane, tactics, sig, fromT, cutT, validation, cooldown);
            diagnostics && diagnostics.evaluated++;
            if (st.n < Math.max(h.minN, validation.minTrades)) {
              diagnostics && diagnostics.insufficientTrades++;
              continue;
            }
            if (!(st.net > 0 && st.pf >= validation.minPf)) {
              diagnostics && diagnostics.pfRejected++;
              continue;
            }
            if (ddrFails(st.mdd, st.net, validation.maxDdr)) {
              diagnostics && diagnostics.ddrRejected++;
              continue;
            }
          }
          diagnostics && diagnostics.qualified++;
          ps.push(p);
        }
    }
    if (ps.length) out[pair] = ps;
  }
  return out;
}

/**
 * The 15m-reference protect of a held signal config id when the tape builder rebuilds exactly that id from it (a
 * historic config whose distances moved since keeps its own tape for its open position); null otherwise.
 */
export function heldSignalProtect(id: string): { pair: string; protect: Protect } | null {
  const x = parseConfigId(id);
  if (!x || x.protect.atr || x.protect.tag || !(x.protect.trail > 0)) return null;
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
    ...(x.protect.trailOnly ? { trailOnly: true, trailStep: x.protect.trailStep ?? 1 } : {}),
  };
  for (const f of fields) {
    if (f === "tp" && p.trailOnly) continue;
    const target = x.protect[f];
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
    (a.trailStep ?? 1) === (b.trailStep ?? 1);
  const out: Record<string, Protect[]> = {};
  for (const id of openCfgs) {
    const h = heldSignalProtect(id);
    if (!h || !sigPairs.has(h.pair) || standard.some((q) => same(q, h.protect))) continue;
    const list = (out[h.pair] ??= []);
    if (!list.some((p) => same(p, h.protect))) list.push(h.protect);
  }
  return out;
}
