import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { DEFAULT_POSITION_WINDOWS } from "../position-windows.ts";
import { signalSettings } from "../signal-config.ts";
import type { Trade } from "../domain/types.ts";
import { activeSignalsAt, defaultWalkForward, makeTape, signalIndex, SignalActivationBook,
  positionConfigEval, summarizeSignalValidationGen, type ConfigTape, type ValidationSummary, type WalkForwardOptions } from "./walkforward.ts";
import { emptyValidatedSetPf } from "../validated-set-pf.ts";
import { signalActiveHas } from "../signals.ts";
import { TapeHistoryStore } from "../server/history-store.server.ts";
import { truncateSync } from "node:fs";
import { setImmediate } from "node:timers/promises";

const M=60_000, start=Date.UTC(2026,10,15), symbols=Array.from({length:12},(_,i)=>`S${i}-USDT`);
function drain<T>(g:Generator<number,T>):T{for(;;){const r=g.next();if(r.done)return r.value}}
function tape(index:number,fast=false):ConfigTape{
 const ind=index===2?'sig-coord-count-fixture@m5':`sig-count-${index}-s@m5`,id=`follow|${ind}|tp1|sl1|tr0|h24`;
 const rows:Trade[]=[];
 const add=(sym:string,side:1|-1,exitT:number,r:number)=>rows.push({cfg:id,sym,side,entryT:exitT-1,exitT,r,mult:1,entry:100,exit:100*(1+side*r),reason:r>0?'tp':'sl',bars:1,mfe:0,mae:0,kind:'normal'});
 for(let k=0;k<12;k++)for(const sym of symbols)for(const side of [1,-1]as const)
  add(sym,side,start-(12-k)*M,k%4===0?-.001:.02);
 for(let k=0;k<40;k++)for(const sym of symbols)for(const side of [1,-1]as const){
  const t=start+(fast?k+1:40+k)*M;
  add(sym,side,t,(k+index+(side===1?0:2))%7===0?-.03:.02);
 }
 return makeTape(id,'follow',ind,{tp:.01,sl:.01,trail:0,hold:24},'normal',symbols,rows,[],[]);
}
function fixture(){
 const tapes=[tape(0),tape(1,true),tape(2)];
 const sig=signalSettings({enabled:true,count:0,rank:'net',validate:false,
  coordination:{...DEFAULT_SETTINGS.signals.coordination,enabled:true,count:0}});
 const base=defaultWalkForward(DEFAULT_SETTINGS);
 const options:WalkForwardOptions={...base,mode:'fixed',rangeGate:undefined,signalRank:sig,
  gates:{...base.gates,minPf:1.05,minGreen:0,maxDdr:0,lossPrior:false,
   positionWindows:{...DEFAULT_POSITION_WINDOWS,base:4,main:4,real:3,entry:2,byRange:{},byConfig:{},blocks:undefined}}};
 return{tapes,sig,options,policy:options.gates.positionWindows!};
}

test('Signal readiness prefilter matches scalar exact-context evaluation at the close boundary',()=>{
 const {tapes,sig,options,policy}=fixture();
 policy.main=15;policy.real=12;policy.entry=12;
 const checks=[start,start+2*M+1,start+3*M,start+3*M+1,start+4*M+1];
 for(const t of checks){
  const active=activeSignalsAt(tapes,t,sig,150,options);
  for(const tp of tapes)for(const sym of symbols)for(const side of [1,-1] as const){
   const expected=positionConfigEval(tp,t,options,sym,side).ok;
   assert.equal(signalActiveHas(active,tp.bot,tp.ind,sym,side,tp.kind,tp.id),expected,
    `${tp.id} ${sym} ${side} at ${t}`);
  }
 }
 const before=activeSignalsAt(tapes,start+3*M,sig,150,options);
 const after=activeSignalsAt(tapes,start+3*M+1,sig,150,options);
 assert.equal(before.size,0,'a close at the decision clock is not available');
 assert.ok(after.size>0,'a mature positive context qualifies immediately after its own close');
});

test('whole-tape count bound follows policy changes, replacement histories and storage corruption',()=>{
 const {tapes,sig,options,policy}=fixture(),original=tapes[0],rows:Trade[]=[];
 for(let i=0;i<12;i++){
  const exitT=start-(12-i)*M,r=i%4===0?-.001:.02;
  rows.push({cfg:original.id,sym:symbols[0],side:1,entryT:exitT-1,exitT,r,mult:1,
   entry:100,exit:101,reason:'time',bars:1,mfe:0,mae:0,kind:'normal'});
 }
 const make=(n:number)=>makeTape(original.id,original.bot,original.ind,original.protect,original.kind,
  symbols,rows.slice(0,n),[],[]);
 const sparse=make(6);policy.main=8;policy.real=4;policy.entry=2;
 const book=new SignalActivationBook(signalIndex([sparse]),sig,150,options);
 const check=()=>assert.deepEqual([...drain(book.at(start))],[...activeSignalsAt([sparse],start,sig,150,options)]);
 check();assert.equal(drain(book.at(start)).size,0);
 policy.main=4;check();assert.ok(drain(book.at(start)).size>0,'a shorter explicit window can become mature');
 policy.main=8;check();Object.assign(sparse,make(10));check();
 assert.ok(drain(book.at(start)).size>0,'a replacement history can mature at the same clock');
 const store=new TapeHistoryStore({cacheBytes:1});
 try{
  const saved=store.append(make(6)),storedBook=new SignalActivationBook(signalIndex([saved]),sig,150,options);
  assert.equal(drain(storedBook.at(start)).size,0);
  store.clearCache();truncateSync(store.path,0);
  assert.throws(()=>drain(storedBook.at(start)),/history/i,'sparse rejection must not hide corrupted storage');
 }finally{store.close()}
});

test('sealed replay compaction preserves exact decisions and invalidates changed storage',()=>{
 const {tapes,sig,options,policy}=fixture(),source=tapes[0];
 const rows:Trade[]=Array.from({length:3},(_,i)=>({cfg:source.id,sym:symbols[0],side:1 as const,
  entryT:start-(3-i)*M-1,exitT:start-(3-i)*M,r:.02,mult:1,entry:100,exit:102,
  reason:'tp' as const,bars:1,mfe:0,mae:0,kind:'normal' as const}));
 const sparse=makeTape(source.id,source.bot,source.ind,source.protect,source.kind,symbols,rows,[],[]);
 const store=new TapeHistoryStore({cacheBytes:1});
 try{
  const saved=store.append(sparse),all=[saved,tapes[1],tapes[2]];
  const sealed=new SignalActivationBook(signalIndex(all),sig,150,options,true);
  for(const t of [start,start+M,start+M+1,start+30*M,start])
   assert.deepEqual([...drain(sealed.at(t))],[...activeSignalsAt(all,t,sig,150,options)]);
  policy.main=2;policy.real=2;policy.entry=2;
  assert.deepEqual([...drain(sealed.at(start))],[...activeSignalsAt(all,start,sig,150,options)]);
  assert.ok(drain(sealed.at(start)).size>0,'changed count policy rebuilds the compact index');
  policy.main=4;
  drain(sealed.at(start));store.clearCache();truncateSync(store.path,0);
  assert.throws(()=>drain(sealed.at(start)),/history/i,'a compacted rejection cannot hide invalidated storage');
 }finally{store.close()}
});

test('sparse Signal summary uses the same passing sets and failure counts as detailed evaluation',()=>{
 const {tapes,options}=fixture(),source=tapes[0];
 const sparse=makeTape(source.id,source.bot,source.ind,source.protect,source.kind,symbols,[],[],[]);
 const own=[sparse,tapes[1],tapes[2]];
 const empty=():ValidationSummary=>({evaluated:0,passed:0,closes:0,gp:0,gl:0,failures:{},setPf:emptyValidatedSetPf()});
 for(const t of [start,start+M,start+20*M,start+40*M+1]){
  const fast=empty(),detailed=empty();
  drain(summarizeSignalValidationGen(own,t,options,fast));
  drain(summarizeSignalValidationGen(own,t,options,detailed,[]));
  assert.deepEqual(fast,detailed);
 }
});

test('persistent Signal progress excludes missing Base provenance',()=>{
 const {tapes,options}=fixture();
 const empty=():ValidationSummary=>({evaluated:0,passed:0,closes:0,gp:0,gl:0,failures:{},setPf:emptyValidatedSetPf()});
 const summary=empty();
 drain(summarizeSignalValidationGen(tapes,start,{...options,processedStages:{validationN:12,realN:12},signalBasePassed:undefined},summary));
 assert.equal(summary.evaluated,0);
 const proven=empty();
 drain(summarizeSignalValidationGen(tapes,start,{...options,processedStages:{validationN:12,realN:12},signalBasePassed:new Set([`${tapes[0].bot}|${tapes[0].ind}`])},proven));
 assert.equal(proven.evaluated,1);
});

test('count activation does not reopen unaffected histories after another config settles',(ctx)=>{
 const {tapes,sig,options}=fixture(),reads={exitT:0,r:0,symI:0,side:0};
 const observed=new Proxy(tapes[0],{get(target,key,receiver){if(key in reads)reads[key as keyof typeof reads]++;return Reflect.get(target,key,receiver)}});
 const book=new SignalActivationBook(signalIndex([observed,...tapes.slice(1)]),sig,150,options);
 assert.deepEqual([...drain(book.at(start))],[...activeSignalsAt(tapes,start,sig,150,options)]);
 for(const key of Object.keys(reads)as Array<keyof typeof reads>)reads[key]=0;
 for(let minute=1;minute<=20;minute++){
  const t=start+minute*M+1;
  assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt(tapes,t,sig,150,options)],`minute ${minute}`);
 }
 ctx.diagnostic(JSON.stringify({unaffectedTapeReads:reads}));
 assert.ok(reads.exitT<100&&reads.r<100,'unchanged own Last-N windows must not rematerialize columns: '+JSON.stringify(reads));
});

test('count activation matches scalar ranking at strict boundaries, reverse clocks and mutable policies',()=>{
 const {tapes,sig,options,policy}=fixture();
 const book=new SignalActivationBook(signalIndex(tapes),sig,150,options);
 const check=(t:number)=>assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt(tapes,t,sig,150,options)]);
 for(const t of [start,start+M,start+M+1,start+20*M,start+40*M,start+40*M+1,start+41*M+1,start])check(t);
 const t=start+20*M+1;check(t);
 options.gates.minPf=1000;check(t);options.gates.minPf=1.05;check(t);
 policy.main=50;check(t);policy.main=4;check(t);
 options.mode='durable';options.durableSplits=4;options.durableFrac=1;check(t);
 options.mode='fixed';check(t);
 tapes[0].heldOnly=true;check(t);tapes[0].heldOnly=false;check(t);
 tapes[0].carried=true;check(t);tapes[0].carried=false;check(t);
 sig.count=1;sig.coordination.count=1;check(t);sig.count=0;sig.coordination.count=0;check(t);
 options.signalActive=new Set(['follow|sig-exit-fixture@m5|S0-USDT|1|exit|cfg=own-exit']);check(t);
 options.signalActive=new Set();check(t);
 const returns=tapes[0].r;tapes[0].r=returns.map(()=>-.01);check(t);tapes[0].r=returns;check(t);
 options.gates.positionWindows=null;check(t);options.gates.positionWindows=policy;check(t);
});

test('stored count histories preserve scalar decisions across explicit reload, cache budgets and cancellation',()=>{
 const {tapes,sig,options}=fixture(),store=new TapeHistoryStore({cacheBytes:1});
 try{
  const saved=tapes.map(tp=>store.append(tp));
  const book=new SignalActivationBook(signalIndex(saved),sig,150,options);
  const budget=book as unknown as {countLimit:number;countBytes:number;countRows:Map<object,{bytes:number}>;countEmpty?:{bytes:number}};
  budget.countLimit=30_000;
  for(const t of [start,start+M+1,start+40*M,start+40*M+1,start]){
   store.clearCache();
   assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt(tapes,t,sig,150,options)]);
   assert.ok(budget.countBytes<=budget.countLimit);
   assert.equal(budget.countBytes,(budget.countEmpty?.bytes??0)+[...budget.countRows.values()].reduce((n,r)=>n+r.bytes,0));
   assert.ok(budget.countRows.size>0&&budget.countRows.size<tapes.length,'exercise a retained bounded working set');
  }
  budget.countLimit=1;
  for(const t of [start+2*M,start+41*M+1])
   assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt(tapes,t,sig,150,options)]);
  const attempt=book.at(start+5*M);attempt.next();attempt.return(new Set());
  assert.deepEqual([...drain(book.at(start))],[...activeSignalsAt(tapes,start,sig,150,options)]);
  store.close();assert.throws(()=>drain(book.at(start)),/closed/i,'a cached verdict cannot outlive its store');
 }finally{store.close()}
});

test('compact stored rejections avoid reopening a catalog beyond the former 512-tape derived cache',(ctx)=>{
 const {tapes,sig,options}=fixture(),store=new TapeHistoryStore({cacheBytes:1});
 try{
  const losers=Array.from({length:550},(_,i)=>{
   const source=tape(i+10),r=source.r.map(()=>-.01);
   return {...source,r};
  });
  // Repack modified known-unit fixtures before using the strict immutable history layout.
  const plain=losers.map(tp=>makeTape(tp.id,tp.bot,tp.ind,tp.protect,tp.kind,tp.syms,
   Array.from({length:tp.n},(_,i)=>({cfg:tp.id,sym:tp.syms[tp.symI[i]],side:tp.side[i]as 1|-1,
    entryT:tp.entryT[i],exitT:tp.exitT[i],entry:100,exit:100,r:-.01,mult:1,reason:'sl' as const,bars:1,mfe:0,mae:0})),[],[]));
  const saved=plain.map(tp=>store.append(tp)),book=new SignalActivationBook(signalIndex([...saved,tapes[1]]),sig,150,options);
  (book as unknown as{countLimit:number}).countLimit=1024*1024;
  drain(book.at(start));const before=store.stats.reads;
  for(const t of [start+M+1,start+2*M+1,start+20*M+1])
   assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt([...plain,tapes[1]],t,sig,150,options)]);
  const reads=store.stats.reads-before;ctx.diagnostic(JSON.stringify({storedTapeCount:saved.length,reloadsAfterWarmup:reads}));
  assert.equal(reads,0,'unaffected rejected stored tapes retain no decompressed arena and need no reread');
  store.clearCache();truncateSync(store.path,0);
  assert.throws(()=>drain(book.at(start+20*M+1)),/history/i,'explicit invalidation cannot mask damaged immutable storage');
 }finally{store.close()}
});

test('unregistered getter histories stay scalar when their returned columns change',()=>{
 const {tapes,sig,options}=fixture(),source=tapes[0];let returns=source.r;
 const lazy={...source};Object.defineProperty(lazy,'r',{enumerable:true,get:()=>returns});
 const book=new SignalActivationBook(signalIndex([lazy]),sig,150,options);
 const check=()=>assert.deepEqual([...drain(book.at(start))],[...activeSignalsAt([lazy],start,sig,150,options)]);
 check();returns=returns.map(()=>-.01);check();returns=source.r;check();
});

test('count summary caches cannot pin an evicted decompressed history arena',async()=>{
 const {tapes,sig,options}=fixture(),store=new TapeHistoryStore({cacheBytes:1});
 try{
  const saved=store.append(tapes[0]),book=new SignalActivationBook(signalIndex([saved]),sig,150,options);
  drain(book.at(start));const buffer=new WeakRef(saved.exitT.buffer);
  store.clearCache();
  assert.equal(typeof globalThis.gc,'function');
  for(let i=0;i<8;i++){await setImmediate();globalThis.gc!()}
  assert.equal(buffer.deref()===undefined,true,'cached scalar rows must not retain binary arenas');
  assert.deepEqual([...drain(book.at(start))],[...activeSignalsAt([tapes[0]],start,sig,150,options)]);
 }finally{store.close()}
});

test('insufficient own samples wake at the exact required close without consulting future returns',()=>{
 const {tapes,sig,options}=fixture(),source=tapes[0],store=new TapeHistoryStore({cacheBytes:1});
 const rows:Trade[]=[];
 for(const sym of symbols)for(const side of [1,-1]as const)for(let i=0;i<6;i++){
  const exitT=i<2?start-(2-i)*M:start+(i-1)*M;
  rows.push({cfg:source.id,sym,side,entryT:exitT-1,exitT,r:i===5?-.5:.02,mult:1,
   entry:100,exit:101,reason:'time',bars:1,mfe:0,mae:0,kind:'normal'});
 }
 const plain=makeTape(source.id,source.bot,source.ind,source.protect,source.kind,symbols,rows,[],[]);
 try{
  const saved=store.append(plain),other=store.append(tapes[1]),book=new SignalActivationBook(signalIndex([saved]),sig,150,options);
  const check=(t:number)=>{
   void other.r; // Evict the working item without invalidating its immutable generation.
   const before=store.stats.reads;
   assert.deepEqual([...drain(book.at(t))],[...activeSignalsAt([plain],t,sig,150,options)]);
   return store.stats.reads-before;
  };
  check(start);
  assert.equal(check(start+1)+check(start+M)+check(start+M+1),0,'the third own close cannot complete a four-close sample');
  assert.equal(check(start+2*M),0,'the fourth close at t remains excluded');
  assert.ok(check(start+2*M+1)>0,'qualify immediately after the fourth own close');
  check(start+4*M+1);check(start);
 }finally{store.close()}
});
