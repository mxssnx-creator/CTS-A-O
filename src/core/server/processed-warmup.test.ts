import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../config.ts';
import { defaultWalkForward, walkForwardSteps } from '../sim/walkforward.ts';
import { CoreRuntime, processedWarmupHours, sanitizeWf, signalDataHours, strategyDataHours } from './runtime.server.ts';
import { CoreDb } from './db.server.ts';

const H = 3_600_000, fromT = Date.UTC(2026, 9, 14, 21), untilT = fromT + 24 * H;
const warm = { fromT, untilT, baseCutT: fromT };
test('offline warmup extends physical history and progress without changing the target duration', () => {
  const before = defaultWalkForward(DEFAULT_SETTINGS), withWarmup = { ...before, processedWarmup: warm };
  assert.equal(processedWarmupHours(withWarmup), 24);
  assert.equal(strategyDataHours(DEFAULT_SETTINGS, withWarmup), strategyDataHours(DEFAULT_SETTINGS, before) + 24);
  assert.equal(signalDataHours(DEFAULT_SETTINGS, withWarmup), signalDataHours(DEFAULT_SETTINGS, before) + 24);
  const u = { nowT: untilT + 24 * H, baseTf: 1, bars: [] };
  assert.equal(walkForwardSteps(u, { ...withWarmup, simH: 24, stepH: 1 }), 48);
  assert.equal(walkForwardSteps(u, { ...before, simH: 24, stepH: 1 }), 24);
  assert.deepEqual(sanitizeWf({ processedWarmup: warm }).processedWarmup, warm);
});
test('warmup rejects missing, future or excessively old Base boundaries', () => {
  for (const processedWarmup of [
    { ...warm, baseCutT: untilT }, { ...warm, untilT: fromT }, { ...warm, fromT: NaN },
    { fromT, untilT: fromT + 241 * H, baseCutT: fromT },
  ]) assert.throws(() => sanitizeWf({ processedWarmup }), /invalid processed warmup/);
});
test('a normal runtime refuses offline warmup before changing or persisting its settings', () => {
  const db = new CoreDb(':memory:'), runtime = new CoreRuntime(db, {}, { market: 'synthetic', priceStream: null });
  try {
    assert.throws(() => runtime.updateSettings({}, { processedWarmup: warm }), /only in an unconnected replay/);
    assert.equal(runtime.wf.processedWarmup, undefined);
  } finally { runtime.dispose(); db.db.close(); }
});
