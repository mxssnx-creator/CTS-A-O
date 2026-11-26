import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../config.ts';
import { defaultWalkForward, pickSeats, pickSeatsGen, selectionRankGen, type Selection } from './walkforward.ts';

type Candidate = Selection & { pair: string };
const drain = <T>(g: Generator<number, T>): T => { for (;;) { const next = g.next(); if (next.done) return next.value; } };

test('cooperative selection preserves sorted, unsorted, tied and held-seat behavior', () => {
  const d = defaultWalkForward(DEFAULT_SETTINGS), tags = ['', 'mc', 'mn', 'sh', 'gn', 'lg', 'lr'];
  const rows: Candidate[] = Array.from({ length: 600 }, (_, i) => ({ id: `cfg-${i}`,
    pair: `${tags[i % tags.length] ? tags[i % tags.length] + '|' : ''}follow|ema-${i % 5}@m${[1, 5, 15, 30][i % 4]}|base#${i % 43}`,
    score: (i * 97 % 53) / 10, window: { n: 12, net: .1, pf: 1.5, ddt: 0 } }));
  for (const sorted of [false, true]) for (const familySeats of [false, true])
    for (const portfolio of [0, 1, 7, 30]) for (const laneSeats of [0, 2]) {
      const input = sorted ? [...rows].sort((a, b) => b.score - a.score) : rows;
      const held = input.slice(0, 3), p0 = new Set(held.map(x => x.pair)), p1 = new Set(p0);
      const o = { ...d, familySeats, portfolio, laneSeats, microSeats: 3, rangeSeats: true, seatPer: 'config' as const };
      const expected = pickSeats(input, portfolio || Infinity, [...held], p0, o);
      const actual = drain(pickSeatsGen(input, portfolio || Infinity, [...held], p1, o, true));
      assert.deepEqual(actual, expected);
      assert.deepEqual([...p1], [...p0]);
    }
  const unusual = [...rows]; unusual[3] = { ...unusual[3], score: NaN };
  assert.deepEqual(drain(pickSeatsGen(unusual, 12, [], new Set(), d, true)), pickSeats(unusual, 12, [], new Set(), d));
});

test('unlimited Micro selection handles more entries than a function call can spread', () => {
  const n = 140_000, d = defaultWalkForward(DEFAULT_SETTINGS);
  const rows: Candidate[] = Array.from({ length: n }, (_, i) => ({ id: `cfg-${i}`,
    pair: `mc|follow|ema-9-21@m1|base#${i}`, score: 1,
    window: { n: 12, net: .1, pf: 1.5, ddt: 0 } }));
  const gen = pickSeatsGen(rows, Infinity, [], new Set(), { ...d, portfolio: 0, microSeats: 0 });
  let result = gen.next();
  assert.equal(result.done, false, 'large selections must hand control back before finishing');
  while (!result.done) result = gen.next();
  const out = result.value;
  assert.equal(out.length, n);
  assert.equal(out[0].id, 'cfg-0');
  assert.equal(out[n - 1].id, `cfg-${n - 1}`);
});

test('priority ranks retain native ordering while yielding during a large selection', () => {
  const rows: Selection[] = Array.from({ length: 80_000 }, (_, i) => ({ id: `cfg-${i % 19_007}`,
    score: (i * 97 % 53) / 10, window: { n: 12, net: .1, pf: 1.5, ddt: 0 } }));
  const native = (xs: Selection[]) => new Map([...xs].sort((a, b) => b.score - a.score ||
    (a.id < b.id ? -1 : 1)).map((p, i) => [p.id, i] as [string, number]));
  const gen = selectionRankGen(rows);
  let step = gen.next();
  assert.equal(step.done, false, 'large rank preparation must hand control back');
  while (!step.done) step = gen.next();
  assert.deepEqual(step.value, native(rows));
  const unknown = rows.slice(0, 30); unknown[4] = { ...unknown[4], score: NaN };
  assert.deepEqual(drain(selectionRankGen(unknown)), native(unknown));
});
