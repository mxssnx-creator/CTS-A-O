// The active processings of a desk (10 Oct, plan P1): the engine stages (Base combos, strategy tapes) run only when an engine
// strategy type is on; a signals-only desk processes the signal stages alone. Signals stay on with the engine off.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { engineProcessingOn } from "./active-processing.ts";

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
