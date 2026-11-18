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
