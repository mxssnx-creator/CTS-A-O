import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { configId, kindOfId, laneProtect, parseConfigId } from "../pipeline/pipeline.ts";
import { protectGrid, gridVariants, makeTape, lastNOk, lastNSideOk } from "./walkforward.ts";
import { capTrailingOnlyProtect, ratchetTrail, enforceSignalPosition } from "./trailing.ts";
import { laneContributions } from "../server/live.server.ts";
import type { Protect, Trade } from "../domain/types.ts";
import { strategyDataHours, marketHistoryBars, laneSeriesFrom } from "../server/runtime.server.ts";
import { defaultWalkForward } from "./walkforward.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { syntheticCandles } from "../market/bars.ts";
import { fakeRt, SimExchange, lane } from "../test-support.ts";
import { stepLive, resetLiveBackoff } from "../server/live.server.ts";
import { dcaSnapshot } from "./dca.ts";

describe("Independent strategy config sets", () => {
  it("native DCA increases each independent symbol once by 2.5 original units, preserving its sibling and never compounding", async () => {
    const old=process.env.CTS_CORE_LIVE;process.env.CTS_CORE_LIVE="1";
    try{
      const {rt,prices}=fakeRt();const ex=new SimExchange().withEquity(100);prices[1].last=10;
      Object.assign(rt.settings.live,{notionalUsd:10,rebalancePct:0,maxChase:0,minFreeMargin:0,maxPositions:0,top:0});
      const cfg=(step:number)=>configId("follow","ema-9-21@m15",{tp:.02,sl:.02,trail:0,hold:32,dca:dcaSnapshot({...DEFAULT_SETTINGS.dca,step})},"dca");
      const a={...lane(cfg(.01),"S0-USDT",1,10,1,.02),w:1};
      const b={...lane(cfg(.02),"S1-USDT",1,10,1,.02),w:1};
      const step=()=>stepLive(rt as never,[],1,ex);
      rt.paper.positions=[a,b];await step();assert.equal(ex.positions.get("S0-USDT|LONG"),1);assert.equal(ex.positions.get("S1-USDT|LONG"),1);
      rt.paper.positions=[{...a,vol:3.5,w:3.5},b];await step();assert.equal(ex.positions.get("S0-USDT|LONG"),3.5);assert.equal(ex.positions.get("S1-USDT|LONG"),1);
      const before=ex.log.filter(o=>o.type==="MARKET").length;
      for(let i=0;i<3;i++)await step();assert.equal(ex.log.filter(o=>o.type==="MARKET").length,before);
      rt.paper.positions=[{...a,vol:3.5,w:3.5},{...b,vol:3.5,w:3.5}];await step();
      assert.equal(ex.positions.get("S0-USDT|LONG"),3.5);assert.equal(ex.positions.get("S1-USDT|LONG"),3.5);
      for(const sym of ["S0-USDT","S1-USDT"]){
        const opens=ex.log.filter(o=>o.type==="MARKET"&&o.side==="BUY"&&o.symbol===sym);
        assert.deepEqual(opens.map(o=>Number(o.quantity)),[1,2.5]);
      }
      rt.paper.positions=[];await step();assert.equal(ex.positions.size,0);
    }finally{resetLiveBackoff();if(old===undefined)delete process.env.CTS_CORE_LIVE;else process.env.CTS_CORE_LIVE=old;}
  });
  for(const side of [1,-1] as const)it(`native DCA holds a second same-side parent behind the isolation fence, side ${side}`,async()=>{
    const old=process.env.CTS_CORE_LIVE;process.env.CTS_CORE_LIVE="1";
    try{
      const {rt}=fakeRt();const ex=new SimExchange().withEquity(100);
      Object.assign(rt.settings.live,{notionalUsd:10,rebalancePct:0,maxChase:0,minFreeMargin:0,maxPositions:0,top:0});
      const cfg=(step:number)=>configId("follow","ema-9-21@m15",{tp:.02,sl:.02,trail:0,hold:32,dca:dcaSnapshot({...DEFAULT_SETTINGS.dca,step})},"dca");
      const a={...lane(cfg(.01),"S0-USDT",side,10,1,.02),w:1};
      const b={...lane(cfg(.02),"S0-USDT",side,10,1,.02),w:1};
      const step=()=>stepLive(rt as never,[],1,ex),key=`S0-USDT|${side===1?"LONG":"SHORT"}`;
      rt.paper.positions=[a,b];const start=await step();
      assert.equal(ex.positions.get(key),1);
      assert.ok(start.skipped.some(x=>x.why.includes("aggregate position reserved for another parent")));
      rt.paper.positions=[{...a,vol:3.5,w:3.5},b];await step();assert.equal(ex.positions.get(key),3.5);
      rt.paper.positions=[{...a,vol:3.5,w:3.5},{...b,vol:3.5,w:3.5}];const held=await step();
      assert.equal(ex.positions.get(key),3.5,"the excluded parent cannot add to the first parent's physical position");
      assert.ok(held.skipped.some(x=>x.why.includes("aggregate position has held or pending ownership")));
      const opens=ex.log.filter(o=>o.type==="MARKET"&&o.side===(side===1?"BUY":"SELL"));
      assert.deepEqual(opens.map(o=>Number(o.quantity)),[1,2.5]);
    }finally{resetLiveBackoff();if(old===undefined)delete process.env.CTS_CORE_LIVE;else process.env.CTS_CORE_LIVE=old;}
  });
  it("loads the full own 336h strategy window on every lane even with one-day lane preferences", () => {
    const s={...DEFAULT_SETTINGS,signals:{...DEFAULT_SETTINGS.signals,enabled:false},tfDays:{"1":1,"5":1,"15":1,"30":1},historyDays:1};
    const wf={...defaultWalkForward(s),preH:336,longH:336,simH:6,symH:400};
    const required=strategyDataHours(s,wf);assert.ok(required>=430);
    assert.ok(marketHistoryBars(s,wf)>=required*60);
    const cs=CandleSeries.fromCandles(syntheticCandles("A",1,Math.ceil(required*60)+120,1000*86400000));
    const lanes=laneSeriesFrom(new Map([["A",cs]]),s,0,required);
    for(const b of lanes)assert.ok(b.n*b.tfMin>=required*60-b.tfMin,`${b.tfMin}m lost its own long window`);
  });
  it("adds and counts independent no-TP cells across every configured engine range", () => {
    const grid=DEFAULT_SETTINGS.grid;
    const cells=protectGrid(15,grid,DEFAULT_SETTINGS.cost);
    const plain=protectGrid(15,{...grid,trailingOnly:false},DEFAULT_SETTINGS.cost);
    assert.deepEqual(cells.filter(p=>!p.trailOnly),plain);
    const tos=cells.filter(p=>p.trailOnly);assert.ok(tos.length>0);
    assert.deepEqual(new Set(tos.map(p=>p.tag??"wide")),new Set(plain.filter(p=>p.trail>0).map(p=>p.tag??"wide")));
    assert.equal(gridVariants(grid),cells.length);
    const ids=new Set<string>();
    for(const p of tos)for(const tf of [1,5,15,30]){
      const q=capTrailingOnlyProtect(laneProtect(p,`ema-9-21@m${tf}`));
      assert.ok(q.sl<=.03&&q.trail<=.03&&q.trail*(q.trailStep??1)<=.03+1e-12);
      assert.equal(q.tp,0);assert.equal(q.trailFree,false);
      const id=configId("follow",`ema-9-21@m${tf}`,q);ids.add(id);
      assert.equal(kindOfId(id),"trailing-only");assert.equal(parseConfigId(id)?.protect.trailOnly,true);
    }
    assert.ok(ids.size>=tos.length);
  });

  it("ordinary no-TP sets cap start stops at 3%, preserve ratchets and project protection after restart", () => {
    for(const side of [1,-1] as const){
      const p:Protect={tp:0,sl:.09,trail:.01,hold:12,trailOnly:true,trailMax:.03};
      const cfg=configId("follow","ema-9-21@m15",p);
      const pos={cfg,side,entry:100,stop:100*(1-side*.09),peak:100,trailOn:false,trail:.01,trailDist:.01,trailOnly:true,target:120};
      enforceSignalPosition(pos);assert.equal(pos.stop,100*(1-side*.03));assert.equal(pos.target,0);
      ratchetTrail(pos,.01,.01,side===1?105:100,side===1?100:95);
      const previous=pos.stop;assert.ok(side===1?previous>100:previous<100);
      ratchetTrail(pos,.01,.01,side===1?104:101,side===1?99:96);assert.equal(pos.stop,previous);
      const rt={settings:DEFAULT_SETTINGS,paper:{positions:[{...pos,sym:"A-USDT",vol:1,entryT:1}]}};
      const [c]=laneContributions(rt as never);assert.ok(c.stopPx);assert.equal(c.tgt,undefined);
    }
  });

  it("each indication, lane, range and strategy cell owns its Last-N and cannot use sibling or future wins", () => {
    const H=3600000,now=100*H;
    for(const ind of ["ema-9-21@m1","ema-9-21@m15","rsi-14-30@m5"])
      for(const tag of [undefined,"mc","mn","sh","gn","lg"] as const)
        for(const kind of ["normal","trailing","trailing-only","dca","dca-active","axis"] as const){
          const p:Protect={tp:kind==="trailing-only"?0:.02,sl:.02,trail:kind==="normal"?0:.01,hold:24,...(tag?{tag}:{}),...(kind==="trailing-only"?{trailOnly:true}:{})};
          const id=configId("follow",ind,p,kind);
          const rows:Trade[]=Array.from({length:26},(_,i)=>({cfg:id,sym:"A",side:1,entryT:(i+50)*H,exitT:(i+51)*H,entry:100,exit:100,r:i===25?100:-.01,unitR:i===25?100:-.01,kind,reason:"time",bars:1,mfe:0,mae:0}));
          const t=makeTape(id,"follow",ind,p,kind,["A"],rows,[],[]);
          assert.equal(lastNOk(t,75*H,25,1.5),false,id);
          assert.equal(lastNSideOk(t,-1,now,25,1.5),false,"missing own side cannot borrow long wins");
          const empty=makeTape(id+"-sibling","follow",ind,p,kind,["B"],[],[],[]);
          assert.equal(lastNOk(empty,now,25,1.5),false,"an empty sibling never inherits another config's sample");
        }
  });
});
