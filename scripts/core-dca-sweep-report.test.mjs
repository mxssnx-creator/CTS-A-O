import assert from 'node:assert/strict';
import {it} from 'node:test';
import {summarizeDcaSweep,renderDcaSweep} from './core-dca-sweep-report.mjs';
const stats=(gp,gl,basis)=>({n:2,gp,gl,net:gp-gl,mdd:gl,ddt:gl?1:0,pfBasis:'unit-net-returns',basis,unknownReturns:0,markedOpenExcluded:2});
const scenario=(name,gp,gl)=>({name,dca:{levels:2},base:Object.fromEntries(['dca','dca-active'].map(k=>[k,stats(gp,gl,'unfiltered-tape-diagnostic')])),byKind:Object.fromEntries(['dca','dca-active'].map(k=>[k,stats(gp,gl,'post-gate-unfunded-virtual-scenario')]))});
const win=(start,rows)=>({schema:'cts-dca-sweep-v2',window:{startT:start,endT:start+100},symbols:12,rows});
it('pools only disjoint verified unit evidence, with no-loss state and no virtual winner promotion',()=>{
 const s=summarizeDcaSweep([win(100,[scenario('Z',20,0),scenario('A',1,2)]),win(200,[scenario('Z',10,0),scenario('A',3,2)])]);
 assert.deepEqual(s.rows.map(x=>x.name),['A','A','Z','Z']);
 assert.equal(s.rows[0].virtual.pf,1);assert.equal(s.rows[0].virtual.n,4);
 assert.equal(s.rows[2].virtual.pf,null);assert.equal(s.rows[2].virtual.pfState,'no-loss');
 assert.deepEqual(s.promotion.candidates,[]);assert.equal(s.promotion.eligible,false);
 assert.match(renderDcaSweep(s),/no loss/);assert.doesNotMatch(renderDcaSweep(s),/99\.00/);
});
it('retains unknown losing evidence and never turns null into zero',()=>{
 const w=win(100,[scenario('A',1,2)]);Object.assign(w.rows[0].byKind.dca,{pfBasis:'unavailable',gp:null,gl:null,net:null,unknownReturns:1});
 const r=summarizeDcaSweep([w]).rows[0].virtual;
 assert.equal(r.n,2);assert.equal(r.pf,null);assert.equal(r.net,null);assert.equal(r.pfState,'unknown');assert.equal(r.unknownReturns,1);
});
it('refuses legacy, overlapping, duplicate and configuration-mismatched windows',()=>{
 const a=win(100,[scenario('A',1,2)]);
 assert.throws(()=>summarizeDcaSweep([{...a,schema:undefined}]),/Legacy/);
 assert.throws(()=>summarizeDcaSweep([a,win(150,[scenario('A',1,2)])]),/Overlapping/);
 assert.throws(()=>summarizeDcaSweep([win(100,[scenario('A',1,2),scenario('A',1,2)])]),/Duplicate/);
 const b=win(200,[scenario('A',1,2)]);b.rows[0].dca.levels=3;
 assert.throws(()=>summarizeDcaSweep([a,b]),/different configurations/);
});
