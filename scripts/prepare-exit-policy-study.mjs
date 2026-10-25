// Current-policy Signal/Exit comparison: freeze all candidates before observing either window.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CoreRuntime} from '../src/core/server/runtime.server.ts';
import {CoreDb} from '../src/core/server/db.server.ts';
import {sessionStudySourceFiles,studySha256,studyExactJson,studyCanonical} from './lib/session-study.mjs';
process.env.CTS_CORE_STATE='off';process.env.CTS_CORE_AUTOSTART='0';process.env.CTS_CORE_LIVE='0';
const root=resolve(process.argv[2]??'runs/exit-policy-study');assert.ok(!existsSync(resolve(root,'plan.json')));
const original=JSON.parse(readFileSync('docs/signals-own-grid-150h-20261024/receipts/last4/protocol.json'));
const files=sessionStudySourceFiles(),source={files,sha256:studySha256(studyExactJson(files)),checkpoint:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
const jobs=[];
for(const expanded of [false,true])for(const offset of [0,12]){
 const id=`${expanded?'expanded':'control'}-${offset}`,dir=resolve(root,id);mkdirSync(dir,{recursive:true});
 const settings=structuredClone(original.actualSettings),wf=structuredClone(original.actualWf),window={...original.window};
 for(const k of ['evaluationFromT','tradeStartT','endT'])window[k]+=offset*3_600_000;
 settings.signals.coordination.volumeFactor=1;settings.axis.volumeFactor=1;settings.exitStrategy.volumeFactor=1;
 settings.signals.lanes=[1,5,15];settings.exitStrategy.timeframes=[1,5,15];
 if(expanded)Object.assign(settings.exitStrategy,{maxConfigsPerPair:144,
   stopMultiples:[0.75,1,1.5,2],trailShares:[0.25,0.5,0.75],
   signalRanges:[{holdH:3,distance:1,basis:'extrema'},{holdH:6,distance:1.5,basis:'extrema'},
     {holdH:12,distance:2,basis:'extrema'},{holdH:6,distance:1.5,basis:'close'},{holdH:12,distance:2,basis:'close'}]});
 const make=(s,w)=>{const db=new CoreDb(':memory:'),rt=new CoreRuntime(db,{symbols:12},{market:'bingx',replay:true,priceStream:null,
   evaluationFromT:window.evaluationFromT,feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});
  try{rt.updateSettings(s);rt.updateSettings({},w);return{settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)}}finally{rt.dispose();db.db.close()}};
 const actual=make(settings,wf),reload=make(actual.settings,actual.wf);assert.equal(studyExactJson(actual),studyExactJson(reload));
 const protocol={...original,id,createdAt:new Date().toISOString(),source,window,liveSinceT:window.tradeStartT,
   actualSettings:actual.settings,actualWf:actual.wf,policy:{scope:'Signals and independent Exit,1/5/15m lanes,neutral indication/range/Axis volume ratios',
    expanded,offsetHours:offset,qualification:'Post-qualification retention; all ordinary/Signal sample,PF,DD,Last-N gates preserved',
    partialTactics:'Not enabled in this protocol; full terminal closes only',
    acceptance:'No default promotion from higher counts alone. Report both windows, all losses, exact config/tape coverage and separate Exit performance.'}};
 for(const [name,value]of [['desk.json',actual],['protocol.json',protocol]])writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n');
 jobs.push({scenario:{id,expanded,offsetHours:offset},dir});
}
writeFileSync(resolve(root,'plan.json'),JSON.stringify({sourceSha256:source.sha256,jobs},null,2)+'\n');
console.log(JSON.stringify({sourceSha256:source.sha256,jobs:jobs.map(j=>j.scenario)}));
