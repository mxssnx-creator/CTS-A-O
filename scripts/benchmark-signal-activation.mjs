// Same-clock optimization benchmark on a deterministic sample of a frozen public-candle replay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {iterateSessionTapeTrades} from './lib/session-dump.mjs';
import {coverageTape} from './audit-signal-coverage.mjs';
import {activeSignalsAt,signalIndex,SignalActivationBook} from '../src/core/sim/walkforward.ts';
const [dir,output]=process.argv.slice(2), p=JSON.parse(readFileSync(resolve(dir,'protocol.json')));
const wf={...p.actualWf,signalRank:p.actualSettings.signals};
const tapes=[];let scanned=0;
for await(const row of iterateSessionTapeTrades(resolve(dir,'raw.json'))){
  if(row.kind==='exit')continue;
  if(scanned++%25===0)tapes.push(coverageTape(row,p.symbols));
}
const index=signalIndex(tapes),times=Array.from({length:61},(_,i)=>p.window.tradeStartT+i*60_000);
const reference=[],full=[];let mark=performance.now();
for(const t of times){const st=performance.now();reference.push([...activeSignalsAt(index,t,wf.signalRank,wf.signalLongH,wf)]);full.push(performance.now()-st);}
const fullMs=performance.now()-mark,book=new SignalActivationBook(index,wf.signalRank,wf.signalLongH,wf),cached=[];
let profiler;
const post=(method)=>new Promise((resolve,reject)=>profiler.post(method,(error,result)=>error?reject(error):resolve(result)));
if(process.env.CTS_ACTIVATION_PROFILE){const {Session}=await import('node:inspector');profiler=new Session();profiler.connect();await post('Profiler.enable');await post('Profiler.start');}
mark=performance.now();
for(let i=0;i<times.length;i++){
  const st=performance.now(),g=book.at(times[i]);let out;
  for(;;){const r=g.next();if(r.done){out=r.value;break;}}
  cached.push(performance.now()-st);assert.deepEqual([...out],reference[i],`minute ${i}`);
}
const totalMs=performance.now()-mark;
if(profiler){const {profile}=await post('Profiler.stop');writeFileSync(process.env.CTS_ACTIVATION_PROFILE,JSON.stringify(profile));profiler.disconnect();}
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const result={ok:true,scope:'Sampled exact contexts; fresh full rank vs cached completed-hour rank with exact-minute own gates. Not a venue-latency benchmark.',
 tapes:tapes.length,closes:tapes.reduce((s,t)=>s+t.n,0),minutes:times.length,fullMs,cachedMs:totalMs,
 fullMedianMs:median(full),cachedMedianMs:median(cached),cachedMaxMs:Math.max(...cached),
 keys:reference.map(x=>x.length),rssMiB:process.memoryUsage().rss/1048576};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
