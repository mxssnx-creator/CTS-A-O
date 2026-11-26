import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../config.ts';
import { defaultWalkForward, pickSeats, type Selection } from './walkforward.ts';

type Candidate = Selection & { pair: string };
test('unlimited Micro selection handles more entries than a function call can spread', () => {
  const n = 140_000, d = defaultWalkForward(DEFAULT_SETTINGS);
  const rows: Candidate[] = Array.from({ length: n }, (_, i) => ({ id: `cfg-${i}`,
    pair: `mc|follow|ema-9-21@m1|base#${i}`, score: 1,
    window: { n: 12, net: .1, pf: 1.5, ddt: 0 } }));
  const out = pickSeats(rows, Infinity, [], new Set(), { ...d, portfolio: 0, microSeats: 0 });
  assert.equal(out.length, n);
  assert.equal(out[0].id, 'cfg-0');
  assert.equal(out[n - 1].id, `cfg-${n - 1}`);
});
