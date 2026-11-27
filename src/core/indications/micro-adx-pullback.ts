import type { IndicationSpec } from "./registry.ts";

/** A one-minute pullback reclaim in the direction confirmed by Wilder's directional movement. */
export const microAdxPullback: IndicationSpec = {
  id: "micro-1-adx-pullback-selective",
  kind: "micro",
  label: "Micro · ADX pullback · selective · 1m",
  params: { anchor: 1, adxPeriod: 14, minAdx: 22, fast: 9, slow: 26 },
  fn(cache) {
    const { c: close, n, tfMin } = cache.b;
    const state = new Int8Array(n);
    if (tfMin !== 1) return state;

    const { adx, pdi, mdi } = cache.dmi(14);
    const fast = cache.ema(9);
    const slow = cache.ema(26);
    for (let i = 1; i < n; i++) {
      if (!(adx[i] >= 22)) continue;
      if (pdi[i] > mdi[i] && fast[i] > slow[i] && close[i - 1] <= fast[i - 1] && close[i] > fast[i]) {
        state[i] = 1;
      } else if (mdi[i] > pdi[i] && fast[i] < slow[i] && close[i - 1] >= fast[i - 1] && close[i] < fast[i]) {
        state[i] = -1;
      }
    }
    return state;
  },
};
