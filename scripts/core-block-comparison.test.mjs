import test from "node:test";
import assert from "node:assert/strict";
import {
  comparisonEngineCommand,
  comparisonEnvironment,
  materializedComparisonDefaults,
  validateComparisonFeed,
} from "./core-block-comparison.mjs";
import { assertComparisonRuntime } from "./lib/block-comparison.mjs";
import { RT_COST } from "../src/core/model-cost.ts";

const M = 60_000;
const feed = () => ({
  tickers: [{ sym: "X-USDT" }],
  candles: {
    "X-USDT|1": Array.from({ length: 720 }, (_, i) => ({
      t: i * M,
      o: 100,
      h: 101,
      l: 99,
      c: 100,
      v: 1,
    })),
  },
});
test("frozen candles reject gaps, future bars, invalid OHLC and a changed universe", () => {
  const f = feed();
  assert.equal(validateComparisonFeed(f, ["X-USDT"], 720 * M)["X-USDT"].n, 720);
  const gap = feed();
  gap.candles["X-USDT|1"][50].t += M;
  assert.throws(() => validateComparisonFeed(gap, ["X-USDT"], 720 * M), /Invalid/);
  const bad = feed();
  bad.candles["X-USDT|1"][0].h = 1;
  assert.throws(() => validateComparisonFeed(bad, ["X-USDT"], 720 * M), /Invalid/);
  assert.throws(() => validateComparisonFeed(f, ["X-USDT"], 719 * M), /future candle/);
  f.candles["Y-USDT|1"] = f.candles["X-USDT|1"];
  assert.throws(() => validateComparisonFeed(f, ["X-USDT"], 720 * M), /expands/);
  const duplicate = feed();
  duplicate.tickers.push({ sym: "X-USDT" });
  assert.throws(() => validateComparisonFeed(duplicate, ["X-USDT"], 720 * M), /ticker universe/);
});
test("actual stopped runtime settings remain default-positive and retain full exit ladders", async () => {
  const p = await materializedComparisonDefaults();
  assert.equal(p.computes, 0);
  assert.equal(p.actualSettings.symbols, 4);
  assert.equal(p.actualSettings.signals.enabled, true);
  assert.equal(p.actualSettings.signals.accept.minPf, 1.3);
  assert.equal(p.actualSettings.signals.sideAccept.minPf, 1.3);
  assert.equal(p.actualSettings.toggles.normal, true);
  assert.equal(p.actualSettings.toggles.trailing, true);
  assert.equal(p.actualSettings.toggles.dca, true);
  assert.equal(p.actualSettings.toggles.axis, false);
  assert.equal(p.actualSettings.toggles.blockActive, false);
  assert.equal(p.actualSettings.block.ratio, 0.2);
  assert.equal(p.actualSettings.block.steps, 0);
  assert.equal(p.actualSettings.block.maxMult, 2);
  assert.equal(p.actualSettings.block.mode, "overall");
  assert.equal(p.actualSettings.block.historySource, "accepted-orders");
  assert.deepEqual(p.actualSettings.block.sources, {
    config: false,
    overall: true,
    symbol: true,
    direction: true,
    indication: true,
    type: false,
  });
  assert.equal(p.actualWf.coord.enabled, true);
  assert.equal(p.actualWf.coord.confirm, true);
  assert.equal(p.actualWf.causalBase, true);
  assert.equal(p.actualWf.preH, 6);
  assert.equal(p.actualWf.simH, 6);
  assert.equal(p.actualSettings.cost, RT_COST);
  assert.ok(p.actualSettings.focus.length > 30);
  assert.ok(p.actualSettings.grid.micro.tp.length > 5);
  assert.ok(p.actualSettings.grid.micro.slOfTp.length > 10);
  assert.ok(p.positiveCoordWarnings.length > 0);
  assert.equal(p.actualSettings.gates.baseSetsMinPf, 1.1);
  assert.ok(p.positiveCoordWarnings.every((x) => x.includes("Axis is off") ||
    x.includes("Base builds a pair's sets only from PF 1.1")),
    "retain the explicit warning about the newly requested Base prefilter; do not hide excluded samples");
  const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
  const { CoreDb } = await import("../src/core/server/db.server.ts");
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    { symbols: 4, signals: { enabled: true } },
    { market: "bingx", replay: true, priceStream: null },
  );
  try {
    rt.updateSettings(p.actualSettings);
    rt.updateSettings({}, { preH: 6, simH: 6, causalBase: true, recordValidation: true });
    assertComparisonRuntime(rt, p);
  } finally {
    rt.dispose();
  }
});
test("child command keeps replay-only history floor, exact settings, guard and bounded native book", () => {
  const p = {
    actualSettings: {
      signals: { enabled: true },
      grid: { micro: { tp: [1], slOfTp: [2], trailOfTp: [0] } },
    },
  };
  const fold = { id: "development-1", evaluationFromT: 1000, endT: 100000 };
  const cmd = comparisonEngineCommand("/saved/protocol.json", fold, p),
    env = comparisonEnvironment();
  assert.ok(cmd.includes("--evaluation-from"));
  assert.ok(cmd.includes("--frozen-block-study"));
  assert.equal(cmd[cmd.indexOf("--signals") + 1], "on");
  assert.deepEqual(JSON.parse(cmd[cmd.indexOf("--settings") + 1]), p.actualSettings);
  assert.equal(env.CTS_CORE_WORKERS, "1");
  assert.equal(env.CTS_CORE_LIVE, "0");
  assert.match(env.NODE_OPTIONS, /core-test-offline-guard/);
  assert.equal(env.MALLOC_ARENA_MAX, "2");
  assert.ok(cmd.includes("--max-old-space-size=4096"));
});
