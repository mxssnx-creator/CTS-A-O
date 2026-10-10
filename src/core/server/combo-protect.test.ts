// comboTrades re-simulates a stored config with its protect (10 Oct). An engine trailing config takes the grid's trail
// step and trail-free switch; a signal trailing config keeps its own exit, because the engine grid never reshapes a
// signal's trail (the audit found the engine grid forced onto signal ids).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { comboProtectOf } from "./runtime.server.ts";

const trailing = { tp: 0.02, sl: 0.03, trail: 0.01, hold: 32 };
const grid = { trailStep: 0.5, trailFree: true };

describe("comboTrades protect: the engine grid only reshapes engine trails", () => {
  it("an engine trailing config takes the grid's trail step and trail-free switch", () => {
    const p = comboProtectOf(trailing, "rsi-mom-14-20@m15", grid);
    assert.equal(p.trailStep, 0.5);
    assert.equal(p.trailFree, true);
  });

  it("a signal trailing config keeps its own exit (no step, no trail-free from the engine grid)", () => {
    const p = comboProtectOf(trailing, "sig-ema-cross-s@m15", grid);
    assert.equal(p, trailing, "returned unchanged");
    assert.equal(p.trailStep, undefined);
    assert.equal(p.trailFree, undefined);
  });

  it("a config with no trail is unchanged for both classes", () => {
    const plain = { tp: 0.02, sl: 0.03, trail: 0, hold: 32 };
    assert.equal(comboProtectOf(plain, "rsi-mom-14-20@m15", grid), plain);
    assert.equal(comboProtectOf(plain, "sig-ema-cross-s@m15", grid), plain);
  });
});
