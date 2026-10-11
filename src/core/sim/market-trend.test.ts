// Signals: the market's short-term move as a side rule (10 Oct). A long opens only when the market's median return over
// `hours` is not up, a short only when it is not down. Causal: the median at time t reads only bars closed by t.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars } from "../domain/types.ts";
import { marketSideAllows, marketTrendOf } from "./market-trend.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 6);

/** hourly bars from a list of closes (bar i opens at T0 + i hours; the close is known one bar later) */
function hourly(sym: string, closes: number[]): Bars {
  const n = closes.length;
  const t = new Float64Array(n);
  const c = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    t[i] = T0 + i * H;
    c[i] = closes[i];
  }
  const z = () => new Float64Array(n);
  return { sym, tfMin: 60, n, t, o: c, h: c, l: c, c, v: z() } as Bars;
}

describe("the market median return over a window", () => {
  it("is the median of the symbols' returns over the hours before t", () => {
    // three symbols: +10 %, -5 %, +2 % over 2 h; the median is +2 %
    const bars = [
      hourly("A", [100, 105, 110, 110]),
      hourly("B", [100, 97, 95, 95]),
      hourly("C", [100, 101, 102, 102]),
    ];
    const trend = marketTrendOf(bars, 2);
    // at t = T0 + 3 h the last close known opened at T0 + 2 h (A 110, B 95, C 102); two hours earlier the last close
    // known opened at T0 (100 each): A +10 %, B -5 %, C +2 %
    assert.ok(Math.abs(trend.at(T0 + 3 * H) - 0.02) < 1e-12, `median ${trend.at(T0 + 3 * H)}`);
  });

  it("reads only the bars closed by t (a later bar changes nothing at t)", () => {
    const base = [hourly("A", [100, 101, 102, 103]), hourly("B", [100, 99, 98, 97]), hourly("C", [100, 100, 101, 100])];
    const later = [hourly("A", [100, 101, 102, 500]), hourly("B", [100, 99, 98, 1]), hourly("C", [100, 100, 101, 1])];
    const t = T0 + 2 * H;
    assert.equal(marketTrendOf(base, 1).at(t), marketTrendOf(later, 1).at(t), "a bar after t moves nothing");
  });

  it("is NaN with fewer than three symbols that have both prices, so the side rule refuses", () => {
    const trend = marketTrendOf([hourly("A", [100, 101, 102]), hourly("B", [100, 99, 98])], 1);
    assert.ok(Number.isNaN(trend.at(T0 + 2 * H)), "two symbols are not a market");
  });

  it("is NaN before the window is long enough (no bar closed `hours` before t)", () => {
    const bars = [hourly("A", [100, 101, 102]), hourly("B", [100, 99, 98]), hourly("C", [100, 100, 100])];
    assert.ok(Number.isNaN(marketTrendOf(bars, 6).at(T0 + 2 * H)), "not enough history");
  });
});

describe("the side rule", () => {
  it("opens a long only when the market is not up, and a short only when it is not down", () => {
    assert.equal(marketSideAllows(1, -0.01), true, "long after a dip");
    assert.equal(marketSideAllows(1, 0), true, "long at flat");
    assert.equal(marketSideAllows(1, 0.01), false, "long into a rise is refused");
    assert.equal(marketSideAllows(-1, 0.01), true, "short after a bounce");
    assert.equal(marketSideAllows(-1, 0), true, "short at flat");
    assert.equal(marketSideAllows(-1, -0.01), false, "short into a fall is refused");
  });

  it("refuses a side when the market is not known (NaN)", () => {
    assert.equal(marketSideAllows(1, Number.NaN), false);
    assert.equal(marketSideAllows(-1, Number.NaN), false);
  });
});
