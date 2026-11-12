import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { evaluationHistorySettings, EVALUATION_HISTORY_H, PRECALC_HISTORY_H } from "../market/history-requirements.ts";
import { defaultWalkForward, signalHistoryHours } from "../sim/walkforward.ts";
import { marketHistoryBars, normalizeLanes, sanitizeWf, strategyDataHours } from "./runtime.server.ts";

test("ordinary 72h pre-calc reaches lane retention and backfill without shortening Signal or explicit settings", () => {
  // Arithmetic only: this test does not create or simulate any market data beyond the study limit.
  const settings = normalizeLanes({ ...DEFAULT_SETTINGS, historyDays: 1,
    tfDays: { "1": 1, "5": 1, "15": 1, "30": 1 } });
  const wf = { ...defaultWalkForward(settings), simH: 12 };
  assert.equal(EVALUATION_HISTORY_H,48);
  assert.equal(PRECALC_HISTORY_H,72);
  assert.equal(wf.preH,72); assert.equal(wf.longH,48);
  assert.equal(signalHistoryHours(wf),150);
  const retained = evaluationHistorySettings(settings,wf);
  for (const tf of settings.tfs) assert.ok(retained.tfDays[String(tf)] * 24 >= 72 + 12 + 24);
  assert.ok(marketHistoryBars(settings,wf) * settings.tfMin / 60 >= strategyDataHours(settings,wf));
  assert.ok(marketHistoryBars(settings,wf) * settings.tfMin / 60 >= 150 + 12 + 24);
  assert.equal(settings.tfDays["1"],1,"physical requirement does not rewrite the operator's preference");
  assert.deepEqual(sanitizeWf({preH:12,longH:96,signalLongH:180}),{preH:12,longH:96,signalLongH:180});
  const custom = { ...wf, preH: 12, longH: 96, signalLongH: 180 };
  assert.equal(signalHistoryHours(custom),180);
  assert.ok(evaluationHistorySettings(settings,custom).tfDays["1"] * 24 >= 96 + 12 + 24);
});
