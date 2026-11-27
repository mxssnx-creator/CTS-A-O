// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/eval-event-index-bench.mjs ROOT [TAPES] [CLOSES_PER_TAPE] [aligned|irregular]
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root=resolve(process.argv[2]??process.cwd()), n=Number(process.argv[3]??10000), each=Number(process.argv[4]??100), mode=process.argv[5]??'aligned';
if (!globalThis.gc || !Number.isSafeInteger(n) || !Number.isSafeInteger(each) || n < 1 || n > 100000 || each < 1 || each > 1000 || !['aligned','irregular'].includes(mode))
  throw new Error('Use --expose-gc with bounded tapes and closes per tape');
const { EvalMemo }=await import(pathToFileURL(resolve(root,'src/core/sim/walkforward.ts')).href);
const start=Date.UTC(2026,9,15), M=60_000;
const tapes=Array.from({length:n},(_,i)=>{
  const xs=Array.from({length:each},(_,j)=>start+((i*29+j*31)%1440)*M+(mode==='irregular'&&i===0&&j===0?1:0)).sort((a,b)=>a-b);
  return {exitT:Float64Array.from(xs),n:xs.length};
});
globalThis.gc();const before=process.memoryUsage(), clock=performance.now(), memo=new EvalMemo(), g=memo.attach(tapes,start,start+1440*M);
let peakBuffers=before.arrayBuffers,peakRss=before.rss,yields=0,result;
do { result=g.next(); const x=process.memoryUsage();peakBuffers=Math.max(peakBuffers,x.arrayBuffers);peakRss=Math.max(peakRss,x.rss);if(!result.done)yields++; } while(!result.done);
const ms=Math.round(performance.now()-clock), h=createHash('sha256');
h.update(Buffer.from(memo.times.buffer,memo.times.byteOffset,memo.times.byteLength));h.update(Buffer.from(memo.owner.buffer,memo.owner.byteOffset,memo.owner.byteLength));
console.log(JSON.stringify({tapes:n,events:n*each,mode,ms,yields,peakBufferDelta:peakBuffers-before.arrayBuffers,peakRssKiB:Math.round(peakRss/1024),hash:h.digest('hex')}));
