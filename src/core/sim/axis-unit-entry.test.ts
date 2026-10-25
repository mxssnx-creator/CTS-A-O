import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barsFromCandles } from "../market/bars.ts";
import type { AxisConfig, Candle } from "../domain/types.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";

const cost = 0.0015;
const base = { tp: 0.01, sl: 0.01, trail: 0, hold: 50 };
const constant = (n: number, value: number) => new Float64Array(n).fill(value);
const near = (actual: number, expected: number, message: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: ${actual} vs ${expected}`);

describe("Axis funded notional entry", () => {
  for (const mode of ["revert", "desk"] as const) {
    for (const side of [1, -1] as const) {
      for (const ratio of [1, 2.5]) {
        it(`${mode}, side ${side}, addition ${ratio}: aggregate entry reproduces every leg return`, () => {
          const rows = mode === "desk"
            ? [[100.5, 100.6, 100.4, 100.5], [100.4, 100.4, 99.2, 99.3], [99.2, 99.3, 98.5, 98.9]]
            : [[98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 97.4, 97.6], [97.6, 98, 97.5, 97.9]];
          const candles: Candle[] = rows.map(([o, h, l, c], i) => ({
            t: i * 60_000,
            o: side === 1 ? o : 200 - o, h: side === 1 ? h : 200 - l,
            l: side === 1 ? l : 200 - h, c: side === 1 ? c : 200 - c, v: 1,
          }));
          const bars = barsFromCandles("X", 1, candles);
          const ax: AxisConfig = { levels: mode === "desk" ? 3 : 2, spacing: mode === "desk" ? 0.7 : 1,
            ratio, minDisp: 0.35, maxDisp: 2.6, center: 50,
            ...(mode === "desk" ? { mode: "desk", range: "atr", slAtr: 0.7, tpRatio: 2.2 } : { exits: "fixed" }) };
          const calc = (hold: number, settle = false) => {
            const last = candles.at(-1)!;
            const input = settle ? barsFromCandles("X", 1, [...candles, ...[3, 4].map(i => ({
              t: i * 60_000, o: last.c, h: last.c, l: last.c, c: last.c, v: 1,
            }))]) : bars;
            const sig = new Int8Array(input.n); sig[0] = side;
            return mode === "desk"
              ? simulateAxisDesk("axis-owned", input, sig, { ...base, hold }, ax,
                constant(input.n, 100), constant(input.n, 1), cost, 0, { minSl: 0.015, minTrail: 0 })
              : simulateAxis("axis-owned", input, sig, { ...base, hold }, ax,
                constant(input.n, 100), constant(input.n, 1), cost);
          };
          const result = calc(50);
          assert.equal(result.trades.length, 0);
          const open = result.open!;
          assert.ok(open);
          assert.equal(open.w, 1 + ratio);
          const fills = (mode === "desk" ? [99.3, 98.6] : [98.5, 97.5])
            .map(p => side === 1 ? p : 200 - p);
          const mark = bars.c.at(-1)!;
          const sum = (price: number) => fills.reduce((r, fill, i) =>
            r + (i ? ratio : 1) * (side * (price - fill) / fill - cost), 0);
          near(open.mtm * open.w!, sum(mark), "per-leg open return");
          near((side * (mark - open.entry) / open.entry - cost) * open.w!, sum(mark), "aggregate open return");
          const closed = calc(2, true).trades;
          assert.equal(closed.length, 1);
          const trade = closed[0];
          assert.equal(trade.vol, 1 + ratio);
          near(trade.r, sum(trade.exit), "per-leg settled return");
          near((side * (trade.exit - trade.entry) / trade.entry - cost) * trade.vol!, trade.r, "aggregate settled return");
        });
      }
    }
  }
});
