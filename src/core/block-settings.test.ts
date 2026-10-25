import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BLOCK, DEFAULT_SETTINGS } from "./config.ts";
import { checkMerged, checkSettings } from "./settings-check.ts";
import { blockDecide } from "./sim/block.ts";

describe("Block settings preserve independent Shared ratio and accepted-order history", () => {
  it("validates every relation multiplier and the recovery switch", () => {
    assert.doesNotThrow(() => checkSettings({block:{...DEFAULT_BLOCK,sourceRatios:{symbol:4,direction:2,indication:2,type:3},holdUntilNet:true}}));
    for (const value of [-1,11,NaN,Infinity,"2",null])
      assert.throws(()=>checkSettings({block:{sourceRatios:{symbol:value}}} as never));
    assert.throws(()=>checkSettings({block:{sourceRatios:{unknown:2}}} as never));
    assert.throws(()=>checkSettings({block:{holdUntilNet:1}} as never));
  });
  it("round trips the operator's continuous 0.2 ratio with a higher Shared override", () => {
    const block = JSON.parse(JSON.stringify({ ...DEFAULT_BLOCK, ratio: 0.2, sharedRatio: 0.4,
      steps: 0, maxMult: 2, mode: "shared", historySource: "accepted-orders" }));
    assert.doesNotThrow(() => checkMerged(DEFAULT_SETTINGS, { block }));
    const levels = { config: 0, overall: 2, symbol: 0, direction: 0, indication: 0, type: 0 };
    assert.equal(blockDecide(levels, block, false).vol, 1.8);
    assert.equal(blockDecide(levels, { ...block, mode: "additive" }, false).vol, 1.4);
    assert.equal(blockDecide(levels, { ...block, mode: "overall" }, false).vol, 1.4);
    assert.equal(block.historySource, "accepted-orders");
  });

  it("keeps legacy unset Shared ratio distinct from an explicit zero override", () => {
    const legacy = { ...DEFAULT_BLOCK, ratio: 0.2, steps: 0, mode: "shared" as const };
    const levels = { config: 0, overall: 1, symbol: 0, direction: 0, indication: 0, type: 0 };
    assert.equal(blockDecide(levels, legacy, false).vol, 1.2);
    assert.equal(blockDecide(levels, { ...legacy, sharedRatio: 0 }, false).vol, 1);
    assert.doesNotThrow(() => checkSettings({ block: { ...legacy, historySource: "real-candidates" } }));
  });

  it("rejects invalid Shared ratios and unknown evidence scopes rather than silently using a different setting", () => {
    for (const sharedRatio of [-0.01, 2.01, NaN, Infinity, "0.4", null])
      assert.throws(() => checkSettings({ block: { ...DEFAULT_BLOCK, sharedRatio } } as never), /Shared ratio/);
    for (const historySource of ["all", "executed", "", null, true])
      assert.throws(() => checkSettings({ block: { ...DEFAULT_BLOCK, historySource } } as never), /history source/);
    assert.doesNotThrow(() => checkSettings({ block: { ...DEFAULT_BLOCK, sharedRatio: 2 } }));
  });
});
