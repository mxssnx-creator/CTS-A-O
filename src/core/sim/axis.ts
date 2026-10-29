// Axis simulation (honest, bar by bar): a mean-reversion ladder around an axis price.
//
// The axis is a moving centre (EMA `center`). A combo signal is taken only when it points back to the axis
// (price below the axis → long, above → short) and the displacement from the axis is between minDisp and
// maxDisp ATR. The base leg opens at the next bar's open; `levels − 1` extra rungs rest at spacing × ATR
// steps further away, each `ratio` × a normal position. Target = the axis price at signal time (fixed), stop =
// beyond the last rung by the protect's SL distance, max hold = the protect's hold.
//
// Intrabar order (conservative; the same in desk mode, see axisFillsBeforeStop): the stop is placed from the
// average entry (managed / desk) — the documented design — so it can lie AT or INSIDE the next resting rung. On a
// bar that reaches both, the stop in force before that bar's fills is checked first: a rung at or beyond it
// (long: rung ≤ stop, short: rung ≥ stop) can never fill before it and is cancelled with the position; a rung
// strictly before it fills on the way (at the rung, or at the open when the bar opens through it) and then exits
// at that same stop — a fill never re-derives (loosens) a stop the bar already reached. The exit is never better
// than a fill of the same bar (long: exit ≤ every fill price on the bar). Only on a bar that does not reach the
// stop in force do fills re-derive the levels, and the re-derived stop is then checked on the same bar.
// No target on a bar in which a rung filled. (Fixed exits keep the stop beyond the last rung, so every rung lies
// before it and this order changes nothing there.)
//
// Managed exits (default, the old desk's Axis handling): step = max(rung spacing, 0.7 ATR, 0.2 % of the average
// entry); target = past the axis by ¼ step and at least 0.85 step from the average entry; stop distance =
// min(step, target distance) × the set's slMult, at least the stop floor (minSl × average: EVAL_MIN_SL, protectFloor
// and the live-feedback minSl). Every rung fill re-derives both from the new average. On each closed bar the target
// tightens toward the moving axis (never widens) and the stop moves to breakeven once the move reached 0.85 risk.
// Range types set the rung spacing: atr (spacing × ATR), linear (price × spacing % × 1.8 + ¼ ATR), geo
// (price × spacing / 80), fib (0.809 ATR), volume (ATR × (1.15 − min(vol × 8, 0.45))).
//
// Desk mode (AxisConfig.mode "desk", simulateAxisDesk below) is the Stable-02 desk structure instead.
import type {
  AxisConfig,
  AxisRange,
  Bars,
  OpenPosition,
  Protect,
  Side,
  Trade,
} from "../domain/types.ts";
import { atrTrailGap } from "./backtest.ts";
import { isSignalConfig, signalStopAt, signalTrailMax } from "./trailing.ts";
import type { SimulationCursor } from "./cursor.ts";
import { admitSimulationEntry, type EntryAdmission } from "./entry-admission.ts";

/**
 * The volume range's `vol`: realized volatility per bar = ATR ÷ price ÷ 1.6. The Stable-02 desk's quote `vol` was
 * the symbol's volatility (not traded volume), and its quotes were seeded with ATR = price × vol × 1.6
 * (vst.ts mkQuotes), so this inverts that relation from data every bar has (no volume feed needed).
 */
export const axisVol = (px: number, a: number) => (px > 0 && a > 0 ? a / px / 1.6 : 0);

/** Rung spacing (price units) of a range type at price `px` with ATR `a`. */
export function axisSpacing(range: AxisRange, spacing: number, px: number, a: number): number {
  switch (range) {
    case "volume":
      // Stable-02 vst.ts axisLadders: atr × (1.15 − min(vol × 8, 0.45))
      return a * (1.15 - Math.min(axisVol(px, a) * 8, 0.45));
    case "linear":
      return px * (spacing / 100) * 1.8 + a * 0.25;
    case "geo":
      return px * (spacing / 80);
    case "fib":
      return a * 0.809;
    default:
      return a * spacing;
  }
}

/** A resting rung at `rung` may fill before the stop `stop` (long: strictly above it; short: strictly below). */
export const axisFillsBeforeStop = (side: Side, rung: number, stop: number): boolean =>
  side === 1 ? rung > stop : rung < stop;

export interface AxisResult {
  trades: Trade[];
  pending: Side | 0;
  /**
   * the position still open at the last close (average entry, stop and target in force for the next bar; mtm per
   * unit, w = the ladder weight)
   */
  open: OpenPosition | null;
}

export function simulateAxis(
  cfg: string,
  bars: Bars,
  sig: Int8Array,
  p: Protect,
  ax: AxisConfig,
  center: Float64Array,
  atr: Float64Array,
  cost: number,
  cooldown = 0,
  /**
   * managed exits: floor of the derived stop distance (fraction of the average entry: EVAL_MIN_SL, protectFloor and
   * the set's live-feedback minSl) and the set's relative widening (slMult). Fixed exits take theirs from `p.sl`.
   */
  floor?: { minSl: number; slMult?: number } | null,
  cursor?: SimulationCursor,
  admitEntry?: EntryAdmission,
): AxisResult {
  if (!(Number.isFinite(cost) && cost >= 0)) throw new RangeError("Axis round-trip cost must be finite and nonnegative");
  const { n, t, o, h, l, c, sym } = bars;
  const signal = isSignalConfig(cfg);
  const signalMax = signal ? signalTrailMax({ cfg, trailMax: p.trailMax }) : Infinity;
  const tfMs = bars.tfMin * 60_000;
  cursor?.begin(bars);
  let trades: Trade[] = [];
  const levels = Math.max(1, Math.round(ax.levels));
  const initial = {
    state: "flat" as "flat" | "pos",
    side: 1 as Side,
    legs: [] as Array<{ px: number; w: number }>,
    rungs: [] as number[],
    nextRung: 0,
    startI: 0,
    stop: 0,
    target: 0,
    mfe: 0,
    mae: 0,
    sp: 0,
    risk: 0,
    nextAllowed: 0,
    pendingOpen: -1,
  };
  let {
    state,
    side,
    legs,
    rungs,
    nextRung,
    startI,
    stop,
    target,
    mfe,
    mae,
    sp,
    risk,
    nextAllowed,
    pendingOpen,
  } = cursor?.restore(initial) ?? initial;
  const checkpoint = () => ({
    state,
    side,
    legs,
    rungs,
    nextRung,
    startI,
    stop,
    target,
    mfe,
    mae,
    sp,
    risk,
    nextAllowed,
    pendingOpen,
  });
  const managed = ax.exits !== "fixed";
  const range: AxisRange = ax.range ?? "atr";
  const minSl = Math.max(0, floor?.minSl ?? 0);
  const slMult = floor?.slMult && floor.slMult > 0 ? floor.slMult : 1;
  // managed exits from the current average entry (after a fill) and the axis / ATR on bar i
  const derive = (i: number) => {
    const a = avg();
    const at = Number.isFinite(atr[i]) ? atr[i] : 0;
    const step = Math.max(sp, 0.7 * at, 0.002 * a);
    const m = Number.isFinite(center[i]) ? center[i] : target;
    target =
      side === 1
        ? Math.max(m + 0.25 * step, a + 0.85 * step)
        : Math.min(m - 0.25 * step, a - 0.85 * step);
    // the stop floors (and the adjuster's relative step) hold the derived stop off the spread and noise
    const slDist = Math.max(Math.min(step, Math.abs(target - a)) * slMult, minSl * a);
    const nextStop = a - side * slDist;
    const ratchet = signal && legs.length > 1 ? (side === 1 ? Math.max(stop, nextStop) : Math.min(stop, nextStop)) : nextStop;
    stop = signal ? signalStopAt(a, side, ratchet, signalMax) : nextStop;
    risk = Math.min(Math.max(slDist, sp, 0.45 * at), signal ? a * signalMax : Infinity);
  };

  const wsum = () => legs.reduce((a, x) => a + x.w, 0);
  // Rung weights fund original quote notional. Quantity is w / fill price,
  // so the combined cost basis must reproduce the same sum of leg returns.
  const avg = () => legs.length === 1 ? legs[0].px : wsum() / legs.reduce((q, x) => q + x.w / x.px, 0);
  // the same entry rules for a signal on bar i (used for the next-bar pending intent as well)
  const admissible = (i: number, s: Side, ref: number) => {
    const m = center[i];
    const a = atr[i];
    if (!Number.isFinite(m) || !Number.isFinite(a) || a <= 0) return false;
    const disp = (c[i] - m) / a;
    if (
      (s === 1 ? disp >= 0 : disp <= 0) ||
      Math.abs(disp) < ax.minDisp ||
      Math.abs(disp) > ax.maxDisp
    )
      return false;
    return (s * (m - ref)) / ref > 2 * cost;
  };
  const close = (i: number, exit: number, reason: Trade["reason"]) => {
    nextAllowed = i + 1 + cooldown;
    let r = 0;
    for (const x of legs) r += x.w * ((side * (exit - x.px)) / x.px - cost);
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[startI],
      exitT: t[i] + tfMs,
      entry: avg(),
      exit,
      r,
      reason,
      bars: i - startI + 1,
      mfe,
      mae,
      kind: "axis",
      vol: wsum(),
      level: legs.length - 1,
    });
    state = "flat";
    legs = [];
  };

  for (let i = cursor?.start ?? 0; i < n; i++) {
    cursor?.checkpoint(i, n, checkpoint);
    let filled = false;
    if (pendingOpen === i) {
      legs = [{ px: o[i], w: 1 }];
      startI = i;
      state = "pos";
      mfe = 0;
      mae = 0;
      pendingOpen = -1;
      // managed: exits from the fill and the signal bar's axis / ATR
      if (managed) derive(i - 1);
    }
    if (state === "pos") {
      const reached = (s: number) => (side === 1 ? l[i] <= s : h[i] >= s);
      // the stop in force at this bar's open rested there (a bar that opens through it exits at the open); a stop
      // set at this bar's base fill or re-derived by a rung fill on it was placed after that fill
      let rested = i > startI;
      // the worst fill price of this bar (long: lowest): an exit on this bar is never better
      let fillX = side === 1 ? Infinity : -Infinity;
      while (nextRung < rungs.length) {
        const px = rungs[nextRung];
        if (!reached(px)) break;
        // conservative intrabar order (header): a stop the bar reaches goes before a rung at or beyond it — that
        // rung and every deeper one never fill (cancelled with the position)
        if (reached(stop) && !axisFillsBeforeStop(side, px, stop)) break;
        const fx = side === 1 ? Math.min(o[i], px) : Math.max(o[i], px);
        legs.push({ px: fx, w: ax.ratio });
        fillX = side === 1 ? Math.min(fillX, fx) : Math.max(fillX, fx);
        nextRung++;
        filled = true;
        // managed: the fill re-derives both levels from the new average (from the last closed bar's axis / ATR: the
        // bar in progress is never used) — unless the bar already reached the stop in force: that stop triggered
        // on the way past this fill and is the exit (a fill never loosens a stop the bar has hit)
        if (managed && !reached(stop)) {
          const s0 = stop;
          derive(i - 1);
          if (stop !== s0) rested = false;
        }
      }
      const a = avg();
      const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
      const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
      if (up > mfe) mfe = up;
      if (dn > mae) mae = dn;
      if (reached(stop)) {
        const sx = rested ? (side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop)) : stop;
        // a stop moved to the average entry (breakeven after 0.85 risk) is not a stop-out: "be"
        close(
          i,
          side === 1 ? Math.min(sx, fillX) : Math.max(sx, fillX),
          side * (stop - avg()) >= 0 ? "be" : "sl",
        );
      } else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target))
        // a target the open is already through fills at the open — on the entry bar too: a fixed target the next
        // open gapped past (beyond the axis) is marketable when placed and fills at that open, never behind the fill
        // (a managed target lies beyond the fill, so on its entry bar this is the target itself)
        close(i, side === 1 ? Math.max(o[i], target) : Math.min(o[i], target), "tp");
      else if (i - startI + 1 >= p.hold) close(i, c[i], "time");
      else if (managed) {
        // on the closed bar: tighten the target toward the moving axis, breakeven after 0.85 risk
        const m = center[i];
        if (Number.isFinite(m)) {
          const want =
            side === 1
              ? Math.max(m + 0.2 * sp, a + 0.95 * risk)
              : Math.min(m - 0.2 * sp, a - 0.95 * risk);
          if (side === 1 ? want < target && want > a : want > target && want < a) target = want;
        }
        if (side * (c[i] - a) >= 0.85 * risk)
          stop = side === 1 ? Math.max(stop, a) : Math.min(stop, a);
      }
    }
    if (state === "flat" && pendingOpen < 0 && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
      const s: Side = sig[i] > 0 ? 1 : -1;
      const ref = o[i + 1];
      // only back toward the axis, from a meaningful but not extreme displacement, with the axis ahead after costs —
      // judged on the signal bar's close, as live does (the next open is not known when the decision is made)
      if (!admissible(i, s, c[i])) continue;
      if (!admitSimulationEntry(admitEntry, cfg, bars, i, s)) continue;
      const m = center[i];
      const a = atr[i];
      side = s;
      target = m;
      const step = managed ? axisSpacing(range, ax.spacing, ref, a) : ax.spacing * a;
      sp = step;
      rungs = [];
      for (let k = 1; k < levels; k++) rungs.push(side === 1 ? ref - step * k : ref + step * k);
      nextRung = 0;
      const deepest = side === 1 ? ref - step * (levels - 1) : ref + step * (levels - 1);
      stop = side === 1 ? deepest * (1 - p.sl) : deepest * (1 + p.sl);
      if (signal) stop = signalStopAt(ref, side, stop, signalMax);
      pendingOpen = i + 1;
    }
  }
  if (cursor) trades = cursor.finish(bars, trades, checkpoint);
  // next-bar intent: only when the simulation itself would take it (the next open is unknown → last close)
  const last = n > 0 ? sig[n - 1] : 0;
  const ls: Side = last > 0 ? 1 : -1;
  const pendingOk =
    n > 0 &&
    last !== 0 &&
    state === "flat" &&
    pendingOpen < 0 &&
    n >= nextAllowed &&
    admissible(n - 1, ls, c[n - 1]);
  // the position still open at the last close: paper holds it and live mirrors it (as desk mode does)
  let open: OpenPosition | null = null;
  if (state === "pos" && legs.length && n > 0) {
    const a = avg();
    const w = wsum();
    let r = 0;
    for (const x of legs) r += x.w * ((side * (c[n - 1] - x.px)) / x.px - cost);
    open = {
      cfg,
      sym,
      side,
      entryT: t[startI],
      entryI: startI,
      entry: a,
      stop,
      target,
      peak: a * (1 + side * mfe),
      trailOn: false,
      // per unit (the ladder's result ÷ its weight): paper marks mtm × volume, and its volume carries w
      mtm: r / w,
      w,
    };
  }
  return { trades, pending: pendingOk ? ls : 0, open };
}

// ── Desk mode: the Stable-02 desk's Axis structure (src/lib/desk/vst.ts) ─────────────────────────────────
//
// Honest bar-by-bar port of armUniverse (ladder placement), matchOrders / applyFill (rung fills) and handleAxis
// (+ the hybrid trailing of managePositions):
// - Signal at the close of bar i (its side plays the desk's direction(); 0 = nothing): `levels` (≥ 2, as
//   axisLadders' n = max(2, axisLevels)) resting limit rungs at axis[i] ∓ k × spacing (long below, short above),
//   spacing = axisSpacing(range, …) of the signal bar. Each rung carries the desk's protect: SL distance
//   slDist(ATR, spacing, slAtr) (floored at minSl × rung price), TP = SL × ratio, both through protectLevels.
// - Rungs rest from bar i + 1. A rung fills when a bar trades through its price: at the rung price, or at the
//   open when the bar opens beyond it (a marketable limit). Unfilled rungs are cancelled after `expiry` bars
//   (default the protect's hold) and when the position closes (vst.ts cancelLane).
// - First fill: stop / target = protectLevels(fill, …) of that rung. Later fills (applyFill): SL = max(rung SL,
//   position SL), TP = max(rung TP, position TP, SL × ratio) around the new average; the stop only tightens and
//   the target only widens.
// - Every closed bar (handleAxis): spacing = max(first rung's offset from the axis, ATR × max(axisSpacing, 0.2)
//   × 1 %), SL = slDist(ATR, spacing, slAtr) (floored), levels around the average; stop tightened never loosened,
//   target never reduced, then an SL on the loss side is capped at TP distance ÷ ratio. Hybrid: the Stable-02
//   trail arms at 0.95 × SL distance of move (close vs average) and holds the stop at close ∓ SL × atrTrailGap,
//   the gap floored at minTrail × close. Levels set at a close apply from the next bar.
// - Time (vst.ts maxHoldTicks): after the hold a losing position closes at the close, a winning one moves its
//   stop to breakeven; a hard time exit at 2 × hold keeps every position bounded.
// - Intrabar order is conservative, as in revert mode (file header): the stop is from the fill / average (the
//   desk's design), so it usually lies inside the next rung (SL ≤ max(0.42 spacing, 0.35 ATR) < spacing). A bar
//   that reaches the stop in force (for rungs after the first fill on the same bar: that fill's stop) exits there;
//   a rung at or beyond it never fills, one strictly before it fills on the way and exits at that same stop
//   (levels are not re-derived from a fill the stop already overtook). The exit is never better than a fill of the
//   bar. No target on a bar in which a rung filled.

/** Stable-02 engine.ts snapTpRatio: 0.2 … 3 in steps of 0.2 */
export function snapTpRatio(x: number): number {
  if (!Number.isFinite(x)) return 2.2;
  const v = Math.min(3, Math.max(0.2, x));
  return Math.round(Math.round(v / 0.2) * 0.2 * 100) / 100;
}

/** Stable-02 vst.ts slDist: min(ATR × slAtr, 0.42 × spacing), at least 0.35 ATR */
export function deskSlDist(a: number, spacing: number, slAtr: number): number {
  return Math.max(Math.min(a * slAtr, spacing * 0.42), a * 0.35);
}

/** Stable-02 vst.ts protectLevels: stop / target around `entry`, stop distance capped at target ÷ ratio. */
export function deskLevels(entry: number, side: Side, sl0: number, tp0: number, ratio: number) {
  const r = snapTpRatio(ratio);
  const floor = Math.max(entry * 1e-6, 1e-12);
  const clamp = (x: number) => (Number.isFinite(x) ? Math.max(x, floor * 0.25) : floor);
  let sl = clamp(entry - side * sl0);
  let tp = clamp(entry + side * tp0);
  if (side === 1 && sl >= entry) sl = entry * 0.995;
  if (side === -1 && sl <= entry) sl = entry * 1.005;
  if (side === 1 && tp <= entry) tp = entry * 1.005;
  if (side === -1 && tp >= entry) tp = entry * 0.995;
  const tpD = Math.abs(tp - entry);
  if (Math.abs(entry - sl) > tpD / r + 1e-12) sl = entry - (side * tpD) / r;
  return { sl, tp };
}

export interface AxisDeskResult extends AxisResult {
  /** the position still open at the last close (average entry, stop and target in force for the next bar) */
  open: OpenPosition | null;
  /** the desk distances a pending entry would trade with (fractions of the last close) */
  pendingProtect?: Protect;
}

export function simulateAxisDesk(
  cfg: string,
  bars: Bars,
  sig: Int8Array,
  p: Protect,
  ax: AxisConfig,
  center: Float64Array,
  atr: Float64Array,
  cost: number,
  cooldown = 0,
  /**
   * hard floors of the stop / trailing distance (fractions of price): protectFloor and live-feedback minSl / minTrail;
   * maxSl (Axis per range) caps the stop so the target (stop × ratio) stays inside the range's target band
   */
  floor?: { minSl: number; minTrail: number; maxSl?: number } | null,
  cursor?: SimulationCursor,
  /** Checked before creating resting rungs, not after an unqualified ladder blocks later signals. */
  admitEntry?: EntryAdmission,
): AxisDeskResult {
  if (!(Number.isFinite(cost) && cost >= 0)) throw new RangeError("Axis round-trip cost must be finite and nonnegative");
  const { n, t, o, h, l, c, sym } = bars;
  const signal = isSignalConfig(cfg);
  const signalMax = signal ? signalTrailMax({ cfg, trailMax: p.trailMax }) : Infinity;
  const tfMs = bars.tfMin * 60_000;
  cursor?.begin(bars);
  let trades: Trade[] = [];
  const nRungs = Math.max(2, Math.round(ax.levels));
  const range: AxisRange = ax.range ?? "atr";
  const slAtr = ax.slAtr && ax.slAtr > 0 ? ax.slAtr : 0.7;
  const ratio = snapTpRatio(ax.tpRatio ?? 2.2);
  const hold = Math.max(1, Math.round(p.hold));
  const expiry = Math.max(1, Math.round(ax.expiry && ax.expiry > 0 ? ax.expiry : hold));
  const minSl = Math.max(0, floor?.minSl ?? 0);
  const requestedMaxSl = floor?.maxSl && floor.maxSl > 0 ? Math.max(floor.maxSl, minSl) : Infinity;
  const maxSl = Math.min(requestedMaxSl, signal ? signalMax : Infinity);
  // the stop distance at price px: ATR-derived, held between the floor and (per range) the cap
  const slAt = (d: number, px: number) => Math.min(maxSl * px, Math.max(d, minSl * px));
  const minTrail = Math.max(0, floor?.minTrail ?? 0);
  const trailK = atrTrailGap(ax.trailPct ?? 0.8);
  const rungW = ax.ratio > 0 ? ax.ratio : 1;
  const fin = (x: number) => Number.isFinite(x);

  const initial = {
    rungs: [] as Array<{ px: number; sl0: number; tp0: number }>,
    nextRung: 0,
    placedI: -1,
    legs: [] as Array<{ px: number; w: number }>,
    side: 1 as Side,
    startI: 0,
    stop: 0,
    target: 0,
    slD: 0,
    tpD: 0,
    rangeSp: 0,
    trailed: false,
    trailGapD: 0,
    mfe: 0,
    mae: 0,
    nextAllowed: 0,
  };
  let {
    rungs,
    nextRung,
    placedI,
    legs,
    side,
    startI,
    stop,
    target,
    slD,
    tpD,
    rangeSp,
    trailed,
    trailGapD,
    mfe,
    mae,
    nextAllowed,
  } = cursor?.restore(initial) ?? initial;
  const checkpoint = () => ({
    rungs,
    nextRung,
    placedI,
    legs,
    side,
    startI,
    stop,
    target,
    slD,
    tpD,
    rangeSp,
    trailed,
    trailGapD,
    mfe,
    mae,
    nextAllowed,
  });
  // the hybrid trail's gap, fixed when it arms (0 = not armed)
  const wsum = () => legs.reduce((a, x) => a + x.w, 0);
  const avg = () => legs.length === 1 ? legs[0].px : wsum() / legs.reduce((q, x) => q + x.w / x.px, 0);
  const ret = (exit: number) => {
    let r = 0;
    for (const x of legs) r += x.w * ((side * (exit - x.px)) / x.px - cost);
    return r;
  };
  const tighten = (next: number) => {
    if (side === 1 ? next > stop : next < stop) {
      stop = next;
      return true;
    }
    return false;
  };
  const close = (i: number, exit: number, reason: Trade["reason"]) => {
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[startI],
      exitT: t[i] + tfMs,
      entry: avg(),
      exit,
      r: ret(exit),
      reason,
      bars: i - startI + 1,
      mfe,
      mae,
      kind: "axis",
      vol: wsum(),
      // legs added after the first (0 = the first rung only), as revert mode and DCA count
      level: legs.length - 1,
    });
    legs = [];
    // vst.ts cancelLane: the lane's unfilled rungs go with the position
    rungs = [];
    nextRung = 0;
    nextAllowed = i + 1 + cooldown;
  };
  // vst.ts handleAxis (+ the hybrid trailing) on the closed bar i
  const manage = (i: number) => {
    const at = atr[i];
    const a = avg();
    if (fin(at) && at > 0) {
      const sp = Math.max(rangeSp, at * Math.max(ax.spacing, 0.2) * 0.01);
      const sl0 = slAt(deskSlDist(at, sp, slAtr), a);
      const lv = deskLevels(a, side, sl0, sl0 * ratio, ratio);
      tighten(lv.sl);
      target = side === 1 ? Math.max(target, lv.tp) : Math.min(target, lv.tp);
    }
    tpD = Math.abs(target - a);
    slD = Math.abs(stop - a);
    // SL ≤ TP ÷ ratio, only for a stop still on the loss side (the desk's |sl − avg| cap would pull a stop that
    // trails in profit back behind the entry: never loosened here)
    if (side * (a - stop) > 0 && slD > tpD / ratio + 1e-12) {
      stop = a - (side * tpD) / ratio;
      slD = tpD / ratio;
    }
    // the trail arms at 0.95 × the stop distance and then holds its gap: the stop distance AT ARMING × atrTrailGap.
    // Derived from the stop distance after each trail step, the gap shrank with every step until the stop sat on
    // the close (every hybrid exit at about −cost)
    if (ax.hybrid && (trailGapD > 0 || side * (c[i] - a) >= slD * 0.95)) {
      if (!(trailGapD > 0)) trailGapD = slD * trailK;
      const gap = Math.min(Math.max(trailGapD, minTrail * c[i]), signal ? a * signalMax : Infinity);
      if (tighten(c[i] - side * gap)) trailed = true;
      slD = Math.abs(stop - a);
    }
  };

  for (let i = cursor?.start ?? 0; i < n; i++) {
    cursor?.checkpoint(i, n, checkpoint);
    // unfilled rungs rest on bars placedI + 1 … placedI + expiry
    if (nextRung < rungs.length && i > placedI + expiry) {
      rungs = [];
      nextRung = 0;
    }
    let filled = false;
    const reached = (s: number) => (side === 1 ? l[i] <= s : h[i] >= s);
    // the stop in force at this bar's open rested there (a bar that opens through it exits at the open); one set by
    // a first fill on this bar or tightened by a later fill was placed after that fill
    let rested = legs.length > 0;
    // the worst fill price of this bar (long: lowest): an exit on this bar is never better
    let fillX = side === 1 ? Infinity : -Infinity;
    while (nextRung < rungs.length) {
      const rg = rungs[nextRung];
      if (!reached(rg.px)) break;
      // conservative intrabar order (as revert, see the header): with a position open, a stop the bar reaches goes
      // before a rung at or beyond it — that rung and the deeper ones never fill (cancelled with the position)
      if (legs.length && reached(stop) && !axisFillsBeforeStop(side, rg.px, stop)) break;
      const px = side === 1 ? Math.min(o[i], rg.px) : Math.max(o[i], rg.px);
      fillX = side === 1 ? Math.min(fillX, px) : Math.max(fillX, px);
      nextRung++;
      filled = true;
      if (!legs.length) {
        legs = [{ px, w: 1 }];
        startI = i;
        mfe = 0;
        mae = 0;
        trailed = false;
        trailGapD = 0;
        const lv = deskLevels(px, side, rg.sl0, rg.tp0, ratio);
        stop = signal ? signalStopAt(px, side, lv.sl, signalMax) : lv.sl;
        target = lv.tp;
        // vst.ts applyFill: the controlling range spacing = the rung's distance from the axis (last closed bar)
        const m = center[i - 1];
        rangeSp = Math.abs(rg.px - (fin(m) ? m : rg.px));
      } else if (reached(stop)) {
        // the bar already reached the stop in force: it triggers on the way past this fill and is the exit (the
        // fill's levels are never placed)
        legs.push({ px, w: rungW });
      } else {
        const slUse = Math.max(rg.sl0, slD);
        const tpUse = Math.max(rg.tp0, tpD, slUse * ratio);
        legs.push({ px, w: rungW });
        const lv = deskLevels(avg(), side, slUse, tpUse, ratio);
        if (tighten(lv.sl)) rested = false;
        target = side === 1 ? Math.max(target, lv.tp) : Math.min(target, lv.tp);
      }
      const a = avg();
      if (signal) stop = signalStopAt(a, side, stop, signalMax);
      slD = Math.abs(stop - a);
      tpD = Math.abs(target - a);
    }
    if (legs.length) {
      const a = avg();
      const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
      const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
      if (up > mfe) mfe = up;
      if (dn > mae) mae = dn;
      // a stop resting since the open exits at the open when the bar gaps through it; one placed after a fill on
      // this bar exits at the stop — never better than a fill of this bar
      if (reached(stop)) {
        const sx = rested ? (side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop)) : stop;
        // a stop at or beyond the average entry (breakeven after the hold) is not a stop-out: "be"
        close(
          i,
          side === 1 ? Math.min(sx, fillX) : Math.max(sx, fillX),
          trailed ? "trail" : side * (stop - avg()) >= 0 ? "be" : "sl",
        );
      } else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target))
        close(i, side === 1 ? Math.max(o[i], target) : Math.min(o[i], target), "tp");
      else {
        const held = i - startI + 1;
        if (held >= 2 * hold) close(i, c[i], "time");
        else {
          manage(i);
          if (held >= hold) {
            if (side * (c[i] - a) <= 0) close(i, c[i], "time");
            else {
              tighten(a);
              slD = Math.abs(stop - a);
            }
          }
        }
      }
    }
    // a new ladder only on a free lane (no position, no resting rungs)
    const free = !legs.length && nextRung >= rungs.length;
    if (free && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
      const m = center[i];
      const at = atr[i];
      if (!fin(m) || !fin(at) || at <= 0 || !(m > 0)) continue;
      const sp = axisSpacing(range, ax.spacing, c[i], at);
      if (!(sp > 0)) continue;
      if (!admitSimulationEntry(admitEntry, cfg, bars, i, sig[i] > 0 ? 1 : -1)) continue;
      side = sig[i] > 0 ? 1 : -1;
      rungs = [];
      // rungs the price already stands at or beyond (long: at or above the close) would all fill at the next open
      // — the whole ladder at once instead of scaling in. They collapse into ONE entry at the close; only the
      // rungs still beyond the price rest as the ladder.
      let through = false;
      for (let k = 1; k <= nRungs; k++) {
        const px = m - side * k * sp;
        if (!(px > 0)) break;
        if (side * (c[i] - px) <= 0) {
          through = true;
          continue;
        }
        if (through && !rungs.length) {
          const sl1 = slAt(deskSlDist(at, sp, slAtr), c[i]);
          rungs.push({ px: c[i], sl0: sl1, tp0: sl1 * ratio });
        }
        const sl0 = slAt(deskSlDist(at, sp, slAtr), px);
        rungs.push({ px, sl0, tp0: sl0 * ratio });
      }
      if (through && !rungs.length) {
        const sl1 = slAt(deskSlDist(at, sp, slAtr), c[i]);
        rungs.push({ px: c[i], sl0: sl1, tp0: sl1 * ratio });
      }
      nextRung = 0;
      placedI = i;
    }
  }

  if (cursor) trades = cursor.finish(bars, trades, checkpoint);
  let open: OpenPosition | null = null;
  if (legs.length && n > 0) {
    const a = avg();
    const w = wsum();
    open = {
      cfg,
      sym,
      side,
      entryT: t[startI],
      entryI: startI,
      entry: a,
      stop,
      target,
      peak: a * (1 + side * mfe),
      trailOn: trailed,
      // per unit (the ladder's result ÷ its weight): paper marks mtm × volume, and its volume carries w
      mtm: ret(c[n - 1]) / w,
      w,
    };
  }
  const last = n > 0 ? sig[n - 1] : 0;
  const la = n > 0 ? atr[n - 1] : NaN;
  const lm = n > 0 ? center[n - 1] : NaN;
  const pendingOk =
    last !== 0 &&
    !legs.length &&
    nextRung >= rungs.length &&
    n >= nextAllowed &&
    fin(la) &&
    la > 0 &&
    fin(lm) &&
    lm > 0;
  if (!pendingOk) return { trades, pending: 0, open };
  const px = c[n - 1];
  const sl0 = slAt(deskSlDist(la, axisSpacing(range, ax.spacing, px, la), slAtr), px);
  const r6 = (x: number) => +x.toFixed(6);
  return {
    trades,
    pending: last > 0 ? 1 : -1,
    open,
    pendingProtect: { tp: r6((sl0 * ratio) / px), sl: r6(sl0 / px), trail: 0, hold },
  };
}
