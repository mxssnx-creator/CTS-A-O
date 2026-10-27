import { describe,it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { reconcileVenueFees } from "./fill-fees.ts";
import { fakeRt, SimExchange, lane } from "../test-support.ts";
import { liveKv, parseFill, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";

describe("late owned venue commissions",()=>{
  it("reconciles after hard protection; a failed fee-history read never loses an owned fill or its stop",async()=>{
    const old=process.env.CTS_CORE_LIVE;process.env.CTS_CORE_LIVE="1";
    try{for(const fail of [false,true]){
      const {rt}=fakeRt();const venue=new SimExchange();venue.px.set("S0-USDT",10);
      rt.paper.positions=[lane("follow|ema-9-21@m15|tp2|sl2|tr0|h32","S0-USDT",1,10)];
      const place=venue.order.bind(venue);
      venue.order=async p=>{const response=await place(p) as {order?:Record<string,unknown>};if(response.order){delete response.order.commission;delete response.order.fee;}return response;};
      let calls=0;
      const ex=Object.assign(venue,{feeHistory:async()=>{
        calls++;assert.ok(venue.orders.some(o=>o.type==="STOP_MARKET"),"protection precedes fee history");
        if(fail)throw new Error("fee history unavailable");
        return rt.db.all<{coid:string;qty:number;fill_px:number; sym:string}>("SELECT coid,qty,fill_px,sym FROM live_fills").map(x=>receipt(x.coid,{symbol:x.sym,executedQty:x.qty,avgPrice:x.fill_px}));
      }}) as ExchangeClient;
      const result=await stepLive(rt as never,[],1,ex);assert.equal(result.error,null);assert.equal(calls,1);
      assert.equal(rt.db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,fail?0:1);
      assert.equal(venue.positions.size,1);assert.ok(venue.orders.some(o=>o.type==="STOP_MARKET"));
      if(fail)assert.match(liveKv<{error:string}>(rt.db,"liveFeeStatus")!.error,/unavailable/);
      resetLiveBackoff();
    }}finally{if(old===undefined)delete process.env.CTS_CORE_LIVE;else process.env.CTS_CORE_LIVE=old;resetLiveBackoff();}
  });
  const own=(id:string)=>id.toUpperCase().startsWith("QA_");
  const seed=(db:CoreDb,id:string,qty=2,px=100,known=0,fee:number|null=null)=>db.run(
    "INSERT INTO live_fills(coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    id,"ETH-USDT",1,"O",qty,100,px,fee,known,1);
  const seedNative=(db:CoreDb)=>{
    seed(db,"lanefill-QA_A");
    db.run("UPDATE live_fills SET kind='R' WHERE coid=?","lanefill-QA_A");
    db.run("INSERT INTO live_orders(coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      "QA_A","owner","ETH-USDT",1,"V",2,100,"ok","owner",1);
  };
  const receipt=(coid:string,patch:Record<string,unknown>={})=>({clientOrderID:coid.toLowerCase(),symbol:"ETH-USDT",positionSide:"LONG",executedQty:2,avgPrice:100,commission:"-0.1",status:"FILLED",...patch});
  it("matches case-insensitive own IDs, actual cumulative scope and explicit zero fees",()=>{
    const db=new CoreDb();seed(db,"QA_A");seed(db,"QA_B");seed(db,"FOREIGN");
    assert.equal(reconcileVenueFees(db,[receipt("QA_A"),receipt("QA_B",{commission:0}),receipt("FOREIGN")],own),2);
    assert.deepEqual(db.all("SELECT coid,fee,fee_known FROM live_fills ORDER BY coid").map(row=>({...row as object})),[
      {coid:"FOREIGN",fee:null,fee_known:0},{coid:"QA_A",fee:.1,fee_known:1},{coid:"QA_B",fee:0,fee_known:1}]);
    assert.equal(reconcileVenueFees(db,[receipt("QA_B",{commission:""})],own),0);
  });
  it("does not apply a larger cumulative fee, wrong price, wrong symbol/side or unknown commission",()=>{
    for(const patch of [{executedQty:4},{avgPrice:101},{symbol:"BTC-USDT"},{positionSide:"SHORT"},{commission:""},{commission:NaN}]){
      const db=new CoreDb();seed(db,"QA_A");assert.equal(reconcileVenueFees(db,[receipt("QA_A",patch)],own),0);
      assert.equal(db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,0);
    }
  });
  it("never overwrites an already measured commission from a sparse or contradictory old receipt",()=>{
    const db=new CoreDb();seed(db,"QA_A",2,100,1,0);
    assert.equal(reconcileVenueFees(db,[receipt("QA_A")],own),0);
    assert.equal(db.get<{fee:number}>("SELECT fee FROM live_fills")!.fee,0);
  });
  it("reconciles a native reduction's unknown commission from its original venue client id exactly once",()=>{
    const db=new CoreDb();
    seedNative(db);
    const native=receipt("QA_A",{positionSide:"LONG",side:"SELL",type:"STOP_MARKET",commission:"-0.08"});
    assert.equal(reconcileVenueFees(db,[native],own),1);
    assert.deepEqual({...db.get("SELECT fee,fee_known FROM live_fills WHERE coid=?","lanefill-QA_A")!},{fee:.08,fee_known:1});
    assert.equal(reconcileVenueFees(db,[native],own),0);
  });
  it("leaves native fees unknown for mismatched fill identity, scope or contradictory quantity",()=>{
    const bad=[{clientOrderID:"QA_OTHER"},{side:"BUY"},{positionSide:"SHORT"},{positionSide:undefined},
      {type:"MARKET"},{type:"TAKE_PROFIT_MARKET"},{type:undefined},{executedQty:1},{avgPrice:101},{cumExecQty:1},{commission:""},{fee:0.2}];
    for(const patch of bad){
      const db=new CoreDb();seedNative(db);
      const native=receipt("QA_A",{positionSide:"LONG",side:"SELL",type:"STOP_MARKET",...patch});
      assert.equal(reconcileVenueFees(db,[native],own),0,JSON.stringify(patch));
      assert.equal(db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,0);
    }
  });
  it("keeps native fees unknown for conflicting equal-time or regressing cumulative receipts",()=>{
    for(const later of [{commission:"-0.2"},{status:"NEW"},{executedQty:3,updateTime:99}]){
      const db=new CoreDb();seedNative(db);
      const current=receipt("QA_A",{positionSide:"LONG",side:"SELL",type:"STOP_MARKET",updateTime:100});
      assert.equal(reconcileVenueFees(db,[current,current,{...current,...later}],own),0,JSON.stringify(later));
      assert.equal(db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,0);
    }
  });
  it("rejects contradictory earlier native identity and fill evidence",()=>{
    for(const patch of [{symbol:"BTC-USDT"},{side:"BUY"},{positionSide:"SHORT"},{type:"TAKE_PROFIT_MARKET"},{cumExecQty:1}]){
      const db=new CoreDb();seedNative(db);
      const current=receipt("QA_A",{positionSide:"LONG",side:"SELL",type:"STOP_MARKET",updateTime:100});
      assert.equal(reconcileVenueFees(db,[current,{...current,...patch,updateTime:99}],own),0,JSON.stringify(patch));
      assert.equal(db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,0);
    }
  });
  it("never treats conflicting commission aliases on a direct fill as measured",()=>{
    assert.equal(parseFill({order:{executedQty:1,avgPrice:100,commission:-0.1,fee:0.2}})?.fee,null);
    assert.equal(parseFill({order:{executedQty:1,avgPrice:100,commission:-0.1,fee:0.1}})?.fee,0.1);
  });
  it("requires the original native order identity before reconciling its reduction fee",()=>{
    const db=new CoreDb();seed(db,"lanefill-QA_A");
    db.run("UPDATE live_fills SET kind='R' WHERE coid=?","lanefill-QA_A");
    const native=receipt("QA_A",{positionSide:"LONG",side:"SELL",type:"STOP_MARKET"});
    assert.equal(reconcileVenueFees(db,[native],own),0);
    assert.equal(db.get<{fee_known:number}>("SELECT fee_known FROM live_fills")!.fee_known,0);
  });
});
