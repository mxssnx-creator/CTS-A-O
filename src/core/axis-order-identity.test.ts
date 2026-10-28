import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_AXIS, DEFAULT_SETTINGS, MINIMAL_RANGE } from "./config.ts";
import { axisVariants, defaultWalkForward, dupKey, openDupKey, orderCfgKey, makeTape, walkForward, configEval, execDecision } from "./sim/walkforward.ts";
import { diffPositions } from "./server/paper-rows.ts";
import { laneKeyOf } from "./live-record.ts";
import type { Trade } from "./domain/types.ts";
import { modeledUnitReturn } from "./metrics/stats.ts";
import { volumeFactorForStrategy } from "./volume-factor.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { laneContributions } from "./server/live.server.ts";
const H=3_600_000,M=60_000,T=Date.UTC(2026,9,21);
const p={tp:0.02,sl:0.01,trail:0,hold:60};
const variants=axisVariants({...DEFAULT_AXIS,modes:["revert","desk"],hybrids:[false,true],ranges:["atr","linear","geo","fib","volume"],levelsSet:[2,3,4]},[p]);
const sources=["rsi-mom-14-20@m15","rsi-mom-14-25@m15"];
const ids=sources.flatMap((ind)=>variants.map((v)=>`follow|${ind}|tp2|sl1|tr0|h60${v.tag}|axis`));
it("every Axis source, mode, spacing, depth and hybrid retains its own simulated, Paper and native identity",()=>{
  assert.equal(ids.length,90);
  const closed={sym:"A",side:1 as const,entryT:T-H,exitT:T-H+M,r:0.0185,kind:"axis" as const};
  const open={sym:"A",side:1 as const,entryT:T-H,entry:100,stop:99,target:102};
  assert.equal(new Set(ids.map(orderCfgKey)).size,ids.length);
  assert.equal(new Set(ids.map((cfg)=>dupKey({...closed,cfg}))).size,ids.length);
  assert.equal(new Set(ids.map((cfg)=>openDupKey({...open,cfg}))).size,ids.length);
  const positions=ids.flatMap((cfg)=>[1,-1].map((side)=>({...open,cfg,side})));
  assert.equal(diffPositions(null,positions).next.size,180);
  assert.equal(new Set(positions.map((x)=>laneKeyOf({...x,id:`${x.cfg}|${x.sym}|${x.entryT}`}))).size,180);
  assert.equal(dupKey({...closed,cfg:ids[0]}),dupKey({...closed,cfg:ids[0]}),"same-config retries still dedupe");
});
const tape=(id:string,returns?:number[])=>{
  const tr=(entryT:number,r:number):Trade=>({cfg:id,sym:"A",side:1,entryT,exitT:entryT+M,entry:100,exit:100*(1+r+0.0015),r,kind:"axis",reason:r>0?"tp":"sl",bars:1,mfe:0,mae:0});
  const hist=Array.from({length:40},(_,i)=>tr(T-(13-i/4)*H,returns?.[i]??(i%10===0?-0.005:0.0185)));
  return makeTape(id,"follow",id.split("|")[1],p,"axis",["A"],[...hist,tr(T-90*M,0.0185)],[],[]);
};
const options=()=>{
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  return {...d,simH:2,preH:12,longH:24,lastN:15,validLastN:15,rangeGate:undefined,seatPer:"config" as const,portfolio:0,robustFrac:0,
    coord:{enabled:false,hourLock:0,cooldown:"off" as const,conflict:false,confirm:false},
    toggles:{...d.toggles,normal:false,trailing:false,block:false,blockActive:false,dca:false,dcaActive:false,axis:true},
    maxOpen:0,maxPerSymbol:0,maxPerSide:0,maxPositions:0};
};
it("simultaneous Axis configs execute independently after their own prehistory and Last-N checks",()=>{
  const tapes=ids.map((id)=>tape(id)),o=options();
  const u={bars:[],caches:[],startT:T-24*H,endT:T,splitT:0,nowT:T,baseTf:1} as never;
  const all=walkForward(u,tapes,o);
  assert.equal(all.trades.length,90,JSON.stringify(all.skips));
  assert.equal(all.skips.duplicate??0,0);
  for(const tp of [tapes[0],tapes[25],tapes.at(-1)!])
    assert.deepEqual(all.trades.filter((x)=>x.cfg===tp.id),walkForward(u,[tp],o).trades);
});
it("Axis sets apply their configured volume factor while admission and intrinsic unit returns stay identical",()=>{
  const tapes=ids.map((id)=>tape(id)),o=options();
  const u={bars:[],caches:[],startT:T-24*H,endT:T,splitT:0,nowT:T,baseTf:1} as never;
  // Axis reserves 8× for its deepest supported intrinsic ladder (8 rungs × 5 base units). Keep this
  // proportionality check below that external ceiling, then verify the uncropped default is capped separately.
  const small=walkForward(u,tapes,{...o,axisVolumeFactor:0.1});
  const base=walkForward(u,tapes,{...o,axisVolumeFactor:0.2});
  const capped=walkForward(u,tapes,{...o,axisVolumeFactor:1});
  assert.equal(small.trades.length,90);assert.equal(base.trades.length,90);
  assert.equal(capped.trades.length,90);
  assert.equal(DEFAULT_SETTINGS.axis.volumeFactor,1);
  for(let i=0;i<90;i++) {
    assert.equal(small.trades[i].cfg,base.trades[i].cfg);
    assert.equal(small.trades[i].entryT,base.trades[i].entryT);
    assert.ok(Math.abs(small.trades[i].vol!-base.trades[i].vol!*0.5)<1e-12);
    assert.equal(small.trades[i].volFactor,0.1);
    assert.ok(Math.abs(modeledUnitReturn(small.trades[i])-modeledUnitReturn(base.trades[i]))<1e-12);
    assert.ok(capped.trades[i].mult! <= 8 / 36 + 1e-12, "intrinsic Axis capacity keeps the external multiplier within 8×");
    assert.ok(capped.trades[i].vol! <= 8 + 1e-12, "the effective Axis position volume stays within 8×");
  }
  assert.ok(Math.abs(small.stats.pf-base.stats.pf)<1e-12);
  const normal={ind:"trend-ema-12-26@m15c",kind:"normal"};
  const factors={indicationVolumeFactors:{coordination:8,combined:{trend:3}},axisVolumeFactor:0.1};
  assert.equal(volumeFactorForStrategy(normal,factors),3);
  assert.ok(Math.abs(volumeFactorForStrategy({...normal,kind:"axis"},factors)-0.3)<1e-12);
});
it("native Axis projection applies captured range and set factors once and never resizes a held ladder after edits",()=>{
  const rt=new CoreRuntime(new CoreDb(":memory:"),{grid:{...DEFAULT_SETTINGS.grid,minimal:{...MINIMAL_RANGE,volumeFactor:1.4}}},{market:"synthetic",priceStream:null});
  try {
    rt.stop();
    rt.paper.positions=[{cfg:ids[0].replace("|ax-","|mn|ax-"),sym:"A",side:1,entryT:T-H,entryI:0,entry:100,stop:99,target:102,peak:100,trailOn:false,mtm:0,w:2,vol:0.28,volFactor:0.1,rangeVol:1.4,level:0}];
    const check=()=>{
      const out=laneContributions(rt,new Map([["A",100]]));
      assert.equal(out.length,1);
      assert.ok(Math.abs(out[0].vol-0.28)<1e-12,"2 rung units ×0.1 Axis ×1.4 captured range; no second range factor");
      assert.ok(Math.abs(out[0].laneUnits!-0.14)<1e-12);
    };
    check();
    rt.updateSettings({axis:{volumeFactor:0.7},grid:{...rt.settings.grid,minimal:{...(rt.settings.grid.minimal || MINIMAL_RANGE),volumeFactor:2}}});
    check();
  } finally {rt.dispose();}
});
it("Axis config gates retain losing Last-N samples and honor exact seat cooldowns",()=>{
  const good=tape(ids[0]), bad=tape(ids[1],Array.from({length:40},(_,i)=>i<20?0.04:-0.01)),o=options();
  assert.equal(configEval(good,T-2*H,o).ok,true);
  assert.equal(configEval(bad,T-2*H,{...o,preGate:false}).ok,false,"a winning sibling cannot supply the losing recent sample");
  assert.equal(execDecision(good,T-90*M,o,{sym:"A",side:1}).ok,true);
  assert.deepEqual(execDecision(good,T-90*M,{...o,seatQuietH:3},{sym:"A",side:1}),{ok:false,why:"seatQuiet"});
  assert.equal(execDecision(good,T-90*M,{...o,seatQuietH:0},{sym:"A",side:1}).ok,true);
});
