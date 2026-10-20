#!/usr/bin/env node
// Prespecified retrospective sensitivity study. Uses the native runtime and funded minute-mark report;
// never reads credentials, acquires prices or places venue orders.
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { resample } from "../src/core/market/bars.ts";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { studyCanonical, studyExactJson, sessionStudySourceFiles } from "./lib/session-study.mjs";

const H=3600000, root=process.cwd();
const arg=(k,d)=>{const i=process.argv.indexOf(`--${k}`);return i<0?d:process.argv[i+1];};
const data=path.resolve(arg("data","research/runs/strategy-defaults-20261020/data600"));
const out=path.resolve(arg("out","research/runs/strategy-defaults-20261020/v1"));
const hash=x=>createHash("sha256").update(x).digest("hex");
const write=(p,x)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,2)+"\n");};
assert.ok(!fs.existsSync(path.join(out,"protocol.json")),"Choose a new sealed output folder");
Object.assign(process.env,{CTS_CORE_STATE:"off",CTS_CORE_AUTOSTART:"0",CTS_CORE_COMPARE:"0",CTS_CORE_VARIANTS:"0",CTS_CORE_LIVE:"0",CTS_CORE_WORKERS:"1"});
const meta=JSON.parse(fs.readFileSync(path.join(data,"data-protocol.json")));
const manifests=JSON.parse(fs.readFileSync(path.join(data,"data-manifest.json")));
const symbols=meta.symbols;assert.equal(symbols.length,12);
const feed={tickers:[],candles:{}};
for(const sym of symbols){
  const file=`${sym}.json.gz`,bytes=fs.readFileSync(path.join(data,file));assert.equal(hash(bytes),manifests[file]);
  const cs=JSON.parse(gunzipSync(bytes));assert.equal(cs.length,(meta.endT-meta.startT)/60000);
  assert.ok(cs.length>=600*60,"All-lane 336h strategy proof requires the extended 600h feed including full slow-lane warmup");
  feed.candles[`${sym}|1`]=cs;feed.candles[`${sym}|60`]=resample(cs,1,60);
  feed.tickers.push({sym,last:cs.at(-1).c,quoteVol:0,changePct:0});
}
const feedPath=path.join(out,"feed.json");write(feedPath,feed);
const sources=sessionStudySourceFiles(root),sourceHash=hash(studyExactJson(sources));
const scenarios=[
  {id:"dca-0.5pct",step:.005},{id:"dca-1pct",step:.01},{id:"dca-1.5pct",step:.015},
  {id:"baseline-dca-2pct",step:.02},{id:"dca-2.5pct",step:.025},
  {id:"block-off",step:.02,block:false},{id:"block-overall-ratio0.2-cap2",step:.02,ratio:.2,maxMult:2},
  {id:"block-overall-ratio0.2-cap3",step:.02,ratio:.2,maxMult:3},
];
const folds=[{id:"development",endT:meta.endT-6*H},{id:"confirmation",endT:meta.endT}];
const jobs=[];
function materialize(settings,wf,from){
  const db=new CoreDb(":memory:");
  const rt=new CoreRuntime(db,{symbols:12,signals:{enabled:false}},{market:"bingx",replay:true,priceStream:null,evaluationFromT:from,feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});
  rt.updateSettings(settings);rt.updateSettings({symbols:12});rt.updateSettings({},wf);rt.wf={...rt.wf,longH:336};
  const result={settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)};
  rt.dispose();db.db.close();return result;
}
for(const scenario of scenarios)for(const fold of folds){
  const endT=fold.endT,startT=endT-6*H,from=startT-336*H;
  const s=structuredClone(DEFAULT_SETTINGS);
  Object.assign(s,{symbols:12,forceSymbols:symbols,symbolRank:"market",pinned:[],paperBalance:1000,sizing:{mode:"fixed",pct:.002},
    focus:["follow|rsi-mom-14-20","follow|ema-9-21","follow|break-vol@x4","follow|break-atr-2@x4","revert|cci-14-200@x4","revert|act-chop@x4"]});
  s.signals.enabled=false;s.exitStrategy.enabled=false;s.live.enabled=false;
  s.toggles={...s.toggles,normal:true,trailing:true,exit:false,block:scenario.block!==false,blockActive:false,dca:true,dcaActive:false,axis:true};
  s.grid={...s.grid,tp:[.008,.012,.026],slOfTp:[1,2],trailOfTp:[0,.5],holdH:[2,8],minSl:.005,minTrail:.003,
    trailingOnly:true,minimal:false,short:false,general:false,long:false,micro:false,minimalPlus:{...s.grid.minimalPlus,enabled:false}};
  s.dca={...s.dca,levels:1,addRatio:2.5,step:scenario.step,stepOfTp:0,tp:[.008,.012,.026]};
  s.block={...s.block,mode:"overall",ratio:scenario.ratio??.5,maxMult:scenario.maxMult??8,historySource:"accepted-orders",
    sources:{config:true,overall:true,symbol:true,direction:true,indication:true,type:true}};
  s.gates={...s.gates,minPf:1.5,rangeMinPf:{},lastNFloor:0};
  const wf={preH:336,simH:6,longH:336,causalBase:true,validLastN:25,lastN:25,lastNMinPf:1.5,recordValidation:true,maxOpen:48,maxPerSymbol:0,maxPerSide:0,portfolio:0};
  const initial=materialize(s,wf,from),first=materialize(initial.settings,initial.wf,from),second=materialize(first.settings,first.wf,from);
  assert.equal(studyExactJson(first),studyExactJson(second),"Economic settings must survive a production reload");
  const dir=path.join(out,scenario.id,fold.id),protocol={schema:"cts-session-study-v1",id:`${scenario.id}-${fold.id}`,symbols,
    window:{evaluationFromT:from,tradeStartT:startT,endT,preH:336,runH:6},
    feed:{path:feedPath,sha256:hash(fs.readFileSync(feedPath)),provider:"BingX public candles, reused retrospective feed"},
    source:{files:sources,sha256:sourceHash},actualSettings:second.settings,actualWf:second.wf,
    policy:{qualification:"Own native config Base, Last-25 PF>=1.5; no sample/PF relaxation",history:"336h specifically to supply own Last-25; older bars warm indicators",evidence:"Native offline model and funded minute-close marked account; no venue fills or fresh holdout"}};
  write(path.join(dir,"protocol.json"),protocol);write(path.join(dir,"desk.json"),second);
  jobs.push({scenario:scenario.id,fold:fold.id,dir,endT,from});
}
write(path.join(out,"protocol.json"),{schema:"cts-strategy-defaults-study-v1",sealedAt:new Date().toISOString(),sourceHash,launcherHash:hash(fs.readFileSync(import.meta.filename)),scenarios,folds,symbols,
  selection:"Choose on development only among N>=25, net return PF>=1.5, funded equity drawdown <=10%; highest PF then lowest DD. Confirmation is reported once and never used to select again.",
  classification:"Retrospective sensitivity study of a previously reused feed; bounded representative engine focus, all four timeframe lanes; Signals and Historic Exit separately verified outside this assay",jobs});
const env={PATH:process.env.PATH,TZ:"UTC",LANG:"C.UTF-8",MALLOC_ARENA_MAX:"2",CTS_CORE_STATE:"off",CTS_CORE_AUTOSTART:"0",CTS_CORE_COMPARE:"0",CTS_CORE_VARIANTS:"0",CTS_CORE_LIVE:"0",CTS_CORE_WORKERS:"1",NODE_OPTIONS:`--require ${path.join(root,"scripts/lib/core-test-offline-guard.cjs")}`};
const run=job=>new Promise(resolve=>{
  const log=fs.openSync(path.join(job.dir,"run.log"),"w");
  const args=["--experimental-strip-types","--no-warnings","--max-old-space-size=3072","scripts/core-session.mjs","--feed",feedPath,"--symbols","12","--pre","336","--run","6","--end-at",new Date(job.endT).toISOString(),"--evaluation-from",new Date(job.from).toISOString(),"--selection-hours","336","--desk",path.join(job.dir,"desk.json"),"--signals","off","--frozen-session",path.join(job.dir,"protocol.json"),"--sizing","fixed","--notional","2","--balance","1000","--leverage","2","--dump",path.join(job.dir,"raw.json"),"--out",path.join(job.dir,"session"),"--quiet","true"];
  const child=spawn(process.execPath,args,{cwd:root,env,stdio:["ignore",log,log]});
  const timeout=setTimeout(()=>child.kill("SIGTERM"),8*60000);
  child.on("close",code=>{clearTimeout(timeout);fs.closeSync(log);resolve(code);});
});
const progress=[];
for(const job of jobs){
  console.log(`Running ${job.scenario}/${job.fold}`);const at=Date.now();const code=await run(job);
  const row={scenario:job.scenario,fold:job.fold,code,ms:Date.now()-at};progress.push(row);write(path.join(out,"progress.json"),progress);
  console.log(JSON.stringify(row));if(code!==0){write(path.join(out,"attempt-result.json"),{state:"failed",job,row});process.exitCode=1;break;}
}
