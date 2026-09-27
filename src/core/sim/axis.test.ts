import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { axisSpacing, simulateAxis } from "./axis.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "../indications/cache.ts";
import type { Candle } from "../domain/types.ts";

const mk = (rows: Array<[number, number, number, number]>): Candle[] =>
  rows.map(([o, h, l, c], i) => ({ t: i * 900_000, o, h, l, c, v: 1 }));
const P = { tp: 0.02, sl: 0.01, trail: 0, hold: 20 };
// the former fixed exits (target = the axis at the signal, stop beyond the last rung)
const AX = {
  levels: 2,
  spacing: 1,
  ratio: 1,
  minDisp: 0.35,
  maxDisp: 2.6,
  center: 50,
  exits: "fixed" as const,
};

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
    assert.equal(
      simulateAxis("c", b, new Int8Array([-1, 0, 0]), P, AX, center, atr, 0.002).trades.length,
      0,
      "short below the axis",
    );
    assert.equal(
      simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, maxDisp: 1 }, center, atr, 0.002)
        .trades.length,
      0,
      "too far",
    );
    assert.equal(
      simulateAxis("c", b, new Int8Array([1, 0, 0]), P, { ...AX, minDisp: 2 }, center, atr, 0.002)
        .trades.length,
      0,
      "too close",
    );
  });

  it("stops beyond the last rung", () => {
    const down = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 97.4, 97.6],
        [97.6, 97.6, 96, 96.2],
      ]),
    );
    const r = simulateAxis("c", down, new Int8Array([1, 0, 0]), P, AX, center, atr, 0.002);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 97.5 * 0.99) < 1e-9);
  });

  it("uses no future bars (trades on a prefix are identical)", () => {
    const full = barsFromCandles(
      "AAA",
      15,
      syntheticCandles("AAA", 15, 900, Date.UTC(2026, 8, 20)),
    );
    let seed = 9;
    const sig = new Int8Array(full.n).map(() =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 < 0.5 ? 1 : -1,
    );
    const run = (n: number) => {
      const bb = {
        ...full,
        n,
        t: full.t.slice(0, n),
        o: full.o.slice(0, n),
        h: full.h.slice(0, n),
        l: full.l.slice(0, n),
        c: full.c.slice(0, n),
        v: full.v.slice(0, n),
      };
      const kk = new SeriesCache(bb);
      return simulateAxis(
        "c",
        bb,
        sig.slice(0, n),
        P,
        { ...AX, levels: 3, spacing: 0.7 },
        kk.ema(50),
        kk.atr(14),
        0,
      ).trades;
    };
    const a = run(900);
    const cut = 600;
    const b2 = run(cut);
    const closedBefore = a.filter((t) => t.exitT <= full.t[cut - 1]);
    assert.ok(a.length > 0);
    assert.deepEqual(b2.slice(0, closedBefore.length), closedBefore);
  });
});

describe("axis: managed exits (old desk handling)", () => {
  const center = new Float64Array([100, 100, 100, 100]);
  const atr = new Float64Array([1, 1, 1, 1]);
  const AXM = { levels: 1, spacing: 1, ratio: 1, minDisp: 0.35, maxDisp: 2.6, center: 50 };
  const cost = 0.002;

  it("target just past the axis, tightened toward it on the next closed bar; stop = min(step, target distance)", () => {
    // fill 98.5 (signal bar: axis 100, ATR 1): step 1, target max(100.25, 99.35) = 100.25, stop 97.5;
    // after bar 1: target tightens to max(100 + 0.2, 98.5 + 0.95) = 100.2
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 100.3, 98.4, 100.1],
        [100.1, 100.2, 100, 100.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    assert.equal(r.trades.length, 1);
    const t = r.trades[0];
    assert.equal(t.reason, "tp");
    assert.ok(Math.abs(t.exit - 100.2) < 1e-9, `exit ${t.exit}`);
    assert.ok(Math.abs(t.r - ((100.2 - 98.5) / 98.5 - cost)) < 1e-12);
  });

  it("moves the stop to breakeven after 0.85 risk", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 99.5, 98.4, 99.4], // close 99.4 ≥ 98.5 + 0.85 → breakeven
        [99.4, 99.5, 98, 98.2], // back down: out at 98.5
        [98.2, 98.3, 98, 98.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 98.5) < 1e-9);
    assert.ok(Math.abs(r.trades[0].r + cost) < 1e-12, "breakeven pays only the cost");
  });

  it("the stop is never wider than the target distance (a loss is at most one step)", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [98.5, 98.6, 98.4, 98.5],
        [98.5, 98.6, 96, 96.2],
        [96.2, 96.3, 96, 96.1],
        [96.1, 96.2, 96, 96.1],
      ]),
    );
    const r = simulateAxis("c", b, new Int8Array([1, 0, 0, 0]), P, AXM, center, atr, cost);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(Math.abs(r.trades[0].exit - 97.5) < 1e-9, `${r.trades[0].exit}`);
  });

  it("range types set the rung spacing", () => {
    assert.equal(axisSpacing("atr", 0.7, 100, 2), 1.4);
    assert.ok(Math.abs(axisSpacing("linear", 0.7, 100, 2) - (1.26 + 0.5)) < 1e-12);
    assert.ok(Math.abs(axisSpacing("geo", 0.7, 100, 2) - 0.875) < 1e-12);
    assert.ok(Math.abs(axisSpacing("fib", 0.7, 100, 2) - 1.618) < 1e-12);
  });
});
