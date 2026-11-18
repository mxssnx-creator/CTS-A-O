import { test } from "node:test";
import assert from "node:assert/strict";
import { reserveSlot } from "./bingx.ts";

test("reserveSlot spreads a burst at the gap and never delays an idle caller", () => {
  let next = 0;
  const at: number[] = [];
  for (let i = 0; i < 5; i++) {
    const r = reserveSlot(next, 1000, 100); // five callers at the same instant
    at.push(r.at);
    next = r.next;
  }
  assert.deepEqual(at, [1000, 1100, 1200, 1300, 1400]);
  assert.equal(reserveSlot(next, 5000, 100).at, 5000); // long idle: no wait
});

test("a gap of 0 turns the gate off", () => {
  assert.deepEqual(reserveSlot(9999, 1000, 0), { at: 1000, next: 9999 });
});

import { nextBoost, BOOST_MAX } from "./bingx.ts";
test("the gap doubles on a ban only up to the 2x cap and halves back to the base when quiet", () => {
  let b = 1;
  const seen: number[] = [];
  for (let i = 0; i < 5; i++) seen.push((b = nextBoost(b, "ban")));
  assert.deepEqual(seen, [2, 2, 2, 2, 2]);
  assert.equal(BOOST_MAX, 2);
  b = nextBoost(b, "quiet");
  assert.equal(b, 1);
});
