import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, mergeGateSettings } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { DEFAULT_POSITION_WINDOWS, positionCounts } from "../position-windows.ts";
import { sigActiveKey } from "../signals.ts";
import { defaultWalkForward, makeTape, positionConfigEval, walkForward } from "./walkforward.ts";

test("Signal Main uses 15 own closes without changing ordinary, Real, Entry or explicit overrides", () => {
  const at = Date.UTC(2026, 10, 16), ind = "sig-count-fixture-s@m1";
  const id = `follow|${ind}|tp1|sl1|tr0|h24`;
  const rows: Trade[] = Array.from({ length: 15 }, (_, i) => ({ cfg: id, sym: "A", side: 1,
    entryT: at - (15 - i) * 60_000, exitT: at - (15 - i) * 60_000 + 1,
    entry: 100, exit: 102, r: i === 0 ? -.001 : .02, mult: 1, kind: "normal",
    reason: i === 0 ? "sl" : "tp", bars: 1, mfe: 0, mae: 0 }));
  const tape = makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 24 },
    "normal", ["A", "B"], rows, [], []);
  const o = defaultWalkForward(DEFAULT_SETTINGS);
  assert.deepEqual(positionCounts(DEFAULT_POSITION_WINDOWS, "sig"),
    { base: 40, main: 15, real: 12, entry: 12 });
  assert.equal(positionCounts(DEFAULT_POSITION_WINDOWS, "mn").main, 40);
  assert.equal(positionConfigEval(tape, rows[14].exitT, o, "A", 1).ok, false,
    "a close at the decision clock is not yet settled");
  assert.equal(positionConfigEval(tape, at, o, "A", 1).ok, true);
  assert.equal(positionConfigEval(tape, at, o, "A", -1).ok, false);
  assert.equal(positionConfigEval(tape, at, o, "B", 1).ok, false);
  const custom = { ...o, gates: { ...o.gates, positionWindows: { ...DEFAULT_POSITION_WINDOWS,
    byRange: { ...DEFAULT_POSITION_WINDOWS.byRange, sig: { main: 40 } } } } };
  assert.equal(positionConfigEval(tape, at, custom, "A", 1).ok, false,
    "an explicit saved Signal Main policy remains authoritative");
  const losing = makeTape(id, "follow", ind, tape.protect, "normal", ["A", "B"],
    rows.map(row => ({ ...row, r: -.02 })), [], []);
  assert.equal(positionConfigEval(losing, at, o, "A", 1).ok, false);
});

test("a saved inherited Main-40 range map receives Signal 15 without replacing explicit custom windows", () => {
  const old = { ...DEFAULT_POSITION_WINDOWS, byRange: { mc: { base: 30 }, mn: { base: 30 } } };
  const merged = mergeGateSettings(DEFAULT_SETTINGS.gates, { positionWindows: old }).positionWindows!;
  assert.equal(positionCounts(merged, "sig").main, 15);
  assert.equal(positionCounts(merged, "wide").main, 40);
  const explicit = mergeGateSettings(DEFAULT_SETTINGS.gates, { positionWindows: {
    ...old, byRange: { ...old.byRange, sig: { main: 21 } }, byConfig: { special: { main: 8 } } } }).positionWindows!;
  assert.equal(positionCounts(explicit, "sig").main, 21);
  assert.equal(positionCounts(explicit, "sig", "special").main, 8);
  const custom = mergeGateSettings(DEFAULT_SETTINGS.gates, { positionWindows: { ...old, main: 30 } }).positionWindows!;
  assert.equal(positionCounts(custom, "sig").main, 30);
});

test("a Base-admitted inactive Signal learns its own stages without funding", () => {
  const H=3_600_000,M=60_000,start=Date.UTC(2026,10,16),ind="sig-count-fixture-s@m1",sym="OWN-USDT";
  const id=`follow|${ind}|tp1|sl1|tr0|h24`;
  const row=(entryT:number):Trade=>({cfg:id,sym,side:1,entryT,exitT:entryT+M,entry:100,exit:102,
    r:.02,mult:1,kind:"normal",reason:"tp",bars:1,mfe:0,mae:0});
  const history=Array.from({length:15},(_,i)=>row(start-(30-i*2)*M));
  const future=Array.from({length:6},(_,i)=>row(start+(1+i*2)*M));
  const tape=makeTape(id,"follow",ind,{tp:.01,sl:.01,trail:0,hold:24},"normal",[sym],[...history,...future],[],[]);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,symGate:"off" as const,rangeGate:undefined,signalRank:undefined,
    signalBasePassed:new Set([`follow|${ind}`]),signalActive:new Set<string>(),signalOwnBase:true,
    toggles:{...d.toggles,normal:false,block:true,blockActive:true},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:1,realN:1}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[tape],o),own=result.processedStages!.sets[0];
  assert.equal(own.stages.postBase.closedOrders,6);
  assert.equal(own.stages.active.openedOrders,0);
  assert.ok((own.deferredActive??0)>0);
  assert.equal(result.trades.length,0);
  const denied=walkForward(u,[tape],{...o,signalBasePassed:new Set<string>()});
  assert.equal(denied.processedStages!.sets.length,0);
});

for (const side of [1, -1] as const)
  test(`Signal ${side}: Main-15 advances through both 12-close processed stages with Ordinary off`, () => {
    const H = 3_600_000, M = 60_000, start = Date.UTC(2026, 10, 16), ind = "sig-count-fixture-s@m1";
    const id = `follow|${ind}|tp1|sl1|tr0|h24`, sym = "OWN-USDT";
    const row = (entryT: number, r: number): Trade => ({ cfg: id, sym, side, entryT, exitT: entryT + M,
      entry: 100, exit: 100 * (1 + side * r), r, mult: 1, kind: "normal", reason: r < 0 ? "sl" : "tp",
      bars: 1, mfe: 0, mae: 0 });
    const history = Array.from({ length: 15 }, (_, i) => row(start - (30 - i * 2) * M, i === 0 ? -.001 : .02));
    const future = Array.from({ length: 30 }, (_, i) => row(start + (1 + i * 2) * M, .02));
    const tape = makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 24 }, "normal", [sym],
      [...history, ...future], [], []);
    const d = defaultWalkForward(DEFAULT_SETTINGS);
    const o = { ...d, preH: 12, longH: 12, simH: 12, startT: start, mode: "fixed" as const,
      seatPer: "config" as const, portfolio: 0, maxPositions: 0, maxOpen: 1, symGate: "off" as const,
      toggles: { ...d.toggles, normal: false, block: true, blockActive: true },
      signalOwnBase: true, signalRank: undefined,
      signalActive: new Set([sigActiveKey("follow", ind, sym, side, "normal", id)]),
      coord: { ...d.coord!, enabled: false }, engineSideAccept: undefined,
      processedStages: { validationN: 12, realN: 12 } };
    const u = { bars: [], caches: [], startT: start - 12 * H, endT: start + 12 * H,
      splitT: start, nowT: start + 12 * H, baseTf: 1 } as never;
    const result = walkForward(u, [tape], o);
    assert.equal(result.trades.length, 6);
    assert.equal(result.trades[0].entryT, future[24].entryT);
    const stages = result.processedStages!.sets[0].stages;
    assert.equal(stages.postBase.closedOrders, 30);
    assert.equal(stages.validated.closedOrders, 18);
    assert.equal(stages.active.closedOrders, 6);
    assert.ok(result.trades.every(tr => tr.side === side));
  });

test("Signal stage research continues while own acceptance and loss guards block funded entries", () => {
  const H=3_600_000,M=60_000,start=Date.UTC(2026,10,16),ind="sig-continuous-research-s@m1",sym="OWN-USDT";
  const id=`follow|${ind}|tp1|sl1|tr0|h24`;
  const rows: Trade[] = Array.from({length:20},(_,i)=>({cfg:id,sym,side:1,entryT:start+(1+i*2)*M,
    exitT:start+(2+i*2)*M,entry:100,exit:98,r:-.02,mult:1,kind:"normal",reason:"sl",bars:1,mfe:0,mae:0}));
  const tape=makeTape(id,"follow",ind,{tp:.01,sl:.01,trail:0,hold:24},"normal",[sym],rows,[],[]);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,symGate:"off" as const,rangeGate:undefined,signalRank:undefined,
    signalBasePassed:new Set([`follow|${ind}`]),signalActive:new Set<string>(),signalOwnBase:true,
    signalGuardN:2,signalAccept:{enabled:true,minPf:1.3,hours:48,minTrades:6},signalCluster:undefined,
    toggles:{...d.toggles,normal:false,block:true,blockActive:true},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[tape],o),own=result.processedStages!.sets[0];
  assert.ok(own, 'Base-proven Signals must collect stage samples');
  assert.equal(own.stages.postBase.closedOrders,rows.length);
  assert.equal(own.stages.postBase.returnPf,0,'losses remain in their own window');
  assert.equal(own.stages.active.openedOrders,0,'research is never a funded admission');
  assert.equal(result.trades.length,0);
});

test("mature Signal stage windows do not bypass their own funded acceptance gate", () => {
  const H=3_600_000,M=60_000,start=Date.UTC(2026,10,16),ind="sig-guarded-research-s@m1",sym="OWN-USDT";
  const id=`follow|${ind}|tp1|sl1|tr0|h24`;
  const row=(entryT:number,i:number):Trade=>({cfg:id,sym,side:1,entryT,exitT:entryT+M,
    entry:100,exit:i%2?99.5:102,r:i%2?-.005:.02,mult:1,kind:"normal",reason:i%2?"sl":"tp",bars:1,mfe:0,mae:0});
  const history=Array.from({length:15},(_,i)=>row(start-(30-i*2)*M,i));
  const future=Array.from({length:20},(_,i)=>row(start+(1+i*2)*M,i));
  const tape=makeTape(id,"follow",ind,{tp:.01,sl:.01,trail:0,hold:24},"normal",[sym],[...history,...future],[],[]);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,symGate:"off" as const,rangeGate:undefined,signalRank:undefined,
    signalBasePassed:new Set([`follow|${ind}`]),signalActive:new Set([sigActiveKey("follow",ind,sym,1,"normal",id)]),signalOwnBase:true,
    signalGuardN:0,signalAccept:{enabled:true,minPf:10,hours:48,minTrades:6},signalCluster:undefined,
    toggles:{...d.toggles,normal:true,block:false,blockActive:false},
    coord:{...d.coord!,enabled:false},engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[tape],o),own=result.processedStages!.sets[0];
  assert.equal(own.stages.postBase.closedOrders,future.length);
  assert.ok(own.stages.validated.closedOrders>=2);
  assert.equal(own.stages.active.openedOrders,0);
  assert.equal(result.trades.length,0,'a ready research context is not permission to bypass its gate');
});

test("Signal stage learning advances without ordinary confirmation but never funds an unconfirmed entry", () => {
  const H=3_600_000,M=60_000,start=Date.UTC(2026,10,16),ind="sig-confirm-research-s@m1",sym="OWN-USDT";
  const id=`follow|${ind}|tp1|sl1|tr0|h24`;
  const row=(entryT:number):Trade=>({cfg:id,sym,side:1,entryT,exitT:entryT+M,entry:100,exit:102,
    r:.02,mult:1,kind:"normal",reason:"tp",bars:1,mfe:0,mae:0});
  const history=Array.from({length:15},(_,i)=>row(start-(30-i*2)*M));
  const future=Array.from({length:12},(_,i)=>row(start+(1+i*2)*M));
  const tape=makeTape(id,"follow",ind,{tp:.01,sl:.01,trail:0,hold:24},"normal",[sym],[...history,...future],[],[]);
  const d=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...d,preH:12,longH:12,simH:1,startT:start,mode:"fixed" as const,seatPer:"config" as const,
    portfolio:0,maxPositions:0,symGate:"off" as const,rangeGate:undefined,signalRank:undefined,
    signalBasePassed:new Set([`follow|${ind}`]),signalActive:new Set([sigActiveKey("follow",ind,sym,1,"normal",id)]),signalOwnBase:true,
    signalGuardN:0,signalAccept:undefined,signalCluster:undefined,
    toggles:{...d.toggles,normal:true,block:false,blockActive:false},
    coord:{...d.coord!,enabled:true,confirm:true,hourLock:0,cooldown:"off" as const,conflict:false},
    engineSideAccept:undefined,processedStages:{validationN:2,realN:2}};
  const u={bars:[],caches:[],startT:start-12*H,endT:start+H,splitT:start,nowT:start+H,baseTf:1} as never;
  const result=walkForward(u,[tape],o),own=result.processedStages!.sets[0];
  assert.ok(own,'Base-proven unconfirmed Signal still needs independent samples');
  assert.equal(own.stages.postBase.closedOrders,future.length);
  assert.ok(own.stages.validated.closedOrders>=2);
  assert.equal(own.stages.active.openedOrders,0);
  assert.equal(result.trades.length,0,'confirmation still applies to actual execution');
});
