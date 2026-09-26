// Per-symbol memo of indicator series so ~40 indications and 9 bots share one computation.
import type { Bars } from "../domain/types.ts";
import * as I from "../math/indicators.ts";

type Any = unknown;

export class SeriesCache {
  readonly b: Bars;
  private m = new Map<string, Any>();
  constructor(b: Bars) {
    this.b = b;
  }
  /** Drop every cached series except those whose key starts with one of `keep` (memory bound between groups). */
  clear(keep: readonly string[] = []) {
    if (!keep.length) {
      this.m.clear();
      return;
    }
    for (const k of this.m.keys()) if (!keep.some((p) => k.startsWith(p))) this.m.delete(k);
  }
  /** Drop cached series whose key ends with `suffix` (one-shot combo signals: keeps memory bounded). */
  forgetSuffix(suffix: string) {
    for (const k of this.m.keys()) if (k.endsWith(suffix)) this.m.delete(k);
  }
  memo<T>(key: string, fn: () => T): T {
    const hit = this.m.get(key);
    if (hit !== undefined) return hit as T;
    const v = fn();
    this.m.set(key, v);
    return v;
  }
  ema(p: number) {
    return this.memo(`ema${p}`, () => I.ema(this.b.c, p));
  }
  sma(p: number) {
    return this.memo(`sma${p}`, () => I.sma(this.b.c, p));
  }
  rsi(p: number) {
    return this.memo(`rsi${p}`, () => I.rsi(this.b.c, p));
  }
  atr(p: number) {
    return this.memo(`atr${p}`, () => I.atr(this.b.h, this.b.l, this.b.c, p));
  }
  macd(f = 12, s = 26, g = 9) {
    return this.memo(`macd${f}.${s}.${g}`, () => I.macd(this.b.c, f, s, g));
  }
  bb(p = 20, k = 2) {
    return this.memo(`bb${p}.${k}`, () => I.bollinger(this.b.c, p, k));
  }
  psar(step = 0.02, max = 0.2) {
    return this.memo(`sar${step}.${max}`, () => I.psar(this.b.h, this.b.l, step, max));
  }
  dmi(p = 14) {
    return this.memo(`dmi${p}`, () => I.dmi(this.b.h, this.b.l, this.b.c, p));
  }
  st(p = 10, m = 3) {
    return this.memo(`st${p}.${m}`, () => I.supertrend(this.b.h, this.b.l, this.b.c, p, m));
  }
  don(p: number) {
    return this.memo(`don${p}`, () => I.donchianPrior(this.b.h, this.b.l, p));
  }
  vwap(p: number) {
    return this.memo(`vwap${p}`, () => I.vwapRolling(this.b.h, this.b.l, this.b.c, this.b.v, p));
  }
  volSma(p: number) {
    return this.memo(`vsma${p}`, () => I.sma(this.b.v, p));
  }
  roc(p: number) {
    return this.memo(`roc${p}`, () => I.roc(this.b.c, p));
  }
  stoch(p = 14, d = 3) {
    return this.memo(`stoch${p}.${d}`, () => I.stoch(this.b.h, this.b.l, this.b.c, p, d));
  }
  cci(p: number) {
    return this.memo(`cci${p}`, () => I.cci(this.b.h, this.b.l, this.b.c, p));
  }
  willr(p: number) {
    return this.memo(`willr${p}`, () => I.willr(this.b.h, this.b.l, this.b.c, p));
  }
  mfi(p: number) {
    return this.memo(`mfi${p}`, () => I.mfi(this.b.h, this.b.l, this.b.c, this.b.v, p));
  }
  obv() {
    return this.memo("obv", () => I.obv(this.b.c, this.b.v));
  }
  cmf(p: number) {
    return this.memo(`cmf${p}`, () => I.cmf(this.b.h, this.b.l, this.b.c, this.b.v, p));
  }
  stochRsi(p: number, s = p) {
    return this.memo(`srsi${p}.${s}`, () => I.stochRsi(this.b.c, p, s, 3));
  }
  aroon(p: number) {
    return this.memo(`aroon${p}`, () => I.aroon(this.b.h, this.b.l, p));
  }
  kelt(p: number, m: number) {
    return this.memo(`kelt${p}.${m}`, () => I.keltner(this.b.h, this.b.l, this.b.c, p, m));
  }
  ichi(t: number, k: number, b: number) {
    return this.memo(`ichi${t}.${k}.${b}`, () => I.ichimoku(this.b.h, this.b.l, t, k, b, k));
  }
  hma(p: number) {
    return this.memo(`hma${p}`, () => I.hma(this.b.c, p));
  }
  trix(p: number) {
    return this.memo(`trix${p}`, () => I.trix(this.b.c, p));
  }
  kama(p: number) {
    return this.memo(`kama${p}`, () => I.kama(this.b.c, p));
  }
  ha() {
    return this.memo("ha", () => I.heikinAshi(this.b.o, this.b.h, this.b.l, this.b.c));
  }
  z(p: number) {
    return this.memo(`z${p}`, () => I.zscore(this.b.c, p));
  }
  /**
   * Higher-timeframe view: `factor` × this timeframe, built from COMPLETED higher bars only.
   * `map[i]` = index of the last higher bar that had closed when bar i closed (−1 = none yet).
   */
  htf(factor: number): { k: SeriesCache; map: Int32Array } {
    return this.memo(`htf${factor}`, () => {
      const b = this.b;
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
        // the bucket closes with this bar: publish the completed higher bar
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
      const hb = {
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
      return { k: new SeriesCache(hb), map };
    });
  }
  period(ms: number) {
    const b = this.b;
    return this.memo(`per${ms}`, () => I.periodLevels(b.t, b.h, b.l, b.c, b.o, b.v, ms));
  }
  rangeSma(p: number) {
    return this.memo(`rsma${p}`, () => {
      const r = new Float64Array(this.b.n);
      for (let i = 0; i < this.b.n; i++) r[i] = this.b.h[i] - this.b.l[i];
      return I.sma(r, p);
    });
  }
}
