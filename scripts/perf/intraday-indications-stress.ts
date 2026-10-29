/** Bounded synthetic source-calculation stress. No trading/venue profitability is inferred from this output. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { allCombos, makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { barsFromCandles, resample, syntheticCandles } from "../../src/core/market/bars.ts";
import { INDICATIONS, indicationState, laneOf } from "../../src/core/indications/registry.ts";

export function runIntradayIndicationsStress(symbols = 20, hours = 72) {
  if (!Number.isSafeInteger(symbols) || symbols < 1 || symbols > 20 || !Number.isFinite(hours) || hours < 60 || hours > 72)
    throw new RangeError("source stress requires1–20symbols and60–72hours total (30m universe needs120bars)");
  const started = performance.now(), end = Date.UTC(2026, 9, 9, 12);
  const families = new Set(["micro", "inverse", "relate", "break", "low-range", "tactic"]);
  const specs = INDICATIONS.filter((x) => families.has(x.kind));
  const combos = allCombos(specs.map((x) => `follow|${x.id}`), [], [1, 5, 15, 30], 0, true);
  const universe = makeUniverse(Array.from({ length: symbols }, (_, i) => {
    const sym = `SOURCE-${i}-USDT`, candles = syntheticCandles(sym, 1, Math.floor(hours * 60), end, 17 + i);
    return [1, 5, 15, 30].map((tf) => ({ ...barsFromCandles(sym, tf, resample(candles, 1, tf)), lanes: [1, 5, 15, 30] }));
  }).flat());
  assert.equal(universe.bars.length, symbols * 4, "every declared anchor has a complete usable series");
  const byId = new Map(specs.map((x) => [x.id, x.kind]));
  const batches = [];
  let peakHeapBytes = 0, calculations = 0, values = 0;
  const hash = createHash("sha256");
  for (let i = 0; i < symbols; i++) {
    const batch = (() => {
      const started = performance.now(), counts = new Map<string, { calculations: number; long: number; short: number; neutral: number }>();
      const caches = universe.caches.filter((k) => k.b.sym === `SOURCE-${i}-USDT`);
      const byTf = new Map(caches.map((k) => [k.b.tfMin, k]));
      for (const c of combos) {
        const lane = laneOf(c.ind), k = byTf.get(lane.tf!)!;
        assert.ok(k, c.ind);
        const state = indicationState(c.ind, k)!;
        assert.ok(state && state.length === k.b.n, `${c.ind}: full own-anchor output`);
        const family = byId.get(lane.base)!;
        let row = counts.get(family);
        if (!row) counts.set(family, (row = { calculations: 0, long: 0, short: 0, neutral: 0 }));
        row.calculations++; calculations++; values += state.length;
        for (const side of state) {
          if (side === 1) row.long++; else if (side === -1) row.short++;
          else { assert.equal(side, 0, `${c.ind}: invalid direction`); row.neutral++; }
        }
        hash.update(`${k.b.sym}|${c.ind}|`); hash.update(state);
      }
      const usage = process.memoryUsage(); peakHeapBytes = Math.max(peakHeapBytes, usage.heapUsed);
      // Immutable market inputs remain shared; all phase-local signal/HTF memos are released per symbol.
      for (const k of caches) k.clear();
      return { symbol: `SOURCE-${i}-USDT`, milliseconds: performance.now() - started,
        heapBytes: usage.heapUsed, rssBytes: usage.rss, families: Object.fromEntries(counts) };
    })();
    batches.push(batch); globalThis.gc?.();
  }
  return { evidence: "synthetic source-calculation stress; not end-to-end execution or financial proof", symbols,
    totalHours: hours, sourceIds: specs.length, laneConfigs: combos.length, calculations, values,
    milliseconds: performance.now() - started, peakSampledHeapBytes: peakHeapBytes,
    peakRssBytes: process.resourceUsage().maxRSS * 1024, checksum: hash.digest("hex"), batches };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [symbols = "20", hours = "72"] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(runIntradayIndicationsStress(Number(symbols), Number(hours)))}\n`);
}
