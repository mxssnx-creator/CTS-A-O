import assert from "node:assert/strict";
import { test } from "node:test";
import { RT_COST } from "../config.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { baseRuns, makeUniverse } from "./pipeline.ts";

test("Base publishes completed combo progress during a large partition", () => {
  const bars = barsFromCandles("A-USDT", 5, syntheticCandles("A-USDT", 5, 160, Date.UTC(2026, 10, 15), 3));
  const combos = Array.from({ length: 240 }, () => ({ bot: "follow", ind: "rsi-mom-14-20@m5" }));
  const reports: number[] = [];
  const result = baseRuns(makeUniverse([bars]), combos, RT_COST, null, false, false,
    (done, total) => { assert.equal(total, combos.length); reports.push(done); });
  const withoutProgress = baseRuns(makeUniverse([bars]), combos, RT_COST, null, false, false);
  assert.deepEqual(result, withoutProgress, "progress reporting cannot change calculated results");
  assert.ok(reports.length >= 100, "large partitions must report before a 5% block completes");
  assert.equal(reports.at(-1), combos.length);
  for (let i = 1; i < reports.length; i++) assert.ok(reports[i] > reports[i - 1]);
});
