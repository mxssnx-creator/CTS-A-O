// Gap fills of the exits: a bar that opens through a level fills at its open when the open is the better (for a
// target) or the worse (for a stop) price; a bar that does not gap fills at the level itself.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "./backtest.ts";
import { barsFromCandles } from "../market/bars.ts";
import type { Candle, Protect } from "../domain/types.ts";

const M = 60_000;
const mk = (rows: Array<[number, number, number, number]>): Candle[] =>
  rows.map(([o, h, l, c], i) => ({ t: i * 5 * M, o, h, l, c, v: 1 }));
// 1 % target and 1 % stop, no trail, a long hold
const P: Protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 50 };

describe("exit gap fills", () => {
  it("a long target gapped over opens at the bar's open (the better price), not at the target", () => {
    // entry 100 (the open of bar 1); target 101; bar 2 opens at 102 and trades above the target
    const b = barsFromCandles("X", 5, mk([[100, 100, 100, 100], [100, 100.2, 99.5, 100], [102, 103, 101.5, 102.5]]));
    const res = simulate("c", b, new Int8Array([1, 0, 0]), P, { cost: 0 });
    assert.equal(res.trades[0].reason, "tp");
    assert.equal(res.trades[0].exit, 102);
    assert.ok(Math.abs(res.trades[0].r - 0.02) < 1e-12);
  });

  it("a long target met without a gap fills at the target", () => {
    const b = barsFromCandles("X", 5, mk([[100, 100, 100, 100], [100, 100.2, 99.5, 100], [100.5, 101.5, 100.2, 101]]));
    const res = simulate("c", b, new Int8Array([1, 0, 0]), P, { cost: 0 });
    assert.equal(res.trades[0].reason, "tp");
    assert.equal(res.trades[0].exit, 101);
    assert.ok(Math.abs(res.trades[0].r - 0.01) < 1e-12);
  });

  it("a short target gapped under opens at the bar's open (the better price for a short)", () => {
    // entry 100; a short's target is 99; bar 2 opens at 98 and trades below it
    const b = barsFromCandles("X", 5, mk([[100, 100, 100, 100], [100, 100.2, 99.5, 100], [98, 98.5, 97.5, 98]]));
    const res = simulate("c", b, new Int8Array([-1, 0, 0]), P, { cost: 0 });
    assert.equal(res.trades[0].reason, "tp");
    assert.equal(res.trades[0].exit, 98);
    assert.ok(Math.abs(res.trades[0].r - 0.02) < 1e-12);
  });

  it("a short stop gapped over opens at the bar's open (the worse price for a short)", () => {
    // entry 100; a short's stop is 101; bar 2 opens at 102 and trades above it
    const b = barsFromCandles("X", 5, mk([[100, 100, 100, 100], [100, 100.2, 99.5, 100], [102, 103, 101.5, 102.5]]));
    const res = simulate("c", b, new Int8Array([-1, 0, 0]), P, { cost: 0 });
    assert.equal(res.trades[0].reason, "sl");
    assert.equal(res.trades[0].exit, 102);
    assert.ok(Math.abs(res.trades[0].r - -0.02) < 1e-12);
  });
});
