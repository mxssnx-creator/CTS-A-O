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
import { configId, laneProtect, parseConfigId, REF_TF, seriesOf, type Universe } from "./pipeline/pipeline.ts";
import { filterEntries } from "./sim/walkforward.ts";

/** the grid historic targets, stops and trails are rounded to (0.25 % of price) */
export const HIST_STEP = 0.0025;
/** the smallest historic target: five round trips of the 0.2 % cost */
export const HIST_MIN_TP = 0.01;

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
): Generator<void, number[]> {
  const out: number[] = [];
  for (const s of seriesOf(u, ind)) {
    yield;
    const b = u.bars[s];
    let sig = entrySignal(bot as "follow", ind, u.caches[s], tactics);
    if (!sig) continue;
    if (entry && (entry.trendH > 0 || entry.volFloor > 0)) sig = filterEntries(sig, b, u.caches[s], entry);
    entryMfes(b, sig, Math.max(2, Math.round((holdH * 60) / b.tfMin)), cutT, out);
  }
  return out;
}

/**
 * The MFE of each entry of `sig` on `b` (decided on bar i's close, entered at bar i + 1's open, over the `hold` bars
 * from there), for entries whose hold's last bar closed before `cutT`. Appended to `out`.
 */
export function entryMfes(b: Bars, sig: Int8Array, hold: number, cutT: number, out: number[] = []): number[] {
  const tfMs = b.tfMin * 60_000;
  for (let i = 0; i + hold < b.n; i++) {
    const d = sig[i];
    if (d === 0) continue;
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
): Record<string, Protect[]> {
  const g = signalHistProtectsGen(u, pairs, sig, tactics, cutT);
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
): Generator<void, Record<string, Protect[]>> {
  const h = sig.hist;
  const out: Record<string, Protect[]> = {};
  if (!h?.enabled) return out;
  const hold = Math.max(2, Math.round((sig.holdH * 60) / REF_TF));
  for (const pair of pairs) {
    const [bot, ind] = pair.split("|");
    if (!bot || !ind) continue;
    const mfe = (yield* signalMfeGen(u, bot, ind, sig.holdH, tactics, cutT, sig.filter)).sort((a, b) => a - b);
    if (mfe.length < h.minN) continue;
    // back to the 15m reference: the tape builder scales an untagged protect by √(tf / 15m)
    const tf = laneOf(ind).tf ?? REF_TF;
    const k = Math.sqrt(tf / REF_TF);
    const ps: Protect[] = [];
    const seen = new Set<string>();
    for (const q of h.quantiles) {
      const tp = Math.max(HIST_MIN_TP, onGrid(quantileSorted(mfe, q) / k));
      for (const m of h.slOfTp)
        for (const t of h.trailOfTp) {
          const p: Protect = {
            tp,
            sl: Math.max(sig.minSl, onGrid(tp * m)),
            trail: Math.max(sig.minTrail, onGrid(tp * t)),
            hold,
          };
          const key = `${p.tp}|${p.sl}|${p.trail}`;
          if (seen.has(key)) continue;
          seen.add(key);
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
  const k = Math.sqrt(tf / REF_TF);
  const p: Protect = {
    tp: +(x.protect.tp / k).toFixed(4),
    sl: +(x.protect.sl / k).toFixed(4),
    trail: +(x.protect.trail / k).toFixed(4),
    hold: Math.max(2, Math.round((x.protect.hold * tf) / REF_TF)),
  };
  return configId(x.bot, x.ind, laneProtect(p, x.ind)) === id ? { pair: `${x.bot}|${x.ind}`, protect: p } : null;
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
  const same = (a: Protect, b: Protect) => a.tp === b.tp && a.sl === b.sl && a.trail === b.trail && a.hold === b.hold;
  const out: Record<string, Protect[]> = {};
  for (const id of openCfgs) {
    const h = heldSignalProtect(id);
    if (!h || !sigPairs.has(h.pair) || standard.some((q) => same(q, h.protect))) continue;
    const list = (out[h.pair] ??= []);
    if (!list.some((p) => same(p, h.protect))) list.push(h.protect);
  }
  return out;
}
