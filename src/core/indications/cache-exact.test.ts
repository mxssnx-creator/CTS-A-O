// htfBars writes its completed higher bars into typed arrays of the base length (was: growing JS arrays copied at the end).
// The reference below is the original function; the higher bars and the base-to-higher map must be equal, bar for bar,
// on regular and gappy series, for several factors.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { htfBars } from "./cache.ts";
import type { Bars } from "../domain/types.ts";

function htfBarsReference(b: Bars, factor: number): { hb: Bars; map: Int32Array } {
  const tfMs = b.tfMin * 60_000;
  const span = tfMs * factor;
  const T: number[] = [],
    O: number[] = [],
    Hh: number[] = [],
    L: number[] = [],
    C: number[] = [],
    V: number[] = [];
  const map = new Int32Array(b.n).fill(-1);
  let cur = -1;
  let bo = 0,
    bh = 0,
    bl = 0,
    bc = 0,
    bv = 0,
    bt = 0;
  for (let i = 0; i < b.n; i++) {
    const bucket = Math.floor(b.t[i] / span);
    if (bucket !== cur) {
      cur = bucket;
      bt = bucket * span;
      bo = b.o[i];
      bh = b.h[i];
      bl = b.l[i];
      bc = b.c[i];
      bv = b.v[i];
    } else {
      if (b.h[i] > bh) bh = b.h[i];
      if (b.l[i] < bl) bl = b.l[i];
      bc = b.c[i];
      bv += b.v[i];
    }
    if (b.t[i] + tfMs >= bt + span) {
      T.push(bt);
      O.push(bo);
      Hh.push(bh);
      L.push(bl);
      C.push(bc);
      V.push(bv);
    }
    map[i] = T.length - 1;
  }
  const hb: Bars = {
    sym: b.sym,
    tfMin: b.tfMin * factor,
    n: T.length,
    t: Float64Array.from(T),
    o: Float64Array.from(O),
    h: Float64Array.from(Hh),
    l: Float64Array.from(L),
    c: Float64Array.from(C),
    v: Float64Array.from(V),
  };
  return { hb, map };
}

/** the base bars with some bars removed (gaps) and some timestamps shifted, so buckets are irregular */
function gappy(b: Bars, every: number): Bars {
  const keep: number[] = [];
  for (let i = 0; i < b.n; i++) if (i % every !== 0 || i < 3) keep.push(i);
  const pick = (a: Float64Array) => Float64Array.from(keep, (i) => a[i]);
  return { ...b, n: keep.length, t: pick(b.t), o: pick(b.o), h: pick(b.h), l: pick(b.l), c: pick(b.c), v: pick(b.v) };
}

describe("htfBars: typed output equals the reference", () => {
  const base = barsFromCandles("AAA", 15, syntheticCandles("AAA", 15, 2400, Date.UTC(2026, 8, 20)));
  const series: Array<[string, Bars]> = [
    ["regular", base],
    ["gaps every 7", gappy(base, 7)],
    ["gaps every 3", gappy(base, 3)],
    ["one bar", { ...base, n: 1, t: base.t.slice(0, 1), o: base.o.slice(0, 1), h: base.h.slice(0, 1), l: base.l.slice(0, 1), c: base.c.slice(0, 1), v: base.v.slice(0, 1) }],
    ["empty", { ...base, n: 0, t: new Float64Array(0), o: new Float64Array(0), h: new Float64Array(0), l: new Float64Array(0), c: new Float64Array(0), v: new Float64Array(0) }],
  ];
  for (const [name, b] of series)
    for (const factor of [1, 2, 4, 16]) {
      it(`${name}, factor ${factor}`, () => {
        const got = htfBars(b, factor);
        const want = htfBarsReference(b, factor);
        assert.equal(got.hb.n, want.hb.n);
        assert.equal(got.hb.tfMin, want.hb.tfMin);
        assert.equal(got.hb.sym, want.hb.sym);
        for (const k of ["t", "o", "h", "l", "c", "v"] as const) {
          assert.equal(got.hb[k].length, want.hb[k].length, k);
          assert.deepEqual(got.hb[k], want.hb[k], k);
        }
        assert.deepEqual(got.map, want.map, "map");
      });
    }
});
