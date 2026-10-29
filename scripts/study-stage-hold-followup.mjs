#!/usr/bin/env node
// Frozen, bounded research: independently simulate every processed stage; never reuse raw Base as Main history.
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
import { DEFAULT_STAGE_CHAIN, dualStageGate, negativeMainTrigger, singleStageGate } from '../src/core/sim/stage-policy.ts';
import { simulateStageSource } from '../src/core/sim/stage-source.ts';
import { positionOrderCounts } from '../src/core/positions.ts';

const output=process.argv[2], range=process.argv[3]??'mc', holdMinutes=Number(process.argv[4]??15);
if(!output||!['mc','mn','sh'].includes(range)||![15,30,60].includes(holdMinutes))
  throw new Error('usage: study-stage-hold-followup.mjs NEW_OUTPUT_DIRECTORY [mc|mn|sh] [15|30|60]');
mkdirSync(output,{recursive:true});
const M=60_000,H=60*M,from=Date.parse('2026-10-07T12:00:00Z'),start=from+24*H,end=start+24*H,
  primarySamples=[20,50],secondarySamples=[15],ongoingSamples=[15],minPf=1.1;
const feedPath='docs/micro-optimization-2026-10-20/reproduction-feed.json.gz',bytes=readFileSync(feedPath),feed=JSON.parse(gunzipSync(bytes)),
  symbols=feed.tickers.map(x=>x.sym).sort(),sha=b=>createHash('sha256').update(b).digest('hex');
if(symbols.length!==20||new Set(symbols).size!==20)throw new Error('exactly twenty independent symbols required');
const sourcePaths=['scripts/study-stage-hold-followup.mjs','src/core/sim/stage-policy.ts','src/core/sim/stage-source.ts',
  'src/core/sim/stage-chain.ts','src/core/sim/entry-admission.ts','src/core/sim/backtest.ts','src/core/sim/dca.ts',
  'src/core/sim/axis.ts','src/core/indications/low-range-research.ts','src/core/positions.ts'];
const protocol={scope:'Isolated twenty-symbol Low-Range Normal/Trailing model, Micro/Minimal/Short reported independently. No additional/Overall volume adjustments, allocation, funding, production paper or exchange fills.',
  from,start,end,prehistoryHours:24,simulationHours:24,symbols,range,holdMinutes,tfs:[1,5,15],primarySamples,secondarySamples,
  mainPrimaryN:50,mainSecondarySamples:ongoingSamples,realSamples:ongoingSamples,negativeMainWindows:[5,10],minPf,cost:DEFAULT_SETTINGS.cost,
  feedSha256:sha(bytes),sourceSha256:Object.fromEntries(sourcePaths.map(p=>[p,sha(readFileSync(p))])),
  caseCount:primarySamples.length*secondarySamples.length*ongoingSamples.length**2,
  rule:'Paired hold follow-up: Base uses primary 20/50 and secondary 15. Main retains primary 50 and secondary 15; Real uses single 15. Hold changes alone, with its own Base/processed validation and identity. Every window uses only own complete predecessor orders closed before entry; no cold pass.',
  independentPeriod:'This trading period ends before the previously reported 10 October 00:00-12:00 UTC study. It is a frozen retrospective parameter comparison, not an untouched prospective profitability proof.',
  inverseRule:'Separate opposite-intent Main simulation requires positive original Main primary 50 plus negative average Last-5/10; inverse Main and Real must pass their own positive windows. Never negate return.',
  activeRule:'An unallocated model mirror of exact Real entries passing Real Last-N, with no additional Last-N. Each modeled Active close uses the same Real price/protection result. Not a venue fill.',
  cohortRule:'New entries in [start,end) only; prehistory carry-in is listed separately. Held endpoint MTM is excluded from closed-return PF.',
  noLossConvention:'Gate uses score 4 when gain>0 and loss=0. Report measured finite PF is unavailable without losses; no-loss sample is disclosed.',
  selectionRule:'A fixed paired hold comparison against the Micro 15m baseline. Different protection durations are independently revalidated. No default is selected from an empty Active cohort or from a Main-only improvement.'};
protocol.economicRevision=sha(JSON.stringify([protocol.feedSha256,protocol.cost,protocol.sourceSha256]));
writeFileSync(`${output}/protocol.json`,JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
const zip=createGzip({level:1}),destination=createWriteStream(`${output}/contexts.jsonl.gz`,{flags:'wx'}),
  finished=pipeline(zip,destination);finished.catch(()=>{});
const blank=()=>({qualified:0,failed:0,insufficient:0,unknown:0,parentMissing:0}),
  names=['main','inverseMain','real','inverseReal','active','inverseActive'],
  fresh=()=>({historical:{base:0,baseGp:0,baseGl:0,main:0,inverseMain:0},
    decisions:Object.fromEntries(names.map(n=>[n,blank()])),stages:Object.fromEntries(names.map(n=>[n,[]])),
    readiness:{matchedMain:0,maxMainOwnN:0,mainFullPrimary:0,matchedInverse:0,maxInverseOwnN:0,inverseFullPrimary:0}}),cases=new Map();
for(const p of primarySamples)for(const b of secondarySamples)for(const m of ongoingSamples)for(const r of ongoingSamples)cases.set(`${p}|${b}|${m}|${r}`,fresh());
const policy=(primaryN,secondaryN)=>({primaryN,secondaryN,secondaryMode:'static',secondaryWindows:[5,10,15,20,25]});
const rowsOf=result=>result.trades.map(t=>({orderId:`${t.side}|${t.entryT}`,entryT:t.entryT,exitT:t.exitT,knownT:t.exitT,unitReturn:t.r}))
  .sort((a,b)=>a.exitT-b.exitT||a.entryT-b.entryT||a.orderId.localeCompare(b.orderId));
const before=(rows,t)=>{let a=0,b=rows.length;while(a<b){const mid=(a+b)>>>1;if(rows[mid].exitT<t)a=mid+1;else b=mid;}return rows.slice(Math.max(0,a-50),a);};
const gate=(rows,t,p,b)=>dualStageGate(before(rows,t),policy(p,b),minPf,t),
  compact=g=>({state:g.state,primary:{n:g.primary.n,pf:g.primary.pf},secondary:g.secondary.map(w=>({requestedN:w.requestedN,n:w.n,pf:w.pf}))});
const records=(result,context)=>[...result.trades.map(t=>({...t,closed:true,tf:context.tf,kind:context.kind})),
  ...(result.open?[{...result.open,exitT:end,closed:false,tf:context.tf,kind:context.kind}]:[])];
const entrySet=(result,context)=>new Set(records(result,context).map(t=>t.entryT));
const mirror=(result,sourceRows,n)=>{const passing=new Set(),decisions=[];
  for(const t of [...result.trades,...(result.open?[result.open]:[])]){const g=singleStageGate(before(sourceRows,t.entryT),n,minPf,t.entryT);
    if(t.entryT>=start)decisions.push({entryT:t.entryT,...compact(g)});if(g.state==='qualified')passing.add(t.entryT);}
  return{result:{trades:result.trades.filter(t=>passing.has(t.entryT)),open:result.open&&passing.has(result.open.entryT)?result.open:null,pending:0},decisions};};
const summarize=orders=>{const closed=orders.filter(t=>t.closed),held=orders.filter(t=>!t.closed);let gp=0,gl=0;const reasons={},hourly=[];
  for(const t of closed){if(!Number.isFinite(t.r))throw new Error('unknown model return');gp+=Math.max(0,t.r);gl+=Math.max(0,-t.r);reasons[t.reason]=(reasons[t.reason]??0)+1;}
  for(let t=start;t<end;t+=H){const xs=closed.filter(x=>x.exitT>t&&x.exitT<=t+H);let gain=0,loss=0;for(const x of xs){gain+=Math.max(0,x.r);loss+=Math.max(0,-x.r);}hourly.push({t,n:xs.length,gp:gain,gl:loss,pf:loss?gain/loss:null,net:gain-loss});}
  return{...positionOrderCounts(closed,held),grossProfit:gp,grossLoss:gl,returnPf:closed.length&&gl>0?gp/gl:null,
    noLoss:closed.length>0&&gp>0&&gl===0,reasons,hourly};};
let contextCount=0,maxHeap=0,maxRss=0;const started=performance.now();
try{
for(const sym of symbols){const minutes=(feed.candles[`${sym}|1`]??[]).filter(c=>c.t>=from&&c.t<end);
  if(minutes.length!==48*60||minutes.some((c,i)=>c.t!==from+i*M))throw new Error(`missing exact minute coverage: ${sym}`);
  for(const tf of protocol.tfs){const bars=barsFromCandles(sym,tf,tf===1?minutes:resample(minutes,1,tf)),cache=new SeriesCache(bars);
  for(const window of [1,6])for(const method of ['edge-turn','failed-break','breakout','mid-reclaim','compression-break'])for(const relation of ['standalone','trend']){
    const ind=`low-range-${window}-${method}-${relation}@m${tf}`,state=lowRangeState(cache,window,method,relation),onset=new Int8Array(bars.n);
    for(let i=1;i<bars.n;i++)if(state[i]&&state[i]!==state[i-1])onset[i]=state[i];
    for(const ref of lowRangeProtects({...DEFAULT_LOW_RANGE_POLICY,steps:[3],slRatios:[1],trailRatios:[0,.5],tags:[range]})){
      const protect=laneProtect({...ref,hold:Math.max(1,Math.floor(holdMinutes/tf)),maxHoldMin:holdMinutes},ind),kind=protect.trail?'trailing':'normal',cfg=configId('follow',ind,protect);
      for(const side of [1,-1]){
        const source={cfg,bars,side,signal:sideSignal(onset,side),protect,cost:protocol.cost,kind},raw=simulate(cfg,bars,source.signal,protect,{cost:protocol.cost}),rawRows=rowsOf(raw),
          context={cfg,sym,side,tf,kind,relation},dictionary=[],dictionaryKeys=new Map(),intern=obj=>{const key=JSON.stringify(obj);let i=dictionaryKeys.get(key);if(i===undefined){i=dictionary.length;dictionaryKeys.set(key,i);dictionary.push(obj);}return i;},
          resultRef=result=>({setId:result.setId,parentSetId:result.parentSetId,admissionPolicy:result.admissionPolicy,
            data:intern({trades:result.trades,open:result.open??null,pending:result.pending??0})}),
          evidence={...context,raw:intern(raw),bases:{},dictionary};
        for(const p of primarySamples)for(const b of secondarySamples){
          const settings={...structuredClone(DEFAULT_STAGE_CHAIN),enabled:true,base:policy(p,b),main:policy(50,15)},
            identity={baseConfigId:cfg,symbol:sym,side,kind,lane:relation,economicRevision:protocol.economicRevision},
            book=new StageChainBook('model',settings),base=book.base(identity,minPf),mainSet=book.main(base.id,'no-additional-strategies'),
            inverseSet=book.inverseMain(mainSet.id,'negative-main-inverse'),mainDecisions=[],inverseDecisions=[],
            main=simulateStageSource(mainSet,source,e=>{const g=gate(rawRows,e.entryT,p,b);if(e.entryT>=start)mainDecisions.push({entryT:e.entryT,...compact(g)});return g.state==='qualified';}),
            mainRows=rowsOf(main),mainEntries=entrySet(main,context),inverseMain=simulateStageSource(inverseSet,source,e=>{
              if(!mainEntries.has(e.entryT)){if(e.entryT>=start)inverseDecisions.push({entryT:e.entryT,state:'parentMissing'});return false;}
              const g=negativeMainTrigger(before(mainRows,e.entryT),settings,minPf,e.entryT),state=g.qualified?'qualified':g.primary.state==='insufficient'||g.windows.some(w=>w.state==='insufficient')?'insufficient':'failed';
              if(e.entryT>=start)inverseDecisions.push({entryT:e.entryT,state,primaryPf:g.primary.pf,mean:g.mean});return g.qualified;
            }),inverseRows=rowsOf(inverseMain),inverseEntries=entrySet(inverseMain,context),
            entry={main:resultRef(main),inverseMain:resultRef(inverseMain),mainDecisions:intern(mainDecisions),inverseDecisions:intern(inverseDecisions),cases:{}};
          evidence.bases[`${p}|${b}`]=entry;
          for(const m of ongoingSamples){const caseBook=new StageChainBook('model',{...settings,main:policy(50,m)}),caseBase=caseBook.base(identity,minPf),
            caseMain=caseBook.main(caseBase.id,mainSet.processingId),caseInverse=caseBook.inverseMain(caseMain.id,inverseSet.processingId),
            realSet=caseBook.real(caseMain.id,'no-overall-strategies'),inverseRealSet=caseBook.real(caseInverse.id,'no-overall-strategies');
            if(caseMain.id!==mainSet.id||caseInverse.id!==inverseSet.id)throw new Error('downstream policy changed predecessor identity');
            const realDecisions=[],inverseRealDecisions=[],simReal=(set,rows,parents,decisions)=>simulateStageSource(set,source,e=>{
              if(!parents.has(e.entryT)){if(e.entryT>=start)decisions.push({entryT:e.entryT,state:'parentMissing'});return false;}
              const g=gate(rows,e.entryT,50,m);if(e.entryT>=start)decisions.push({entryT:e.entryT,...compact(g)});return g.state==='qualified';
            }),real=simReal(realSet,mainRows,mainEntries,realDecisions),inverseReal=simReal(inverseRealSet,inverseRows,inverseEntries,inverseRealDecisions),realRows=rowsOf(real),inverseRealRows=rowsOf(inverseReal);
            for(const r of ongoingSamples){const a=cases.get(`${p}|${b}|${m}|${r}`),active=mirror(real,realRows,r),inverseActive=mirror(inverseReal,inverseRealRows,r),
              activeBook=new StageChainBook('model',{...settings,main:policy(50,m),realN:r}),activeBase=activeBook.base(identity,minPf),activeMain=activeBook.main(activeBase.id,mainSet.processingId),
              activeInverse=activeBook.inverseMain(activeMain.id,inverseSet.processingId),activeReal=activeBook.real(activeMain.id,realSet.processingId),activeInverseReal=activeBook.real(activeInverse.id,inverseRealSet.processingId),
              activeSet=activeBook.active(activeReal.id),inverseActiveSet=activeBook.active(activeInverseReal.id),bg=gate(rawRows,start,p,b),mg=gate(mainRows,start,50,m),ig=gate(inverseRows,start,50,m),
              decisions={main:mainDecisions,inverseMain:inverseDecisions,real:realDecisions,inverseReal:inverseRealDecisions,active:active.decisions,inverseActive:inverseActive.decisions},
              results={main,inverseMain,real,inverseReal,active:active.result,inverseActive:inverseActive.result};
              if(bg.state==='qualified'){a.historical.base++;a.historical.baseGp+=bg.primary.gp;a.historical.baseGl+=bg.primary.gl;
                if(mg.state==='qualified')a.historical.main++;if(ig.state==='qualified')a.historical.inverseMain++;}
              for(const name of names){for(const d of decisions[name])a.decisions[name][d.state]++;
                a.stages[name].push(...records(results[name],context).filter(t=>t.entryT>=start&&t.entryT<end));}
              for(const [ds,label]of [[realDecisions,'Main'],[inverseRealDecisions,'Inverse']])for(const d of ds)if(d.state!=='parentMissing'){
                a.readiness[`matched${label}`]++;a.readiness[`max${label}OwnN`]=Math.max(a.readiness[`max${label}OwnN`],d.primary.n);if(d.primary.n===50)a.readiness[label==='Main'?'mainFullPrimary':'inverseFullPrimary']++;}
              entry.cases[`${m}|${r}`]={real:resultRef(real),inverseReal:resultRef(inverseReal),
                active:resultRef({...active.result,setId:activeSet.id,parentSetId:activeSet.parentSetId,admissionPolicy:activeSet.admissionPolicy}),
                inverseActive:resultRef({...inverseActive.result,setId:inverseActiveSet.id,parentSetId:inverseActiveSet.parentSetId,admissionPolicy:inverseActiveSet.admissionPolicy}),
                decisions:Object.fromEntries(['real','inverseReal','active','inverseActive'].map(n=>[n,intern(decisions[n])])),
                checkpoint:{base:compact(bg),main:compact(mg),inverseMain:compact(ig)}};
            }
          }
        }
        if(!zip.write(JSON.stringify(evidence)+'\n'))await once(zip,'drain');contextCount++;
      }
    }
  }}
  const memory=process.memoryUsage();maxHeap=Math.max(maxHeap,memory.heapUsed);maxRss=Math.max(maxRss,memory.rss);
  writeFileSync(`${output}/progress.json`,JSON.stringify({sym,contexts:contextCount,expected:4800,elapsedSeconds:(performance.now()-started)/1000,rssBytes:memory.rss})+'\n');
  process.stderr.write(`${sym}: ${contextCount}/4800 contexts, ${Math.round(memory.rss/1048576)} MiB RSS\n`);
}
if(contextCount!==4800)throw new Error(`incomplete context count ${contextCount}`);
zip.end();await finished;
const resultCases=[];
for(const [key,a]of cases){const [basePrimaryN,baseSecondaryN,mainSecondaryN,realN]=key.split('|').map(Number),h=a.historical;
  const groupKeys=[...new Set(a.stages.main.map(t=>`${t.kind}|${t.tf}`))];
  for(const kind of ['normal','trailing'])for(const tf of protocol.tfs)if(!groupKeys.includes(`${kind}|${tf}`))groupKeys.push(`${kind}|${tf}`);
  resultCases.push({basePrimaryN,baseSecondaryN,mainSecondaryN,realN,contexts:contextCount,historical:{...h,
    basePercent:100*h.base/contextCount,basePrimaryPf:h.baseGl?h.baseGp/h.baseGl:null,baseNoLoss:h.baseGp>0&&h.baseGl===0},readiness:a.readiness,
    decisions:Object.fromEntries(names.map(n=>{const d=a.decisions[n],evaluated=Object.values(d).reduce((a,b)=>a+b,0);return[n,{...d,evaluated,percent:evaluated?100*d.qualified/evaluated:null}];})),
    stages:Object.fromEntries(names.map(n=>[n,summarize(a.stages[n])])),
    groups:Object.fromEntries(groupKeys.sort().map(k=>{const[kind,tf]=k.split('|');return[k,Object.fromEntries(names.map(n=>[n,summarize(a.stages[n].filter(t=>t.kind===kind&&t.tf===+tf))]))];})),
    sides:Object.fromEntries([1,-1].map(s=>[s,Object.fromEntries(names.map(n=>[n,summarize(a.stages[n].filter(t=>t.side===s))]))]))});
}
writeFileSync(`${output}/results.json`,JSON.stringify({contextCount,cases:resultCases,elapsedSeconds:(performance.now()-started)/1000,
  memory:{maxSampledHeapBytes:maxHeap,maxSampledRssBytes:maxRss}},null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({contexts:contextCount,cases:resultCases.length,output})+'\n');
}catch(err){zip.destroy(err);await finished.catch(()=>{});writeFileSync(`${output}/failed.json`,JSON.stringify({error:String(err),contextCount})+'\n');throw err;}
