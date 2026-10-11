// The active processings of a desk (10 Oct, plan P1): the engine stages (Base combos, strategy tapes) run only when an engine
// strategy type is on; a signals-only desk processes the signal stages alone. Signals stay on with the engine off.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { engineProcessingOn, presetCompareOn } from "./active-processing.ts";

const OFF = { normal: false, trailing: false, block: false, blockActive: false, dca: false, dcaActive: false, axis: false };

describe("the engine stages run only when an engine strategy type is on (10 Oct, P1)", () => {
  it("every engine type off: the engine stages are not processed", () => {
    assert.equal(engineProcessingOn(OFF), false);
  });
  it("each engine type on turns the engine stages on", () => {
    for (const k of ["normal", "trailing", "block", "dca", "axis"] as const) {
      assert.equal(engineProcessingOn({ ...OFF, [k]: true }), true, `${k} on`);
    }
  });
  it("DCA Active alone, without DCA, is not an engine stage (it needs DCA on)", () => {
    assert.equal(engineProcessingOn({ ...OFF, dcaActive: true }), false);
  });
  it("missing toggles count as off", () => {
    assert.equal(engineProcessingOn(undefined), false);
    assert.equal(engineProcessingOn({}), false);
  });
});

describe("the preset comparison is an engine stage too (10 Oct)", () => {
  it("signals only: no preset is walked, whatever the environment says", () => {
    assert.equal(presetCompareOn(OFF, undefined, {}), false);
    assert.equal(presetCompareOn(OFF, { dca: false, axis: false }, { CTS_CORE_COMPARE: "1" }), false);
    assert.equal(presetCompareOn(undefined, undefined, {}), false);
  });
  it("an engine type on compares, unless a desk switches the comparison off", () => {
    assert.equal(presetCompareOn({ ...OFF, normal: true }, undefined, {}), true);
    assert.equal(presetCompareOn({ ...OFF, axis: true }, undefined, { CTS_CORE_COMPARE: "1" }), true);
    assert.equal(presetCompareOn({ ...OFF, normal: true }, undefined, { CTS_CORE_COMPARE: "0" }), false);
  });
  it("signals with their own DCA or Axis sets still compare (the DCA / Axis presets execute them)", () => {
    assert.equal(presetCompareOn(OFF, { dca: true }, {}), true);
    assert.equal(presetCompareOn(OFF, { axis: true }, {}), true);
    assert.equal(presetCompareOn(OFF, { dca: true, axis: true }, { CTS_CORE_COMPARE: "0" }), false);
  });
});
