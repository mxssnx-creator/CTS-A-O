// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/continuous-selection-bench.mjs ROOT reference|incremental [TAPES]
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]??process.cwd()),mode=process.argv[3]??'reference',n=Number(process.argv[4]??20000);
if(!globalThis.gc||!['reference','incremental'].includes(mode)||!Number.isSafeInteger(n)||n<500||n>100000)throw new Error('Use --expose-gc, a selection mode and 500–100,000 tapes');
const load=p=>import(pathToFileURL(root+'/src/core/'+p).href);const [{defaultWalkForward,makeTape,selectFixed,validatedSetGen,EvalMemo,ContinuousPositionSelection},{DEFAULT_SETTINGS}]=await Promise.all([load('sim/walkforward.ts'),load('config.ts')]);
const M=60000,T=Date.UTC(2026,9,16),drain=g=>{for(;;){const r=g.next();if(r.done)return r.value;}};
const tapes=Array.from({length:n},(_,k)=>{const ind='rsi-mom-14-20@m1',id=`follow|${ind}|tp${k+1}|sl1|tr0|h1`,rows=[];
 if(k<400){for(let j=0;j<20;j++)rows.push({cfg:id,sym:'A',side:1,entryT:T-(22-j)*M,exitT:T-(21-j)*M,entry:100,exit:101,r:j%9?.01:-.002,reason:'tp',bars:1,mfe:0,mae:0});
  if(k<40)for(let j=1;j<=24;j++)rows.push({cfg:id,sym:'A',side:1,entryT:T+(j*2-1)*M,exitT:T+j*2*M,entry:100,exit:101,r:(j+k)%7?.01:-.002,reason:'tp',bars:1,mfe:0,mae:0});}
 return makeTape(id,'follow',ind,{tp:.01,sl:.01,trail:0,hold:1},'normal',['A'],rows,[],[]);});
const d=defaultWalkForward(DEFAULT_SETTINGS),memo=new EvalMemo(),o={...d,wideEnabled:true,seatSet:'validated',seatPer:'config',portfolio:0,ladderNeedsBase:false,rangeGate:undefined,evalMemo:memo,gates:{...d.gates,minTrades:3,minGreen:0,lastNFloor:0,positionWindows:{base:12,main:12,real:12,entry:12,maxDrawdownPositions:12,scope:'config'}}};
const initial=drain(validatedSetGen(tapes,T,o));drain(memo.attach(tapes,T,T+60*M));const byId=new Map(tapes.map(tp=>[tp.id,tp]));
let selection;if(mode==='incremental'){if(!ContinuousPositionSelection)throw new Error('incremental implementation unavailable');selection=new ContinuousPositionSelection(memo,byId);drain(selection.reset(initial,T,o));}
globalThis.gc();const before=process.memoryUsage(),start=performance.now(),h=createHash('sha256');let moving=0,picks=0;
for(let i=1;i<=50;i++){const t=T+i*M;memo.advance(t);moving+=memo.dirty.size;const r=mode==='incremental'?drain(selection.refresh(t,o)):selectFixed(tapes,t,{...o,seatSet:'pool',validated:undefined,recordValidation:undefined});picks=r.picks.length;h.update(JSON.stringify(r));}
const ms=Math.round(performance.now()-start);globalThis.gc();const after=process.memoryUsage();console.log(JSON.stringify({mode,tapes:n,steps:50,initiallyValidated:initial.size,lastPicks:picks,dirtyEvents:moving,ms,retainedHeapDelta:after.heapUsed-before.heapUsed,peakRssKiB:process.resourceUsage().maxRSS,hash:h.digest('hex')}));
