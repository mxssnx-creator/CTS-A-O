// Stable-02 ports: every ported entry signal and indication against the desk's own code (copied verbatim below
// from CTS-A Stable-02 src/lib/desk/engine.ts, VWAP made rolling as in the port), hand-built long / short onsets,
// the ATR exit math and the registry wiring.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Protect } from "../domain/types.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID, SIGNAL_SOURCES, signalId } from "./registry.ts";
import { S2_ENTRIES, S2_INDICATIONS, s2EntryId, stable02Specs } from "./stable02.ts";
import { atrProtect, atrTrailGap, LANE_MIN, resolveAtrProtect, simulate } from "../sim/backtest.ts";
import { configId, laneProtect, parseConfigId } from "../pipeline/pipeline.ts";
import { adjustProtect } from "../adjust.ts";
import { checkSettings } from "../settings-check.ts";
import { signalSettings } from "../signal-config.ts";

// ── the desk's code (reference) ─────────────────────────────────────────────────────────────────────────
type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
type IndicatorPack = Record<string, number[]>;
type IndicationId = "trend" | "break" | "active" | "direction";
type IndicationHit = {
  configId: string;
  kind: IndicationId;
  dir: number;
  strength: number;
  activity: number;
};
const T0 = 1_725_000_000_000;
const BAR_MS = 15 * 60 * 1000;
const WARMUP = 55;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sma(src: number[], period: number): number[] {
  const out = Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i]!;
    if (i >= period) sum -= src[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(src: number[], period: number): number[] {
  const out = Array(src.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev = 0;
  let started = false;
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    if (i < period) {
      sum += src[i]!;
      if (i === period - 1) {
        prev = sum / period;
        out[i] = prev;
        started = true;
      }
      continue;
    }
    if (!started) continue;
    prev = src[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsi(closes: number[], period = 14): number[] {
  const out = Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function trueRange(c: Candle[], i: number): number {
  if (i === 0) return c[i]!.h - c[i]!.l;
  const prev = c[i - 1]!.c;
  return Math.max(c[i]!.h - c[i]!.l, Math.abs(c[i]!.h - prev), Math.abs(c[i]!.l - prev));
}

function atr(candles: Candle[], period = 14): number[] {
  const tr = candles.map((_, i) => trueRange(candles, i));
  return ema(tr, period);
}

function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const eFast = ema(closes, fast);
  const eSlow = ema(closes, slow);
  const line = closes.map((_, i) => eFast[i]! - eSlow[i]!);
  const sig = ema(
    line.map((v) => (Number.isFinite(v) ? v : 0)),
    signal,
  );
  const hist = line.map((v, i) => v - sig[i]!);
  return { line, sig, hist };
}

function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = Array(closes.length).fill(NaN);
  const lower = Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    let ss = 0;
    const m = mid[i]!;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j]! - m;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

function stochastic(candles: Candle[], kPeriod = 14, dPeriod = 3) {
  const k = Array(candles.length).fill(NaN);
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j]!.h);
      lo = Math.min(lo, candles[j]!.l);
    }
    k[i] = hi === lo ? 50 : ((candles[i]!.c - lo) / (hi - lo)) * 100;
  }
  const d = sma(
    k.map((v) => (Number.isFinite(v) ? v : 50)),
    dPeriod,
  );
  return { k, d };
}

function dmi(candles: Candle[], period = 14) {
  const plusDM = Array(candles.length).fill(0);
  const minusDM = Array(candles.length).fill(0);
  const tr = candles.map((_, i) => trueRange(candles, i));
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i]!.h - candles[i - 1]!.h;
    const down = candles[i - 1]!.l - candles[i]!.l;
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }
  const smTR = ema(tr, period);
  const smP = ema(plusDM, period);
  const smM = ema(minusDM, period);
  const plusDI = smP.map((v, i) => (smTR[i] ? (100 * v) / smTR[i]! : NaN));
  const minusDI = smM.map((v, i) => (smTR[i] ? (100 * v) / smTR[i]! : NaN));
  const dx = plusDI.map((p, i) => {
    const m = minusDI[i]!;
    const s = p + m;
    return s === 0 || !Number.isFinite(s) ? NaN : (100 * Math.abs(p - m)) / s;
  });
  const adx = ema(
    dx.map((v) => (Number.isFinite(v) ? v : 0)),
    period,
  );
  return { plusDI, minusDI, adx };
}

// ported deviation: the desk's cumulative session VWAP becomes a rolling VWAP over its 240-bar series
function vwap(candles: Candle[]): number[] {
  const out = Array(candles.length).fill(NaN);
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i]!.h + candles[i]!.l + candles[i]!.c) / 3;
    pv += tp * candles[i]!.v;
    vol += candles[i]!.v;
    if (i >= 240) {
      const q = candles[i - 240]!;
      pv -= ((q.h + q.l + q.c) / 3) * q.v;
      vol -= q.v;
    }
    if (i >= 239) out[i] = pv / vol;
  }
  return out;
}

function supertrend(candles: Candle[], atrArr: number[], period = 10, mult = 3) {
  const st = Array(candles.length).fill(NaN);
  const dir = Array(candles.length).fill(0);
  let upper = 0;
  let lower = 0;
  let d = 1;
  for (let i = 0; i < candles.length; i++) {
    const a = atrArr[i];
    if (!Number.isFinite(a)) continue;
    const hl2 = (candles[i]!.h + candles[i]!.l) / 2;
    const bu = hl2 + mult * a!;
    const bl = hl2 - mult * a!;
    if (i === 0 || !Number.isFinite(st[i - 1]!)) {
      upper = bu;
      lower = bl;
      d = candles[i]!.c >= hl2 ? 1 : -1;
    } else {
      lower = bl > lower || candles[i - 1]!.c < lower ? bl : lower;
      upper = bu < upper || candles[i - 1]!.c > upper ? bu : upper;
      if (d === 1 && candles[i]!.c < lower) d = -1;
      else if (d === -1 && candles[i]!.c > upper) d = 1;
    }
    dir[i] = d;
    st[i] = d === 1 ? lower : upper;
  }
  return { st, dir };
}

function cci(candles: Candle[], period = 20): number[] {
  const tp = candles.map((c) => (c.h + c.l + c.c) / 3);
  const mid = sma(tp, period);
  const out = Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let mad = 0;
    for (let j = i - period + 1; j <= i; j++) mad += Math.abs(tp[j]! - mid[i]!);
    mad /= period;
    out[i] = mad === 0 ? 0 : (tp[i]! - mid[i]!) / (0.015 * mad);
  }
  return out;
}

function regimeDrift(i: number, n: number): number {
  const p = i / n;
  if (p < 0.22) return 0.00045;
  if (p < 0.38) return -0.00035;
  if (p < 0.52) return 0.00004;
  if (p < 0.74) return 0.0007;
  return -0.00028;
}

function generateCandles(seed: number, startPrice: number, vol: number, n: number): Candle[] {
  const rng = mulberry32(seed);
  const candles: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const drift = regimeDrift(i, n) + (rng() - 0.5) * vol;
    const shock = rng() < 0.035 ? (rng() - 0.5) * vol * 5 : 0;
    const open = price;
    const close = Math.max(startPrice * 0.15, price * (1 + drift + shock));
    const wick = vol * (0.25 + rng() * 0.7);
    const high = Math.max(open, close) * (1 + rng() * wick);
    const low = Math.min(open, close) * (1 - rng() * wick);
    const body = Math.abs(close - open) / open;
    const volume = (80 + rng() * 920) * (1 + body * 18) * (rng() < 0.08 ? 2.4 : 1);
    candles.push({ t: T0 + i * BAR_MS, o: open, h: high, l: low, c: close, v: volume });
    price = close;
  }
  return candles;
}

function computeIndicators(candles: Candle[]): IndicatorPack {
  const close = candles.map((c) => c.c);
  const vol = candles.map((c) => c.v);
  const m = macd(close);
  const bb = bollinger(close);
  const stoch = stochastic(candles);
  const d = dmi(candles);
  const atr14 = atr(candles, 14);
  const st = supertrend(candles, atr14);
  return {
    sma20: sma(close, 20),
    ema9: ema(close, 9),
    ema21: ema(close, 21),
    ema55: ema(close, 55),
    rsi14: rsi(close, 14),
    macd: m.line,
    macdSignal: m.sig,
    macdHist: m.hist,
    bbMid: bb.mid,
    bbUpper: bb.upper,
    bbLower: bb.lower,
    stochK: stoch.k,
    stochD: stoch.d,
    adx: d.adx,
    plusDI: d.plusDI,
    minusDI: d.minusDI,
    atr: atr14,
    vwap: vwap(candles),
    supertrend: st.st,
    stDir: st.dir,
    volSma: sma(vol, 20),
    cci: cci(candles),
    activity: activitySeries(candles, atr14, sma(vol, 20)),
    rangeChange: rangeChangeSeries(candles, atr14),
  };
}

function rangeChangeSeries(candles: Candle[], atr14: number[]): number[] {
  const out = Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const a = atr14[i] || 0;
    const range = candles[i]!.h - candles[i]!.l;
    const shift = Math.abs(candles[i]!.c - candles[i - 1]!.c);
    out[i] = a > 0 ? (range + shift) / a : 0;
  }
  return out;
}

function activitySeries(candles: Candle[], atr14: number[], volSma: number[]): number[] {
  const rc = rangeChangeSeries(candles, atr14);
  const out = Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const vs = volSma[i] || 0;
    const volX = vs > 0 ? candles[i]!.v / vs : 1;
    const fast =
      i >= 2 ? (candles[i]!.v + candles[i - 1]!.v) / Math.max((volSma[i] ?? 1) * 2, 1e-9) : volX;
    out[i] = Math.min(4, (volX * 0.55 + fast * 0.45) * (0.4 + rc[i]! * 0.6));
  }
  return out;
}
function finite(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function crossUp(a: number[], b: number[], i: number): boolean {
  return (
    i > 0 &&
    finite(a[i]) &&
    finite(b[i]) &&
    finite(a[i - 1]) &&
    finite(b[i - 1]) &&
    a[i - 1]! <= b[i - 1]! &&
    a[i]! > b[i]!
  );
}

function crossDn(a: number[], b: number[], i: number): boolean {
  return (
    i > 0 &&
    finite(a[i]) &&
    finite(b[i]) &&
    finite(a[i - 1]) &&
    finite(b[i - 1]) &&
    a[i - 1]! >= b[i - 1]! &&
    a[i]! < b[i]!
  );
}
export interface IndicationConfig {
  id: string;
  kind: IndicationId;
  label: string;
  params: Record<string, number>;
}

const INDICATION_CONFIGS: IndicationConfig[] = [
  { id: "trend-ema", kind: "trend", label: "Trend EMA 9/21", params: { adx: 16 } },
  { id: "trend-adx", kind: "trend", label: "Trend ADX 26", params: { adx: 26 } },
  { id: "trend-st", kind: "trend", label: "Trend Supertrend", params: { multiplier: 3 } },
  { id: "break-vol", kind: "break", label: "Break volume 1.6×", params: { volMult: 1.6 } },
  { id: "break-atr", kind: "break", label: "Break ATR 1.15×", params: { atrMult: 1.15 } },
  { id: "break-hi", kind: "break", label: "Break 8-bar range", params: { lookback: 8 } },
  {
    id: "active-hf",
    kind: "active",
    label: "Active high-freq",
    params: { lookback: 4, volMult: 1.15 },
  },
  {
    id: "active-range",
    kind: "active",
    label: "Active range shift",
    params: { lookback: 6, volMult: 1.05 },
  },
  {
    id: "active-burst",
    kind: "active",
    label: "Active burst",
    params: { lookback: 3, volMult: 1.5 },
  },
  { id: "dir-cross", kind: "direction", label: "Dir EMA cross", params: { lookback: 5 } },
  { id: "dir-st", kind: "direction", label: "Dir Supertrend flip", params: { lookback: 6 } },
  { id: "dir-axis", kind: "direction", label: "Dir axis VWAP", params: { lookback: 5 } },
  { id: "dir-macd", kind: "direction", label: "Dir MACD flip", params: { lookback: 5 } },
];
function signalFor(id: string, candles: Candle[], ind: IndicatorPack): number[] {
  const out = Array(candles.length).fill(0);
  const closes = candles.map((x) => x.c);
  for (let i = WARMUP; i < candles.length; i++) {
    const c = candles[i]!.c;
    switch (id) {
      case "normal": {
        if (crossUp(ind.ema9, ind.ema21, i)) out[i] = 1;
        else if (crossDn(ind.ema9, ind.ema21, i)) out[i] = -1;
        break;
      }
      case "ema-cross": {
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]! * 1.05;
        const adxOk = finite(ind.adx[i]) && ind.adx[i]! > 18;
        if (crossUp(ind.ema9, ind.ema21, i) && adxOk && volOk) out[i] = 1;
        else if (crossDn(ind.ema9, ind.ema21, i) && adxOk && volOk) out[i] = -1;
        break;
      }
      case "rsi-revert": {
        if (
          finite(ind.rsi14[i]) &&
          finite(ind.bbLower[i]) &&
          ind.rsi14[i]! < 32 &&
          c <= ind.bbLower[i]!
        )
          out[i] = 1;
        else if (
          finite(ind.rsi14[i]) &&
          finite(ind.bbUpper[i]) &&
          ind.rsi14[i]! > 68 &&
          c >= ind.bbUpper[i]!
        )
          out[i] = -1;
        break;
      }
      case "macd-mom": {
        if (crossUp(ind.macd, ind.macdSignal, i) && (ind.macdHist[i] ?? 0) > 0) out[i] = 1;
        else if (crossDn(ind.macd, ind.macdSignal, i) && (ind.macdHist[i] ?? 0) < 0) out[i] = -1;
        break;
      }
      case "st-trail": {
        if (i > 0 && ind.stDir[i] === 1 && ind.stDir[i - 1] !== 1) out[i] = 1;
        else if (i > 0 && ind.stDir[i] === -1 && ind.stDir[i - 1] !== -1) out[i] = -1;
        break;
      }
      case "bb-bounce": {
        if (
          i > 0 &&
          finite(ind.bbLower[i]) &&
          candles[i - 1]!.c < ind.bbLower[i - 1]! &&
          c > ind.bbLower[i]! &&
          (ind.stochK[i] ?? 100) < 35
        )
          out[i] = 1;
        else if (
          i > 0 &&
          finite(ind.bbUpper[i]) &&
          candles[i - 1]!.c > ind.bbUpper[i - 1]! &&
          c < ind.bbUpper[i]! &&
          (ind.stochK[i] ?? 0) > 65
        )
          out[i] = -1;
        break;
      }
      case "vwap-axis": {
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]!;
        if (crossUp(closes, ind.vwap, i) && volOk && c > (ind.ema21[i] ?? c)) out[i] = 1;
        else if (crossDn(closes, ind.vwap, i) && volOk && c < (ind.ema21[i] ?? c)) out[i] = -1;
        break;
      }
      case "vol-break": {
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]! * 1.8;
        if (volOk && finite(ind.sma20[i]) && c > ind.sma20[i]! && c > candles[i]!.o) out[i] = 1;
        else if (volOk && finite(ind.sma20[i]) && c < ind.sma20[i]! && c < candles[i]!.o)
          out[i] = -1;
        break;
      }
      case "adx-gate": {
        if (
          finite(ind.adx[i]) &&
          ind.adx[i]! > 22 &&
          finite(ind.plusDI[i]) &&
          finite(ind.minusDI[i]) &&
          finite(ind.ema55[i]) &&
          finite(ind.ema55[i - 1])
        ) {
          const slope = ind.ema55[i]! - ind.ema55[i - 1]!;
          if (ind.plusDI[i]! > ind.minusDI[i]! && slope > 0) out[i] = 1;
          else if (ind.minusDI[i]! > ind.plusDI[i]! && slope < 0) out[i] = -1;
        }
        break;
      }
      case "stoch-swing": {
        if (
          crossUp(ind.stochK, ind.stochD, i) &&
          (ind.stochK[i] ?? 50) < 28 &&
          (ind.cci[i] ?? 0) < -50
        )
          out[i] = 1;
        else if (
          crossDn(ind.stochK, ind.stochD, i) &&
          (ind.stochK[i] ?? 50) > 72 &&
          (ind.cci[i] ?? 0) > 50
        )
          out[i] = -1;
        break;
      }
      case "confluence": {
        let long = 0;
        let short = 0;
        if (finite(ind.ema9[i]) && finite(ind.ema21[i]) && ind.ema9[i]! > ind.ema21[i]!) long++;
        else if (finite(ind.ema9[i]) && finite(ind.ema21[i]) && ind.ema9[i]! < ind.ema21[i]!)
          short++;
        if (finite(ind.macd[i]) && finite(ind.macdSignal[i]) && ind.macd[i]! > ind.macdSignal[i]!)
          long++;
        else if (finite(ind.macd[i]) && finite(ind.macdSignal[i])) short++;
        if (ind.stDir[i] === 1) long++;
        else if (ind.stDir[i] === -1) short++;
        if (finite(ind.rsi14[i]) && ind.rsi14[i]! > 45 && ind.rsi14[i]! < 70) long++;
        else if (finite(ind.rsi14[i]) && ind.rsi14[i]! < 55 && ind.rsi14[i]! > 30) short++;
        if (finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]!) {
          if (c > candles[i]!.o) long++;
          else short++;
        }
        if (long >= 3 && long > short) out[i] = 1;
        else if (short >= 3 && short > long) out[i] = -1;
        break;
      }
      case "range-break": {
        const look = 20;
        if (i < look) break;
        let hi = -Infinity;
        let lo = Infinity;
        for (let k = i - look; k < i; k++) {
          hi = Math.max(hi, candles[k]!.h);
          lo = Math.min(lo, candles[k]!.l);
        }
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]! * 1.15;
        const expand = finite(ind.atr[i]) && candles[i]!.h - candles[i]!.l > ind.atr[i]! * 1.1;
        if (volOk && expand && c > hi) out[i] = 1;
        else if (volOk && expand && c < lo) out[i] = -1;
        break;
      }
      case "atr-break": {
        if (!finite(ind.atr[i]) || !finite(ind.ema21[i])) break;
        const band = ind.atr[i]! * 1.5;
        const expand = (ind.rangeChange[i] ?? 0) > 1.15;
        if (expand && c > ind.ema21[i]! + band) out[i] = 1;
        else if (expand && c < ind.ema21[i]! - band) out[i] = -1;
        break;
      }
      case "active-hf": {
        const act = ind.activity[i] ?? 0;
        if (act < 1.2) break;
        if (crossUp(ind.ema9, ind.ema21, i) || (c > candles[i]!.o && act > 1.6)) out[i] = 1;
        else if (crossDn(ind.ema9, ind.ema21, i) || (c < candles[i]!.o && act > 1.6)) out[i] = -1;
        break;
      }
      case "range-shift": {
        const rc = ind.rangeChange[i] ?? 0;
        const act = ind.activity[i] ?? 0;
        if (rc < 1.05 || act < 1.05) break;
        if (finite(ind.bbUpper[i]) && c > ind.bbUpper[i]! && c > candles[i]!.o) out[i] = 1;
        else if (finite(ind.bbLower[i]) && c < ind.bbLower[i]! && c < candles[i]!.o) out[i] = -1;
        break;
      }
      case "block-stack": {
        const look = 4;
        if (i < look) break;
        let up = 0;
        let dn = 0;
        for (let k = i - look + 1; k <= i; k++) {
          if (candles[k]!.c >= candles[k]!.o) up++;
          else dn++;
        }
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]! * 1.05;
        if (volOk && up >= 3 && c > (ind.ema9[i] ?? c)) out[i] = 1;
        else if (volOk && dn >= 3 && c < (ind.ema9[i] ?? c)) out[i] = -1;
        break;
      }
      case "block-scale": {
        const adxOk = finite(ind.adx[i]) && ind.adx[i]! >= 16;
        const volOk = finite(ind.volSma[i]) && candles[i]!.v > ind.volSma[i]!;
        const above = finite(ind.vwap[i]) && c > ind.vwap[i]!;
        if (adxOk && volOk && above) out[i] = 1;
        else if (adxOk && volOk && finite(ind.vwap[i]) && c < ind.vwap[i]!) out[i] = -1;
        break;
      }
      default:
        break;
    }
  }
  return out;
}
function processIndication(
  cfg: IndicationConfig,
  pack: IndicatorPack,
  candles: Candle[],
  i: number,
): IndicationHit {
  const c = candles[i];
  const activity = pack.activity[i] ?? 0;
  let dir = 0;
  let strength = 0;
  if (!c) return { configId: cfg.id, kind: cfg.kind, dir: 0, strength: 0, activity };
  if (cfg.kind === "trend") {
    const adxMin = cfg.params.adx ?? 18;
    const adxOk = finite(pack.adx[i]) && pack.adx[i]! >= adxMin;
    const emaUp = finite(pack.ema9[i]) && finite(pack.ema21[i]) && pack.ema9[i]! > pack.ema21[i]!;
    const stUp = pack.stDir[i] === 1;
    if (cfg.id === "trend-st") {
      dir = pack.stDir[i] ?? 0;
      strength = adxOk ? 0.85 : 0.45;
    } else if (cfg.id === "trend-adx") {
      if (adxOk && finite(pack.plusDI[i]) && finite(pack.minusDI[i])) {
        dir = pack.plusDI[i]! > pack.minusDI[i]! ? 1 : -1;
        strength = Math.min(1, pack.adx[i]! / 40);
      }
    } else {
      if (emaUp) dir = 1;
      else if (finite(pack.ema9[i]) && finite(pack.ema21[i])) dir = -1;
      strength = adxOk ? 0.7 : 0.4;
    }
    if (stUp && dir === 1) strength = Math.min(1, strength + 0.15);
    if (pack.stDir[i] === -1 && dir === -1) strength = Math.min(1, strength + 0.15);
  } else if (cfg.kind === "break") {
    const volMult = cfg.params.volMult ?? 1.5;
    const atrMult = cfg.params.atrMult ?? 1.3;
    const look = Math.max(4, Math.round(cfg.params.lookback ?? 16));
    const volOk = finite(pack.volSma[i]) && c.v > pack.volSma[i]! * volMult;
    const expand = (pack.rangeChange[i] ?? 0) >= atrMult * 0.7;
    if (cfg.id === "break-hi" && i >= look) {
      let hi = -Infinity;
      let lo = Infinity;
      for (let k = i - look; k < i; k++) {
        hi = Math.max(hi, candles[k]!.h);
        lo = Math.min(lo, candles[k]!.l);
      }
      if (c.c > hi) dir = 1;
      else if (c.c < lo) dir = -1;
      strength = expand ? 0.8 : 0.45;
    } else if (volOk || expand) {
      dir = c.c >= c.o ? 1 : -1;
      strength = volOk && expand ? 0.9 : 0.55;
    }
  } else if (cfg.kind === "active") {
    const look = Math.max(3, Math.round(cfg.params.lookback ?? 6));
    const volMult = cfg.params.volMult ?? 1.2;
    let act = 0;
    const from = Math.max(1, i - look + 1);
    for (let k = from; k <= i; k++) act += pack.activity[k] ?? 0;
    act /= Math.max(1, i - from + 1);
    const volOk = finite(pack.volSma[i]) && c.v > pack.volSma[i]! * volMult;
    const ranging = (pack.rangeChange[i] ?? 0) > 0.85;
    if (act >= 1.05 && (volOk || ranging)) {
      dir = c.c >= c.o ? 1 : -1;
      strength = Math.min(1, 0.35 + act * 0.28);
    }
  } else if (cfg.kind === "direction" && i > 0) {
    const look = Math.max(2, Math.round(cfg.params.lookback ?? 8));
    const signAt = (k: number): number => {
      if (cfg.id === "dir-st") return pack.stDir[k] ?? 0;
      if (cfg.id === "dir-axis") {
        const v = pack.vwap[k];
        return finite(v) ? Math.sign(candles[k]!.c - v!) : 0;
      }
      if (cfg.id === "dir-macd") return Math.sign(pack.macdHist[k] ?? 0);
      const e9 = pack.ema9[k];
      const e21 = pack.ema21[k];
      return finite(e9) && finite(e21) ? Math.sign(e9! - e21!) : 0;
    };
    for (let k = i; k > i - look && k > 0; k--) {
      const now = signAt(k);
      const was = signAt(k - 1);
      if (now !== 0 && now !== was) {
        dir = now;
        const age = i - k;
        const base =
          cfg.id === "dir-st"
            ? 0.85
            : cfg.id === "dir-axis"
              ? 0.8
              : cfg.id === "dir-macd"
                ? 0.78
                : 0.75;
        strength = base * (1 - age / look);
        break;
      }
    }
    if (dir !== 0 && (pack.activity[i] ?? 0) >= 1.1) strength = Math.min(1, strength + 0.12);
  }
  return { configId: cfg.id, kind: cfg.kind, dir, strength, activity };
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const toBars = (cs: readonly Candle[], tfMin = 15, sym = "T"): Bars => ({
  sym,
  tfMin,
  n: cs.length,
  t: Float64Array.from(cs.map((x) => x.t)),
  o: Float64Array.from(cs.map((x) => x.o)),
  h: Float64Array.from(cs.map((x) => x.h)),
  l: Float64Array.from(cs.map((x) => x.l)),
  c: Float64Array.from(cs.map((x) => x.c)),
  v: Float64Array.from(cs.map((x) => x.v)),
});
/** Price mirror (K − p, high ↔ low, volume kept): every symmetric signal flips its direction. */
function mirror(cs: readonly Candle[]): Candle[] {
  const K = 2 * Math.max(...cs.map((x) => x.h));
  return cs.map((x) => ({ t: x.t, o: K - x.o, h: K - x.l, l: K - x.h, c: K - x.c, v: x.v }));
}
/** Deterministic hand-built path: two cycles, trend legs, a crash and a squeeze, volume bursts on big bars. */
function scripted(n = 1600): Candle[] {
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    const wiggle = Math.sin(i * 12.9898) * 43758.5453;
    const noise = (wiggle - Math.floor(wiggle) - 0.5) * 0.006;
    const leg =
      i < 400 ? 0.0006 : i < 700 ? -0.0009 : i < 760 ? -0.004 : i < 1100 ? 0.0012 : -0.0005;
    const cyc = 0.004 * Math.sin((2 * Math.PI * i) / 40) + 0.002 * Math.sin((2 * Math.PI * i) / 9);
    const o = p;
    const c = p * (1 + leg + cyc * 0.5 + noise);
    const body = Math.abs(c - o) / o;
    const wick = 0.002 + Math.abs(Math.sin(i * 1.7)) * 0.003;
    out.push({
      t: T0 + i * BAR_MS,
      o,
      h: Math.max(o, c) * (1 + wick),
      l: Math.min(o, c) * (1 - wick),
      c,
      v: (100 + 60 * Math.abs(Math.sin(i * 0.37))) * (1 + body * 150) * (i % 37 === 0 ? 3 : 1),
    });
    p = c;
  }
  return out;
}
const onsets = (st: Int8Array) => {
  const out = new Int8Array(st.length);
  for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) out[i] = st[i];
  return out;
};
const stateOf = (id: string, cs: readonly Candle[]) =>
  INDICATION_BY_ID.get(id)!.fn(new SeriesCache(toBars(cs)));
/** First bar compared with the desk: every indicator (VWAP 240, MACD / Stochastic seeds) warmed up. */
const FROM = 260;
const DATA: Array<[string, Candle[]]> = [
  ["scripted", scripted()],
  ["desk 7", generateCandles(7, 64250, 0.007, 2000)],
  ["desk 11", generateCandles(11, 3412, 0.01, 2000)],
  ["desk 23", generateCandles(23, 0.624, 0.016, 2000)],
];
const diffs = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  const out: number[] = [];
  for (let i = FROM; i < a.length; i++) if ((a[i] || 0) !== (b[i] || 0)) out.push(i);
  return out;
};

// ── tests ───────────────────────────────────────────────────────────────────────────────────────────────
describe("Stable-02 ports: registry", () => {
  it("every ported id is registered once, every s2 source has its short / medium signal ids", () => {
    const specs = stable02Specs();
    assert.equal(specs.length, S2_ENTRIES.length * 2 + S2_INDICATIONS.length);
    assert.equal(new Set(specs.map((x) => x.id)).size, specs.length);
    for (const x of specs) {
      assert.ok(x.id.startsWith("s2-"), x.id);
      assert.equal(INDICATION_BY_ID.get(x.id)?.fn, x.fn, x.id);
    }
    const s2 = SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-"));
    assert.equal(s2.length, S2_ENTRIES.length);
    for (const e of S2_ENTRIES) {
      const src = s2.find((x) => x.name === `s2-${e.id}`)!;
      assert.equal(src.short, s2EntryId(e.id, "short"));
      assert.equal(src.medium, s2EntryId(e.id, "medium"));
      for (const r of ["short", "medium"] as const) {
        const sig = INDICATION_BY_ID.get(signalId(src.name, r));
        assert.ok(sig, signalId(src.name, r));
        assert.equal(sig.fn, INDICATION_BY_ID.get(src[r])!.fn);
      }
    }
    // sources on by default
    assert.ok(s2.every((x) => signalSettings({}).sources[x.name] !== false));
  });

  it("every port returns a state per bar and fires long and short on the test series", () => {
    for (const x of stable02Specs()) {
      let up = 0;
      let dn = 0;
      for (const [, cs] of DATA) {
        const st = x.fn(new SeriesCache(toBars(cs)));
        assert.equal(st.length, cs.length, x.id);
        const on = onsets(st);
        for (let i = 0; i < on.length; i++) {
          if (on[i] > 0) up++;
          else if (on[i] < 0) dn++;
        }
      }
      assert.ok(up > 0 && dn > 0, `${x.id}: ${up} long / ${dn} short onsets`);
    }
  });

  it("mirrored prices flip every port's direction (confluence's RSI bands overlap: excluded)", () => {
    const cs = DATA[0][1];
    const m = mirror(cs);
    for (const x of stable02Specs()) {
      if (x.id.startsWith("s2-confluence")) continue;
      const a = x.fn(new SeriesCache(toBars(cs)));
      const b = x.fn(new SeriesCache(toBars(m)));
      const bad = diffs(
        a,
        Array.from(b, (v) => -v),
      );
      assert.ok(bad.length <= 2, `${x.id}: ${bad.length} bars differ (${bad.slice(0, 5)})`);
    }
  });
});

describe("Stable-02 ports: same signals as the desk", () => {
  for (const e of S2_ENTRIES) {
    it(`entry ${e.id} (short = the desk's parameters)`, () => {
      for (const [name, cs] of [
        ...DATA,
        ["desk 7 mirrored", mirror(DATA[1][1])] as [string, Candle[]],
      ]) {
        const ref = signalFor(e.id, cs, computeIndicators(cs));
        const st = stateOf(s2EntryId(e.id, "short"), cs);
        // Supertrend: the desk's flip events are the onsets of the ported direction state
        const got = e.id === "st-trail" ? onsets(st) : st;
        const bad = diffs(got, ref);
        assert.equal(bad.length, 0, `${e.id} on ${name}: bars ${bad.slice(0, 8)}`);
      }
    });
  }

  const IND_MAP: Record<string, string> = {
    "trend-ema": "ema-9-21", // already in the registry
    "trend-adx": "s2-trend-adx",
    "trend-st": "s2-st-trail", // the ported Supertrend's direction state
    "break-vol": "s2-break-vol",
    "break-atr": "s2-break-atr",
    "break-hi": "s2-break-hi",
    "active-hf": "s2-act-hf",
    "active-range": "s2-act-range",
    "active-burst": "s2-act-burst",
    "dir-cross": "s2-dir-cross",
    "dir-st": "s2-dir-st",
    "dir-axis": "s2-dir-axis",
    "dir-macd": "s2-dir-macd",
  };
  it("every desk indication maps onto a registry state with the same direction", () => {
    assert.deepEqual(Object.keys(IND_MAP).sort(), INDICATION_CONFIGS.map((c) => c.id).sort());
    for (const [name, cs] of DATA) {
      const pack = computeIndicators(cs);
      for (const cfg of INDICATION_CONFIGS) {
        const st = stateOf(IND_MAP[cfg.id], cs);
        const ref = cs.map((_, i) => processIndication(cfg, pack, cs, i).dir);
        const bad = diffs(st, ref);
        assert.equal(bad.length, 0, `${cfg.id} on ${name}: bars ${bad.slice(0, 8)}`);
      }
    }
  });

  it("not ported (already equivalent): normal = EMA 9/21 cross onsets, macd-mom = MACD signal cross onsets", () => {
    for (const [name, cs] of DATA) {
      const pack = computeIndicators(cs);
      assert.deepEqual(
        diffs(onsets(stateOf("ema-9-21", cs)), signalFor("normal", cs, pack)),
        [],
        name,
      );
      assert.deepEqual(
        diffs(onsets(stateOf("macd-cross", cs)), signalFor("macd-mom", cs, pack)),
        [],
        name,
      );
    }
  });
});

describe("Stable-02 ports: hand-built onsets", () => {
  /** flat 1 % chop of `n` bars at 100, volume 100 */
  const flat = (n: number): Candle[] =>
    Array.from({ length: n }, (_, i) => {
      const up = i % 2 === 0;
      return {
        t: T0 + i * BAR_MS,
        o: up ? 99.8 : 100.2,
        h: 100.5,
        l: 99.5,
        c: up ? 100.2 : 99.8,
        v: 100,
      };
    });
  const bar = (i: number, o: number, c: number, v: number, wick = 0.2): Candle => ({
    t: T0 + i * BAR_MS,
    o,
    h: Math.max(o, c) + wick,
    l: Math.min(o, c) - wick,
    c,
    v,
  });
  const at = (id: string, cs: Candle[]) => stateOf(id, cs)[cs.length - 1];

  it("vol-break: a 2× volume bar closing up above SMA 20 is long, mirrored short", () => {
    const cs = [...flat(80), bar(80, 100, 101.5, 200)];
    assert.equal(at("s2-vol-break", cs), 1);
    assert.equal(at("s2-vol-break", mirror(cs)), -1);
    // 1.7× volume: below the desk's 1.8× gate
    assert.equal(at("s2-vol-break", [...flat(80), bar(80, 100, 101.5, 170)]), 0);
  });

  it("range-break: close above the 20-bar high on 1.2× volume with a bar over 1.1 × ATR", () => {
    const cs = [...flat(80), bar(80, 100.2, 102, 125)];
    assert.equal(at("s2-range-break", cs), 1);
    assert.equal(at("s2-range-break", mirror(cs)), -1);
    // the slow range (40 bars) sees the same flat range
    assert.equal(at("s2-range-break-m", cs), 1);
    // 1.1× volume: below the 1.15× gate
    assert.equal(at("s2-range-break", [...flat(80), bar(80, 100.2, 102, 110)]), 0);
  });

  it("block-stack: 3 of the last 4 bars up on volume, close above EMA 9", () => {
    const base = flat(80);
    const cs = [
      ...base,
      bar(80, 100, 100.4, 100),
      bar(81, 100.4, 100.8, 100),
      bar(82, 100.8, 101.3, 110),
    ];
    assert.equal(at("s2-block-stack", cs), 1);
    assert.equal(at("s2-block-stack", mirror(cs)), -1);
  });

  it("st-trail: a sustained rally flips the Supertrend up (onset), a sell-off flips it down", () => {
    const cs = flat(80);
    let p = 100;
    for (let i = 80; i < 110; i++) cs.push(bar(i, p, (p += 0.8), 100));
    const st = stateOf("s2-st-trail", cs);
    const on = onsets(st);
    assert.ok(on.slice(80).includes(1), "long flip");
    for (let i = 110; i < 150; i++) cs.push(bar(i, p, (p -= 0.9), 100));
    assert.ok(onsets(stateOf("s2-st-trail", cs)).slice(110).includes(-1), "short flip");
  });

  it("rsi-revert: RSI < 32 at the lower band is long, > 68 at the upper band short", () => {
    const cs = flat(80);
    let p = 100;
    for (let i = 80; i < 90; i++) cs.push(bar(i, p, (p -= 0.6), 100));
    assert.equal(at("s2-rsi-revert", cs), 1);
    assert.equal(at("s2-rsi-revert", mirror(cs)), -1);
  });
});

describe("Stable-02 ATR exits", () => {
  const P = (a: Protect["atr"], hold = 3) => atrProtect(a!, hold);

  it("stop = k × ATR, target = ratio × stop, trail arms at 0.95 × stop with the desk's gap", () => {
    const p = P({ sl: 1.15, tpRatio: 2, trail: 0.8 });
    // nominal values at ATR 1 %: id / display / fallback
    assert.deepEqual([p.sl, p.tp, p.trail, p.hold], [0.0115, 0.023, 0.0109, 3]);
    const q = resolveAtrProtect(p, 0.004);
    assert.ok(Math.abs(q.sl - 0.0046) < 1e-9);
    assert.ok(Math.abs(q.tp - 0.0092) < 1e-9);
    assert.ok(Math.abs(q.trail - 0.95 * 0.0046) < 1e-9);
    // trailing distance = stop × (1 + (0.8 % − 0.8 %) × 6) = the stop distance
    assert.ok(Math.abs(q.trail * q.trailStep! - 0.0046) < 1e-9);
    assert.equal(q.atr, undefined, "resolved distances are plain");
    assert.ok(Math.abs(atrTrailGap(2.4) - 1.096) < 1e-12);
    assert.ok(Math.abs(atrTrailGap(0.1) - atrTrailGap(0.4)) < 1e-12, "trail at least 0.4 %");
    // no finite ATR: the desk's 1 % of price
    assert.deepEqual(resolveAtrProtect(p, NaN).sl, 0.0115);
    // short lanes: the engine's soft stop floor; the target follows the stop at its ratio
    const q1 = resolveAtrProtect(P({ sl: 1, tpRatio: 1 }), 0.001, 1);
    assert.ok(Math.abs(q1.sl - Math.hypot(0.001, LANE_MIN.sl)) < 1e-6);
    assert.ok(Math.abs(q1.tp - Math.max(q1.sl, LANE_MIN.tp)) < 1e-6);
    assert.equal(resolveAtrProtect(P({ sl: 1, tpRatio: 1 }), 0.001, 15).sl, 0.001);
    // every lane: the target never below 3 × the round-trip cost (a low-ATR 15m entry closed its target at a loss),
    // and a floored stop keeps the target / stop ratio
    assert.equal(resolveAtrProtect(P({ sl: 0.7, tpRatio: 1 }), 0.001, 15).tp, LANE_MIN.tp);
    const floored = resolveAtrProtect(
      { ...P({ sl: 0.7, tpRatio: 2.2 }), atr: { sl: 0.7, tpRatio: 2.2, minSl: 0.005 } },
      0.0025,
      15,
    );
    assert.equal(floored.sl, 0.005);
    assert.ok(Math.abs(floored.tp - 0.011) < 1e-9, `${floored.tp}`);
  });

  it("ids carry the ATR cell; lanes keep it; live feedback floors the resolved distances", () => {
    const p = P({ sl: 0.7, tpRatio: 2.2, trail: 0.8 });
    const id = configId("follow", "sig-s2-ema-cross-s@m15", p);
    assert.match(id, /\|atr0\.7x2\.2t0\.8$/);
    const back = parseConfigId(id)!;
    assert.deepEqual(back.protect.atr, { sl: 0.7, tpRatio: 2.2, trail: 0.8 });
    assert.equal(configId("follow", "sig-s2-ema-cross-s@m15", back.protect), id);
    assert.deepEqual(
      parseConfigId(configId("follow", "x", P({ sl: 1.5, tpRatio: 1 })))!.protect.atr,
      {
        sl: 1.5,
        tpRatio: 1,
      },
    );
    assert.equal(parseConfigId("follow|x|tp1|sl1|tr0|h4")!.protect.atr, undefined);
    const l = laneProtect(p, "x@m5");
    assert.deepEqual(l.atr, p.atr);
    assert.equal(l.hold, 9, "hold in equal time: 3 × 15m = 9 × 5m");
    const a = adjustProtect(p, { minSl: 0.01, minTrail: 0.008 });
    assert.equal(resolveAtrProtect(a, 0.002).sl, 0.01);
    assert.ok(
      resolveAtrProtect(a, 0.002).trail * resolveAtrProtect(a, 0.002).trailStep! >= 0.008 - 1e-9,
    );
  });

  // bars: signal at bar 20 (ATR known), entry at the open of bar 21
  function series(after: Array<[number, number, number, number]>) {
    const cs: Candle[] = [];
    for (let i = 0; i < 21; i++)
      cs.push({ t: T0 + i * BAR_MS, o: 100, h: 101, l: 99, c: 100, v: 100 });
    after.forEach(([o, h, l, c], j) => cs.push({ t: T0 + (21 + j) * BAR_MS, o, h, l, c, v: 100 }));
    return toBars(cs);
  }
  const sig20 = (n: number) => {
    const s = new Int8Array(n);
    s[20] = 1;
    return s;
  };

  it("simulate: stop, target and time exits at the ATR distances of the signal bar", () => {
    // true range 2 on every warm-up bar: ATR(14) = 2 = 2 % of the close
    const p = P({ sl: 1, tpRatio: 1.5 }, 5);
    const slHit = series([
      [100, 100.5, 97.9, 98],
      [98, 99, 97, 98],
    ]);
    const a = simulate("x", slHit, sig20(slHit.n), p, { cost: 0 });
    assert.equal(a.trades.length, 1);
    assert.equal(a.trades[0].reason, "sl");
    assert.ok(
      Math.abs(a.trades[0].exit - 98) < 1e-9,
      `stop at 100 × (1 − 2 %): ${a.trades[0].exit}`,
    );
    const tpHit = series([
      [100, 103.1, 99.5, 103],
      [103, 104, 102, 103],
    ]);
    const b = simulate("x", tpHit, sig20(tpHit.n), p, { cost: 0 });
    assert.equal(b.trades[0].reason, "tp");
    assert.ok(Math.abs(b.trades[0].exit - 103) < 1e-9, "target at 1.5 × the stop");
    const flat5 = series(
      Array.from(
        { length: 6 },
        () => [100, 100.5, 99.5, 100.2] as [number, number, number, number],
      ),
    );
    const c = simulate("x", flat5, sig20(flat5.n), p, { cost: 0 });
    assert.equal(c.trades[0].reason, "time");
    assert.equal(c.trades[0].bars, 5);
  });

  it("simulate: the ATR trail arms at 0.95 × stop and trails at the stop distance", () => {
    const p = P({ sl: 1, tpRatio: 3, trail: 0.8 }, 50);
    // stop 2 %: the trail arms once the high is 1.9 % up, then trails 2 % under the peak
    const b = series([
      [100, 101.5, 99.5, 101],
      [101, 104, 100.8, 103.8],
      [103.8, 104.2, 101.5, 101.6],
    ]);
    const r = simulate("x", b, sig20(b.n), p, { cost: 0 });
    assert.equal(r.trades[0].reason, "trail");
    assert.ok(Math.abs(r.trades[0].exit - 104 * 0.98) < 1e-9, `${r.trades[0].exit}`);
  });

  it("a pending ATR entry carries its resolved distances (live / paper get a concrete stop)", () => {
    const b = series([]);
    const r = simulate("x", b, sig20(b.n), P({ sl: 1.15, tpRatio: 2 }), { cost: 0 });
    assert.equal(r.pending, 1);
    assert.ok(r.pendingProtect && Math.abs(r.pendingProtect.sl - 0.023) < 1e-9);
    assert.ok(Math.abs(r.pendingProtect!.tp - 0.046) < 1e-9);
    // percent protects: no resolved copy
    assert.equal(
      simulate("x", b, sig20(b.n), { tp: 0.02, sl: 0.01, trail: 0, hold: 9 }, { cost: 0 })
        .pendingProtect,
      undefined,
    );
  });

  it("settings: exit model and ATR grid validated and defaulted", () => {
    const s = signalSettings({});
    assert.equal(s.exits, "pct");
    assert.deepEqual(s.atr, {
      sl: [0.7, 1.15, 1.5],
      tpRatio: [1, 1.6, 2.2],
      trail: [0.8],
      holdBars: 3,
    });
    assert.deepEqual(signalSettings({ atr: { ...s.atr, trail: [] } }).atr.trail, []);
    assert.equal(signalSettings({ exits: "x" as never }).exits, "pct");
    checkSettings({ signals: { ...s, exits: "atr" } });
    assert.throws(() => checkSettings({ signals: { ...s, exits: "x" as never } }));
    assert.throws(() => checkSettings({ signals: { ...s, atr: { ...s.atr, sl: [3] } } }));
    assert.throws(() => checkSettings({ signals: { ...s, atr: { ...s.atr, trail: [3] } } }));
    assert.throws(() =>
      checkSettings({
        signals: {
          ...s,
          atr: {
            ...s.atr,
            sl: [0.5, 1, 1.5, 2],
            tpRatio: [1, 1.5, 2, 2.5, 3],
            trail: [0.8, 1.4, 2],
          },
        },
      }),
    );
  });
});
