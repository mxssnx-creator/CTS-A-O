import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareSignalRegression } from './compare-signal-regression.mjs';

const read = file => JSON.parse(readFileSync(new URL(`../docs/signals-own-grid-150h-20261024/receipts/last4/${file}`, import.meta.url), 'utf8'));
const baseline = { protocol: read('protocol.json'), coverage: read('coverage.json'),
  execution: read('execution-contexts.json'), admission: read('admission-trace.json') };

test('identical Signal economics tolerate separately reported timing/source changes', () => {
  const next = structuredClone(baseline);
  next.coverage.sourceSha256 = 'new-source';
  next.coverage.audit.elapsedMs += 10;
  assert.equal(compareSignalRegression(baseline, next).ok, true);
});

test('regression comparison rejects changed inputs, lost orders, changed returns and incomplete audits', () => {
  for (const mutate of [
    c => { c.protocol.actualSettings.signals.hist.lookbackH = 100; },
    c => { c.coverage.ledger.counts.openedOrders--; },
    c => { c.coverage.settled.summary.pf += 1; },
    c => { c.coverage.hourly[0].passed--; },
    c => { c.execution.rows.pop(); },
    c => { c.coverage.ok = false; },
    c => { delete c.coverage.exactTape; },
  ]) {
    const next = structuredClone(baseline);
    mutate(next);
    assert.equal(compareSignalRegression(baseline, next).ok, false);
  }
});
