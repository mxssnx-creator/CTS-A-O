// Honest bar simulator.
// - A signal is decided on the CLOSE of bar i and entered at the OPEN of bar i+1 (no look-ahead).
// - Intrabar order is unknown, so the stop is checked before the target (pessimistic).
// - The trailing stop tightens from the peak of completed bars only; the new level applies from the next bar.
// - Every closed trade pays the round-trip cost on notional.
// - ATR protects (Protect.atr) are resolved into distances at every entry from ATR(14) of the signal bar.
import type { AtrProtect, Bars, OpenPosition, Protect, Side, Trade } from "../domain/types.ts";
import { atrEma } from "../math/indicators.ts";

export interface SimOptions {
  cost: number;
  /** bars to wait after an exit before a new signal can enter */
  cooldown?: number;
  /** ATR(14) series of the bars for ATR protects (EMA of the true range; computed here when absent) */
  atr?: Float64Array;
}

export interface SimResult {
  trades: Trade[];
  open: OpenPosition | null;
  /** signal on the last closed bar that would enter at the next open */
  pending: Side | 0;
  /** ATR protect: the distances that pending entry trades with (resolved from the last closed bar) */
  pendingProtect?: Protect;
}

/** Protect values are tuned on this timeframe; lanes scale them (volatility √t, hold in equal time). */
export const REF_TF = 15;
/** Floors of a short lane's scaled protect (fractions of price): target 3 × 0.2 % cost, stop, trail. */
export const LANE_MIN = { tp: 0.006, sl: 0.005, trail: 0.0025 } as const;

// ── ATR exits (Stable-02 model) ─────────────────────────────────────────────────────────────────────────
/** ATR(14) of the Stable-02 desk (EMA of the true range) */
export const ATR_PERIOD = 14;
/** Stable-02: without a finite ATR the desk assumed 1 % of price */
export const ATR_FALLBACK = 0.01;
/** Stable-02 (vst.ts): the trail arms once the move reaches 0.95 × the stop distance */
export const ATR_TRAIL_ARM = 0.95;
/** Stable-02 (vst.ts): trailing gap = stop distance × (1 + (trail % − 0.8 %) × 6), trail % at least 0.4 */
export const atrTrailGap = (trailPct: number) => 1 + (Math.max(0.4, trailPct) / 100 - 0.008) * 6;

const r6 = (x: number) => +x.toFixed(6);

/**
 * The fixed distances of an ATR protect for one entry: `atrFrac` = ATR ÷ price on the signal bar (fallback 1 %).
 * stop = sl × ATR, target = stop × tpRatio, trail arming at 0.95 × stop with the Stable-02 gap. Short lanes keep
 * the engine's soft floors (√(x² + floor²), as laneProtect), and live-feedback floors apply last.
 */
export function resolveAtrProtect(p: Protect, atrFrac: number, tfMin = REF_TF): Protect {
  const a = p.atr;
  if (!a) return p;
  const f = Number.isFinite(atrFrac) && atrFrac > 0 ? atrFrac : ATR_FALLBACK;
  const lo = (x: number, m: number) => (tfMin < REF_TF ? Math.hypot(x, m) : x);
  let sl = lo(a.sl * f, LANE_MIN.sl);
  if (a.minSl) sl = Math.max(sl, a.minSl);
  // the target follows the (floored) stop at its ratio, and never falls below 3 × the round-trip cost on any lane
  // (a low-ATR 15m entry gave targets below the cost: every target exit a loss)
  const tp = Math.max(sl * a.tpRatio, LANE_MIN.tp);
  const out: Protect = { tp: r6(tp), sl: r6(sl), trail: 0, hold: p.hold };
  if (a.trail && a.trail > 0) {
    const arm = lo(ATR_TRAIL_ARM * a.sl * f, LANE_MIN.trail);
    let gap = lo(atrTrailGap(a.trail) * a.sl * f, LANE_MIN.trail);
    if (a.minTrail) gap = Math.max(gap, a.minTrail);
    out.trail = r6(arm);
    out.trailStep = gap / arm;
    out.trailFree = false;
  }
  return out;
}

/** An ATR protect with its nominal distances (ATR at 1 % of price) for ids, display and fallback. */
export function atrProtect(a: AtrProtect, hold: number): Protect {
  const sl = +(a.sl * ATR_FALLBACK).toFixed(4);
  const trail = a.trail && a.trail > 0 ? +(ATR_TRAIL_ARM * sl).toFixed(4) : 0;
  return { tp: +(sl * a.tpRatio).toFixed(4), sl, trail, hold, atr: { ...a } };
}

export function simulate(
  cfg: string,
  bars: Bars,
  sig: Int8Array,
  p: Protect,
  opt: SimOptions,
): SimResult {
  const { n, t, o, h, l, c, sym } = bars;
  const cost = opt.cost;
  const cooldown = opt.cooldown ?? 0;
  // a bar's close is its exit time when the bar ends: the minutes of one bar
  const barMs = bars.tfMin * 60_000;
  const trades: Trade[] = [];
  let inPos = false;
  let side: Side = 1;
  let entryI = 0;
  let entry = 0;
  let stop = 0;
  let target = 0;
  let peak = 0;
  let trailOn = false;
  // the highest high and the lowest low of the bars held: the excursions (mfe / mae) at the exit. (x − entry) / entry
  // is monotone in x, so the extreme bar is the extreme excursion, exactly — no division per bar
  let hiMax = 0;
  let loMin = 0;
  let nextAllowed = 0;
  // the distances in force (an ATR protect resolves them at every entry)
  let q: Protect = p;
  let dist = p.trail * (p.trailStep ?? 1);
  const atr = p.atr ? (opt.atr ?? atrEma(h, l, c, ATR_PERIOD)) : null;
  const resolve = (i: number) => resolveAtrProtect(p, atr![i] / c[i], bars.tfMin);
  const nx = nextEntryIndex(sig);

  const close = (i: number, exit: number, reason: Trade["reason"]) => {
    const r = (side * (exit - entry)) / entry - cost;
    // the excursion up and down from the entry; a long's best is up, a short's best is down (0 when never that way)
    const up = (hiMax - entry) / entry;
    const dn = (entry - loMin) / entry;
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[entryI],
      exitT: t[i] + barMs,
      entry,
      exit,
      r,
      reason,
      bars: i - entryI + 1,
      mfe: side === 1 ? (up > 0 ? up : 0) : dn > 0 ? dn : 0,
      mae: side === 1 ? (dn > 0 ? dn : 0) : up > 0 ? up : 0,
    });
    inPos = false;
    nextAllowed = i + cooldown;
  };

  for (let i = 0; i < n; i++) {
    if (inPos && i >= entryI) {
      const gap = i > entryI;
      if (h[i] > hiMax) hiMax = h[i];
      if (l[i] < loMin) loMin = l[i];
      if (side === 1) {
        if (l[i] <= stop) {
          close(i, gap ? Math.min(o[i], stop) : stop, trailOn ? "trail" : "sl");
        } else if (h[i] >= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.max(o[i], target) : target, "tp");
        }
      } else {
        if (h[i] >= stop) {
          close(i, gap ? Math.max(o[i], stop) : stop, trailOn ? "trail" : "sl");
        } else if (l[i] <= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.min(o[i], target) : target, "tp");
        }
      }
      if (inPos) {
        if (i - entryI + 1 >= p.hold) {
          close(i, c[i], "time");
        } else if (q.trail > 0) {
          if (side === 1) {
            if (h[i] > peak) peak = h[i];
            if ((peak - entry) / entry >= q.trail) {
              trailOn = true;
              const lvl = peak * (1 - dist);
              if (lvl > stop) stop = lvl;
            }
          } else {
            if (l[i] < peak) peak = l[i];
            if ((entry - peak) / entry >= q.trail) {
              trailOn = true;
              const lvl = peak * (1 + dist);
              if (lvl < stop) stop = lvl;
            }
          }
        }
      }
    }
    if (!inPos) {
      // flat: a bar without an entry changes nothing, so go straight to the next entry the cooldown allows (or stop:
      // none is left) — the same trades as visiting every bar
      const j = nx[i >= nextAllowed ? i : Math.min(nextAllowed, n)];
      if (j + 1 >= n) break;
      i = j;
      const s = sig[i];
      {
        inPos = true;
        side = s > 0 ? 1 : -1;
        entryI = i + 1;
        entry = o[i + 1];
        if (atr) {
          // ATR of the signal bar (known at its close), as a fraction of its close
          q = resolve(i);
          dist = q.trail * (q.trailStep ?? 1);
        }
        stop = side === 1 ? entry * (1 - q.sl) : entry * (1 + q.sl);
        target = side === 1 ? entry * (1 + q.tp) : entry * (1 - q.tp);
        peak = entry;
        trailOn = false;
        hiMax = -Infinity;
        loMin = Infinity;
      }
    }
  }

  let open: OpenPosition | null = null;
  if (inPos) {
    const last = c[n - 1];
    open = {
      cfg,
      sym,
      side,
      entryT: t[entryI],
      entryI,
      entry,
      stop,
      target,
      peak,
      trailOn,
      mtm: (side * (last - entry)) / entry - cost,
      // the trail in force (an ATR protect resolved it at the entry): the live tick advances it bar by bar
      ...(q.trail > 0 ? { trail: q.trail, trailDist: dist } : {}),
    };
  }
  const lastSig = n > 0 ? sig[n - 1] : 0;
  const pending: Side | 0 =
    !inPos && n > 0 && n - 1 >= nextAllowed && lastSig !== 0 ? (lastSig > 0 ? 1 : -1) : 0;
  if (pending && atr) return { trades, open, pending, pendingProtect: resolve(n - 1) };
  return { trades, open, pending };
}

// ── Long and short run independently (operator: "always process long and short both, independently") ────────
//
// Every simulator holds ONE position slot (one inPos / ladder / lane): run on a mixed signal, an open long dropped
// every short signal until it closed (and vice versa), and its pending intent was 0 while a position was open. Each
// direction therefore runs on its own side-filtered copy of the signal — its own slot, its own cooldown — and the
// results are merged. A one-sided (or empty) signal runs once on the signal itself: exactly the old result.

/** The copy of `sig` that keeps only `side`'s entries (long: sig > 0, short: sig < 0). */
/**
 * One closed bar of a trailing position, exactly as `simulate` advances it after the bar's stop / target check: the
 * peak follows the bar's high (long) / low (short); once it is `trail` beyond the entry the trail is armed and the
 * stop rises (long) / falls (short) to `peak × (1 ∓ dist)`, never back. The live tick applies it between computes,
 * so a trailing stop keeps moving while the next compute runs. Returns whether the stop moved.
 */
export function trailBar(
  p: { side: number; entry: number; stop: number; peak: number; trailOn: boolean },
  trail: number,
  dist: number,
  hi: number,
  lo: number,
): boolean {
  if (!(trail > 0) || !(p.entry > 0)) return false;
  if (p.side === 1) {
    if (hi > p.peak) p.peak = hi;
    if ((p.peak - p.entry) / p.entry >= trail) {
      p.trailOn = true;
      const lvl = p.peak * (1 - dist);
      if (lvl > p.stop) {
        p.stop = lvl;
        return true;
      }
    }
  } else {
    if (lo < p.peak) p.peak = lo;
    if ((p.entry - p.peak) / p.entry >= trail) {
      p.trailOn = true;
      const lvl = p.peak * (1 + dist);
      if (lvl < p.stop) {
        p.stop = lvl;
        return true;
      }
    }
  }
  return false;
}

export function sideSignal(sig: Int8Array, side: Side): Int8Array {
  const out = new Int8Array(sig.length);
  for (let i = 0; i < sig.length; i++) if (side * sig[i] > 0) out[i] = sig[i];
  return out;
}

/**
 * The signals each direction runs on: `[sig]` when it has entries of one side only (or none) — the old result,
 * bit for bit, at no extra cost — else `[long only, short only]` (long first: deterministic merge order).
 */
export function splitSides(sig: Int8Array): Int8Array[] {
  // memoized on the signal array: a combo's signal is one cached array (SeriesCache.memo) that Base and the tape
  // builder run under every protect cell and range — rescanning and copying it per run was 20 % of Base
  const hit = sidesMemo.get(sig);
  if (hit) return hit;
  let hasL = false;
  let hasS = false;
  for (let i = 0; i < sig.length && !(hasL && hasS); i++) {
    if (sig[i] > 0) hasL = true;
    else if (sig[i] < 0) hasS = true;
  }
  const out = hasL && hasS ? [sideSignal(sig, 1), sideSignal(sig, -1)] : [sig];
  sidesMemo.set(sig, out);
  return out;
}
/** splitSides by signal array (released with the array; signal arrays are never written after they are built) */
const sidesMemo = new WeakMap<Int8Array, Int8Array[]>();

/**
 * For each bar i, the first bar j ≥ i with an entry (sig[j] ≠ 0), else n: lets `simulate` step from one entry to
 * the next while flat instead of visiting every bar. Memoized on the signal array, like splitSides.
 */
export function nextEntryIndex(sig: Int8Array): Int32Array {
  let nx = nextMemo.get(sig);
  if (nx) return nx;
  const n = sig.length;
  nx = new Int32Array(n + 1);
  nx[n] = n;
  for (let i = n - 1; i >= 0; i--) nx[i] = sig[i] !== 0 ? i : nx[i + 1];
  nextMemo.set(sig, nx);
  return nx;
}
const nextMemo = new WeakMap<Int8Array, Int32Array>();

/** Runs a single-slot simulator once per direction (splitSides) and returns each direction's result. */
export function bothSides<R>(sig: Int8Array, run: (s: Int8Array) => R): R[] {
  return splitSides(sig).map(run);
}

/** Trades of several runs in one list ordered by exit time, then entry time, then side (long first). */
export function mergeSideTrades(lists: readonly (readonly Trade[])[]): readonly Trade[] {
  if (lists.length === 1) return lists[0];
  const all: Trade[] = [];
  for (const l of lists) for (const tr of l) all.push(tr);
  all.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side);
  return all;
}

/** Merge per-symbol trade lists into one tape ordered by exit time (stable on entry time). */
export function mergeTapes(lists: readonly Trade[][]): Trade[] {
  const all: Trade[] = [];
  for (const l of lists) for (const tr of l) all.push(tr);
  all.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || (a.sym < b.sym ? -1 : 1));
  return all;
}
