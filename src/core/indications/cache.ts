// Per-symbol memo of indicator series so ~40 indications and 9 bots share one computation.
import type { Bars } from "../domain/types.ts";
import * as I from "../math/indicators.ts";
import type { MarketRef, MarketSource } from "./market.ts";

type Any = unknown;

export class SeriesCache {
  readonly b: Bars;
  private m = new Map<string, Any>();
  /** the universe's market reference (makeUniverse attaches it; a series built on its own has none) */
  private mk: { src: MarketSource; tf: number; factor: number } | null = null;
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
  /** ATR as an EMA of the true range (Stable-02 ports and ATR exits) */
  atrEma(p: number) {
    return this.memo(`atre${p}`, () => I.atrEma(this.b.h, this.b.l, this.b.c, p));
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
   * The higher view carries this series' market reference, aggregated the same way (see market.ts).
   */
  htf(factor: number): { k: SeriesCache; map: Int32Array } {
    return this.memo(`htf${factor}`, () => {
      const { hb, map } = htfBars(this.b, factor);
      const k = new SeriesCache(hb);
      if (this.mk) k.setMarket(this.mk.src, this.mk.tf, this.mk.factor * factor);
      return { k, map };
    });
  }
  /**
   * Attach the universe's market reference (market.ts): `tf` is the timeframe of the universe series it is built
   * from, `factor` this series' aggregation of that timeframe (1 = a universe series, a higher view: its factor).
   */
  setMarket(src: MarketSource | null, tf: number = this.b.tfMin, factor = 1) {
    this.mk = src ? { src, tf, factor } : null;
    this.m.delete("mkt");
  }
  /**
   * The equal-weight market of this series' timeframe, aligned to its bars by open time: per-bar log return,
   * cumulative log index and activity (see market.ts). null when no market reference was attached (a series
   * computed on its own): the relation indications are then neutral.
   */
  market(): MarketRef | null {
    const mk = this.mk;
    if (!mk) return null;
    return this.memo("mkt", () => mk.src.ref(this.b, mk.tf, mk.factor));
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

/**
 * Higher-timeframe bars: `factor` × the series' timeframe, COMPLETED higher bars only (a bucket is published with
 * the bar that closes it). `map[i]` = index of the last higher bar that had closed when bar i closed (−1 = none).
 */
export function htfBars(b: Bars, factor: number): { hb: Bars; map: Int32Array } {
  const tfMs = b.tfMin * 60_000;
  const span = tfMs * factor;
  // a higher bar is never more than one per base bar: the completed bars are written in place and copied to their
  // exact length at the end (the same values the growing JS arrays gave, without the boxing and the regrowth)
  const T = new Float64Array(b.n),
    O = new Float64Array(b.n),
    Hh = new Float64Array(b.n),
    L = new Float64Array(b.n),
    C = new Float64Array(b.n),
    V = new Float64Array(b.n);
  let m = 0;
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
      T[m] = bt;
      O[m] = bo;
      Hh[m] = bh;
      L[m] = bl;
      C[m] = bc;
      V[m] = bv;
      m++;
    }
    map[i] = m - 1;
  }
  const hb: Bars = {
    sym: b.sym,
    tfMin: b.tfMin * factor,
    n: m,
    t: T.slice(0, m),
    o: O.slice(0, m),
    h: Hh.slice(0, m),
    l: L.slice(0, m),
    c: C.slice(0, m),
    v: V.slice(0, m),
  };
  return { hb, map };
}
