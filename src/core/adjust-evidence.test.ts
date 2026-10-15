import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ADJUST, evaluateAdjust, setKeyOf, type AdjustState } from "./adjust.ts";

const cfg = "follow|rsi-mom-14-25|tp5|sl5|tr2.5|h24";
const set = setKeyOf(cfg);
const a = { ...DEFAULT_ADJUST, window: 3, slScale: .25, trailScale: .5 };
const base = { minSl: .01, minTrail: .006 };
const trades = (rs: number[], from = 1) => rs.map((r, i) => ({ cfg, r, exitT: from + i }));
const controls = (state: AdjustState) => {
  const { level, minSl, minTrail, slMult, trailMult, pausedUntil, stepT } = state[set];
  return { level, minSl, minTrail, slMult, trailMult, pausedUntil, stepT };
};
const adjusted = () => evaluateAdjust({}, trades([-.01, -.01, -.01]), a, base, 0, 10).state;

describe("auto-adjust unit-return evidence", () => {
  for (const unknown of [NaN, Infinity, -Infinity]) {
    it(`holds an unknown recent return (${String(unknown)}) instead of substituting older winners`, () => {
      const prev = adjusted();
      const original = structuredClone(prev);
      const result = evaluateAdjust(prev, trades([.02, .02, .02, unknown, .02, .02], 4), a, base, 0, 20);
      assert.deepEqual(result.changed, []);
      assert.deepEqual(controls(result.state), controls(prev), "no recovery, widening, pause or multiplier proposal");
      assert.equal(result.state[set].pf, null, "no fabricated PF for an incomplete evidence window");
      assert.equal(result.state[set].unknownReturns, 1);
      assert.equal(result.state[set].n, 3);
      assert.equal(result.state[set].lastExitT, 9);
      assert.match(result.state[set].note, /Hold.*1 of last 3 unit returns unknown.*unchanged/);
      assert.deepEqual(prev, original, "the prior state is not mutated");
    });
  }

  it("unknown losses cannot widen a set or extend its pause at the caps", () => {
    const prev = adjusted();
    prev[set] = { ...prev[set], level: 100, pausedUntil: 999, slMult: 2, trailMult: 2 };
    const result = evaluateAdjust(prev, trades([-.02, NaN, -.02], 4), a, base, 0, 20);
    assert.deepEqual(result.changed, []);
    assert.deepEqual(controls(result.state), controls(prev));
    assert.equal(result.state[set].pf, null);
  });

  it("invalidates an old same-exit verdict when current selected returns are unknown", () => {
    const prev = adjusted();
    const result = evaluateAdjust(prev, trades([-.01, NaN, -.01]), a, base, 0, 20);
    assert.deepEqual(result.changed, []);
    assert.equal(result.state[set].lastExitT, prev[set].lastExitT);
    assert.equal(result.state[set].pf, null);
    assert.equal(result.state[set].unknownReturns, 1);
    assert.match(result.state[set].note, /Hold/);
    assert.deepEqual(controls(result.state), controls(prev));
  });

  it("a new fully known last-N window recovers normally once the old unknown falls outside it", () => {
    const held = evaluateAdjust(adjusted(), trades([NaN, .02, .02], 4), a, base, 0, 20).state;
    // Deliberately unsorted input: selection remains by close chronology, not source order or finite-row filtering.
    const xs = trades([NaN, .02, .02, -.005], 4).reverse();
    const result = evaluateAdjust(held, xs, a, base, 0, 30);
    assert.deepEqual(result.changed, [set]);
    assert.equal(result.state[set].level, 0);
    assert.equal(result.state[set].pf, 8);
    assert.equal(result.state[set].unknownReturns, 0);
    assert.equal(result.state[set].n, 3);
    assert.equal(result.state[set].lastExitT, 7);
    assert.match(result.state[set].note, /step back/);
  });

  it("a new fully known losing window still widens, with older unknown evidence excluded", () => {
    const result = evaluateAdjust({}, trades([NaN, -.01, -.01, -.01]), a, base, 0, 20);
    assert.deepEqual(result.changed, [set]);
    assert.equal(result.state[set].level, 1);
    assert.equal(result.state[set].pf, 0);
    assert.equal(result.state[set].unknownReturns, 0);
  });

  it("an unknown first complete window produces a neutral explicit hold", () => {
    const result = evaluateAdjust({}, trades([.02, NaN, -.01]), a, base, 0, 20);
    assert.deepEqual(result.changed, []);
    assert.equal(result.state[set].level, 0);
    assert.equal(result.state[set].minSl, base.minSl);
    assert.equal(result.state[set].minTrail, base.minTrail);
    assert.equal(result.state[set].pf, null);
    assert.equal(result.state[set].pausedUntil, 0);
    assert.equal(result.state[set].stepT, undefined);
  });
});
