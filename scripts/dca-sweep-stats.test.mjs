import assert from 'node:assert/strict';
import { it } from 'node:test';
import { dcaSweepStats } from './dca-sweep-stats.mjs';
const H=3600000;
const row=(r,exitT,extra={})=>({r,mult:1,entryT:exitT-60000,exitT,vol:1,...extra});
it('DCA research excludes marks/future closes and normalizes verified external sizing once',()=>{
 const xs=[row(.1,2*H,{mult:10}),row(-.02,3*H),row(5,4*H,{markedOpen:true}),row(2,5*H)];
 const s=dcaSweepStats(xs,H,4*H);
 assert.equal(s.n,2);assert.equal(s.pf,.5);assert.equal(s.net,-1);
 assert.equal(s.markedOpenExcluded,1);assert.equal(s.outsideWindowExcluded,1);assert.equal(s.mdd,2);
 assert.equal(s.basis,'post-gate-unfunded-virtual-scenario');
});
it('all-positive curves have zero DDT and a no-loss state, never a measured PF 99',()=>{
 const s=dcaSweepStats([row(.01,2*H),row(.02,3*H)],H,6*H);
 assert.equal(s.ddt,0);assert.equal(s.pf,null);assert.equal(s.pfState,'no-loss');
 assert.equal(s.gateScore,4);assert.equal(s.gh,1);
});
it('right-closed reporting hours and chronological drawdown survive unordered batches',()=>{
 const s=dcaSweepStats([row(-.01,3*H),row(.02,2*H),row(-.01,H+30*60000)],H,4*H);
 assert.equal(s.gh,.5);assert.equal(s.ddt,2);assert.equal(s.n,3);
});
it('unknown unit evidence keeps the sample unknown instead of dropping a losing close',()=>{
 const s=dcaSweepStats([row(.02,2*H),row(-.01,3*H,{mult:undefined})],H,4*H);
 assert.equal(s.n,2);assert.equal(s.pfState,'unknown');assert.equal(s.pf,null);assert.equal(s.net,null);assert.equal(s.unknownReturns,1);
});
