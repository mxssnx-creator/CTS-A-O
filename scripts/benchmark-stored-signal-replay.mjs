// Compare the complete replay result, including losing orders, after changing history access/scheduling.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [input, output, rootArg='.', strideArg='100'] = process.argv.slice(2);
const root=resolve(rootArg), stride=Number(strideArg);
if(!Number.isSafeInteger(stride)||stride<1)throw new Error('Positive integer sample stride required');
const moduleAt=path=>import(pathToFileURL(resolve(root,path)).href);
const {iterateSessionTapeTrades}=await moduleAt('scripts/lib/session-dump.mjs');
const {coverageTape}=await moduleAt('scripts/audit-signal-coverage.mjs');
const {walkForward}=await moduleAt('src/core/sim/walkforward.ts');
const {TapeHistoryStore}=await moduleAt('src/core/server/history-store.server.ts');
const protocol=JSON.parse(readFileSync(resolve(input,'protocol.json')));
const wf={...protocol.actualWf,signalRank:protocol.actualSettings.signals,
  startT:protocol.window.tradeStartT,simH:12};
const store=new TapeHistoryStore({cacheBytes:1024*1024});
const tapes=[];let scanned=0,closes=0;
try {
  for await(const row of iterateSessionTapeTrades(resolve(input,'raw.json'))){
    if(scanned++%stride)continue;
    const tape=coverageTape(row,protocol.symbols);closes+=tape.n;tapes.push(store.append(tape));
  }
  global.gc?.();
  const start=performance.now();
  const result=walkForward({bars:[],caches:[],baseTf:1,startT:protocol.window.evaluationFromT,
    endT:protocol.window.endT,nowT:protocol.window.endT,splitT:protocol.window.tradeStartT},tapes,wf);
  const elapsedMs=performance.now()-start,json=JSON.stringify(result);
  writeFileSync(output+'.result.json',json);
  const summary={scope:'Deterministic sampled 12h frozen-candle replay; 1MiB cache deliberately forces eviction. Not full-catalog or venue latency.',
    root,stride,tapes:tapes.length,closes,elapsedMs,rssMiB:process.memoryUsage().rss/1048576,
    source: createHash('sha256').update(readFileSync(resolve(root,'src/core/sim/walkforward.ts'))).digest('hex'),
    resultSha256:createHash('sha256').update(json).digest('hex'),history:{...store.stats},
    settled:result.trades.length,held:result.openAtEnd.length};
  writeFileSync(output+'.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
} finally {store.close();}
