import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionBasePairRows } from './lib/session-qualification.mjs';

test('a trailing-only Base pass is reported without marking ordinary tags or Exit as passed', () => {
  const rows = ['trailing-only', 'rejected', 'exit', 'sig-ema-cross-s@m5'].map((ind, i) => ({ bot: i >= 2 ? 'exit' : 'follow',
    ind, full: { n: 2, pf: .5, net: -1 } }));
  const proof = { 'follow|trailing-only': { tags: new Set(['mn']), keys: new Set(['mn|0|stop|to']) } };
  const result = sessionBasePairRows(rows, {}, true, new Set(), proof);
  assert.equal(result[0].passed, true); assert.deepEqual(result[0].tags, []);
  assert.deepEqual(result[0].trailingOnlyTags, ['mn']); assert.equal(result[0].trailingOnlyQualifiedCells, 1);
  assert.equal(result[1].passed, false); assert.equal(result[2].passed, false);
  assert.equal(result[3].pair, 'exit|sig-ema-cross-s@m5'); assert.equal(result[3].passed, false);
  const exit = sessionBasePairRows(rows, {}, true, new Set(['exit|sig-ema-cross-s@m5']), proof);
  assert.equal(exit[3].passed, true); assert.deepEqual(exit[3].tags, ['exit']);
});
