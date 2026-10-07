// Work the live tick does on the main thread runs in time-boxed steps: a long catch-up is spread over ticks.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catchUp } from "./loop-budget.ts";

describe("loop budget: catch-up in time-boxed steps", () => {
  it("advances in chunks until there, and reports whether it got there within the budget", () => {
    let i = 0;
    const n = 10_000;
    const advance = (_t: number, max: number) => {
      i = Math.min(n, i + max);
      return i >= n;
    };
    assert.equal(catchUp(advance, 0, 1_000), true);
    assert.equal(i, n);
  });

  it("stops at the budget and continues on the next call from where it was", () => {
    let i = 0;
    const n = 1_000_000;
    const advance = (_t: number, max: number) => {
      const end = performance.now() + 0.2; // each chunk costs ~0.2 ms
      while (performance.now() < end);
      i = Math.min(n, i + max);
      return i >= n;
    };
    const t0 = performance.now();
    assert.equal(catchUp(advance, 0, 5), false);
    const ms = performance.now() - t0;
    assert.ok(ms < 200, `one call held the loop ${ms.toFixed(1)} ms`);
    const after = i;
    assert.ok(after > 0 && after < n);
    catchUp(advance, 0, 5);
    assert.ok(i > after, "the next call continues");
  });
});
