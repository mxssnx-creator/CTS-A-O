// Synthetic net-unit window benchmark. No market data, funded orders or profitability claim.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { StageWindowIndex } from '../src/core/sim/stage-window-index.ts';
import { DEFAULT_STAGE_CHAIN, dualStageGate } from '../src/core/sim/stage-policy.ts';
const output=process.argv[2];if(!output)throw new Error('usage: bench-stage-window-index.mjs OUTPUT_JSON');
const rows=Array.from({length:1000},(_,i)=>({orderId:`o-${i}`,entryT:i*3,exitT:i*3+1,knownT:i*3+1,
 unitReturn:i%4===0?-.003:.002})),iterations=20000,policy=DEFAULT_STAGE_CHAIN.base;
const before=t=>{let a=0,b=rows.length;while(a<b){const m=(a+b)>>>1;if(rows[m].exitT<t)a=m+1;else b=m;}return rows.slice(Math.max(0,a-policy.primaryN),a);};
const scalarStart=performance.now();let scalarPassed=0;
for(let i=0;i<iterations;i++){const t=151+(i%900)*3;scalarPassed+=Number(dualStageGate(before(t),policy,1.1,t).state==='qualified');}
const scalarMs=performance.now()-scalarStart,buildStart=performance.now(),index=new StageWindowIndex(rows),indexBuildMs=performance.now()-buildStart;
let indexedPassed=0;const indexedStart=performance.now();
for(let i=0;i<iterations;i++){const t=151+(i%900)*3;indexedPassed+=Number(index.window(50,1.1,t).state==='qualified'&&index.window(15,1.1,t).state==='qualified');}
const indexedMs=performance.now()-indexedStart;assert.equal(indexedPassed,scalarPassed);
const result={scope:'Synthetic own-set net-unit window checks only. Repeated parameter-study cutoffs; includes cached windows. Not an end-to-end runtime latency or trading PF measurement.',
 iterations,sourceCloses:rows.length,primaryN:50,secondaryN:15,minPf:1.1,passed:scalarPassed,scalarMs,indexBuildMs,indexedMs,
 speedupIncludingBuild:scalarMs/(indexBuildMs+indexedMs),combinedProcessPeakRssBytes:process.resourceUsage().maxRSS*1024,
 node:process.version,status:'pass'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
