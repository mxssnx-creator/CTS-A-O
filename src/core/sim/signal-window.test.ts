// The Signals keep their own history window (signalLongH, default 336 h) while the engine's longH is 24 h.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signalWindowH, defaultWalkForward } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

describe("signal history window", () => {
  it("is 336 h whatever the engine's longH is, never below the warm-up", () => {
    const o = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(signalWindowH({ ...o, longH: 24 }), 336);
    assert.equal(signalWindowH({ ...o, longH: 24, signalLongH: 72 }), 72);
    assert.equal(signalWindowH({ preH: 500, longH: 24 }), 500);
  });
});
