import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { baseAllowsTape, defaultWalkForward } from "./walkforward.ts";

test("Wide off rejects carried ordinary tapes for new admission without affecting tagged or Signal ranges", () => {
  const pair = "follow|ema-cross";
  const base = { bot: "follow" as const, ind: "ema-cross", kind: "axis" as const,
    protect: { tp: .01, sl: .005, trail: 0, hold: 8 } };
  const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), basePassed: new Set([pair]),
    basePassedRanges: { [pair]: ["", "mn"] }, baseWideLadderPairs: new Set([pair]) };
  assert.equal(wf.wideEnabled, false);
  assert.equal(baseAllowsTape(base, wf), false, "carried Wide cannot reopen after the setting changes");
  assert.equal(baseAllowsTape({ ...base, protect: { ...base.protect, tag: "mn" } }, wf), true);
  assert.equal(baseAllowsTape(base, { ...wf, wideEnabled: true }), true, "explicitly enabled Wide is admitted");
  const signal = { ...base, ind: "sig-ema-cross-short@m15" };
  assert.equal(baseAllowsTape(signal, { wideEnabled: false }), true, "Signal is its own coordination");
});
