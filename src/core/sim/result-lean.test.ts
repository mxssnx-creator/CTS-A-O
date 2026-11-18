// resultLean (session comparison runs) drops only the returned feed and signal-step copies: every trade, skip, step
// and open-at-end position is the same as the full run's.
import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { buildTapes, defaultWalkForward, protectGrid, walkForward } from "./walkforward.ts";

it("a lean run decides exactly as the full run and only omits the feed and signal-step copies", () => {
  const T_END = Date.UTC(2026, 9, 1);
  // the selection-index fixture (it executes trades over 48 h)
  const u = makeUniverse([
    barsFromCandles("A-USDT", 15, syntheticCandles("A-USDT", 15, 1800, T_END, 3)),
    barsFromCandles("B-USDT", 15, syntheticCandles("B-USDT", 15, 1800, T_END, 5)),
    barsFromCandles("C-USDT", 15, syntheticCandles("C-USDT", 15, 1800, T_END, 9)),
    barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 3600, T_END, 7)),
    barsFromCandles("B-USDT", 5, syntheticCandles("B-USDT", 5, 3600, T_END, 11)),
  ]);
  const settings = { ...DEFAULT_SETTINGS, gates: { ...DEFAULT_SETTINGS.gates, minPf: 1.0, minTrades: 3, maxDdr: 0 } };
  const tapes = buildTapes(u, protectGrid(15, { ...DEFAULT_SETTINGS.grid, holdH: [16] }), 0.002, undefined,
    new Set(["follow|ema-21-55", "follow|rsi-mom-14-20", "revert|z-50-2", "revert|ema-21-55"]));
  const o = { ...defaultWalkForward(settings), longH: 96, preH: 20, simH: 48, stepH: 1 };
  const full = walkForward(u, tapes, o);
  const lean = walkForward(u, tapes, { ...o, resultLean: true });
  assert.ok(full.trades.length > 0, "the run executed trades");
  assert.ok((full.feed ?? []).length > 0, "the full run returns its feed");
  assert.equal((lean.feed ?? []).length, 0);
  for (const k of ["trades", "skips", "steps", "openAtEnd", "stats"] as const)
    assert.equal(JSON.stringify((lean as unknown as Record<string, unknown>)[k]),
      JSON.stringify((full as unknown as Record<string, unknown>)[k]), k);
});
