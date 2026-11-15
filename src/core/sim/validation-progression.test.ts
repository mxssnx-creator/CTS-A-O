import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";
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
  assert.ok(sim.trades.every(t=>t.entryT>=start+H),"future closes cannot qualify an earlier entry");
  assert.ok(sim.validated?.includes(cfg),"the reported union includes every config validated at an actual causal clock");
});
it("losing configs and an explicitly frozen empty validation snapshot remain ineligible",()=>{
  assert.equal(walkForward(u,[tape(true)],options()).trades.length,0);
  assert.equal(walkForward(u,[tape()],{...options(),validated:new Set()}).trades.length,0);
});
