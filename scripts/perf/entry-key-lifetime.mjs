// Compare bounded-entry-key and full-history implementations; outputs are synthetic, not market evidence.
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/entry-key-lifetime.mjs ROOT [TAPES] [EVENTS]
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
if(!globalThis.gc)throw Error('Use --expose-gc');
const root=resolve(process.argv[2]??process.cwd()),count=Number(process.argv[3]??40),events=Number(process.argv[4]??1000);
if(!Number.isSafeInteger(count)||count<1||count>500||!Number.isSafeInteger(events)||events<10||events>10000)throw Error('invalid fixture size');
const load=p=>import(pathToFileURL(root+'/src/core/'+p).href),[{makeTape,walkForwardGen,defaultWalkForward},{DEFAULT_SETTINGS}]=await Promise.all([load('sim/walkforward.ts'),load('config.ts')]);
const H=3600000,T=Date.UTC(2026,9,16),ind='rsi-mom-14-20@m1',tapes=[];
for(let k=0;k<count;k++){
 const id=`follow|${ind}|tp${k+1}|sl1|tr0|h1`,rows=[];
 for(let i=0;i<events;i++){const entryT=T+Math.floor(i*(4*H-10000)/events);rows.push({cfg:id,sym:'A',side:1,entryT,exitT:entryT+1000,entry:100,exit:99.9,r:-.001,mult:1,reason:'sl',bars:1,mfe:0,mae:0,kind:'normal'});}
 tapes.push(makeTape(id,'follow',ind,{tp:.01,sl:.01,trail:0,hold:1},'normal',['A'],rows,[],[]));
}
const d=defaultWalkForward(DEFAULT_SETTINGS),o={...d,wideEnabled:true,startT:T,preH:12,longH:12,simH:4,stepH:1,rangeGate:undefined,
 signalRank:undefined,recordValidation:false,onePerPairEvent:false,entryCrowd:{wide:count+1},symGate:'off',coord:{...d.coord,enabled:false},
 basePassed:new Set([`follow|${ind}`]),toggles:{...d.toggles,normal:true,trailing:false,dca:false,dcaActive:false,axis:false,block:false},
 processedStages:{validationN:2,realN:2},resultLean:true};
const u={bars:[],caches:[],startT:T-12*H,endT:T+4*H,splitT:T,nowT:T+4*H,baseTf:1};globalThis.gc();const before=process.memoryUsage().heapUsed;
const g=walkForwardGen(u,tapes,o);let x,heap=[];const t=performance.now();for(;;){x=g.next();if(x.done)break;if(x.value>=T&&x.value<T+4*H){globalThis.gc();heap.push(Math.round((process.memoryUsage().heapUsed-before)/1024/1024*100)/100);}}
const r=x.value;console.log(JSON.stringify({tapes:count,events,ms:Math.round(performance.now()-t),heapDeltaMiB:heap,trades:r.trades.length,postBase:r.processedStages.sets.reduce((s,x)=>s+x.stages.postBase.closedOrders,0),skips:r.skips,hash:createHash('sha256').update(JSON.stringify(r)).digest('hex')}));
