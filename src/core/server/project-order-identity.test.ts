import assert from "node:assert/strict";
import {test} from "node:test";
import {LIVE_TAG,liveTag,makeCoid,isOwnCoid,ownCoidKind} from "./live.ts";
test("project and connection IDs reject every other CTS namespace for entries and controls",()=>{
 const previous=process.env.CTS_CORE_LIVE_TAG;delete process.env.CTS_CORE_LIVE_TAG;
 try{
  const foreign=["CTSAV2_", "CTSXV2_", "ctsc_abcd", "Gx02abc", "knabc123entry", "ktabc123mentry"];
  for(const connection of Object.keys(LIVE_TAG) as Array<keyof typeof LIVE_TAG>){
   for(const kind of ["E","S","T","C","V","Y"] as const){const id=makeCoid(connection,kind);assert.equal(isOwnCoid(id,connection),true);assert.equal(ownCoidKind(id,connection),kind);assert.ok(id.length<=40)}
   for(const id of foreign)assert.equal(isOwnCoid(id,connection),false,id);
   for(const id of foreign.filter(x=>x.endsWith("_")))assert.throws(()=>liveTag(connection,{CTS_CORE_LIVE_TAG:id}),/another CTS/);
  }
 }finally{if(previous===undefined)delete process.env.CTS_CORE_LIVE_TAG;else process.env.CTS_CORE_LIVE_TAG=previous}
});
