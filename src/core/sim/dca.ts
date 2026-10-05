// DCA simulation (honest, bar by bar).
//
// Normal DCA: base leg at the next open (reference price P). Extra legs fill at P·(1 ∓ step·k), k = 1..levels.
//   Target is re-anchored to the average entry after each fill; the stop stays anchored to P (beyond the
//   deepest level).
// DCA Active: the base leg is skipped. A limit at the first level P·(1 ∓ step) waits up to `hold` bars;
//   only that higher-level (better-priced) leg is traded. Decided at signal time, so no look-ahead.
// Pessimistic ordering inside a bar: level fills first, then the stop; a target cannot be hit on a bar in
// which a leg filled (the fill might have come after the high).
import type { Bars, DcaConfig, OpenPosition, Protect, Side, Trade } from "../domain/types.ts";

/** A DCA position never stacks more than 5 stages: the base leg and at most 4 deeper levels (5 units of volume). */
export const DCA_MAX_STAGES = 5;
export const DCA_MAX_LEVELS = DCA_MAX_STAGES - 1;

export interface DcaResult {
  trades: Trade[];
  pending: Side | 0;
  /** the ladder still open at the last bar (marked to market like every other family's open position) */
  open?: OpenPosition;
}

export function simulateDca(
  cfg: string,
  bars: Bars,
  sig: Int8Array,
  p: Protect,
  dca: DcaConfig,
  active: boolean,
  cost: number,
  cooldown = 0,
): DcaResult {
  const { n, t, o, h, l, c, sym } = bars;
  const tfMs = bars.tfMin * 60_000;
  const trades: Trade[] = [];
  const kind = active ? "dca-active" : "dca";
  const levels = Math.min(DCA_MAX_LEVELS, Math.max(1, Math.floor(dca.levels)));
  // level spacing: absolute, or a multiple of the target
  const step = dca.stepOfTp && dca.stepOfTp > 0 ? p.tp * dca.stepOfTp : dca.step;
  // stop must sit beyond the deepest level (stopGap steps past it)
  const slDist = Math.max(p.sl, step * ((active ? 1 : levels) + Math.max(0, dca.stopGap ?? 0.5)));

  let state: "flat" | "wait" | "pos" = "flat";
  let side: Side = 1;
  let ref = 0;
  let waitUntil = 0;
  let legs: number[] = [];
  let nextLevel = 0; // index of next level to fill (1-based)
  let startI = 0;
  let stop = 0;
  let target = 0;
  let mfe = 0;
  let mae = 0;
  let filledThisBar = false;

  const lvlPx = (k: number) => (side === 1 ? ref * (1 - step * k) : ref * (1 + step * k));
  const avg = () => legs.reduce((a, b) => a + b, 0) / legs.length;
  const retarget = () => {
    const a = avg();
    target = side === 1 ? a * (1 + p.tp) : a * (1 - p.tp);
  };
  let nextAllowed = 0;
  const close = (i: number, exit: number, reason: Trade["reason"]) => {
    nextAllowed = i + 1 + cooldown;
    let r = 0;
    for (const px of legs) r += (side * (exit - px)) / px - cost;
    const a = avg();
    trades.push({
      cfg,
      sym,
      side,
      entryT: t[startI],
      exitT: t[i] + tfMs,
      entry: a,
      exit,
      r,
      reason,
      bars: i - startI + 1,
      mfe,
      mae,
      kind,
      vol: legs.length,
      level: active ? 1 : legs.length - 1,
    });
    state = "flat";
    legs = [];
  };

  for (let i = 0; i < n; i++) {
    filledThisBar = false;
    if (state === "wait") {
      const px = lvlPx(1);
      const hit = side === 1 ? l[i] <= px : h[i] >= px;
      if (hit) {
        const fill = side === 1 ? Math.min(o[i], px) : Math.max(o[i], px);
        legs = [fill];
        startI = i;
        state = "pos";
        stop = side === 1 ? ref * (1 - slDist) : ref * (1 + slDist);
        retarget();
        mfe = 0;
        mae = 0;
        filledThisBar = true;
        nextLevel = levels + 1; // active trades a single higher-level leg
      } else if (i >= waitUntil) {
        state = "flat";
      }
    }
    if (state === "pos") {
      // extra DCA legs
      while (nextLevel <= levels) {
        const px = lvlPx(nextLevel);
        const hit = side === 1 ? l[i] <= px : h[i] >= px;
        if (!hit) break;
        legs.push(side === 1 ? Math.min(o[i], px) : Math.max(o[i], px));
        nextLevel++;
        filledThisBar = true;
        retarget();
      }
      const a = avg();
      const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
      const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
      if (up > mfe) mfe = up;
      if (dn > mae) mae = dn;
      const gap = i > startI;
      if (side === 1 ? l[i] <= stop : h[i] >= stop) {
        // on the fill bar the stop exits no better than the fills: a limit filled at an open that gapped through the
        // stop (Active: the stop is anchored to the signal's reference, not the fill) booked the gap as a profit
        const sx = gap
          ? side === 1
            ? Math.min(o[i], stop)
            : Math.max(o[i], stop)
          : side === 1
            ? Math.min(stop, ...legs)
            : Math.max(stop, ...legs);
        close(i, sx, "sl");
      } else if (!filledThisBar && (side === 1 ? h[i] >= target : l[i] <= target)) {
        close(
          i,
          gap ? (side === 1 ? Math.max(o[i], target) : Math.min(o[i], target)) : target,
          "tp",
        );
      } else if (i - startI + 1 >= p.hold) {
        close(i, c[i], "time");
      }
    }
    if (state === "flat" && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
      side = sig[i] > 0 ? 1 : -1;
      ref = o[i + 1];
      if (active) {
        state = "wait";
        waitUntil = i + p.hold;
      } else {
        state = "pos";
        legs = [ref];
        startI = i + 1;
        nextLevel = 1;
        stop = side === 1 ? ref * (1 - slDist) : ref * (1 + slDist);
        retarget();
        mfe = 0;
        mae = 0;
        // the base leg opens at bar i+1; process it next iteration
      }
    }
  }
  const last = n > 0 ? sig[n - 1] : 0;
  // a ladder open at the last bar is carried like the Normal / Axis families': the walk-forward marks open losers to
  // market (openAtEnd), and the paper book mirrors it — without it DCA alone was judged on its closes
  let open: OpenPosition | undefined;
  if (state === "pos" && legs.length && n > 0) {
    const px = c[n - 1];
    const a0 = avg();
    let mtm = 0;
    for (const leg of legs) mtm += (side * (px - leg)) / leg - cost;
    open = {
      cfg,
      sym,
      side,
      entryT: t[startI],
      entryI: startI,
      entry: a0,
      stop,
      target,
      peak: a0,
      trailOn: false,
      mtm: mtm / legs.length,
      w: legs.length,
    };
  }
  return {
    trades,
    pending: state === "flat" && last !== 0 && n >= nextAllowed ? (last > 0 ? 1 : -1) : 0,
    ...(open ? { open } : {}),
  };
}
