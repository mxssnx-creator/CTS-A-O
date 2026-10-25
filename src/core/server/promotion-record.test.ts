import assert from "node:assert/strict";
import {test} from "node:test";
import {CoreDb} from "./db.server.ts";
import {ownedPromotionRecord} from "./promotion-record.server.ts";
import {executionRecordKey,ownedPaperExecutionRecords} from "../live-record.ts";
import {promotionGate} from "../live-validation.ts";

test("bounded native admission preserves exact Last-N PF, ties, unknowns and future-clock boundaries",()=>{
  const db=new CoreDb(":memory:"),now=1_790_000_000_000;
  const lane={cfg:"follow|test@m1|tp1|sl2|tr0|h15|mc",sym:"AAA-USDT",side:1};
  const rows=Array.from({length:2500},(_,i)=>({...lane,entryT:i,exitT:now-100_000+Math.floor(i/3)*100,
    unitR:i%13===0?null:i%4===0?-.01:.02,ownedNotionalUsd:i%17===0?null:10}));
  db.tx(()=>{for(const r of rows)db.run("INSERT INTO paper_book_trades(cfg,sym,side,entry_t,exit_t,unit_r,owned_notional_usd,reason) VALUES(?,?,?,?,?,?,?,'exit')",
    r.cfg,r.sym,r.side,r.entryT,r.exitT,r.unitR,r.ownedNotionalUsd);});
  const reference=ownedPaperExecutionRecords(rows).get(executionRecordKey(lane.cfg,lane.sym,lane.side));
  for(const at of [now-99_950,now-50_000,now])for(const n of [4,25,100]){
    const actual=ownedPromotionRecord(db,lane,n,at);
    const a=promotionGate(reference,actual,0,at,n,1.1),e=promotionGate(reference,reference,0,at,n,1.1);
    assert.equal(a.state,e.state);assert.equal(a.execution?.n,e.execution?.n);assert.equal(a.execution?.unknown,e.execution?.unknown);
    assert.equal(a.execution?.fromT,e.execution?.fromT);assert.equal(a.execution?.toT,e.execution?.toT);
    if(e.execution?.pf!==null)assert.ok(Math.abs(a.execution!.pf!-e.execution!.pf!)<1e-10);
  }
  const plan=db.all<{detail:string}>("EXPLAIN QUERY PLAN SELECT unit_r FROM paper_book_trades WHERE reason != 'dropped' AND cfg=? AND sym=? AND side=? AND exit_t>=0 AND exit_t<=? ORDER BY exit_t DESC,entry_t DESC LIMIT ?",lane.cfg,lane.sym,lane.side,now,25);
  assert.ok(plan.some(r=>r.detail.includes('paper_book_trades_lane_exit')));assert.ok(!plan.some(r=>r.detail.includes('TEMP B-TREE')));
  db.db.close();
});

test("ambiguous ownership and invalid clocks remain unknown; unrelated rows cannot veto a qualified lane",()=>{
  const db=new CoreDb(":memory:"),now=1_790_000_000_000,lane={cfg:"n|a|mc",sym:"AAA",side:1};
  const insert=(cfg:string,sym:string,side:number|null,entry:number,at:number,r:number|null)=>db.run(
    "INSERT INTO paper_book_trades(cfg,sym,side,entry_t,exit_t,unit_r,owned_notional_usd,reason) VALUES(?,?,?,?,?,?,10,'exit')",cfg,sym,side,entry,at,r);
  for(let i=0;i<4;i++)insert(lane.cfg,lane.sym,1,i,now-10+i,.02);
  const read=()=>ownedPromotionRecord(db,lane,4,now);
  const model=read();assert.equal(promotionGate(model,read(),0,now,4,1.1).ok,true);
  insert("other",lane.sym,0,10,now-1,null);
  assert.equal(promotionGate(model,read(),0,now,4,1.1).ok,true);
  insert(lane.cfg,lane.sym,0,11,now-1,null);
  assert.equal(promotionGate(model,read(),0,now,4,1.1).state,"unknown");
  db.run("DELETE FROM paper_book_trades WHERE side=0");
  insert(lane.cfg,lane.sym,1,12,Infinity,.02);
  assert.equal(promotionGate(model,read(),0,now,4,1.1).state,"unknown");
  db.db.close();
});
