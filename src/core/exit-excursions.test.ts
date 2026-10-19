import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entryExcursions } from "./exit-strategy.ts";
import { barsFromCandles } from "./market/bars.ts";
import { rng } from "./test-support.ts";
import type { Bars } from "./domain/types.ts";

const T0 = Date.UTC(2026, 9, 17);
const MIN = 60_000;
const empty = (): Record<1 | -1, number[]> => ({ 1: [], [-1]: [] });

function fixture(n: number, seed = 1): Bars {
  const r = rng(seed);
  let price = 100;
  return barsFromCandles(
    "X-USDT",
    1,
    Array.from({ length: n }, (_, i) => {
      const o = price;
      price *= 1 + (r() - 0.5) * 0.01;
      return {
        t: T0 + i * MIN,
        o,
        c: price,
        h: Math.max(o, price) * (1 + r() * 0.01),
        l: Math.min(o, price) * (1 - r() * 0.01),
        v: 1,
      };
    }),
  );
}

/** Deliberately simple copy of the old per-direction/per-entry scan, independent of the rolling extrema. */
function reference(b: Bars, sig: Int8Array, hold: number, cutT: number, fromT: number) {
  const mfe = empty();
  const mae = empty();
  for (const side of [1, -1] as const) {
    const own = new Int8Array(sig.length);
    for (let i = 0; i < sig.length; i++) if (sig[i] === side) own[i] = side;
    for (let i = 0; i + hold < b.n; i++) {
      if (!own[i]) continue;
      if (b.t[i + 1] < fromT) continue;
      if (b.t[i + hold] + b.tfMin * MIN > cutT) break;
      const entry = b.o[i + 1];
      if (!(entry > 0)) continue;
      let favorable = 0;
      let adverse = 0;
      for (let j = i + 1; j <= i + hold; j++) {
        const f = side === 1 ? b.h[j] / entry - 1 : 1 - b.l[j] / entry;
        const a = side === 1 ? 1 - b.l[j] / entry : b.h[j] / entry - 1;
        if (f > favorable) favorable = f;
        if (a > adverse) adverse = a;
      }
      mfe[side].push(favorable);
      mae[side].push(adverse);
    }
  }
  return { mfe, mae };
}

function rolling(b: Bars, sig: Int8Array, hold: number, cutT: number, fromT: number) {
  const mfe = empty();
  const mae = empty();
  entryExcursions(b, sig, hold, cutT, fromT, mfe, mae);
  return { mfe, mae };
}

describe("Exit rolling excursion fit", () => {
  it("equals the per-entry reference exactly across 300 seeded histories, sparse signals and fit cuts", () => {
    const r = rng(20261017);
    for (let c = 0; c < 300; c++) {
      const n = 2 + Math.floor(r() * 300);
      const b = fixture(n, c + 1);
      const sig = Int8Array.from({ length: n }, () => (r() < 0.7 ? 0 : r() < 0.5 ? 1 : -1));
      const hold = 1 + Math.floor(r() * (n + 3));
      const fromT = T0 + Math.floor((r() * n) / 2) * MIN;
      const cutT = T0 + Math.floor(r() * (n + 1)) * MIN + (c % 2 ? MIN / 2 : 0);
      assert.deepEqual(
        rolling(b, sig, hold, cutT, fromT),
        reference(b, sig, hold, cutT, fromT),
        `case ${c}`,
      );
    }
  });

  it("preserves inclusive entry and final-bar boundaries and excludes signal/future bars", () => {
    const b = fixture(12);
    const sig = Int8Array.from([1, -1, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0]);
    const hold = 3;
    const fromT = b.t[1];
    const cutT = b.t[7] + MIN;
    const expected = reference(b, sig, hold, cutT, fromT);
    assert.deepEqual(rolling(b, sig, hold, cutT, fromT), expected);
    b.h[0] = 1e9;
    b.l[0] = -1e9;
    for (let i = 8; i < b.n; i++) {
      b.h[i] = 1e9;
      b.l[i] = -1e9;
    }
    assert.deepEqual(rolling(b, sig, hold, cutT, fromT), expected);
    assert.deepEqual(
      rolling(b, sig, hold, cutT - 1, fromT),
      reference(b, sig, hold, cutT - 1, fromT),
    );
    assert.deepEqual(
      rolling(b, sig, hold, cutT, fromT + 1),
      reference(b, sig, hold, cutT, fromT + 1),
    );
  });

  it("handles deque wraparound, ties, disjoint windows and invalid price comparisons exactly", () => {
    const b = fixture(200);
    for (let i = 0; i < b.n; i++) {
      b.h[i] = i % 4 ? 120 : 110;
      b.l[i] = i % 3 ? 80 : 90;
    }
    const sig = Int8Array.from({ length: b.n }, (_, i) => (i % 5 === 0 ? 1 : i % 7 === 0 ? -1 : 0));
    for (const hold of [1, 2, 3, 8, 50, 199, 200, 201])
      assert.deepEqual(
        rolling(b, sig, hold, Infinity, -Infinity),
        reference(b, sig, hold, Infinity, -Infinity),
      );
    for (const [i, value] of [0, -1, NaN, Infinity].entries()) b.o[i + 1] = value;
    for (const [i, value] of [NaN, Infinity, -Infinity].entries()) {
      b.h[i + 3] = value;
      b.l[i + 6] = value;
    }
    sig.fill(1);
    for (let i = 0; i < b.n; i += 2) sig[i] = -1;
    sig[30] = 2;
    sig[31] = -2;
    for (const hold of [1, 2, 3, 8, 50])
      assert.deepEqual(
        rolling(b, sig, hold, Infinity, -Infinity),
        reference(b, sig, hold, Infinity, -Infinity),
      );
    const mfe = { 1: [123], [-1]: [456] };
    const mae = { 1: [789], [-1]: [101] };
    entryExcursions(b, sig, 8, Infinity, -Infinity, mfe, mae);
    const expected = reference(b, sig, 8, Infinity, -Infinity);
    assert.deepEqual(mfe, { 1: [123, ...expected.mfe[1]], [-1]: [456, ...expected.mfe[-1]] });
    assert.deepEqual(mae, { 1: [789, ...expected.mae[1]], [-1]: [101, ...expected.mae[-1]] });
  });

  it("matches a dense long-window fit with bounded runtime and reports comparison timings", (t) => {
    const b = fixture(24_000, 55);
    const sig = Int8Array.from({ length: b.n }, (_, i) => (i % 2 ? 1 : -1));
    const hold = 256;
    rolling(b, sig, hold, Infinity, -Infinity);
    reference(b, sig, hold, Infinity, -Infinity);
    const startReference = performance.now();
    const expected = reference(b, sig, hold, Infinity, -Infinity);
    const referenceMs = performance.now() - startReference;
    const startRolling = performance.now();
    const actual = rolling(b, sig, hold, Infinity, -Infinity);
    const rollingMs = performance.now() - startRolling;
    assert.deepEqual(actual, expected);
    t.diagnostic(
      `24,000 bars, hold 256: reference ${referenceMs.toFixed(2)}ms, rolling ${rollingMs.toFixed(2)}ms (${(referenceMs / rollingMs).toFixed(2)}x); two ${hold}-slot Int32 deques`,
    );
  });
});
