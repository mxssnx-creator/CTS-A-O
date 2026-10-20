import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromCandles, headBars, syntheticCandles } from "../market/bars.ts";
import { SeriesCache } from "./cache.ts";
import { frama, research5Specs } from "./research5.ts";
import { signalCombos } from "../signals.ts";
import { signalSettings } from "../signal-config.ts";

const end = Date.UTC(2026, 9, 20);
const bars = barsFromCandles("A", 5, syntheticCandles("A", 5, 2000, end, 7));
describe("additional causal Signal research sources", () => {
  it("registers every short/medium source on independent lanes, without automatic live activation", () => {
    const sources = ["r-apz-reclaim", "r-frama-pullback", "r-st-pullback"];
    const d = signalSettings();
    assert.ok(sources.every((s) => d.sources[s] === false));
    const sig = signalSettings({ sourcesMode: "allow", sources: Object.fromEntries(sources.map((s) => [s, true])),
      lanes: [1, 5, 15, 30], coordination: { ...d.coordination, enabled: false } });
    const pairs = signalCombos(sig, [1, 5, 15, 30]);
    assert.equal(pairs.length, 24);
    assert.equal(new Set(pairs.map((p) => p.ind)).size, 24);
  });
  for (const spec of research5Specs()) {
    it(`${spec.id}: completed-bar prefixes, finite signs and mirrored long/short symmetry`, () => {
      const full = spec.fn(new SeriesCache(bars))!;
      const cut = headBars(bars, bars.t[1000]);
      assert.deepEqual(full.subarray(0, cut.n), spec.fn(new SeriesCache(cut)));
      assert.ok([...full].every((x) => x === -1 || x === 0 || x === 1));
      assert.ok(full.some((x) => x !== 0), "events exist on an oscillating fixture");
      const k = 3 * Math.max(...bars.h);
      const mirrored = { ...bars, o: Float64Array.from(bars.o, (x) => k - x),
        h: Float64Array.from(bars.l, (x) => k - x), l: Float64Array.from(bars.h, (x) => k - x),
        c: Float64Array.from(bars.c, (x) => k - x) };
      const reverse = spec.fn(new SeriesCache(mirrored))!;
      assert.deepEqual([...reverse], [...full].map((x) => x === 0 ? 0 : -x));
    });
  }
  it("FRAMA handles constant bars, invalid prices and gaps without manufacturing events", () => {
    const flat = { ...bars, o: new Float64Array(bars.n).fill(100), h: new Float64Array(bars.n).fill(100),
      l: new Float64Array(bars.n).fill(100), c: new Float64Array(bars.n).fill(100) };
    const line = frama(flat, 16);
    assert.ok([...line.subarray(15)].every((x) => x === 100));
    const broken = { ...flat, c: Float64Array.from(flat.c) };
    broken.c[100] = NaN;
    const invalid = frama(broken, 16);
    assert.ok(Number.isNaN(invalid[100]) && Number.isNaN(invalid[115]));
    assert.equal(invalid[116], 100);
    assert.throws(() => frama(flat, 5), /even/);
  });
});
