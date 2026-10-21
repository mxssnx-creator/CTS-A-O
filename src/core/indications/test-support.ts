import type { Candle } from "../domain/types.ts";

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
