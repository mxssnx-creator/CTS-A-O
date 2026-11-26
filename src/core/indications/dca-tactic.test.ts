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

test("Tactic validity recovers exactly when malformed bars and gaps leave the causal window", () => {
  const config = {
    lookback: 8, basis: "percent" as const, spacing: 0.5, level: 2, recovery: 0.5, method: "bounce" as const,
  };
  const cases: { name: string; mutate: (b: Bars) => void; lastInvalid: number }[] = [
    ...(["o", "h", "l", "c", "v"] as const).map((key) => ({
      name: `non-finite ${key}`, mutate: (b: Bars) => { b[key][40] = Number.NaN; }, lastInvalid: 56,
    })),
    { name: "nonpositive low", mutate: (b) => { b.l[40] = 0; }, lastInvalid: 56 },
    { name: "negative volume", mutate: (b) => { b.v[40] = -1; }, lastInvalid: 56 },
    { name: "high below body", mutate: (b) => { b.h[40] = 0; }, lastInvalid: 56 },
    { name: "low above body", mutate: (b) => { b.l[40] = 1e9; }, lastInvalid: 56 },
    { name: "gap before first bar", mutate: (b) => {
      for (let i = 40; i < b.n; i++) b.t[i] += 60_000;
    }, lastInvalid: 55 },
  ];
  const valid = (b: Bars, stream?: StreamMath) => {
    const k = new SeriesCache(b);
    if (stream) k.enableStreaming(stream);
    dcaTacticState(k, config);
    return k.memo<{ valid: Int8Array } | null>("tactic-dca:features:8", () => null)!.valid;
  };
  for (const c of cases) {
    const input = bars(waveBars(80));
    c.mutate(input);
    const full = valid(input);
    for (let i = 16; i < input.n; i++)
      assert.equal(full[i], i >= 40 && i <= c.lastInvalid ? 0 : 1, `${c.name} at ${i}`);
    const stream = new StreamMath();
    for (const n of [16, 39, 40, 41, 55, 56, 57, 80]) {
      const prefix: Bars = { ...input, n, ...Object.fromEntries(
        (["t", "o", "h", "l", "c", "v"] as const).map((key) => [key, input[key].slice(0, n)]),
      ) };
      assert.deepEqual(valid(prefix, stream), full.slice(0, n), `${c.name} streaming prefix ${n}`);
    }
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
