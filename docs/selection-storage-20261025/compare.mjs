import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {readSessionDump} from '../../scripts/lib/session-dump.mjs';
const old='/workspace/scratch/1bcaeeb063ee/CTS-A-O-reporting/runs/selection-storage-benchmark';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function signatures(file){let value=await readSessionDump(file);const hashes=Object.fromEntries(Object.keys(value).sort().map(k=>[k,sha(value[k])]));value=null;global.gc();return hashes;}
const checks=[];
for(const file of ['session.json','report/data.json']){const a=await signatures(old+'/'+file),b=await signatures('runs/selection-storage-benchmark/'+file);assert.deepEqual(b,a);checks.push({file,fields:Object.keys(a).length,identical:true});}
const payload=file=>JSON.parse(readFileSync(file,'utf8').match(/\bconst DATA = ([^\n]+);\n/)[1]);
let a=payload(old+'/report/index.html');const selection=a.engine.signalSteps;const expected={file:'data.json',steps:selection.length,keys:selection.reduce((n,s)=>n+s.keys.length,0)};delete a.engine.signalSteps;const before=sha(a);a=null;global.gc();let b=payload('runs/selection-storage-benchmark/report/index.html');assert.deepEqual(b.selectionEvidence,expected);delete b.selectionEvidence;assert.equal(sha(b),before);checks.push({file:'report/index.html',summaryIdentical:true,selectionEvidence:expected});
writeFileSync('runs/selection-storage-benchmark/parity.json',JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify(checks));
