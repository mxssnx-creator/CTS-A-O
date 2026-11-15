import { it } from "node:test";
import assert from "node:assert/strict";
import { makeUniverse, runCombo } from "./pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { indicationState, INDICATIONS } from "../indications/registry.ts";
import { SeriesCache } from "../indications/cache.ts";

it("short complete lanes are evaluated; each indicator retains its own real warmup and empty histories never qualify",()=>{
  const b=barsFromCandles("A-USDT",30,syntheticCandles("A-USDT",30,48,Date.UTC(2026,9,16,12),11));
  const u=makeUniverse([b]);
  assert.equal(u.bars.length,1,"a 48-bar lane is not discarded by an unrelated 120-bar blanket");
  const p={tp:.01,sl:.01,trail:0,hold:2};
  const ready=runCombo(u,"follow","rsi-mom-14-20@m30",p,.00176,1);
  assert.ok(ready,"a configured lane must produce an evaluated row even when it has no qualified closes");
  const slow=indicationState("trend-ema-50-200",u.caches[0]);
  assert.ok(slow?.every(x=>x===0),"the 200-period EMA cannot borrow or invent missing candles");
  const long=runCombo(u,"follow","trend-ema-50-200@m30",p,.00176,1);
  assert.equal(long?.full.n,0);
});
it("every registered indication safely handles short actual histories without synthetic padding",()=>{
  for(const n of [2,24,48,96]) {
    const b=barsFromCandles("A-USDT",30,syntheticCandles("A-USDT",30,n,Date.UTC(2026,9,16,12),11));
    const k=new SeriesCache(b);
    for(const ind of INDICATIONS) {
      const state=ind.fn(k);
      assert.equal(state.length,n,`${ind.id}: exact ${n}-bar length`);
      assert.ok(state.every(x=>x===-1||x===0||x===1),ind.id);
      k.clear();
    }
  }
});
