import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endpointBookMark } from './endpoint-mark.mjs';

const M = 60_000, endT = 100 * M, cost = 0.0015;
const sym = 'TEST-USDT';
const closes = (price) => ({ [sym]: [[endT - 3 * M, price - 1], [endT - M, price], [endT, 10_000]] });
const allocation = (unitNotional = 10, volume = 4) => ({ unitNotional, volume, allocatedNotional: unitNotional * volume });
const ladder = (side = 1) => ({
  cfg: 'follow|rsi-14@m15|tp1|sl20|tr0|h32|dca', sym, side,
  entryT: endT - 20 * M, entry: side === 1 ? 95 : 105,
  kind: 'dca', mult: 2, vol: 4, mtmR: -0.206,
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-13, `${actual} != ${expected}`);

test('two-leg long keeps native engine mark separate from the existing arithmetic-entry book mark', () => {
  const open = ladder(), funded = allocation(), context = { closes: closes(90), endT, cost };
  const before = structuredClone({ open, funded, context });
  const mark = endpointBookMark(open, funded, context);
  const engineLegReturn = ((90 - 100) / 100 - cost) + ((90 - 90) / 90 - cost);
  near(open.mtmR, engineLegReturn * open.mult);
  assert.equal(mark.bookSizedPnl, ((open.side * (90 - open.entry)) / open.entry - cost) * funded.unitNotional * open.vol);
  near(mark.bookSizedPnl, -2.165263157894737);
  assert.equal(mark.engineMarkSizedReturn, open.mtmR);
  near(mark.engineMarkUnitReturn, -0.103);
  near(mark.engineMarkSizedPnl, -2.06);
  assert.equal(mark.engineMinusBookMarkUsd, mark.engineMarkSizedPnl - mark.bookSizedPnl);
  assert.ok(mark.engineMinusBookMarkUsd > 0);
  assert.equal(mark.markT, endT);
  assert.equal(mark.markBarOpenT, endT - M);
  assert.equal(mark.markPrice, 90);
  assert.equal(typeof mark.engineMarkBasis, 'string');
  assert.equal(typeof mark.bookMarkBasis, 'string');
  assert.notEqual(mark.engineMarkBasis, mark.bookMarkBasis);
  assert.deepEqual({ open, funded, context }, before, 'reporting must not alter engine entry, stops, volume or price history');
  assert.equal(open.entry, 95, 'final leg information must not replace arithmetic entry with a harmonic entry');
});

test('two-leg short retains the opposite signed engine-versus-book reconciliation difference', () => {
  const open = ladder(-1), funded = allocation();
  const mark = endpointBookMark(open, funded, { closes: closes(110), endT, cost });
  const engineLegReturn = -(110 - 100) / 100 - cost - (110 - 110) / 110 - cost;
  near(open.mtmR, engineLegReturn * open.mult);
  assert.equal(mark.bookSizedPnl, ((open.side * (110 - open.entry)) / open.entry - cost) * funded.unitNotional * open.vol);
  near(mark.bookSizedPnl, -1.964761904761905);
  near(mark.engineMarkSizedPnl, -2.06);
  assert.ok(mark.engineMinusBookMarkUsd < 0);
  assert.equal(open.entry, 105);
});

test('one-leg Normal endpoint agrees across bases while preserving native multiplication order', () => {
  const open = { ...ladder(), kind: 'normal', entry: 100, vol: 2, mtmR: (-0.1 - cost) * 2 };
  const funded = allocation(10, 2), mark = endpointBookMark(open, funded, { closes: closes(90), endT, cost });
  const expected = ((1 * (90 - 100)) / 100 - cost) * 10 * 2;
  assert.equal(mark.bookSizedPnl, expected);
  near(mark.engineMarkSizedPnl, expected);
  near(mark.engineMinusBookMarkUsd, 0);
  near(mark.bookMtmR, open.mtmR);
});

test('explicit engine unit-return evidence is retained without changing the book mark', () => {
  const open = { ...ladder(), unitR: -0.125 };
  const mark = endpointBookMark(open, allocation(), { closes: closes(90), endT, cost });
  assert.equal(mark.engineMarkUnitReturn, -0.125);
  assert.equal(mark.engineMarkSizedReturn, -0.206);
  near(mark.engineMarkSizedPnl, -2.06);
  assert.equal(mark.bookSizedPnl, ((90 - 95) / 95 - cost) * 10 * 4);
  const verified = endpointBookMark(open, { ...allocation(), unitR: -0.15 }, { closes: closes(90), endT, cost });
  assert.equal(verified.engineMarkUnitReturn, -0.15, 'recorded allocation evidence remains the endpoint diagnostic source');
  assert.equal(verified.bookSizedPnl, mark.bookSizedPnl);
});

test('confirmed zero funding remains zero while unknown or inconsistent allocations are rejected', () => {
  const open = ladder(), context = { closes: closes(90), endT, cost };
  const zero = endpointBookMark(open, allocation(0), context);
  assert.ok(zero.bookSizedPnl === 0);
  assert.ok(zero.engineMarkSizedPnl === 0);
  assert.ok(zero.engineMinusBookMarkUsd === 0);
  for (const bad of [
    null, undefined,
    { unitNotional: null, volume: 4, allocatedNotional: null },
    { unitNotional: NaN, volume: 4, allocatedNotional: 40 },
    { unitNotional: -1, volume: 4, allocatedNotional: -4 },
    { unitNotional: 10, volume: 4, allocatedNotional: 39 },
  ]) assert.throws(() => endpointBookMark(open, bad, context));
});

test('marks only a bar closed by the endpoint and carries a known close across gaps', () => {
  const open = ladder(), funded = allocation();
  const mark = endpointBookMark(open, funded, {
    closes: { [sym]: [[endT - 8 * M, 90], [endT - M / 2, 900], [endT, 10_000]] }, endT, cost,
  });
  assert.equal(mark.markPrice, 90);
  assert.equal(mark.markBarOpenT, endT - 8 * M);
  assert.throws(() => endpointBookMark(open, funded, { closes: { [sym]: [[endT, 10_000]] }, endT, cost }));
  assert.throws(() => endpointBookMark(open, funded, { closes: {}, endT, cost }));
});

test('precomputed price cannot bypass an unknown or nonfinite endpoint time', () => {
  for (const time of [undefined, Infinity, NaN]) {
    assert.throws(() => endpointBookMark(ladder(), allocation(), {
      endT: time, cost, mark: { markT: time, markBarOpenT: 1, markPrice: 90 },
    }));
  }
});
