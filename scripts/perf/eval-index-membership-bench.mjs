// Run against each checkout in a separate process:
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/eval-index-membership-bench.mjs ROOT [TAPES]
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]??process.cwd()), count=Number(process.argv[3]??800000);
if (!globalThis.gc || !Number.isSafeInteger(count) || count < 1 || count > 2_000_000) throw new Error('Use --expose-gc and 1–2,000,000 tapes');
const {EvalMemo}=await import(pathToFileURL(root+'/src/core/sim/walkforward.ts').href);
const shared=new Float64Array(0), tapes=Array.from({length:count},()=>({exitT:shared,n:0}));
globalThis.gc();const a=process.memoryUsage(),start=performance.now();const m=new EvalMemo(),g=m.attach(tapes,0,10);while(!g.next().done){ /* drain slices */ }
globalThis.gc();const b=process.memoryUsage();console.log(JSON.stringify({count,ms:Math.round(performance.now()-start),heapBefore:a.heapUsed,heapAfter:b.heapUsed,heapDelta:b.heapUsed-a.heapUsed,rss:b.rss,tracking:m.tracking}));
