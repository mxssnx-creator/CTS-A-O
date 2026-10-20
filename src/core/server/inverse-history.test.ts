import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward } from "../sim/walkforward.ts";
import { evaluationHistorySettings } from "../market/history-requirements.ts";
import { CoreRuntime, laneSeriesFrom } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";

test("Extended windows supply every lane, including the supported 60-day window, without rewriting preferences", () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  const wf = defaultWalkForward(s);
  assert.equal(evaluationHistorySettings(s, wf), s, "default source selection stays unchanged");
  for (const hours of [168, 336, 720, 1440]) {
    const source = evaluationHistorySettings(s, { ...wf, longH: hours, simH: 6 });
    for (const tf of s.tfs) assert.ok(source.tfDays[String(tf)] * 24 >= hours + 24 + 6);
    assert.ok(source.historyDays * 24 >= hours + 30);
  }
  assert.equal(s.tfDays["1"], 3);
  assert.equal(s.historyDays, 18);
});

test("Long-history restart refetches a short cached symbol and retains requested candles through lane construction", async () => {
  const end = Date.UTC(2026, 9, 17);
  const requests: number[] = [];
  const feed = {
    tickers: async () => [{ sym: "BTC-USDT", last: 100, quoteVol: 1e9, changePct: 0 }],
    history: async (sym: string, tf: number, count: number) => {
      requests.push(count);
      return syntheticCandles(sym, tf, count, end);
    },
    klines: async () => [],
  };
  const runtime = new CoreRuntime(new CoreDb(":memory:"), {
    symbols: 1, symbolRank: "volume", tfs: [1, 5, 15], tfDays: { "1": 1, "5": 1, "15": 1 },
  }, { market: "bingx", feed });
  const state = process.env.CTS_CORE_STATE;
  process.env.CTS_CORE_STATE = "off";
  try {
    runtime.updateSettings({}, { longH: 336, simH: 6 });
    runtime.candles.set("BTC-USDT", CandleSeries.fromCandles(syntheticCandles("BTC", 1, 1440, end)));
    await (runtime as unknown as { syncMarket(gen: number): Promise<boolean> }).syncMarket(runtime.generation);
    assert.equal(requests.length, 1);
    assert.ok(requests[0] >= (336 + 24 + 6) * 60);
    assert.equal(runtime.candles.get("BTC-USDT")!.n, requests[0], "storage must not trim back to the saved one-day preference");
    const source = evaluationHistorySettings(runtime.settings, runtime.wf);
    const lanes = laneSeriesFrom(runtime.candles, source);
    for (const b of lanes) assert.ok(b.n * b.tfMin >= (336 + 24 + 6) * 60 - b.tfMin, `${b.tfMin}m`);
    assert.equal(runtime.settings.tfDays["1"], 1);
  } finally {
    runtime.dispose();
    if (state === undefined) delete process.env.CTS_CORE_STATE; else process.env.CTS_CORE_STATE = state;
  }
});
