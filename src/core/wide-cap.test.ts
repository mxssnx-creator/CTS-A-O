// Wide grid: targets 3–8 % in 1 % steps, the stop and the trailing distance held to grid.maxSl / maxTrail (3 %).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { protectGrid, DEFAULT_GRID } from "./sim/walkforward.ts";

describe("Wide stop and trail cap", () => {
  const g = {
    ...DEFAULT_GRID,
    tp: [0.03, 0.04, 0.05, 0.06, 0.07, 0.08],
    slOfTp: [0.5, 1, 2],
    trailOfTp: [0, 0.25, 0.5],
    maxSl: 0.03,
    maxTrail: 0.03,
  };
  it("no Wide cell has a stop or trail above 3 %, and every target is present", () => {
    const cells = protectGrid(15, g).filter((p) => !p.tag);
    assert.ok(cells.length > 0);
    for (const p of cells) {
      assert.ok(p.sl <= 0.03 + 1e-9, `sl ${p.sl}`);
      assert.ok(p.trail <= 0.03 + 1e-9, `trail ${p.trail}`);
    }
    assert.deepEqual([...new Set(cells.map((p) => p.tp))].sort(), [0.03, 0.04, 0.05, 0.06, 0.07, 0.08]);
  });
  it("unset: the stop is tp × ratio as before", () => {
    const cells = protectGrid(15, { ...g, maxSl: undefined, maxTrail: undefined }).filter((p) => !p.tag);
    assert.ok(cells.some((p) => p.sl > 0.03));
  });
});
