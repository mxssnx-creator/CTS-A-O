import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SIGNAL_STOP_MAX, capSignalProtect, enforceSignalPosition, ratchetTrail, signalStopAt } from "./trailing.ts";
import { simulate, trailBar } from "./backtest.ts";
import { simulateDca } from "./dca.ts";
import { simulateAxis } from "./axis.ts";
import { configId, kindOfId, laneProtect, makeUniverse, parseConfigId } from "../pipeline/pipeline.ts";
import { buildTapes, pendingAsOpen } from "./walkforward.ts";
import { signalProtects } from "../signals.ts";
import { signalSettings } from "../signal-config.ts";
import { heldSignalProtect } from "../signal-hist.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { tickTrail, carryTrail, CoreRuntime } from "../server/runtime.server.ts";
import { CoreDb } from "../server/db.server.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Bars, Protect } from "../domain/types.ts";

const M = 60_000;
const CFG = "follow|sig-ema-cross-s@m15|tp0|sl8|tr1|h50|to";
const IND = "sig-ema-cross-s@m15";
const P: Protect = { tp: 0, sl: 0.08, trail: 0.01, trailOnly: true, hold: 50 };
function bars(rows: number[][], side: 1 | -1 = 1): Bars {
  const reflect = (x: number) => side === 1 ? x : 200 - x;
  return barsFromCandles("S-USDT", 15, rows.map(([o, h, l, c], i) => ({
    t: i * 15 * M, o: reflect(o), h: reflect(side === 1 ? h : l),
    l: reflect(side === 1 ? l : h), c: reflect(c), v: 1,
  })));
}
const position = (side: 1 | -1 = 1) => ({
  cfg: CFG, side, entry: 100, stop: side === 1 ? 92 : 108, peak: 100,
  trailOn: false, trail: 0.04, trailDist: 0.04, target: 0, trailOnly: true,
});
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

describe("Signal 2% stop policy and independent peak ratios", () => {
  it("caps actual SL, activation and peak gap after scaling without widening a tighter stop", () => {
    for (const sl of [0.005, 0.02, 0.08]) for (const trail of [0.003, 0.02, 0.07])
      for (const ratio of [0.25, 0.5, 0.75, 1, 1.5, 2]) {
        const p = capSignalProtect({ ...P, sl, trail, trailStep: ratio });
        assert.ok(p.sl <= SIGNAL_STOP_MAX && p.sl <= sl);
        assert.ok(p.trail <= SIGNAL_STOP_MAX && p.trail <= trail);
        assert.ok(p.trail * (p.trailStep ?? 1) <= SIGNAL_STOP_MAX + 1e-12);
        assert.equal(p.tp, 0); assert.equal(p.trailOnly, true);
      }
    assert.equal(signalStopAt(100, 1, 101), 101);
    assert.equal(signalStopAt(100, -1, 99), 99);
    assert.equal(signalStopAt(100, 1, NaN), 98);
    assert.equal(signalStopAt(100, -1, 0), 102);
  });

  it("never accepts invalid SL/activation/ratio as a profitable configuration", () => {
    for (const sl of [0, -1, NaN, Infinity]) assert.throws(() => capSignalProtect({ ...P, sl }), /SL/);
    for (const trail of [-1, NaN, Infinity]) assert.throws(() => capSignalProtect({ ...P, trail }), /activation/);
    for (const trailStep of [0, -1, NaN, Infinity]) assert.throws(() => capSignalProtect({ ...P, trailStep }), /ratio/);
  });

  it("starts long and short entries protected at 2%, before any trailing activation", () => {
    for (const side of [1, -1] as const) for (const mode of ["normal", "trailing", "trailing-only"] as const) {
      const p = { ...P, tp: mode === "trailing-only" ? 0 : 0.1, trail: mode === "normal" ? 0 : 0.04,
        trailOnly: mode === "trailing-only" };
      const result = simulate(CFG, bars([[100,100,100,100],[100,100.1,99.9,100]], side), new Int8Array([side,0]), p, { cost: 0.0015 });
      assert.ok(result.open);
      near(result.open.stop, 100 * (1 - side * 0.02));
      assert.equal(result.open.trailOn, false);
      near(result.open.mtm, -0.0015);
      if (mode === "trailing-only") assert.equal(result.open.target, 0);
    }
  });

  it("resolves ATR then applies the cap, retaining independent ratio variants", () => {
    const b = bars([[100,100,100,100],[100,100.1,99.9,100]]);
    for (const ratio of [0.5, 0.75, 1]) {
      const p: Protect = { tp: 0.1, sl: 0.1, trail: 0.04, trailStep: ratio, hold: 100,
        atr: { sl: 2, tpRatio: 3, trail: 1.2, minSl: 0.09, minTrail: 0.09 } };
      const r = simulate(CFG, b, new Int8Array([1,0]), p, { cost: 0.0015, atr: new Float64Array([20,20]) });
      assert.ok(r.open); near(r.open.stop, 98);
      assert.ok(r.open.trail! <= 0.02); assert.ok(r.open.trailDist! <= 0.02);
      assert.ok(r.open.target > 100, "SL policy does not remove a capped-TP strategy's TP");
    }
  });

  it("hand-computes different ratios from long highs and short lows and never loosens", () => {
    for (const side of [1, -1] as const) for (const ratio of [0.5,0.75,1]) {
      const p = position(side); p.trail = 0.01; p.trailDist = 0.01 * ratio;
      const high = side === 1 ? 104 : 100;
      const low = side === 1 ? 100 : 96;
      assert.equal(ratchetTrail(p,0.01,0.01*ratio,high,low),true);
      const peak = side === 1 ? 104 : 96;
      near(p.stop, peak * (1 - side * 0.01 * ratio));
      const previous = p.stop;
      ratchetTrail(p,0.02,0.02,side === 1 ? 103 : 101,side === 1 ? 99 : 97);
      assert.equal(p.stop, previous);
      assert.equal(p.peak, peak);
    }
  });

  it("caps the absolute peak gap at 2% of entry even after a 50% rally", () => {
    const p = position(); ratchetTrail(p,0.02,0.02,150,100);
    assert.equal(p.peak,150); assert.equal(p.stop,148);
  });

  it("does not use a current bar's new peak to close retroactively in that bar", () => {
    const b=bars([[100,100,100,100],[100,104,99,103],[104,104,101,102]]);
    const result=simulate(CFG,b,new Int8Array([1,0,0]),P,{cost:0.0015});
    assert.equal(result.trades.length,1); assert.equal(result.trades[0].exitT,45*M);
    assert.equal(result.trades[0].reason,"trail"); near(result.trades[0].exit,102.96);
    near(result.trades[0].r,(102.96-100)/100-0.0015);
  });

  it("reports gaps honestly rather than clamping a stop-loss fill or PF to 2%", () => {
    const b=bars([[100,100,100,100],[100,100.1,99.9,100],[95,96,94,95]]);
    const result=simulate(CFG,b,new Int8Array([1,0,0]),P,{cost:0.0015});
    assert.equal(result.trades[0].exit,95); near(result.trades[0].r,-0.0515);
  });

  it("preserves Ordinary trailing behavior and refuses malformed bars without corrupting peaks", () => {
    const p={...position(),cfg:"follow|rsi-mid@m15|tp10|sl8|tr4|h50",trailOnly:false};
    assert.equal(trailBar(p,0.04,0.04,104,99),true); near(p.stop,104*0.96);
    const snapshot=structuredClone(p);
    for(const [h,l] of [[Infinity,90],[NaN,90],[90,91],[-1,-2]]) {
      assert.equal(trailBar(p,0.04,0.04,h,l),false); assert.deepEqual(p,snapshot);
    }
  });

  it("keeps scalar ratios and trail-free mode in distinct round-trippable config identities", () => {
    const ids=new Set<string>();
    for(const noTp of [false,true]) for(const step of [0.5,0.75,1,1.5]) {
      const p={...P,tp:noTp?0:0.06,trailOnly:noTp,trailStep:step};
      const id=configId("follow",IND,p); ids.add(id);
      const parsed=parseConfigId(id); assert.ok(parsed);
      assert.equal(parsed.protect.trailStep??1,step);
      assert.equal(kindOfId(id),noTp?"trailing-only":"trailing");
      assert.equal(configId("follow",IND,parsed.protect),id);
      assert.equal(configId("follow",IND,laneProtect(heldSignalProtect(id)!.protect,IND)),id);
    }
    assert.equal(ids.size,8);
    const capped={...P,tp:0.05,trailOnly:false};
    const free=configId("follow",IND,{...capped,trailFree:true});
    assert.notEqual(free,configId("follow",IND,capped));
    assert.equal(parseConfigId(free)?.protect.trailFree,true);
    for(const bad of ["|ts0","|tsNaN","|ts0.5|ts0.75","|tf1|tf1"])
      assert.equal(parseConfigId(configId("follow",IND,capped)+bad),null);
  });

  it("builds independent ratio variants without multiplying the Normal fixed grid", () => {
    const scalar=signalSettings({ exits:"pct", minTrail:0, trailingOnly:{enabled:true,sl:[0.01],trail:[0.01],trailStep:1},
      normal:{tp:[0.02],slOfTp:[1]}, trailing:{tp:[0.02],slOfTp:1,trailOfTp:[0.5]} });
    const sig=signalSettings({...scalar,trailRatios:[0.5,0.75,1]});
    const variants=signalProtects(sig);
    assert.equal(variants.filter(p=>p.trail===0).length,1);
    assert.equal(variants.filter(p=>p.trailOnly).length,3);
    assert.equal(variants.filter(p=>p.trail>0&&!p.trailOnly).length,3);
    assert.equal(new Set(variants.map(p=>configId("follow",IND,p))).size,7);
    checkSettings({signals:sig} as never);
    for(const trailRatios of [[0],[3],[NaN],[0.5,0.5]])
      assert.throws(()=>checkSettings({signals:{...sig,trailRatios}} as never),/ratios/);
  });

  it("applies the actual cap after lane scaling and feedback in every tape", () => {
    const cs=syntheticCandles("S-USDT",15,500,Date.UTC(2026,9,18),2);
    const u=makeUniverse([barsFromCandles("S-USDT",15,cs)]);
    const protects=signalProtects(signalSettings({trailRatios:[0.5,0.75,1]}));
    const ts=buildTapes(u,protects,0.0015,undefined,new Set(["follow|"+IND]),null,null,{minSl:0.05,minTrail:0.05});
    assert.ok(ts.length>0); assert.equal(new Set(ts.map(t=>t.id)).size,ts.length);
    for(const tp of ts) {
      assert.ok(tp.protect.sl<=0.03); assert.ok(tp.protect.trail<=0.03);
      for(const op of tp.open) assert.ok(op.side*(op.entry-op.stop)/op.entry<=0.03+1e-12);
    }
  });

  it("repairs restored and first-tick Signal stops without enabling another strategy or widening profits", () => {
    for(const side of [1,-1] as const) {
      const p=position(side); assert.equal(tickTrail(p,100,0,15*M),true);
      near(p.stop,100*(1-side*.02)); assert.ok(p.trail!<=.02);
      const already={...p,stop:100+side}; enforceSignalPosition(already); near(already.stop,100+side);
      const db=new CoreDb(":memory:");
      db.kvSet("paperBook",{positions:[{...position(side),trail:undefined,trailDist:undefined}],selected:[]});
      const rt=new CoreRuntime(db,undefined,{market:"synthetic"});
      const op=rt.paper.positions[0]; assert.ok(op); near(op.stop,100*(1-side*.02));
      assert.ok(op.trail!<=.02 && op.trailDist!<=.02); assert.equal(op.cfg,CFG);
      rt.dispose();
      const carried=carryTrail(p,{...p,stop:100+side,peak:100+side*3,trailOn:true});
      near(carried.stop!,100+side);
    }
  });

  it("does not fill deeper Signal DCA rungs beyond an already resting capped stop", () => {
    for(const side of [1,-1] as const) {
      const b=bars([[100,100,100,100],[100,101,94,96]],side);
      const r=simulateDca(CFG+"|dca",b,new Int8Array([side,0]),{...P,tp:.1},
        {...DEFAULT_SETTINGS.dca,levels:4,step:.05,stepOfTp:0},false,.0015);
      assert.equal(r.trades.length,1); assert.equal(r.trades[0].vol,1);
      near(r.trades[0].exit,100*(1-side*.02)); near(r.trades[0].r,-.0215);
    }
  });

  it("caps Signal Axis fixed and managed entry stops independently of ATR and ladder depth", () => {
    for(const side of [1,-1] as const) for(const exits of ["fixed","managed"] as const) {
      const b=bars([[100,100,100,100],[100,101,99,100]],side);
      const ax={...DEFAULT_SETTINGS.axis,exits,spacing:1,levels:4,minDisp:.1,maxDisp:3};
      const r=simulateAxis(CFG+"|axis",b,new Int8Array([side,0]),{...P,tp:.1,sl:.1},ax,
        new Float64Array([100+side*10,100+side*10]),new Float64Array([10,10]),.0015,0,{minSl:.1,slMult:3});
      assert.ok(r.open); assert.ok(side*(r.open.entry-r.open.stop)/r.open.entry<=.02+1e-12);
    }
  });

  it("does not enable a TP for a pending trailing-only Signal while applying the initial cap",()=>{
    for(const side of [1,-1] as const) {
      const [p]=pendingAsOpen({id:CFG,ind:IND,kind:"trailing-only",protect:P,pending:[{sym:"S-USDT",side}]},15*M,1,()=>100,.0015);
      near(p.stop,100*(1-side*.02)); assert.equal(p.target,0); near(p.mtm,-.0015);
    }
  });
});
