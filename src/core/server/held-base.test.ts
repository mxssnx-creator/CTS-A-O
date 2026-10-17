import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward, execDecision, selectFixed } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { restrictHeldBasePairs } from "./runtime.server.ts";

describe("held engine configs after a Base failure", () => {
  it("rebuilds only the exact held identity for exits, preserving its protection and rejecting re-entry", () => {
    const pair = "follow|ema-21-55@m15";
    const u = makeUniverse([barsFromCandles("AAA-USDT", 15, syntheticCandles("AAA-USDT", 15, 720, Date.UTC(2026, 9, 17), 7))]);
    const protects = [
      { tp: 0.5, sl: 0.5, trail: 0, hold: 10_000 },
      { tp: 0.6, sl: 0.5, trail: 0, hold: 10_000 },
    ];
    const pairs = new Set([pair]);
    const original = buildTapes(u, protects, 0.0015, undefined, pairs);
    assert.equal(original.length, 2, "the unrestricted path reproduces the unwanted sibling rebuild");
    const held = original[0];
    assert.ok(held.open.length > 0, "the exact held config has a position requiring protection");
    const pairTags: Record<string, readonly string[]> = {};
    restrictHeldBasePairs(pairTags, pairs);
    assert.deepEqual(pairTags, { [pair]: [] }, "missing Base result becomes explicit failure");

    const rebuilt = buildTapes(u, protects, 0.0015, undefined, pairs, undefined, undefined, {
      minSl: 0,
      minTrail: 0,
      pairTags,
      heldIds: new Set([held.id]),
    });
    assert.equal(rebuilt.length, 1, "failed Base cannot rebuild unrelated configs");
    assert.equal(rebuilt[0].id, held.id);
    assert.equal(rebuilt[0].heldOnly, true);
    assert.deepEqual(rebuilt[0].protect, held.protect);
    assert.deepEqual(rebuilt[0].open, held.open, "held exits retain exact targets, stops and entry identity");
    assert.deepEqual(Array.from(rebuilt[0].r), Array.from(held.r));

    const wf = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(selectFixed(rebuilt, u.nowT, wf).picks.length, 0);
    assert.deepEqual(execDecision(rebuilt[0], u.nowT, wf, { sym: "AAA-USDT", side: 1 }), { ok: false, why: "heldOnly" });
  });

  it("preserves evaluated passed and explicit failed ranges without admitting absent siblings", () => {
    const passed = ["gn", "lg"];
    const pairTags: Record<string, readonly string[]> = { passed, failed: [] };
    restrictHeldBasePairs(pairTags, new Set(["passed", "failed", "missing"]));
    assert.equal(pairTags.passed, passed, "passed ranges retain their independent Base decision");
    assert.deepEqual(pairTags.failed, []);
    assert.deepEqual(pairTags.missing, []);
  });
});
