import assert from "node:assert/strict";
import { it } from "node:test";
import { calibrateSlBounds, slGrid, slWithinBounds, type SlSample } from "./sl-calibration.ts";

const TP = 0.01, COST = 0.0011;
const base = { tp: TP, cost: COST, hardMin: 0.25, hardMax: 2.5, step: 0.25 };
// A winner reaches its target (+TP − cost) after a drawdown of `ratio` × TP; a loser is stopped out at the widest stop.
const winner = (ratio: number): SlSample => ({ r: TP - COST, mae: ratio * TP });
const loser = (): SlSample => ({ r: -2.5 * TP - COST, mae: 2.5 * TP });
const many = (n: number, f: () => SlSample) => Array.from({ length: n }, f);

it("the grid is built by integer index and never passes the maximum", () => {
  assert.deepEqual(slGrid(0.25, 2.5, 0.25), [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5]);
  assert.deepEqual(slGrid(0.2, 1.6, 0.1).length, 15);
  assert.deepEqual(slGrid(0.5, 1.5, 0.25), [0.5, 0.75, 1, 1.25, 1.5]);
  assert.equal(Math.max(...slGrid(0.3, 1, 0.2)), 0.9);
});

it("too few samples keep the configured limits as the defaults", () => {
  const b = calibrateSlBounds(many(5, () => winner(0.5)), base);
  assert.deepEqual([b.min, b.max, b.source, b.n], [0.25, 2.5, "default", 5]);
  assert.deepEqual(calibrateSlBounds([], base), { min: 0.25, max: 2.5, source: "default", n: 0 });
  assert.equal(calibrateSlBounds(many(30, () => winner(0.5)), { ...base, minSamples: 40 }).source, "default");
});

it("unusable inputs fall back to the limits instead of inventing bounds", () => {
  const s = [...many(15, () => winner(0.4)), ...many(15, loser)];
  for (const bad of [{ tp: 0 }, { step: 0 }, { hardMin: 0 }, { hardMax: 0.1 }, { cost: -1 }, { tp: NaN }])
    assert.equal(calibrateSlBounds(s, { ...base, ...bad }).source, "default", JSON.stringify(bad));
  const dirty = [...s, { r: NaN, mae: 0.01 }, { r: 0.01, mae: -1 }, { r: 0.01, mae: Infinity }];
  assert.equal(calibrateSlBounds(dirty, base).n, 30, "non-finite or negative samples are not counted");
});

it("winners that draw down to 0.5 × TP while losers run to the widest stop put the interval at 0.5 and just above", () => {
  // every winner survives any stop ≥ 0.75 (mae 0.5): a tighter stop only cuts them; a wider stop only deepens losers
  const s = [...many(20, () => winner(0.5)), ...many(10, loser)];
  const b = calibrateSlBounds(s, { ...base, tolerance: 0, margin: 0 });
  assert.equal(b.source, "samples");
  assert.equal(b.best, 0.75, "the tightest stop that keeps every winner");
  assert.deepEqual([b.min, b.max], [0.75, 0.75]);
  // the margin keeps one candidate beyond each edge, so Base can choose around the optimum
  const m = calibrateSlBounds(s, { ...base, tolerance: 0, margin: 1 });
  assert.deepEqual([m.min, m.max], [0.5, 1]);
});

it("a tolerance widens the interval to every ratio that is nearly as good", () => {
  const s = [...many(20, () => winner(0.5)), ...many(10, loser)];
  const tight = calibrateSlBounds(s, { ...base, tolerance: 0, margin: 0 });
  const loose = calibrateSlBounds(s, { ...base, tolerance: 0.5, margin: 0 });
  assert.ok(loose.min <= tight.min && loose.max >= tight.max);
  assert.ok(loose.max - loose.min > tight.max - tight.min);
  assert.ok(loose.min >= 0.25 && loose.max <= 2.5, "never beyond the configured limits");
});

it("a different winner drawdown moves the interval with it", () => {
  const at = (r: number) => calibrateSlBounds([...many(20, () => winner(r)), ...many(10, loser)], { ...base, tolerance: 0, margin: 0 }).best;
  assert.equal(at(0.2), 0.25);
  assert.equal(at(1.1), 1.25);
  assert.equal(at(1.9), 2);
});

it("the result always lies inside the configured limits and is ordered", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 300; i++) {
    const s = Array.from({ length: 25 + Math.floor(rnd() * 40) }, () => rnd() < 0.55 ? winner(rnd() * 2.4) : { r: -(0.2 + rnd() * 2.3) * TP - COST, mae: (0.2 + rnd() * 2.3) * TP });
    const lim = { ...base, hardMin: 0.5, hardMax: 1.5, step: 0.25, tolerance: rnd() * 0.5, margin: Math.floor(rnd() * 3) };
    const b = calibrateSlBounds(s, lim);
    assert.ok(b.min >= 0.5 - 1e-9 && b.max <= 1.5 + 1e-9 && b.min <= b.max, JSON.stringify(b));
    if (b.source === "samples") assert.ok(b.best! >= b.min - 1e-9 && b.best! <= b.max + 1e-9);
  }
});

it("an all-winner or all-loser sample carries no information and keeps the whole range", () => {
  const w = calibrateSlBounds(many(30, () => winner(0.3)), { ...base, margin: 0 });
  assert.ok(w.min <= 0.5 && w.max >= 2.5 - 1e-9, "all winners: nothing to cut");
  const l = calibrateSlBounds(many(30, loser), { ...base, margin: 0 });
  assert.deepEqual([l.min, l.max], [0.25, 2.5], "no winner at all: no preferred stop");
});

it("bounds are checked with a small float tolerance", () => {
  assert.ok(slWithinBounds(0.7500000001, { min: 0.75, max: 1 }));
  assert.ok(!slWithinBounds(0.5, { min: 0.75, max: 1 }));
  assert.ok(!slWithinBounds(1.25, { min: 0.75, max: 1 }));
});
