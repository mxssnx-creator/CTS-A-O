import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles } from "../src/core/market/bars.ts";
import { bothSides, mergeSideTrades, simulate } from "../src/core/sim/backtest.ts";
import { researchSeriesTrades } from "./lib/research-series.mjs";

const MIN = 60_000,
  TF = 15,
  START = Date.UTC(2026, 8, 1);
const protect = { tp: 0.05, sl: 0.05, trail: 0, hold: 10 };
const COST = 0.002;
const candles = (n) =>
  Array.from({ length: n }, (_, i) => ({
    t: START + i * TF * MIN,
    o: 100,
    h: 100.3,
    l: 99.7,
    c: 100,
    v: 1,
  }));
const bars = (cs) => barsFromCandles("TEST-USDT", TF, cs);

describe("indication research independent direction simulation", () => {
  it("keeps overlapping opposite directions exactly as Base/bothSides rather than suppressing the short slot", () => {
    const b = bars(candles(40));
    const s = new Int8Array(40);
    s[0] = 1;
    s[2] = -1;
    s[20] = 1;
    s[22] = -1;
    const before = simulate("fixture", b, s, protect, { cost: COST }).trades;
    assert.deepEqual(
      before.map((t) => t.side),
      [1, 1],
      "single-slot reproduction drops both shorts",
    );
    const expected = mergeSideTrades(
      bothSides(s, (x) => simulate("fixture", b, x, protect, { cost: COST }).trades),
    );
    const actual = researchSeriesTrades("fixture", b, s, protect, COST);
    assert.deepEqual(actual, expected);
    assert.deepEqual(
      actual.map((t) => t.side),
      [1, -1, 1, -1],
    );
    assert.ok(actual[1].entryT < actual[0].exitT, "opposite positions may overlap");
    assert.ok(
      actual.every((t) => Math.abs(t.r + COST) < 1e-12),
      "each independent flat trade pays cost once",
    );
  });

  it("preserves one-sided, empty and nonoverlapping mixed-signal results", () => {
    const b = bars(candles(40));
    for (const points of [
      [],
      [
        [0, 1],
        [20, 1],
      ],
      [
        [0, -1],
        [20, -1],
      ],
      [
        [0, 1],
        [20, -1],
      ],
    ]) {
      const s = new Int8Array(40);
      for (const [i, value] of points) s[i] = value;
      assert.deepEqual(
        researchSeriesTrades("fixture", b, s, protect, COST),
        simulate("fixture", b, s, protect, { cost: COST }).trades,
      );
    }
  });

  it("preserves closed historical trades under poisoned future bars and next-open causality", () => {
    const cs = candles(50),
      cut = 20;
    const s = new Int8Array(50);
    s[0] = 1;
    s[2] = -1;
    s[25] = 1;
    const poison = cs.map((c, i) => (i < cut ? c : { ...c, o: 900, h: 1000, l: 800, c: 950 }));
    const prefix = researchSeriesTrades(
      "fixture",
      bars(cs.slice(0, cut)),
      s.slice(0, cut),
      protect,
      COST,
    );
    const stopT = START + cut * TF * MIN;
    const full = researchSeriesTrades("fixture", bars(poison), s, protect, COST).filter(
      (t) => t.exitT <= stopT,
    );
    assert.equal(prefix.length, 2, "nonempty closed prefix");
    assert.deepEqual(full, prefix);
    assert.equal(prefix[0].entryT, START + TF * MIN);
    assert.equal(prefix[1].entryT, START + 3 * TF * MIN);
  });

  it("merges simultaneous exits deterministically in entry-time order", () => {
    const cs = candles(15);
    // Different signal bars enter on different opens but both close on this target/stop bar.
    cs[5] = { ...cs[5], h: 110, l: 90 };
    const s = new Int8Array(15);
    s[0] = 1;
    s[2] = -1;
    const actual = researchSeriesTrades("fixture", bars(cs), s, protect, COST);
    assert.equal(actual.length, 2);
    assert.equal(actual[0].exitT, actual[1].exitT);
    assert.deepEqual(
      actual.map((t) => t.side),
      [1, -1],
    );
    assert.deepEqual(
      actual,
      [...actual].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side),
    );
  });
});
