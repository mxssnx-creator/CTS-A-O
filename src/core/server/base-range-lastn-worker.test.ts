import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { baseRuns, makeUniverse, type ComboRun } from "../pipeline/pipeline.ts";
import { closePool, runOnWorkers } from "./pool.server.ts";

test("worker and local Base use the same independent Micro and Minimal Last-30 windows", async () => {
  const bars = ["A", "B"].map((sym, i) => barsFromCandles(sym, 1,
    syntheticCandles(sym, 1, 2000, Date.UTC(2026, 9, 17), i + 5)));
  const combos = [{ bot: "follow", ind: "ema-9-21@m1" }];
  const protects = ["mc", "mn", "sh"].map((tag) => ({ tp: .01, sl: .01, trail: 0, hold: 20, tag }));
  const s = DEFAULT_SETTINGS;
  try {
    const local = baseRuns(makeUniverse(bars), combos as never, s.cost, s.tactics, false, false, undefined,
      protects as never, undefined, false, s.gates, [], true);
    const [reply] = await runOnWorkers<{ runsJson: string[] }>([{ type: "s1", bars, combos,
      cost: s.cost, tactics: s.tactics, rangeProtects: protects, microOwnInds: false, gates: s.gates, cells: true }], 1);
    const remote = reply.runsJson.flatMap((chunk) => JSON.parse(chunk) as ComboRun[]);
    assert.equal(local.length, 1); assert.equal(remote.length, 1);
    for (const tag of ["mc", "mn", "sh"]) {
      const n = tag === "sh" ? 40 : 30;
      assert.equal(local[0].ranges?.[tag].baseLast?.requested, n);
      assert.deepEqual(remote[0].ranges?.[tag], local[0].ranges?.[tag]);
    }
    assert.deepEqual(remote[0].rangeCells, local[0].rangeCells);
  } finally { await closePool(); }
});
