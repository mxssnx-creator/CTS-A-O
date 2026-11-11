import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import {gunzipSync} from 'node:zlib';
import {INDICATIONS,indicationState} from '../src/core/indications/registry.ts';
import {SeriesCache} from '../src/core/indications/cache.ts';import {MarketSource} from '../src/core/indications/market.ts';
import {comboSignal} from '../src/core/bots/bots.ts';
import {simulate} from '../src/core/sim/backtest.ts';import {splitSides} from '../src/core/sim/backtest.ts';
const path=process.argv[2],output=process.argv[3],tf=Number(process.argv[4]??1);
if(!path||!output||![1,5].includes(tf))throw new Error('Usage: node --experimental-strip-types scripts/verify-tactic-inverse-volume.mjs <public-bars.json[.gz]> <output-directory> [1|5]');
const stored=readFileSync(path),raw=path.endsWith('.gz')?gunzipSync(stored):stored,input=JSON.parse(raw),span=tf*60000,start=input.start,end=input.end,mid=start+7*86400000,cost=.00176;
mkdirSync(output,{recursive:true});
const mk=(sym,rows)=>({sym,tfMin:tf,n:rows.length,t:Float64Array.from(rows,r=>r.time),o:Float64Array.from(rows,r=>r.open),h:Float64Array.from(rows,r=>r.high),l:Float64Array.from(rows,r=>r.low),c:Float64Array.from(rows,r=>r.close),v:Float64Array.from(rows,r=>r.volume)});
const universe=['BCH-USDT','XRP-USDT','SOL-USDT'].map(sym=>mk(sym,input.market[sym+':'+tf])),market=new MarketSource(universe),sources=INDICATIONS.filter(s=>s.kind==='inverse'||s.kind==='tactic');
const configs=[.003,.006,.012].flatMap(tp=>[.5,1].filter(r=>tp*r>=.001+cost).map(r=>({tp,sl:tp*r,trail:0,hold:(tp===.003?15:tp===.006?60:180)/tf})));
const stats=rows=>{let g=0,l=0,net=0,peak=0,dd=0,long=0,short=0;for(const t of [...rows].sort((a,b)=>a.exitT-b.exitT)){g+=Math.max(0,t.r);l+=Math.max(0,-t.r);net+=t.r;peak=Math.max(peak,net);dd=Math.max(dd,peak-net);if(t.side>0)long++;else short++;}return {n:rows.length,pf:l?g/l:null,noLoss:!l&&g>0,netPct:net*100,maxDrawdownPct:dd*100,long,short}};
const summaries=[],selected=[],timings=[];let cells=0;
for(const b of universe){const t0=performance.now(),cache=new SeriesCache(b);cache.setMarket(market);let candidates=[];
 for(const source of sources){const signal=comboSignal('follow',source.id,cache);for(const p of configs){
  const id=`follow|${source.id}@m${tf}|tp${p.tp}:sl${p.sl}:hold${p.hold}`,all=splitSides(signal).flatMap(s=>simulate(id,b,s,p,{cost}).trades).filter(t=>t.entryT>=start&&t.entryT<end);
  const train=all.filter(t=>t.entryT<mid&&t.exitT<mid),valid=all.filter(t=>t.entryT>=mid),a=stats(train),v=stats(valid);cells++;
  const item={symbol:b.sym,source:source.id,kind:source.kind,protect:p,train:a,validation:v};summaries.push(item);
  if(a.n>=20&&(a.noLoss||a.pf!==null&&a.pf>=1.05)&&a.netPct>0)candidates.push({item,source,signal});
 }}
 // Freeze a bounded list using the first seven days only. These historical dates have already been examined;
 // the later seven days are chronological validation, not a pristine unseen holdout.
 const shortlist=['inverse','tactic'].flatMap(kind=>candidates.filter(c=>c.item.kind===kind).sort((a,b)=>(b.item.train.noLoss?Infinity:b.item.train.pf)-(a.item.train.noLoss?Infinity:a.item.train.pf)||a.item.source.localeCompare(b.item.source)).slice(0,6));
 writeFileSync(output+'/'+b.sym+'-selection-before-validation.json',JSON.stringify(shortlist.map(c=>({source:c.item.source,protect:c.item.protect,train:c.item.train})),null,2));
 for(const candidate of shortlist){const {item,signal}=candidate,p=item.protect,cfg=`follow|${item.source}@m${tf}|selected`;const paths=[];
  for(const sideSignal of splitSides(signal)){
   const base=simulate(cfg,b,sideSignal,p,{cost}).trades;
   const run=(parent,n)=>{const sorted=[...parent].sort((a,b)=>a.exitT-b.exitT);let cursor=0,window=[];return simulate(cfg,b,sideSignal,p,{cost,admitEntry:e=>{while(cursor<sorted.length&&sorted[cursor].exitT<=e.entryT){window.push(sorted[cursor++]);if(window.length>n)window.shift();}const s=stats(window);return window.length>=n&&(s.noLoss||s.pf!==null&&s.pf>=1.05);}}).trades;};
   const main=run(base,30),real=run(main,8),live=run(real,8);paths.push({base,main,real,live});
  }
  const stages=Object.fromEntries(['base','main','real','live'].map(stage=>[stage,stats(paths.flatMap(p=>p[stage]).filter(t=>t.entryT>=mid&&t.entryT<end))]));
  const stress=splitSides(signal).flatMap(s=>simulate(cfg,b,s,p,{cost:cost*1.5}).trades).filter(t=>t.entryT>=mid&&t.entryT<end);
  selected.push({...item,stages,stressValidation:stats(stress)});
 }
 timings.push({symbol:b.sym,milliseconds:Math.round(performance.now()-t0)});console.log(JSON.stringify({symbol:b.sym,cells:sources.length*configs.length,candidates:candidates.length,selected:shortlist.length,ms:timings.at(-1).milliseconds}));
}
const byKind=Object.fromEntries(['inverse','tactic'].map(kind=>{const rows=summaries.filter(x=>x.kind===kind),active=rows.filter(x=>x.validation.n>0),positive=active.filter(x=>x.validation.pf!==null&&x.validation.pf>1&&x.validation.netPct>0);return [kind,{cells:rows.length,withValidationCloses:active.length,positiveValidationCells:positive.length,atLeast20PositiveCloses:positive.filter(x=>x.validation.n>=20).length}]}));
const report={dataset:{path:`BingX public ${tf}m snapshot; 14 complete UTC days plus warmup`,sha256:createHash('sha256').update(raw).digest('hex'),source:input.source,start:new Date(start).toISOString(),end:new Date(end).toISOString(),validationStart:new Date(mid).toISOString(),warmupStart:new Date(input.warmupStart).toISOString(),symbols:universe.map(b=>b.sym),bars:universe.map(b=>b.n),gaps:universe.map(b=>Array.from(b.t).slice(1).filter((t,i)=>t-b.t[i]!==span).length)},cost:{roundTripPct:cost*100,stressRoundTripPct:cost*150,feeAssumption:'0.08% taker each side +10% of fees slippage, no authenticated account claim'},scope:{timeframeMinutes:tf,sources:sources.length,protects:configs,cells,selection:'first7days only, N>=20 and PF>=1.05, up to6 per family per symbol',stages:'independent next-open simulations; Base last30 -> Main last8 -> Real last8; each gate reads only prior closes; floor1.05',limitations:'Existing historical data, not an unseen holdout. OHLC stop-first model; no venue execution or order reconciliation. No proof for untested timeframes, symbol universes, or live profitability.'},byKind,selected,timings,neutralVolumeWeights:1};
writeFileSync(output+'/results.json',JSON.stringify(report,null,2));writeFileSync(output+'/all-cells.json',JSON.stringify(summaries));console.log(JSON.stringify({cells,byKind,selected:selected.length,liveCloses:selected.reduce((n,x)=>n+x.stages.live.n,0)}));
