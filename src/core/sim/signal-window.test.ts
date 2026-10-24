// The Signals keep their own history window (signalLongH, default 150 h) while the engine's longH is 24 h.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signalWindowH, defaultWalkForward } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

describe("signal history window", () => {
  it("is 150 h independently of the engine history and warmup", () => {
    const o = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(signalWindowH({ ...o, longH: 24 }), 150);
    assert.equal(signalWindowH({ ...o, longH: 24, signalLongH: 72 }), 72);
    assert.equal(signalWindowH({ preH: 500, longH: 24 }), 150);
  });
});
