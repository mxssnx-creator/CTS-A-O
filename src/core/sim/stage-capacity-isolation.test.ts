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
test("a duplicate stage-only event is processed once and cannot become funded",()=>{
  const ind="sig-stage-duplicate-s@m1",sym="A-USDT",duplicate=row(ind,sym,start+M,0);
  const tp=tape(ind,sym,[],[duplicate,{...duplicate}]);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,symGate:"off" as const,rangeGate:undefined,signalRank:undefined,
    signalBasePassed:new Set([`follow|${ind}`]),signalActive:new Set<string>(),signalOwnBase:true,
    signalGuardN:0,signalAccept:undefined,signalCluster:undefined,
    toggles:{...d.toggles,normal:true,block:false,blockActive:false},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:1,realN:1}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[tp],o);
  assert.equal(result.processedStages!.sets[0].stages.postBase.closedOrders,1);
  assert.equal(result.trades.length,0);
});
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

test("a cold engine research order cannot consume another config's funded slot",()=>{
  const a="ema-9-21@m1",b="rsi-mom-14-20@m1",sa="A-USDT",sb="B-USDT";
  const history=(ind:string,sym:string)=>Array.from({length:15},(_,i)=>row(ind,sym,start-(60-i*2)*M,1));
  const ta=tape(a,sa,history(a,sa),[row(a,sa,start+M,50)]);
  const tb=tape(b,sb,history(b,sb),Array.from({length:8},(_,i)=>row(b,sb,start+(2+i*2)*M,1)));
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,wideEnabled:true,mode:"fixed" as const,seatSet:"validated" as const,
    preH:12,longH:12,simH:1,startT:start,stepH:1,preGate:false,normalBaseMinPf:0,
    portfolio:0,maxOpen:1,maxPerSymbol:0,maxPositions:0,symGate:"off" as const,sideGateN:0,lastN:0,validLastN:12,
    gates:{...d.gates,minTrades:9,minPf:1.05,lastNFloor:9,
      positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12}},
    basePassed:new Set([`follow|${a}`,`follow|${b}`]),rangeGate:undefined,signalRank:undefined,
    toggles:{...d.toggles,normal:true,trailing:false,block:false,blockActive:false,dca:false,axis:false},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[ta,tb],o);
  const own=result.processedStages!.sets.find(x=>x.identity.baseConfigId===tb.id);
  assert.ok(own,"the independent config must acquire its own modeled stage history");
  assert.equal(own.stages.postBase.closedOrders,8);
  assert.ok(result.trades.some(t=>t.cfg===tb.id),"a cold research position cannot occupy the funded cap");
  assert.ok(result.trades.every(t=>t.cfg!==ta.id));
});

test("a real modeled position retains the funded cap while a sibling keeps its own research history",()=>{
  const a="ema-9-21@m1",b="rsi-mom-14-20@m1",sa="A-USDT",sb="B-USDT";
  const history=(ind:string,sym:string)=>Array.from({length:15},(_,i)=>row(ind,sym,start-(60-i*2)*M,1));
  const ta=tape(a,sa,history(a,sa),[1,3,5,7,12].map(i=>row(a,sa,start+i*M,i===12?20:1)));
  const tb=tape(b,sb,history(b,sb),[2,4,6,8,13].map(i=>row(b,sb,start+i*M,1)));
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,wideEnabled:true,mode:"fixed" as const,seatSet:"validated" as const,
    preH:12,longH:12,simH:1,startT:start,stepH:1,preGate:false,normalBaseMinPf:0,
    portfolio:0,maxOpen:1,maxPerSymbol:0,maxPositions:0,symGate:"off" as const,sideGateN:0,lastN:0,validLastN:12,
    gates:{...d.gates,minTrades:9,minPf:1.05,lastNFloor:9,
      positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12}},
    basePassed:new Set([`follow|${a}`,`follow|${b}`]),rangeGate:undefined,signalRank:undefined,
    toggles:{...d.toggles,normal:true,trailing:false,block:false,blockActive:false,dca:false,axis:false},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[ta,tb],o);
  assert.ok(result.trades.some(t=>t.cfg===ta.id&&t.entryT===start+12*M));
  assert.ok(!result.trades.some(t=>t.cfg===tb.id&&t.entryT===start+13*M),"a funded cap is never bypassed");
  assert.equal(result.skips.maxOpen,1);
  const own=result.processedStages!.sets.find(x=>x.identity.baseConfigId===tb.id);
  assert.equal(own?.stages.postBase.closedOrders,5,"funded-cap competition does not discard model-only observations");
});

test("an opposite cold research position cannot conflict with a funded engine entry",()=>{
  const a="ema-9-21@m1",b="rsi-mom-14-20@m1",sym="A-USDT";
  const sideRow=(ind:string,side:1|-1,entryT:number,hold:number):Trade=>({
    ...row(ind,sym,entryT,hold),side,exit:100*(1+side*.02),
  });
  const history=(ind:string,side:1|-1)=>Array.from({length:15},(_,i)=>sideRow(ind,side,start-(60-i*2)*M,1));
  const ta=tape(a,sym,history(a,1),[sideRow(a,1,start+9*M,20)]);
  const tb=tape(b,sym,history(b,-1),[1,3,5,7,10].map(i=>sideRow(b,-1,start+i*M,1)));
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,wideEnabled:true,mode:"fixed" as const,seatSet:"validated" as const,
    preH:12,longH:12,simH:1,startT:start,stepH:1,preGate:false,normalBaseMinPf:0,
    portfolio:0,maxOpen:0,maxPositions:0,symGate:"off" as const,sideGateN:0,lastN:0,validLastN:12,
    gates:{...d.gates,minTrades:9,minPf:1.05,lastNFloor:9,
      positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12}},
    basePassed:new Set([`follow|${a}`,`follow|${b}`]),rangeGate:undefined,signalRank:undefined,
    toggles:{...d.toggles,normal:true,trailing:false,block:false,blockActive:false,dca:false,axis:false},
    coord:{...d.coord!,enabled:true,conflict:true,confirm:false,hourLock:0,cooldown:"off" as const},
    engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[ta,tb],o);
  assert.ok(result.trades.some(t=>t.cfg===tb.id&&t.entryT===start+10*M),
    "a non-funded opposite research position cannot block a mature funded entry");
  assert.ok(!result.trades.some(t=>t.cfg===ta.id));
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
