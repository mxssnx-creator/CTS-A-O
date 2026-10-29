import assert from "node:assert/strict";
import { it } from "node:test";
import { validationProgressOf } from "./validation-progress.ts";
import { addValidatedSetPf, emptyValidatedSetPf } from "./validated-set-pf.ts";

it("reports the arithmetic PF of passing sets and preserves the different pooled diagnostic", () => {
  const setPf = emptyValidatedSetPf();
  addValidatedSetPf(setPf, 5, 8, 1); addValidatedSetPf(setPf, 50, 20, 10);
  const result = validationProgressOf({ evaluated: 20, passed: 2, closes: 55, gp: 28, gl: 11, failures: {}, setPf }, 100)!;
  assert.equal(result.pf, 5); assert.equal(result.pooledPf, 28 / 11);
  assert.equal(result.pfBasis, "validated-set-mean"); assert.equal(result.passed / result.evaluated, .1);
  assert.equal(result.setPf?.sets, 2); assert.equal(result.at, 100);
});

it("reports empty, no-loss, legacy and invalid summaries without inventing PF", () => {
  const empty = { evaluated: 3, passed: 0, closes: 0, gp: 0, gl: 0, failures: {}, setPf: emptyValidatedSetPf() };
  const result = validationProgressOf(empty, 100)!;
  assert.equal(result.pf, null); assert.equal(result.noLoss, false); assert.equal(result.pooledPf, null);
  const setPf = emptyValidatedSetPf(); addValidatedSetPf(setPf, 2, .1, 0);
  const noLoss = validationProgressOf({ ...empty, passed: 1, closes: 2, gp: .1, setPf }, 100)!;
  assert.equal(noLoss.pf, null); assert.equal(noLoss.noLoss, true);
  const legacy = validationProgressOf({ ...empty, passed: 1, closes: 2, gp: 2, gl: 1, setPf: undefined }, 100)!;
  assert.equal(legacy.pf, null); assert.equal(legacy.pfBasis, "unavailable"); assert.equal(legacy.pooledPf, 2);
  assert.equal(validationProgressOf({ ...empty, passed: 4 }, 100), null);
  assert.equal(validationProgressOf({ ...empty, passed: 1 }, 100), null, "per-set count must match passing count");
  assert.equal(validationProgressOf({ ...empty, gp: Infinity }, 100), null);
  assert.equal(validationProgressOf(undefined, 100), null);
});
