import assert from "node:assert/strict";
import { test } from "node:test";
import { validationCohortView } from "./validation-cohort.ts";
import { validatedSetPfOf } from "../../core/validated-set-pf.ts";

test("validation headlines use each passing set once and disclose no-loss/unknown samples", () => {
  const snapshot = { at: 100, evaluated: 20, passed: 3, closes: 45, pf: 99, noLoss: false,
    pfBasis: "validated-set-mean" as const, setPf: validatedSetPfOf([
      { n: 10, gp: 8, gl: 1 }, { n: 30, gp: 20, gl: 10 }, { n: 5, gp: .1, gl: 0 }]) };
  const result = validationCohortView(snapshot);
  assert.equal(result.pf, 5); assert.equal(result.pfText, "5.00");
  assert.equal(result.counts, "3 / 20"); assert.equal(result.fraction, .15); assert.equal(result.at, 100);
  assert.match(result.basisText, /2 finite PF sets · 1 no-loss sets · 0 unknown/);
  const noLoss = validationCohortView({ ...snapshot, passed: 1, setPf: validatedSetPfOf([{ n: 5, gp: 1, gl: 0 }]) });
  assert.equal(noLoss.pfText, "No losses");
  assert.equal(validationCohortView({ ...snapshot, passed: 0, closes: 0, setPf: validatedSetPfOf([]) }).pfText, "Unavailable");
  assert.equal(validationCohortView({ ...snapshot, evaluated: 0, passed: 0, closes: 0, setPf: validatedSetPfOf([]) }).fraction, null);
  assert.equal(validationCohortView({ ...snapshot, setPf: undefined }).pfText, "Unavailable", "no legacy pooled fallback");
  assert.equal(validationCohortView({ ...snapshot, setPf: validatedSetPfOf([{ n: 5 },{ n: 5, gp: 2, gl: 1 },{ n: 5, gp: 3, gl: 1 }]) }).pfText, "Unavailable");
  for (const value of [undefined, null, { ...snapshot, passed: 21 }, { ...snapshot, evaluated: NaN }]) {
    assert.equal(validationCohortView(value).available, false);
    assert.equal(validationCohortView(value).pfText, "Unavailable");
  }
});
