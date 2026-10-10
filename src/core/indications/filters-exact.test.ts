// The entry filters are exact re-expressions of their reference code: the rolling percentile counts a Fenwick tree over
// ranks, and every filter reads its series once instead of per bar. The references below are the original scan and
// the original per-bar lookups, run on the same bars and signals; the outputs must be equal bar for bar.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { FILTER_IDS, VOL_RANK_BARS, applyFilter, pctRank } from "./filters.ts";
import { choppiness } from "./research3.ts";
import { comboSignal } from "../bots/bots.ts";

const END = Date.UTC(2026, 8, 20);
const HOUR = 3_600_000;

/** the original scan: the share of the previous p finite values that are below x[i] (when more than p / 2 are finite) */
function scanRank(x: Float64Array, p: number): Float64Array {
  const out = new Float64Array(x.length).fill(Number.NaN);
  for (let i = p; i < x.length; i++) {
    const v = x[i];
    if (!Number.isFinite(v)) continue;
    let below = 0;
    let cnt = 0;
    for (let j = i - p; j < i; j++) {
      const w = x[j];
      if (!Number.isFinite(w)) continue;
      cnt++;
      if (w < v) below++;
    }
    if (cnt > p / 2) out[i] = below / cnt;
  }
  return out;
}

const keep = (sig: Int8Array, pass: (i: number, side: number) => boolean): Int8Array => {
  const out = new Int8Array(sig.length);
  for (let i = 0; i < sig.length; i++) if (sig[i] !== 0 && pass(i, sig[i])) out[i] = sig[i];
  return out;
};

const natrRef = (k: SeriesCache): Float64Array => {
  const a = k.atr(14);
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] / k.b.c[i];
  return out;
};

const refTrendRef = (k: SeriesCache, ref: SeriesCache, p: number): Int8Array => {
  const e = ref.ema(p);
  const out = new Int8Array(k.b.n);
  let j = 0;
  for (let i = 0; i < k.b.n; i++) {
    const t = k.b.t[i];
    while (j + 1 < ref.b.n && ref.b.t[j + 1] <= t) j++;
    if (ref.b.t[j] > t || !Number.isFinite(e[j])) continue;
    out[i] = ref.b.c[j] > e[j] ? 1 : ref.b.c[j] < e[j] ? -1 : 0;
  }
  return out;
};

/** The original filter closures: every series read per bar. */
const REFERENCE: Record<string, (s: Int8Array, k: SeriesCache, ref?: SeriesCache | null) => Int8Array> = {
  none: (s) => s,
  adx20: (s, k) => keep(s, (i) => k.dmi(14).adx[i] >= 20),
  adx25: (s, k) => keep(s, (i) => k.dmi(14).adx[i] >= 25),
  adxLo20: (s, k) => keep(s, (i) => k.dmi(14).adx[i] < 20),
  htf: (s, k) => keep(s, (i, d) => (k.b.c[i] - k.ema(200)[i]) * d > 0),
  htfAgainst: (s, k) => keep(s, (i, d) => (k.b.c[i] - k.ema(200)[i]) * d < 0),
  slope50: (s, k) => keep(s, (i, d) => i >= 10 && (k.ema(50)[i] - k.ema(50)[i - 10]) * d > 0),
  volHi: (s, k) => keep(s, (i) => scanRank(natrRef(k), VOL_RANK_BARS)[i] >= 0.5),
  volLo: (s, k) => keep(s, (i) => scanRank(natrRef(k), VOL_RANK_BARS)[i] < 0.5),
  chop: (s, k) => {
    const ch = choppiness(k.b.h, k.b.l, k.b.c, 14);
    return keep(s, (i) => ch[i] < 61.8);
  },
  volume: (s, k) => keep(s, (i) => k.b.v[i] > 1.5 * k.volSma(20)[i]),
  quiet: (s, k) => keep(s, (i) => k.b.v[i] < k.volSma(20)[i]),
  euUs: (s, k) =>
    keep(s, (i) => {
      const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
      return h >= 7 && h < 21;
    }),
  asia: (s, k) =>
    keep(s, (i) => {
      const h = Math.floor((k.b.t[i] % 86_400_000) / HOUR);
      return h < 7 || h >= 21;
    }),
  stretch2: (s, k) => keep(s, (i) => Math.abs(k.b.c[i] - k.ema(50)[i]) < 2 * k.atr(14)[i]),
  rsiRoom: (s, k) => keep(s, (i, d) => (d > 0 ? k.rsi(14)[i] < 65 : k.rsi(14)[i] > 35)),
  btc: (s, k, ref) => (ref ? keep(s, (i, d) => refTrendRef(k, ref, 50)[i] === d) : s),
  btcAgainst: (s, k, ref) => (ref ? keep(s, (i, d) => refTrendRef(k, ref, 50)[i] === -d) : s),
};

/** a seeded generator, so the signals and the series are the same on every run */
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

describe("pctRank: the Fenwick count equals the scan", () => {
  it("random series with gaps, ties and signed zeros, for several window lengths", () => {
    const r = rng(7);
    const k = new SeriesCache(barsFromCandles("AAA", 60, syntheticCandles("AAA", 60, 40, END)));
    for (const p of [1, 2, 3, 5, 17, 64, VOL_RANK_BARS]) {
      for (let trial = 0; trial < 3; trial++) {
        const n = 900 + trial * 150;
        const x = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const u = r();
          if (u < 0.05) x[i] = Number.NaN;
          else if (u < 0.1) x[i] = -0;
          else if (u < 0.15) x[i] = 0;
          else x[i] = Math.round((r() - 0.5) * 40) / 4; // quantised: many ties
        }
        const got = pctRank(new SeriesCache(k.b), `t${p}-${trial}`, x, p);
        assert.deepEqual(got, scanRank(x, p), `p ${p}, trial ${trial}`);
      }
    }
  });

  it("an all-gap series and a series shorter than the window have no output", () => {
    const k = new SeriesCache(barsFromCandles("AAA", 60, syntheticCandles("AAA", 60, 40, END)));
    assert.deepEqual(pctRank(k, "gap", new Float64Array(50).fill(Number.NaN), 10), scanRank(new Float64Array(50).fill(Number.NaN), 10));
    const short = new Float64Array([1, 2, 3]);
    assert.deepEqual(pctRank(new SeriesCache(k.b), "short", short, 10), scanRank(short, 10));
  });
});

describe("filters: every filter gives the reference output bar for bar", () => {
  const A = barsFromCandles("AAA", 60, syntheticCandles("AAA", 60, 3000, END));
  const B = barsFromCandles("BBB", 60, syntheticCandles("BBB", 60, 3000, END - 7 * HOUR));
  const kA = new SeriesCache(A);
  const kB = new SeriesCache(B);
  const combo = comboSignal("follow", "rsi-mom-14-25", kA)!;
  const r = rng(11);
  const random = new Int8Array(A.n);
  for (let i = 0; i < random.length; i++) random[i] = r() < 0.12 ? (r() < 0.5 ? 1 : -1) : 0;

  for (const id of FILTER_IDS) {
    it(`${id}`, () => {
      assert.ok(REFERENCE[id], `${id} has a reference`);
      for (const sig of [combo, random]) {
        assert.deepEqual(applyFilter(id, sig, kA, kB), REFERENCE[id](sig, kA, kB), `${id}`);
        assert.deepEqual(applyFilter(id, sig, kA, null), REFERENCE[id](sig, kA, null), `${id} without a reference`);
      }
    });
  }
});
