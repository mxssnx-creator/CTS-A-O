import assert from "node:assert/strict";
import { test } from "node:test";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";
import { CoreDb } from "./db.server.ts";
import { closePool } from "./pool.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("runtime retains and publishes incrementally interned worker tapes", { timeout: 120_000 }, async () => {
  const keys = ["CTS_CORE_WORKERS", "CTS_CORE_STATE", "CTS_CORE_MEM_HARD_MB"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.CTS_CORE_WORKERS = "1"; process.env.CTS_CORE_STATE = "off"; process.env.CTS_CORE_MEM_HARD_MB = "1";
  const now = Date.UTC(2026, 9, 17, 12), ind = "ema-21-55@m15";
  const rt = new CoreRuntime(new CoreDb(":memory:"), {
    focus: [`follow|${ind}`], pinned: [], tfs: [15], symbols: 1, historyDays: 4,
    tfDays: { "1": 4, "15": 4 }, mainTop: 0, signals: { enabled: false },
    grid: { allSets: true, micro: false, minimal: false, short: false, general: false, long: false },
    gates: { minTrades: 10_000 }, tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false },
  }, { market: "synthetic", priceStream: null });
  try {
    rt.stop();
    rt.candles.set("AAA-USDT", CandleSeries.fromCandles(syntheticCandles("AAA-USDT", 1, 4000, now, 7)));
    rt.wf = { ...rt.wf, preH: 6, simH: 6, longH: 24,
      protects: [{ tp: .01, sl: .01, trail: 0, hold: 32 }],
      dcaProtects: [{ tp: .01, sl: .01, trail: 0, hold: 32 }] };
    await rt.compute();
    assert.ok(rt.tapes.length > 0, "measurement tapes remain complete");
    assert.match(rt.status.phases.Tapes?.slowest ?? "", /1 cores/, "the actual worker reply path was used");
  } finally {
    rt.dispose(); await closePool();
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
