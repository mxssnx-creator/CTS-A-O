// CandleSeries (memory, 14 Oct): the runtime's base candles as columns. Every answer equals the Candle[] code it
// replaces, byte for byte; a published series never changes, whatever is appended to its buffer afterwards.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle } from "../domain/types.ts";
import { barsFromCandles, resample } from "./bars.ts";
import { CandleSeries, barsOfSeries, candleHeadroom, headroomFor, resampleTailBars, seriesMap } from "./candle-series.ts";
import { rng } from "../test-support.ts";

// ── the Candle[] code the columns replace, verbatim (runtime.server.ts before 14 Oct) ──
function refResampleTail(cs: readonly Candle[], srcMin: number, tf: number, n: number): Candle[] {
  if (!cs.length) return [];
  const tfMs = tf * 60_000;
  const from = Math.floor(cs[cs.length - 1].t / tfMs) * tfMs - (n + 1) * tfMs;
  let lo = 0;
  let hi = cs.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (cs[m].t < from) lo = m + 1;
    else hi = m;
  }
  return resample(lo > 0 ? cs.slice(lo) : cs, srcMin, tf);
}
/** one lane of laneSeriesFrom on Candle[] */
function refLane(sym: string, cs: readonly Candle[], baseTf: number, tf: number, n: number): Bars {
  const c = tf === baseTf ? cs : refResampleTail(cs, baseTf, tf, n);
  return barsFromCandles(sym, tf, c.length > n ? c.slice(c.length - n) : c);
}
function refPrice(cs: readonly Candle[], t: number): number | null {
  if (!cs?.length) return null;
  let lo = 0;
  let hi = cs.length - 1;
  if (cs[0].t > t) return null;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (cs[m].t <= t) lo = m;
    else hi = m - 1;
  }
  return cs[lo].c;
}

const COLS = ["t", "o", "h", "l", "c", "v"] as const;
const bytes = (a: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength);
function assertBarsEqual(got: Bars, want: Bars, msg: string) {
  assert.equal(got.sym, want.sym, msg);
  assert.equal(got.tfMin, want.tfMin, msg);
  assert.equal(got.n, want.n, `${msg}: n`);
  for (const k of COLS) {
    assert.ok(got[k] instanceof Float64Array, `${msg}: ${k} is an owned Float64Array`);
    assert.equal(Buffer.compare(bytes(got[k]), bytes(want[k])), 0, `${msg}: column ${k} byte-equal`);
  }
}

/** a 1 m series with gaps, a duplicate open time, a -0 volume and a start off every bucket boundary */
function series(r: () => number, n: number, t0 = 1_790_000_000_000 + 7 * 60_000): Candle[] {
  const out: Candle[] = [];
  let t = t0;
  let px = 10 + r() * 90;
  for (let i = 0; i < n; i++) {
    if (r() < 0.01) t += Math.floor(1 + r() * 40) * 60_000; // a gap
    const o = px;
    const c = o * (1 + (r() - 0.5) / 50);
    out.push({ t, o, h: Math.max(o, c) * (1 + r() / 200), l: Math.min(o, c) * (1 - r() / 200), c, v: i === 3 ? -0 : r() * 1000 });
    px = c;
    if (!(r() < 0.002)) t += 60_000; // (rarely: the next bar repeats this open time)
  }
  return out;
}

describe("CandleSeries", () => {
  it("append keeps the last `keep` of [...old, ...new]; a series published earlier never changes", () => {
    const r = rng(3);
    for (let run = 0; run < 40; run++) {
      const keep = 20 + Math.floor(r() * 200);
      let ref: Candle[] = series(r, Math.floor(r() * 300));
      let s = CandleSeries.fromCandles(ref, keep, Math.floor(r() * 30));
      ref = ref.slice(Math.max(0, ref.length - keep));
      const seen: Array<[CandleSeries, Candle[]]> = [[s, ref]];
      let t = (ref.at(-1)?.t ?? 1_790_000_000_000) + 60_000;
      for (let step = 0; step < 120; step++) {
        const m = r() < 0.05 ? Math.floor(r() * 400) : Math.floor(r() * 6);
        const add: Candle[] = Array.from({ length: m }, () => {
          const c = { t, o: r(), h: r() + 1, l: r() - 1, c: r(), v: r() };
          t += 60_000;
          return c;
        });
        // sometimes from an older series (a fork: its buffer's high-water mark has moved past it)
        const [base, baseRef] = r() < 0.15 ? seen[Math.floor(r() * seen.length)] : [s, ref];
        const next = base.append(add, keep, Math.floor(r() * 50));
        const nextRef = [...baseRef, ...add];
        const kept = nextRef.slice(Math.max(0, nextRef.length - keep));
        assert.deepEqual(next.toCandles(), kept, `run ${run} step ${step}`);
        assert.equal(next.n, kept.length);
        assert.equal(next.lastT(), kept.at(-1)?.t);
        assert.equal(next.firstT(), kept[0]?.t);
        seen.push([next, kept]);
        s = next;
        ref = kept;
      }
      for (const [x, want] of seen) assert.deepEqual(x.toCandles(), want, `run ${run}: a published series is unchanged`);
    }
  });

  it("an append that fits shares the buffer; a fork, an append past the capacity and one onto EMPTY copy", () => {
    const r = rng(5);
    const base = series(r, 50);
    const a = CandleSeries.fromCandles(base, 50, 64);
    const b = a.append(series(r, 1, base.at(-1)!.t + 60_000), 50, 64);
    assert.ok(CandleSeries.sharesBuffer(a, b), "in place");
    assert.equal(a.n, 50);
    assert.equal(a.lastT(), base.at(-1)!.t, "the earlier series still ends where it ended");
    const fork = a.append(series(r, 1, base.at(-1)!.t + 60_000), 50, 64);
    assert.ok(!CandleSeries.sharesBuffer(a, fork), "a fork (a no longer ends at the high-water mark) copies");
    assert.deepEqual(b.toCandles().slice(0, 49), fork.toCandles().slice(0, 49));
    const full = CandleSeries.fromCandles(base, 50, 0).append(series(r, 1), 50, 0);
    assert.ok(full.n === 50);
    assert.ok(!CandleSeries.sharesBuffer(CandleSeries.fromCandles(base, 50, 0), full));
    const e = CandleSeries.EMPTY.append(series(r, 3), 10, 5);
    assert.equal(e.n, 3);
    assert.ok(!CandleSeries.sharesBuffer(CandleSeries.EMPTY, e));
    assert.equal(CandleSeries.EMPTY.n, 0, "EMPTY stays empty");
  });

  it("lanes from columns are byte-equal to the Candle[] lanes (base, 5m, 15m, 30m; every n)", () => {
    const r = rng(11);
    let checks = 0;
    for (let k = 0; k < 24; k++) {
      const n = [0, 1, 7, 300, 2_000, 26_000][k % 6];
      const cs = series(r, n, 1_790_000_000_000 + Math.floor(r() * 29) * 60_000);
      const s = CandleSeries.fromCandles(cs, cs.length, Math.floor(r() * 10));
      for (const tf of [1, 5, 15, 30])
        for (const want of [0, 1, 4, 50, 299, 800, 3000, 20_000]) {
          const ref = refLane("SYM", cs, 1, tf, want);
          const got = tf === 1 ? barsOfSeries("SYM", tf, s, Math.max(0, s.n - want), s.n) : resampleTailBars("SYM", s, 1, tf, want);
          assertBarsEqual(got, ref, `n ${n} tf ${tf} want ${want}`);
          checks++;
        }
    }
    // a 5 m base resampled to 15 m and 30 m
    const cs5 = series(r, 3000).map((c, i) => ({ ...c, t: 1_790_000_100_000 - (1_790_000_100_000 % 300_000) + i * 300_000 }));
    const s5 = CandleSeries.fromCandles(cs5);
    for (const tf of [15, 30]) for (const want of [0, 3, 100, 999]) assertBarsEqual(resampleTailBars("X", s5, 5, tf, want), refLane("X", cs5, 5, tf, want), `5m→${tf}m ${want}`);
    assert.ok(checks > 700);
  });

  it("the backtest's price lookup answers as before (before the first bar: null)", () => {
    const r = rng(17);
    const cs = series(r, 5000);
    const s = CandleSeries.fromCandles(cs);
    for (let q = 0; q < 2000; q++) {
      const t = cs[0].t - 3 * 60_000 + r() * (cs.at(-1)!.t - cs[0].t + 6 * 60_000);
      assert.equal(s.closeAtOrBefore(t), refPrice(cs, t), `t ${t}`);
    }
    assert.equal(CandleSeries.EMPTY.closeAtOrBefore(1), null);
    for (const t of [cs[0].t, cs[100].t, cs.at(-1)!.t]) assert.equal(s.closeAtOrBefore(t), refPrice(cs, t));
  });

  it("is not an array: no length, no at / slice / filter, not iterable; JSON as its bars", () => {
    const cs = series(rng(19), 10);
    const s = CandleSeries.fromCandles(cs);
    assert.throws(() => (s as unknown as { length: number }).length, /no length/);
    for (const k of ["at", "slice", "filter", "map"]) assert.equal((s as unknown as Record<string, unknown>)[k], undefined, k);
    assert.throws(() => [...(s as unknown as Iterable<unknown>)]);
    assert.equal(JSON.stringify(s), JSON.stringify(cs));
    assert.equal(JSON.stringify({ a: s }), JSON.stringify({ a: cs }));
  });

  it("tail, range, lowerBound, bar and the builder", () => {
    const cs = series(rng(23), 400);
    const s = CandleSeries.fromCandles(cs, 400, 20);
    assert.deepEqual(s.tail(30).toCandles(), cs.slice(-30));
    assert.deepEqual(s.range(10, 25).toCandles(), cs.slice(10, 25));
    assert.deepEqual(s.toCandles(5, 9), cs.slice(5, 9));
    for (const i of [0, 7, 399]) assert.deepEqual(s.bar(i), cs[i]);
    for (const t of [0, cs[0].t, cs[200].t, cs[200].t + 1, cs[399].t + 1]) {
      const want = cs.findIndex((c) => c.t >= t);
      assert.equal(s.lowerBound(t), want < 0 ? cs.length : want, `lowerBound ${t}`);
    }
    const src = series(rng(29), 420);
    for (const [cnt, push] of [[400, 405], [400, 395], [0, 3], [10, 0]]) {
      const b = CandleSeries.builder(cnt, 2);
      for (let i = 0; i < push; i++) {
        const c = src[i];
        b.push(c.t, c.o, c.h, c.l, c.c, c.v);
      }
      assert.deepEqual(b.done().toCandles(), src.slice(0, push), `builder ${cnt} / ${push}`);
    }
    assert.deepEqual(CandleSeries.prepend(cs.slice(0, 100), CandleSeries.fromCandles(cs.slice(100))).toCandles(), cs);
    assert.deepEqual([...seriesMap(new Map([["A", cs]])).get("A")!.toCandles()], cs);
  });

  it("headroom: deterministic per symbol, spread so the symbols do not all copy in the same minute", () => {
    const want = 25_920;
    const H = candleHeadroom(want);
    assert.equal(H, 1620);
    const syms = Array.from({ length: 60 }, (_, i) => `SYM${i}-USDT`);
    const fresh = syms.map((s) => headroomFor(s, want, true));
    for (const h of fresh) assert.ok(h >= 1 && h <= 60);
    assert.ok(new Set(fresh).size >= 30, `fresh headroom over ${new Set(fresh).size} distinct minutes`);
    for (const s of syms) {
      const h = headroomFor(s, want, false);
      assert.ok(h >= H && h < 2 * H);
      assert.equal(h, headroomFor(s, want, false));
    }
  });
});
