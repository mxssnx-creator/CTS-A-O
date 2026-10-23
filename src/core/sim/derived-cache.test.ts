import assert from 'node:assert/strict';
import {it} from 'node:test';
import {DerivedCache} from './derived-cache.ts';
import {makeTape,signalConfigEval,defaultWalkForward} from './walkforward.ts';
import {DEFAULT_SETTINGS} from '../config.ts';
import type {Trade} from '../domain/types.ts';
it('bounds derived keys, retains replacements and recomputes evicted generations',()=>{
 const c=new DerivedCache<object,number>(2),a={},b={},d={};
 c.set(a,1);c.set(b,2);c.set(a,3);c.set(d,4);
 assert.equal(c.get(a),undefined);assert.equal(c.get(b),2);assert.equal(c.get(d),4);
 c.set(a,5);assert.equal(c.get(b),undefined);assert.equal(c.get(a),5);
 assert.throws(()=>new DerivedCache(0),/capacity/);
});
it('eviction preserves exact independent Signal decisions across times, sides and setting changes',()=>{
 const H=3600000,t=120*H,base=defaultWalkForward(DEFAULT_SETTINGS);
 const o={...base,signalOwnBase:true,signalLongH:100,signalValidLastN:8,preGate:false,rangeGate:undefined,
  gates:{...base.gates,minTrades:8,minPf:1.5,maxDdr:0,maxDdtH:0,minGreen:0,stableBlocks:0,lossPrior:false,lastNFloor:0}};
 const make=(j:number)=>{
  const cfg=`follow|sig-ema-cross-s@m1|test${j}`;
  const rows=([1,-1] as const).flatMap(side=>Array.from({length:16},(_,i):Trade=>({cfg,sym:'A',side,entryT:t-(17-i)*H-60000,exitT:t-(17-i)*H,entry:100,exit:101,r:side>0?(i%4===3?-.01:.02):-.01,reason:'tp',bars:1,mfe:0,mae:0})));
  return makeTape(cfg,'follow','sig-ema-cross-s@m1',{tp:.02,sl:.01,trail:0,hold:60},'normal',['A'],rows,[],[]);
 };
 const first=make(0),expected=[1,-1].map(side=>signalConfigEval(first,t,o,'A',side));
 assert.equal(expected[0].ok,true);assert.equal(expected[1].ok,false);
 for(let i=1;i<650;i++){const tp=make(i);for(const side of [1,-1])signalConfigEval(tp,t,o,'A',side);}
 assert.deepEqual([1,-1].map(side=>signalConfigEval(first,t,o,'A',side)),expected);
 assert.equal(signalConfigEval(first,t+101*H,o,'A',1).ok,false,'expired history cannot survive a cache clock change');
 assert.equal(signalConfigEval(first,t,{...o,gates:{...o.gates,minPf:100}},'A',1).ok,false);
 assert.deepEqual(signalConfigEval(first,t,o,'A',1),expected[0]);
});
