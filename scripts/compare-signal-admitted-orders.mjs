// Changing admission may change the cohort; a retained exact order must keep its original net return.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readFundedSession} from './lib/session-funded-cohort.mjs';
import {modeledUnitReturn} from '../src/core/metrics/stats.ts';

const [before,after,out]=process.argv.slice(2);
const key=x=>JSON.stringify([x.cfg,x.sym,x.side,x.entryT,x.exitT]);
const index=rows=>{const m=new Map();for(const x of rows){assert.ok(!m.has(key(x)),'duplicate exact order');m.set(key(x),x);}return m;};
const a=await readFundedSession(resolve(before,'raw.json')),b=await readFundedSession(resolve(after,'raw.json'));
const aa=index(a.trades),bb=index(b.trades),added=[],removed=[];let matched=0,gp=0,gl=0;
for(const [k,x]of aa){const y=bb.get(k);if(!y){removed.push(k);continue;}const r=modeledUnitReturn(x),s=modeledUnitReturn(y);
 assert.ok(Number.isFinite(r)&&Number.isFinite(s),'unknown return');assert.equal(r,s,'same admitted order changed its unit net return');
 if(r>0)gp+=r;else gl-=r;matched++;}
for(const k of bb.keys())if(!aa.has(k))added.push(k);
const result={ok:true,basis:'Exact funded settled config × symbol × direction × entry × exit, unit net returns; modeled 0.15% already retained once',
 before:aa.size,after:bb.size,matched,added:added.length,removed:removed.length,commonGp:gp,commonGl:gl,commonPf:gl?gp/gl:null,
 commonPfState:!matched?'empty':gl?'ratio':gp?'no-loss':'flat',addedIdentities:added,removedIdentities:removed};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,addedIdentities:undefined,removedIdentities:undefined}));
