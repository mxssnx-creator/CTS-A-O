import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../config.ts';
import { processedGridChoices } from "../sim/processed-replay.ts";
import { defaultWalkForward, walkForwardSteps } from '../sim/walkforward.ts';
import { CoreRuntime, defaultProcessedWarmup, processedWarmupHours, sanitizeWf, signalDataHours, strategyDataHours } from './runtime.server.ts';
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

test('automatic Last-N expands the older signed stage lengths and freezes its concrete policy', () => {
  const input = { validationN: 6, realN: 4, windowGrid: 'auto', autoPf: { mode: 'independent', ratio: 4 } };
  const wf = sanitizeWf({ processedStages: input as never });
  const policy = wf.processedStages!;
  assert.equal(wf.causalBase, true);
  assert.equal(policy.rollingBase, true);
  assert.equal(policy.inheritBaseLong, true);
  assert.deepEqual(processedGridChoices(policy.windowGrid!, policy.inheritBaseLong),
    { base: 400, validation: 160, real: 320, exec: 320 });
  assert.equal(policy.execN, 4);
  assert.deepEqual(policy.autoPf, input.autoPf);
  const expected = {
    base: { longs: [10, 20, 30, 40, 50], shorts: [4, 8, 12, 16] },
    validation: { longs: [0], shorts: [4, 8, 12, 16] },
    real: { longs: [0], shorts: [4, 8, 12, 16, 20, 24, 28, 30] },
    exec: { longs: [0], shorts: [4, 8, 12, 16, 20, 24, 28, 30] },
  };
  for (const stage of ['base', 'validation', 'real', 'exec'] as const) {
    const { longs, shorts } = expected[stage];
    const windows = policy.windowGrid![stage];
    const signed = new Set(windows.map(w => JSON.stringify([w.long, w.short, w.minimal, w.shortPolarity, w.minimalPolarity])));
    assert.equal(windows.length, longs.length * shorts.length * 20);
    for (const long of longs) for (const short of shorts) for (let last = 1; last <= 5; last++)
      for (const shortSign of ['positive', 'negative']) for (const lastSign of ['positive', 'negative'])
        assert.ok(signed.has(JSON.stringify([long, short, last, shortSign, lastSign])));
  }
  assert.deepEqual(sanitizeWf(wf), wf);
  assert.throws(() => sanitizeWf({ ...wf, causalBase: false }), /requires causal replay/);
  const stageMinPf = { validation: 1.25, real: 1.4, exec: 1.65 };
  assert.deepEqual(sanitizeWf({ processedStages: { ...policy, stageMinPf } }).processedStages!.stageMinPf, stageMinPf);
  assert.throws(() => sanitizeWf({ processedStages: { ...policy, stageMinPf: { exec: 1 } } }), /exceed one/);
  assert.throws(() => sanitizeWf({ processedStages: { ...policy, windowGrid: {
    ...policy.windowGrid!, exec: [policy.windowGrid!.base[0]],
  } } }), /Short\/Last templates/);
});

test('a venue-capable runtime refuses rolling Base before changing its saved policy', () => {
  const db = new CoreDb(':memory:'), runtime = new CoreRuntime(db, {}, { market: 'synthetic', priceStream: null });
  try {
    assert.throws(() => runtime.updateSettings({}, { processedStages: {
      validationN: 6, realN: 4, execN: 4, baseScope: 'context', rollingBase: true,
    } }), /require offline replay/);
    assert.equal(runtime.wf.processedStages, undefined);
  } finally { runtime.dispose(); db.db.close(); }
});

test('rolling warmup uses the complete requested prehistory and respects the available start', () => {
  const wf = { preH: 48, stepH: 1 };
  const requested = untilT - 48 * H;
  assert.deepEqual(defaultProcessedWarmup(wf, { startT: requested - 24 * H, baseTf: 1 }, untilT),
    { fromT: requested, baseCutT: requested, untilT });
  assert.deepEqual(defaultProcessedWarmup(wf, { startT: fromT + 1, baseTf: 1 }, untilT),
    { fromT: fromT + H, baseCutT: fromT + H, untilT });
  assert.equal(defaultProcessedWarmup(wf, { startT: untilT - 1, baseTf: 1 }, untilT), undefined);
});
