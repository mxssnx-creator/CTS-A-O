import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, freshEntry, makeTape, packTapes, seatedForEntry, tradeAt, walkForward, type WalkForwardOptions, type WalkForwardResult } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { TapeHistoryStore } from "../server/history-store.server.ts";
import { ProcessedSetBook } from "./processed-set.ts";
import { retireOwnedIdleWorkers, runOnWorkers } from "../server/pool.server.ts";
const H=3600000,M=60000,end=Date.UTC(2026,9,16,12),start=end-6*H;
const cfg="follow|rsi-mom-14-20@m1|tp1|sl1|tr0|h32";
function tape(loss=false) {
  const row=(entryT:number):Trade=>({cfg,sym:"A",side:1,entryT,exitT:entryT+10*M,entry:100,exit:101,r:loss?-.01:.01,mult:1,reason:"tp",bars:1,mfe:.02,mae:.01,kind:"normal"});
  return makeTape(cfg,"follow","rsi-mom-14-20@m1",{tp:.01,sl:.01,trail:0,hold:32},"normal",["A"],
    [...Array.from({length:11},(_,i)=>row(start-(12-i)*20*M)),...Array.from({length:18},(_,i)=>row(start+20*M+i*20*M))],[],[]);
}
function options():WalkForwardOptions {
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  return {...d,mode:"fixed",seatSet:"validated",preH:12,longH:12,simH:6,stepH:1,
    robustFrac:0,preGate:false,normalBaseMinPf:0,symGate:"off",sideGateN:0,lastN:0,validLastN:12,
    gates:{...d.gates,minTrades:12,minPf:1.05,positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12}},
    toggles:{normal:true,trailing:false,block:false,blockActive:false,dca:false,dcaActive:false,axis:false},
    coord:{enabled:false,hourLock:0,cooldown:"off",conflict:false,confirm:false}};
}
const u={bars:[],caches:[],startT:start-12*H,endT:end,splitT:start,nowT:end,baseTf:1} as never;
it("a Base-qualified config with initially insufficient own closes is re-evaluated causally after later settlements",()=>{
  const sim=walkForward(u,[tape()],{...options(),recordValidation:"summary"});
  assert.equal(sim.steps[0].real.length,0,"eleven own positions cannot satisfy Last-12 at run start");
  assert.ok(sim.steps.slice(1).some(s=>s.real.includes(cfg)),"later complete own history must be evaluated rather than frozen out forever");
  assert.equal(sim.steps[0].validationSummary?.evaluated,1,"the rejected initial context remains in the declared denominator");
  assert.equal(sim.steps[0].validationSummary?.passed,0);
  assert.equal(sim.steps[1].validationSummary?.evaluated,1);
  assert.equal(sim.steps[1].validationSummary?.passed,1);
  assert.ok(sim.trades.length>0);
  assert.ok(sim.trades.every(t=>t.entryT>=start+40*M),"future closes cannot qualify an earlier entry");
  assert.ok(sim.validated?.includes(cfg),"the reported union includes every config validated at an actual causal clock");
});
it("losing configs and an explicitly frozen empty validation snapshot remain ineligible",()=>{
  assert.equal(walkForward(u,[tape(true)],options()).trades.length,0);
  assert.equal(walkForward(u,[tape()],{...options(),validated:new Set()}).trades.length,0);
});
it("a newly qualified own history can enter before the next reporting hour",()=>{
  const sim=walkForward(u,[tape()],options());
  assert.equal(sim.trades.some(t=>t.entryT===start+20*M),false,"eleven prior closes cannot qualify the first candidate");
  assert.equal(sim.trades.some(t=>t.entryT===start+40*M),true,
    "the close at minute 30 completes Last-12, so the minute-40 candidate must not wait for the next hour");
  assert.deepEqual(sim.steps[0].continuousReal,[{id:cfg,at:start+40*M}],"the report retains the actual decision clock");
});
it("a same-time close and an opposite side cannot qualify a new context",()=>{
  const original=tape(),rows=Array.from({length:original.n},(_,i)=>tradeAt(original,i));
  const candidate=(entryT:number,side:1|-1):Trade=>({cfg,sym:"A",side,entryT,exitT:entryT+M,
    entry:100,exit:101,r:.01,mult:1,reason:"tp",bars:1,mfe:0,mae:0,kind:"normal"});
  rows.push(candidate(start+30*M,1),candidate(start+30*M+.5,1),candidate(start+31*M,-1));
  const next=makeTape(cfg,original.bot,original.ind,original.protect,original.kind,["A"],rows,[],[]);
  const sim=walkForward(u,[next],options());
  assert.equal(sim.trades.some(t=>t.entryT===start+30*M),false,"the just-closing twelfth result is not prior evidence");
  assert.equal(sim.trades.some(t=>t.entryT===start+30*M+.5),true,"the same result is eligible immediately after its close");
  assert.equal(sim.trades.some(t=>t.side===-1),false,"long history cannot qualify short");
});
it("a losing completion does not manufacture an intrahour passing window",()=>{
  const original=tape(),rows=Array.from({length:original.n},(_,i)=>tradeAt(original,i));
  const closing=rows.find(r=>r.entryT===start+20*M)!;closing.r=-.5;closing.exit=50;closing.reason="sl";
  const next=makeTape(cfg,original.bot,original.ind,original.protect,original.kind,["A"],rows,[],[]);
  const sim=walkForward(u,[next],options());
  assert.equal(sim.trades.some(t=>t.entryT===start+40*M),false);
});
it("independent seats rank newly qualified configs at entry before applying a shared open cap",()=>{
  const original=tape(),other=cfg+"|higher",low=Array.from({length:original.n},(_,i)=>tradeAt(original,i));
  const high=low.map(r=>({...r,cfg:other,r:.03,exit:103}));
  const tapes=[original,makeTape(other,original.bot,original.ind,original.protect,original.kind,["A"],high,[],[])];
  const sim=walkForward(u,tapes,{...options(),maxOpen:1});
  assert.deepEqual(sim.trades.filter(t=>t.entryT===start+40*M).map(t=>t.cfg),[other]);
});
it("a portfolio-limited seat can qualify and enter inside the reporting hour",()=>{
  const sim=walkForward(u,[tape()],{...options(),portfolio:1});
  assert.ok(sim.trades.some(t=>t.entryT===start+40*M),"a configured portfolio cap must not freeze selection until the next hour");
});
for(const seatPer of ["config","pair"] as const) it(`${seatPer}: continuous ranking keeps the better own set under a portfolio limit`,()=>{
  const original=tape(),other=cfg+"|higher",low=Array.from({length:original.n},(_,i)=>tradeAt(original,i));
  const high=low.map(r=>({...r,cfg:other,r:.03,exit:103}));
  const tapes=[original,makeTape(other,original.bot,original.ind,original.protect,original.kind,["A"],high,[],[])];
  const sim=walkForward(u,tapes,{...options(),portfolio:1,laneSeats:0,seatPer});
  assert.deepEqual(sim.trades.filter(t=>t.entryT===start+40*M).map(t=>t.cfg),[other]);
});
it("ranked seats react to a later close without erasing a previously admitted loss",()=>{
  const d=defaultWalkForward(DEFAULT_SETTINGS),high=cfg+"|high",low=cfg+"|low";
  const row=(id:string,entryT:number,exitT:number,r:number):Trade=>({cfg:id,sym:"A",side:1,entryT,exitT,
    entry:100,exit:100*(1+r),r,mult:1,kind:"normal",reason:r>0?"tp":"sl",bars:1,mfe:0,mae:0});
  const history=(id:string,r:number)=>Array.from({length:12},(_,i)=>row(id,start-(25-i*2)*M,start-(24-i*2)*M,r));
  const protect={tp:.01,sl:.01,trail:0,hold:32};
  const a=makeTape(high,"follow","rsi-mom-14-20@m1",protect,"normal",["A"],
    [...history(high,.03),row(high,start+10*M,start+20*M,-.5)],[],[]);
  const b=makeTape(low,"follow","rsi-mom-14-20@m1",protect,"normal",["A"],
    [...history(low,.02),row(low,start+20*M,start+21*M,.02),row(low,start+30*M,start+31*M,.02)],[],[]);
  const sim=walkForward(u,[a,b],{...options(),portfolio:1,laneSeats:0,toggles:{...d.toggles,normal:true,block:false}});
  assert.ok(sim.trades.some(t=>t.cfg===high&&t.r<0),"an admitted loss remains in funded results");
  assert.equal(sim.trades.some(t=>t.cfg===low&&t.entryT===start+20*M),false,"the simultaneous close is not yet evidence");
  assert.equal(sim.trades.some(t=>t.cfg===low&&t.entryT===start+30*M),true,"the later close can change the ranked seat");
});
it("sub-hour seat lookup and freshness honor the configured minute instead of rounding to an hour",()=>{
  const at=start+6*M, seats=new Map([[start+5*M,new Set([cfg])]]);
  assert.equal(freshEntry(start+5*M,at,1/60),true);
  assert.equal(freshEntry(start+4*M,at,1/60),false);
  assert.equal(seatedForEntry(cfg,start+5*M,at,1/60,seats,new Set()),true);
  assert.equal(seatedForEntry(cfg,start+5*M,at,1/60,new Map([[start+5*M,new Set()]]),new Set([cfg])),false);
});
it("intrahour wakeups retain identical results with an evicting stored history",()=>{
  const original=tape(),store=new TapeHistoryStore({cacheBytes:1});
  try {
    const memory=walkForward(u,[original],options()),stored=walkForward(u,[store.append(original)],options());
    assert.deepEqual(stored.trades,memory.trades);
    assert.deepEqual(stored.steps,memory.steps);
    assert.equal(stored.trades[0].entryT,start+40*M);
  } finally {store.close();}
});
it("the research worker preserves intrahour eligibility clocks and executions",async()=>{
  const tp=tape(),wf=options(),expected=walkForward(u,[tp],wf),owner={};
  try {
    const [reply]=await runOnWorkers<{sim:WalkForwardResult}>([{type:"research-real",nowT:end,baseTf:1,
      packed:packTapes([tp]),wf}],1,30_000,undefined,false,undefined,owner);
    assert.deepEqual(reply.sim.steps,expected.steps);
    assert.deepEqual(reply.sim.trades,expected.trades);
    assert.equal(reply.sim.steps[0].continuousReal?.[0].at,start+40*M);
  } finally {await retireOwnedIdleWorkers(owner);}
});
for (const kind of ["normal","axis"] as const) for (const side of [1,-1] as const)
  it(`${kind} ${side}: all 12/12 processed stages can advance within one reporting hour`,()=>{
    const protect={tp:.01,sl:.01,trail:0,hold:32}, id=configId("follow","rsi-mom-14-20@m1",protect,kind);
    const row=(entryT:number):Trade=>({cfg:id,sym:"A",side,entryT,exitT:entryT+M,entry:100,
      exit:100+side*2,r:.02,mult:1,reason:"tp",bars:1,mfe:0,mae:0,kind});
    const history=Array.from({length:11},(_,i)=>row(start-(24-i*2)*M));
    const future=Array.from({length:28},(_,i)=>row(start+(1+i*2)*M));
    const own=makeTape(id,"follow","rsi-mom-14-20@m1",protect,kind,["A"],[...history,...future],[],[]);
    const oneHour={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
    const opt={...options(),startT:start,simH:1,rangeGate:undefined,processedStages:{validationN:12,realN:12},
      toggles:{...options().toggles,normal:kind==="normal",axis:true}};
    const sim=walkForward(oneHour,[own],opt);
    assert.equal(sim.steps.length,1,"the report has one hour without imposing an hourly evaluation gate");
    assert.ok(sim.trades.length>0);
    assert.equal(sim.trades[0].entryT,future[25].entryT);
    const stages=sim.processedStages!.sets[0].stages;
    assert.equal(stages.postBase.closedOrders,27);
    assert.equal(stages.validated.closedOrders,15);
    assert.equal(stages.active.closedOrders,3);
    assert.ok(sim.trades.every(t=>t.side===side&&t.kind===kind));
  });

it("a Base-admitted context starts post-Base processing before its downstream count window matures",()=>{
  const original=tape(), rows=Array.from({length:original.n},(_,i)=>tradeAt(original,i));
  const sim=walkForward(u,[original],{...options(),startT:start,simH:6,rangeGate:undefined,
    basePassed:new Set(["follow|rsi-mom-14-20@m1"]),
    processedStages:{validationN:2,realN:2}});
  const set=sim.processedStages!.sets.find(x=>x.identity.baseConfigId===cfg&&x.identity.symbol==="A"&&x.identity.side===1);
  assert.ok(set,"Base-qualified processing must not depend on a future Main/Real/entry qualification");
  assert.equal(set.stages.postBase.openedOrders,17,"the first cold entry is processed rather than discarded");
  assert.ok(!sim.trades.some(x=>x.entryT===rows.find(r=>r.entryT===start+20*M)!.entryT),
    "cold downstream windows must never be funded");
});

it("stage learning never turns an explicitly unselected set into funded execution",()=>{
  const opt={...options(),startT:start,simH:6,rangeGate:undefined,
    basePassed:new Set(["follow|rsi-mom-14-20@m1"]),validated:new Set<string>(),
    processedStages:{validationN:2,realN:2}};
  const sim=walkForward(u,[tape()],opt), set=sim.processedStages!.sets[0];
  assert.equal(sim.trades.length,0);
  assert.equal(set.stages.postBase.closedOrders,17);
  assert.ok(set.stages.validated.closedOrders>0);
  assert.equal(set.stages.active.openedOrders,0);
  assert.ok((set.deferredActive ?? 0)>0,"qualified Real evidence is recorded separately from active execution");
  assert.deepEqual(ProcessedSetBook.restore(JSON.parse(JSON.stringify(sim.processedStages!.snapshot))).snapshot(),sim.processedStages!.snapshot);
  const denied=walkForward(u,[tape()],{...opt,basePassed:new Set<string>()});
  assert.equal(denied.processedStages!.sets.length,0,"unproven Base candidates cannot populate the book");
});

it("stage learning records losses instead of manufacturing passing evidence",()=>{
  const sim=walkForward(u,[tape(true)],{...options(),startT:start,simH:6,rangeGate:undefined,
    basePassed:new Set(["follow|rsi-mom-14-20@m1"]),processedStages:{validationN:2,realN:2}});
  const set=sim.processedStages!.sets[0];
  assert.equal(set.stages.postBase.closedOrders,17);
  assert.equal(set.stages.postBase.returnPf,0);
  assert.equal(set.stages.validated.openedOrders,0);
  assert.equal(sim.trades.length,0);
});
