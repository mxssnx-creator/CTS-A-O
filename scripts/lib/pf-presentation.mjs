import { PF_NEUTRAL, profitFactorRatio } from '../../src/core/metrics/profit-factor.mjs';

/** Standalone report heatmap; equal gains/losses, flat and unknown stay uncoloured. */
export function pfHeatStyle(gp, gl, n) {
  if (!(Number.isFinite(n) && n > 0) || gp === gl) return '';
  const pf = profitFactorRatio(gp, gl, 8);
  if (!Number.isFinite(pf) || pf === PF_NEUTRAL) return '';
  const distance = Math.min(1, Math.abs(Math.log2(Math.max(pf, 1e-3))) / 2);
  return ` style="background:color-mix(in srgb, var(${pf > PF_NEUTRAL ? '--pos' : '--neg'}) ${Math.round(10 + distance * 50)}%, transparent)"`;
}
