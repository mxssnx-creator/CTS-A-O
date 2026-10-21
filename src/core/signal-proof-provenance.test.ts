import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoreRuntime} from './server/runtime.server.ts';
import {signalProven} from './live-validation.ts';
import {CoreDb} from './server/db.server.ts';
test('Signal proof retains unknown legacy/funded losses and never substitutes volume or a nonfinite multiplier',()=>{
 const db=new CoreDb(':memory:');
 const r=new CoreRuntime(db,{live:{enabled:false,signalProofN:3,signalProofPf:1.1,signalProofEvents:1}}, {market:'synthetic',priceStream:null});
 const cfg='follow|sig-ema-cross-s@m5|tp1|sl2|tr0|h32',now=Date.now();
 try {
  for(let i=0;i<3;i++)db.run('INSERT INTO paper_book_trades(cfg,sym,side,entry_t,exit_t,r,vol,mult,reason) VALUES (?,?,?,?,?,?,?,?,?)',cfg,'A-USDT',1,now-(10-i)*60_000,now-(9-i)*60_000,i===1?-.005:.01,1,null,'exit');
  assert.equal(r.signalProof(now)!.proven.size,0,'volume is not multiplier provenance');
  db.run('UPDATE paper_book_trades SET mult=1');
  assert.ok(r.signalProof(now)!.proven.has('sig-ema-cross-s@m5|1'));
  db.run('UPDATE paper_book_trades SET mult=? WHERE r<0',Infinity);
  assert.equal(r.signalProof(now)!.proven.size,0,'the recent unknown loss stays in the window');
  db.run('UPDATE paper_book_trades SET mult=1,owned_notional_usd=10');
  assert.equal(r.signalProof(now)!.proven.size,0,'an explicit funded NULL unit return stays unknown');
  db.run('UPDATE paper_book_trades SET unit_r=r');
  assert.ok(r.signalProof(now)!.proven.has('sig-ema-cross-s@m5|1'));
 } finally {r.dispose();db.db.close()}
});


test('a recent unknown exchange Signal return cannot fall back to older known paper wins',()=>{
 const now=Date.now(),cfg='follow|sig-ema-cross-s@m5|tp1|sl2|tr0|h32';
 const paper=Array.from({length:3},(_,i)=>({id:String(now-(10-i)*60_000),cfg,sym:'A-USDT',side:1,exitT:now-(9-i)*60_000,r:.01}));
 const exchange=[{...paper[0],id:String(now-60_000),exitT:now-1,r:null}];
 const result=signalProven(paper,exchange,now,{n:3,minPf:1.1,minEvents:1});
 assert.equal(result.proven.size,0); assert.equal(result.unknown,1);
});
