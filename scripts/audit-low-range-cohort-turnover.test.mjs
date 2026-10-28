import assert from "node:assert/strict";
import { test } from "node:test";
import { partition, verifyFrozenSettings } from "./audit-low-range-cohort-turnover.mjs";

const fixture = () => {
  const configs = [
    { id:"first", checks:[[10,1,2,5,1],[20,0,0,0,0]], settled:{n:2,gp:1,gl:2} },
    { id:"later", checks:[[10,0,0,0,0],[20,1,2,3,1]], settled:{n:1,gp:0,gl:3} },
    { id:"empty", checks:[[10,1,2,5,1],[20,1,2,5,1]], settled:{n:0,gp:0,gl:0} },
  ];
  return { p: { status:"passed", startT:10,endT:30, evaluatedDistinctConfigs:3,everPassedDistinctConfigs:3,
    hours:[{t:10,evaluated:3,passed:2,historicalGp:10,historicalGl:2,historicalPf:5},{t:20}],configs,
    totalSettled:{n:3,gp:1,gl:5},knownZeroAllocated:2,unknownAllocations:0,
    provenance:{protocolSha256:"p",runSourceSha256:"s"} },
  r: {status:"passed",protocolSha256:"p",sourceSha256:"s",fundedSettled:3,unitGp:1,unitGl:5,unitPf:.2,knownZeroSettled:2,unknownSettled:0} };
};
test("partitions funded outcomes by the exact initial config verdict and reconciles totals", () => {
  const {p,r}=fixture(), a=partition(p,r);
  assert.deepEqual([a.initialPassed.initialConfigs,a.initialPassed.executedConfigs,a.initialPassed.settled,a.initialPassed.pf],[2,1,2,.5]);
  assert.deepEqual([a.initialFailed.initialConfigs,a.initialFailed.executedConfigs,a.initialFailed.settled,a.initialFailed.pf],[1,1,1,0]);
  assert.equal(a.total.pf,.2);
});
test("rejects an incomplete clock, duplicate config, or unreconciled funded totals", () => {
  const a=fixture(); a.p.configs[0].checks.pop(); assert.throws(()=>partition(a.p,a.r),/incomplete decisions/);
  const b=fixture(); b.p.configs[1].id=b.p.configs[0].id; assert.throws(()=>partition(b.p,b.r),/duplicate config/);
  const c=fixture(); c.p.configs[0].settled.gl=1; assert.throws(()=>partition(c.p,c.r),/progression losses/);
  const d=fixture(); d.r.unknownSettled=1; assert.throws(()=>partition(d.p,d.r));
});
test("requires the frozen protocol and raw dump to agree that Historic Exit and unrelated types are disabled", () => {
  const off = {exit:false,block:false,blockActive:false,dca:false,dcaActive:false,axis:false,normal:true,trailing:true};
  const p={source:{sha256:"s"},actualSettings:{exitStrategy:{enabled:false},signals:{enabled:false},toggles:{...off},cost:.0015},
    actualWf:{toggles:{...off}},window:{tradeStartT:10,endT:20},symbols:Array.from({length:20},(_,i)=>`S${i}`),lane:5,sourceCount:195};
  const r={study:{protocolSha256:"p",sourceSha256:"s"},settings:{effective:{exitStrategy:{enabled:false},signals:{enabled:false},toggles:{...off},cost:.0015}},
    symbols:Array.from({length:20},(_,i)=>`S${i}`),window:{startT:10,endT:20}};
  assert.equal(verifyFrozenSettings(p,r,{protocolSha256:"p",sourceSha256:"s"}).historicExit,false);
  r.settings.effective.toggles.exit=true;
  assert.throws(()=>verifyFrozenSettings(p,r,{protocolSha256:"p",sourceSha256:"s"}),/raw exit enabled/);
});
