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

import { prehistoricExecutionGate } from "./live-validation.ts";
/** a settled record: r per close, cumulative gross profit / loss like a config tape's gp / gl */
const rec = (rs: number[]) => {
  const exitT = Float64Array.from(rs, (_, i) => 1000 + i * 10);
  const gp = new Float64Array(rs.length + 1), gl = new Float64Array(rs.length + 1);
  rs.forEach((r, i) => { gp[i + 1] = gp[i] + (r > 0 ? r : 0); gl[i + 1] = gl[i] + (r > 0 ? 0 : -r); });
  return { exitT, gp, gl };
};
test("prehistoric execution: the sim's last N closes fill the execution axis when they clear the PF window", () => {
  const good = rec([...Array(8).fill(0.02), -0.01, -0.01, ...Array(8).fill(0.02)]); // last 8: all wins
  const g = prehistoricExecutionGate(good, 5000, 8, 1.05);
  assert.equal(g.ok, true);
  assert.equal(g.source, "post-base-accepted");
  assert.equal(g.execution?.source, "post-base-accepted");
  assert.equal(g.waived, "prehistoric");
});
test("prehistoric execution fails closed: weak recent closes, or too few closes, stay blocked", () => {
  const weak = rec([...Array(10).fill(0.02), ...Array(5).fill(-0.02), ...Array(3).fill(0.005)]);
  assert.equal(prehistoricExecutionGate(weak, 5000, 8, 1.05).ok, false);
  assert.equal(prehistoricExecutionGate(rec([0.02, 0.02, 0.02]), 5000, 8, 1.05).ok, false);
  assert.equal(prehistoricExecutionGate(undefined, 5000, 8, 1.05).ok, false);
});
