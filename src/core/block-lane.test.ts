import assert from "node:assert/strict";
import { test } from "node:test";
import { blockLane } from "./block-lane.ts";

test("the raised lane is measured on unit returns (r / multiple) and separately from plain entries", () => {
  // a raised entry: recorded r 0.04 at ×2 is a unit return of 0.02; a loss of -0.02 at ×4 is -0.005
  const trades = [
    { r: 0.01, mult: 1, blockVol: 1 },
    { r: -0.01, mult: 1, blockVol: 1 },
    { r: 0.04, mult: 2, blockVol: 2, level: 1 },
    { r: -0.02, mult: 4, blockVol: 4, level: 2 },
  ];
  const b = blockLane(trades, { minCloses: 1 });
  assert.equal(b.plain.n, 2);
  assert.equal(b.raised.n, 2);
  assert.ok(Math.abs(b.raised.gp! - 0.02) < 1e-12, "raised gains on unit returns");
  assert.ok(Math.abs(b.raised.gl! - 0.005) < 1e-12, "raised losses on unit returns");
  assert.ok(Math.abs((b.raised.pf as number) - 4) < 1e-9);
  assert.equal(b.byLevel["level 1"].n, 1);
  assert.equal(b.byLevel["level 2"].n, 1);
});

test("coordination volume is divided out with the Block multiple, exactly once", () => {
  const b = blockLane([{ r: 0.06, mult: 3, blockVol: 2, coordVol: 1.5, level: 1 }], { minCloses: 1 });
  // Complete external execution weighting is removed once: 0.06 / 3 = 0.02.
  assert.ok(Math.abs(b.raised.gp! - 0.02) < 1e-12);
});

test("a lane below the minimum sample is not judged; no closes is empty, not a number", () => {
  const b = blockLane([{ r: 0.01, mult: 2, blockVol: 2, level: 1 }], { minCloses: 30 });
  assert.equal(b.raised.judged, false);
  assert.equal(blockLane([], {}).raised.pf, null);
});

test("unknown losses stay in the same cohort and cannot manufacture a no-loss PF", () => {
  const b = blockLane([{ r: 0.02, mult: 2, blockVol: 2, level: 1 }, { r: Number.NaN, mult: 2, blockVol: 2, level: 1 }], { minCloses: 1 });
  assert.equal(b.raised.pf, null);
  assert.equal(b.raised.n, 2);
  assert.equal(b.raised.unknownReturns, 1);
  assert.equal(b.raised.judged, false);
});

test("unraised type/range volume is not Block; missing unit or membership evidence stays unknown",()=>{
  const sized=blockLane([{r:.06,mult:3,blockVol:1,level:0}],{minCloses:1});
  assert.equal(sized.plain.gp,.02);assert.equal(sized.raised.n,0);
  const missing=blockLane([{r:.01,blockVol:2,level:1}],{minCloses:1});
  assert.equal(missing.raised.state,"unknown");
  const unknown=blockLane([{r:.02,mult:2,blockVol:2,level:1},{r:-.02,mult:2}],{minCloses:1});
  assert.equal(unknown.unknown.n,1);assert.equal(unknown.raised.pf,null);assert.equal(unknown.raised.unknownMemberships,1);
  const flat=blockLane([{r:0,mult:1,blockVol:1}],{minCloses:1});
  assert.equal(flat.plain.state,"flat");assert.equal(flat.plain.pf,null);assert.equal(flat.plain.judged,false);
});
