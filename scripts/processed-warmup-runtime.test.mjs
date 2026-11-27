// Offline integration: deterministic synthetic candles exercise actual Base, modeled stage warmup and target accounting.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { iterateSessionTapeTrades, readSessionDump, verifySessionDumpSidecars } from './lib/session-dump.mjs';
import { readSessionFeed } from './lib/session-feed.mjs';
import { readFundedSession } from './lib/session-funded-cohort.mjs';

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

test('October archive replays the same scored candles with separate indicator warmup', { timeout: 120_000 }, async () => {
  const evidence = 'docs/execution-audit-20261030/evidence';
  const cold = `${evidence}/feed-8-symbols-24h.json.gz`;
  const warm = 'docs/main-processing-audit-20261029/feed-8-symbols-72h.json.gz';
  const desk = `${evidence}/exact-lastn-desk.json`;
  const profile = JSON.parse(await readFile(desk, 'utf8'));
  const evaluationFromT = Date.UTC(2026, 9, 8, 12);
  const startT = evaluationFromT + 12 * H, endT = startT + 12 * H;
  const baseline = readSessionFeed(cold), extended = readSessionFeed(warm);
  assert.deepEqual(Object.keys(extended.candles).sort(), Object.keys(baseline.candles).sort());
  for (const [key, rows] of Object.entries(extended.candles)) {
    assert.equal(rows[0].t, evaluationFromT - 48 * H);
    assert.deepEqual(rows.filter(c => c.t >= evaluationFromT), baseline.candles[key], key);
  }
  const dir = await mkdtemp(join(tmpdir(), 'cts-october-lastn-'));
  try {
    async function run(name, feed, patch) {
      const rawPath = join(dir, name + '-raw.json'), report = join(dir, name);
      await exec(process.execPath, ['--experimental-strip-types', '--no-warnings', '--require',
        './scripts/lib/core-test-offline-guard.cjs', 'scripts/core-session.mjs',
        '--feed', feed, '--symbols', '8', '--pre', '12', '--run', '12', '--end-at', new Date(endT).toISOString(),
        '--evaluation-from', new Date(evaluationFromT).toISOString(), '--selection-hours', '12', '--replay-preload-all',
        '--desk', desk, '--balance', '10', '--leverage', '10', '--pct', '.001',
        ...(patch ? ['--wf', JSON.stringify({ processedStages: { ...profile.wf.processedStages, ...patch } })] : []),
        '--out', report, '--dump', rawPath, '--chunk-allocations', '--tape-trades-all', '--no-archive', '--quiet', 'true'],
      { env: { ...process.env, CTS_CORE_VARIANTS: '0', CTS_CORE_WORKERS: '1', CTS_CORE_LIVE: '0',
        MALLOC_ARENA_MAX: '2', MALLOC_MMAP_THRESHOLD_: '1048576' }, timeout: 35_000 });
      const result = await readFundedSession(rawPath, report + '.json');
      assert.deepEqual(result.raw.window, { startT, endT });
      assert.deepEqual(result.raw.symbols.slice().sort(), profile.settings.forceSymbols.slice().sort());
      assert.equal(result.raw.settings.provenance.evaluationFromT, evaluationFromT);
      assert.ok(result.trades.every(t => t.entryT >= startT && t.exitT <= endT));
      assert.equal(result.raw.settings.cost, profile.settings.cost);
      return { ...result, rawPath, report };
    }
    const without = await run('cold', cold);
    const withWarmup = await run('warm', warm);
    assert.equal(without.raw.engine.tapes, 0);
    assert.equal(without.raw.settings.provenance.indicatorStartT, evaluationFromT);
    assert.equal(withWarmup.raw.settings.provenance.indicatorStartT, evaluationFromT - 48 * H);
    assert.deepEqual(withWarmup.raw.settings.gates, without.raw.settings.gates);
    assert.deepEqual(withWarmup.raw.settings.effectiveWf.processedStages, without.raw.settings.effectiveWf.processedStages);
    assert.equal(withWarmup.raw.engine.tapes, 55);
    const stage = withWarmup.raw.processedStageProgress;
    assert.deepEqual([stage.validation.qualified, stage.validation.contexts, stage.real.qualified], [18, 880, 5]);
    assert.equal(stage.exec.qualified, 0);
    assert.ok(stage.validation.passingWindows.gp > stage.validation.passingWindows.gl);
    assert.equal(withWarmup.trades.length, 0);
    assert.match(await readFile(withWarmup.report + '.md', 'utf8'), /48 h of indicator-only warmup and 12 h of evaluated history/);
    let counted = 0;
    for await (const tape of iterateSessionTapeTrades(withWarmup.rawPath)) {
      assert.ok(tape.trades.every(([, , entryT]) => entryT >= evaluationFromT));
      counted++;
    }
    assert.equal(counted, withWarmup.raw.engine.tapes);

    const short = await run('short-windows', warm, { validationN: 4, realN: 2, execN: 2 });
    assert.deepEqual(short.raw.settings.gates, withWarmup.raw.settings.gates);
    assert.equal(short.trades.length, 5);
    assert.equal(short.book.total.fundedCounts.openOrders, 1);
    assert.ok(short.book.total.glR > 0 && short.book.total.gpR > short.book.total.glR);

    const last = await run('last-window', warm, { validationN: 4, realN: 1, execN: 1 });
    assert.deepEqual(last.raw.settings.gates, withWarmup.raw.settings.gates);
    assert.equal(last.trades.length, 13);
    assert.equal(last.book.total.fundedCounts.openOrders, 2);
    assert.ok(last.book.total.glR > 0 && last.book.total.gpR > last.book.total.glR);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
