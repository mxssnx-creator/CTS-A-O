import assert from "node:assert/strict";
import { it } from "node:test";
import { scalarCoverage, coverageTape } from "./audit-signal-coverage.mjs";
import { configId } from "../src/core/pipeline/pipeline.ts";
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
