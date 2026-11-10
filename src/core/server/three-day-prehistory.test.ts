import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { syntheticCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { defaultWalkForward, tapeRetentionHours } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime, laneSeriesFrom, marketHistoryBars, normalizeLanes, sanitizeWf, strategyDataHours } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";

test("three-day pre-calc retains enough candles and an independent Last-N gate", () => {
  const s = normalizeLanes({ ...structuredClone(DEFAULT_SETTINGS), tfs: [1, 5, 15], historyDays: 1,
    tfDays: { "1": 1, "5": 1, "15": 1 }, signals: { ...DEFAULT_SETTINGS.signals, enabled: false } });
  const wf = { ...defaultWalkForward(s), simH: 2 };
  assert.equal(wf.preH, 72);
  assert.equal(wf.validLastN, 12);
  assert.equal(sanitizeWf({ preH: 72 }).preH, 72);
  assert.ok(tapeRetentionHours(s, wf, 1) >= 72);
  const hours = strategyDataHours(s, wf);
  assert.ok(hours >= 24 + 72 + wf.simH, "warmup and trading history are additional to the requested pre-calc");
  assert.ok(marketHistoryBars(s, wf) >= hours * 60);
  const input = new Map([["A", CandleSeries.fromCandles(syntheticCandles("A", 1, Math.ceil(hours * 60) + 60,
    Date.UTC(2026, 9, 1)))]]);
  const lanes = laneSeriesFrom(input, s, 0, hours);
  for (const tf of s.tfs) {
    const lane = lanes.find(x => x.tfMin === tf)!;
    assert.ok(lane.n * tf / 60 >= hours - tf / 60, `${tf}m lane retains the requested history`);
  }
});

test("new runtime defaults to three days and preserves deliberate saved overrides across restart", () => {
  const db = new CoreDb(":memory:");
  const open = () => new CoreRuntime(db, { live: { enabled: false } }, { market: "synthetic", priceStream: null, replay: true });
  let rt = open();
  try {
    assert.equal(rt.wf.preH, 72);
    rt.updateSettings({}, { preH: 96 });
    assert.equal(rt.wf.preH, 96);
    rt.dispose(); rt = open();
    assert.equal(rt.wf.preH, 96);
    rt.updateSettings({}, { preH: 72 });
    rt.dispose(); rt = open();
    assert.equal(rt.wf.preH, 72);
  } finally { rt.dispose(); db.db.close(); }
});
