import assert from "node:assert/strict";
import { it } from "node:test";
import { scalarCoverage, coverageTape, signalEntrySelection } from "./audit-signal-coverage.mjs";
import { configId } from "../src/core/pipeline/pipeline.ts";
import { defaultWalkForward } from "../src/core/sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { sigActiveKey } from "../src/core/signals.ts";
const H = 3_600_000;
it("keeps empty contexts and full Last-8 readiness separate from older/window samples", () => {
  const rows = Array.from({length: 9}, (_,i) => ["A",1,i*H,(i+1)*H,i===6?-.02:.01]);
  const a = scalarCoverage(rows,8*H,100,8);
  assert.equal(a.pastN,7); assert.equal(a.lastNReady,false); assert.equal(a.n,7);
  const b = scalarCoverage(rows,8*H+1,2,8);
  assert.equal(b.pastN,8); assert.equal(b.lastNReady,true); assert.equal(b.n,2);
  assert.equal(b.gl,.02); assert.equal(b.gp,.01); assert.equal(b.pf,.5);
  const z = scalarCoverage([],8*H,100,8);
  assert.equal(z.n,0); assert.equal(z.lastNReady,false); assert.equal(z.pf,null);
  assert.equal(scalarCoverage(rows.slice(0,8),9*H,100,8).gp, scalarCoverage(rows,9*H,100,8).gp, "future/equal-clock close excluded");
});
it("measures completed and still-open drawdown periods from own chronological returns", () => {
  const rows=[["A",1,0,H,.02],["A",1,H,2*H,-.03],["A",1,2*H,3*H,.01],["A",1,3*H,4*H,.03]];
  const open=scalarCoverage(rows,3.5*H,100,8);
  assert.equal(open.ddtH,2.5); assert.equal(open.mdd,.03);
  const recovered=scalarCoverage(rows,5*H,100,8);
  assert.equal(recovered.ddtH,3); assert.ok(Math.abs(recovered.net-.03)<1e-12);
});
it("requires full tape provenance and rejects mismatched universe/type/protection", () => {
  const protect={tp:.01,sl:.02,trail:0,hold:4,trailMax:.03};
  const id=configId("follow","sig-ema-cross-s@m15",protect);
  const row={id,protect,kind:"normal",fromT:0,heldOnly:false,symbols:["A","B"],trades:[["A",1,0,H,.01]]};
  const tp=coverageTape(row,["A","B"]);
  assert.equal(tp.n,1);assert.equal(tp.fromT,0);assert.equal(tp.heldOnly,false);
  assert.throws(()=>coverageTape({id,trades:[]},["A","B"]),/metadata/);
  assert.throws(()=>coverageTape({...row,symbols:["A"]},["A","B"]),/universe/);
  assert.throws(()=>coverageTape({...row,kind:"trailing"},["A","B"]),/type/);
  assert.throws(()=>coverageTape({...row,protect:{...protect,sl:.03}},["A","B"]),/protection/);
});
it("separates own entry qualification from the selected hourly cohort without reading future losses", () => {
  const protect={tp:.01,sl:.02,trail:0,hold:4,trailMax:.03};
  const ind="sig-ema-cross-s@m15", id=configId("follow",ind,protect);
  const rows=Array.from({length:12},(_,i)=>["A",1,i*60_000,(i+1)*60_000,.01]);
  rows.push(["A",1,H+60_000,H+120_000,-.03]);
  const tp=coverageTape({id,protect,kind:"normal",fromT:0,heldOnly:false,symbols:["A"],trades:rows},["A"]);
  const wf={...defaultWalkForward(DEFAULT_SETTINGS),signalLongH:100,signalValidLastN:8,lastN:0,preGate:false,rangeGate:undefined,
    gates:{minPf:1.5,minTrades:12,lastNFloor:0,maxDdtH:1000,maxDdr:0,minGreen:0,stableBlocks:0}};
  const step={t:H,keys:new Set()};
  const unselected=signalEntrySelection(tp,rows,[step],wf,H,2*H);
  assert.equal(unselected.settledCandidates,1);assert.equal(unselected.ownValidAtEntry,1);
  assert.equal(unselected.unselectedOwnValid,1);assert.equal(unselected.newlyValidWithinStep,0);
  step.keys.add(sigActiveKey("follow",ind,"A",1,"normal",id));
  const selected=signalEntrySelection(tp,rows,[step],wf,H,2*H);
  assert.equal(selected.selectedOwnValid,1);assert.deepEqual(selected.selectedFailures,{});
  assert.equal(signalEntrySelection(tp,rows,[],wf,H,2*H),null);
});
