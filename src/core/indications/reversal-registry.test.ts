import assert from "node:assert/strict";
import { test } from "node:test";
import { REVERSAL_SOURCES, trendReversalSeries } from "../../../shared/cts-reversal/reversal.ts";
import { DEFAULT_SIGNALS } from "../signal-config.ts";
import { barsFromCandles } from "../market/bars.ts";
import { allCombos } from "../pipeline/pipeline.ts";
import { signalCombos } from "../signals.ts";
import { SeriesCache } from "./cache.ts";
import { INDICATION_BY_ID, indicationState } from "./registry.ts";

test("reversal focus and optional Signals use registered exact sources and completed OHLCV", () => {
  const ordinary = "trend-reversal-structure-6";
  const signal = "sig-trend-reversal-structure-s";
  assert.equal(INDICATION_BY_ID.get(ordinary)?.kind, "trend-reversal");
  assert.equal(INDICATION_BY_ID.get(signal)?.kind, "trend-reversal");
  assert.ok(!signalCombos(DEFAULT_SIGNALS, [1, 5]).some(x => x.ind.startsWith("sig-trend-reversal-")));
  const enabled = signalCombos({ ...DEFAULT_SIGNALS, sources: { "trend-reversal-structure": true } }, [1, 5]);
  assert.ok(enabled.some(x => x.ind === signal + "@m1"));
  assert.ok(enabled.some(x => x.ind === signal.replace(/-s$/, "-m") + "@m5"));
  assert.ok(!allCombos(undefined, [], [1]).some(x => x.ind.startsWith("trend-reversal-")));
  assert.deepEqual(allCombos(["follow|" + ordinary], [], [1]).map(x => x.ind), [ordinary + "@m1"]);
  let seed = 291, c = 100;
  const random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 2 ** 32);
  const rows = Array.from({ length: 200 }, (_, i) => {
    const o = c;
    c += Math.sin(i / 3) * .23 + (random() - .5) * 1.2;
    return { t: 1_790_000_040_000 + i * 60_000, o,
      h: Math.max(o, c) + random() * .25, l: Math.min(o, c) - random() * .25, c, v: 5 + random() * 40 };
  });
  const b = barsFromCandles("ETH-USDT", 1, rows);
  const k = new SeriesCache(b);
  const source = REVERSAL_SOURCES.find(x => x.id === ordinary)!;
  const oracle = trendReversalSeries(b, source.period, source.tactic, 60_000);
  assert.ok(oracle.some(Boolean));
  assert.deepEqual(indicationState(ordinary, k), oracle);
  assert.deepEqual(indicationState(signal, k), oracle);
});
