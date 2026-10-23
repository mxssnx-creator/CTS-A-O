// Exact config × symbol × direction execution receipt. Complete inventory retains zero-execution configs separately.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readFundedSession} from './lib/session-funded-cohort.mjs';
import {readSessionDump} from './lib/session-dump.mjs';
import {BOOK_NOTIONAL_EPS_USD} from './lib/book-notional.mjs';
import {modeledUnitStatsOf} from '../src/core/metrics/stats.ts';
const dir=resolve(process.argv[2]);
const coverage=JSON.parse(readFileSync(resolve(dir,'coverage.json')));assert.equal(coverage.ok,true);
const funded=await readFundedSession(resolve(dir,'raw.json'));
const raw=await readSessionDump(resolve(dir,'raw.json'),{fields:['openEnd']});
const book=await readSessionDump(resolve(dir,'report/data.json'),{fields:['sizedOpenOrders']});
const groups=new Map(),get=x=>{const key=JSON.stringify([x.cfg,x.sym,x.side]);if(!groups.has(key))groups.set(key,{cfg:x.cfg,symbol:x.sym,side:x.side,kind:x.kind??'normal',closes:[],fundedOpen:0,zeroAllocatedCloses:0,zeroAllocatedOpen:0});return groups.get(key);};
const allocated=new Set(funded.trades);
for(const x of funded.virtualTrades){if(allocated.has(x))get(x).closes.push(x);else get(x).zeroAllocatedCloses++;}
assert.equal(book.sizedOpenOrders.length,raw.openEnd.length);
const indices=new Set();
for(const a of book.sizedOpenOrders){assert.ok(!indices.has(a.openIndex));indices.add(a.openIndex);const x=raw.openEnd[a.openIndex];assert.ok(x);for(const k of ['cfg','sym','side','entryT'])assert.equal(a[k],x[k]);assert.ok(Number.isFinite(a.allocatedNotional)&&a.allocatedNotional>=0);get(x)[a.allocatedNotional>BOOK_NOTIONAL_EPS_USD?'fundedOpen':'zeroAllocatedOpen']++;}
const rows=[...groups.values()].map(({closes,...g})=>{closes.sort((a,b)=>a.exitT-b.exitT||a.entryT-b.entryT);const s=modeledUnitStatsOf(closes,raw.window.endT);assert.equal(s.unknownReturns,0);assert.equal(s.unknownReturnTotals??0,0);if(closes.length)assert.equal(s.pfBasis,"unit-net-returns");return {...g,fundedSettled:closes.length,fundedOpened:closes.length+g.fundedOpen,unitGp:s.gp/100,unitGl:s.gl/100,unitNet:s.net/100,pf:closes.length&&s.gl>0?s.pf:null,pfState:!closes.length?'empty':s.gl>0?'ratio':s.gp>0?'no-loss':'flat',unitMaxDrawdown:s.mdd/100,unitDdtH:s.ddt};}).sort((a,b)=>a.cfg.localeCompare(b.cfg)||a.symbol.localeCompare(b.symbol)||a.side-b.side);
assert.equal(rows.reduce((n,r)=>n+r.fundedSettled,0),coverage.account.orders);
assert.equal(rows.reduce((n,r)=>n+r.fundedOpen,0),coverage.groups.filter(g=>g.dimension==='type').reduce((n,g)=>n+g.execution.open,0));
const output={schema:'cts-signal-execution-contexts-v1',protocolSha256:coverage.protocolSha256,sourceSha256:coverage.sourceSha256,basis:'Exact funded modeled settled unit returns; endpoint opens and zero allocations separate; overlapping config observations are not independent market evidence',allBuiltConfigs:coverage.catalog.builtConfigs,zeroExecutionConfigs:'See complete coverage.configs.jsonl; this receipt lists every context with an execution or allocation request',rows};
writeFileSync(resolve(dir,'execution-contexts.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({contexts:rows.length,fundedSettled:rows.reduce((n,r)=>n+r.fundedSettled,0),fundedOpen:rows.reduce((n,r)=>n+r.fundedOpen,0)}));
