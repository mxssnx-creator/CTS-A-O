#!/usr/bin/env node
// Diagnostic retention benchmark, not a trading/PF study. The identical insufficient-history cohort must fail.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DEFAULT_SETTINGS} from '../../src/core/config.ts';
import {defaultWalkForward,makeTape,selectFixed} from '../../src/core/sim/walkforward.ts';
const mode=process.argv[2];
if (!mode) {
  const runs=['full','summary'].map(m=>JSON.parse(execFileSync(process.execPath,
    ['--experimental-strip-types','--no-warnings','--expose-gc','--max-old-space-size=1024',import.meta.filename,m],
    {encoding:'utf8',maxBuffer:100000})));
  assert.equal(runs[0].evaluated,runs[1].evaluated);
  assert.equal(runs[0].passed,runs[1].passed);
  console.log(JSON.stringify({classification:'Diagnostic-retention benchmark; no qualified or executed trading sample',
    runs,retainedHeapReductionPercent:100*(1-runs[1].retainedHeapMiB/runs[0].retainedHeapMiB)},null,2));
} else {
  assert.ok(mode==='full'||mode==='summary');
  const H=3600000,T=1000*H,count=99520,steps=24;
  const shared=makeTape('follow|ema-21-55|shared','follow','ema-21-55',
    {tp:.01,sl:.01,trail:0,hold:12},'normal',['A'],[],[],[]);
  const tapes=Array.from({length:count},(_,i)=>({...shared,id:`follow|ema-21-55|cell${i}`}));
  const defaults=defaultWalkForward(DEFAULT_SETTINGS);
  const o={...defaults,bots:[],preGate:false,validLastN:0,rangeGate:undefined,
    gates:{...defaults.gates,minTrades:1000},recordValidation:mode==='full'?true:'summary'};
  globalThis.gc();
  const before=process.memoryUsage().heapUsed;
  const held=[],start=performance.now();
  let evaluated=0,passed=0;
  for(let i=0;i<steps;i++) {
    const result=selectFixed(tapes,T+i*H,o);
    held.push(result);
    evaluated+=result.checks?.length??result.validationSummary.evaluated;
    passed+=result.checks?.filter(c=>c[1]).length??result.validationSummary.passed;
  }
  globalThis.gc();
  assert.equal(evaluated,count*steps); assert.equal(passed,0); assert.equal(held.length,steps);
  console.log(JSON.stringify({mode,configs:count,steps,evaluated,passed,
    retainedHeapMiB:(process.memoryUsage().heapUsed-before)/1048576,
    rssMaxMiB:process.resourceUsage().maxRSS/1024,elapsedMs:performance.now()-start}));
}
