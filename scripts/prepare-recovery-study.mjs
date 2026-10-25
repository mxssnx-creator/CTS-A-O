// Freeze every arm before scoring; no live connection, gate reduction or profitable-only reporting.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CoreRuntime} from '../src/core/server/runtime.server.ts';
import {CoreDb} from '../src/core/server/db.server.ts';
import {DEFAULT_DCA} from '../src/core/config.ts';
import {RT_COST} from '../src/core/model-cost.ts';
import {sessionStudySourceFiles,studySha256,studyExactJson,studyCanonical} from './lib/session-study.mjs';
process.env.CTS_CORE_STATE='off';process.env.CTS_CORE_AUTOSTART='0';process.env.CTS_CORE_LIVE='0';
const root=resolve(process.argv[2]??'runs/recovery-study');assert.ok(!existsSync(resolve(root,'plan.json')));
const ref=JSON.parse(readFileSync('docs/signals-own-grid-150h-20261024/receipts/last4/protocol.json'));
const files=sessionStudySourceFiles(),source={files,sha256:studySha256(studyExactJson(files)),checkpoint:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
const profiles=[
 {id:'control',dca:false},
 {id:'dca-unit',dca:true,addRatio:1},
 {id:'dca-weighted',dca:true,addRatio:2.5},
 {id:'dca-active',dca:true,addRatio:1,active:true},
 {id:'dca-block',dca:true,addRatio:1,block:true},
];
const jobs=[];
for(const profile of profiles)for(const offset of [0,12]){
 const id=`${profile.id}-${offset}`,dir=resolve(root,id);mkdirSync(dir,{recursive:true});
 const settings=structuredClone(ref.actualSettings),wf=structuredClone(ref.actualWf),window={...ref.window};
 for(const k of ['evaluationFromT','tradeStartT','endT'])window[k]+=offset*3_600_000;
 settings.cost=RT_COST;settings.fees={taker:.0005,maker:.0002,slippage:.00025};
 settings.dca={...DEFAULT_DCA,addRatio:profile.addRatio??1};
 settings.toggles={...settings.toggles,dca:profile.dca,dcaActive:!!profile.active,block:!!profile.block,blockActive:false};
 settings.signals.strategies={...settings.signals.strategies,dca:profile.dca};
 settings.signals.coordination.volumeFactor=1;settings.axis.volumeFactor=1;settings.exitStrategy.volumeFactor=1;
 settings.signals.lanes=[1,5,15];settings.exitStrategy.timeframes=[1,5,15];settings.live.enabled=false;
 if(profile.block)Object.assign(settings.block,{ratio:.2,steps:0,holdUntilNet:true,
   sourceRatios:{config:1,overall:1,symbol:4,direction:2,indication:2,type:3}});
 const make=(s,w)=>{const db=new CoreDb(':memory:'),rt=new CoreRuntime(db,{symbols:12},{market:'bingx',replay:true,priceStream:null,
   evaluationFromT:window.evaluationFromT,feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});
  try{rt.updateSettings(s);rt.updateSettings({},w);return{settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)}}finally{rt.dispose();db.db.close()}};
 const actual=make(settings,wf);assert.equal(studyExactJson(actual),studyExactJson(make(actual.settings,actual.wf)));
 assert.equal(actual.settings.cost,.0015);assert.equal(actual.wf.cost,.0015);
 assert.equal(actual.wf.toggles.dca,profile.dca);assert.equal(actual.wf.toggles.block,!!profile.block);
 const protocol={...ref,id,createdAt:new Date().toISOString(),source,window,liveSinceT:window.tradeStartT,
  actualSettings:actual.settings,actualWf:actual.wf,policy:{scope:'Signals plus independent Exit; every existing expanded Signal source and 1/5/15m lane',
   profile,offsetHours:offset,roundTripCost:.0015,calculation:'Minute prices, 150h prehistory, 12h trading; Last4 and every own PF/sample/DD gate retained',
   dca:'Ordinary spacing 1%/2%; capped Signal spacing fits inside its resting stop (default 0.8%/1.6%, stop 2%). Active remains an alternative execution mode',
   block:'Independent source ratios; recovery uses accepted modeled extra-leg unit net, not venue funding',
   acceptance:'Report ALL arms, losses, empty samples, held orders, positions, equity drawdown and exact coverage. No optimal/default claim from these reused windows.'}};
 for(const [name,value]of [['desk.json',actual],['protocol.json',protocol]])writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n');
 jobs.push({scenario:{id,...profile,offsetHours:offset},dir});jobs.at(-1).scenario.id=id;
}
writeFileSync(resolve(root,'plan.json'),JSON.stringify({sourceSha256:source.sha256,jobs},null,2)+'\n');
console.log(JSON.stringify({sourceSha256:source.sha256,jobs:jobs.map(j=>j.scenario)}));
