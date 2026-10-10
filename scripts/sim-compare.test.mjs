// sim-compare.mjs on a small session dump: Signals are their own row (not a range), and each engine range has its own
// hourly success, so the per-range table can be read against the Signals table (docs/positive-coordinations.md, 8 Oct).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPARE = join(HERE, 'sim-compare.mjs');
const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 7);

const trade = (cfg, hour, r) => ({ cfg, sym: 'AAA-USDT', side: 1, entryT: T0 + hour * H, exitT: T0 + hour * H + 60_000, r, kind: 'normal' });

function run(t, trades, openEnd = []) {
  const dir = mkdtempSync(join(tmpdir(), 'sim-compare-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'dump.raw.json');
  writeFileSync(file, JSON.stringify({
    window: { startT: T0, endT: T0 + 24 * H },
    symbols: ['AAA-USDT'],
    trades,
    openEnd,
  }));
  const r = spawnSync(process.execPath, [COMPARE, file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

const SIG = 'follow|sig-ema-cross-s@m15|tp1|sl1|tr0|h32';
const GN = 'follow|rsi-14-30-70@m15|tp1|sl1|tr0|h32|gn';
const LG = 'follow|rsi-14-30-70@m15|tp1|sl1|tr0|h32|lg';

test('Signals are their own row, not the range "wide"', (t) => {
  const out = run(t, [trade(SIG, 1, 0.01), trade(SIG, 2, -0.01), trade(GN, 3, 0.02)]);
  assert.match(out, /^range signals\s+\{"orders":2,/m, 'the two signal orders form the signals row');
  assert.doesNotMatch(out, /^range wide/m, 'no signal order is counted as a range');
  assert.match(out, /^range gn\s+\{"orders":1,/m, 'the engine range has its own row');
});

test('each range has its own hourly success line', (t) => {
  // gn: two hours, one positive; lg: one hour, positive
  const out = run(t, [trade(GN, 1, 0.01), trade(GN, 2, -0.01), trade(LG, 3, 0.02)]);
  assert.match(out, /^hourly range gn\s+2 hours with closed orders, 1 positive \(50 %\)/m);
  assert.match(out, /^hourly range lg\s+1 hours with closed orders, 1 positive \(100 %\)/m);
});

test('the group and range totals agree on the closed orders', (t) => {
  const out = run(t, [trade(SIG, 1, 0.01), trade(GN, 2, 0.01), trade(LG, 3, -0.01)], [{ cfg: GN, mtmR: 0.02 }]);
  assert.match(out, /^group Signals\s+\{"orders":1,"open":0,/m);
  assert.match(out, /^group Engine\s+\{"orders":2,"open":1,/m);
});
