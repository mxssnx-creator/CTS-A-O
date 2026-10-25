// Predeclared ratio experiment. Does not change factory settings or discard any scored losses.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CoreRuntime} from '../src/core/server/runtime.server.ts';
import {CoreDb} from '../src/core/server/db.server.ts';
import {sessionStudySourceFiles,studySha256,studyExactJson,studyCanonical} from './lib/session-study.mjs';
process.env.CTS_CORE_STATE='off';process.env.CTS_CORE_AUTOSTART='0';process.env.CTS_CORE_LIVE='0';
const root=resolve(process.argv[2]??'runs/signal-gap-study');assert(!existsSync(resolve(root,'plan.json')));
const ref=JSON.parse(readFileSync('docs/signals-own-grid-150h-20261024/receipts/last4/protocol.json'));
const files=sessionStudySourceFiles(),source={files,sha256:studySha256(studyExactJson(files)),checkpoint:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
const jobs=[];
for(const offset of [12,0]){
 const id=`gap-half-${offset}`,dir=resolve(root,id);mkdirSync(dir,{recursive:true});
 const s=structuredClone(ref.actualSettings),w=structuredClone(ref.actualWf),window={...ref.window};
 for(const k of ['evaluationFromT','tradeStartT','endT'])window[k]+=offset*3600000;
 s.signals.trailRatios=[0.5];s.signals.coordination.volumeFactor=1;s.axis.volumeFactor=1;s.exitStrategy.volumeFactor=1;
 s.signals.lanes=[1,5,15];s.exitStrategy.timeframes=[1,5,15];s.live.enabled=false;
 const make=(settings,wf)=>{const db=new CoreDb(':memory:');const rt=new CoreRuntime(db,{symbols:12},{market:'bingx',replay:true,priceStream:null,evaluationFromT:window.evaluationFromT,feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});try{rt.updateSettings(settings);rt.updateSettings({},wf);return {settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)}}finally{rt.dispose();db.db.close();}};
 const actual=make(s,w);assert.equal(studyExactJson(actual),studyExactJson(make(actual.settings,actual.wf)));assert.equal(actual.settings.cost,.0015);assert.equal(actual.wf.cost,.0015);assert.deepEqual(actual.settings.signals.trailRatios,[.5]);
 const protocol={...ref,id,createdAt:new Date().toISOString(),source,window,liveSinceT:window.tradeStartT,actualSettings:actual.settings,actualWf:actual.wf,policy:{scope:'12-symbol controlled Signal/Exit gap-ratio study; not the pending50-symbol/all-types study',variant:'gap-half',offsetHours:offset,change:'Retain half-activation peak gap variants; remove1x/1.5x gap variants for this experiment only. Own history, cost, PF, Last4 and shared gates unchanged. Normal/Exit remain enabled.',hypothesis:'Many gross-positive trailing closes were below0.15% cost. Test whether smaller configured peak gaps improve net outcomes and reduce history computation. No profit guarantee or retrospective gate waiver.',acceptance:'Report both windows, complete history, validation percentages, funded PF, drawdown, positions/orders and all failures. Promote only after separate held-out50-symbol evaluation.'}};
 for(const [name,value]of [['desk.json',actual],['protocol.json',protocol]])writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n');
 jobs.push({scenario:{id,offsetHours:offset,variant:'gap-half'},dir});
}
writeFileSync(resolve(root,'plan.json'),JSON.stringify({sourceSha256:source.sha256,jobs},null,2)+'\n');console.log(JSON.stringify({sourceSha256:source.sha256,scenarios:jobs.map(x=>x.scenario)}));
