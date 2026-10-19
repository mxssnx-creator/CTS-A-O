import { it } from "node:test";
import assert from "node:assert/strict";
import { BOOK_NOTIONAL_EPS_USD, normalizedBookNotional } from "./book-notional.mjs";
it("normalizes exhausted-cap floating-point residue before it can establish simulated ownership", () => {
  const room = Math.max(0, 0.3 - (0.1 + 0.2 - Number.EPSILON));
  assert.ok(room > 0 && room < BOOK_NOTIONAL_EPS_USD);
  const r = normalizedBookNotional(room);
  assert.equal(r.notional, 0); assert.equal(r.roundoffZeroed, true); assert.equal(r.raw, room);
});
it("keeps meaningful partial allocation and every amount above the frozen numerical threshold", () => {
  for (const value of [5, 1e-7, BOOK_NOTIONAL_EPS_USD * (1 + Number.EPSILON)]) {
    assert.equal(normalizedBookNotional(value).notional, value);
    assert.equal(normalizedBookNotional(value).roundoffZeroed, false);
  }
  assert.equal(normalizedBookNotional(BOOK_NOTIONAL_EPS_USD).notional, 0);
  assert.equal(normalizedBookNotional(0).notional, 0);
  assert.equal(normalizedBookNotional(0).roundoffZeroed, false);
});
it("keeps invalid/unknown monetary evidence unavailable instead of manufacturing zero allocation", () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity, -1, "0", "1"])
    assert.deepEqual(normalizedBookNotional(value), { raw: value, notional: null, roundoffZeroed: false });
});
