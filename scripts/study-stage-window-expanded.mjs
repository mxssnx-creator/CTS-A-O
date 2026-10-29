#!/usr/bin/env node
// Exact-context, factored parameter study. Empty downstream branches carry a checked mathematical certificate.
import { createHash } from 'node:crypto';
import { createWriteStream, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { createGzip, gunzipSync } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { DEFAULT_SETTINGS } from '../src/core/config.ts';
import { barsFromCandles, resample } from '../src/core/market/bars.ts';
import { SeriesCache } from '../src/core/indications/cache.ts';
import { lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from '../src/core/indications/low-range-research.ts';
import { configId, laneProtect } from '../src/core/pipeline/pipeline.ts';
import { sideSignal, simulate } from '../src/core/sim/backtest.ts';
import { StageChainBook } from '../src/core/sim/stage-chain.ts';
import { DEFAULT_STAGE_CHAIN } from '../src/core/sim/stage-policy.ts';
import { StageWindowIndex } from '../src/core/sim/stage-window-index.ts';
import { simulateStageSource } from '../src/core/sim/stage-source.ts';
import { positionOrderCounts } from '../src/core/positions.ts';

const output=process.argv[2],range=process.argv[3]??'mc',holdMinutes=Number(process.argv[4]??15),prehistoryHours=Number(process.argv[5]??24);
if(!output||!['mc','mn','sh'].includes(range)||![15,30,60].includes(holdMinutes)||![24,48].includes(prehistoryHours))
  throw new Error('usage: study-stage-window-expanded.mjs NEW_OUTPUT_DIRECTORY [mc|mn|sh] [15|30|60] [24|48 prehistory hours]');
mkdirSync(output,{recursive:true});
const M=60000,H=60*M,start=Date.parse('2026-10-08T12:00:00Z'),from=start-prehistoryHours*H,end=start+24*H,minPf=1.1;
const sha=b=>createHash('sha256').update(b).digest('hex'),feedPath='docs/micro-optimization-2026-10-20/reproduction-feed.json.gz',
  bytes=readFileSync(feedPath),feed=JSON.parse(gunzipSync(bytes)),symbols=feed.tickers.map(x=>x.sym).sort(),basePolicies=[],rejectedPairs=[],negativePolicies=[];
if(symbols.length!==20||new Set(symbols).size!==20)throw new Error('twenty unique symbols required');
for(const long of [20,30,40,50])for(const short of [5,10,15,20,25]){
  if(short>long*.5){rejectedPairs.push({long,short,reason:'short exceeds50% of long'});continue;}
  for(const minimal of [null,...[1,2,3].flatMap(n=>['positive','negative'].map(polarity=>({n,polarity})))])
    basePolicies.push({id:`${long}-${short}-${minimal?`${minimal.n}${minimal.polarity[0]}`:'off'}`,long,short,minimal});
}
for(let mask=1;mask<16;mask++)for(const combination of ['all','mean']){
  const windows=[1,2,5,10].filter((_,i)=>mask&(1<<i));negativePolicies.push({id:`${windows.join('_')}-${combination}`,windows,combination});
}
const ongoing=[1,5,15,25],sourcePaths=['scripts/study-stage-window-expanded.mjs','src/core/sim/stage-window-index.ts',
  'src/core/sim/stage-policy.ts','src/core/sim/stage-settings.ts','src/core/sim/stage-source.ts','src/core/sim/stage-chain.ts',
  'src/core/sim/backtest.ts','src/core/sim/entry-admission.ts','src/core/indications/low-range-research.ts','src/core/positions.ts'];
const protocol={version:2,scope:'Twenty-symbol isolated Low-Range Normal/Trailing model. No additional/Overall volume adjustment, allocation, funding, production ownership or venue fills.',
  from,start,end,prehistoryHours,simulationHours:24,range,holdMinutes,tfs:[1,5,15],symbols,minPf,cost:DEFAULT_SETTINGS.cost,
  basePolicies,rejectedPairs,mainPrimaryN:50,mainSecondarySamples:ongoing,realSamples:ongoing,negativePolicies,
  caseCount:basePolicies.length*ongoing.length**2*(negativePolicies.length+1),feedSha256:sha(bytes),
  sourceSha256:Object.fromEntries(sourcePaths.map(p=>[p,sha(readFileSync(p))])),
  clock:'Prior-entry closed-bar outcomes observed at phase0 before next-open decision phase1; no current-entry or future outcome.',
  factorization:'Only exact-context identical complete admission masks share an immutable economic simulation. Policy lineage remains independent. A no-primary-pass certificate proves all downstream positive Main50 gates and negative triggers reject; empty is unavailable PF, never a pass.',
  normalization:'Raw orders, source attempts, masks and derived edges are stored once per exact context; all48608 policy combinations are explicitly listed in results. Sparse hourly arrays imply zero activity in omitted hours.',
  admission:'Base long+short positive PF plus optional signed minimal; Main processes only Base-qualified entries. Real processes only its own Main-qualified entries; Active mirrors own Real-qualified entries with no further Last-N. Inverse is separately simulated opposite intent after its declared negative trigger.',
  caveat:'Retrospective expanded comparison on a previously inspected period. No claim of untouched holdout or guaranteed future PF.'};
protocol.economicRevision=sha(JSON.stringify([protocol.feedSha256,protocol.cost,protocol.sourceSha256,protocol.clock]));
writeFileSync(`${output}/protocol.json`,JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
const zip=createGzip({level:1}),destination=createWriteStream(`${output}/contexts.jsonl.gz`,{flags:'wx'}),finished=pipeline(zip,destination);finished.catch(()=>{});
const code={qualified:1,failed:2,insufficient:3,unknown:4,parentMissing:5},state=n=>Object.keys(code).find(k=>code[k]===n),
  blank=()=>({qualified:0,failed:0,insufficient:0,unknown:0,parentMissing:0}),add=(a,b)=>{for(const k of Object.keys(a))a[k]+=b[k]??0;return a;},
  combine=ws=>ws.some(w=>w.state==='unknown')?'unknown':ws.some(w=>w.state==='insufficient')?'insufficient':ws.every(w=>w.state==='qualified')?'qualified':'failed',
  fresh=()=>({orders:[],checks:blank()}),aggregates=new Map(),hist=new Map(),pruned=new Map();
const get=k=>{let x=aggregates.get(k);if(!x)aggregates.set(k,x=fresh());return x;},
  rows=result=>result.trades.map(t=>({orderId:`${t.side}|${t.entryT}`,entryT:t.entryT,exitT:t.exitT,knownT:t.exitT,knownSeq:0,unitReturn:t.r})),
  entries=result=>[...result.trades,...result.open?[result.open]:[]],
  measure=(result,c)=>[...result.trades.filter(t=>t.entryT>=start&&t.entryT<end).map(t=>({...t,closed:true,tf:c.tf,kind:c.kind})),
    ...result.open&&result.open.entryT>=start&&result.open.entryT<end?[{...result.open,exitT:end,closed:false,tf:c.tf,kind:c.kind}]:[]];
function record(key,result,c,checks){const a=get(key);a.orders.push(...measure(result,c));add(a.checks,checks);}
function stats(a=fresh()){
  const xs=a.orders,closed=xs.filter(t=>t.closed),held=xs.filter(t=>!t.closed);let gp=0,gl=0;const reasons={},hours=new Map(),groups={};
  for(const t of closed){gp+=Math.max(0,t.r);gl+=Math.max(0,-t.r);reasons[t.reason]=(reasons[t.reason]??0)+1;
    const hour=Math.ceil((t.exitT-start)/H)-1;if(hour>=0&&hour<24){const h=hours.get(hour)??{hour,n:0,gp:0,gl:0};h.n++;h.gp+=Math.max(0,t.r);h.gl+=Math.max(0,-t.r);hours.set(hour,h);}}
  for(const kind of ['normal','trailing'])for(const tf of [1,5,15])for(const side of [1,-1]){
    const sub=xs.filter(t=>t.kind===kind&&t.tf===tf&&t.side===side),cs=sub.filter(t=>t.closed),hs=sub.filter(t=>!t.closed);let gain=0,loss=0;
    for(const t of cs){gain+=Math.max(0,t.r);loss+=Math.max(0,-t.r);}groups[`${kind}|${tf}|${side}`]={...positionOrderCounts(cs,hs),gp:gain,gl:loss,pf:loss?gain/loss:null,noLoss:gain>0&&!loss};}
  const evaluated=a.checks.qualified+a.checks.failed+a.checks.insufficient+a.checks.unknown;
  return {...positionOrderCounts(closed,held),gp,gl,pf:closed.length&&gl?gp/gl:null,noLoss:gp>0&&!gl,reasons,
    checks:{...a.checks,evaluated,attempted:evaluated+a.checks.parentMissing,percent:evaluated?100*a.checks.qualified/evaluated:null},
    hourly:[...hours.values()].sort((a,b)=>a.hour-b.hour),groups};
}
let contextCount=0,simulationCount=0,reusedSimulations=0,certificateCount=0,maxHeap=0,maxRss=0;const began=performance.now();
try{
for(const sym of symbols){const minutes=feed.candles[`${sym}|1`].filter(c=>c.t>=from&&c.t<end);
  if(minutes.length!==(prehistoryHours+24)*60||minutes.some((c,i)=>c.t!==from+i*M))throw new Error(`incomplete minute coverage ${sym}`);
  for(const tf of [1,5,15]){const bars=barsFromCandles(sym,tf,tf===1?minutes:resample(minutes,1,tf)),cache=new SeriesCache(bars);
  for(const window of [1,6])for(const method of ['edge-turn','failed-break','breakout','mid-reclaim','compression-break'])for(const relation of ['standalone','trend']){
    const ind=`low-range-${window}-${method}-${relation}@m${tf}`,signalState=lowRangeState(cache,window,method,relation),onset=new Int8Array(bars.n);
    for(let i=1;i<bars.n;i++)if(signalState[i]&&signalState[i]!==signalState[i-1])onset[i]=signalState[i];
    for(const ref of lowRangeProtects({...DEFAULT_LOW_RANGE_POLICY,steps:[3],slRatios:[1],trailRatios:[0,.5],tags:[range]})){
      const protect=laneProtect({...ref,hold:Math.max(1,Math.floor(holdMinutes/tf)),maxHoldMin:holdMinutes},ind),kind=protect.trail?'trailing':'normal',cfg=configId('follow',ind,protect);
      for(const side of [1,-1]){
        const source={cfg,bars,side,signal:sideSignal(onset,side),protect,cost:protocol.cost,kind},raw=simulate(cfg,bars,source.signal,protect,{cost:protocol.cost}),
          c={cfg,sym,side,tf,kind,relation},times=[];
        for(let i=0;i<bars.n-1;i++)if(source.signal[i])times.push(bars.t[i+1]);
        const timeIndex=new Map(times.map((t,i)=>[t,i])),streams=[{trades:raw.trades,open:raw.open??null,pending:0,pendingIntent:raw.pending?{state:'raw-diagnostic',side:raw.pending}:null}],
          computations=[],simulations=new Map(),indexes=new Map(),baseEdges=[],potential=times.filter(t=>t>=start&&t<end).length;
        const identity={baseConfigId:cfg,symbol:sym,side,kind,lane:relation,economicRevision:protocol.economicRevision},book=new StageChainBook('model',DEFAULT_STAGE_CHAIN),
          base=book.base(identity,minPf),main=book.main(base.id,'no-additional-strategies'),inverse=book.inverseMain(main.id,'negative-main-inverse'),
          ix=id=>{let x=indexes.get(id);if(!x)indexes.set(id,x=new StageWindowIndex(rows(streams[id])));return x;},
          win=(id,n,t)=>ix(id).window(n,minPf,t,1),pack=w=>({n:w.n,requestedN:w.requestedN,pf:w.pf,mean:w.mean,state:w.state}),
          simulateMask=(direction,mask)=>{
            const key=`${direction}:${mask.join('')}`;let hit=simulations.get(key);if(hit){reusedSimulations++;return hit;}
            const attempts=[],set=direction===side?main:inverse,result=simulateStageSource(set,source,e=>{attempts.push(e.entryT);return !!mask[timeIndex.get(e.entryT)];});
            const stream=streams.length;streams.push({trades:result.trades,open:result.open??null,pending:0,pendingIntent:result.pendingIntent??null});
            hit={stream,attempts};simulations.set(key,hit);simulationCount++;return hit;
          },
          evaluate=(parent,descriptor,verdict,direction)=>{
            const states=times.map(verdict),mask=states.map(s=>Number(s===code.qualified)),run=simulateMask(direction,mask),checks=blank(),decisions=[];
            for(const t of run.attempts)if(t>=start&&t<end){const s=states[timeIndex.get(t)];checks[state(s)]++;decisions.push([t,s]);}
            const comp=computations.length;computations.push({parent,descriptor,direction,stream:run.stream,attempts:run.attempts,decisions});return {comp,...run,checks};
          };
        for(const bp of basePolicies){
          const judge=t=>{const ws=[win(0,bp.long,t),win(0,bp.short,t)];let s=combine(ws);
            if(bp.minimal){const w=win(0,bp.minimal.n,t),sign=w.mean!==null&&(bp.minimal.polarity==='positive'?w.mean>0:w.mean<0),m={...w,state:w.state==='unknown'||w.state==='insufficient'?w.state:sign?'qualified':'failed'};s=combine([...ws,m]);}
            return code[s];},mainRun=evaluate(0,{stage:'main',basePolicy:bp.id},judge,side),mainResult=streams[mainRun.stream],parentEntries=new Set(entries(mainResult).map(t=>t.entryT)),
            parentAt=t=>parentEntries.has(t),pwin=t=>win(mainRun.stream,50,t),h=hist.get(bp.id)??{passed:0,evaluated:0,gp:0,gl:0};
          h.evaluated++;if(judge(start)===code.qualified){h.passed++;const w=win(0,bp.long,start);h.gp+=w.gp;h.gl+=w.gl;}hist.set(bp.id,h);
          record(`M|${bp.id}`,mainResult,c,mainRun.checks);
          const edge={policy:bp.id,main:mainRun.comp,checkpoint:{primary:pack(win(0,bp.long,start)),secondary:pack(win(0,bp.short,start)),state:state(judge(start))}};
          if(![...parentEntries].some(t=>pwin(t).state==='qualified')){
            const checks=blank();for(const t of times)if(t>=start&&t<end)checks[parentAt(t)?pwin(t).state:'parentMissing']++;
            const cert={parentStream:mainRun.stream,primaryN:50,parentEntries:[...parentEntries],maxOwnN:Math.max(0,...[...parentEntries].map(t=>pwin(t).n)),checks,potential};
            edge.certificate=cert;certificateCount++;const p=pruned.get(bp.id)??{checks:blank(),potential:0,contexts:0};add(p.checks,checks);p.potential+=potential;p.contexts++;pruned.set(bp.id,p);
          }else{
            edge.branches=[];
            const branches=[{id:'direct',stream:mainRun.stream}];
            for(const np of negativePolicies){const inv=evaluate(mainRun.stream,{stage:'inverseMain',negativePolicy:np.id},t=>{
              if(!parentAt(t))return code.parentMissing;const primary=pwin(t),ws=np.windows.map(n=>win(mainRun.stream,n,t));
              if(primary.state==='insufficient'||ws.some(w=>w.state==='insufficient'))return code.insufficient;
              if(primary.state==='unknown'||ws.some(w=>w.state==='unknown'))return code.unknown;
              const negative=np.combination==='all'?ws.every(w=>w.mean<0):ws.reduce((a,w)=>a+w.mean,0)/ws.length<0;
              return primary.state==='qualified'&&negative?code.qualified:code.failed;
            },-side);record(`I|${bp.id}|${np.id}`,streams[inv.stream],c,inv.checks);branches.push({id:np.id,stream:inv.stream,comp:inv.comp});}
            for(const branch of branches){const parent=streams[branch.stream],parents=new Set(entries(parent).map(t=>t.entryT)),out={variant:branch.id,main:branch.comp??mainRun.comp,real:[]};
              for(const n of ongoing){const real=evaluate(branch.stream,{stage:'real',mainSecondaryN:n},t=>parents.has(t)?code[combine([win(branch.stream,50,t),win(branch.stream,n,t)])]:code.parentMissing,branch.id==='direct'?side:-side);
                record(`R|${bp.id}|${branch.id}|${n}`,streams[real.stream],c,real.checks);const re={n,comp:real.comp,active:[]};
                for(const rn of ongoing){const decisions=[],pass=new Set();for(const t of entries(streams[real.stream])){const w=win(real.stream,rn,t.entryT);if(t.entryT>=start&&t.entryT<end)decisions.push([t.entryT,code[w.state]]);if(w.state==='qualified')pass.add(t.entryT);}
                  const active={trades:streams[real.stream].trades.filter(t=>pass.has(t.entryT)),open:streams[real.stream].open&&pass.has(streams[real.stream].open.entryT)?streams[real.stream].open:null,pending:0},stream=streams.length;streams.push(active);
                  const checks=blank();for(const [,s]of decisions)checks[state(s)]++;record(`A|${bp.id}|${branch.id}|${n}|${rn}`,active,c,checks);re.active.push({n:rn,stream,decisions});}
                out.real.push(re);
              }edge.branches.push(out);
            }
          }baseEdges.push(edge);
        }
        const evidence={...c,protect,times,raw:0,streams,computations,base:baseEdges};
        if(!zip.write(JSON.stringify(evidence)+'\n'))await once(zip,'drain');contextCount++;
      }
    }
  }}
  const mem=process.memoryUsage();maxHeap=Math.max(maxHeap,mem.heapUsed);maxRss=Math.max(maxRss,mem.rss);
  writeFileSync(`${output}/progress.json`,JSON.stringify({sym,contexts:contextCount,expected:4800,elapsedSeconds:(performance.now()-began)/1000,rssBytes:mem.rss})+'\n');
  process.stderr.write(`${sym}: ${contextCount}/4800 contexts, ${Math.round(mem.rss/1048576)} MiB RSS\n`);
}
if(contextCount!==4800)throw new Error('incomplete context coverage');zip.end();await finished;
const summaries=[],summaryIds=new Map(),internSummary=s=>{const key=JSON.stringify(s);let id=summaryIds.get(key);if(id===undefined){id=summaries.length;summaryIds.set(key,id);summaries.push(s);}return id;},
  summary=(key,extra)=>{const a=aggregates.get(key)??fresh();return internSummary(stats({orders:a.orders,checks:extra?add({...a.checks},extra):a.checks}));},
  bases=[],cases=[];
for(const bp of basePolicies){const p=pruned.get(bp.id)??{checks:blank(),potential:0,contexts:0},h=hist.get(bp.id),main=summary(`M|${bp.id}`);
  bases.push({policy:bp.id,historical:{...h,percent:100*h.passed/h.evaluated,pf:h.gl?h.gp/h.gl:null,noLoss:h.gp>0&&!h.gl},main,
    certifiedContexts:p.contexts,certifiedNoPrimaryChecks:p.checks});
  for(const variant of ['direct',...negativePolicies.map(p=>p.id)]){
    const m=variant==='direct'?main:summary(`I|${bp.id}|${variant}`,p.checks);
    for(const n of ongoing){const noParent=blank();noParent.parentMissing=p.potential;
      const r=summary(`R|${bp.id}|${variant}|${n}`,variant==='direct'?p.checks:noParent);
      for(const rn of ongoing)cases.push({id:`${bp.id}|${variant}|${n}|${rn}`,base:bp.id,variant,mainN:n,realN:rn,main:m,real:r,active:summary(`A|${bp.id}|${variant}|${n}|${rn}`)});
    }
  }
}
writeFileSync(`${output}/results.json`,JSON.stringify({contextCount,cases,bases,summaries,elapsedSeconds:(performance.now()-began)/1000,
  computation:{simulationCount,reusedSimulations,certificateCount,caseCount:cases.length},memory:{maxSampledHeapBytes:maxHeap,maxSampledRssBytes:maxRss}},null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({output,contexts:contextCount,cases:cases.length,uniqueSummaries:summaries.length,simulationCount,reusedSimulations,certificateCount})+'\n');
}catch(error){zip.destroy(error);await finished.catch(()=>{});throw error;}
