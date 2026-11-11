import assert from "node:assert/strict";
import { test } from "node:test";
import { CandleSeries, baseHistoryCut, barsOfSeries } from "./candle-series.ts";
import type { Candle } from "../domain/types.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { laneSeriesOf, normalizeLanes } from "../server/runtime.server.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { hasMinutePrices } from "../sim/capped-execution.ts";

const M = 60_000;
const T0 = Date.UTC(2026, 10, 9);
/** n valid 1m candles from T0, without the minutes listed in `drop` */
const candles = (n: number, drop: readonly number[] = []): Candle[] => {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    if (drop.includes(i)) continue;
    const c = 100 + Math.sin(i / 7);
    out.push({ t: T0 + i * M, o: c, h: c + 0.2, l: c - 0.2, c: c + 0.05, v: 10 + (i % 5) });
  }
  return out;
};
const s = normalizeLanes({ ...DEFAULT_SETTINGS, tfs: [1, 5, 15], tfDays: { "1": 1, "5": 1, "15": 1 } });

test("a complete series has no cut; a missing bar cuts after it and counts what the venue did not deliver", () => {
  assert.equal(baseHistoryCut(CandleSeries.fromCandles(candles(500)), 1), null);
  assert.equal(baseHistoryCut(CandleSeries.EMPTY, 1), null);
  const one = baseHistoryCut(CandleSeries.fromCandles(candles(500, [300])), 1);
  assert.deepEqual(one, { start: 300, afterT: T0 + 299 * M, firstT: T0 + 301 * M, missing: 1 });
  // KNTQ-USDT on BingX VST, 3 Nov 2026: four consecutive minutes missing
  const four = baseHistoryCut(CandleSeries.fromCandles(candles(500, [100, 101, 102, 103])), 1);
  assert.deepEqual(four, { start: 100, afterT: T0 + 99 * M, firstT: T0 + 104 * M, missing: 4 });
  // the LAST break decides: everything after it is contiguous
  const two = baseHistoryCut(CandleSeries.fromCandles(candles(500, [50, 400])), 1)!;
  assert.equal(two.start, 399, "minute 401 sits at index 399: two earlier minutes are absent");
  assert.equal(two.missing, 1);
  assert.equal(two.firstT, T0 + 401 * M);
});

test("an invalid bar is a break too, and a break at the very end leaves nothing usable", () => {
  const bad = candles(200);
  bad[120] = { ...bad[120], h: bad[120].l - 1 };
  assert.deepEqual(baseHistoryCut(CandleSeries.fromCandles(bad), 1), { start: 121, afterT: T0 + 120 * M, firstT: T0 + 121 * M, missing: 0 });
  const nan = candles(200);
  nan[10] = { ...nan[10], c: NaN };
  assert.equal(baseHistoryCut(CandleSeries.fromCandles(nan), 1)!.start, 11);
  const zero = candles(200);
  zero[199] = { ...zero[199], l: 0 };
  const end = baseHistoryCut(CandleSeries.fromCandles(zero), 1)!;
  assert.equal(end.start, 200);
  assert.equal(barsOfSeries("X", 1, CandleSeries.fromCandles(zero).range(end.start, 200), 0, 0).n, 0);
});

test("one symbol's missing minute no longer invalidates the universe: its execution prices start after the break", () => {
  const whole = CandleSeries.fromCandles(candles(1440));
  const gappy = CandleSeries.fromCandles(candles(1440, [700]));
  // the validator's verdict on the series as stored — what every compute received before the cut existed
  const raw = [barsOfSeries("A-USDT", 1, whole, 0, whole.n), barsOfSeries("GAP-USDT", 1, gappy, 0, gappy.n)];
  assert.throws(() => hasMinutePrices(makeUniverse(raw)), /incomplete\/invalid minute execution prices: GAP-USDT/);

  const cuts = new Map();
  const bars = [...laneSeriesOf("A-USDT", whole, s, 0, 0, cuts), ...laneSeriesOf("GAP-USDT", gappy, s, 0, 0, cuts)];
  assert.deepEqual([...cuts.keys()], ["GAP-USDT"], "only the symbol with the break is cut");
  assert.deepEqual(cuts.get("GAP-USDT"), { start: 700, afterT: T0 + 699 * M, firstT: T0 + 701 * M, missing: 1 });
  const u = makeUniverse(bars);
  assert.equal(hasMinutePrices(u), true, "the universe validates");
  const m = (sym: string, tf: number) => bars.find((b) => b.sym === sym && b.tfMin === tf)!;
  assert.equal(m("A-USDT", 1).n, 1440, "an unaffected symbol keeps all of its history");
  assert.equal(m("GAP-USDT", 1).n, 739);
  assert.equal(m("GAP-USDT", 1).t[0], T0 + 701 * M);
  for (let i = 1; i < m("GAP-USDT", 1).n; i++) assert.equal(m("GAP-USDT", 1).t[i], m("GAP-USDT", 1).t[i - 1] + M);
  // the resampled lanes keep the history before the break; only the bucket holding the missing minute is dropped
  assert.equal(m("A-USDT", 5).n, 288);
  assert.equal(m("GAP-USDT", 5).n, 287);
  assert.ok(m("GAP-USDT", 5).t[0] < T0 + 700 * M, "the 5m lane still starts before the break");
  assert.ok(!Array.from(m("GAP-USDT", 5).t).includes(T0 + 700 * M), "the incomplete bucket is not a bar");
  assert.equal(m("GAP-USDT", 15).n, 95);
});

test("nothing is invented: no bar of the cut series was absent from the venue's own candles", () => {
  const src = candles(600, [250]);
  const cs = CandleSeries.fromCandles(src);
  const [base] = laneSeriesOf("GAP-USDT", cs, s);
  const known = new Map(src.map((c) => [c.t, c]));
  for (let i = 0; i < base.n; i++) {
    const c = known.get(base.t[i]);
    assert.ok(c, "a bar the venue delivered");
    assert.deepEqual([base.o[i], base.h[i], base.l[i], base.c[i], base.v[i]], [c.o, c.h, c.l, c.c, c.v]);
  }
  assert.ok(!Array.from(base.t).includes(T0 + 250 * M));
});
