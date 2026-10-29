import assert from "node:assert/strict";
import { test } from "node:test";
import { validationCohortView } from "./validation-cohort.ts";

test("validation PF and percentage use the passing snapshot without borrowing another PF", () => {
  const snapshot = { at: 100, evaluated: 20, passed: 3, closes: 45, pf: 1.8, noLoss: false };
  assert.deepEqual(validationCohortView(snapshot), { available: true, pf: 1.8, pfText: "1.80", fraction: .15, counts: "3 / 20", at: 100 });
  assert.equal(validationCohortView({ ...snapshot, passed: 0, closes: 0, pf: .4 }).pfText, "Unavailable");
  assert.equal(validationCohortView({ ...snapshot, passed: 0, closes: 0, pf: .4 }).fraction, 0);
  assert.equal(validationCohortView({ ...snapshot, pf: null, noLoss: true }).pfText, "No losses");
  assert.equal(validationCohortView({ ...snapshot, evaluated: 0, passed: 0, closes: 0, pf: null }).fraction, null);
  for (const value of [undefined, null, { ...snapshot, passed: 21 }, { ...snapshot, evaluated: NaN }]) {
    assert.equal(validationCohortView(value).available, false);
    assert.equal(validationCohortView(value).pfText, "Unavailable");
  }
});
