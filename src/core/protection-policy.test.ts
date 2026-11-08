import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from './config.ts';
import { normalizeLanes } from './server/runtime.server.ts';
import { initialProtection, SL_TP_RATIOS, minimumStopFraction } from './protection-policy.ts';
import { protectGrid, dcaProtectGrid } from './sim/walkforward.ts';
import { baseRangeProtects } from './pipeline/pipeline.ts';

test('all ten ratios keep targets while raising initial SL, on both sides',()=>{
  for(const side of ['long','short'] as const) for(const ratio of SL_TP_RATIOS)
    for(const cost of [0,.0011,.00176]) for(const net of [.1,.4,1]) {
      const x=initialProtection(side,100,.2*ratio,.2,cost,net);
      assert.ok(Math.abs(x.slDist-Math.max(.2*ratio,cost*100+net))<1e-12);
      assert.equal(x.tpDist,.2);
    }
});
test('one setting determines Base, Main, DCA, Signals and execution floors without mutating defaults',()=>{
  const before=JSON.stringify(DEFAULT_SETTINGS);
  for(const cost of [.0011,.00176]) for(const net of [.1,.4,1]) {
    const s=normalizeLanes({...DEFAULT_SETTINGS,cost,minSlDistancePct:net});
    const floor=minimumStopFraction(cost,net);
    assert.equal(s.protectFloor.minSl,floor);
    assert.equal(s.signals.minSl,floor);
    for(const rows of [protectGrid(1,s.grid,cost),baseRangeProtects(s.grid,cost),dcaProtectGrid(1,s.dca,s.grid.minSlEval)]) {
      assert.ok(rows.length>0);
      assert.ok(rows.every(p=>p.sl>=floor-1e-12),'a secondary floor/cap overrode the global minimum');
    }
  }
  assert.equal(JSON.stringify(DEFAULT_SETTINGS),before);
});
test('an incompatible stop ceiling rejects a cell instead of pulling SL below the minimum',()=>{
  const g={...DEFAULT_SETTINGS.grid,tp:[.002],slOfTp:[.25],trailOfTp:[0],holdH:[1],minSl:.0021,minSlEval:.0021,maxSl:.001,
    minimal:false as const,short:false as const,micro:false as const,general:false as const,long:false as const,minimalPlus:false as const};
  assert.equal(protectGrid(1,g,.0011).length,0);
});
