// Processing-only changes must retain the exact funded book and every catalog/gate verdict.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFundedSession } from './lib/session-funded-cohort.mjs';
import { readSessionDump } from './lib/session-dump.mjs';
const [before, after, output] = process.argv.slice(2);
assert.ok(before && after && output, 'BEFORE_DIR AFTER_DIR OUTPUT_JSON');
const load = async p => ({
  protocol: JSON.parse(readFileSync(p+'/protocol.json')),
  funded: await readFundedSession(p+'/raw.json',p+'/report/data.json'),
  allocations: await readSessionDump(p+'/report/data.json',{fields:['sizedOpenOrders']}),
  coverage: JSON.parse(readFileSync(p+'/coverage.json')),
  metrics: JSON.parse(readFileSync(p+'/process-metrics.json')),
});
const a=await load(before), b=await load(after);
const inputs=['window','symbols','actualSettings','actualWf'];
for(const input of inputs)assert.deepEqual(a.protocol[input],b.protocol[input],`Frozen input: ${input}`);
assert.ok(a.coverage.ok && b.coverage.ok && a.funded.book.checksOk && b.funded.book.checksOk);
assert.equal(a.metrics.exitCode,0);assert.equal(b.metrics.exitCode,0);
assert.deepEqual(a.funded.trades,b.funded.trades,'Every funded settled allocation');
assert.deepEqual(a.allocations.sizedOpenOrders,b.allocations.sizedOpenOrders,'Every funded held allocation');
assert.deepEqual(a.funded.book.total,b.funded.book.total,'Account returns, cash, holdings and equity');
const sections=['catalog','hourly','groups','ledger','account','entrySelection','exactTape','reportChecks'];
for(const section of sections)assert.deepEqual(a.coverage[section],b.coverage[section],section);
const result={ok:true,beforeSource:a.coverage.sourceSha256,afterSource:b.coverage.sourceSha256,
  exactInputs:inputs,pfNeutral:1,
  settledOrders:a.funded.trades.length,heldOrders:a.allocations.sizedOpenOrders.length,
  pf:a.funded.book.total.pf,counts:a.funded.book.total.fundedCounts,
  exactSections:sections,nativeChecks:b.coverage.reportChecks.length,
  scalarComparisons:b.coverage.audit.comparisons,catalog:b.coverage.catalog,
  metrics:{before:a.metrics,after:b.metrics},
  timingScope:'Different hosts/runs; wall-time differences are observations, not a controlled speedup.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
