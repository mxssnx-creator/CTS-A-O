// A symbol's base candles as columns (memory, 14 Oct). The runtime held its 1-minute bars as one object per bar: on the
// x01 desk 1.55 M of them, ~240 MB of heap (162 B a bar) and ~9 M objects for every major collection to mark. A
// CandleSeries keeps the same values in one Float64 buffer per symbol (six columns, 48 B a bar, outside the heap).
//
// The view rule (it replaces "a store replaces the array, it never changes one in place"): a published series never
// changes. append() writes in place only past the buffer's high-water mark, and only when the series appended to ends
// there; the result is a new view. Anything else (a fork, no room) copies the kept bars into a new buffer. Readers that
// hold a series across yields (a compute, the realtime step, the backtest cache, the live report's copy of the map)
// keep reading exactly what they took.
//
// A series has no `length`, no index access and is not iterable: code written for Candle[] fails to compile, and a
// script that reads `.length` throws. Read `.n` and the columns.
import type { Bars, Candle } from "../domain/types.ts";
import { hashStr } from "./bars.ts";

/** a column: readable, never written through */
export interface ReadonlyF64 {
  readonly length: number;
  readonly [i: number]: number;
  slice(start?: number, end?: number): Float64Array;
  subarray(start?: number, end?: number): ReadonlyF64;
}

type HighWater = { end: number };

export class CandleSeries {
  /** bars in this series */
  readonly n: number;
  readonly t: ReadonlyF64;
  readonly o: ReadonlyF64;
  readonly h: ReadonlyF64;
  readonly l: ReadonlyF64;
  readonly c: ReadonlyF64;
  readonly v: ReadonlyF64;
  // one buffer of 6 × cap doubles (column k at k × cap); this view is [start, start + n) of each column
  private readonly buf: Float64Array;
  private readonly cap: number;
  private readonly start: number;
  // the buffer's high-water mark, shared by every view of it: what lies past it was never published
  private readonly hw: HighWater;

  private constructor(buf: Float64Array, cap: number, start: number, n: number, hw: HighWater) {
    this.buf = buf;
    this.cap = cap;
    this.start = start;
    this.n = n;
    this.hw = hw;
    const col = (k: number) => buf.subarray(k * cap + start, k * cap + start + n);
    this.t = col(0);
    this.o = col(1);
    this.h = col(2);
    this.l = col(3);
    this.c = col(4);
    this.v = col(5);
  }

  /** no bars; its capacity is 0, so an append onto it always copies */
  static readonly EMPTY: CandleSeries = new CandleSeries(new Float64Array(0), 0, 0, 0, { end: 0 });

  /** the last `keep` of `cs`, with room for `headroom` more bars before a copy */
  static fromCandles(cs: readonly Candle[], keep = cs.length, headroom = 0): CandleSeries {
    const s = Math.max(0, cs.length - Math.max(0, keep));
    const n = cs.length - s;
    if (n === 0 && headroom <= 0) return CandleSeries.EMPTY;
    const cap = n + Math.max(0, headroom);
    const buf = new Float64Array(6 * cap);
    for (let i = 0; i < n; i++) put(buf, cap, i, cs[s + i]);
    return new CandleSeries(buf, cap, 0, n, { end: n });
  }

  /** `head` followed by `tail` (a new buffer, no headroom) */
  static prepend(head: readonly Candle[], tail: CandleSeries): CandleSeries {
    const n = head.length + tail.n;
    if (n === 0) return CandleSeries.EMPTY;
    const buf = new Float64Array(6 * n);
    for (let i = 0; i < head.length; i++) put(buf, n, i, head[i]);
    for (let k = 0; k < 6; k++) buf.set(tail.col(k), k * n + head.length);
    return new CandleSeries(buf, n, 0, n, { end: n });
  }

  /** a series filled bar by bar (it grows past `n` when more come; done() keeps exactly the bars pushed) */
  static builder(n: number, headroom = 0) {
    let cap = Math.max(0, n) + Math.max(0, headroom);
    let buf = new Float64Array(6 * cap);
    let len = 0;
    return {
      push(t: number, o: number, h: number, l: number, c: number, v: number) {
        if (len === cap) {
          const cap2 = Math.max(16, cap * 2);
          const b2 = new Float64Array(6 * cap2);
          for (let k = 0; k < 6; k++) b2.set(buf.subarray(k * cap, k * cap + len), k * cap2);
          buf = b2;
          cap = cap2;
        }
        buf[len] = t;
        buf[cap + len] = o;
        buf[2 * cap + len] = h;
        buf[3 * cap + len] = l;
        buf[4 * cap + len] = c;
        buf[5 * cap + len] = v;
        len++;
      },
      done(): CandleSeries {
        if (len === 0 && cap === 0) return CandleSeries.EMPTY;
        return new CandleSeries(buf, cap, 0, len, { end: len });
      },
    };
  }

  /** whether two series share a buffer (tests) */
  static sharesBuffer(a: CandleSeries, b: CandleSeries): boolean {
    return a.buf === b.buf && a.cap > 0;
  }

  /**
   * The last `keep` bars of this series followed by `cs` (what storeCandles kept of `[...old, ...cs]`). In place when
   * this series ends at the buffer's high-water mark and the bars fit; otherwise the kept bars go into a new buffer
   * with room for `headroom` more.
   */
  append(cs: readonly Candle[], keep: number, headroom: number): CandleSeries {
    const m = cs.length;
    const total = this.n + m;
    const n = Math.min(Math.max(0, keep), total);
    const drop = total - n;
    const end = this.start + this.n;
    if (m > 0 && this.cap > 0 && end === this.hw.end && end + m <= this.cap) {
      for (let i = 0; i < m; i++) put(this.buf, this.cap, end + i, cs[i]);
      this.hw.end = end + m;
      return new CandleSeries(this.buf, this.cap, this.start + drop, n, this.hw);
    }
    // nothing new: the kept bars are a view (nothing is written)
    if (m === 0) return this.tail(n);
    if (n === 0 && headroom <= 0) return CandleSeries.EMPTY;
    const cap = n + Math.max(0, headroom);
    const buf = new Float64Array(6 * cap);
    // the kept bars of this series, then the kept bars of cs
    const fromOld = Math.min(drop, this.n);
    const oldKept = this.n - fromOld;
    for (let k = 0; k < 6; k++) buf.set(this.col(k).subarray(fromOld), k * cap);
    const fromNew = Math.max(0, drop - this.n);
    for (let i = fromNew; i < m; i++) put(buf, cap, oldKept + i - fromNew, cs[i]);
    return new CandleSeries(buf, cap, 0, n, { end: n });
  }

  /** the last k bars (a view of the same buffer) */
  tail(k: number): CandleSeries {
    const kk = Math.max(0, Math.min(this.n, Math.floor(k)));
    if (kk === this.n) return this;
    return new CandleSeries(this.buf, this.cap, this.start + this.n - kk, kk, this.hw);
  }

  /** bars [from, to) (a view of the same buffer) */
  range(from: number, to: number): CandleSeries {
    const a = Math.max(0, Math.min(this.n, from));
    const b = Math.max(a, Math.min(this.n, to));
    if (a === 0 && b === this.n) return this;
    return new CandleSeries(this.buf, this.cap, this.start + a, b - a, this.hw);
  }

  firstT(): number | undefined {
    return this.n ? this.t[0] : undefined;
  }
  lastT(): number | undefined {
    return this.n ? this.t[this.n - 1] : undefined;
  }
  lastC(): number | undefined {
    return this.n ? this.c[this.n - 1] : undefined;
  }

  /** the first index whose bar opens at or after `t` (n when none) */
  lowerBound(t: number): number {
    let lo = 0;
    let hi = this.n;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (this.t[m] < t) lo = m + 1;
      else hi = m;
    }
    return lo;
  }

  /** the close of the last bar opening at or before `t`; null before the first bar (backtestSeries' price) */
  closeAtOrBefore(t: number): number | null {
    if (!this.n) return null;
    if (this.t[0] > t) return null;
    let lo = 0;
    let hi = this.n - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (this.t[m] <= t) lo = m;
      else hi = m - 1;
    }
    return this.c[lo];
  }

  bar(i: number): Candle {
    return { t: this.t[i], o: this.o[i], h: this.h[i], l: this.l[i], c: this.c[i], v: this.v[i] };
  }

  /** bars [from, to) as objects */
  toCandles(from = 0, to = this.n): Candle[] {
    const a = Math.max(0, Math.min(this.n, from));
    const b = Math.max(a, Math.min(this.n, to));
    const out: Candle[] = new Array(b - a);
    for (let i = a; i < b; i++) out[i - a] = this.bar(i);
    return out;
  }

  /** as the bars it holds (a recorded feed writes the store at exit) */
  toJSON(): Candle[] {
    return this.toCandles();
  }

  private col(k: number): Float64Array {
    return this.buf.subarray(k * this.cap + this.start, k * this.cap + this.start + this.n);
  }
}

// (outside the class body: a typed `length` would let array code compile)
Object.defineProperty(CandleSeries.prototype, "length", {
  get() {
    throw new TypeError("CandleSeries has no length: read .n and the columns");
  },
});

function put(buf: Float64Array, cap: number, i: number, k: Candle) {
  buf[i] = k.t;
  buf[cap + i] = k.o;
  buf[2 * cap + i] = k.h;
  buf[3 * cap + i] = k.l;
  buf[4 * cap + i] = k.c;
  buf[5 * cap + i] = k.v;
}

/** room for appends before a copy: 1/16 of the kept bars, at least 64 */
export const candleHeadroom = (want: number) => Math.max(64, Math.ceil(want / 16));

/**
 * The headroom of a symbol's series, spread by its name so the symbols do not all copy in the same minute: a fresh
 * series (boot, backfill) 1–60 bars, a copy H to 2H − 1 (H = candleHeadroom(want); 27–54 h of 1 m bars on the desk).
 */
export function headroomFor(sym: string, want: number, fresh: boolean): number {
  const h = hashStr(sym);
  if (fresh) return 1 + (h % 60);
  const H = candleHeadroom(want);
  return H + (h % H);
}

/** bars [from, to) of a series as a lane's Bars (owned columns: a worker message never carries the symbol's buffer) */
export function barsOfSeries(sym: string, tfMin: number, cs: CandleSeries, from: number, to: number): Bars {
  const a = Math.max(0, Math.min(cs.n, from));
  const b = Math.max(a, Math.min(cs.n, to));
  return {
    sym,
    tfMin,
    n: b - a,
    t: cs.t.slice(a, b),
    o: cs.o.slice(a, b),
    h: cs.h.slice(a, b),
    l: cs.l.slice(a, b),
    c: cs.c.slice(a, b),
    v: cs.v.slice(a, b),
  };
}

/**
 * The last `n` bars of a resampled lane (tf a multiple of srcMin): only the bars of the last n + 1 buckets are read,
 * resampled as bars.ts resample does (h the max, l the min, c the last close, v summed in order; an incomplete bucket
 * dropped). The same values as barsFromCandles of the last n of resampleTail on the same bars.
 */
export function resampleTailBars(sym: string, cs: CandleSeries, srcMin: number, tf: number, n: number): Bars {
  const N = cs.n;
  if (!N || n <= 0) return barsOfSeries(sym, tf, cs, 0, 0);
  const tfMs = tf * 60_000;
  const from = Math.floor(cs.t[N - 1] / tfMs) * tfMs - (n + 1) * tfMs;
  const lo = cs.lowerBound(from);
  if (tf === srcMin) return barsOfSeries(sym, tf, cs, Math.max(lo, N - n), N);
  const k = tf / srcMin;
  const size = Math.floor((N - lo) / Math.max(1, Math.floor(k))) + 1;
  const T = new Float64Array(size);
  const O = new Float64Array(size);
  const H = new Float64Array(size);
  const L = new Float64Array(size);
  const C = new Float64Array(size);
  const V = new Float64Array(size);
  let m = 0;
  let has = false;
  let bt = 0;
  let bo = 0;
  let bh = 0;
  let bl = 0;
  let bc = 0;
  let bv = 0;
  let cnt = 0;
  const flush = () => {
    if (has && cnt === k) {
      T[m] = bt;
      O[m] = bo;
      H[m] = bh;
      L[m] = bl;
      C[m] = bc;
      V[m] = bv;
      m++;
    }
  };
  for (let i = lo; i < N; i++) {
    const b = Math.floor(cs.t[i] / tfMs) * tfMs;
    if (!has || bt !== b) {
      flush();
      has = true;
      bt = b;
      bo = cs.o[i];
      bh = cs.h[i];
      bl = cs.l[i];
      bc = cs.c[i];
      bv = cs.v[i];
      cnt = 1;
    } else {
      bh = Math.max(bh, cs.h[i]);
      bl = Math.min(bl, cs.l[i]);
      bc = cs.c[i];
      bv += cs.v[i];
      cnt++;
    }
  }
  flush();
  const s = Math.max(0, m - n);
  return { sym, tfMin: tf, n: m - s, t: T.slice(s, m), o: O.slice(s, m), h: H.slice(s, m), l: L.slice(s, m), c: C.slice(s, m), v: V.slice(s, m) };
}

/** a map of Candle[] as series (tests, and a runtime state of an earlier version) */
export function seriesMap(m: ReadonlyMap<string, readonly Candle[]>): Map<string, CandleSeries> {
  const out = new Map<string, CandleSeries>();
  for (const [k, cs] of m) out.set(k, CandleSeries.fromCandles(cs));
  return out;
}
