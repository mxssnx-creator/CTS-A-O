// Incremental seat picks (wf.incrementalPicks, default on) re-evaluate only the tapes with a close settled since the
// last derivation. The run must equal the full walk's, trade for trade, whatever the decision cadence.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { buildTapes, defaultWalkForward, EvalMemo, protectGrid, walkForward } from "./walkforward.ts";

const H = 3_600_000;
const T_END = Date.UTC(2026, 9, 1);
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
const base = { ...defaultWalkForward(settings), longH: 96, preH: 20, simH: 36, stepH: 1 };
const parts = (r: ReturnType<typeof walkForward>) =>
  JSON.stringify([r.trades, r.skips, r.steps, r.openAtEnd, r.stats]);

describe("incremental picks", () => {
  for (const decisionMin of [1, 7]) {
    it(`equal the full walk, decision every ${decisionMin} min`, () => {
      const o = { ...base, decisionMin };
      const full = walkForward(u, tapes, { ...o, incrementalPicks: false });
      const memo = new EvalMemo(), offMemo = new EvalMemo();
      const inc = walkForward(u, tapes, { ...o, evalMemo: memo });
      walkForward(u, tapes, { ...o, incrementalPicks: false, evalMemo: offMemo });
      assert.ok(full.trades.length > 0, "the run executed trades");
      assert.ok(memo.picks && memo.picks.entries.size > 0, "the incremental path ran and holds candidate entries");
      assert.equal(offMemo.picks, null, "incrementalPicks false never builds the cache");
      assert.equal(parts(inc), parts(full));
    });
  }
  it("equal the full walk with the opt-in family seats and a pooled seat set off the incremental path", () => {
    const o = { ...base, seatPer: "pair" as const };
    const full = walkForward(u, tapes, { ...o, incrementalPicks: false });
    assert.equal(parts(walkForward(u, tapes, o)), parts(full), "other seat modes keep the full walk");
  });
});
