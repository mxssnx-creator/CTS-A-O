// Compare the actual funded cohorts and every candidate tape; no new simulation.
import { readFundedSession } from '../../scripts/lib/session-funded-cohort.mjs';
import { readSessionDump, iterateSessionArray } from '../../scripts/lib/session-dump.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const [before, after, output] = process.argv.slice(2);
assert.ok(before && after && output, 'BEFORE_DIR AFTER_DIR OUTPUT_JSON');
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const a = await readFundedSession(before+'/raw.json', before+'/html/data.json');
const b = await readFundedSession(after+'/raw.json', after+'/html/data.json');
const aa = await readSessionDump(before+'/html/data.json', {fields:['sizedOpenOrders']});
const bb = await readSessionDump(after+'/html/data.json', {fields:['sizedOpenOrders']});
const checks = {};
for (const [name,x,y] of [
  ['fundedClosedTrades',a.trades,b.trades], ['virtualClosedTrades',a.raw.trades,b.raw.trades],
  ['heldOrders',a.raw.openEnd,b.raw.openEnd], ['closedAllocations',a.book.sizedOrders,b.book.sizedOrders],
  ['heldAllocations',aa.sizedOpenOrders,bb.sizedOpenOrders], ['fundedTotals',a.book.total,b.book.total],
  ['basePairs',a.raw.basePairs,b.raw.basePairs], ['initialSelectedConfigs',a.raw.engine.realFirstStep,b.raw.engine.realFirstStep],
]) {
  assert.notEqual(x,undefined,name+' baseline missing'); assert.notEqual(y,undefined,name+' current missing');
  assert.deepEqual(x,y,name);
  checks[name] = { identical:true, count:Array.isArray(x)?x.length:null, sha256:hash(x) };
}
for (const field of ['tapeTrades','validation','engine.signalSteps']) {
  const digest = async path => {
    let count=0; const h=createHash('sha256');
    for await (const item of iterateSessionArray(path,field)) {h.update(JSON.stringify(item)+'\n');count++;}
    return {count,sha256:h.digest('hex')};
  };
  const x=await digest(before+'/raw.json'),y=await digest(after+'/raw.json');
  assert.deepEqual(x,y,field); checks[field]={identical:true,...x};
}
const result = {schema:'cts-pf-neutral-replay-parity-v1', before,after,window:b.raw.window,checks,ok:true};
writeFileSync(output,JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
