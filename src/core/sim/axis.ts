// Axis simulation (honest, bar by bar): a mean-reversion ladder around an axis price.
//
// The axis is a moving centre (EMA `center`). A combo signal is taken only when it points back to the axis
// (price below the axis → long, above → short) and the displacement from the axis is between minDisp and
// maxDisp ATR. The base leg opens at the next bar's open; `levels − 1` extra rungs rest at spacing × ATR
// steps further away, each `ratio` × a normal position. Target = the axis price at signal time (fixed), stop =
// beyond the last rung by the protect's SL distance, max hold = the protect's hold.
// Pessimistic ordering inside a bar: rung fills first, then the stop; no target on a bar in which a rung filled.
//
// Managed exits (default, the old desk's Axis handling): step = max(rung spacing, 0.7 ATR, 0.2 % of the average
// entry); target = past the axis by ¼ step and at least 0.85 step from the average entry; stop distance =
// min(step, target distance). Every rung fill re-derives both from the new average. On each closed bar the target
// tightens toward the moving axis (never widens) and the stop moves to breakeven once the move reached 0.85 risk.
// Range types set the rung spacing: atr (spacing × ATR), linear (price × spacing % × 1.8 + ¼ ATR), geo
// (price × spacing / 80), fib (0.809 ATR).
import type { AxisConfig, AxisRange, Bars, Protect, Side, Trade } from "../domain/types.ts";

/** Rung spacing (price units) of a range type at price `px` with ATR `a`. */
export function axisSpacing(range: AxisRange, spacing: number, px: number, a: number): number {
  switch (range) {
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

export interface AxisResult {
  trades: Trade[];
  pending: Side | 0;
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
): AxisResult {
  const { n, t, o, h, l, c, sym } = bars;
  const tfMs = bars.tfMin * 60_000;
  const trades: Trade[] = [];
  const levels = Math.max(1, Math.round(ax.levels));
  let state: "flat" | "pos" = "flat";
  let side: Side = 1;
  let legs: Array<{ px: number; w: number }> = [];
  let rungs: number[] = [];
  let nextRung = 0;
  let startI = 0;
  let stop = 0;
  let target = 0;
  let mfe = 0;
  let mae = 0;
  const managed = ax.exits !== "fixed";
  const range: AxisRange = ax.range ?? "atr";
  let sp = 0; // rung spacing of the open ladder (price units)
  let risk = 0;
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
    const slDist = Math.min(step, Math.abs(target - a));
    stop = a - side * slDist;
    risk = Math.max(slDist, sp, 0.45 * at);
  };

  const wsum = () => legs.reduce((a, x) => a + x.w, 0);
  const avg = () => legs.reduce((a, x) => a + x.px * x.w, 0) / wsum();
  let nextAllowed = 0;
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

  let pendingOpen = -1;
  for (let i = 0; i < n; i++) {
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
      while (nextRung < rungs.length) {
        const px = rungs[nextRung];
        const hit = side === 1 ? l[i] <= px : h[i] >= px;
        if (!hit) break;
        legs.push({ px: side === 1 ? Math.min(o[i], px) : Math.max(o[i], px), w: ax.ratio });
        nextRung++;
        filled = true;
      }
      // (from the last closed bar's axis / ATR: the bar in progress is never used)
      if (managed && filled) derive(i - 1);
      const a = avg();
      const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
      const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
      if (up > mfe) mfe = up;
      if (dn > mae) mae = dn;
      const gap = i > startI;
      if (side === 1 ? l[i] <= stop : h[i] >= stop)
        close(i, gap ? (side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop)) : stop, "sl");
      else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target))
        close(
          i,
          gap ? (side === 1 ? Math.max(o[i], target) : Math.min(o[i], target)) : target,
          "tp",
        );
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
      // only back toward the axis, from a meaningful but not extreme displacement, with the axis ahead after costs
      if (!admissible(i, s, ref)) continue;
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
      pendingOpen = i + 1;
    }
  }
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
  return { trades, pending: pendingOk ? ls : 0 };
}
