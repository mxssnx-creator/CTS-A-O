import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateAxis } from "./axis.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "../indications/cache.ts";
import type { Candle } from "../domain/types.ts";

const mk = (rows: Array<[number, number, number, number]>): Candle[] => rows.map(([o, h, l, c], i) => ({ t: i * 900_000, o, h, l, c, v: 1 }));
const P = { tp: 0.02, sl: 0.01, trail: 0, hold: 20 };
const AX = { levels: 2, spacing: 1, ratio: 1, minDisp: 0.35, maxDisp: 2.6, center: 50 };

describe("axis", () => {
  // axis at 100, ATR 1: price 98.5 is 1.5 ATR below → a long toward the axis
  const rows: Array<[number, number, number, number]> = [
    [98.5, 98.6, 98.4, 98.5], // signal bar
    [98.5, 98.6, 97.4, 97.6], // base at 98.5, rung at 97.5 fills
    [97.6, 100.2, 97.5, 100], // axis 100 reached (target)
  ];
  const b = barsFromCandles("X", 15, mk(rows));
  const center = new Float64Array([100, 100, 100]);
  const atr = new Float64Array([1, 1, 1]);

  it("ladders toward the axis and takes profit at the axis price, cost per leg", () => {
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0]), P, AX, center, atr, 0.002);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.kind, "axis");
    assert.equal(t.reason, "tp");
    assert.equal(t.vol, 2);
    assert.equal(t.exit, 100);
    const expect = (100 - 98.5) / 98.5 + (100 - 97.5) / 97.5 - 0.004;
    assert.ok(Math.abs(t.r - expect) < 1e-12, `${t.r} vs ${expect}`);
  });

  it("never trades away from the axis or outside the displacement band", () => {
    assert.equal(simulateAxis("c", b, new Int8Array([-1, 0, 0]), P, AX, center, atr, 0.002).trades.length, 0, "short below the axis");
    assert.equal(simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, maxDisp: 1 }, center, atr, 0.002).trades.length, 0, "too far");
    assert.equal(simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, minDisp: 2 }, center, atr, 0.002).trades.length, 0, "too close");
  });

  it("stops beyond the last rung", () => {
    const down = barsFromCandles("X", 15, mk([
      [98.5, 98.6, 98.4, 98.5],
      [98.5, 98.6, 97.4, 97.6],
      [97.6, 97.6, 96, 96.2],
    ]));
    const r = simulateAxis("c", down, new Int8Array([1, 0, 0]), P, AX, center, atr, 0.002);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 97.5 * 0.99) < 1e-9);
  });

  it("uses no future bars (trades on a prefix are identical)", () => {
    const full = barsFromCandles("AAA", 15, syntheticCandles("AAA", 15, 900, Date.UTC(2026, 8, 20)));
    let seed = 9;
    const sig = new Int8Array(full.n).map(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 < 0.5 ? 1 : -1));
    const run = (n: number) => {
      const bb = { ...full, n, t: full.t.slice(0, n), o: full.o.slice(0, n), h: full.h.slice(0, n), l: full.l.slice(0, n), c: full.c.slice(0, n), v: full.v.slice(0, n) };
      const kk = new SeriesCache(bb);
      return simulateAxis("c", bb, sig.slice(0, n), P, { ...AX, levels: 3, spacing: 0.7 }, kk.ema(50), kk.atr(14), 0).trades;
    };
    const a = run(900);
    const cut = 600;
    const b2 = run(cut);
    const closedBefore = a.filter((t) => t.exitT <= full.t[cut - 1]);
    assert.ok(a.length > 0);
    assert.deepEqual(b2.slice(0, closedBefore.length), closedBefore);
  });
});
