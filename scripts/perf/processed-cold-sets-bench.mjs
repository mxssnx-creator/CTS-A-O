// Synthetic storage and exact-snapshot comparison for many independent, mostly cold processed sets.
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/processed-cold-sets-bench.mjs ROOT [SETS]
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
if(!globalThis.gc)throw Error('Use --expose-gc');const root=resolve(process.argv[2]??process.cwd()),n=Number(process.argv[3]??30000);
if(!Number.isSafeInteger(n)||n<10||n>100000)throw Error('invalid set count');
const {ProcessedSetBook}=await import(pathToFileURL(root+'/src/core/sim/processed-set.ts').href),p=new ProcessedSetBook('model',30),policy={validationN:30,realN:30,minPf:1.1};
globalThis.gc();const before=process.memoryUsage().heapUsed,t=performance.now();
for(let i=0;i<n;i++){const id={baseConfigId:`config-${i}`,symbol:'A',side:1,kind:'normal',lane:'m1',economicRevision:'fixed-cost'},at=2*i+1;p.acceptPostBase(id,`entry-${i}`,at,policy);p.close(id,`entry-${i}`,at,'final',at+1,i%4? .01:-.005,true);}
const ms=Math.round(performance.now()-t);globalThis.gc();const retainedHeapMiB=Math.round((process.memoryUsage().heapUsed-before)/1024/1024*100)/100;const s=p.snapshot();
console.log(JSON.stringify({sets:n,ms,retainedHeapMiB,peakRssKiB:process.resourceUsage().maxRSS,snapshotSets:s.sets.length,hash:createHash('sha256').update(JSON.stringify(s)).digest('hex')}));
