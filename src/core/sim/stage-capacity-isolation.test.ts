import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";
import { defaultWalkForward, makeTape, walkForward } from "./walkforward.ts";

const H=3_600_000,M=60_000,start=Date.UTC(2026,10,16);
const protect={tp:.01,sl:.01,trail:0,hold:60};
function tape(ind:string,sym:string,history:Trade[],future:Trade[]){
  const id=`follow|${ind}|tp1|sl1|tr0|h60`;
  return makeTape(id,"follow",ind,protect,"normal",[sym],[...history,...future],[],[]);
}
function row(ind:string,sym:string,entryT:number,hold:number):Trade{
  return {cfg:`follow|${ind}|tp1|sl1|tr0|h60`,sym,side:1,entryT,exitT:entryT+hold*M,
    entry:100,exit:102,r:.02,mult:1,kind:"normal",reason:"tp",bars:hold,mfe:0,mae:0};
}
test("an unselected stage-only order cannot consume a funded Signal slot",()=>{
  const a="sig-stage-shadow-s@m1",b="sig-stage-active-s@m1",sa="A-USDT",sb="B-USDT";
  const history=(ind:string,sym:string)=>Array.from({length:15},(_,i)=>row(ind,sym,start-(30-i*2)*M,1));
  const ta=tape(a,sa,history(a,sa),[row(a,sa,start+M,50)]);
  const tb=tape(b,sb,history(b,sb),Array.from({length:8},(_,i)=>row(b,sb,start+(2+i*2)*M,1)));
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,signalMaxOpen:1,signalMaxPositions:0,signalPerSymbol:0,symGate:"off" as const,
    rangeGate:undefined,signalRank:undefined,signalOwnBase:true,signalGuardN:0,signalAccept:undefined,signalCluster:undefined,
    signalBasePassed:new Set([`follow|${a}`,`follow|${b}`]),
    signalActive:new Set([sigActiveKey("follow",b,sb,1,"normal",tb.id)]),
    toggles:{...d.toggles,normal:true,block:false,blockActive:false},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[ta,tb],o);
  const own=result.processedStages!.sets.find(x=>x.identity.baseConfigId===tb.id);
  assert.ok(own,'the independent active set must collect samples');
  assert.equal(own.stages.postBase.closedOrders,8);
  assert.ok(own.stages.active.openedOrders>0,'the mature set must reach execution');
  assert.ok(result.trades.length>0);
  assert.ok(result.trades.every(t=>t.cfg===tb.id),'unselected research never becomes funded');
});

test("a funded opposite position still enforces conflict without lending its result to the other set",()=>{
  const a="sig-funded-opponent-s@m1",b="sig-rejected-entry-s@m1",sym="A-USDT";
  const rowSide=(ind:string,side:1|-1,entryT:number,hold:number):Trade=>({
    cfg:`follow|${ind}|tp1|sl1|tr0|h60`,sym,side,entryT,exitT:entryT+hold*M,
    entry:100,exit:100*(1+side*.02),r:.02,mult:1,kind:"normal",reason:"tp",bars:hold,mfe:0,mae:0});
  const history=(ind:string,side:1|-1)=>Array.from({length:40},(_,i)=>rowSide(ind,side,start-(80-i*2)*M,1));
  const futureA=[1,3,5,7].map(i=>rowSide(a,1,start+i*M,1)).concat(rowSide(a,1,start+9*M,20));
  const futureB=[rowSide(b,-1,start+10*M,1)];
  const ta=tape(a,sym,history(a,1),futureA),tb=tape(b,sym,history(b,-1),futureB);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,signalMaxOpen:0,signalMaxPositions:0,signalPerSymbol:0,symGate:"off" as const,
    rangeGate:undefined,signalRank:undefined,signalOwnBase:true,signalGuardN:0,signalAccept:undefined,signalCluster:undefined,
    signalBasePassed:new Set([`follow|${a}`,`follow|${b}`]),
    signalActive:new Set([sigActiveKey("follow",a,sym,1,"normal",ta.id),sigActiveKey("follow",b,sym,-1,"normal",tb.id)]),
    toggles:{...d.toggles,normal:true,block:false,blockActive:false},
    coord:{...d.coord!,enabled:true,conflict:true,confirm:false,hourLock:0,cooldown:"off" as const},
    engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[ta,tb],o);
  assert.ok(result.trades.some(t=>t.cfg===ta.id && t.entryT===start+9*M), 'the opponent is actually funded');
  assert.equal(result.skips['sig:conflict'],1);
  assert.ok(!result.processedStages!.sets.some(x=>x.identity.baseConfigId===tb.id), 'a funded conflict supplies no stage sample');
  assert.ok(result.trades.every(t=>t.cfg!==tb.id));
});
