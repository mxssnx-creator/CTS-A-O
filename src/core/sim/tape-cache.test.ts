import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROTECT, DEFAULT_SETTINGS } from "../config.ts";
import { barsFromCandles, resample, syntheticCandles } from "../market/bars.ts";
import { allCombos, makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, buildTapesBoundedGen, defaultWalkForward } from "./walkforward.ts";

const end = Date.UTC(2026, 9, 17);
function universe() {
  return makeUniverse(["A", "B"].flatMap(sym => {
    const cs = syntheticCandles(sym, 1, 6000, end);
    return [1, 5, 15].map(tf => barsFromCandles(sym + "-USDT", tf, tf === 1 ? cs : resample(cs, 1, tf)));
  }));
}
const memoCount = (u: ReturnType<typeof universe>) => u.caches.reduce((n, cache) =>
  n + (cache as unknown as { m: Map<string, unknown> }).m.size, 0);

test("bounded local histories preserve every tape column, config identity, held and pending order", () => {
  const u = universe(), reference = universe();
  const pairs = new Set(allCombos(undefined, undefined, [1, 5, 15])
    .filter(c => c.bot === "follow").filter((_, i) => i % 29 === 0).slice(0, 40)
    .map(c => `${c.bot}|${c.ind}`));
  const protects = [DEFAULT_PROTECT, { ...DEFAULT_PROTECT, trail: 0.004 }];
  const wf = defaultWalkForward(DEFAULT_SETTINGS);
  const dca = { protects: wf.dcaProtects.slice(0, 1), dca: wf.dca,
    axis: { ...DEFAULT_SETTINGS.axis, ranges: ["atr"] as const, levelsSet: [2], hybrids: [false] } };
  const expected = buildTapes(reference, protects, 0.002, dca, pairs, null);
  const gen = buildTapesBoundedGen(u, protects, 0.002, dca, pairs, null);
  for (;;) {
    const result = gen.next();
    if (!result.done) continue;
    assert.ok(result.value.some(t => t.n > 0));
    assert.ok(result.value.some(t => t.open.length || t.pending.length));
    assert.deepEqual(result.value, expected);
    break;
  }
  assert.equal(memoCount(u), 0, "finished work releases disposable series, not historical tape data");
  assert.ok(memoCount(reference) > 0, "control exercises retained indicator caches");
});

test("cancelled local history work releases derived series without changing the source candles", () => {
  const u = universe(), before = u.bars.map(b => [...b.c]);
  const gen = buildTapesBoundedGen(u, [DEFAULT_PROTECT], 0.002, undefined, new Set(["follow|ema-9-21@m5"]), null);
  assert.equal(gen.next().done, false);
  assert.ok(memoCount(u) > 0);
  gen.return([]);
  assert.equal(memoCount(u), 0);
  assert.deepEqual(u.bars.map(b => [...b.c]), before);
});
