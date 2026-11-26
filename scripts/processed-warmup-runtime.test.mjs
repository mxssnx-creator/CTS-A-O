// Offline integration: deterministic synthetic candles exercise actual Base, modeled stage warmup and target accounting.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { readSessionDump, verifySessionDumpSidecars } from './lib/session-dump.mjs';

const exec = promisify(execFile), H = 3_600_000, end = Date.UTC(2026, 9, 16, 21), target = end - H, warmFrom = target - 3 * H;
test('offline runtime warms owned stages before a distinct flat target account', { timeout: 120_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cts-modeled-warmup-'));
  try {
    const candles = [];
    let price = 100;
    for (let t = Date.UTC(2026, 9, 14), i = 0; t < end; t += 60_000, i++) {
      const next = price * (1 + (i % 40 < 20 ? .003 : -.003));
      candles.push({ t, o: price, h: Math.max(price, next) * 1.0001,
        l: Math.min(price, next) * .9999, c: next, v: 1000 });
      price = next;
    }
    const feed = join(dir, 'feed.json'), rawFile = join(dir, 'raw.json');
    await writeFile(feed, JSON.stringify({ tickers: [{ sym: 'BTC-USDT', last: price, quoteVol: 1e8, changePct: 0 }],
      candles: { 'BTC-USDT|1': candles } }));
    const settings = { forceSymbols: ['BTC-USDT'], focus: ['follow|ema-9-21@m1'], pinned: [], tfs: [1],
      grid: { tp: [.01], slOfTp: [1], micro: false, minimal: false, short: false, general: false, long: false },
      exitStrategy: { enabled: false }, gates: { minPf: 1.05, minTrades: 3, baseLastN: 0,
        stepPf: { enabled: false }, minGreen: .5, maxDdr: 0 },
      tactics: { signalMinDaily: 0, volRegime: false, trendStrength: false } };
    const warmup = { fromT: warmFrom, untilT: target, baseCutT: warmFrom };
    const wf = { processedStages: { validationN: 2, realN: 2, reportDetail: 'summary' }, processedWarmup: warmup,
      recordValidation: 'summary', lastN: 0, validLastN: 0, onePerPairEvent: false,
      maxOpen: 0, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0 };
    const toggles = { normal: true, trailing: false, dca: false, axis: false, block: false, exit: false };
    const args = ['--experimental-strip-types', '--no-warnings', '--expose-gc', 'scripts/core-session.mjs',
      '--feed', feed, '--symbols', '1', '--pre', '24', '--run', '1', '--end-at', new Date(end).toISOString(),
      '--evaluation-from', new Date(warmFrom - 24 * H).toISOString(), '--selection-hours', '24', '--replay-preload-all',
      '--signals', 'off', '--max-wait-min', '2', '--paper-wait-s', '30', '--settings', JSON.stringify(settings),
      '--toggles', JSON.stringify(toggles), '--wf', JSON.stringify(wf), '--no-archive', '--dump', rawFile, '--dump-only', '--quiet', 'true'];
    const env = { ...process.env, CTS_CORE_STATE: 'off', CTS_CORE_AUTOSTART: '0', CTS_CORE_LIVE: '0',
      CTS_CORE_COMPARE: '0', CTS_CORE_VARIANTS: '0', CTS_CORE_WORKERS: '1', MALLOC_ARENA_MAX: '2',
      NODE_OPTIONS: `--max-old-space-size=2500 --require ${resolve('scripts/lib/core-test-offline-guard.cjs')}` };
    await exec(process.execPath, args, { cwd: process.cwd(), env, timeout: 100_000, maxBuffer: 4 * 1024 * 1024 });
    await verifySessionDumpSidecars(rawFile);
    const raw = await readSessionDump(rawFile, { fields: ['trades', 'openEnd'] });
    assert.deepEqual(raw.window, { startT: target, endT: end });
    assert.deepEqual(raw.processedStageProgress.warmup, warmup);
    assert.ok(raw.engine.basePassed > 0 && raw.engine.tapes > 0);
    assert.ok(raw.processedStageProgress.validation.qualified > 0 && raw.processedStageProgress.real.qualified > 0);
    assert.ok(raw.trades.length > 0, 'the fixture must exercise admitted target trades');
    assert.ok(raw.trades.every(x => x.entryT >= target && x.exitT <= end), 'historical model orders must not enter target account results');
    assert.equal(raw.engine.mem.fallback, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
