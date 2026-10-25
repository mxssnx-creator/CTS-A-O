// Exact processing comparison across the additive PF-state report schema change.
// Existing values/keys must remain identical. Only independently checked new PF
// metadata may be projected away; no return, allocation, gate or clock is ignored.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {compareSignalRegression} from './compare-signal-regression.mjs';
import {readFundedSession} from './lib/session-funded-cohort.mjs';
import {readSessionDump} from './lib/session-dump.mjs';

const [beforeDir, afterDir, output] = process.argv.slice(2);
assert.ok(beforeDir && afterDir && output, 'BEFORE_DIR AFTER_DIR OUTPUT_JSON');
const added = [];
function legacyProjection(before, after, path) {
  if (!before || typeof before !== 'object') {
    assert.deepEqual(after, before, path); return after;
  }
  assert.ok(after && typeof after === 'object', path);
  if (Array.isArray(before)) {
    assert.ok(Array.isArray(after), path); assert.equal(after.length, before.length, path);
    return before.map((value, i) => legacyProjection(value, after[i], `${path}[${i}]`));
  }
  const projected = {};
  for (const key of Object.keys(before)) {
    assert.ok(Object.hasOwn(after, key), `Missing ${path}.${key}`);
    projected[key] = legacyProjection(before[key], after[key], `${path}.${key}`);
  }
  for (const key of Object.keys(after).filter(key => !Object.hasOwn(before, key))) {
    const cumulative = key.startsWith('cum');
    const field = cumulative ? key.slice(3,4).toLowerCase() + key.slice(4) : key;
    assert.ok(['exactPf','pfState','pfConvention','pfBasis','noLoss'].includes(field), `Unexpected addition ${path}.${key}`);
    const count = cumulative ? before.cumOrders : before.orders ?? before.n;
    const pf = cumulative ? before.cumPf : before.pf;
    const gp = cumulative ? before.cumGpR : before.gpR;
    const gl = cumulative ? before.cumGlR : before.glR;
    assert.ok(Number.isInteger(count) && count >= 0, `Missing sample ${path}.${key}`);
    const available = count > 0 && Number.isFinite(pf);
    const noLoss = available && gp > 0 && gl === 0;
    const state = !count ? 'empty' : !available ? 'unavailable' : gl > 0 ? 'ratio' : gp > 0 ? 'no-loss' : 'flat';
    if (field === 'exactPf' && state === 'ratio') {
      assert.ok(Number.isFinite(after[key]) && Math.abs(after[key] - pf) <= 1e-12 * Math.max(1, Math.abs(pf)), `${path}.${key}`);
    } else {
      const expected = { exactPf: null, pfState: state, noLoss,
        pfBasis: available ? 'unit-net-returns' : 'unavailable',
        pfConvention: !available ? 'unavailable' : noLoss ? 'no-loss-sentinel' : 'gross-return-ratio' };
      assert.deepEqual(after[key], expected[field], `${path}.${key}`);
    }
    added.push(`${path}.${key}`);
  }
  return projected;
}
function readCase(dir) {
  const read = file => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
  return { protocol: read('protocol.json'), coverage: read('coverage.json'),
    execution: read('execution-contexts.json'), admission: read('admission-trace.json'),
    metrics: read('process-metrics.json') };
}
const before = readCase(beforeDir), after = readCase(afterDir);
const account = legacyProjection(before.coverage.account, after.coverage.account, 'coverage.account');
const comparison = compareSignalRegression(before, {...after, coverage: {...after.coverage, account}});
assert.ok(comparison.ok, JSON.stringify(comparison.checks.filter(c => !c.ok)));
async function ownedEvidence(dir) {
  const value = await readFundedSession(`${dir}/raw.json`);
  // Release the full minute-selection header before reading the next case.
  return {trades:value.trades, total:value.book.total, hours:value.book.hours};
}
assert.ok(global.gc, 'Run with --expose-gc to release each legacy unchunked header');
const a = await ownedEvidence(beforeDir); global.gc();
const b = await ownedEvidence(afterDir); global.gc();
legacyProjection(a.total, b.total, 'report.total');
legacyProjection(a.hours, b.hours, 'report.hours');
assert.deepEqual(b.trades, a.trades, 'Every complete funded settled order and allocation');
async function heldEvidence(dir) {
  return (await readSessionDump(`${dir}/report/data.json`, {fields:['sizedOpenOrders']})).sizedOpenOrders;
}
const ah = await heldEvidence(beforeDir); global.gc();
const bh = await heldEvidence(afterDir); global.gc();
assert.deepEqual(bh, ah, 'Every complete funded held order and allocation');
const result = {...comparison, schema:'cts-history-pf-schema-parity-v1',
  addedMetadata: added, fullSettledOrders: b.trades.length, fullHeldOrders: bh.length,
  completeHourlyLegacyFieldsEqual: true, completeAccountLegacyFieldsEqual: true,
  metrics: {before:before.metrics, after:after.metrics},
  timingScope:'Same local environment, sequential complete runs; observed wall/RSS comparison, not a hard latency guarantee.'};
writeFileSync(output, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ok:result.ok, checks:result.checks.length, checkedNewMetadata:added.length,
  settledOrders:result.fullSettledOrders, heldOrders:result.fullHeldOrders, metrics:result.metrics}));
