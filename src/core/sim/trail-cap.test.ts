// The owner's rule: a trailing config's initial stop from entry is at most 3 % (the trail then follows the peak).
// Every path that makes a trailing protect is capped: the helper, lane scaling, the grid, the adjuster and ATR.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TRAIL_SL_CAP, capTrailingSl, resolveAtrProtect } from "./backtest.ts";
import { protectGrid } from "./walkforward.ts";
import { laneProtect } from "../pipeline/pipeline.ts";
import { adjustProtect } from "../adjust.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

describe("trailing initial stop cap", () => {
  it("caps a trailing protect above 3 %, leaves plain protects and trailing stops at or under 3 % as they are", () => {
    assert.equal(TRAIL_SL_CAP, 0.03);
    const wide = { tp: 0.05, sl: 0.08, trail: 0.02, hold: 16 };
    assert.deepEqual(capTrailingSl(wide), { ...wide, sl: 0.03 });
    const tight = { tp: 0.02, sl: 0.012, trail: 0.01, hold: 16 };
    assert.equal(capTrailingSl(tight), tight);
    const plain = { tp: 0.05, sl: 0.08, trail: 0, hold: 16 };
    assert.equal(capTrailingSl(plain), plain);
  });

  it("lane scaling caps the trailing stop after the √(tf) scale (a 30m lane multiplies a 2.5 % stop by 1.41)", () => {
    const p = { tp: 0.03, sl: 0.025, trail: 0.015, hold: 32 };
    for (const ind of ["x@m1", "x@m5", "x@m30c"]) {
      const lane = laneProtect(p, ind);
      assert.ok(lane.sl <= TRAIL_SL_CAP, `${ind} stop ${lane.sl} above the cap`);
    }
    const wide = { tp: 0.03, sl: 0.045, trail: 0.015, hold: 32 };
    assert.equal(laneProtect(wide, "x@m15").sl, TRAIL_SL_CAP);
    assert.equal(laneProtect({ ...wide, trail: 0 }, "x@m15").sl, 0.045, "a plain protect keeps its stop");
  });

  it("every trailing protect of the grid is capped, and the plain ones are not", () => {
    const grid = protectGrid(15, DEFAULT_SETTINGS.grid, DEFAULT_SETTINGS.cost);
    const trailing = grid.filter((p) => p.trail > 0);
    assert.ok(trailing.length > 0);
    for (const p of trailing) assert.ok(p.sl <= TRAIL_SL_CAP + 1e-9, `grid trailing stop ${p.sl}`);
    assert.ok(grid.some((p) => p.trail === 0 && p.sl > TRAIL_SL_CAP), "plain grid stops above 3 % remain");
  });

  it("the adaptive widening (slMult) cannot take a trailing stop past the cap", () => {
    const p = { tp: 0.02, sl: 0.02, trail: 0.01, hold: 16 };
    const out = adjustProtect(p, { minSl: 0.03, minTrail: 0.005, slMult: 2, trailMult: 1 });
    assert.ok(out.sl <= TRAIL_SL_CAP + 1e-9, `adjusted trailing stop ${out.sl}`);
    const plain = adjustProtect({ ...p, trail: 0 }, { minSl: 0.03, minTrail: 0.005, slMult: 2, trailMult: 1 });
    assert.ok(plain.sl > TRAIL_SL_CAP, "a plain protect is widened as before");
  });

  it("an ATR trailing protect is capped; the target follows the capped stop", () => {
    const a = { sl: 3, tpRatio: 1.5, trail: 2 };
    const out = resolveAtrProtect({ tp: 0, sl: 0, trail: 0, hold: 16, atr: a }, 0.02);
    assert.ok(out.sl <= TRAIL_SL_CAP + 1e-9, `ATR trailing stop ${out.sl}`);
    assert.ok(Math.abs(out.tp - out.sl * 1.5) < 1e-6, `target ${out.tp} follows the capped stop`);
    const plain = resolveAtrProtect({ tp: 0, sl: 0, trail: 0, hold: 16, atr: { ...a, trail: 0 } }, 0.02);
    assert.ok(plain.sl > TRAIL_SL_CAP, "a plain ATR protect keeps its wider stop");
  });
});
