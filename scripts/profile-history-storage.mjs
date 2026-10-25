// Measure exact binary redundancy before choosing a bounded storage representation. No PF tuning.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {BoundedHistory} from '../src/core/server/history-store.server.ts';
import {readSessionFeed} from './lib/session-feed.mjs';
import {barsFromCandles,resample} from '../src/core/market/bars.ts';
import {allCombos,makeUniverse} from '../src/core/pipeline/pipeline.ts';
import {INDICATION_BY_ID,laneOf} from '../src/core/indications/registry.ts';
import {rangeMinTfOf} from '../src/core/minimal-coord.ts';
import {buildTapesBoundedGen,tapeBytes} from '../src/core/sim/walkforward.ts';
const [protocol,feedPath,out,mode]=process.argv.slice(2),p=JSON.parse(readFileSync(protocol)),s=p.actualSettings,wf=p.actualWf;
let feed=readSessionFeed(feedPath);
const bars=p.symbols.flatMap(sym=>s.tfs.map(tf=>barsFromCandles(sym,tf,resample(feed.candles[`${sym}|1`]
  .filter(c=>c.t>=p.window.evaluationFromT-24*3_600_000&&c.t<p.window.endT),1,tf))));
feed=null;
const combos=allCombos(undefined,undefined,s.tfs),pairs=['ema','micro','inverse'].map(kind=>{
 const c=combos.find(c=>c.bot==='follow'&&(INDICATION_BY_ID.get(laneOf(c.ind).base)?.kind===kind));
 if(!c)throw new Error('Missing representative '+kind);return `${c.bot}|${c.ind}`;
});
const results=[];
for(const pair of pairs){
 const u=makeUniverse(bars,p.window.evaluationFromT),start=performance.now(),owner=mode==='bounded'?new BoundedHistory():null;
 let peakRss=process.memoryUsage().rss;
 const g=buildTapesBoundedGen(u,wf.protects,s.cost,{protects:wf.dcaProtects,dca:wf.dca,axis:s.axis},new Set([pair]),s.tactics,null,
   {...s.protectFloor,microOwnInds:true,rangeMinTf:rangeMinTfOf(s.grid),...(owner?{tapeSink:owner.retain}:{})});
 let tapes;for(;;){const r=g.next();peakRss=Math.max(peakRss,process.memoryUsage().rss);if(r.done){tapes=r.value;break;}}
 const full=new Map(),columns=new Map(),kinds={},catalogHash=createHash('sha256');let bytes=0,rawColumnBytes=0;
 const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const t of tapes){
   kinds[t.kind]=(kinds[t.kind]??0)+1;
   const b=Buffer.from(t.exitT.buffer,t.exitT.byteOffset,tapeBytes(t.n));bytes+=b.length;full.set(hash(b),b.length);catalogHash.update(t.id).update(b);
   for(const k of ['exitT','entryT','r','gp','gl','rs','r2','entry','exit','vol','symI','bars','side','reason','level']){
     const a=t[k],b=Buffer.from(a.buffer,a.byteOffset,a.byteLength);rawColumnBytes+=b.length;
     columns.set(`${k}:${hash(b)}`,b.length);
   }
 }
 const result={pair,tapes:tapes.length,closes:tapes.reduce((n,t)=>n+t.n,0),kinds,bytes,
   uniqueTapeBytes:[...full.values()].reduce((s,n)=>s+n,0),rawColumnBytes,
   uniqueColumnBytes:[...columns.values()].reduce((s,n)=>s+n,0),ms:performance.now()-start,rssMiB:process.memoryUsage().rss/1048576,peakRssMiB:peakRss/1048576,catalogSha256:catalogHash.digest('hex'),storage:owner?.store?.stats};
 results.push(result);writeFileSync(resolve(out),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(result));
 tapes=null;owner?.close();globalThis.gc?.();
}
