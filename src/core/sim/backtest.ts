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
  const tp = lo(a.sl * f * a.tpRatio, LANE_MIN.tp);
  if (a.minSl) sl = Math.max(sl, a.minSl);
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
  const trades: Trade[] = [];
  let inPos = false;
  let side: Side = 1;
  let entryI = 0;
  let entry = 0;
  let stop = 0;
  let target = 0;
  let peak = 0;
  let trailOn = false;
  let mfe = 0;
  let mae = 0;
  let nextAllowed = 0;
  // the distances in force (an ATR protect resolves them at every entry)
  let q: Protect = p;
  let dist = p.trail * (p.trailStep ?? 1);
  const atr = p.atr ? (opt.atr ?? atrEma(h, l, c, ATR_PERIOD)) : null;
  const resolve = (i: number) => resolveAtrProtect(p, atr![i] / c[i], bars.tfMin);

  const close = (i: number, exit: number, reason: Trade["reason"], exitT: number) => {
    const r = (side * (exit - entry)) / entry - cost;
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[entryI],
      exitT,
      entry,
      exit,
      r,
      reason,
      bars: i - entryI + 1,
      mfe,
      mae,
    });
    inPos = false;
    nextAllowed = i + cooldown;
  };

  for (let i = 0; i < n; i++) {
    if (inPos && i >= entryI) {
      const gap = i > entryI;
      const barEnd = t[i] + bars.tfMin * 60_000;
      if (side === 1) {
        const up = (h[i] - entry) / entry;
        const dn = (entry - l[i]) / entry;
        if (up > mfe) mfe = up;
        if (dn > mae) mae = dn;
        if (l[i] <= stop) {
          close(i, gap ? Math.min(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
        } else if (h[i] >= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.max(o[i], target) : target, "tp", barEnd);
        }
      } else {
        const up = (entry - l[i]) / entry;
        const dn = (h[i] - entry) / entry;
        if (up > mfe) mfe = up;
        if (dn > mae) mae = dn;
        if (h[i] >= stop) {
          close(i, gap ? Math.max(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
        } else if (l[i] <= target && !(trailOn && q.trailFree)) {
          close(i, gap ? Math.min(o[i], target) : target, "tp", barEnd);
        }
      }
      if (inPos) {
        if (i - entryI + 1 >= p.hold) {
          close(i, c[i], "time", barEnd);
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
    if (!inPos && i >= nextAllowed && i + 1 < n) {
      const s = sig[i];
      if (s !== 0) {
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
        mfe = 0;
        mae = 0;
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
    };
  }
  const lastSig = n > 0 ? sig[n - 1] : 0;
  const pending: Side | 0 =
    !inPos && n > 0 && n - 1 >= nextAllowed && lastSig !== 0 ? (lastSig > 0 ? 1 : -1) : 0;
  if (pending && atr) return { trades, open, pending, pendingProtect: resolve(n - 1) };
  return { trades, open, pending };
}

/** Merge per-symbol trade lists into one tape ordered by exit time (stable on entry time). */
export function mergeTapes(lists: readonly Trade[][]): Trade[] {
  const all: Trade[] = [];
  for (const l of lists) for (const tr of l) all.push(tr);
  all.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || (a.sym < b.sym ? -1 : 1));
  return all;
}
