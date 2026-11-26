// Seal the complete runtime, economic source and causal fixture before scoring.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flags = process.argv.slice(3);
if (process.argv.length < 3 || flags.some(x => !['--focused', '--staged-warmup', '--modeled-warmup'].includes(x)) ||
    new Set(flags).size !== flags.length || ((flags.includes('--staged-warmup') || flags.includes('--modeled-warmup')) && !flags.includes('--focused')) ||
    (flags.includes('--staged-warmup') && flags.includes('--modeled-warmup')))
  throw new Error('usage: prepare-stable04-replay.mjs OUTPUT_DIR [--focused] [--staged-warmup|--modeled-warmup]');
const focused = flags.includes('--focused'), stagedWarmup = flags.includes('--staged-warmup'), modeledWarmup = flags.includes('--modeled-warmup');
const out = resolve(process.argv[2]);
process.env.CTS_CORE_STATE = 'off';
process.env.CTS_CORE_AUTOSTART = '0';
process.env.CTS_CORE_LIVE = '0';
process.env.CTS_CORE_COMPARE = '0';
const { CoreRuntime } = await import('../src/core/server/runtime.server.ts');
const { CoreDb } = await import('../src/core/server/db.server.ts');
const { checkSettings } = await import('../src/core/settings-check.ts');
const { SESSION_STUDY_SOURCE_SCOPE, studyCanonical, studyExactJson, studySha256, sessionStudySourceFiles, studyWithRequestedWindow } = await import('./lib/session-study.mjs');
const symbols = ['AVAX', 'DOT', 'ATOM', 'APT', 'BTC', 'ETH', 'BNB', 'DOGE', 'ADA', 'BCH', 'ETC', 'ARB'].map(s => s + '-USDT');
const t = s => Date.parse(s), targetStartT = t('2026-10-15T21:00:00Z'), endT = t('2026-10-16T21:00:00Z');
// The exploratory 48-hour arm selects Base before its first 24 hours, then carries stage and account state
// into the target 24 hours. Its first half is modeled trading, not a flat-account prehistory-only result.
const evaluationFromT = t(stagedWarmup || modeledWarmup ? '2026-10-13T21:00:00Z' : '2026-10-14T21:00:00Z');
const tradeStartT = stagedWarmup ? t('2026-10-14T21:00:00Z') : targetStartT, runH = stagedWarmup ? 48 : 24;
const modeledStartT = t('2026-10-14T21:00:00Z');
// The focused diagnostic preserves the 12-symbol windows and factory risk policies but deliberately narrows
// ordinary selections and Signal sources. The runtime still includes its automatic Micro indication focus.
const focus = ['follow|rsi-mom-14-20', 'follow|tactic-dca-bounce-8-percent-0.5-2-0.5@m1', 'revert|cci-14-200@x4'];
const settings = { forceSymbols: symbols, ...(focused ? { focus, pinned: [] } : {}),
  signals: { hist: { lookbackH: 24 }, ...(focused ? { sourcesMode: 'allow', sources: { 'ema-cross': true } } : {}) },
  exitStrategy: { enabled: false } };
const toggles = { axis: true, block: true, exit: false };
// These stage windows are not the independent Signals Last-15 setting.
const wf = { signalLongH: 24, recordValidation: 'summary', processedStages: { validationN: 12, realN: 12, reportDetail: 'summary' },
  ...(modeledWarmup ? { processedWarmup: { fromT: modeledStartT, untilT: targetStartT, baseCutT: modeledStartT } } : {}) };
checkSettings(settings);
const db = new CoreDb(':memory:');
const rt = new CoreRuntime(db, { symbols: 12, signals: { enabled: true } }, {
  market: 'bingx', replay: true, priceStream: null, evaluationFromT, replayPreloadAll: true,
  completeReplayUniverse: true, feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
});
try {
  rt.updateSettings(settings);
  rt.updateSettings({ toggles: { ...rt.settings.toggles, ...toggles } });
  rt.updateSettings({}, studyWithRequestedWindow({ causalBase: true, ...wf }, 24, runH));
  rt.wf = { ...rt.wf, longH: 24 };
  assert.equal(rt.settings.symbols, 12);
  assert.deepEqual([...rt.settings.forceSymbols].sort(), [...symbols].sort());
  if (focused) {
    assert.deepEqual(rt.settings.focus, focus);
    assert.deepEqual(rt.settings.pinned, []);
    assert.equal(rt.settings.signals.sourcesMode, 'allow');
    assert.deepEqual(rt.settings.signals.sources, { 'ema-cross': true });
  }
  assert.equal(rt.settings.tactics.signalMinDaily, 2);
  assert.equal(rt.settings.tactics.volRegime, true);
  assert.equal(rt.settings.tactics.trendStrength, true);
  assert.equal(rt.settings.toggles.axis, true);
  assert.equal(rt.settings.toggles.block, true);
  assert.equal(rt.settings.toggles.exit, false);
  assert.equal(rt.settings.exitStrategy.enabled, false);
  assert.equal(rt.settings.grid.tp.length, 0);
  assert.equal(rt.wf.wideEnabled, false);
  const thinStops = Array.from({ length: 11 }, (_, i) => (i + 2) / 10);
  for (const range of ['micro', 'minimal', 'short']) assert.deepEqual(rt.settings.grid[range].slOfTp, thinStops);
  assert.deepEqual(rt.settings.block.auto, { enabled: true, n: 30, min: 30, pf: 1.1, scope: 'key' });
  assert.equal(rt.settings.block.windowAuto, true);
  assert.equal(rt.settings.block.windowIndependent, true);
  assert.equal(rt.settings.block.windowMinSamples, 30);
  assert.equal(rt.wf.block.windowAuto, true);
  assert.equal(rt.wf.block.windowIndependent, true);
  assert.equal(rt.wf.block.windowMinSamples, 30);
  assert.equal(rt.settings.gates.stepPf.enabled, true);
  assert.equal(rt.settings.gates.stepPf.mode, 'auto');
  assert.equal(rt.wf.preH, 24);
  assert.equal(rt.wf.simH, runH);
  if (modeledWarmup) assert.deepEqual(rt.wf.processedWarmup, wf.processedWarmup);
  assert.equal(rt.wf.signalValidLastN, 15);
  const feed = readFileSync(resolve(out, 'feed-causal.json'));
  assert.equal(studySha256(feed), 'e99c7a7b808752717a6443cd09a498238c0836ff6eca7366ac04aaba3d74fadc');
  const files = sessionStudySourceFiles(root);
  const source = { files, sha256: studySha256(studyExactJson(files)), scope: SESSION_STUDY_SOURCE_SCOPE,
    checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() };
  const p = {
    schema: 'cts-session-study-v1', id: modeledWarmup ? 'stable04-focused-modeled-warmup-24h-20261126' : stagedWarmup ? 'stable04-focused-staged-warmup-48h-20261126' : focused ? 'stable04-focused-12-symbol-memory-24h-20261126' : 'stable04-12-symbol-memory-24h-20261126', symbols,
    window: { evaluationFromT, tradeStartT, endT, preH: 24, runH, ...(modeledWarmup ? { processedWarmupH: 24 } : {}) },
    symbolSelection: { cutT: targetStartT, method: stagedWarmup || modeledWarmup ? 'fixed cohort selected as of target start; retrospective during warmup' : 'fixed cohort, pre-start hourly ranking' },
    feed: { sha256: studySha256(feed), source: 'verified BingX public historical OHLCV fixture' }, source,
    actualSettings: studyCanonical(rt.settings), actualWf: studyCanonical(rt.wf),
    account: { balance: 10, leverage: 10, sizing: { mode: 'equityPct', pct: .002 } },
    policy: { tactics: 'factory defaults', history: stagedWarmup || modeledWarmup ? '24h Base history, 24h staged warmup, then 24h target; older candles for indicators and 7-day cadence' : '24h evaluated, 24h trading, older physical candles for indicator and 7-day cadence warmup',
      processedStages: 'explicit opt-in validationN=12, realN=12; separate from Signals Last-15; modeled per-set checkpoint omitted, coverage aggregates retained',
      ...(stagedWarmup ? { targetWindow: { startT: targetStartT, endT }, warmupScope: 'Continuous 48h modeled trading: positions, gates and simulated account state carry into target; not a flat-account 24h start. Base selected before warmup; fixed symbol cohort selected as of target start.' } : {}),
      ...(modeledWarmup ? { modeledWarmupScope: 'Base selected before warmup. Stage and modeled strategy histories carry into target, while pre-start positions do not spend the target account. Fixed symbol cohort selected as of target start; retrospective during warmup.' } : {}),
      scope: focused ? 'focused diagnostic: three ordinary pairs plus automatic Micro focus, one Signal source; offline modeled orders; no exchange'
        : 'offline modeled orders; no exchange' },
  };
  writeFileSync(resolve(out, 'protocol.json'), JSON.stringify(p, null, 2) + '\n');
  writeFileSync(resolve(out, 'settings.json'), JSON.stringify(settings));
  writeFileSync(resolve(out, 'wf.json'), JSON.stringify(wf));
  console.log(JSON.stringify({ checkpoint: source.checkpoint, sourceSha256: source.sha256, feedSha256: p.feed.sha256,
    blockAuto: rt.settings.block.auto, tactics: rt.settings.tactics, signalsLastN: rt.wf.signalValidLastN, window: p.window }));
} finally {
  rt.dispose();
  db.db.close();
}
