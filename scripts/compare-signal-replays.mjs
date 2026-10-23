// Exact evidence comparison for an implementation-only replay repair. Never selects profitable configurations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readSessionDump,iterateSessionTapeTrades} from './lib/session-dump.mjs';
import {studyExactJson} from './lib/session-study.mjs';
const [before,after,out]=process.argv.slice(2).map(x=>resolve(x));
const load=async dir=>({raw:await readSessionDump(resolve(dir,'raw.json'),{fields:['trades','openEnd']}),book:JSON.parse(readFileSync(resolve(dir,'session.json'))),protocol:JSON.parse(readFileSync(resolve(dir,'protocol.json')))});
const a=await load(before),b=await load(after);
for(const key of ['window','symbols','actualSettings','actualWf','account'])assert.equal(studyExactJson(a.protocol[key]),studyExactJson(b.protocol[key]),`Different ${key}`);
assert.equal(a.protocol.feed.sha256,b.protocol.feed.sha256);
for(const key of ['trades','openEnd'])assert.equal(studyExactJson(a.raw[key]),studyExactJson(b.raw[key]),`Changed ${key}`);
const economic=['orders','fundedOrders','zeroAllocatedOrders','unknownAllocations','pf','gpR','glR','net','balanceEnd','equityEnd','equityMaxDd','equityMaxDdPct','equityDdtMaxH'];
for(const key of economic)assert.equal(a.book.total[key],b.book.total[key],`Changed account ${key}`);
assert.equal(a.book.hours.length,b.book.hours.length);
for(let i=0;i<a.book.hours.length;i++)for(const key of ['t','orders','pf','gpR','glR','net','balance','eqEnd'])assert.equal(a.book.hours[i][key],b.book.hours[i][key],`Changed hourly ${key} ${i}`);
const digest=row=>createHash('sha256').update(studyExactJson(row)).digest('hex');
const hashes=new Map();let n=0,closes=0;
for await(const row of iterateSessionTapeTrades(resolve(before,'raw.json'))){assert.ok(!hashes.has(row.id));hashes.set(row.id,digest(row));closes+=row.trades.length;n++;}
let matched=0;
for await(const row of iterateSessionTapeTrades(resolve(after,'raw.json'))){assert.equal(digest(row),hashes.get(row.id),`Changed tape ${row.id}`);hashes.delete(row.id);matched++;}
assert.equal(hashes.size,0);assert.equal(matched,n);
const result={ok:true,classification:'Implementation-only exact data and outcome parity; not unseen profit evidence',before,after,
 sourceBefore:a.protocol.source.sha256,sourceAfter:b.protocol.source.sha256,feedSha256:a.protocol.feed.sha256,tapes:n,historicalCloses:closes,
 settled:a.raw.trades.length,endpointOpen:a.raw.openEnd.length,hours:a.book.hours.length,identicalAccountFields:economic,
 reportingCorrection:{beforePeakVirtualOpen:a.book.total.maxOpenOrders,afterPeakVirtualOpen:b.book.total.maxOpenOrders,fundedOpened:b.book.total.openedOrders,fundedPeakOpen:b.book.total.fundedOccupancy.maxOrders},
 computeMs:{before:a.raw.engine.computeMs,after:b.raw.engine.computeMs},rssMaxMb:{before:a.raw.engine.rssMaxMb,after:b.raw.engine.rssMaxMb}};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
