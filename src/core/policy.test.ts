// The systemwide policy (8 Oct): every engine range (micro, minimal, short, general, long) runs with its own minimum and
// no default removes a range; signals are judged by their own coordinations, never by a strategy range.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GATES, DEFAULT_SETTINGS } from "./config.ts";
import { minPfOf } from "./minimal-coord.ts";
import { crowdCapOf, crowdRangeOf, defaultWalkForward } from "./sim/walkforward.ts";

const SIGNAL = "follow|sig-ema-cross-s@m15|tp5|sl3|tr0|h192";
const ENGINE_MICRO = "follow|rsi-mom-14-25|tp5|sl3|tr0|h192|mc";

describe("policy: every engine range has its own minimum and runs by default", () => {
  it("the default rangeMinPf names all five ranges (short had none)", () => {
    for (const r of ["micro", "minimal", "short", "general", "long"] as const)
      assert.equal(typeof DEFAULT_GATES.rangeMinPf?.[r], "number", `${r} has its own minimum PF`);
  });

  it("a range's minimum is its own value (8 Oct defaults: short 1.1, long 1.5)", () => {
    assert.equal(minPfOf(DEFAULT_GATES, "sh"), 1.1);
    assert.equal(minPfOf(DEFAULT_GATES, "lg"), 1.5);
  });

  it("no default excludes a range (exclusions are per desk only)", () => {
    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.ok(!wf.excludeRanges?.length, "walk-forward default excludes no range");
  });

  it("the default grid keeps the five engine ranges switched on", () => {
    for (const r of ["minimal", "short", "general", "long"] as const)
      assert.ok(DEFAULT_SETTINGS.grid[r], `${r} grid is set`);
    assert.ok(DEFAULT_SETTINGS.grid.micro, "micro grid is set");
  });
});

describe("policy: signals are judged by their own coordinations, not by a strategy range", () => {
  it("a signal takes the stage minimum whatever the range minimums say", () => {
    const gates = { minPf: 1.05, rangeMinPf: { micro: 3, minimal: 3, short: 3, general: 3, long: 3 } };
    assert.equal(minPfOf(gates, undefined), 1.05);
    assert.equal(minPfOf(gates, null), 1.05);
  });

  it("a signal is keyed as its own class, so no range's crowd cap reaches it", () => {
    assert.equal(crowdRangeOf(SIGNAL), "sig");
    assert.equal(crowdCapOf({ entryCrowd: { mc: 3, sig: undefined } }, SIGNAL), Infinity);
  });

  it("an engine Micro config still takes its own crowd cap", () => {
    assert.equal(crowdRangeOf(ENGINE_MICRO), "mc");
    assert.equal(crowdCapOf({ entryCrowd: { mc: 3 } }, ENGINE_MICRO), 3);
  });
});
