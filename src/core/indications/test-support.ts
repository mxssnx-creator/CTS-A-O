import type { Candle } from "../domain/types.ts";
import type { LowRangeMethod, LowRangeRelation, LowRangeWindow } from "./low-range-research.ts";

/** Small upward close drift within established, steady wide ranges: ADX can be strong while extension is bounded.
 * The earlier shock/recovery fixtures exercise a different regime and need not fire every trend-context subset. */
export function controlledRetestTrend(n = 2400, end = Date.UTC(2026, 9, 1)): Candle[] {
  const out: Candle[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const o = price;
    price *= 1.00002;
    out.push({ t: end - (n - i) * 60_000, o, c: price, h: price * 1.01, l: o * 0.99, v: 1000 });
  }
  return out;
}

/** Matching bounded channel with an aligned or opposed prior move, mirrored for the other side.
 * This deliberately exercises conjunctions too rare to be guaranteed on a random walk. */
export function controlledLowRange(
  window: LowRangeWindow, method: LowRangeMethod, relation: LowRangeRelation, side: 1 | -1,
): Candle[] {
  const old = Array.from({ length: window }, (_, i) => ({
    t: i * 60_000, o: 100, c: 100, h: 101.5, l: 98.5, v: 100,
  }));
  const recent = Array.from({ length: window }, (_, i) => {
    const lastSix = i >= window - 6;
    const c = i === 0 ? (relation.endsWith("move-reverse") ? 100.1 : 99.2) : lastSix ? 99.55 : 99.3;
    return { t: (window + i) * 60_000, o: c, c, h: lastSix ? 99.65 : 100.8,
      l: lastSix ? 99.4 : 99.2, v: 100 };
  });
  const close = method === "breakout" || method === "compression-break" ? 101
    : method === "mid-reclaim" ? 100.05 : 99.75;
  const tail = { t: 2 * window * 60_000, o: 99.55, c: close, h: Math.max(99.85, close + 0.05),
    l: method === "failed-break" ? 99.1 : 99.5, v: 400 };
  return [...old, ...recent, tail].map((c) => side === 1 ? c
    : { ...c, o: 200 - c.o, c: 200 - c.c, h: 200 - c.l, l: 200 - c.h });
}
