// node --experimental-strip-types --no-warnings scripts/perf/continuous-walk-forward-bench.mjs ROOT [VARIANT]
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]??process.cwd()), variant=process.argv[3]??'default';
if(!['default','limited','processed','weighted','processed-weighted','duplicate','duplicate-id','foreign-index','permuted-index','pair','ladder'].includes(variant))throw new Error('Unknown benchmark variant');
const load=p=>import(pathToFileURL(root+'/src/core/'+p).href);const [{defaultWalkForward,makeTape,walkForward,EvalMemo},{DEFAULT_SETTINGS}]=await Promise.all([load('sim/walkforward.ts'),load('config.ts')]);
const H=3600000,M=60000,T=Date.UTC(2026,9,16,0),syms=['A','B'];let tapes=[];const n=variant.startsWith('processed')?40:160;
for(let k=0;k<n;k++){const ind=k%13===0?'sig-ema-cross-s@m1':k%3===0?'ema-9-21@m5':'rsi-mom-14-20@m1',kind=['normal','trailing','dca','axis'][k%4],tag=['mc','mn','sh'][k%3],id=`follow|${ind}|tp${k}|sl1|tr0|h1|${tag}|${kind}`;
 const rows=Array.from({length:110},(_,i)=>({cfg:id,sym:syms[(i+k)%2],side:(i+k)%4<2?1:-1,entryT:T+(i-54)*5*M,exitT:T+(i-53)*5*M,entry:100,exit:101,r:(i+k)%9?0.012:-.005,reason:'tp',bars:1,mfe:0,mae:0,kind}));
 const tp=makeTape(id,'follow',ind,{tp:.01,sl:.01,trail:kind==='trailing'?.003:0,hold:10,tag},kind,syms,rows,[],[]);if(k===4)tp.heldOnly=true;tapes.push(tp);}
if(variant==='duplicate')tapes.push(tapes[1]);
if(variant==='duplicate-id')tapes.push({...tapes[1]});
const d=defaultWalkForward(DEFAULT_SETTINGS),o={...d,startT:T,preH:12,longH:24,simH:4,stepH:1,rangeGate:undefined,signalRank:undefined,signalActive:new Set(['follow|sig-ema-cross-s@m1']),recordValidation:true,wideEnabled:true,symGate:'off',onePerPairEvent:false,coord:{...d.coord,enabled:false},gates:{...d.gates,minTrades:3,minGreen:0,lastNFloor:0,positionWindows:{base:4,main:4,real:3,entry:3,maxDrawdownPositions:12,scope:'config'}}};
if(variant==='limited'){o.portfolio=7;o.microSeats=3;o.laneSeats=2;o.rankBy='green';}
if(variant==='processed'||variant==='processed-weighted'){o.processedStages={validationN:2,realN:2};o.basePassed=new Set(['follow|rsi-mom-14-20@m1','follow|ema-9-21@m5']);}
if(variant==='weighted'||variant==='processed-weighted')o.relationalVolumeRatios={enabled:true,overall:1.2,maxMultiplier:10,strategies:{normal:2,axis:.5},ranges:{mc:1.5},symbols:{a:1.5}};
if(variant==='foreign-index'){const memo=new EvalMemo(),g=memo.attach([tapes[0]],T,T+H);while(!g.next().done){ /* drain slices */ }o.evalMemo=memo;}
if(variant==='permuted-index'){const memo=new EvalMemo(),g=memo.attach(tapes.filter(tp=>!tp.ind.startsWith('sig-')).reverse(),T,T+4*H);while(!g.next().done){ /* drain slices */ }o.evalMemo=memo;}
if(variant==='pair'){o.seatPer='pair';o.portfolio=7;}
if(variant==='ladder')o.ladderNeedsBase=true;
const u={bars:[],caches:[],startT:T-24*H,endT:T+4*H,splitT:T,nowT:T+4*H,baseTf:1};const t=performance.now(),r=walkForward(u,tapes,o);console.log(JSON.stringify({variant,ms:Math.round(performance.now()-t),steps:r.steps.length,trades:r.trades.length,processed:!!r.processedStages,hash:createHash('sha256').update(JSON.stringify(r)).digest('hex')}));
