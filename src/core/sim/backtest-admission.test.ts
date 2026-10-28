import assert from "node:assert/strict";
import { test } from "node:test";
import { barsFromCandles } from "../market/bars.ts";
import { simulate, simulateFrom } from "./backtest.ts";
import type { Candle, Protect } from "../domain/types.ts";

const M = 60_000;
const candles = (n: number): Candle[] => Array.from({ length: n }, (_, i) =>
  ({ t: i * M, o: 100, h: 100.1, l: 99.9, c: 100, v: 1 }));
const protect: Protect = { tp: .1, sl: .1, trail: 0, hold: 3 };

for (const side of [1, -1] as const) {
  test(`rejecting an unqualified ${side === 1 ? "long" : "short"} entry leaves its processed slot free`, () => {
    const bars = barsFromCandles("A", 1, candles(7)), signal = new Int8Array([side, side, 0, 0, 0, 0, 0]);
    const raw = simulate("cfg", bars, signal, protect, { cost: .0015 });
    assert.deepEqual(raw.trades.map((t) => t.entryT), [M], "the unconditional source occupies the slot at the second signal");
    const observed: Array<{ side: number; signalCloseT: number; entryT: number }> = [];
    const processed = simulate("cfg", bars, signal, protect, { cost: .0015, admitEntry: (x) => {
      observed.push({ side: x.side, signalCloseT: x.signalCloseT, entryT: x.entryT });
      return x.entryT !== M;
    } });
    assert.deepEqual(observed, [{ side, signalCloseT: M, entryT: M }, { side, signalCloseT: 2 * M, entryT: 2 * M }]);
    assert.deepEqual(processed.trades.map((t) => t.entryT), [2 * M], "the later accepted signal is independently simulated");
    assert.equal(processed.trades[0].reason, "time");
    assert.ok(Math.abs(processed.trades[0].r + .0015) < 1e-12);
  });
}

test("admission is explicit and cannot silently accept an invalid callback result", () => {
  const bars = barsFromCandles("A", 1, candles(5)), signal = new Int8Array([1, 1, 0, 0, 0]);
  assert.throws(() => simulate("cfg", bars, signal, protect,
    { cost: 0, admitEntry: (() => undefined) as unknown as () => boolean }), /boolean/);
  assert.equal(simulate("cfg", bars, signal, protect, { cost: 0, admitEntry: () => false }).trades.length, 0);
});

test("a resumed processed simulation preserves its held position and causal admission decisions", () => {
  const all = candles(9), signal = new Int8Array([1, 1, 0, 0, 0, 1, 0, 0, 0]);
  const admitEntry = ({ entryT }: { entryT: number }) => entryT !== M;
  const full = simulateFrom("cfg", barsFromCandles("A", 1, all), signal, protect, { cost: .0015, admitEntry });
  const first = simulateFrom("cfg", barsFromCandles("A", 1, all.slice(0, 4)), signal.slice(0, 4), protect,
    { cost: .0015, admitEntry });
  const resumed = simulateFrom("cfg", barsFromCandles("A", 1, all), signal, protect,
    { cost: .0015, admitEntry }, first.state);
  assert.deepEqual([...first.trades, ...resumed.trades], full.trades);
  assert.deepEqual(resumed.open, full.open);
});
