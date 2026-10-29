import assert from "node:assert/strict";
import { test } from "node:test";
import { barsFromCandles } from "../market/bars.ts";
import { DEFAULT_DCA } from "../config.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis } from "./axis.ts";
import type { Candle, Protect } from "../domain/types.ts";

const M = 60_000;
const bars = (rows: number[][], side: 1 | -1) => barsFromCandles("X-USDT", 1,
  rows.map(([o, h, l, c], i): Candle => ({ t: i * M, o: side === 1 ? o : 200 - o,
    h: side === 1 ? h : 200 - l, l: side === 1 ? l : 200 - h, c: side === 1 ? c : 200 - c, v: 1 })));
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("every range closes its own TP, SL, ambiguous bar and stop gap with one modeled deduction", () => {
  for (const cost of [.0012, .0015]) for (const side of [1, -1] as const) {
    for (const tag of ["mc", "mn", "sh", "gn", "lg", "wide"] as const) {
      const p: Protect = { tp: .01, sl: .02, trail: 0, hold: 10, ...(tag === "wide" ? {} : { tag }) };
      const prefix = [[100, 100, 100, 100], [100, 100, 100, 100]];
      const cases = [
        { row: [100, 101.1, 99.9, 101], reason: "tp", exit: 101 },
        { row: [100, 100.1, 97.9, 98], reason: "sl", exit: 98 },
        { row: [100, 101.1, 97.9, 100], reason: "sl", exit: 98 },
        { row: [97, 97.2, 96.9, 97], reason: "sl", exit: 97 },
      ];
      for (const c of cases) {
        const cfg = `follow|ema-9-21@m1|${tag}`;
        const result = simulate(cfg, bars([...prefix, c.row], side), Int8Array.of(side, 0, 0), p, { cost });
        assert.equal(result.trades.length, 1, `${cfg}/${side}/${c.reason}`);
        const t = result.trades[0], expectedExit = side === 1 ? c.exit : 200 - c.exit;
        assert.equal(t.cfg, cfg); assert.equal(t.reason, c.reason); close(t.exit, expectedExit);
        close(t.r, side * (expectedExit - 100) / 100 - cost);
      }
    }
  }
});

test("DCA, DCA Active and Axis deduct one round trip for each filled weighted leg on both sides", () => {
  const ladderPath = [[100, 100, 100, 100], [100, 100, 98.9, 99], [99, 99.1, 97.9, 98],
    [98, 98.1, 97.9, 98], [98, 98.1, 97.9, 98]];
  const axisPath = [[98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 97.4, 97.6], [97.6, 100.2, 97.5, 100]];
  const p: Protect = { tp: .05, sl: .08, trail: 0, hold: 4 };
  const axis = { levels: 2, spacing: 1, ratio: 1, minDisp: .35, maxDisp: 2.6, center: 50, exits: "fixed" as const };
  for (const side of [1, -1] as const) for (const cost of [.0012, .0015]) {
    for (const active of [false, true]) {
      const b = bars(ladderPath, side), options = { ...DEFAULT_DCA, levels: 2, step: .01 };
      const zero = simulateDca("dca", b, Int8Array.of(side, 0, 0, 0, 0), p, options, active, 0).trades[0];
      const net = simulateDca("dca", b, Int8Array.of(side, 0, 0, 0, 0), p, options, active, cost).trades[0];
      assert.ok(zero && net && (net.vol ?? 0) >= 1);
      assert.equal(net.exitT, zero.exitT); assert.equal(net.exit, zero.exit);
      close(zero.r - net.r, cost * net.vol!);
      close(net.r, net.vol! * (side * (net.exit - net.entry) / net.entry - cost));
    }
    const b = bars(axisPath, side), sig = Int8Array.of(side, 0, 0), center = Float64Array.of(100, 100, 100);
    const atr = Float64Array.of(1, 1, 1), protect: Protect = { tp: .02, sl: .01, trail: 0, hold: 20 };
    const zero = simulateAxis("axis", b, sig, protect, axis, center, atr, 0).trades[0];
    const net = simulateAxis("axis", b, sig, protect, axis, center, atr, cost).trades[0];
    assert.ok(zero && net); assert.equal(net.vol, 2); assert.equal(net.exit, zero.exit);
    close(zero.r - net.r, cost * net.vol!);
    close(net.r, net.vol! * (side * (net.exit - net.entry) / net.entry - cost));
  }
});
