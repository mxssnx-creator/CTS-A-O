import assert from "node:assert/strict";
import { test } from "node:test";
import { ProcessingPredecessors } from "./processing-predecessors.ts";

test("20,000 admission checks traverse a published book once, preserving exact ownership and replacements", ctx => {
  const rows = Array.from({ length: 20_000 }, (_, i) => ({ cfg: `own-${i}`, sym: `S${i%20}`, side: i%2 ? -1 : 1,
    entryT: 100+i, ...(i%10===0 ? {blockPredecessor:true as const} : {}) }));
  let visits = 0;
  const observed = new Proxy(rows, {get(target, key, receiver) {
    if (key === Symbol.iterator) return function* () { for (const p of target) { visits++; yield p; } };
    return Reflect.get(target, key, receiver);
  }});
  const index = new ProcessingPredecessors(), start=performance.now();
  for (const [i,p] of rows.entries()) {
    const {blockPredecessor:_,...lane}=p;
    assert.equal(index.has(observed,lane),i%10===0);
  }
  assert.equal(visits,rows.length,"no per-entry full-book scan");
  const first=rows[0], {blockPredecessor:_,...lane}=first;
  assert.equal(index.has(observed,{...lane,entryT:lane.entryT+1}),false);
  assert.equal(index.has(observed,{...lane,side:-lane.side}),false);
  assert.equal(index.has(observed,{...lane,sym:'sibling'}),false);
  assert.equal(index.has(observed,{...lane,entryT:undefined,id:`${lane.cfg}|${lane.sym}|${lane.side}|${lane.entryT}`}),true);
  assert.equal(index.has(observed,{...lane,entryT:undefined}),true);
  assert.equal(index.has([lane],lane),false,"replacement publication releases old predecessor identities");
  assert.equal(index.has([],lane),false);
  ctx.diagnostic(JSON.stringify({checks:rows.length,visits,elapsedMs:performance.now()-start}));
});
