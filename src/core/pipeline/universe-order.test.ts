import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { barsFromCandles, resample, syntheticCandles } from "../market/bars.ts";
import { makeUniverse } from "./pipeline.ts";
import { buildTapes, defaultWalkForward, walkForward } from "../sim/walkforward.ts";

const H = 3_600_000, start = Date.UTC(2026, 10, 1);
function groups() {
  return ["XRP-USDT", "BTC-USDT", "SOL-USDT"].map((sym) => {
    const candles = syntheticCandles(sym, 1, 36 * 60, start + 36 * H);
    // Lane order is an explicit caller policy, independent of symbol load order.
    return [15, 1, 5].map((tf) => barsFromCandles(sym, tf, tf === 1 ? candles : resample(candles, 1, tf)));
  });
}

test("loaded-symbol order cannot change universe slots, market inputs or indicator warmup", () => {
  const source = groups(), input = source.flat(), saved = [...input];
  const short = barsFromCandles("AAA-USDT", 1, syntheticCandles("AAA", 1, 60, start + H));
  input.push(short);
  const a = makeUniverse(input, start + 12 * H);
  const b = makeUniverse([short, ...[...source].reverse().flat()], start + 12 * H);
  const slots = (u: ReturnType<typeof makeUniverse>) => u.bars.map((v) => [v.sym, v.tfMin]);
  assert.deepEqual(slots(a), slots(b));
  assert.deepEqual(slots(a), [["AAA-USDT",1], ...["BTC-USDT", "SOL-USDT", "XRP-USDT"].flatMap((s) => [15, 1, 5].map((tf) => [s, tf]))]);
  assert.deepEqual(a.series, b.series, "short series stay in the canonical market reference");
  assert.equal(a.series[0], short);
  assert.equal(a.startT, start + 12 * H);
  assert.equal(a.indicatorStartT, Math.min(...saved.map((v) => v.t[0])));
  assert.deepEqual(input, [...saved, short], "sorting never mutates caller arrays or candle data");
  for (const v of saved) assert.ok(a.bars.includes(v), "preserve original immutable bar objects");
  assert.deepEqual(slots(makeUniverse(a.series, a.evaluationFromT)), slots(a), "worker reconstruction keeps slots");
});

test("reversed symbol arrival gives identical nonempty tapes and complete walk-forward output", () => {
  const source = groups(), boundary = start + 12 * H;
  const a = makeUniverse(source.flat(), boundary), b = makeUniverse([...source].reverse().flat(), boundary);
  const protects = [{ tp: .006, sl: .006, trail: 0, hold: 60 }, { tp: .006, sl: .006, trail: .003, hold: 60 }];
  const pairs = new Set(["follow|ema-9-21@m5", "follow|ema-21-55@m15"]);
  const at = buildTapes(a, protects, .001, undefined, pairs, null);
  const bt = buildTapes(b, protects, .001, undefined, pairs, null);
  assert.ok(at.reduce((n, tp) => n + tp.n, 0) > 0, "exercise actual closed histories");
  assert.deepEqual(bt, at, "symbol indices, ordering, closes, costs and held policies match");
  const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 12, longH: 12, simH: 12, mode: "fixed" as const };
  assert.deepEqual(walkForward(b, bt, wf), walkForward(a, at, wf));
});
