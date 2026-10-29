import assert from "node:assert/strict";
import { test } from "node:test";
import { addValidatedSetPf, emptyValidatedSetPf, mergeValidatedSetPf, validatedSetPf, validatedSetPfOf } from "./validated-set-pf.ts";

test("validated sets each contribute one PF, independently of their loss volume and overlapping histories", () => {
  const rows = [{ n: 10, gp: 8, gl: 1 }, { n: 100, gp: 20, gl: 10 }];
  const r = validatedSetPfOf(rows);
  assert.equal(r.pf, 5); assert.notEqual(r.pf, 28 / 11, "a pooled ratio is a different diagnostic");
  assert.equal(r.sets, 2); assert.equal(r.finiteSets, 2);
});

test("no-loss sets stay explicit and never become the finite gate score4", () => {
  const all = validatedSetPfOf([{ n: 5, gp: .1, gl: 0 }]);
  assert.equal(all.pf, null); assert.equal(all.noLoss, true); assert.equal(all.noLossSets, 1);
  const mixed = validatedSetPfOf([{ n: 5, gp: 8, gl: 1 }, { n: 5, gp: .1, gl: 0 }]);
  assert.equal(mixed.pf, 8); assert.equal(mixed.finiteSets, 1); assert.equal(mixed.noLossSets, 1);
  assert.equal(mixed.noLoss, false);
  assert.equal(validatedSetPfOf([{ n: 5, gp: 2e-14, gl: 1e-14 }]).pf, 2, "small real losses are not no-loss samples");
});

test("empty, legacy and corrupt passing evidence cannot be replaced by a pool or execution PF", () => {
  for (const bad of [{ n: 0, gp: 0, gl: 0 }, { n: 5 }, { n: 5, gp: NaN, gl: 1 }, { n: 5, gp: 1, gl: -1 }]) {
    const r = validatedSetPfOf([{ n: 5, gp: 8, gl: 1 }, bad]);
    assert.equal(r.pf, null); assert.equal(r.sets, 2); assert.equal(r.unavailableSets, 1);
  }
  assert.equal(validatedSetPf(undefined), null);
  assert.equal(validatedSetPfOf([]).pf, null);
});

test("bounded grouped summaries have the same per-set mean as a scalar evaluation", () => {
  const a = emptyValidatedSetPf(), b = emptyValidatedSetPf();
  addValidatedSetPf(a, 5, 8, 1); addValidatedSetPf(b, 10, 20, 10); addValidatedSetPf(b, 5, .1, 0);
  mergeValidatedSetPf(a, b);
  assert.deepEqual(validatedSetPf(a), validatedSetPfOf([{ n: 5, gp: 8, gl: 1 }, { n: 10, gp: 20, gl: 10 }, { n: 5, gp: .1, gl: 0 }]));
});
