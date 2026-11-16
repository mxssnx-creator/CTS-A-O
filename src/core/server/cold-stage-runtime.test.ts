import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { orderKey } from "../sizing.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const H=3_600_000,M=60_000,T=Math.floor(Date.now()/H)*H-H;
const ind="ema-9-21@m1",sym="OWN-USDT",p={tp:.02,sl:.01,trail:0,hold:60,tag:"mn" as const};
const cfg=configId("follow",ind,p);
const row=(entryT:number):Trade=>({cfg,sym,side:1,entryT,exitT:entryT+M,entry:100,exit:102,r:.02,
  mult:1,kind:"normal",reason:"tp",bars:1,mfe:0,mae:0});
const history=Array.from({length:11},(_,i)=>row(T-(24-i*2)*M));

for(const mode of ["full","fast"] as const) test(`${mode}: a cold Base-admitted paper context receives processing-only stage samples`,()=>{
  const dir=mkdtempSync(join(tmpdir(),"cts-cold-paper-")),db=new CoreDb(":memory:",{statePath:join(dir,"state.json")});
  const rt=new CoreRuntime(db,{live:{liveLastN:0}},{market:"synthetic",priceStream:null});rt.stop();
  try {
    const d=defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf={...d,preH:12,longH:12,simH:12,startT:T,mode:"fixed",seatPer:"config",portfolio:0,
      maxPositions:0,maxOpen:1,symGate:"off",rangeGate:undefined,rangeOpts:undefined,
      basePassed:new Set([`follow|${ind}`]),basePassedRanges:{[`follow|${ind}`]:["mn"]},validated:new Set(),
      toggles:{...d.toggles,normal:true,block:false,axis:false},coord:{...d.coord!,enabled:false},
      signalRank:undefined,engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
    const u={bars:[],caches:[],startT:T-12*H,endT:T,splitT:T,nowT:T,baseTf:1} as never;
    rt.sim=walkForward(u,[],rt.wf);rt.paper.selected=[];
    const hooks=rt as unknown as {lastSelection:unknown;stepPaper():void;
      stepPaperGen(fast:{opens:ReadonlyMap<string,readonly OpenPosition[]>;t:number;refreshHeld:boolean}):Generator<number,void>};
    hooks.lastSelection={picks:[],eligible:0};
    const op:OpenPosition={cfg,sym,side:1,entryT:T,entryI:0,entry:100,stop:99,target:102,peak:100,trailOn:false,mtm:0};
    rt.tapes=[makeTape(cfg,"follow",ind,p,"normal",[sym],history,[op],[])];
    if(mode==="full")hooks.stepPaper();
    else for(const _ of hooks.stepPaperGen({opens:new Map([[cfg,[op]]]),t:T,refreshHeld:true})){}
    const opened=rt.paper.positions[0];
    assert.ok(opened,JSON.stringify(rt.status.paperSkips));
    assert.equal(opened.processedStage,"postBase");
    assert.equal(rt.paper.units!.get(orderKey(opened)),0);
    assert.equal(rt.livePromotionGate(opened,T).ok,false);
    assert.equal(rt.paper.trades.length,0);
  }finally{rt.dispose();db.db.close();rmSync(dir,{recursive:true,force:true});}
});
