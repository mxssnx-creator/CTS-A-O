import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Bars, Candle } from "../domain/types.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID } from "./registry.ts";
import { relativeVigorIndex, research4Specs, rviCross } from "./research4.ts";

const T0 = Date.UTC(2026, 9, 1);
const bars = (cs: Candle[], tf = 15) => barsFromCandles("RVI-USDT", tf, cs);
const state = (b: Bars, period: number) => rviCross(b, period);
const reflected = (cs: Candle[]): Candle[] =>
  cs.map((x) => ({ ...x, o: 400 - x.o, c: 400 - x.c, h: 400 - x.l, l: 400 - x.h }));

describe("research RVI: frozen causal weighted formula", () => {
  it("matches a rational hand calculation of weighted numerators, period sums and signal weights", () => {
    const changes = [1, 2, -1, 3, -2, 4, -3, 5, -4, 6];
    const ranges = [6, 8, 7, 10, 9, 12, 11, 14, 13, 16];
    const b = bars(
      changes.map((x, i) => ({
        t: T0 + i * 15 * 60_000,
        o: 100,
        c: 100 + x,
        h: 100 + ranges[i] / 2,
        l: 100 - ranges[i] / 2,
        v: 10,
      })),
    );
    const x = relativeVigorIndex(b, 2);
    assert.ok(x.rvi.slice(0, 4).every(Number.isNaN));
    // At index4: numerator windows are6 and4, denominator windows46 and51.
    assert.equal(x.rvi[4], 10 / 97);
    assert.equal(x.rvi[5], 9 / 108);
    assert.equal(x.rvi[6], 9 / 120);
    assert.equal(x.rvi[7], 9 / 132);
    assert.ok(x.signal.slice(0, 7).every(Number.isNaN));
    assert.equal(x.signal[7], (9 / 132 + 2 * (9 / 120) + 2 * (9 / 108) + 10 / 97) / 6);
    for (const p of [0, -1, NaN, Infinity, 1.5])
      assert.throws(() => relativeVigorIndex(b, p), /positive integer/);
  });

  it("has exact prefix parity at different cuts and never reads appended future values", () => {
    for (const tf of [1, 5, 15, 30]) {
      const cs = syntheticCandles("RVI-prefix", tf, 480, T0, 23);
      for (const p of [10, 20]) {
        const full = state(bars(cs, tf), p);
        for (const cut of [p + 3, p + 7, 100, 291])
          assert.deepEqual([...state(bars(cs.slice(0, cut), tf), p)], [...full.slice(0, cut)]);
        const future = cs.map((x, i) =>
          i < 291 ? x : { ...x, o: 10_000, c: 20_000, h: 30_000, l: 1 },
        );
        assert.deepEqual([...state(bars(future, tf), p).slice(0, 291)], [...full.slice(0, 291)]);
      }
    }
  });

  it("fires both directions, mirrors exactly, and only emits sign-aligned signal-line crosses", () => {
    const cs = syntheticCandles("RVI-symmetry", 15, 1800, T0, 4);
    for (const p of [10, 20]) {
      const b = bars(cs);
      const actual = state(b, p);
      const inverse = state(bars(reflected(cs)), p);
      const x = relativeVigorIndex(b, p);
      assert.ok(actual.includes(1), `period${p}: long fixture`);
      assert.ok(actual.includes(-1), `period${p}: short fixture`);
      for (let i = 0; i < actual.length; i++) {
        assert.equal(actual[i] + inverse[i], 0, `period${p} bar${i}`);
        if (actual[i] === 1)
          assert.ok(x.rvi[i] > 0 && x.rvi[i] > x.signal[i] && x.rvi[i - 1] <= x.signal[i - 1]);
        if (actual[i] === -1)
          assert.ok(x.rvi[i] < 0 && x.rvi[i] < x.signal[i] && x.rvi[i - 1] >= x.signal[i - 1]);
      }
      assert.ok(
        actual.slice(0, p + 6).every((x) => x === 0),
        "first cross needs the previous complete signal line",
      );
    }
  });

  it("a zero denominator remains unknown and cannot manufacture a cross", () => {
    const cs = Array.from({ length: 100 }, (_, i) => ({
      t: T0 + i * 15 * 60_000,
      o: 100,
      h: 100,
      l: 100,
      c: 100,
      v: 0,
    }));
    for (const p of [10, 20]) {
      const b = bars(cs);
      const x = relativeVigorIndex(b, p);
      assert.ok(x.rvi.every(Number.isNaN));
      assert.ok(x.signal.every(Number.isNaN));
      assert.ok(state(b, p).every((v) => v === 0));
    }
  });

  it("time gaps and invalid OHLC restart warmup and recover identically to a fresh suffix", () => {
    const cs = syntheticCandles("RVI-reset", 15, 500, T0, 4);
    for (const p of [10, 20]) {
      for (const column of ["t", "o", "h", "l", "c"] as const) {
        const b = bars(cs);
        b[column][170] = NaN;
        const out = state(b, p);
        assert.ok(
          out.slice(170, 171 + p + 6).every((v) => v === 0),
          column,
        );
        assert.deepEqual([...out.slice(171)], [...state(bars(cs.slice(171)), p)], column);
      }
      const gap = cs.map((x, i) => (i < 170 ? x : { ...x, t: x.t + 15 * 60_000 }));
      assert.deepEqual([...state(bars(gap), p).slice(170)], [...state(bars(gap.slice(170)), p)]);
      const invalid = bars(cs);
      invalid.h[170] = invalid.l[170] - 1;
      assert.deepEqual([...state(invalid, p).slice(171)], [...state(bars(cs.slice(171)), p)]);
    }
  });

  it("registered short/medium specs retain frozen parameters and memoize independently", () => {
    const cache = new SeriesCache(bars(syntheticCandles("RVI-registry", 15, 300, T0)));
    assert.deepEqual(
      research4Specs().map((x) => [x.id, x.params]),
      [
        ["r-rvi", { period: 10 }],
        ["r-rvi-m", { period: 20 }],
      ],
    );
    for (const id of ["r-rvi", "r-rvi-m"]) {
      const spec = INDICATION_BY_ID.get(id)!;
      assert.ok(spec);
      assert.equal(spec.fn(cache), spec.fn(cache));
    }
    assert.notEqual(
      INDICATION_BY_ID.get("r-rvi")!.fn(cache),
      INDICATION_BY_ID.get("r-rvi-m")!.fn(cache),
    );
  });
});
