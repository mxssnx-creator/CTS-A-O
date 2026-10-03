// Base partial progression: every combo is refreshed once every K computes, new combos at once, all of them when
// there is no cache.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { baseSlice } from "./runtime.server.ts";

const combos = Array.from({ length: 10 }, (_, i) => ({ bot: "follow", ind: `i${i}` }));
const key = (c: { bot: string; ind: string }) => `${c.bot}|${c.ind}`;

describe("Base partial progression", () => {
  it("no cache or one slice: every combo", () => {
    assert.equal(baseSlice(combos, null, 4, key).todo.length, 10);
    const runs = new Map(combos.map((c) => [key(c), 1]));
    assert.equal(baseSlice(combos, { runs, slice: 0 }, 1, key).todo.length, 10);
  });

  it("K slices: each compute a K-th, every combo once over K computes", () => {
    const runs = new Map(combos.map((c) => [key(c), 1]));
    let slice = 0;
    const seen = new Map<string, number>();
    for (let k = 0; k < 3; k++) {
      const r = baseSlice(combos, { runs, slice }, 3, key);
      assert.ok(r.todo.length <= 4);
      for (const c of r.todo) seen.set(key(c), (seen.get(key(c)) ?? 0) + 1);
      slice = r.sliceNo;
    }
    assert.equal(seen.size, 10);
    assert.ok([...seen.values()].every((n) => n === 1));
  });

  it("a combo the cache does not hold is computed at once", () => {
    const runs = new Map(combos.slice(0, 9).map((c) => [key(c), 1]));
    const r = baseSlice(combos, { runs, slice: 0 }, 5, key);
    assert.ok(r.todo.some((c) => c.ind === "i9"));
  });
});
