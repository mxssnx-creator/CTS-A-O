import assert from "node:assert/strict";
import { it } from "node:test";
import { validationProgressOf } from "./validation-progress.ts";

it("reports empty, no-loss and invalid validation summaries without inventing PF", () => {
  const empty = { evaluated: 3, passed: 0, closes: 0, gp: 0, gl: 0, failures: {} };
  assert.deepEqual(validationProgressOf(empty, 100), { at: 100, evaluated: 3, passed: 0, closes: 0, pf: null, noLoss: false });
  assert.deepEqual(validationProgressOf({ ...empty, passed: 1, closes: 2, gp: 0.1 }, 100),
    { at: 100, evaluated: 3, passed: 1, closes: 2, pf: null, noLoss: true });
  assert.equal(validationProgressOf({ ...empty, passed: 4 }, 100), null);
  assert.equal(validationProgressOf({ ...empty, gp: Infinity }, 100), null);
  assert.equal(validationProgressOf(undefined, 100), null);
});
