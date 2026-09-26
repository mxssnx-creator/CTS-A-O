// Axis simulation (honest, bar by bar): a mean-reversion ladder around an axis price.
//
// The axis is a moving centre (EMA `center`). A combo signal is taken only when it points back to the axis
// (price below the axis → long, above → short) and the displacement from the axis is between minDisp and
// maxDisp ATR. The base leg opens at the next bar's open; `levels − 1` extra rungs rest at spacing × ATR
// steps further away, each `ratio` × a normal position. Target = the axis price at signal time (fixed), stop =
// beyond the last rung by the protect's SL distance, max hold = the protect's hold.
// Pessimistic ordering inside a bar: rung fills first, then the stop; no target on a bar in which a rung filled.
import type { AxisConfig, Bars, Protect, Side, Trade } from "../domain/types.ts";

export interface AxisResult {
  trades: Trade[];
  pending: Side | 0;
}

export function simulateAxis(cfg: string, bars: Bars, sig: Int8Array, p: Protect, ax: AxisConfig, center: Float64Array, atr: Float64Array, cost: number): AxisResult {
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

  const wsum = () => legs.reduce((a, x) => a + x.w, 0);
  const avg = () => legs.reduce((a, x) => a + x.px * x.w, 0) / wsum();
  const close = (i: number, exit: number, reason: Trade["reason"]) => {
    let r = 0;
    for (const x of legs) r += x.w * ((side * (exit - x.px)) / x.px - cost);
    trades.push({ cfg, sym, side, entryT: t[startI], exitT: t[i] + tfMs, entry: avg(), exit, r, reason, bars: i - startI + 1, mfe, mae, kind: "axis", vol: wsum(), level: legs.length - 1 });
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
      const a = avg();
      const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
      const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
      if (up > mfe) mfe = up;
      if (dn > mae) mae = dn;
      const gap = i > startI;
      if (side === 1 ? l[i] <= stop : h[i] >= stop) close(i, gap ? (side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop)) : stop, "sl");
      else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target)) close(i, gap ? (side === 1 ? Math.max(o[i], target) : Math.min(o[i], target)) : target, "tp");
      else if (i - startI + 1 >= p.hold) close(i, c[i], "time");
    }
    if (state === "flat" && pendingOpen < 0 && i + 1 < n && sig[i] !== 0) {
      const m = center[i];
      const a = atr[i];
      if (!Number.isFinite(m) || !Number.isFinite(a) || a <= 0) continue;
      const s: Side = sig[i] > 0 ? 1 : -1;
      const disp = (c[i] - m) / a;
      // only back toward the axis, and only from a meaningful but not extreme displacement
      if ((s === 1 ? disp >= 0 : disp <= 0) || Math.abs(disp) < ax.minDisp || Math.abs(disp) > ax.maxDisp) continue;
      const ref = o[i + 1];
      // the axis must still be ahead after costs
      if ((s * (m - ref)) / ref <= 2 * cost) continue;
      side = s;
      target = m;
      const step = ax.spacing * a;
      rungs = [];
      for (let k = 1; k < levels; k++) rungs.push(side === 1 ? ref - step * k : ref + step * k);
      nextRung = 0;
      const deepest = side === 1 ? ref - step * (levels - 1) : ref + step * (levels - 1);
      stop = side === 1 ? deepest * (1 - p.sl) : deepest * (1 + p.sl);
      pendingOpen = i + 1;
    }
  }
  const last = n > 0 ? sig[n - 1] : 0;
  return { trades, pending: state === "flat" && pendingOpen < 0 && last !== 0 ? (last > 0 ? 1 : -1) : 0 };
}
