import { test } from "node:test";
import assert from "node:assert/strict";
import { periodLevels } from "./indicators.ts";
import { barsFromCandles } from "../market/bars.ts";
import { SeriesCache } from "../indications/cache.ts";
import { botTrigger } from "../bots/bots.ts";
import type { Candle } from "../domain/types.ts";

const H = 3_600_000, M = 60_000;
const previousKeys = ["prevVwap", "prevHigh", "prevLow", "prevPivot", "prevRange"] as const;
const candle = (t: number, o = 100, h = 101, l = 99, c = 100, v = 1): Candle => ({ t, o, h, l, c, v });
const hour = (start: number, o = 100, h = 101, l = 99, c = 100, v = 1) =>
  Array.from({ length: 12 }, (_, i) => candle(start + i * 5 * M, o, h, l, c, v));
const levels = (cs: Candle[]) => {
  const b = barsFromCandles("PERIOD-FIXTURE", 5, cs);
  return periodLevels(b.t, b.h, b.l, b.c, b.o, b.v, H);
};

test("a skipped whole period invalidates all previous-period levels for the following period", () => {
  const cs = [...hour(0), ...hour(2 * H, 200, 202, 198, 201, 2)];
  const actual = levels(cs);
  for (const key of previousKeys)
    for (let i = 12; i < cs.length; i++) assert.ok(Number.isNaN(actual[key][i]), `${key} at ${cs[i].t}`);
  assert.equal(actual.curOpen[12], 200);
  assert.equal(actual.curRange[12], 4);
  assert.equal(actual.curVwap[12], 601 / 3);
});

test("previous-period levels recover after the next consecutive observed period", () => {
  const cs = [...hour(0), ...hour(2 * H, 200, 202, 198, 201, 2), candle(3 * H, 201, 203, 199, 202)];
  const actual = levels(cs), i = cs.length - 1;
  assert.equal(actual.prevVwap[i], 601 / 3);
  assert.equal(actual.prevHigh[i], 202);
  assert.equal(actual.prevLow[i], 198);
  assert.equal(actual.prevPivot[i], 601 / 3);
  assert.equal(actual.prevRange[i], 4);
});

test("contiguous periods retain exact weighted VWAP, extrema, pivot and current-period arithmetic", () => {
  const actual = levels([candle(0, 10, 14, 8, 12, 2), candle(30 * M, 12, 16, 10, 15), candle(H, 20, 24, 18, 22, 3)]);
  assert.deepEqual([...actual.curOpen], [10, 10, 20]);
  assert.deepEqual([...actual.curRange], [6, 8, 6]);
  assert.equal(actual.curVwap[0], 34 / 3);
  assert.equal(actual.curVwap[1], (2 * (34 / 3) + 41 / 3) / 3);
  assert.equal(actual.curVwap[2], 64 / 3);
  for (const key of previousKeys) assert.ok(Number.isNaN(actual[key][0]) && Number.isNaN(actual[key][1]));
  assert.equal(actual.prevVwap[2], actual.curVwap[1]);
  assert.equal(actual.prevHigh[2], 16);
  assert.equal(actual.prevLow[2], 8);
  assert.equal(actual.prevPivot[2], 13);
  assert.equal(actual.prevRange[2], 8);
});

test("period levels remain prefix-causal through gap invalidation and recovery", () => {
  const cs = [...hour(0), ...hour(2 * H, 200, 202, 198, 201, 2), ...hour(3 * H, 201, 203, 199, 202)];
  const full = levels(cs);
  for (const n of [1, 11, 12, 13, 23, 24, 25, cs.length]) {
    const prefix = levels(cs.slice(0, n));
    for (const key of Object.keys(full) as Array<keyof typeof full>)
      assert.deepEqual(prefix[key], full[key].slice(0, n), `${key}, prefix ${n}`);
  }
});

test("Sweep suppresses stale-hour triggers while preserving both contiguous side directions", () => {
  const source = hour(0);
  for (const [side, bar] of [[1, candle(H, 100, 100.5, 98, 100)], [-1, candle(H, 100, 102, 99.5, 100)]] as const) {
    const contiguous = new SeriesCache(barsFromCandles("CONTIGUOUS", 5, [...source, bar]));
    assert.equal(botTrigger("sweep", contiguous)!.at(-1), side);
    const gapped = new SeriesCache(barsFromCandles("GAPPED", 5, [...source, { ...bar, t: 2 * H }]));
    assert.equal(botTrigger("sweep", gapped)!.at(-1), 0, `stale ${side > 0 ? "long" : "short"} trigger`);
  }
});
