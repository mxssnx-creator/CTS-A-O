import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DCA_MAX_STAGES, simulateDca } from "./dca.ts";
import { barsFromCandles } from "../market/bars.ts";
import type { Candle } from "../domain/types.ts";
import { DEFAULT_DCA, DEFAULT_BLOCK } from "../config.ts";
import { configId, kindOfId, parseConfigId } from "../pipeline/pipeline.ts";
import { dcaSnapshot } from "./dca.ts";
import { buildTapes, packTapes, unpackTapes } from "./walkforward.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { syntheticCandles } from "../market/bars.ts";

const mk = (rows: Array<[number, number, number, number]>): Candle[] =>
  rows.map(([o, h, l, c], i) => ({ t: i * 900_000, o, h, l, c, v: 1 }));
const P = { tp: 0.02, sl: 0.05, trail: 0, hold: 20 };
const D = { levels: 2, step: 0.01 };

describe("dca", () => {
  it("defaults to two non-compounding additions within 2%, with every Block relation active", () => {
    assert.equal(DEFAULT_DCA.levels, 2);
    assert.equal(DEFAULT_DCA.step, .01);
    assert.equal(DEFAULT_DCA.maxDistance, .02);
    assert.equal(DEFAULT_DCA.addRatio, 2.5);
    assert.equal(DEFAULT_BLOCK.mode, "overall");
    assert.ok(Object.values(DEFAULT_BLOCK.sources!).every(Boolean));
  });

  it("weights the one addition, target, cost, open mark and settled return consistently in both directions", () => {
    for (const side of [1, -1] as const) {
      const mirror = (x: number) => side === 1 ? x : 200 - x;
      const rows = [[100,100,100,100],[100,100.1,97.9,98.2],[98.2,98.5,97.8,98.3],[98.3,103,98.2,102.5]];
      const b = barsFromCandles("X",15,mk(rows.map(([o,h,l,c]) => [mirror(o),mirror(side===1?h:l),mirror(side===1?l:h),mirror(c)])));
      const cfg={...DEFAULT_DCA,levels:1,step:0.02};
      const p={...P,hold:40};const cost=.002;
      const sig=new Int8Array([side,0,0,0]);
      const open=simulateDca("c",{...b,n:3},sig,p,cfg,false,cost).open!;
      assert.ok(open);
      assert.equal(open.w,3.5);
      const level=mirror(98);const avg=3.5/(1/100+2.5/level);
      assert.ok(Math.abs(open.entry-avg)<1e-12);
      const px=b.c[2];const mtm=side*(px-100)/100-cost+2.5*(side*(px-level)/level-cost);
      assert.ok(Math.abs(open.mtm*open.w!-mtm)<1e-12);
      const t=simulateDca("c",b,sig,p,cfg,false,cost).trades[0];
      assert.equal(t.vol,3.5);assert.equal(t.level,1);assert.equal(t.reason,"tp");
      const expected=side*(t.exit-100)/100-cost+2.5*(side*(t.exit-level)/level-cost);
      assert.ok(Math.abs(t.r-expected)<1e-12);
    }
  });

  it("caps two additions at 1% and 2% even when target-based spacing asks for more", () => {
    for (const side of [1, -1] as const) {
      const mirror = (x:number) => side === 1 ? x : 200-x;
      const b = barsFromCandles("X",1, [
        [100,100,100,100], [100,100,98.5,99], [99,99.2,97.9,98.2],
      ].map(([o,h,l,c],i) => ({ t:i*60000,o:mirror(o),h:mirror(side===1?h:l),l:mirror(side===1?l:h),c:mirror(c),v:1 })));
      const cfg={...DEFAULT_DCA,stepOfTp:5};
      const open=simulateDca("c",b,new Int8Array([side,0,0]),{...P,hold:30},cfg,false,.002).open!;
      assert.equal(open.w,6);
      const prices=[100,mirror(99),mirror(98)],weights=[1,2.5,2.5];
      const expected=prices.reduce((r,entry,i)=>r+weights[i]*(side*(b.c[2]-entry)/entry-.002),0);
      assert.ok(Math.abs(open.mtm*open.w!-expected)<1e-12);
      // A tick at the same price must preserve the exact ladder mark rather than change equity.
      assert.ok(Math.abs((side*(b.c[2]-open.entry)/open.entry-.002)*open.w!-expected)<1e-12);
      const p={...P,dca:dcaSnapshot(cfg)};
      const id=configId("follow","ema-9-21@m1",p,"dca");
      assert.deepEqual(parseConfigId(id)!.protect.dca,p.dca);
      assert.notEqual(id,configId("follow","ema-9-21@m1",{...p,dca:{...p.dca,maxDistance:0}},"dca"));
    }
  });

  it("uses immutable ladder identities so changed weights and spacing never inherit an old set's Last-N", () => {
    const ids=new Set<string>();
    for(const kind of ["dca","dca-active"] as const)for(const ratio of [1,2.5])for(const step of [.01,.02]){
      const p={...P,dca:dcaSnapshot({...DEFAULT_DCA,addRatio:ratio,step})};
      const id=configId("follow","ema-9-21@m15",p,kind);ids.add(id);
      const parsed=parseConfigId(id)!;assert.ok(parsed);assert.equal(kindOfId(id),kind);
      assert.deepEqual(parsed.protect.dca,p.dca);
      assert.equal(configId(parsed.bot,parsed.ind,parsed.protect,kind),id);
      // A snapshot, not a changed runtime setting, controls the old tape's ladder economics.
    }
    assert.equal(ids.size,8);
    assert.throws(()=>dcaSnapshot({...DEFAULT_DCA,addRatio:3}),/2.5/);
    assert.equal(dcaSnapshot({...DEFAULT_DCA,step:.0100000001}).step,.01,"identity precision matches effective execution");
    assert.notEqual(dcaSnapshot({...DEFAULT_DCA,step:.010001}).step,.01);
  });

  it("never manufactures positive performance from a negative or unknown fee",()=>{
    const b=barsFromCandles("X",15,mk([[100,100,100,100],[100,101,99,100]]));
    for(const cost of [-.001,NaN,Infinity])assert.throws(()=>simulateDca("c",b,new Int8Array([1,0]),P,D,false,cost),/nonnegative/);
  });

  it("retains an old weighted ladder for exits after spacing changes, without qualifying it for new entries", () => {
    const ind="ema-9-21@m15",pair=`follow|${ind}`;
    const u=makeUniverse([barsFromCandles("A",15,syntheticCandles("A",15,1200,30*86400000))],0);
    const oldOpt={protects:[P],dca:{...DEFAULT_DCA,step:.02}};
    const old=buildTapes(u,[],.0015,oldOpt,new Set([pair]));
    const held=old.find(t=>t.kind==="dca")!;assert.ok(held);
    const current=buildTapes(u,[],.0015,{...oldOpt,dca:{...DEFAULT_DCA,step:.01}},new Set([pair]),null,null,{minSl:0,minTrail:0,heldIds:new Set([held.id])});
    const retained=current.find(t=>t.id===held.id)!;assert.ok(retained);assert.equal(retained.heldOnly,true);
    assert.deepEqual(retained.r,held.r);assert.equal(retained.n,held.n);
    assert.ok(current.some(t=>t.kind==="dca"&&t.id!==held.id&&!t.heldOnly));
    const rebuilt=unpackTapes(packTapes(current));
    assert.deepEqual(rebuilt.map(t=>[t.id,t.heldOnly,t.protect.dca]),current.map(t=>[t.id,t.heldOnly,t.protect.dca]));
  });
  it("a ladder open at the last bar is carried (marked open, mirrored in the paper book)", () => {
    // enters at bar 1 and neither stops nor targets: the position is still open at the last close
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100.3, 99.6, 100.1],
        [100.1, 100.4, 99.7, 100.2],
      ]),
    );
    const r = simulateDca("c", b, new Int8Array([1, 0, 0]), P, D, false, 0.002);
    assert.equal(r.trades.length, 0, "nothing closed");
    assert.ok(r.open, "the open ladder is returned");
    assert.equal(r.open!.side, 1);
    assert.equal(r.open!.w, 1, "one leg filled");
    assert.ok(Math.abs(r.open!.entry - 100) < 1e-9);
    assert.ok(Math.abs(r.open!.stop - 100 * (1 - 0.05)) < 1e-9, `stop ${r.open!.stop}`);
    assert.ok(Math.abs(r.open!.mtm - ((100.2 - 100) / 100 - 0.002)) < 1e-9, `mtm ${r.open!.mtm}`);
  });

  it("normal DCA adds legs and re-anchors the target to the average", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100.2, 98.8, 99], // equal-notional leg at 99, target from acquired quantity (no TP this bar)
        [99, 101.6, 98.9, 101.5],
      ]),
    );
    const r = simulateDca("c", b, new Int8Array([1, 0, 0]), P, D, false, 0.002);
    assert.equal(r.trades.length, 1);
    const tr = r.trades[0];
    assert.equal(tr.vol, 2);
    assert.equal(tr.reason, "tp");
    assert.ok(Math.abs(tr.exit - (2 / (1/100 + 1/99)) * 1.02) < 1e-9);
    const expect = (tr.exit - 100) / 100 + (tr.exit - 99) / 99 - 0.004;
    assert.ok(Math.abs(tr.r - expect) < 1e-12);
  });

  it("DCA Active skips the base leg and trades only the level fill", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100.5, 99.5, 100], // no fill (limit 99)
        [100, 100, 98.9, 99.2], // fill 99
        [99.2, 101.2, 99.1, 101], // TP 99·1.02 = 100.98
      ]),
    );
    const r = simulateDca("c", b, new Int8Array([1, 0, 0, 0]), P, D, true, 0.002);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0].entry, 99);
    assert.equal(r.trades[0].kind, "dca-active");
    assert.ok(Math.abs(r.trades[0].r - (0.02 - 0.002)) < 1e-12);
  });

  it("DCA Active: a fill at an open that gapped through the stop exits no better than the fill", () => {
    // ref 100 (the bar after the signal), limit 99, stop 95
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100.5, 99.5, 100], // the reference bar (no fill: limit 99)
        [94, 94.5, 93.5, 94], // opens below the stop: fill 94, the low touches the stop level
      ]),
    );
    const r = simulateDca("c", b, new Int8Array([1, 0, 0]), P, D, true, 0.002);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0].reason, "sl");
    assert.ok(r.trades[0].r <= -0.002 + 1e-12, `r ${r.trades[0].r}: the gap was booked as a profit`);
  });

  it("DCA Active expires unfilled after hold bars", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk(
        Array.from(
          { length: 30 },
          () => [100, 100.3, 99.6, 100] as [number, number, number, number],
        ),
      ),
    );
    const sig = new Int8Array(30);
    sig[0] = 1;
    assert.equal(simulateDca("c", b, sig, P, D, true, 0.002).trades.length, 0);
  });

  it("stop stays anchored beyond the deepest level", () => {
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100, 93, 94],
      ]),
    );
    const r = simulateDca("c", b, new Int8Array([1, 0]), P, D, false, 0);
    assert.equal(r.trades[0].reason, "sl");
    assert.equal(r.trades[0].exit, 95);
    assert.equal(r.trades[0].vol, 3);
  });

  it("spacing as a multiple of the target and the stop gap beyond the deepest level", () => {
    // TP 2 %, stepOfTp 0.5 → levels 1 % apart; 2 levels, stop gap 1 → stop 3 % under the reference (beyond 98)
    const b = barsFromCandles(
      "X",
      15,
      mk([
        [100, 100, 100, 100],
        [100, 100, 98.95, 99], // leg at 99
        [99, 99, 97.95, 98], // leg at 98 → avg 99, target 100.98
        [98, 98, 97.1, 97.5], // above the stop at 97
        [97.5, 97.6, 96.9, 97], // stop 97
      ]),
    );
    const r = simulateDca(
      "c",
      b,
      new Int8Array([1, 0, 0, 0, 0]),
      { ...P, sl: 0.005 },
      { levels: 2, step: 0.05, stepOfTp: 0.5, stopGap: 1 },
      false,
      0.002,
    );
    assert.equal(r.trades.length, 1);
    const tr = r.trades[0];
    assert.equal(tr.vol, 3);
    assert.equal(tr.reason, "sl");
    assert.ok(Math.abs(tr.exit - 97) < 1e-9, `${tr.exit}`);
  });

  it("the stack never exceeds 5 stages (base + 4 levels), whatever the levels setting", () => {
    // a long slide: every level fills; 9 levels requested, 4 fill
    const rows: Array<[number, number, number, number]> = [[100, 100, 100, 100]];
    for (let i = 1; i <= 12; i++) rows.push([100 - i + 1, 100 - i + 1, 100 - i, 100 - i]);
    const b = barsFromCandles("X", 15, mk(rows));
    const r = simulateDca("c", b, new Int8Array(rows.length).fill(0).map((_, i) => (i === 0 ? 1 : 0)) as Int8Array, { ...P, sl: 0.5, hold: 40 }, { levels: 9, step: 0.01, stopGap: 50 }, false, 0.002);
    const legs = Math.max(...r.trades.map((t) => t.vol ?? 1), 0);
    assert.ok(legs <= DCA_MAX_STAGES, `${legs} legs`);
    assert.equal(DCA_MAX_STAGES, 5);
  });
});
