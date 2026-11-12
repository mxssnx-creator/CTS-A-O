import { test } from "node:test";
import assert from "node:assert/strict";
import { dcaTacticConfigs, dcaTacticId, dcaTacticState } from "./dca-tactic.ts";
import { SeriesCache } from "./cache.ts";
import { StreamMath } from "./stream-math.ts";
import { waveBars, declineBars, declineCellBars } from "./dca-fixtures.ts";
import type { Bars } from "../domain/types.ts";
const bars = (rows: ReturnType<typeof waveBars>): Bars => ({
  sym: "SOL-USDT",
  tfMin: 1,
  n: rows.length,
  t: Float64Array.from(rows, (r) => r.timestamp),
  o: Float64Array.from(rows, (r) => r.open),
  h: Float64Array.from(rows, (r) => r.high),
  l: Float64Array.from(rows, (r) => r.low),
  c: Float64Array.from(rows, (r) => r.close),
  v: Float64Array.from(rows, (r) => r.volume),
});
test("DCA Tactic has 2256 independent level/range/ratio sources, with mirrored pre-entry directions", () => {
  assert.equal(dcaTacticConfigs().length, 2256);
  assert.equal(new Set(dcaTacticConfigs().map(dcaTacticId)).size, 2256);
  for (const method of ["bounce", "trend", "vwap", "sweep"] as const) {
    const c = {
      lookback: 8,
      basis: "percent" as const,
      spacing: 0.5,
      level: 2,
      recovery: 0.5,
      method,
    };
    assert.equal(dcaTacticState(new SeriesCache(bars(declineBars())), c).at(-1), 1, method);
    assert.equal(dcaTacticState(new SeriesCache(bars(declineBars(true))), c).at(-1), -1, method);
    assert.equal(
      dcaTacticState(new SeriesCache(bars(declineBars())), { ...c, level: 1 }).at(-1),
      0,
    );
  }
});
test("all Tactic candidates are causal and incremental results equal the full oracle", () => {
  const rows = waveBars(240),
    stream = new StreamMath(),
    fullCache = new SeriesCache(bars(rows)),
    configs = dcaTacticConfigs(),
    full = new Map(configs.map((c) => [dcaTacticId(c), dcaTacticState(fullCache, c)]));
  for (const n of [80, 160, 201, 240]) {
    const k = new SeriesCache(bars(rows.slice(0, n)));
    k.enableStreaming(stream);
    for (const c of configs)
      assert.deepEqual(dcaTacticState(k, c), full.get(dcaTacticId(c))!.slice(0, n), dcaTacticId(c));
  }
});

test("every registered decline cell has causal long and short onsets, with impossible ATR cells rejected", () => {
  for (const c of dcaTacticConfigs()) for (const mirrored of [false, true]) {
    const rows = declineCellBars(c, mirrored), cache = new SeriesCache(bars(rows));
    assert.equal(dcaTacticState(cache, c).at(-1), mirrored ? -1 : 1, dcaTacticId(c));
    const prefix = new SeriesCache(bars(rows.slice(0,-1)));
    assert.deepEqual(dcaTacticState(prefix,c),dcaTacticState(cache,c).slice(0,-1),dcaTacticId(c)+" causal prefix");
  }
  assert.equal(dcaTacticConfigs().some(c=>c.basis==="atr"&&c.level*c.spacing>c.lookback),false);
});
