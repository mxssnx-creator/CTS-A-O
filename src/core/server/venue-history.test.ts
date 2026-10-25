import assert from "node:assert/strict";
import { test } from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import { CoreDb } from "./db.server.ts";
import { syncVenueIncome, venueIncomeSummary, requestVenueIncome } from "./venue-history.server.ts";

const now = 1_790_000_000_000, H = 3_600_000;
const row = (id: string, incomeType: string, income: number, time = now-1000, asset="USDT") =>
  ({ tranId:id, symbol:"BTC-USDT", incomeType, income:String(income), time, asset });

test("actual exchange cash history counts fees and signed funding once, separating transfers, assets and accounts", async () => {
  const db=new CoreDb(":memory:");
  const reply=[row("a","REALIZED_PNL",5),row("b","TRADING_FEE",-.2),row("c","FUNDING_FEE",-.4),
    row("d","TRANSFER",100),row("e","REALIZED_PNL",2,now-1000,"USDC")];
  const read=async()=>reply;
  await syncVenueIncome(db,"x02-key-a",read,()=>true,now);
  await syncVenueIncome(db,"x02-key-a",read,()=>true,now+1000);
  const summary=venueIncomeSummary(db,"x02-key-a",now-H,now);
  assert.equal(summary.complete,true);
  const usdt=summary.assets.find(a=>a.asset==="USDT")!;
  assert.equal(usdt.records,4);assert.ok(Math.abs(usdt.tradingNet-4.4)<1e-12);assert.ok(Math.abs(usdt.accountChange-104.4)<1e-12);
  assert.equal(summary.assets.find(a=>a.asset==="USDC")!.tradingNet,2);
  assert.deepEqual(venueIncomeSummary(db,"x02-key-b",now-H,now).assets,[]);
  assert.equal(venueIncomeSummary(db,"x02-key-b",now-H,now).complete,false);
  db.db.close();
});

test("full pages split into disjoint windows, survive restart and never silently skip a timestamp", async()=>{
  const dir=mkdtempSync(join(tmpdir(),"cts-income-")),file=join(dir,"history.sqlite");
  let db=new CoreDb(file);
  const records=Array.from({length:1100},(_,i)=>row(String(i),"TRADING_FEE",-.001,now-1100+i));
  const read=async(from:number,to:number,limit:number)=>records.filter(r=>r.time>=from&&r.time<=to).slice(0,limit);
  await syncVenueIncome(db,"x",read,()=>true,now,1);
  assert.equal(venueIncomeSummary(db,"x",now-150*H,now).complete,false);
  db.db.close();db=new CoreDb(file);
  for(let n=0;n<25&&!venueIncomeSummary(db,"x",now-150*H,now).complete;n++)
    await syncVenueIncome(db,"x",read,()=>true,now,4);
  const summary=venueIncomeSummary(db,"x",now-150*H,now);
  assert.equal(summary.complete,true);assert.equal(summary.assets[0].records,1100);
  assert.ok(Math.abs(summary.assets[0].tradingFees+1.1)<1e-12);
  db.db.close();rmSync(dir,{recursive:true,force:true});
});

test("hourly history reconciliation finds late older deductions and updates amounts without double counting",async()=>{
  const db=new CoreDb(":memory:");
  const rows=[row("a","REALIZED_PNL",5,now-24*H),row("b","TRADING_FEE",-.2,now-24*H)];
  const read=async(from:number,to:number)=>rows.filter(r=>r.time>=from&&r.time<=to);
  await syncVenueIncome(db,"x",read,()=>true,now);
  rows.push(row("c","SYSTEM_DEDUCTION",-.3,now-24*H),row("d","INSURANCE_CLEAR",-.4,now-24*H),row("e","UNKNOWN",-.1,now-24*H));
  rows[1].income="-0.25";
  await syncVenueIncome(db,"x",read,()=>true,now+H);
  await syncVenueIncome(db,"x",read,()=>true,now+H+30_000);
  const s=venueIncomeSummary(db,"x",now-25*H,now).assets[0];
  assert.equal(s.records,5);assert.equal(s.tradingFees,-.25);assert.ok(Math.abs(s.otherTrading+.7)<1e-12);
  assert.ok(Math.abs(s.tradingNet-4.05)<1e-12);assert.ok(Math.abs(s.accountChange-3.95)<1e-12);
  db.db.close();
});

test("malformed, rejected or late generation responses cannot publish successful coverage", async()=>{
  for(const reply of [{code:1,data:[]}, {}, [row("a","REALIZED_PNL",NaN)], [row("a","REALIZED_PNL",1,now+1)],
    [{...row("a","REALIZED_PNL",1),tranId:Number.MAX_SAFE_INTEGER+1}]]) {
    const db=new CoreDb(":memory:");
    await syncVenueIncome(db,"x",async()=>reply,()=>true,now);
    const out=venueIncomeSummary(db,"x",now-H,now);
    assert.equal(out.complete,false);assert.ok(out.error);assert.deepEqual(out.assets,[]);db.db.close();
  }
  const db=new CoreDb(":memory:");let alive=true;
  await syncVenueIncome(db,"x",async()=>{alive=false;return [row("a","REALIZED_PNL",1)]},()=>alive,now);
  assert.deepEqual(venueIncomeSummary(db,"x",now-H,now).assets,[]);db.db.close();
});

test("history scheduling returns immediately and a pending read does not overlap or publish after disposal", async()=>{
  const db=new CoreDb(":memory:");let finish!:(x:unknown)=>void,calls=0,alive=true;
  const read=()=>{calls++;return new Promise<unknown>(resolve=>{finish=resolve})};
  requestVenueIncome(db,"x",read,()=>alive,now);
  requestVenueIncome(db,"x",read,()=>alive,now+60_000);
  assert.equal(calls,1);alive=false;finish([row("a","REALIZED_PNL",1)]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(venueIncomeSummary(db,"x",now-H,now).assets,[]);db.db.close();
});
