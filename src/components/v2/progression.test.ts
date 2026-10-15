import assert from "node:assert/strict";
import { test } from "node:test";
import { pooledBasePfText, signalProgressCounts, promotionWindowPfText } from "./progression.ts";

test("Base pooled PF uses gross evidence rather than treating a no-loss score as an exact ratio", () => {
  assert.equal(pooledBasePfText({ passed: 2, passedGp: 4, passedGl: 1 }), "4.00");
  assert.equal(pooledBasePfText({ passed: 2, passedGp: 1, passedGl: 0 }), "No losses");
  assert.equal(pooledBasePfText({ passed: 0, passedGp: 1, passedGl: 0 }), "–");
  assert.equal(pooledBasePfText({ passed: 2 }), "Basis unavailable");
});

test("strict promotion evidence never converts unknown or insufficient owned history into a positive PF", () => {
  const measured = { n: 20, pf: 4, unknown: 0, noLoss: false, pfConvention: "ratio" };
  assert.equal(promotionWindowPfText(measured), "4.00");
  assert.equal(promotionWindowPfText({ ...measured, noLoss: true, pfConvention: "no-loss-score" }), "No losses");
  assert.equal(promotionWindowPfText({ ...measured, unknown: 1, pf: null }), "Unknown");
  assert.equal(promotionWindowPfText({ ...measured, n: 19, pf: null }), "Insufficient");
  assert.equal(promotionWindowPfText({ ...measured, n: 0, pf: null }), "No closes");
  assert.equal(promotionWindowPfText({ n: 20, pf: 4 }), "Basis unavailable");
});

test("Signal discovery counts cannot be inferred from the different representative or config populations", () => {
  assert.deepEqual(signalProgressCounts({ discoveryPairs: 504, representativePassed: 0, configs: 19656 }), { discovery: 504, representativePassed: 0, requested: 19656 });
  assert.deepEqual(signalProgressCounts({ representativePassed: 12 }), { discovery: null, representativePassed: 12, requested: null });
  assert.deepEqual(signalProgressCounts({ discoveryPairs: NaN, representativePassed: -1 }), { discovery: null, representativePassed: null, requested: null });
});
