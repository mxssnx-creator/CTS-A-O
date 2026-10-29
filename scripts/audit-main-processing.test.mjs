import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simpleCostCheck } from './audit-main-processing.mjs';

test('price audit normalizes recorded external sizing once and retains one modeled cost', () => {
  const trade = { kind: 'normal', side: 1, entry: 100, exit: 102, r: .0185 * 5, mult: 5 };
  assert.equal(simpleCostCheck(trade, .0015).state, 'matched');
  assert.equal(simpleCostCheck({ ...trade, r: (.02 - .003) * 5 }, .0015).state, 'failed');
  assert.equal(simpleCostCheck({ ...trade, side: -1, exit: 98 }, .0015).state, 'matched');
});

test('unknown returns and intrinsic ladder semantics never become a successful ordinary cost check', () => {
  const trade = { kind: 'trailing', side: 1, entry: 100, exit: 102, r: .0185, unitR: null, mult: 1 };
  assert.equal(simpleCostCheck(trade, .0015).state, 'failed');
  assert.equal(simpleCostCheck({ ...trade, kind: 'dca' }, .0015).state, 'intrinsic-ladder');
  assert.equal(simpleCostCheck({ ...trade, kind: 'axis' }, .0015).state, 'intrinsic-ladder');
});
