import assert from "node:assert/strict";
import { test } from "node:test";
import { planLaneOrders, type LaneWant, type LaneOrder } from "./lane-orders.ts";

test("a later lane's latest tightened stop precedes target changes within a single-request budget",()=>{
 const covered:LaneWant[]=[{id:"target",key:"BTC|1",sym:"BTC",side:1,stop:90,target:120,entryT:1},
 {id:"trail",key:"BTC|1",sym:"BTC",side:1,stop:98,entryT:2}];
 const map:Record<string,LaneOrder>={target:{...covered[0],qty:1,at:1,s:{coid:"s1",px:90},t:{coid:"t1",px:110}},
 trail:{...covered[1],qty:2,at:2,s:{coid:"s2",px:95}}};
 const options={px:()=>100,stopPx:(w:LaneWant)=>w.stop,targetPx:(w:LaneWant)=>w.target??0,budget:1,slots:0};
 const resting=new Set(["S1","T1","S2"]);
 assert.deepEqual(planLaneOrders(covered,map,resting,options),[{kind:"moveStop",lane:"trail",from:95,px:98}]);
 covered[1].stop=99;
 assert.deepEqual(planLaneOrders(covered,map,resting,options)[0],{kind:"moveStop",lane:"trail",from:95,px:99});
 covered[1].stop=94;
 assert.equal(planLaneOrders(covered,map,resting,options)[0].kind,"moveTarget");
 assert.equal(map.trail.s!.px,95,"planning never marks an unconfirmed stop as updated");
 assert.deepEqual(planLaneOrders(covered,map,resting,{...options,budget:0}),[]);
});
