import assert from 'node:assert/strict';
import { it } from 'node:test';
import { refreshVenueFees, type ExchangeClient } from './live.server.ts';
import type { CoreRuntime } from './runtime.server.ts';
import { DEFAULT_MODEL_FEES } from '../model-cost.ts';
import { CandleSeries } from '../market/candle-series.ts';
it('refreshes scoped account fees, includes unknown symbols and does not cap higher costs', async () => {
 const records: unknown[] = [];
 const rt = { status:{source:'bingx'}, candles:new Map([['A',[]],['B',[]]]),
   settings:{live:{connId:'bingx-vst-02'},fees:{...DEFAULT_MODEL_FEES},cost:.00176},
   db:{kvSet:(_k:string,v:unknown)=>records.push(v)},
   updateSettings(p:{cost:number}){rt.settings.cost=p.cost;},
 } as unknown as CoreRuntime;
 let calls=0; let scope='demo';
 const ex={hasKeys:()=>true, fingerprint:()=>scope, commission:async(s:string)=>{calls++;return {maker:0,taker:s==='A'?.0002:.002};}} as ExchangeClient;
 await refreshVenueFees(rt,ex,10_000_000);
 assert.ok(Math.abs(rt.settings.cost-.00176)<1e-15,'unknown B still uses fallback');
 const published=records.length;
 await refreshVenueFees(rt,ex,10_000_500); assert.equal(calls,1,'read budget');
 assert.equal(records.length,published,'unchanged cached budget does not write repeatedly');
 await refreshVenueFees(rt,ex,10_001_000);
 assert.ok(Math.abs(rt.settings.cost-.0044)<1e-15,'higher venue fees are not capped at 0.15%');
 scope='rotated';
 await refreshVenueFees(rt,ex,10_002_000);
 assert.ok(Math.abs(rt.settings.cost-.00176)<1e-15,'rotated account cannot inherit B rates');
 // A failed refresh after the last successful rate has expired must restore the
 // fallback budget, not retain the previously cheap schedule indefinitely.
 rt.settings.cost=.00044;
 ex.commission=async()=>{throw new Error('offline');};
 await refreshVenueFees(rt,ex,20_000_000);
 assert.ok(Math.abs(rt.settings.cost-.00176)<1e-15);
});

it('re-prices cached venue rates after ratio edits and universe changes without another request', async () => {
 const rt={status:{source:'bingx'},candles:new Map([['A',[]]]),
   settings:{live:{connId:'bingx-vst-02'},fees:{...DEFAULT_MODEL_FEES},cost:.00176},
   db:{kvSet(){}},updateSettings(p:{cost:number}){rt.settings.cost=p.cost;},
 } as unknown as CoreRuntime;
 let calls=0;
 const ex={hasKeys:()=>true,fingerprint:()=> 'cached',commission:async()=>{calls++;return {maker:0,taker:.0002};}} as unknown as ExchangeClient;
 await refreshVenueFees(rt,ex,10_000_000);
 assert.ok(Math.abs(rt.settings.cost-.00044)<1e-15);
 rt.settings.fees.slippageRatio=.5;
 await refreshVenueFees(rt,ex,10_000_100);
 assert.ok(Math.abs(rt.settings.cost-.0006)<1e-15);
 rt.candles.set('B',CandleSeries.fromCandles([]));
 await refreshVenueFees(rt,ex,10_000_200);
 assert.ok(Math.abs(rt.settings.cost-.0024)<1e-15,'new unknown symbol participates immediately');
 rt.candles.delete('B');
 await refreshVenueFees(rt,ex,10_000_300);
 assert.ok(Math.abs(rt.settings.cost-.0006)<1e-15,'removed symbol stops setting the budget');
 assert.equal(calls,1);
});

it('manual fee mode makes no account request and an in-flight auto read cannot overwrite it',async()=>{
 const rt={status:{source:'bingx'},candles:new Map([['A',[]]]),
  settings:{live:{connId:'bingx-vst-02'},fees:{...DEFAULT_MODEL_FEES,mode:'manual'},cost:.0031},
  db:{kvSet(){}},updateSettings(p:{cost:number}){rt.settings.cost=p.cost;},
 } as unknown as CoreRuntime;
 let calls=0, finish!:(v:{maker:number;taker:number})=>void;
 const ex={hasKeys:()=>true,fingerprint:()=> 'mode-test',commission:async()=>{calls++;return await new Promise(r=>{finish=r;});}} as unknown as ExchangeClient;
 await refreshVenueFees(rt,ex,10_000_000);assert.equal(calls,0);assert.equal(rt.settings.cost,.0031);
 rt.settings.fees.mode='auto';const pending=refreshVenueFees(rt,ex,10_001_000);
 rt.settings.fees.mode='manual';rt.settings.fees.entry='maker';rt.settings.fees.exit='maker';
 rt.settings.cost=.0011;
 await refreshVenueFees(rt,ex,10_001_001);assert.equal(rt.settings.cost,.0011);
 finish({maker:0,taker:.002});await pending;assert.equal(rt.settings.cost,.0011);
});
