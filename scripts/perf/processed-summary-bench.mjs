// Synthetic retained-memory comparison. Full and summary must return identical coverage.
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/processed-summary-bench.mjs ROOT full|summary [SETS]
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
if(!globalThis.gc)throw Error('Use --expose-gc');const root=resolve(process.argv[2]??process.cwd()),mode=process.argv[3]??'summary',n=Number(process.argv[4]??10000);
if(!['full','summary'].includes(mode)||!Number.isSafeInteger(n)||n<10||n>100000)throw Error('Invalid benchmark');
const {ProcessedReplay}=await import(pathToFileURL(root+'/src/core/sim/processed-replay.ts').href),p=new ProcessedReplay({validationN:2,realN:2},.001),t=Date.UTC(2026,9,16),contexts=[];
for(let i=0;i<n;i++){const tp={id:`cfg-${i}`,ind:'rsi-mom-14-20@m1',kind:'normal'},at=t+i*3000,identity=p.identity(tp,'A',1,1.1);contexts.push({identity,minPf:1.1});const opened=p.enter(tp,'A',1,at,1.1);p.settle(opened,at+1000,i%4? .01:-.005);}
globalThis.gc();const before=process.memoryUsage().heapUsed,started=performance.now(),gen=p.reportGen(t+n*3000+1,contexts,mode);let yielded=0,r=gen.next();while(!r.done){yielded++;r=gen.next();}const ms=Math.round(performance.now()-started),result=r.value;globalThis.gc();const after=process.memoryUsage();const {basis,at,coverageScope,seededFromCandidates,validation,real}=result;
console.log(JSON.stringify({mode,sets:n,ms,yielded,retainedHeapMiB:Math.round((after.heapUsed-before)/1024/1024*100)/100,peakRssKiB:process.resourceUsage().maxRSS,details:'sets' in result,snapshot:'snapshot' in result,coverageSha256:createHash('sha256').update(JSON.stringify({basis,at,coverageScope,seededFromCandidates,validation,real})).digest('hex')}));
