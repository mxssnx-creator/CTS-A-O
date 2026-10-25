import assert from 'node:assert/strict';
import {CoreDb} from '../src/core/server/db.server.ts';
import {ownedPromotionRecord} from '../src/core/server/promotion-record.server.ts';
import {executionRecordKey,ownedPaperExecutionRecords} from '../src/core/live-record.ts';
import {promotionGate} from '../src/core/live-validation.ts';
const db=new CoreDb(':memory:'),now=1_790_000_000_000,rows=100_000,iterations=20;
db.tx(()=>{for(let i=0;i<rows;i++)db.run("INSERT INTO paper_book_trades(cfg,sym,side,entry_t,exit_t,unit_r,owned_notional_usd,reason) VALUES(?,?,1,?,?,?,10,'exit')",
  `cfg-${i%1000}`,'AAA',i,now-1_000_000+i,i%7===0?-.01:.02);});
const timings={full:[],bounded:[]};
let compared=0;
for(let i=0;i<iterations;i++){
  const lane={cfg:`cfg-${i}`,sym:'AAA',side:1};
  db.run("INSERT INTO paper_book_trades(cfg,sym,side,entry_t,exit_t,unit_r,owned_notional_usd,reason) VALUES(?,?,1,?,?,?,10,'exit')",
    lane.cfg,lane.sym,rows+i,now-100+i,i%3===0?-.01:.02);
  const start=performance.now();
  const all=db.all("SELECT cfg,sym,side,exit_t,unit_r,owned_notional_usd FROM paper_book_trades WHERE reason != 'dropped' AND exit_t IS NOT NULL ORDER BY cfg,sym,side,entry_t");
  const full=ownedPaperExecutionRecords(all.map(r=>({cfg:r.cfg,sym:r.sym,side:r.side,exitT:r.exit_t,unitR:r.unit_r,ownedNotionalUsd:r.owned_notional_usd}))).get(executionRecordKey(lane.cfg,lane.sym,lane.side));
  timings.full.push(performance.now()-start);
  const begin=performance.now(),bounded=ownedPromotionRecord(db,lane,25,now);
  timings.bounded.push(performance.now()-begin);
  const a=promotionGate(full,full,0,now,25,1.1),b=promotionGate(full,bounded,0,now,25,1.1);
  assert.equal(a.ok,b.ok);assert.equal(a.execution.n,b.execution.n);assert.ok(Math.abs(a.execution.pf-b.execution.pf)<1e-10);compared++;
}
const summary=xs=>({medianMs:xs.toSorted((a,b)=>a-b)[Math.floor(xs.length/2)],maxMs:Math.max(...xs)});
console.log(JSON.stringify({scope:'Synthetic indexed read benchmark; not exchange latency or profitability evidence',rows,iterations,compared,
  full:summary(timings.full),bounded:summary(timings.bounded),peakRssMiB:process.resourceUsage().maxRSS/1024,node:process.version},null,2));
db.db.close();
