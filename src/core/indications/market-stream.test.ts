import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketSource, IncrementalMarkets } from "./market.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Bars } from "../domain/types.ts";

const cut = (b: Bars, n: number): Bars => ({
  ...b,
  n,
  t: b.t.slice(0, n),
  o: b.o.slice(0, n),
  h: b.h.slice(0, n),
  l: b.l.slice(0, n),
  c: b.c.slice(0, n),
  v: b.v.slice(0, n),
});
function same(a: Float64Array, b: Float64Array, label: string) {
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++)
    if (!Object.is(a[i], b[i])) assert.fail(`${label} ${i}: ${a[i]} != ${b[i]}`);
}
describe("incremental equal-weight market grids", () => {
  it("matches full returns, cumulative index, activity, reference peers and higher views exactly", () => {
    const full = Array.from({ length: 20 }, (_, i) =>
      barsFromCandles(`S${i}`, 1, syntheticCandles(`S${i}`, 1, 400, 400 * 60_000)),
    );
    const stream = new IncrementalMarkets();
    for (let n = 120; n <= 400; n += 7) {
      const input = full.map((b) => cut(b, n));
      const actual = new MarketSource(input, stream),
        expected = new MarketSource(input);
      for (const factor of [1, 5, 15]) {
        const a = actual.grid(1, factor),
          b = expected.grid(1, factor);
        for (const k of ["t", "ret", "idx", "act"] as const) same(a[k], b[k], `${factor} ${k}`);
      }
      const a = actual.reference(input[1], "S0", 1)!,
        b = expected.reference(input[1], "S0", 1)!;
      for (const key of ["ret", "idx", "act"] as const) same(a[key], b[key], `peer ${key}`);
    }
  });
  it("refuses a late constituent observation or a changed population instead of changing prior evidence", () => {
    const all = ["A", "B"].map((s) =>
      barsFromCandles(s, 1, syntheticCandles(s, 1, 130, 130 * 60_000)),
    );
    const stream = new IncrementalMarkets();
    new MarketSource([cut(all[0], 125), cut(all[1], 120)], stream).grid(1);
    assert.throws(
      () => new MarketSource([cut(all[0], 126), cut(all[1], 126)], stream).grid(1),
      /late peer/,
    );
    assert.throws(
      () => new MarketSource([cut(all[0], 126)], stream).grid(1),
      /constituents changed/,
    );
  });
});
