// category-merge.mjs: a category run must reproduce that category's orders of the combined run, exactly, and carry no
// order of another category. Runs the CLI (it imports src/core/range-category.ts, so Node strips the types).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MERGE = join(HERE, 'category-merge.mjs');
const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 7);
const SIG = 'follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32';
const GN = 'follow|rsi-14-30-70@m15|tp1|sl1|tr0|h32|gn';
const LG = 'follow|rsi-14-30-70@m15|tp1|sl1|tr0|h32|lg';

const closed = (cfg, hour, r, sym = 'AAA-USDT') => ({ cfg, sym, side: 1, entryT: T0 + hour * H, exitT: T0 + hour * H + 60_000, entry: 1, exit: 1, r });
const open = (cfg, hour, mtmR, sym = 'AAA-USDT') => ({ cfg, sym, side: 1, entryT: T0 + hour * H, entry: 1, mtmR });

function fixture(t, name, dump) {
  const dir = mkdtempSync(join(tmpdir(), 'category-merge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, `${name}.raw.json`);
  writeFileSync(file, JSON.stringify(dump));
  return file;
}

function merge(t, combined, runs) {
  const combinedFile = fixture(t, 'combined', combined);
  const args = [MERGE, combinedFile];
  for (const [cat, dump] of Object.entries(runs)) args.push('--run', `${cat}=${fixture(t, cat, dump)}`);
  return spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', ...args], { encoding: 'utf8' });
}

const combined = {
  trades: [closed(SIG, 1, 0.01), closed(GN, 2, 0.02), closed(GN, 3, -0.01), closed(LG, 4, 0.03)],
  openEnd: [open(GN, 5, 0.004), open(SIG, 5, -0.002)],
};

test('a run restricted to a category with the same orders is identical and exits 0', (t) => {
  const r = merge(t, combined, {
    general: { trades: [closed(GN, 2, 0.02), closed(GN, 3, -0.01)], openEnd: [open(GN, 5, 0.004)] },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\| general \| yes \| 2 \/ 2 \| 1 \/ 1 \|/);
});

test('a missing order is reported and fails the check', (t) => {
  const r = merge(t, combined, { general: { trades: [closed(GN, 2, 0.02)], openEnd: [open(GN, 5, 0.004)] } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\| general \| NO \|/);
  assert.match(r.stdout, /\| 1 \| 0 \| 0 \|/, 'one missing, no extra, no foreign');
  assert.match(r.stdout, /^ {2}- follow\|rsi-14-30-70@m15\|tp1\|sl1\|tr0\|h32\|gn\|AAA-USDT\|1\|/m, 'the first differing order is named');
});

test('an order of another category in the run is foreign and fails the check', (t) => {
  const r = merge(t, combined, {
    general: { trades: [closed(GN, 2, 0.02), closed(GN, 3, -0.01), closed(LG, 4, 0.03)], openEnd: [open(GN, 5, 0.004)] },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\| general \| NO \|.*\| 0 \| 1 \| 1 \|/, 'the long order is an extra order and counted as foreign');
});

test('a changed result of the same order is a difference, not a match', (t) => {
  const r = merge(t, combined, {
    general: { trades: [closed(GN, 2, 0.02), closed(GN, 3, -0.0101)], openEnd: [open(GN, 5, 0.004)] },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\| general \| NO \|/);
});

test('each category is checked on its own: one identical, one not', (t) => {
  const r = merge(t, combined, {
    general: { trades: [closed(GN, 2, 0.02), closed(GN, 3, -0.01)], openEnd: [open(GN, 5, 0.004)] },
    signals: { trades: [closed(SIG, 1, 0.5)], openEnd: [open(SIG, 5, -0.002)] },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\| general \| yes \|/);
  assert.match(r.stdout, /\| signals \| NO \|/);
});

test('a missing argument is a usage error', (t) => {
  const f = fixture(t, 'combined', combined);
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', MERGE, f], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage/);
});
