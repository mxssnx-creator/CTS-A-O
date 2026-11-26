// Seal the complete runtime, economic source and causal fixture before scoring.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length !== 3) throw new Error('usage: prepare-stable04-replay.mjs OUTPUT_DIR');
const out = resolve(process.argv[2]);
process.env.CTS_CORE_STATE = 'off';
process.env.CTS_CORE_AUTOSTART = '0';
process.env.CTS_CORE_LIVE = '0';
process.env.CTS_CORE_COMPARE = '0';
const { CoreRuntime } = await import('../src/core/server/runtime.server.ts');
const { CoreDb } = await import('../src/core/server/db.server.ts');
const { checkSettings } = await import('../src/core/settings-check.ts');
const { studyCanonical, studyExactJson, studySha256, sessionStudySourceFiles, studyWithRequestedWindow } = await import('./lib/session-study.mjs');
const symbols = ['AVAX', 'DOT', 'ATOM', 'APT', 'BTC', 'ETH', 'BNB', 'DOGE', 'ADA', 'BCH', 'ETC', 'ARB'].map(s => s + '-USDT');
const t = s => Date.parse(s), evaluationFromT = t('2026-10-14T21:00:00Z'), tradeStartT = t('2026-10-15T21:00:00Z'), endT = t('2026-10-16T21:00:00Z');
const settings = { forceSymbols: symbols, signals: { hist: { lookbackH: 24 } }, exitStrategy: { enabled: false } };
const toggles = { axis: true, block: true, exit: false };
// These stage windows are not the independent Signals Last-15 setting.
const wf = { signalLongH: 24, recordValidation: 'summary', processedStages: { validationN: 12, realN: 12 } };
checkSettings(settings);
const db = new CoreDb(':memory:');
const rt = new CoreRuntime(db, { symbols: 12, signals: { enabled: true } }, {
  market: 'bingx', replay: true, priceStream: null, evaluationFromT, replayPreloadAll: true,
  completeReplayUniverse: true, feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
});
try {
  rt.updateSettings(settings);
  rt.updateSettings({ toggles: { ...rt.settings.toggles, ...toggles } });
  rt.updateSettings({}, studyWithRequestedWindow({ causalBase: true, ...wf }, 24, 24));
  rt.wf = { ...rt.wf, longH: 24 };
  assert.equal(rt.settings.symbols, 12);
  assert.deepEqual([...rt.settings.forceSymbols].sort(), [...symbols].sort());
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
  assert.equal(rt.wf.simH, 24);
  assert.equal(rt.wf.signalValidLastN, 15);
  const feed = readFileSync(resolve(out, 'feed-causal.json'));
  assert.equal(studySha256(feed), 'e99c7a7b808752717a6443cd09a498238c0836ff6eca7366ac04aaba3d74fadc');
  const files = sessionStudySourceFiles(root);
  const source = { files, sha256: studySha256(studyExactJson(files)), checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() };
  const p = {
    schema: 'cts-session-study-v1', id: 'stable04-12-symbol-memory-24h-20261126', symbols,
    window: { evaluationFromT, tradeStartT, endT, preH: 24, runH: 24 },
    symbolSelection: { cutT: tradeStartT, method: 'fixed cohort, pre-start hourly ranking' },
    feed: { sha256: studySha256(feed), source: 'verified BingX public historical OHLCV fixture' }, source,
    actualSettings: studyCanonical(rt.settings), actualWf: studyCanonical(rt.wf),
    account: { balance: 10, leverage: 10, sizing: { mode: 'equityPct', pct: .002 } },
    policy: { tactics: 'factory defaults', history: '24h evaluated, 24h trading, older physical candles for indicator and 7-day cadence warmup',
      processedStages: 'explicit opt-in validationN=12, realN=12; separate from Signals Last-15', scope: 'offline modeled orders; no exchange' },
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
