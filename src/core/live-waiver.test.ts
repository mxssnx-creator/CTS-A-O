import { test } from "node:test";
import assert from "node:assert/strict";
import { applyProofWaiver, type LiveGate } from "./live-validation.ts";

const gate = (state: LiveGate["state"], ok = false): LiveGate => ({ ok, n: 0, pf: null, state });

test("a seated Micro lane with missing evidence goes live under the Micro waiver", () => {
  for (const state of ["model-insufficient", "execution-insufficient"] as const) {
    const g = applyProofWaiver(gate(state), true, "mc", false, ["mc"]);
    assert.equal(g.ok, true);
    assert.equal(g.state, "qualified");
    assert.equal(g.waived, "range");
  }
});

test("evidence that fails or is unknown is never waived", () => {
  for (const state of ["model-failed", "execution-failed", "unknown", "ineligible"] as const)
    assert.equal(applyProofWaiver(gate(state), true, "mc", false, ["mc"]).ok, false);
});

test("other ranges, signals, unseated lanes and an unset waiver keep the full proof", () => {
  const g = gate("execution-insufficient");
  assert.equal(applyProofWaiver(g, true, "mn", false, ["mc"]).ok, false);
  assert.equal(applyProofWaiver(g, true, "lg", false, ["mc"]).ok, false);
  assert.equal(applyProofWaiver(g, true, "mc", true, ["mc"]).ok, false); // signal
  assert.equal(applyProofWaiver(g, false, "mc", false, ["mc"]).ok, false); // not seated
  assert.equal(applyProofWaiver(g, true, "mc", false, undefined).ok, false);
  assert.equal(applyProofWaiver(g, true, "mc", false, []).ok, false);
});

test("a lane that already passes is returned untouched", () => {
  const g = gate("qualified", true);
  assert.equal(applyProofWaiver(g, true, "mc", false, ["mc"]), g);
});

import { promotionSampleN } from "./live-validation.ts";
test("promotion window: liveLastN sets it directly; minTrades floors it only when liveLastN is 0", () => {
  assert.equal(promotionSampleN(12, 8, 0), 8); // "8 last N for execution"
  assert.equal(promotionSampleN(12, 25, 0), 25); // the default is unchanged
  assert.equal(promotionSampleN(12, undefined, 0), 25);
  assert.equal(promotionSampleN(12, 0, 0), 12); // 0 = off: minTrades still apply
  assert.equal(promotionSampleN(0, 0, 0), 1); // never below one close
  assert.equal(promotionSampleN(12, 8, 20), 20); // engine proof N still wins when larger
});
