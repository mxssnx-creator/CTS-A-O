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

test("explicit malformed instance IDs cannot silently adopt the project-wide namespace",()=>{
 const before=process.env.CTS_CORE_LIVE_TAG;
 try{
  delete process.env.CTS_CORE_LIVE_TAG;
  for(const connection of Object.keys(LIVE_TAG) as Array<keyof typeof LIVE_TAG>){
   const prefix=LIVE_TAG[connection].slice(0,-1);
   for(const value of [prefix+"_N12_",prefix+"-N12_",prefix+"N12",prefix+"123456789012_"])
    assert.throws(()=>liveTag(connection,{CTS_CORE_LIVE_TAG:value}),/letters\/digits/,value);
   const tag=prefix+"N12_";
   assert.equal(liveTag(connection,{CTS_CORE_LIVE_TAG:tag.toLowerCase()}),tag);
   process.env.CTS_CORE_LIVE_TAG=tag;
   const id=makeCoid(connection,"E");assert.ok(id.startsWith(tag));assert.equal(isOwnCoid(id,connection),true);
   process.env.CTS_CORE_LIVE_TAG=prefix+"ALT_";assert.equal(isOwnCoid(id,connection),false);
  }
 }finally{if(before===undefined)delete process.env.CTS_CORE_LIVE_TAG;else process.env.CTS_CORE_LIVE_TAG=before}
});
