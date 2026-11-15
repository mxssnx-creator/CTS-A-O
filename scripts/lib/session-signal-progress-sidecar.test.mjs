import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {test} from 'node:test';
import {writeSessionDump,readSessionDump,iterateSessionArray,verifySessionDumpSidecars,removeSessionDump} from './session-dump.mjs';

const fixture=()=>({window:{startT:0,endT:12},trades:[],signalProgress:{version:3,definitions:{configured:'Full own-config evidence'},
 configs:Array.from({length:32},(_,i)=>({id:`cfg-${i%7}-币🚀`,sides:{1:{r:i===7?-1e-12:i/1000}},aliases:[`a-${i}`]})),
 requestedConfigs:Array.from({length:42},(_,i)=>({requestedId:`raw-${i}`,effectiveId:`cfg-${i%7}`})),steps:[],endActive:[]}});
async function workspace(t){const dir=await mkdtemp(join(tmpdir(),'signal-progress-dump-'));t.after(()=>rm(dir,{recursive:true,force:true}));return{dir,file:join(dir,'raw.json')};}
const collect=async g=>{const rows=[];for await(const row of g)rows.push(row);return rows;};
test('large Signal catalogs leave the header and round-trip every ordered duplicate, alias and tiny loss',async t=>{
 const {file}=await workspace(t),raw=fixture(),original=structuredClone(raw);
 await writeSessionDump(file,raw,{maxChunkBytes:256});
 const header=JSON.parse(await readFile(file,'utf8'));
 assert.deepEqual(header.signalProgress.configs,[],'config details must not stay in an unbounded JSON header');
 assert.deepEqual(header.signalProgress.requestedConfigs,[]);
 assert.deepEqual(Object.keys(header.signalProgressSidecars).sort(),['configs','requestedConfigs']);
 assert.ok(header.signalProgressSidecars.configs.chunks.length>1);
 assert.deepEqual(await readSessionDump(file),original);assert.deepEqual(raw,original);
 for(const field of ['configs','requestedConfigs'])assert.deepEqual(await collect(iterateSessionArray(file,`signalProgress.${field}`)),original.signalProgress[field]);
 const verified=await verifySessionDumpSidecars(file);assert.equal(verified['signalProgress.configs'].items,32);
});
test('report projections retain manifests without hydrating unused Signal rows; exact fields remain independently readable',async t=>{
 const {file}=await workspace(t),raw=fixture();await writeSessionDump(file,raw,{maxChunkBytes:256});
 const projected=await readSessionDump(file,{loadSignalProgress:false});assert.equal(projected.signalProgress.configs.length,0);assert.ok(projected.signalProgressSidecars.configs);
 const partial=await readSessionDump(file,{fields:['signalProgress.configs']});assert.deepEqual(partial.signalProgress.configs,raw.signalProgress.configs);
 assert.deepEqual(partial.signalProgress.requestedConfigs,[]);assert.deepEqual(Object.keys(partial.signalProgressSidecars),['requestedConfigs']);
 const group=await readSessionDump(file,{fields:['signalProgress']});assert.deepEqual(group.signalProgress,raw.signalProgress);
});
test('immutable legacy inline catalogs and streamed conversion inputs preserve the identical evidence',async t=>{
 const {dir,file}=await workspace(t),raw=fixture();await writeFile(file,JSON.stringify(raw));assert.deepEqual(await readSessionDump(file),raw);
 const dest=join(dir,'converted.json'),header={...raw,signalProgress:{...raw.signalProgress,configs:[],requestedConfigs:[]}};
 async function* rows(xs){for(const x of xs)yield x;}
 await writeSessionDump(dest,header,{signalProgress:{configs:rows(raw.signalProgress.configs),requestedConfigs:rows(raw.signalProgress.requestedConfigs)},maxChunkBytes:256});
 assert.deepEqual(await readSessionDump(dest),raw);assert.deepEqual(JSON.parse(await readFile(file,'utf8')),raw);
});
test('missing, truncated or changed Signal chunks fail verification and optional projection verifies when requested',async t=>{
 for(const mode of ['missing','truncate','change']){
  const {dir,file}=await workspace(t);await writeSessionDump(file,fixture(),{maxChunkBytes:256});const header=JSON.parse(await readFile(file,'utf8'));
  const path=join(dir,header.signalProgressSidecars.configs.chunks[0].path),bytes=await readFile(path);
  if(mode==='missing')await rm(path);else await writeFile(path,mode==='truncate'?bytes.subarray(0,-1):Buffer.from(bytes.toString().replace('cfg-0','cfg-X')));
  await assert.rejects(readSessionDump(file));await assert.rejects(verifySessionDumpSidecars(file));
  await assert.rejects(readSessionDump(file,{loadSignalProgress:false,verifyUnloaded:['signalProgress.configs']}));
 }
});
test('unknown progress manifest keys or mixed inline details are rejected even without hydration',async t=>{
 const {file}=await workspace(t);await writeSessionDump(file,fixture());const header=JSON.parse(await readFile(file,'utf8'));
 for(const invalid of [{...header,signalProgressSidecars:{bogus:header.signalProgressSidecars.configs}},
  {...header,signalProgress:{...header.signalProgress,configs:[{id:'unhashed'}]}},
  {...header,signalProgressSidecars:JSON.parse('{"__proto__":{}}')}]){
  await writeFile(file,JSON.stringify(invalid));await assert.rejects(readSessionDump(file,{loadSidecars:false}));
 }
});
test('failed streamed writes clean only their own chunks and removal includes completed Signal sidecars',async t=>{
 const {dir,file}=await workspace(t),raw=fixture();await writeSessionDump(file,raw);const before=await readFile(file);const folders=(await readdir(dir)).sort();
 async function* broken(){yield {id:'ok'};throw Error('source interrupted');}
 await assert.rejects(writeSessionDump(file,{signalProgress:{configs:[]}}, {signalProgress:{configs:broken()}}),/source interrupted/);
 assert.deepEqual(await readFile(file),before);assert.deepEqual((await readdir(dir)).sort(),folders);assert.deepEqual(await readSessionDump(file),raw);
 await removeSessionDump(file);assert.deepEqual(await readdir(dir),[]);
});
