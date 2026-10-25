// Predeclare one expanded Signal Exit policy and its later-window control before scoring either.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CoreRuntime } from '../src/core/server/runtime.server.ts';
import { CoreDb } from '../src/core/server/db.server.ts';
import { sessionStudySourceFiles, studySha256, studyExactJson, studyCanonical } from './lib/session-study.mjs';
process.env.CTS_CORE_STATE = 'off';
process.env.CTS_CORE_AUTOSTART = '0';
process.env.CTS_CORE_LIVE = '0';
const root = resolve(process.argv[2] ?? 'runs/signal-exit-ranges-20261025');
assert.ok(!existsSync(resolve(root, 'plan.json')), 'Preserve earlier attempts; choose a new directory');
const original = JSON.parse(readFileSync('docs/signals-own-grid-150h-20261024/receipts/last4/protocol.json', 'utf8'));
const files = sessionStudySourceFiles();
const source = { ...original.source, files, sha256: studySha256(studyExactJson(files)),
  checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() };
const ranges = [
  { holdH: 3, distance: 1, basis: 'extrema' },
  { holdH: 6, distance: 1.5, basis: 'extrema' },
  { holdH: 12, distance: 2, basis: 'extrema' },
  { holdH: 6, distance: 1.5, basis: 'close' },
  { holdH: 12, distance: 2, basis: 'close' },
];
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const jobs = [];
for (const [id, expanded, offset] of [
  ['expanded-original', true, 0], ['control-later', false, 12], ['expanded-later', true, 12],
]) {
  const settings = structuredClone(original.actualSettings);
  if (expanded) Object.assign(settings.exitStrategy, { signalRanges: ranges, maxConfigsPerPair: 144 });
  const wf = structuredClone(original.actualWf);
  const window = { ...original.window };
  for (const key of ['evaluationFromT', 'tradeStartT', 'endT']) window[key] += offset * 3_600_000;
  const db = new CoreDb(':memory:');
  const rt = new CoreRuntime(db, { symbols: original.symbols.length }, {
    market: 'bingx', replay: true, priceStream: null, evaluationFromT: window.evaluationFromT,
    feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
  });
  let actual;
  try {
    rt.updateSettings(settings); rt.updateSettings({}, wf);
    actual = { settings: studyCanonical(rt.settings), wf: studyCanonical(rt.wf) };
    assert.equal(studyExactJson(actual.settings), studyExactJson(settings));
    assert.equal(studyExactJson(actual.wf), studyExactJson(wf));
  } finally { rt.dispose(); db.db.close(); }
  const dir = resolve(root, id); mkdirSync(dir, { recursive: true });
  const protocol = { ...original, id, createdAt: new Date().toISOString(), source, window,
    actualSettings: actual.settings, actualWf: actual.wf,
    ...(original.liveSinceT === undefined ? {} : { liveSinceT: window.tradeStartT }),
    policy: { scope: 'Signal Exit expansion; ordinary source families disabled as in the original study',
      change: expanded ? 'Original fit plus five horizon/distance/price-structure fits; shared pair cap 144' : 'Original Exit policy',
      unchanged: 'Signal grids, initial protection ceilings, costs, full-history/Last-N gates, sizing and symbol universe',
      acceptance: 'Preserve all losses and empty types. Evaluate Exit separately, plus full funded account; later window must independently improve before any default promotion.',
      evidence: 'Retrospective offline model; later window is separate from the development result, not a future-profit guarantee' } };
  write(resolve(dir, 'desk.json'), actual); write(resolve(dir, 'protocol.json'), protocol);
  jobs.push({ scenario: { id, expanded, offsetHours: offset }, dir });
}
write(resolve(root, 'plan.json'), { sourceSha256: source.sha256, jobs, ranges, createdAt: new Date().toISOString() });
console.log(JSON.stringify({ root, sourceSha256: source.sha256, jobs: jobs.map(j => j.scenario) }));
