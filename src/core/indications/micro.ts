// Micro indications ("mc-…"): fast reversal entries for the Micro range (targets 0.2–0.4 %). A Micro target is one
// or two times the round-trip cost, so only entries with a high hit rate on a short pullback can clear it: each
// fires on the one bar its stretch shows (RSI(2) extreme, a close outside a wide Bollinger band that turns back, a
// rejected spike, a run of same-direction closes, a large distance from the rolling VWAP or mean) and points back
// against the stretch. Causal: bar i reads bars 0..i only. With grid.micro.ownInds (default on) the Micro range
// trades only these, and they trade only Micro cells.
import type { SeriesCache } from "./cache.ts";
import type { IndicationSpec } from "./registry.ts";

const fin = (...xs: number[]) => xs.every((x) => Number.isFinite(x));

/** one-bar event series: f returns +1 / −1 on the firing bar, 0 otherwise (NaN in warm-up = 0) */
function events(n: number, f: (i: number) => number): Int8Array {
  const out = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const v = f(i);
    out[i] = v > 0 ? 1 : v < 0 ? -1 : 0;
  }
  return out;
}

const spec = (id: string, label: string, params: Record<string, number>, fn: (k: SeriesCache) => Int8Array) =>
  ({ id, kind: "active", label, params, fn }) as IndicationSpec;

export const isMicroInd = (base: string) => base.startsWith("mc-");

export function microSpecs(): IndicationSpec[] {
  return [
    // RSI(2) at an extreme: the last two bars stretched one way
    ...([5, 10] as const).map((lo) =>
      spec(`mc-rsi2-${lo}`, `Micro RSI2 ${lo}/${100 - lo}`, { p: 2, lo }, (k) => {
        const r = k.rsi(2);
        return events(k.b.n, (i) => (fin(r[i]) ? (r[i] < lo ? 1 : r[i] > 100 - lo ? -1 : 0) : 0));
      }),
    ),
    // a close outside Bollinger(20, k) and the next bar turning back
    ...([2, 2.5] as const).map((m) =>
      spec(`mc-bbx-${m * 10}`, `Micro BB ${m} turn`, { p: 20, m }, (k) => {
        const { up, lo } = k.bb(20, m);
        const c = k.b.c;
        return events(k.b.n, (i) => {
          if (i < 1 || !fin(up[i - 1], lo[i - 1])) return 0;
          if (c[i - 1] < lo[i - 1] && c[i] > c[i - 1]) return 1;
          if (c[i - 1] > up[i - 1] && c[i] < c[i - 1]) return -1;
          return 0;
        });
      }),
    ),
    // a spike bar (range ≥ x × the prior 20-bar average) rejected: it closes in its opposite third
    ...([2, 2.5] as const).map((x) =>
      spec(`mc-spike-${x}`, `Micro spike ${x}× fade`, { p: 20, x }, (k) => {
        const rs = k.rangeSma(20);
        const { o, h, l, c } = k.b;
        return events(k.b.n, (i) => {
          if (i < 1 || !fin(rs[i - 1])) return 0;
          const r = h[i] - l[i];
          if (!(r >= x * rs[i - 1]) || !(r > 0)) return 0;
          const pos = (c[i] - l[i]) / r;
          if (c[i] < o[i] && pos > 0.6) return 1;
          if (c[i] > o[i] && pos < 0.4) return -1;
          return 0;
        });
      }),
    ),
    // n closes in a row the same way: fade the run on its n-th bar
    ...([4, 6] as const).map((n) =>
      spec(`mc-streak-${n}`, `Micro streak ${n} fade`, { n }, (k) => {
        const c = k.b.c;
        return events(k.b.n, (i) => {
          if (i < n) return 0;
          let up = 0;
          let dn = 0;
          for (let j = i - n + 1; j <= i; j++) {
            if (c[j] > c[j - 1]) up++;
            else if (c[j] < c[j - 1]) dn++;
          }
          return dn === n ? 1 : up === n ? -1 : 0;
        });
      }),
    ),
    // distance from the rolling 60-bar VWAP in ATR(14) units
    ...([2, 3] as const).map((d) =>
      spec(`mc-vwapd-${d}`, `Micro VWAP ${d} ATR`, { p: 60, d }, (k) => {
        const vw = k.vwap(60);
        const a = k.atr(14);
        const c = k.b.c;
        return events(k.b.n, (i) => {
          if (!fin(vw[i], a[i]) || !(a[i] > 0)) return 0;
          const z = (c[i] - vw[i]) / a[i];
          return z < -d ? 1 : z > d ? -1 : 0;
        });
      }),
    ),
    // z-score of the close over 30 bars
    ...([2, 2.5] as const).map((z) =>
      spec(`mc-z-${z * 10}`, `Micro z ${z}`, { p: 30, z }, (k) => {
        const zs = k.z(30);
        return events(k.b.n, (i) => (fin(zs[i]) ? (zs[i] < -z ? 1 : zs[i] > z ? -1 : 0) : 0));
      }),
    ),
  ];
}
