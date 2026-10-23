import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=process.argv[2];
const imp=f=>import(pathToFileURL(resolve(root,f)));
const {makeTape,signalConfigEval,defaultWalkForward}=await imp('src/core/sim/walkforward.ts');
const {DEFAULT_SETTINGS}=await imp('src/core/config.ts');
const H=3600000,t=120*H,syms=Array.from({length:12},(_,i)=>`S${i}`);
const o={...defaultWalkForward(DEFAULT_SETTINGS),preGate:false,signalOwnBase:true,signalLongH:100,signalValidLastN:8,gates:{...DEFAULT_SETTINGS.gates,minTrades:12}};
const tapes=Array.from({length:6000},(_,j)=>{const id=`follow|sig-ema-cross-s@m1|tp${j}`;return makeTape(id,'follow','sig-ema-cross-s@m1',{tp:.02,sl:.01,trail:0,hold:60},'normal',syms,syms.flatMap(sym=>[1,-1].map(side=>({cfg:id,sym,side,entryT:t-H-60000,exitT:t-H,entry:100,exit:101,r:.01,reason:'tp',bars:1,mfe:0,mae:0}))),[],[])});
global.gc();const initial=process.memoryUsage(),start=performance.now();let count=0,sum=0;
for(let pass=0;pass<2;pass++)for(const tp of tapes)for(const sym of syms)for(const side of [1,-1]){const e=signalConfigEval(tp,t+pass*H,o,sym,side);count++;sum+=e.n+e.pf+e.net+(e.ok?1:0);}
global.gc();console.log(JSON.stringify({tapes:tapes.length,contexts:count,checksum:sum,ms:performance.now()-start,initial,final:process.memoryUsage(),rssMaxKiB:process.resourceUsage().maxRSS}));
