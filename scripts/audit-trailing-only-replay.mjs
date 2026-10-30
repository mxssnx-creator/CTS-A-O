// Compare the exact funded cohorts while accounting for deliberately removed, Base-unqualified no-TP tapes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { iterateSessionArray, readSessionDump } from './lib/session-dump.mjs';
const [before, after, baselineAudit, output] = process.argv.slice(2);
assert.ok(before && after && baselineAudit && output, 'BEFORE AFTER BASELINE_AUDIT OUTPUT');
const a = await readFundedSession(before+'/raw.json', before+'/html/data.json');
const b = await readFundedSession(after+'/raw.json', after+'/html/data.json');
const [heldA, heldB] = await Promise.all([before, after].map(p =>
  readSessionDump(p+'/html/data.json', { fields: ['sizedOpenOrders'] })));
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const exact = {};
for (const [name,x,y] of [['fundedCloses',a.trades,b.trades],['virtualCloses',a.raw.trades,b.raw.trades],
  ['heldOrders',a.raw.openEnd,b.raw.openEnd],['closedAllocations',a.book.sizedOrders,b.book.sizedOrders],
  ['heldAllocations',heldA.sizedOpenOrders,heldB.sizedOpenOrders],
  ['fundedTotals',a.book.total,b.book.total],['basePairs',a.raw.basePairs,b.raw.basePairs],
  ['initialEngineSelection',a.raw.engine.realFirstStep,b.raw.engine.realFirstStep]]) {
  assert.notEqual(x,undefined,name);assert.notEqual(y,undefined,name);assert.deepEqual(x,y,name);
  exact[name]={count:Array.isArray(x)?x.length:null,sha256:hash(x)};
}
const tapes = async p => {
  const m=new Map();for await(const row of iterateSessionArray(p+'/raw.json','tapeTrades')) {
    assert.ok(!m.has(row.id),`duplicate tape ${row.id}`);m.set(row.id,row);
  }return m;
};
const [old,now]=await Promise.all([tapes(before),tapes(after)]), known=new Map(JSON.parse(readFileSync(baselineAudit,'utf8')).configs.map(x=>[x.cfg,x]));
let retained=0;for(const [id,row] of now){assert.ok(old.has(id),`new tape ${id}`);assert.deepEqual(old.get(id),row,`changed retained tape ${id}`);retained++;}
const removed=[];for(const [id,row] of old){if(now.has(id))continue;const info=known.get(id);
  assert.equal(row.kind,'trailing-only',id);assert.equal(row.protect.tp,0,id);assert.ok(info,id);
  assert.equal(info.initialBaseAllowed,false,`removed tape must not have Base admission: ${id}`);
  assert.equal(info.initiallySelected,false,`removed tape was selected: ${id}`);
  assert.equal(info.subsequent.n,0,`removed tape had funded closes: ${id}`);
  removed.push({id,kind:row.kind,range:info.range,baseAllowed:info.initialBaseAllowed,sourceCloses:row.trades.length});
}
const stages={};for(const field of ['validation','engine.signalSteps']){
  const all=async p=>{const out=[];for await(const row of iterateSessionArray(p+'/raw.json',field))out.push(row);return out;};
  const [x,y]=await Promise.all([all(before),all(after)]);assert.deepEqual(x,y,field);
  stages[field]={beforeCount:x.length,afterCount:y.length,identical:true,beforeSha256:hash(x),afterSha256:hash(y)};
}
const result={schema:'cts-trailing-only-replay-audit-v1',window:b.raw.window,exact,baselineTapes:old.size,afterTapes:now.size,retainedIdentical:retained,removed,stages};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({closed:exact.fundedCloses.count,held:exact.heldOrders.count,baselineTapes:old.size,afterTapes:now.size,retainedIdentical:retained,removed:removed.length,stages}));
