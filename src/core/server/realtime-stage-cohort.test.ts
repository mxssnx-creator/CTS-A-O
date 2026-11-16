import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, makeTape } from "../sim/walkforward.ts";
import { realtimeStageCohortGen } from "./realtime-stage-cohort.ts";

const ind="ema-9-21@m1",p={tp:.01,sl:.01,trail:0,hold:30};
const tapes=Array.from({length:5},(_,i)=>makeTape(`follow|${ind}|${i}`,"follow",ind,p,"normal",["A","B"],[],[],[]));
const d=defaultWalkForward(DEFAULT_SETTINGS);
const options={...d,basePassed:new Set([`follow|${ind}`]),processedStages:{validationN:2,realN:2},
  toggles:{...d.toggles,normal:true,block:false}};
function drain<T>(g:Generator<number,T>):T{for(;;){const r=g.next();if(r.done)return r.value;}}

test("realtime stage candidates rotate within a bounded worker without dropping selected or held sets",()=>{
 const initial=new Set([tapes[0].id]),held=new Set([tapes[0].id]);
 const first=drain(realtimeStageCohortGen(tapes,options,initial,held,"all",0,8));
 assert.deepEqual(first.coverage,{eligible:5,tracked:3,waiting:2,extraContexts:8,contextBudget:8});
 assert.ok(first.ids.has(tapes[0].id));assert.ok(first.ids.has(tapes[1].id));assert.ok(first.ids.has(tapes[2].id));
 const second=drain(realtimeStageCohortGen(tapes,options,initial,held,"all",first.nextCursor,8));
 assert.ok(second.ids.has(tapes[3].id));assert.ok(second.ids.has(tapes[4].id));
 assert.equal(second.coverage.waiting,2);
});

test("only Base-proven enabled sets are learned and an explicit narrow mode stays narrow",()=>{
 const denied=drain(realtimeStageCohortGen(tapes,{...options,basePassed:new Set()},new Set(),new Set(),"all",0,100));
 assert.equal(denied.coverage.eligible,0);assert.equal(denied.ids.size,0);
 const off=drain(realtimeStageCohortGen(tapes,{...options,processedStages:undefined},new Set([tapes[0].id]),new Set(),"all",0,100));
 assert.equal(off.ids.size,1);assert.equal(off.coverage.eligible,0);
 const narrow=drain(realtimeStageCohortGen(tapes,options,new Set([tapes[0].id]),new Set([tapes[0].id]),"break",0,100));
 assert.deepEqual(narrow.coverage,{eligible:5,tracked:1,waiting:4,extraContexts:0,contextBudget:100});
 assert.throws(()=>drain(realtimeStageCohortGen(tapes,options,new Set(),new Set(),"all",0,-1)));
});
