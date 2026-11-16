import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {OpenPosition,Trade} from '../domain/types.ts';
import {makeTape,scheduledEngineEntriesGen,signalEntryQueueGen,tradeAt,type ConfigTape} from './walkforward.ts';
import {TapeHistoryStore} from '../server/history-store.server.ts';

const M=60000,H=60*M,start=Date.UTC(2026,10,16),stop=start+3*H;
const drain=<T>(g:Generator<number,T>):T=>{for(;;){const r=g.next();if(r.done)return r.value;}};
function fixture(id:string,kind:'normal'|'axis') {
 const rows:Trade[]=[];
 for(let m=0;m<180;m++)for(const [sym,side] of [['A',1],['B',-1]] as const){
  const r=m%3?-.002:.006,entryT=start+m*M;
  rows.push({cfg:id,sym,side,entryT,exitT:entryT+(m%5+1)*M,entry:100,exit:100*(1+side*r),
   r,mult:1,kind,reason:'time',bars:1,mfe:0,mae:0});
 }
 const open:OpenPosition[]=[59,60,119,120,179].map(m=>({cfg:id,sym:'A',side:1,entryT:start+m*M+1,
  entryI:m,entry:100,stop:99,target:102,peak:100,trailOn:false,mtm:-.003}));
 return makeTape(id,'follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1},kind,['A','B'],rows,open,[]);
}

test('unselected histories advance once within a frozen selection step and preserve later reactivation',ctx=>{
 const original=[fixture('first','normal'),fixture('second','axis')];let reads=0;
 const tapes=original.map(tp=>new Proxy(tp,{get(target,key,receiver){if(key==='entryT')reads++;return Reflect.get(target,key,receiver);}}));
 const queue=drain(signalEntryQueueGen(tapes,start,stop,true));reads=0;
 const actual:Trade[]=[];let firstHourReads=0;
 for(let minute=0;minute<180;minute++){
  const hour=Math.floor(minute/60),selected=new Set(hour===0?[]:hour===1?['first']:['second']);
  const rows=drain(scheduledEngineEntriesGen(queue,start+(minute+1)*M,selected,stop,start+(hour+1)*H));
  assert.ok(rows.every(x=>x.tr.entryT>=start+minute*M&&x.tr.entryT<start+(minute+1)*M),'newly selected configs cannot replay skipped old entries');
  actual.push(...rows.map(x=>x.tr));if(minute===59)firstHourReads=reads;
 }
 const closed=actual.filter(x=>!x.markedOpen),expected:Trade[]=[];
 for(const [i,tp] of original.entries())for(let j=0;j<tp.n;j++){
  const tr=tradeAt(tp,j);if(tr.entryT>=start+(i+1)*H&&tr.entryT<start+(i+2)*H)expected.push(tr);
 }
 const key=(t:Trade)=>JSON.stringify([t.cfg,t.sym,t.side,t.entryT,t.exitT,t.r]);
 assert.deepEqual(closed.map(key).sort(),expected.map(key).sort());
 assert.ok(closed.some(x=>x.r<0),'accepted losses remain in evidence');
 assert.deepEqual(actual.filter(x=>x.markedOpen).map(x=>[x.cfg,x.entryT]).sort(),
  [['first',start+60*M+1],['first',start+119*M+1],['second',start+120*M+1],['second',start+179*M+1]].sort());
 assert.equal(queue.size,0);
 assert.ok(firstHourReads<=4,`a fully unselected hour must not reopen histories each minute: ${firstHourReads}`);
 ctx.diagnostic(JSON.stringify({firstHourReads,totalEntryColumnReads:reads,closed:closed.length,open:actual.length-closed.length}));
});

test('stored-history scheduling preserves full selected rows with a tiny evicting cache',()=>{
 const source=[fixture('first','normal'),fixture('second','axis')],store=new TapeHistoryStore({cacheBytes:1});
 const run=(tapes:ConfigTape[])=>{
  const queue=drain(signalEntryQueueGen(tapes,start,stop,false)),out:Trade[]=[];
  for(let m=0;m<180;m++){
   const hour=Math.floor(m/60),selected=new Set(hour===1?['second']:['first']);
   store.clearCache();
   out.push(...drain(scheduledEngineEntriesGen(queue,start+(m+1)*M,selected,stop,start+(hour+1)*H)).map(x=>x.tr));
  }
  return out;
 };
 try{assert.deepEqual(run(source.map(t=>store.append(t))),run(source));}finally{store.close();}
});
