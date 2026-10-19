import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { writeSessionDump } from './lib/session-dump.mjs';

const cfg = 'follow|rsi-14@m15|tp1|sl1|tr0|h32|sh';
const other = 'follow|rsi-14@m15|tp2|sl1|tr0.5|h32|mc';
const sample = () => ({
  trades: [
    { cfg, side: 1, r: 0.02, kind: 'normal' }, { cfg, side: 1, r: -0.06, kind: 'normal' },
    { cfg, side: -1, r: 0.01, kind: 'normal' }, { cfg, side: -1, r: -0.03, kind: 'normal' },
    { cfg: other, side: 1, r: 0.03, kind: 'trailing' }, { cfg: other, side: 1, r: -0.01, kind: 'trailing' },
  ],
  tapeTrades: [{ id: cfg, trades: [['A', 1, 1, 2, -0.06]] }],
  validation: [{ t: 1, real: [cfg], checks: [[cfg, 0, 2, 1 / 3, 0.02, 0.06]] }],
});
const run = (input, output) => spawnSync('python3', [resolve('scripts/losing_configs.py'), input, output], { encoding: 'utf8' });

test('Python losing-config CLI retains both directions, losing closes and PF for flat and chunked dumps', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'cts losing configs '));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const raw = sample(), flat = join(dir, 'flat raw.json'), chunks = join(dir, 'chunk raw.json');
  writeFileSync(flat, JSON.stringify(raw));
  await writeSessionDump(chunks, raw, { arrayFields: ['trades'], maxChunkBytes: 256 });
  const reports = [];
  for (const [name, file] of [['flat', flat], ['chunks', chunks]]) {
    const output = join(dir, `${name} report.md`), result = run(file, output);
    assert.equal(result.status, 0, result.stderr);
    reports.push(readFileSync(output, 'utf8').split('\n').slice(1).join('\n'));
  }
  assert.equal(reports[0], reports[1]);
  assert.match(reports[0], /3 config × side groups over 6 closes; 2 lose \(4 closes, net -0\.06 units\)/);
  assert.match(reports[0], /## -1: 1 losing configs/);
  assert.match(reports[0], /## 1: 1 losing configs/);
  assert.match(reports[0], /0\.33/);
  assert.match(reports[0], /3\.00/);
  const manifest = JSON.parse(readFileSync(chunks, 'utf8'));
  appendFileSync(join(dir, manifest.arraySidecars.trades.chunks[0].path), '\n');
  const output = join(dir, 'corrupt report.md'), failed = run(chunks, output);
  assert.notEqual(failed.status, 0, 'corrupt trade evidence must not become an empty report');
  assert.match(failed.stderr, /Sidecar chunk (?:byte size|SHA256\/bytes) mismatch/);
  assert.equal(existsSync(output), false);
});
