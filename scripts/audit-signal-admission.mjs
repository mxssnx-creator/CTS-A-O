// Explain independently valid but unselected candidates using the actual activation evaluator.
import assert from 'node:assert/strict';
import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {readSessionDump,iterateSessionTapeTrades} from './lib/session-dump.mjs';
import {coverageTape} from './audit-signal-coverage.mjs';
import {activeSignalsAt,signalConfigEval,signalValidationOk} from '../src/core/sim/walkforward.ts';
import {sigActiveKey,signalActiveHas} from '../src/core/signals.ts';
const dir=resolve(process.argv[2]),protocol=JSON.parse(readFileSync(resolve(dir,'protocol.json'))),coverage=JSON.parse(readFileSync(resolve(dir,'coverage.json')));
assert.ok(coverage.ok);const selectedIds=new Set();
for await(const line of createInterface({input:createReadStream(resolve(dir,'coverage.configs.jsonl')),crlfDelay:Infinity})){
 if(!line.trim())continue;const row=JSON.parse(line);if(row.entrySelection?.unselectedOwnValid)selectedIds.add(row.id);
}
const raw=await readSessionDump(resolve(dir,'raw.json'),{fields:[]});
const steps=raw.engine.signalSteps.map(s=>({...s,keys:new Set(s.keys)}));
const wf=protocol.actualWf,sig=protocol.actualSettings.signals;
const reasons={},examples=[];let total=0;
for await(const row of iterateSessionTapeTrades(resolve(dir,'raw.json'))){
 if(!selectedIds.has(row.id))continue;
 const tp=coverageTape(row,protocol.symbols);
 for(const [sym,side,entryT,exitT] of row.trades){
  if(entryT<protocol.window.tradeStartT||entryT>=protocol.window.endT||exitT>protocol.window.endT)continue;
  let lo=0,hi=steps.length;while(lo<hi){const m=(lo+hi)>>>1;if(steps[m].t<=entryT)lo=m+1;else hi=m;}
  assert.ok(lo);const step=steps[lo-1];
  if(signalActiveHas(step.keys,tp.bot,tp.ind,sym,side,tp.kind,tp.id)||!signalConfigEval(tp,entryT,wf,sym,side).ok||!signalValidationOk(tp,entryT,wf,sym,side))continue;
  const key=sigActiveKey(tp.bot,tp.ind,sym,side,tp.kind,tp.id),atStep=[],atEntry=[];
  activeSignalsAt([tp],step.t,sig,wf.signalLongH,wf,atStep);activeSignalsAt([tp],entryT,sig,wf.signalLongH,wf,atEntry);
  const selected=atStep.find(r=>r.key===key),current=atEntry.find(r=>r.key===key);
  const reason=selected?.reason==='active'?'global-ranking-cap-or-pair-eligibility':selected?.reason??'own-validation-at-selection-clock';
  reasons[reason]=(reasons[reason]??0)+1;total++;
  if(examples.filter(x=>x.reason===reason).length<8)examples.push({cfg:tp.id,sym,side,entryT,selectionT:step.t,reason,atSelection:selected??null,atEntry:current??null});
 }
}
assert.equal(total,coverage.entrySelection.unselectedOwnValid);
const result={schema:'cts-signal-admission-trace-v1',ok:true,sourceSha256:coverage.sourceSha256,protocolSha256:coverage.protocolSha256,
 scope:'Independently valid settled candidates absent from the recorded selection; actual production activation rules, retained rank/recent/minimum-history gates. This is not permission to bypass shared risk gates.',
 total,reasons,examples};
writeFileSync(resolve(dir,'admission-trace.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({total,reasons}));
