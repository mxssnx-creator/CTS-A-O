import assert from "node:assert/strict";
import { test } from "node:test";
import { barsFromCandles } from "../market/bars.ts";
import { simulate } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis, simulateAxisDesk } from "./axis.ts";
import { DEFAULT_DCA } from "../config.ts";
import type { AxisConfig, Side } from "../domain/types.ts";
import type { EntryAdmission } from "./entry-admission.ts";

const M = 60_000;
const protect = { tp: .02, sl: .04, trail: 0, hold: 3 };
const axis: AxisConfig = { levels: 2, spacing: 1, ratio: 1, minDisp: .35, maxDisp: 2.6, center: 50, exits: "fixed" };
function prices(side: Side) {
  const mirror = (x: number) => side === 1 ? x : 200 - x;
  return barsFromCandles("A-USDT", 1, [
    [98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 98.4, 98.5], [98.5, 98.6, 97.4, 97.6],
    [97.6, 100.2, 97.5, 100], [100, 100.1, 99.9, 100], [100, 100.1, 99.9, 100],
    [100, 100.1, 99.9, 100], [100, 100.1, 99.9, 100],
  ].map(([o, h, l, c], i) => ({ t: i * M, o: mirror(o), h: mirror(side === 1 ? h : l),
    l: mirror(side === 1 ? l : h), c: mirror(c), v: 1 })));
}
for (const side of [1, -1] as const) for (const mode of ["normal", "trailing", "dca", "dca-active", "axis-fixed", "axis-managed", "axis-desk"] as const) {
  test(`${mode} ${side}: denied first intent leaves the later processed slot free`, () => {
    const bars = prices(side), signal = new Int8Array([side, side, 0, 0, 0, 0, 0, 0]),
      filtered = new Int8Array([0, side, 0, 0, 0, 0, 0, 0]), center = new Float64Array(bars.n).fill(100), atr = new Float64Array(bars.n).fill(1);
    const seen: number[] = [];
    const denyFirst: EntryAdmission = (e) => { seen.push(e.entryT); assert.equal(e.side, side); return e.entryT !== M; };
    const run = (sig: Int8Array, admit?: EntryAdmission) => {
      if (mode === "normal" || mode === "trailing") return simulate("cfg", bars, sig,
        { ...protect, trail: mode === "trailing" ? .01 : 0 }, { cost: .0015, admitEntry: admit });
      if (mode === "dca" || mode === "dca-active") return simulateDca("cfg", bars, sig, protect, DEFAULT_DCA,
        mode === "dca-active", .0015, 0, undefined, admit);
      if (mode === "axis-desk") return simulateAxisDesk("cfg", bars, sig, protect, { ...axis, mode: "desk", expiry: 3 },
        center, atr, .0015, 0, undefined, undefined, admit);
      return simulateAxis("cfg", bars, sig, protect, { ...axis, exits: mode === "axis-managed" ? "managed" : "fixed" },
        center, atr, .0015, 0, undefined, undefined, admit);
    };
    const actual = run(signal, denyFirst), expected = run(filtered);
    assert.deepEqual(seen, [M, 2 * M]);
    assert.deepEqual(actual, expected, "denied source intent creates no position, waiting ladder or cooldown");
    assert.ok(actual.trades.length || actual.open, "the later qualified source really executed");
    assert.equal(run(signal, () => false).trades.length, 0);
    assert.throws(() => run(signal, (() => undefined) as unknown as EntryAdmission), /boolean/);
    assert.deepEqual(run(signal, () => true), run(signal), "optional admission preserves the original economic rules");
  });
}

test("both Axis modes reject invalid cost instead of manufacturing or concealing return PF", () => {
  const b = prices(1), sig = new Int8Array(b.n), center = new Float64Array(b.n).fill(100), atr = new Float64Array(b.n).fill(1);
  for (const run of [simulateAxis, simulateAxisDesk]) for (const cost of [-.001, NaN, Infinity, -Infinity])
    assert.throws(() => run("cfg", b, sig, protect, axis, center, atr, cost), /finite and nonnegative/);
});

