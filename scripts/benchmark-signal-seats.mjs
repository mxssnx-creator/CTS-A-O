// Compare the prior exact seat scan with the indexed, sliced production selector on a completed full inventory.
import assert from 'node:assert/strict';
import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {signalSeatSymbols,signalSeatTapesGen} from '../src/core/signals.ts';
const dir=resolve(process.argv[2]),out=resolve(process.argv[3]);
const coverage=JSON.parse(readFileSync(resolve(dir,'coverage.json'))),raw=JSON.parse(readFileSync(resolve(dir,'raw.json')));
assert.ok(coverage.ok);
const tapes=[];
for await(const line of createInterface({input:createReadStream(resolve(dir,'coverage.configs.jsonl')),crlfDelay:Infinity})){
 if(!line.trim())continue;const row=JSON.parse(line);
 tapes.push({id:row.id,bot:row.id.split('|')[0],ind:row.ind,kind:row.kind,syms:coverage.symbols});
}
const rows=[];
for(const step of raw.engine.signalSteps){
 const active=new Set(step.keys);let start=performance.now();
 const old=tapes.filter(t=>!t.heldOnly&&signalSeatSymbols(t,active).size>0),beforeMs=performance.now()-start;
 const gen=signalSeatTapesGen(tapes,active);let slices=0,maxSliceMs=0,got;
 start=performance.now();
 for(;;){const a=performance.now(),r=gen.next();maxSliceMs=Math.max(maxSliceMs,performance.now()-a);if(r.done){got=r.value;break;}slices++;}
 const afterMs=performance.now()-start;
 assert.deepEqual(got.map(t=>t.id),old.map(t=>t.id));
 rows.push({t:step.t,configs:tapes.length,activeKeys:active.size,selected:old.length,beforeMs,afterMs,slices,maxSliceMs});
}
const result={ok:true,basis:'Exact same ordered selected config identities across every recorded selection step; selection-stage benchmark, not a complete new native replay',studySourceSha256:coverage.sourceSha256,rows};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({steps:rows.length,configs:tapes.length,beforeMs:rows.reduce((n,r)=>n+r.beforeMs,0),afterMs:rows.reduce((n,r)=>n+r.afterMs,0),maxSliceMs:Math.max(...rows.map(r=>r.maxSliceMs))}));
