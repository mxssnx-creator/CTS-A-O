import assert from "node:assert/strict";
import { test } from "node:test";
import { LOW_ADX_INDS, tacticKey, tacticKeyFor } from "./filters.ts";
import { nextEntryIndex } from "../sim/backtest.ts";

// the bit-table keys equal the joins they replaced, for every tactics combination
test("tacticKey / tacticKeyFor: the same keys as the array join, for all 16 combinations", () => {
  for (let m = 0; m < 16; m++) {
    const t = { session: !!(m & 1), volRegime: !!(m & 2), trendStrength: !!(m & 4), chopRegime: !!(m & 8) } as never;
    const old = [m & 1 && "euUs", m & 2 && "volHi", m & 4 && "adx20", m & 8 && "chop"].filter(Boolean).join("+");
    assert.equal(tacticKey(t), old);
    assert.equal(tacticKeyFor(t, "rsi"), old);
    for (const low of LOW_ADX_INDS)
      assert.equal(tacticKeyFor(t, low), old.split("+").filter((x) => x && x !== "adx20").join("+"));
  }
  assert.equal(tacticKey(null), "");
  assert.equal(tacticKeyFor(undefined, "rsi"), "");
});

test("nextEntryIndex: the first entry at or after each bar (n when none), sparse and dense signals", () => {
  for (const density of [0, 0.02, 0.3, 1]) {
    let seed = 7;
    const sig = new Int8Array(500);
    for (let i = 0; i < sig.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed / 0x7fffffff < density) sig[i] = seed & 1 ? 1 : -1;
    }
    const nx = nextEntryIndex(sig);
    assert.equal(nx.length, sig.length + 1);
    for (let i = 0; i <= sig.length; i++) {
      let j = i;
      while (j < sig.length && sig[j] === 0) j++;
      assert.equal(nx[i], j, `density ${density} bar ${i}`);
    }
  }
});
