import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PF_NEUTRAL, profitFactorRatio } from '../../src/core/metrics/profit-factor.mjs';
import { pfOf as variants } from './eval-variants.mjs';
import { pfOf as baseRules } from './eval-base-rules.mjs';
import { blockSplit } from './eval-orders.mjs';
import { pfHeatStyle } from './pf-presentation.mjs';

test('report heatmaps keep neutral, flat, empty and unknown samples uncoloured', () => {
  for (const amount of [1, 1e-13, 1e-20]) {
    assert.equal(pfHeatStyle(amount, amount, 2), '');
    assert.match(pfHeatStyle(amount / 2, amount, 2), /--neg/);
    assert.match(pfHeatStyle(amount * 2, amount, 2), /--pos/);
  }
  for (const args of [[0, 0, 2], [0, 0, 0], [1, 1, 0], [NaN, 1, 2], [1, NaN, 2]])
    assert.equal(pfHeatStyle(...args), '');
});

test('script and engine PF agree at neutral one without discarding tiny losses', () => {
  assert.equal(PF_NEUTRAL, 1);
  for (const amount of [1, 1e-9, 1e-13, 1e-20]) {
    for (const ratio of [0, .5, 1, 1.5, 4]) {
      const rs = [amount * ratio, -amount];
      for (const value of [variants(rs), baseRules(rs), profitFactorRatio(amount * ratio, amount)]) {
        if (ratio === 1) assert.equal(value, 1);
        else assert.ok(Math.abs(value - ratio) < 1e-14);
      }
    }
    const split = blockSplit([{ r: amount, mult: 1 }, { r: -amount, mult: 1 }]);
    assert.equal(split.pfUnit, 1);
  }
});

test('no-loss conventions never replace unknown, overflowed, or losing evidence', () => {
  assert.equal(profitFactorRatio(1, 0), Infinity);
  assert.equal(profitFactorRatio(1, 0, 4), 4);
  assert.equal(profitFactorRatio(0, 1), 0);
  assert.equal(profitFactorRatio(0, 0), 0, 'empty internal score is not measured neutral performance');
  for (const [gp, gl] of [[NaN, 1], [1, NaN], [Infinity, 1], [1, Infinity], [-1, 1], [1, -1], [Number.MAX_VALUE, Number.MIN_VALUE]])
    assert.ok(Number.isNaN(profitFactorRatio(gp, gl)));
});
