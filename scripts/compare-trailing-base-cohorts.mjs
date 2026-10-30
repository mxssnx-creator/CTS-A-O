// Compare executed cohorts by immutable modeled-order identity; changed admission can legitimately add/remove rows.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { modeledUnitReturn } from '../src/core/metrics/stats.ts';

const [before, after, output] = process.argv.slice(2);
assert.ok(before && after && output, 'BEFORE AFTER OUTPUT');
const [a,b] = await Promise.all([before,after].map(p => readFundedSession(p+'/raw.json',p+'/html/data.json')));
const index = rows => {
  const map = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.cfg,row.sym,row.side,row.entryT,row.exitT]);
    assert.ok(!map.has(key), `duplicate modeled order ${key}`); map.set(key,row);
  }
  return map;
};
const old = index(a.trades), current = index(b.trades);
const added = [...current.keys()].filter(k => !old.has(k));
const removed = [...old.keys()].filter(k => !current.has(k));
let retained = 0, changedUnit = 0, changedMultiplier = 0;
for (const [key,row] of current) {
  const prior = old.get(key); if (!prior) continue; retained++;
  const x = modeledUnitReturn(prior), y = modeledUnitReturn(row);
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x-y) > 1e-10) changedUnit++;
  if (prior.mult !== row.mult) changedMultiplier++;
}
const result = { schema:'cts-trailing-base-cohort-comparison-v1', before:old.size, after:current.size,
  retained, added:added.length, removed:removed.length, changedUnit, changedMultiplier,
  addedKinds:Object.fromEntries([...new Set(added.map(k=>current.get(k).kind))].map(kind=>[kind,added.filter(k=>current.get(k).kind===kind).length])),
  removedKinds:Object.fromEntries([...new Set(removed.map(k=>old.get(k).kind))].map(kind=>[kind,removed.filter(k=>old.get(k).kind===kind).length])) };
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
