import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const H = 3_600_000, M = 60_000, T = Math.floor(Date.now() / H) * H;
const ind = "ema-9-21@m1", protect = { tp: .0215, sl: .0085, trail: 0, hold: 60, tag: "mn" as const };
for (const kind of ["normal", "axis"] as const) test(`${kind}: runtime reevaluates newly mature own histories after an empty simulation`, () => {
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    const cfg = configId("follow", ind, protect, kind), sym = "OWN-USDT";
    const d = defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf = { ...d, preH: 12, longH: 12, simH: 12, mode: "fixed", seatSet: "validated", seatPer: "config",
      portfolio: 0, maxPositions: 0, symGate: "off", rangeOpts: undefined,
      basePassed: new Set([`follow|${ind}`]), basePassedRanges: { [`follow|${ind}`]: ["mn"] },
      toggles: { ...d.toggles, normal: kind !== "axis", axis: true, block: false, blockActive: false },
      coord: { ...d.coord!, enabled: false }, signalRank: undefined, engineSideAccept: undefined };
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T, splitT: T - 12 * H, nowT: T, baseTf: 1 } as never;
    rt.sim = walkForward(u, [], rt.wf);
    assert.deepEqual(rt.sim.validated, []);
    const op: OpenPosition = { cfg, sym, side: 1, entryT: T, entryI: 0, entry: 100,
      stop: 99.15, target: 102.15, peak: 100, trailOn: false, mtm: 0 };
    const setHistory = (n: number, losing = false) => {
      const rows: Trade[] = Array.from({ length: n }, (_, i) => ({ cfg, sym, side: 1,
        entryT: T - 11 * H + i * 3 * M, exitT: T - 11 * H + i * 3 * M + M,
        entry: 100, exit: losing ? 98 : 102.15, r: losing ? -.02 : .02, mult: 1, kind,
        reason: losing ? "sl" : "tp", bars: 1, mfe: 0, mae: 0 }));
      rt.tapes = [makeTape(cfg, "follow", ind, protect, kind, [sym], rows, [op], [])];
    };
    const hooks = rt as unknown as { stepPaper(): void };
    setHistory(40); hooks.stepPaper();
    assert.deepEqual(rt.paper.selected, [], "insufficient own range history must still fail");
    assert.deepEqual([rt.status.postBaseValidation?.evaluated,rt.status.postBaseValidation?.passed],[1,0],
      "a failed evaluation still belongs in the progress denominator");
    setHistory(100); hooks.stepPaper();
    assert.deepEqual(rt.paper.selected, [cfg], "last simulation's empty set cannot permanently suppress evaluation");
    assert.equal(rt.paper.positions.length, 1);
    assert.deepEqual([rt.status.postBaseValidation?.evaluated,rt.status.postBaseValidation?.passed],[1,1]);
    setHistory(100, true); hooks.stepPaper();
    assert.deepEqual(rt.paper.selected, [], "later losses revoke new admission");
    assert.deepEqual([rt.status.postBaseValidation?.evaluated,rt.status.postBaseValidation?.passed],[1,0]);
    assert.equal(rt.paper.positions[0]?.entryT, op.entryT, "held ownership and stops survive reevaluation");
    setHistory(100); rt.wf.validated = new Set(); hooks.stepPaper();
    assert.deepEqual(rt.paper.selected, [], "explicit frozen snapshots keep their requested scope");
  } finally { rt.dispose(); db.db.close(); }
});

for (const portfolio of [0, 1]) test(`the full paper step validates within the hour with portfolio ${portfolio}`, () => {
  mock.timers.enable({ apis: ["Date"], now: T + 55 * M });
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    const cfg = configId("follow", ind, protect), sym = "OWN-USDT", d = defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf = { ...d, preH: 12, longH: 12, simH: 12, mode: "fixed", seatSet: "validated", seatPer: "config",
      portfolio, laneSeats: 0, maxPositions: 0, symGate: "off", rangeGate: undefined, rangeOpts: undefined,
      gates: { ...d.gates, minTrades: 12, positionWindows: { base: 12, main: 12, real: 12, entry: 12, maxDrawdownPositions: 12 } },
      basePassed: new Set([`follow|${ind}`]), basePassedRanges: { [`follow|${ind}`]: ["mn"] },
      toggles: { ...d.toggles, normal: true, block: false, blockActive: false },
      coord: { ...d.coord!, enabled: false }, signalRank: undefined, engineSideAccept: undefined };
    const row = (entryT: number, exitT: number): Trade => ({ cfg, sym, side: 1, entryT, exitT,
      entry: 100, exit: 102, r: .02, mult: 1, kind: "normal", reason: "tp", bars: 1, mfe: 0, mae: 0 });
    const history = [...Array.from({ length: 11 }, (_, i) => row(T - (12-i)*2*M, T - (11-i)*2*M)),
      row(T + 20*M, T + 30*M)];
    const open: OpenPosition = { cfg, sym, side: 1, entryT: T + 39*M, entryI: 0, entry: 100,
      stop: 99.15, target: 102.15, peak: 100, trailOn: false, mtm: 0 };
    rt.tapes = [makeTape(cfg, "follow", ind, protect, "normal", [sym], history, [open], [])];
    const u = { bars: [], caches: [], startT: T - 24*H, endT: T+40*M, splitT: T-12*H, nowT: T+40*M, baseTf: 1 } as never;
    rt.sim = walkForward(u, [], rt.wf);
    (rt as unknown as {stepPaper():void}).stepPaper();
    assert.deepEqual(rt.paper.selected, [cfg]);
    assert.equal(rt.paper.positions[0]?.entryT, T + 39*M);
    assert.equal(rt.status.postBaseValidation?.at, T + 40*M);
    rt.paper.positions = [];
    rt.tapes = [makeTape(cfg, "follow", ind, protect, "normal", [sym], history,
      [{ ...open, entryT: T + 25*M }], [])];
    (rt as unknown as {stepPaper():void}).stepPaper();
    assert.equal(rt.paper.positions.length, 0, "the minute-30 close cannot qualify a minute-25 entry");
    rt.tapes = [makeTape(cfg, "follow", ind, protect, "normal", [sym], history,
      [{ ...open, side: -1 }], [])];
    (rt as unknown as {stepPaper():void}).stepPaper();
    assert.equal(rt.paper.positions.length, 0, "a short entry cannot use the long context's history");
  } finally { rt.dispose(); db.db.close(); mock.timers.reset(); }
});

test("a ranked paper seat follows its own in-hour losses and the current winning competitor", () => {
  mock.timers.enable({ apis: ["Date"], now: T + 55*M });
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    const d=defaultWalkForward(DEFAULT_SETTINGS), sym="OWN-USDT", lowProtect={...protect,tp:.02},
      highProtect={...protect,tp:.03}, low=configId("follow",ind,lowProtect), high=configId("follow",ind,highProtect);
    rt.wf={...d,preH:12,longH:12,simH:12,mode:"fixed",seatSet:"validated",seatPer:"config",portfolio:1,laneSeats:0,
      maxPositions:0,symGate:"off",rangeGate:undefined,rangeOpts:undefined,
      gates:{...d.gates,minTrades:12,positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12}},
      basePassed:new Set([`follow|${ind}`]),basePassedRanges:{[`follow|${ind}`]:["mn"]},
      toggles:{...d.toggles,normal:true,block:false,blockActive:false},coord:{...d.coord!,enabled:false},
      signalRank:undefined,engineSideAccept:undefined};
    const row=(cfg:string,entryT:number,exitT:number,r:number):Trade=>({cfg,sym,side:1,entryT,exitT,
      entry:100,exit:100*(1+r),r,mult:1,kind:"normal",reason:r>0?"tp":"sl",bars:1,mfe:0,mae:0});
    const hist=(cfg:string,r:number)=>Array.from({length:12},(_,i)=>row(cfg,T-(25-i*2)*M,T-(24-i*2)*M,r));
    const open:OpenPosition={cfg:low,sym,side:1,entryT:T+39*M,entryI:0,entry:100,
      stop:99.15,target:102,peak:100,trailOn:false,mtm:0};
    rt.tapes=[makeTape(high,"follow",ind,highProtect,"normal",[sym],
      [...hist(high,.03),row(high,T+10*M,T+30*M,-.5)],[],[]),
      makeTape(low,"follow",ind,lowProtect,"normal",[sym],hist(low,.02),[open],[])];
    const u={bars:[],caches:[],startT:T-24*H,endT:T+40*M,splitT:T-12*H,nowT:T+40*M,baseTf:1} as never;
    rt.sim=walkForward(u,[],rt.wf);
    const last=rt.sim.steps.find(step=>step.t===T);
    if(last)last.real=[high];
    (rt as unknown as {stepPaper():void}).stepPaper();
    assert.deepEqual(rt.paper.selected,[low]);
    assert.deepEqual(rt.paper.positions.map(p=>p.cfg),[low]);
  } finally {rt.dispose();db.db.close();mock.timers.reset();}
});
