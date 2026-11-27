// Synthetic comparison of copying the fixed processed cohort versus querying its union with changing seats.
// node --expose-gc scripts/perf/processed-seat-union-bench.mjs copy|membership
import {createHash} from 'node:crypto';if(!globalThis.gc)throw Error('Use --expose-gc');
const mode=process.argv[2]??'membership';if(!['copy','membership'].includes(mode))throw Error('invalid mode');
const base=new Set(Array.from({length:100000},(_,i)=>`base-${i}`)),seats=new Set(),active=new Set(),queries=[];
for(let i=0;i<10000;i++)queries.push(i%3===0?`base-${i*7}`:i%3===1?`seat-${i}`:`missing-${i}`);
globalThis.gc();const before=process.memoryUsage().heapUsed,start=performance.now(),hash=createHash('sha256');let total=0;
for(let step=0;step<80;step++){
 seats.clear();for(let i=0;i<10000;i++)seats.add(`seat-${(i+step*31)%14000}`);
 if(mode==='copy'){active.clear();for(const id of base)active.add(id);for(const id of seats)active.add(id);}
 const has=mode==='copy'?id=>active.has(id):id=>base.has(id)||seats.has(id);let hits=0;for(const id of queries)if(has(id))hits++;
 total+=hits;hash.update(String(hits)+';');
}
const ms=Math.round(performance.now()-start);globalThis.gc();console.log(JSON.stringify({mode,base:base.size,refreshes:80,queries:queries.length,total,ms,retainedHeapMiB:Math.round((process.memoryUsage().heapUsed-before)/1024/1024*100)/100,peakRssKiB:process.resourceUsage().maxRSS,sha256:hash.digest('hex')}));
