import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import type { Bars, MicroGrid, Protect, ProtectGridSpec, Side } from "./domain/types.ts";
import { baseRangeProtects, configId } from "./pipeline/pipeline.ts";
import { checkSettings } from "./settings-check.ts";
import { simulate } from "./sim/backtest.ts";
import { protectGrid } from "./sim/walkforward.ts";

const COST = 0.002;
const START = Date.UTC(2026, 9, 15);
const TF = 15 * 60_000;
const PLAIN = [["minimal", "mn"], ["short", "sh"], ["general", "gn"], ["long", "lg"]] as const;

function grid(name: "micro" | typeof PLAIN[number][0], range: MicroGrid, step = 1): ProtectGridSpec {
  return {
    ...DEFAULT_SETTINGS.grid,
    tp: [],
    holdH: [0.5],
    micro: false,
    minimal: false,
    short: false,
    general: false,
    long: false,
    [name]: range,
    trailStep: step,
    baseBest: true,
    baseTrailCells: true,
  };
}

function bars(rows: readonly (readonly [number, number, number, number])[]): Bars {
  return {
    sym: "A-USDT",
    tfMin: 15,
    n: rows.length,
    t: Float64Array.from(rows, (_, i) => START + i * TF),
    o: Float64Array.from(rows, (row) => row[0]),
    h: Float64Array.from(rows, (row) => row[1]),
    l: Float64Array.from(rows, (row) => row[2]),
    c: Float64Array.from(rows, (row) => row[3]),
    v: new Float64Array(rows.length).fill(1000),
  };
}

function mirrored(b: Bars): Bars {
  return {
    ...b,
    o: b.o.map((x) => 200 - x),
    h: b.l.map((x) => 200 - x),
    l: b.h.map((x) => 200 - x),
    c: b.c.map((x) => 200 - x),
  };
}

const id = (p: Protect) => configId("follow", "rsi-mom-14-20@m15", p);
const replay = (p: Protect, b: Bars, side: Side) =>
  simulate(id(p), b, Int8Array.of(side, ...new Array(b.n - 1).fill(0)), p, { cost: COST });

describe("range Base, grid and actual simulated protection agree", () => {
  it("every non-Micro range's own evaluation floor replaces the global floor in normal and trailing cells", () => {
    for (const [name, tag] of PLAIN)
      for (const minSlEval of [undefined, 0.002, 0.02]) {
        const g = grid(name, {
          tp: [0.008], slOfTp: [0.25, 0.5], trailOfTp: [0, 0.25],
          minSl: 0.001, minTrail: 0.001, minSlEval, ownBase: true, trailSlOfTp: 0.25,
        });
        const base = baseRangeProtects(g, COST).filter((p) => p.tag === tag);
        const actual = protectGrid(15, g, COST).filter((p) => p.tag === tag);
        const actualIds = new Set(actual.map(id));
        assert.ok(base.some((p) => p.trail === 0) && base.some((p) => p.trail > 0));
        for (const p of base) assert.ok(actualIds.has(id(p)), `${name} Base ${id(p)} missing from actual grid`);
        assert.deepEqual([...new Set(actual.map((p) => p.sl))].sort((a, b) => a - b),
          minSlEval === 0.002 ? [0.002, 0.004] : [minSlEval ?? 0.005]);
      }
  });

  it("own stop floors below and above the global floor determine real long and short exits", () => {
    for (const [name, tag] of PLAIN)
      for (const minSlEval of [0.002, 0.02])
        for (const side of [1, -1] as const) {
          const g = grid(name, {
            tp: [0.008], slOfTp: [0.25], trailOfTp: [0],
            minSl: 0.001, minSlEval, ownBase: true,
          });
          const base = baseRangeProtects(g, COST).find((p) => p.tag === tag)!;
          const actual = protectGrid(15, g, COST).find((p) => p.tag === tag)!;
          const adverse = minSlEval < 0.005 ? 0.003 : 0.006;
          const close = 100 * (1 - adverse / 2);
          const longBars = bars([
            [100, 100, 100, 100],
            [100, 100.01, 100 * (1 - adverse), close],
            [close, close + 0.01, close - 0.01, close],
          ]);
          const b = side === 1 ? longBars : mirrored(longBars);
          const result = replay(actual, b, side);
          assert.deepEqual(result, replay(base, b, side), `${name}/${minSlEval}/${side}`);
          assert.equal(result.trades.length, 1);
          const trade = result.trades[0];
          assert.equal(trade.reason, minSlEval < 0.005 ? "sl" : "time");
          assert.equal(trade.exitT, START + (minSlEval < 0.005 ? 2 : 3) * TF);
          const exit = minSlEval < 0.005 ? 100 * (1 - side * minSlEval) : b.c[2];
          assert.ok(Math.abs(trade.exit - exit) < 1e-10);
          assert.ok(Math.abs(trade.r - (side * (exit - 100) / 100 - COST)) < 1e-12);
        }
  });

  it("accepted custom stop floors cannot round below their minimum in Base or actual simulated exits", () => {
    for (const [name, tag] of [["micro", "mc"], ...PLAIN] as const)
      for (const lever of ["minSl", "minSlEval"] as const)
        for (const step of [0.25, 0.3, 0.5, 1, 2]) {
          // Ordinary ranges store four decimal places, Micro six: each fixture lies just above a price quantum.
          const floor = name === "micro" ? 0.0055404 : 0.00554;
          const expected = name === "micro" ? 0.005541 : 0.0056;
          const g = grid(name, {
            tp: [name === "micro" ? 0.002 : 0.008], slOfTp: [name === "micro" ? 1 : 0.25], trailOfTp: [0, 0.25],
            trailSlOfTp: 0.25, ownBase: true, minSl: 0.001, minTrail: 0.001, [lever]: floor,
          }, step);
          // Step >1 remains a supported direct-helper parity case; persisted settings currently permit at most1.
          checkSettings({ ...DEFAULT_SETTINGS, grid: { ...g, trailStep: Math.min(1, step) } });
          const actual = protectGrid(15, g, COST).filter((p) => p.tag === tag);
          assert.deepEqual(baseRangeProtects(g, COST).filter((p) => p.tag === tag), actual);
          assert.ok(actual.every((p) => p.sl >= floor));
          assert.ok(actual.every((p) => p.sl === expected));
          for (const side of [1, -1] as const) {
            const longBars = bars([
              [100, 100, 100, 100],
              [100, 100.01, 99.42, 99.5],
              [99.5, 99.51, 99.49, 99.5],
            ]);
            const result = replay(actual[0], side === 1 ? longBars : mirrored(longBars), side);
            assert.equal(result.trades[0].reason, "sl");
            assert.ok(Math.abs(result.trades[0].exit - 100 * (1 - side * expected)) < 1e-10);
            assert.ok(Math.abs(result.trades[0].r - (-expected - COST)) < 1e-12);
          }
        }
  });

  it("non-Micro optional floors inherit the same grid values in Base, while explicit zero and own values win", () => {
    const cases = [
      { minSl: undefined, minTrail: undefined, minSlEval: undefined, stop: 0.01, trail: 0.006 },
      { minSl: undefined, minTrail: undefined, minSlEval: 0.002, stop: 0.01, trail: 0.006 },
      { minSl: undefined, minTrail: undefined, minSlEval: 0.02, stop: 0.02, trail: 0.006 },
      { minSl: 0, minTrail: 0, minSlEval: 0.002, stop: 0.002, trail: 0.002 },
      { minSl: 0.015, minTrail: 0.009, minSlEval: undefined, stop: 0.015, trail: 0.009 },
      { minSl: 0.001, minTrail: 0.001, minSlEval: undefined, stop: 0.005, trail: 0.002 },
    ];
    for (const [name, tag] of PLAIN)
      for (const c of cases) {
        const g = grid(name, {
          tp: [0.008], slOfTp: [0.25], trailOfTp: [0, 0.25], ownBase: true,
          minSl: c.minSl, minTrail: c.minTrail, minSlEval: c.minSlEval,
        });
        g.minSl = 0.01;
        g.minTrail = 0.006;
        const actual = protectGrid(15, g, COST).filter((p) => p.tag === tag);
        assert.deepEqual(baseRangeProtects(g, COST).filter((p) => p.tag === tag), actual,
          `${name}/${JSON.stringify(c)}`);
        assert.equal(actual.find((p) => p.trail === 0)!.sl, c.stop);
        assert.equal(actual.find((p) => p.trail > 0)!.trail, c.trail);
      }
    // Micro's separate defaults must not inherit the much wider ordinary grid's floors.
    const micro = grid("micro", {
      tp: [0.002], slOfTp: [0.25], trailOfTp: [0, 0.025], minSlEval: 0.0005,
      ownBase: true, tpNetOfCost: true,
    }, 0.5);
    micro.minSl = 0.01;
    micro.minTrail = 0.006;
    const actual = protectGrid(15, micro, COST).filter((p) => p.tag === "mc");
    assert.deepEqual(baseRangeProtects(micro, COST).filter((p) => p.tag === "mc"), actual);
    assert.equal(actual[0].sl, 0.001);
    assert.equal(actual[1].trail * 0.5, 0.0005);
  });

  it("all ranges keep their actual minimum trailing gap at steps .25/.3/.5/1/2 without rounding below it", () => {
    for (const [name, tag] of [["micro", "mc"], ...PLAIN] as const)
      for (const step of [0.25, 0.3, 0.5, 1, 2]) {
        const g = grid(name, {
          tp: [name === "micro" ? 0.006 : 0.008], slOfTp: [1], trailOfTp: [0, 0.025],
          minSl: 0.002, minSlEval: 0.002, minTrail: 0.001, ownBase: true,
          ...(name === "micro" ? { tpNetOfCost: true } : { trailSlOfTp: 1 }),
        }, step);
        const base = baseRangeProtects(g, COST).find((p) => p.tag === tag && p.trail > 0)!;
        const actual = protectGrid(15, g, COST).find((p) => p.tag === tag && p.trail > 0)!;
        assert.deepEqual(actual, base, `${name}/${step}: Base must validate the actual protection`);
        assert.ok(actual.trail * step >= 0.001 - 1e-12, `${name}/${step}: ${actual.trail * step} gap`);
        if (step === 0.3) assert.equal(actual.trail, name === "micro" ? 0.003334 : 0.0034);
        else assert.equal(actual.trail, 0.001 / step);
      }
  });

  it("Micro's configured trailing gap survives normal bar noise and closes at the same real stop as Base", () => {
    const g = grid("micro", {
      tp: [0.006], slOfTp: [1], trailOfTp: [0, 0.25], minSl: 0.004,
      minTrail: 0.001, ownBase: true, tpNetOfCost: true,
    }, 0.25);
    g.holdH = [16];
    const base = baseRangeProtects(g, COST).find((p) => p.tag === "mc" && p.trail > 0)!;
    const actual = protectGrid(15, g, COST).find((p) => p.tag === "mc" && p.trail > 0)!;
    const longBars = bars([
      [100, 100, 100, 100],
      [100, 100.5, 99.9, 100.45],
      [100.47, 100.55, 100.42, 100.5],
      [100.5, 100.52, 100.4, 100.45],
    ]);
    for (const side of [1, -1] as const) {
      const b = side === 1 ? longBars : mirrored(longBars);
      const result = replay(actual, b, side);
      assert.deepEqual(result, replay(base, b, side));
      assert.equal(result.trades.length, 1);
      const trade = result.trades[0];
      assert.equal(trade.reason, "trail");
      assert.equal(trade.exitT, START + 4 * TF, "the configured gap survives the preceding bar");
      const peak = side === 1 ? 100.55 : 99.45;
      const exit = peak * (1 - side * 0.001);
      assert.ok(Math.abs(trade.exit - exit) < 1e-10);
      assert.ok(Math.abs(trade.r - (side * (exit - 100) / 100 - COST)) < 1e-12);
      assert.equal(replay({ ...actual, trail: 0.002 }, b, side).trades[0].exitT, START + 3 * TF,
        "the old sub-floor gap would have stopped this same position one bar earlier");
    }
  });
});
