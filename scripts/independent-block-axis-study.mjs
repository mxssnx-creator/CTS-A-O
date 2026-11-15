#!/usr/bin/env node
// Explicit offline study; no account credentials, native writer or persisted runtime settings.
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { slRatiosOf } from "../src/core/sl-ratios.ts";
const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(`--${key}`);return i<0?fallback:args[i+1];};
const feed=resolve(arg("feed","")),out=resolve(arg("out","")),end=Date.parse(arg("end",""));
const profile=arg("profile","default"),mainN=Number(arg("main-n",40));
if(!args.includes("--feed")||!args.includes("--out")||!Number.isFinite(end)||!["default","independent"].includes(profile)||!Number.isInteger(mainN)||mainN<12||mainN>1000)
  throw new Error("--feed FILE --out DIR --end ISO [--profile default|independent] [--main-n 12..1000] required");
const policy=(ratios)=>{
  const xs=[...new Set(ratios)].sort((a,b)=>a-b),min=xs[0],max=xs.at(-1),step=xs.length>1?+(xs[1]-xs[0]).toFixed(8):.25;
  if(xs.some((x,i)=>Math.abs(x-(min+i*step))>1e-8))throw new Error("Preserve an irregular custom ladder manually");
  const slAuto={enabled:true,min,max,step,fallback:Math.min(max,Math.max(min,1))};
  if(JSON.stringify(slRatiosOf({slAuto}))!==JSON.stringify(xs))throw new Error("Auto ladder changed the frozen factory candidates");
  return slAuto;
};
const grid=structuredClone(DEFAULT_SETTINGS.grid);
grid.slAuto=policy(grid.slOfTp);
for(const key of ["micro","minimal","short","general","long"])if(grid[key])grid[key].slAuto=policy(grid[key].slOfTp);
if(grid.lowRange)grid.lowRange.slAuto=policy(grid.lowRange.slRatios);
const settings={grid,signals:{normal:{...DEFAULT_SETTINGS.signals.normal,slAuto:policy(DEFAULT_SETTINGS.signals.normal.slOfTp)},
  hist:{...DEFAULT_SETTINGS.signals.hist,lookbackH:12,slAuto:policy(DEFAULT_SETTINGS.signals.hist.slOfTp)}},
  exitStrategy:{lookbackH:12},gates:{positionWindows:{...DEFAULT_SETTINGS.gates.positionWindows,main:mainN}}};
const toggles={axis:true,...(profile==="independent"?{normal:false,block:true,blockActive:true}:{})};
if(profile==="independent")settings.block={...DEFAULT_SETTINGS.block,historySource:"processed-orders",excludeKinds:["axis"]};
const wf={signalLongH:12};
mkdirSync(out,{recursive:true});
const feedHash=createHash("sha256").update(readFileSync(feed)).digest("hex");
writeFileSync(join(out,"protocol.json"),JSON.stringify({version:1,profile,mainN,source:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),
  feedSha256:feedHash,symbols:12,preH:12,runH:12,end:new Date(end).toISOString(),evaluationFrom:new Date(end-24*3600000).toISOString(),
  settings,toggles,wf,defaultsRecommendation:false,notes:"Factory SL candidates are unchanged. Non-default Main N is an explicit sensitivity study, not a newly proven optimum."},null,2));
const cli=["--experimental-strip-types","--no-warnings","scripts/core-session.mjs","--feed",feed,"--symbols","12","--pre","12","--run","12",
  "--end-at",new Date(end).toISOString(),"--evaluation-from",new Date(end-24*3600000).toISOString(),"--selection-hours","12","--replay-preload-all",
  "--settings",JSON.stringify(settings),"--toggles",JSON.stringify(toggles),"--wf",JSON.stringify(wf),"--chunk-allocations","--tape-trades-all",
  "--dump",join(out,"raw.json"),"--html",join(out,"report"),"--quiet","true"];
const run=spawnSync(process.execPath,cli,{stdio:"inherit",env:{...process.env,CTS_CORE_LIVE:"0",CTS_CORE_AUTOSTART:"0",CTS_CORE_VARIANTS:"0",
  MALLOC_ARENA_MAX:"2",MALLOC_MMAP_THRESHOLD_:"1048576"},timeout:3600000});
if(run.error)throw run.error;
process.exitCode=run.status??1;
