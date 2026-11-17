import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_SETTINGS} from '../config.ts';
import {DEFAULT_POSITION_WINDOWS} from '../position-windows.ts';
import {configEval,configEvalSummary,defaultWalkForward,makeTape,positionConfigEval,symStats,sampleWindowsForTape} from './walkforward.ts';
import type {Trade} from '../domain/types.ts';
import {TapeHistoryStore} from '../server/history-store.server.ts';

test('all-context count evaluation matches scalar contexts with bounded column traversal',(ctx)=>{
 const symbols=Array.from({length:12},(_,i)=>'S'+i),end=Date.UTC(2026,10,15),rows:Trade[]=[];
 for(let j=0;j<64;j++)for(const [s,sym]of symbols.entries())for(const side of [1,-1]as const){
  const entryT=end-(64-j)*60000,r=(s+side+j)%7===0?-.01:.02;
  rows.push({cfg:'own',sym,side,entryT,exitT:entryT+1,entry:100,exit:100*(1+side*r),r,mult:1,
   reason:'tp',kind:'normal',bars:1,mfe:0,mae:0});
 }
 const tape=makeTape('own','follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1,tag:'mc'},'normal',
  [...symbols,...symbols],rows,[],[]);
 const base=defaultWalkForward(DEFAULT_SETTINGS);
 const o={...base,mode:'fixed' as const,rangeGate:undefined,gates:{...base.gates,
  positionWindows:{...DEFAULT_POSITION_WINDOWS,base:4,main:4,real:3,entry:2,byRange:{},byConfig:{},blocks:undefined},
  minPf:1.05,minGreen:0,maxDdr:0,lossPrior:false}};
 const reads={symI:0,side:0};
 const observed=new Proxy(tape,{get(target,key,receiver){if(key==='symI'||key==='side')reads[key]++;return Reflect.get(target,key,receiver);}});
 const traversals:object[]=[];
 for(const t of [end-10*60000,end,end+60000,end-20*60000]){
  const expected=symbols.flatMap(sym=>[1,-1].map(side=>({sym,side,evaluation:positionConfigEval(tape,t,o,sym,side)})));
  reads.symI=0;reads.side=0;
  const actual=configEval(observed,t,o);
  assert.deepEqual(actual.contexts,expected,'duplicate symbol slots, directions and backward clocks preserve exact scalar results');
  traversals.push({t,...reads});
  assert.ok(reads.symI<tape.n*3, 'all symbols must not each rescan the entire tape: '+JSON.stringify(reads));
 }
 const store=new TapeHistoryStore({cacheBytes:1});
 try{
  const saved=store.append(tape);
  for(const t of [end-10*60000,end,end-20*60000]){
   store.clearCache();
   assert.deepEqual(configEval(saved,t,o),configEval(tape,t,o),'disk reload preserves the entire scalar evaluation');
  }
 }finally{store.close();}
 for(let i=0;i<514;i++)configEval({...tape,id:'evict-'+i},end,o);
 const expectedAfterEviction=symbols.flatMap(sym=>[1,-1].map(side=>({sym,side,evaluation:positionConfigEval(tape,end,o,sym,side)})));
 reads.symI=0;reads.side=0;
 assert.deepEqual(configEval(observed,end,o).contexts,expectedAfterEviction,'bounded-cache eviction rebuilds the same contexts');
 assert.ok(reads.symI<tape.n*3,'eviction must rebuild all contexts without per-symbol rescans');
 ctx.diagnostic(JSON.stringify({n:tape.n,traversals}));
});

test('count context ownership follows replaced symbol and side columns',()=>{
 const end=Date.UTC(2026,10,16),rows:Trade[]=Array.from({length:6},(_,i)=>({
  cfg:'own',sym:'A',side:1,entryT:end-(6-i)*60000,exitT:end-(6-i)*60000+1,
  entry:100,exit:102,r:.02,mult:1,reason:'tp',kind:'normal',bars:1,mfe:0,mae:0}));
 const tape=makeTape('own','follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1},'normal',['A','B'],rows,[],[]);
 const d=defaultWalkForward(DEFAULT_SETTINGS),o={...d,rangeGate:undefined,
  gates:{...d.gates,minPf:1.05,maxDdr:0,lossPrior:false,positionWindows:{...DEFAULT_POSITION_WINDOWS,main:4,real:3,entry:2}}};
 assert.equal(positionConfigEval(tape,end,o,'A',1).ok,true);
 assert.equal(symStats(tape,'A',1,0,end).n,6);
 configEval(tape,end,o);
 tape.symI=tape.symI.map(()=>1);tape.side=tape.side.map(()=>-1);
 assert.equal(positionConfigEval(tape,end,o,'A',1).ok,false,'old ownership cannot qualify a replacement generation');
 assert.equal(positionConfigEval(tape,end,o,'B',-1).ok,true,'replacement ownership must progress');
 assert.equal(symStats(tape,'A',1,0,end).n,0);
 assert.equal(symStats(tape,'B',-1,0,end).n,6);
 assert.deepEqual(configEval(tape,end,o),configEval({...tape},end,o),'cached and fresh generations must agree');
});

test('empty count catalogs check source columns once while preserving every declared context',(ctx)=>{
 const symbols=Array.from({length:12},(_,i)=>'S'+i),d=defaultWalkForward(DEFAULT_SETTINGS);
 const tp=makeTape('own','follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1},'normal',symbols,[],[],[]);
 const reads={symI:0,side:0,r:0,exitT:0};
 const observed=new Proxy(tp,{get(target,key,receiver){if(key in reads)reads[key as keyof typeof reads]++;return Reflect.get(target,key,receiver);}});
 const detail=configEval(observed,100,d);
 assert.equal(detail.contexts?.length,24);
 const {contexts:_contexts,...summary}=detail;
 assert.deepEqual(configEvalSummary(observed,100,d),summary);
 ctx.diagnostic(JSON.stringify({reads}));
 for(const value of Object.values(reads))assert.ok(value<=10,'one tape must not recheck columns for all 24 empty contexts');
});

test('count readiness reports the complete disjoint windows used by the evaluator',()=>{
 const tp=makeTape('own','follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1},'normal',['A'],[],[],[]);
 const d=defaultWalkForward(DEFAULT_SETTINGS),block={long:20,short:10,minimal:3,shortPolarity:'positive' as const,minimalPolarity:'positive' as const};
 const o={...d,rangeGate:undefined,gates:{...d.gates,positionWindows:{...DEFAULT_POSITION_WINDOWS,blocks:{main:block,real:{...block,long:10,short:4,minimal:1}}}}};
 assert.deepEqual(sampleWindowsForTape(tp,o),{main:33,real:15,entry:12,range:0});
});
