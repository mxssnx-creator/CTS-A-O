// The Signals keep their own history window (signalLongH, default 100 h) while the engine's longH is 24 h.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signalWindowH, defaultWalkForward } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

describe("signal history window", () => {
  it("is 100 h independently of the engine history and warmup", () => {
    const o = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(signalWindowH({ ...o, longH: 24 }), 100);
    assert.equal(signalWindowH({ ...o, longH: 24, signalLongH: 72 }), 72);
    assert.equal(signalWindowH({ preH: 500, longH: 24 }), 100);
  });
});
