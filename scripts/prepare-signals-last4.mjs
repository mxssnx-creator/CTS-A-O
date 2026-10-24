// Freeze both expanded-grid arms before scoring either; preserve the older Last-8 study.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CoreRuntime } from '../src/core/server/runtime.server.ts';
import { CoreDb } from '../src/core/server/db.server.ts';
import { sessionStudySourceFiles, studySha256, studyExactJson, studyCanonical } from './lib/session-study.mjs';
process.env.CTS_CORE_STATE='off'; process.env.CTS_CORE_AUTOSTART='0'; process.env.CTS_CORE_LIVE='0';
const root=resolve(process.argv[2] ?? 'runs/signals-expanded-last4');
assert.ok(!existsSync(resolve(root,'plan.json')), 'Use a new directory; preserve completed and failed runs');
const old=JSON.parse(readFileSync('docs/signals-coverage-20261023/receipts/final/all-sources/protocol.json','utf8'));
const files=sessionStudySourceFiles(), sha256=studySha256(studyExactJson(files));
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source={...old.source,files,sha256,checkpoint};
const write=(file,value)=>writeFileSync(file,JSON.stringify(value,null,2)+'\n');
function materialize(settings,wf){
 const db=new CoreDb(':memory:');
 const rt=new CoreRuntime(db,{symbols:old.symbols.length,signals:{enabled:true}},
  {market:'bingx',replay:true,priceStream:null,evaluationFromT:old.window.evaluationFromT,
   feed:{history:async()=>[],klines:async()=>[],tickers:async()=>[]}});
 try { rt.updateSettings(settings);rt.updateSettings({},wf);return {settings:studyCanonical(rt.settings),wf:studyCanonical(rt.wf)}; }
 finally { rt.dispose();db.db.close(); }
}
const jobs=[];
for(const n of [8,4]){
 const settings=structuredClone(old.actualSettings),wf=structuredClone(old.actualWf);
 settings.signals.guard.lastN=n;settings.exitStrategy.minValidationTrades=n;
 wf.signalValidLastN=n;wf.signalGuardN=n;wf.exitMinTrades=n;
 if(wf.rangeOpts?.sig){wf.rangeOpts.sig.validLastN=n;if(wf.rangeOpts.sig.lastN>0)wf.rangeOpts.sig.lastN=n;}
 const actual=materialize(settings,wf);
 assert.equal(studyExactJson(actual),studyExactJson(materialize(actual.settings,actual.wf)),'Settings normalize identically twice');
 assert.equal(actual.settings.signals.hist.lookbackH,100);assert.equal(actual.wf.signalLongH,100);
 assert.equal(actual.wf.signalValidLastN,n);assert.equal(actual.settings.signals.guard.lastN,n);
 assert.equal(actual.wf.gates.minTrades,old.actualWf.gates.minTrades,'Full-history evidence requirement is unchanged');
 const scenario={id:`last${n}`,lastN:n,expanded:true},dir=resolve(root,scenario.id);mkdirSync(dir,{recursive:true});
 const protocol={...old,id:`signals-expanded-last${n}-20261024`,createdAt:new Date().toISOString(),source,
  actualSettings:actual.settings,actualWf:actual.wf,
  policy:{scope:scenario,qualification:`Own config/symbol/side history, Last-${n}; unchanged full-history/PF/DD gates.`,
   evidence:'Retrospective offline funded model on the same frozen 12-symbol minute feed and 12-hour window; no venue orders.',
   comparison:'Both arms use the expanded source/grid profile. Only requested Last-N / guard / Exit evidence count differs. Global DCA and Block remain off in this financial comparison.',
   acceptance:'Complete own configuration processing and funded position/order reconciliation. Preserve insufficient, empty and losing results; do not select winners on this reused window.'}};
 write(resolve(dir,'desk.json'),actual);write(resolve(dir,'protocol.json'),protocol);
 jobs.push({scenario,dir,protocolSha256:studySha256(readFileSync(resolve(dir,'protocol.json')))});
}
write(resolve(root,'plan.json'),{schema:'cts-signals-last4-comparison-v1',sourceSha256:sha256,checkpoint,createdAt:new Date().toISOString(),jobs});
console.log(JSON.stringify({root,sourceSha256:sha256,jobs:jobs.map(j=>j.scenario)}));
