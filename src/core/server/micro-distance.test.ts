import assert from "node:assert/strict";
import {test} from "node:test";
import {baseRangeProtects} from "../pipeline/pipeline.ts";
import {forEachMicro} from "../minimal-coord.ts";
import {DEFAULT_SETTINGS} from "../config.ts";
import {normalizeLanes} from "./runtime.server.ts";
import {checkSettings} from "../settings-check.ts";
import {protectGrid} from "../sim/walkforward.ts";

test("Micro owns the same independent floors in Base and executable grids",()=>{
 const before=normalizeLanes(structuredClone(DEFAULT_SETTINGS));
 const after=normalizeLanes({...before,minSlDistancePct:.9,microMinSlDistancePct:.07,microMinTrailDistancePct:.03});
 assert.ok(after.grid.micro);if(!after.grid.micro)return;
 assert.equal(after.grid.micro.minSl,.0007);assert.equal(after.grid.micro.minSlEval,.0007);
 assert.equal(after.grid.micro.minSlNet,undefined);assert.equal(after.grid.micro.minTrail,.0003);
 assert.ok(after.grid.minSl>after.grid.micro.minSl);
 const executable=protectGrid(5,after.grid,after.cost).filter(p=>p.tag==="mc");
 const base:{sl:number;trail:number;trailStep?:number}[]=[];
 forEachMicro(after.grid,(tp,k,tr,h,minSl,minTrail,slEval)=>base.push({sl:Math.max(tp*k,minSl,slEval??0),trail:tr?Math.max(tp*tr,minTrail):0}),after.cost);
 assert.ok(executable.length&&base.length);
 const proof=baseRangeProtects({...after.grid,baseBest:true,baseCells:true,baseTrailCells:true},after.cost).filter(p=>p.tag==="mc");
 assert.ok(proof.length&&proof.every(p=>p.sl>=.0007)&&proof.some(p=>p.sl<.01),"Base must not reapply the global floor");
 assert.ok([...executable,...base].every(p=>p.sl>=.0007&&(!p.trail||p.trail*(p.trailStep??1)>=.0003-1e-12)));
 assert.deepEqual(normalizeLanes(after).grid,after.grid,"repeated normalization cannot add cost or inherit global floors");
 for(const x of [-1,NaN,Infinity,11])assert.throws(()=>checkSettings({microMinSlDistancePct:x}));
});
