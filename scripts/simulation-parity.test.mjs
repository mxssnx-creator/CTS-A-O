import assert from "node:assert/strict";
import { it } from "node:test";
import { reconcileReturns } from "./audit-simulation-parity.mjs";
const trade = (patch = {}) => ({
  cfg: "own-config",
  sym: "A",
  side: 1,
  entryT: 10,
  exitT: 20,
  r: 0.02,
  mult: 2,
  ...patch,
});
it("identical simulation cohort preserves every return after exactly one external weighting removal", () => {
  const r = reconcileReturns(
    [
      ["A", 1, 10, 20, 0.01],
      ["A", 1, 30, 40, -0.02],
    ],
    [trade(), trade({ entryT: 30, exitT: 40, r: -0.06, mult: 3 })],
  );
  assert.equal(r.matched.length, 2);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.mismatched, []);
  assert.equal(r.matched[0].tapeR, r.matched[0].executionR);
  assert.equal(r.matched[1].tapeR, r.matched[1].executionR);
});
it("the audit catches double costs, duplicate executions, wrong side and unknown provenance", () => {
  const tape = [["A", 1, 10, 20, 0.01]];
  assert.equal(reconcileReturns(tape, [trade({ r: 0.017 })]).mismatched.length, 1);
  assert.equal(reconcileReturns(tape, [trade(), trade()]).missing.length, 1);
  assert.equal(reconcileReturns(tape, [trade({ side: -1 })]).missing.length, 1);
  assert.equal(reconcileReturns(tape, [trade({ mult: undefined })]).mismatched.length, 1);
});
