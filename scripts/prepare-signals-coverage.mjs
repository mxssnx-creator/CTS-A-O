// Freeze comparable native replay cases before inspecting their outcomes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { signalSettings, SIGNAL_SOURCES } from '../src/core/signal-config.ts';
import { CoreRuntime } from '../src/core/server/runtime.server.ts';
import { CoreDb } from '../src/core/server/db.server.ts';
import { sessionStudySourceFiles, studySha256, studyExactJson, studyCanonical } from './lib/session-study.mjs';
process.env.CTS_CORE_STATE='off'; process.env.CTS_CORE_AUTOSTART='0'; process.env.CTS_CORE_LIVE='0';
const old=JSON.parse(readFileSync(process.argv[2],'utf8')), root=resolve(process.argv[3]);
assert.ok(!existsSync(resolve(root,'plan.json')), 'Preserve earlier outcomes; use a new directory');
const files=sessionStudySourceFiles(), sha256=studySha256(studyExactJson(files));
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source={...old.source,files,sha256,checkpoint};
const scenarios=[
 {id:'corrected',expanded:false,dca:false,active:false,block:false},
 {id:'all-sources',expanded:true,dca:false,active:false,block:false},
 {id:'dca',expanded:true,dca:true,active:false,block:false},
 {id:'dca-block',expanded:true,dca:true,active:false,block:true},
 {id:'dca-active',expanded:true,dca:true,active:true,block:false},
];
function materialize(settings,wf){
 const db=new CoreDb(':memory:');
 const rt=new CoreRuntime(db,{symbols:old.symbols.length,signals:{enabled:true}},{market:'bingx',replay:true,priceStream:null,evaluationFromT:old.window.evaluationFromT,feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});
 rt.updateSettings(settings); rt.updateSettings({symbols:old.symbols.length});rt.updateSettings({},wf);
 const result={settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)};rt.dispose();db.db.close();return result;
}
const write=(file,value)=>writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const jobs=[];
for(const scenario of scenarios){
 const settings=structuredClone(old.actualSettings),wf=structuredClone(old.actualWf);
 if(scenario.expanded){
  settings.signals=signalSettings({...settings.signals,sourcesMode:'allow',sources:Object.fromEntries(SIGNAL_SOURCES.map(s=>[s.name,true])),count:0,coordination:{...settings.signals.coordination,count:0},trailRatios:[.5,1,1.5]});
 }
 settings.signals.strategies.dca=scenario.dca;
 Object.assign(settings.toggles,{dca:scenario.dca,dcaActive:scenario.active,block:scenario.block,blockActive:false});
 Object.assign(wf.toggles,settings.toggles);
 settings.block={...settings.block,ratio:.2,maxMult:2,steps:0,mode:'overall',historySource:'accepted-orders'};
 wf.block={...wf.block,...settings.block};
 const first=materialize(settings,wf),second=materialize(first.settings,first.wf);assert.equal(studyExactJson(first),studyExactJson(second));
 if(!scenario.expanded){
  // Block is disabled: preserve even its unused settings for the exact baseline comparison.
  second.settings.block=structuredClone(old.actualSettings.block);second.wf.block=structuredClone(old.actualWf.block);
  assert.equal(studyExactJson(second.settings),studyExactJson(old.actualSettings));assert.equal(studyExactJson(second.wf),studyExactJson(old.actualWf));
 }
 const dir=resolve(root,scenario.id);mkdirSync(dir,{recursive:true});
 const protocol={...old,id:`signals-coverage-${scenario.id}-20261023`,createdAt:new Date().toISOString(),source,actualSettings:second.settings,actualWf:second.wf,
  policy:{qualification:'Exact own Signals and Exit gates, 100h history, Last-8; no sample/PF/drawdown gate reductions.',scope:scenario,evidence:'Retrospective offline funded model; same 12-symbol minute feed and 12h window. No venue orders. All-source scope and cap removal explicitly separated from the exact corrected baseline.',comparison:'DCA versus all-sources; Block versus DCA; DCA Active versus DCA. Report all outcomes including empty/losing results. No selection on these reused results.'}};
 write(resolve(dir,'desk.json'),second);write(resolve(dir,'protocol.json'),protocol);jobs.push({scenario,dir,protocolSha256:studySha256(readFileSync(resolve(dir,'protocol.json')))});
}
mkdirSync(root,{recursive:true});write(resolve(root,'plan.json'),{schema:'cts-signal-coverage-comparison-v1',sourceSha256:sha256,checkpoint,createdAt:new Date().toISOString(),jobs,performancePolicy:{minFundedSettled:30,minReturnPf:1.1,maxEquityDrawdownFraction:.1,acceptance:'Every configuration retains its own causal validation. No profit claim without sufficient funded outcomes; report each arm and hourly losses.'}});
console.log(JSON.stringify({root,sourceSha256:sha256,sources:SIGNAL_SOURCES.length,jobs:jobs.map(j=>j.scenario)}));
