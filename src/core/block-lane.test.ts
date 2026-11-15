import assert from "node:assert/strict";
import { test } from "node:test";
import { blockLane } from "./block-lane.ts";

test("the raised lane is measured on unit returns (r / multiple) and separately from plain entries", () => {
  // a raised entry: recorded r 0.04 at ×2 is a unit return of 0.02; a loss of -0.02 at ×4 is -0.005
  const trades = [
    { r: 0.01, mult: 1 },
    { r: -0.01, mult: 1 },
    { r: 0.04, mult: 2, level: 1 },
    { r: -0.02, mult: 4, level: 2 },
  ];
  const b = blockLane(trades, { minCloses: 1 });
  assert.equal(b.plain.n, 2);
  assert.equal(b.raised.n, 2);
  assert.ok(Math.abs(b.raised.gp - 0.02) < 1e-12, "raised gains on unit returns");
  assert.ok(Math.abs(b.raised.gl - 0.005) < 1e-12, "raised losses on unit returns");
  assert.ok(Math.abs((b.raised.pf as number) - 4) < 1e-9);
  assert.equal(b.byLevel["level 1"].n, 1);
  assert.equal(b.byLevel["level 2"].n, 1);
});

test("coordination volume is divided out with the Block multiple, exactly once", () => {
  const b = blockLane([{ r: 0.06, mult: 3, coordVol: 1.5, level: 1 }], { minCloses: 1 });
  // 0.06 / (3 / 1.5) = 0.03: the Block multiple alone is 2
  assert.ok(Math.abs(b.raised.gp - 0.03) < 1e-12);
});

test("a lane below the minimum sample is not judged; no closes is empty, not a number", () => {
  const b = blockLane([{ r: 0.01, mult: 2, level: 1 }], { minCloses: 30 });
  assert.equal(b.raised.judged, false);
  assert.equal(blockLane([], {}).raised.pf, null);
});

test("no losses is reported as no loss, never as a measured ratio; non-finite returns are left out", () => {
  const b = blockLane([{ r: 0.02, mult: 2, level: 1 }, { r: Number.NaN, mult: 2, level: 1 }], { minCloses: 1 });
  assert.equal(b.raised.pf, "no loss");
  assert.equal(b.raised.n, 1);
});
