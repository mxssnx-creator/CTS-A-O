import assert from "node:assert/strict";
import { test } from "node:test";
import type { Trade } from "../domain/types.ts";

// Import the evaluator with a deliberately small working-set budget so this real tape test crosses it.
const previous = process.env.CTS_CORE_DERIVED_CACHE_MB;
process.env.CTS_CORE_DERIVED_CACHE_MB = "1";
const { DEFAULT_SETTINGS } = await import("../config.ts");
const { configDirectionEval, defaultWalkForward, derivedIndexCacheStats, makeTape, signalConfigEval, symStats } =
  await import("./walkforward.ts");
if (previous === undefined) delete process.env.CTS_CORE_DERIVED_CACHE_MB;
else process.env.CTS_CORE_DERIVED_CACHE_MB = previous;

test("byte-bounded derived indexes recompute the same symbol, direction and Signal decisions", () => {
  const minute = 60_000, start = 1_700_000_000_000, count = 20_000, end = start + (count + 1) * minute;
  const tapes = Array.from({ length: 6 }, (_, tapeIndex) => {
    const cfg = `follow|sig-ema-cross-s@m1|cache-${tapeIndex}`;
    const rows = Array.from({ length: count }, (_, i): Trade => ({
      cfg, sym: i % 4 < 2 ? "A" : "B", side: i % 2 ? 1 : -1,
      entryT: start + i * minute, exitT: start + i * minute + 30_000,
      entry: 100, exit: 101, r: i % 5 ? .01 : -.006, reason: "tp", bars: 1, mfe: 0, mae: 0,
    }));
    return makeTape(cfg, "follow", "sig-ema-cross-s@m1", { tp: .02, sl: .01, trail: 0, hold: 60 },
      "normal", ["A", "B"], rows, [], []);
  });
  const base = defaultWalkForward({ ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, positionWindows: null } });
  const o = { ...base, longH: 1000, signalLongH: 1000, preGate: false, rangeGate: undefined,
    gates: { ...base.gates, positionWindows: null, minTrades: 4, minPf: 1.01, maxDdr: 0,
      maxDdtH: 0, minGreen: 0, stableBlocks: 0, lossPrior: false, lastNFloor: 0 } };
  const measure = (tape: typeof tapes[number], t: number) => ({
    symbols: ["A", "B"].map((sym) => symStats(tape, sym, 0, start, t)),
    directions: [1, -1].map((side) => configDirectionEval(tape, t, o, side)),
    signals: ["A", "B"].flatMap((sym) => [1, -1].map((side) => signalConfigEval(tape, t, o, sym, side))),
  });
  const expected = measure(tapes[0], end);
  for (const tape of tapes.slice(1)) measure(tape, end);
  assert.deepEqual(measure(tapes[0], end + 1), expected, "eviction must preserve every decision and source return");
  const stats = derivedIndexCacheStats();
  assert.equal(stats.perCacheLimit, 1048576 / 4);
  assert.ok(stats.symbol > 0 && stats.direction > 0 && stats.signal > 0);
  for (const bytes of [stats.symbol, stats.direction, stats.views, stats.signal])
    assert.ok(bytes <= stats.perCacheLimit, `retained derived buffers exceed budget: ${bytes}`);
});
