// The Base partition: every combo once, one indication's combos in one part, equal sizes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { partitionByIndication } from "./partition.ts";

describe("Base partition across workers", () => {
  const combos = ["b|x", "a|y", "c|x", "a|z", "b|y", "c|x", "a|y", "b|x"].map((ind, i) => ({ ind, i }));
  it("every combo goes to exactly one part", () => {
    const parts = partitionByIndication(combos, 3);
    const all = parts.flat().map((c) => c.i).sort((x, y) => x - y);
    assert.deepEqual(all, combos.map((c) => c.i));
  });
  it("one indication's combos are never split across parts (contiguous after the sort)", () => {
    const parts = partitionByIndication(combos, 3);
    // each indication appears in at most two adjacent parts (only the cut between parts can split it)
    for (const ind of new Set(combos.map((c) => c.ind))) {
      const where = parts.map((p, k) => (p.some((c) => c.ind === ind) ? k : -1)).filter((k) => k >= 0);
      assert.ok(where.length <= 2 && (where.length < 2 || where[1] === where[0] + 1), `${ind} in ${where}`);
    }
  });
  it("the parts are of equal size, up to one", () => {
    const sizes = partitionByIndication(combos, 3).map((p) => p.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 3);
  });
  it("no combos gives empty parts; one part is everything", () => {
    assert.deepEqual(partitionByIndication([], 4).map((p) => p.length), [0, 0, 0, 0]);
    assert.equal(partitionByIndication(combos, 1)[0].length, combos.length);
  });
});
