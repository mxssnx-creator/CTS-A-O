import assert from "node:assert/strict";
import { test } from "node:test";
import { baseRuns, makeUniverse } from "../pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { closePool, runOnWorkers } from "../server/pool.server.ts";
import { laneInd } from "./registry.ts";
import { dcaTacticConfigs, dcaTacticId } from "./dca-tactic.ts";

test("Base shares bounded DCA Tactic features within a batch, then releases them without changing results", async () => {
  const bars = barsFromCandles("A-USDT", 1, syntheticCandles("A", 1, 400, Date.UTC(2026, 9, 1)));
  const configs = [8, 20].flatMap((lookback) => dcaTacticConfigs().filter((c) => c.lookback === lookback).slice(0, 4));
  const combos = configs.flatMap((c) => (["follow", "revert"] as const).map((bot) => ({ bot, ind: laneInd(dcaTacticId(c), 1) })));
  const u = makeUniverse([bars]), builds = new Map<string, number>();
  for (const cache of u.caches) {
    const memo = cache.memo.bind(cache);
    cache.memo = <T>(key: string, make: () => T): T => memo(key, () => {
      if (key.startsWith("tactic-dca:features:")) builds.set(key, (builds.get(key) ?? 0) + 1);
      return make();
    });
  }
  const actual = baseRuns(u, combos, .002, null, true, true);
  const oracle = baseRuns(makeUniverse([bars]), combos, .002, null, true, false);
  assert.deepEqual(actual, oracle, "batch reuse must preserve every Base result");
  assert.deepEqual(Object.fromEntries(builds), { "tactic-dca:features:8": 1, "tactic-dca:features:20": 1 });
  for (const cache of u.caches) for (const n of [8, 20]) {
    const released = {};
    assert.strictEqual(cache.memo(`tactic-dca:features:${n}`, () => released), released,
      "the shared feature arrays are released at the end of the Base batch");
  }
  try {
    const [worker] = await runOnWorkers<{ runsJson: string[] }>([{ type: "s1", bars: [bars], combos, cost: .002,
      tactics: null }], 1, 60_000);
    assert.deepEqual(worker.runsJson.flatMap((chunk) => JSON.parse(chunk)), actual,
      "worker and local Base produce the same ordered results");
  } finally { closePool(); }
});
