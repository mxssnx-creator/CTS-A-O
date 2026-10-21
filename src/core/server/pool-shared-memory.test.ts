import assert from "node:assert/strict";
import { test } from "node:test";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import type { Trade } from "../domain/types.ts";
import { makeTape, packArena } from "../sim/walkforward.ts";
import { shareBars, shareTapes } from "./pool.server.ts";

const cols = ["exitT","entryT","r","entry","exit","symI","side","reason","bars","vol","level","gp","gl","rs","r2"] as const;
test("sharing a packed tape arena copies its bytes once, preserving offsets and every column", () => {
  const rows: Trade[] = Array.from({length:8}, (_,i)=>({cfg:"a",sym:"A",side:i%2?1:-1,
    entryT:i*60000,exitT:(i+1)*60000,entry:100,exit:101,r:i%3?0.01:-0.005,
    reason:"tp",bars:1,mfe:0,mae:0}));
  const tapes = Array.from({length:200}, (_,i)=>makeTape(`follow|ema-21-55|${i}`,"follow","ema-21-55",
    {tp:0.01,sl:0.01,trail:0,hold:12},"normal",["A"],rows,[],[]));
  packArena(tapes);
  const shared=shareTapes(tapes as unknown as Array<Record<string,unknown>>);
  const buffers=new Set<ArrayBufferLike>();
  shared.forEach((tp,i)=>cols.forEach(k=>{
    const a=tp[k] as Float64Array, b=tapes[i][k];
    assert.deepEqual(a,b,`config ${i} column ${k}`);
    assert.equal(a.byteOffset,b.byteOffset);
    assert.ok(a.buffer instanceof SharedArrayBuffer);
    assert.notEqual(a.buffer,b.buffer);
    buffers.add(a.buffer);
  }));
  assert.equal(buffers.size,1,"200 configs share ONE transferred arena");
  assert.equal([...buffers][0].byteLength,tapes[0].exitT.buffer.byteLength);
  const twice=shareTapes(shared);
  assert.equal((twice[0].exitT as Float64Array).buffer,(shared[0].exitT as Float64Array).buffer);
  const separate = {...shared[0],r:new Float64Array([0.03,-0.01])};
  const [mixed]=shareTapes([separate]);
  assert.ok((mixed.r as Float64Array).buffer instanceof SharedArrayBuffer);
  assert.deepEqual(mixed.r,separate.r,"non-arena columns are also shared without changing values");
  tapes[0].r[0]=-999;
  assert.equal((shared[0].r as Float64Array)[0],rows[0].r,"workers own an immutable snapshot of source bytes");
});

test("already shared candle snapshots reuse their buffer without another history-sized allocation", () => {
  const bars=[barsFromCandles("A",1,syntheticCandles("A",1,1000,Date.UTC(2026,9,12)))];
  const first=shareBars(bars),second=shareBars(first);
  assert.equal(second[0],first[0]);
  assert.notEqual(first[0].c.buffer,bars[0].c.buffer);
  for(const k of ["t","o","h","l","c","v"] as const) assert.deepEqual(second[0][k],bars[0][k]);
});
