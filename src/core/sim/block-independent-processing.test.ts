import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { blockBookOf } from "./block.ts";
import { defaultWalkForward, feedBooks, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";
const H=3600000,M=60000,NOW=Date.UTC(2026,9,16,12),START=NOW-6*H;
const ind="rsi-mom-14-20@m15";
function tape(sym="A",side:1|-1=1,kind:"normal"|"axis"="normal",loss=false) {
  const id=`follow|${ind}|tp1|sl1|tr0|h32|${sym}|${side}|${kind}`;
  const row=(entryT:number):Trade=>({cfg:id,sym,side,entryT,exitT:entryT+20*M,entry:100,exit:101,r:loss?-.01:.01,mult:1,reason:"time",bars:2,mfe:0,mae:0,kind});
  const rows=[...Array.from({length:60},(_,i)=>row(START-60*H+i*H)),...Array.from({length:6},(_,i)=>row(START+10*M+i*H))];
  return makeTape(id,"follow",ind,{tp:.01,sl:.01,trail:0,hold:32},kind,[sym],rows,[],[]);
}
function opts(mode:"shared"|"additive"|"overall"):WalkForwardOptions {
  const d=defaultWalkForward({...DEFAULT_SETTINGS,gates:{...DEFAULT_SETTINGS.gates,positionWindows:null}});
  return {...d,mode:"fixed" as const,seatSet:"validated" as const,preH:60,longH:60,simH:6,seatPer:"config" as const,
    validLastN:0,lastN:0,normalBaseMinPf:0,robustFrac:0,symGate:"off" as const,blockTrace:true,
    coord:{enabled:false,hourLock:0,cooldown:"off" as const,conflict:false,confirm:false},
    maxOpen:1,maxPerSymbol:0,maxPerSide:0,maxPositions:0,
    toggles:{normal:false,trailing:true,block:true,blockActive:true,dca:false,dcaActive:false,axis:true},
    block:{...d.block,mode,historySource:"processed-orders" as const,ratio:.2,maxMult:2,steps:7,maxLevel:8,minActiveLevel:1,
      sources:{config:true,overall:true,symbol:true,direction:true,indication:true,type:true}}};
}
const u={bars:[],caches:[],startT:START-60*H,endT:NOW,splitT:START-60*H,nowT:NOW,baseTf:60} as never;
for(const mode of ["shared","additive","overall"] as const)for(const side of [1,-1] as const)
  it(`${mode}, side ${side}: independent processed Block learns causal predecessors with Ordinary disabled`,()=>{
    const o=opts(mode),sim=walkForward(u,[tape("A",side)],o);
    assert.equal(sim.trades.length,5,"first closed predecessor warms Block; only later raised entries execute");
    assert.ok(sim.trades.every(x=>(x.blockVol??1)>1));
    assert.ok(sim.feed[0].blockProcessed && !sim.feed[0].accepted,"modeled predecessor is not relabeled as execution");
    const book=blockBookOf(o.block,true);
    for(const e of JSON.parse(JSON.stringify(sim.feed)))feedBooks(e,book);
    assert.equal(book.tailSum("all",100).n,6,"one sample per parent, no duplicate Block legs");
    assert.equal(sim.trades[0].entryT,START+70*M,"a future win cannot bootstrap the first entry");
    const legacy=walkForward(u,[tape("A",side)],{...o,block:{...o.block,historySource:"accepted-orders"}});
    assert.equal(legacy.trades.length,0,"explicit accepted-only source retains its cold-book semantics");
  });
it("independent predecessor caps, losing gates and persistent predecessor stages cannot be bypassed",()=>{
  const o=opts("overall"),sim=walkForward(u,[tape("A"),tape("B")],o);
  assert.equal(sim.feed.filter(e=>e.blockProcessed).length,6,"independent maxOpen=1 rejects simultaneous sibling precursors");
  assert.equal(walkForward(u,[tape("A",1,"normal",true)],o).trades.length,0);
  const staged=walkForward(u,[tape("A")],{...o,processedStages:{validationN:2,realN:2}});
  assert.equal(staged.trades.length,0,"raw shadow predecessors cannot substitute for the persistent Active stage");
});
it("Axis keeps processing when Ordinary is off and Block is independently excluded for its type",()=>{
  const o=opts("overall");
  const sim=walkForward(u,[tape("A",1,"axis")],{...o,block:{...o.block,excludeKinds:["axis"]}});
  assert.equal(sim.trades.length,6);
  assert.ok(sim.trades.every(x=>x.kind==="axis"&&x.blockVol===1));
  const solo=walkForward(u,[tape("A",1,"axis")],{...o,toggles:{...o.toggles,block:false,blockActive:false}});
  assert.deepEqual(sim.trades,solo.trades,"Block exclusion preserves the complete independent Axis execution and sizing");
});
