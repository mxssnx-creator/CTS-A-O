import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
// Run from or point at the exact source-frozen checkout; never silently audit mismatched economics.
const dir=resolve(process.argv[2]);
const out=resolve(process.argv[3]??dir+'/entry-settlement-trace.json');
const root=resolve(process.argv[4]??dirname(fileURLToPath(import.meta.url))+'/..');
const {readSessionStudy}=await import(root+'/scripts/lib/session-study.mjs');
const {readFundedSession}=await import(root+'/scripts/lib/session-funded-cohort.mjs');
const {iterateSessionTapeTrades}=await import(root+'/scripts/lib/session-dump.mjs');
const {coverageTape}=await import(root+'/scripts/audit-signal-coverage.mjs');
const {signalConfigEval,signalValidationOk,activeSignalsAt}=await import(root+'/src/core/sim/walkforward.ts');
const {modeledUnitReturn}=await import(root+'/src/core/metrics/stats.ts');
const {protocol,protocolSha256}=readSessionStudy(dir+'/protocol.json',root);
const funded=await readFundedSession(dir+'/raw.json');assert(funded.book.checksOk);
const by=new Map();for(const t of funded.trades){if(!by.has(t.cfg))by.set(t.cfg,[]);by.get(t.cfg).push(t);}
const details=[];let scanned=0;
for await(const row of iterateSessionTapeTrades(dir+'/raw.json')){
 if(!by.has(row.id))continue;const tp=coverageTape(row,protocol.symbols);scanned++;
 for(const t of by.get(row.id)){
  const ev=signalConfigEval(tp,t.entryT,protocol.actualWf,t.sym,t.side);
  const lastN=signalValidationOk(tp,t.entryT,protocol.actualWf,t.sym,t.side);
  const past=row.trades.filter(x=>x[0]===t.sym&&x[1]===t.side&&x[3]<t.entryT&&x[3]>=t.entryT-150*3600000);
  let gp=0,gl=0;for(const x of past){if(x[4]>0)gp+=x[4];else gl-=x[4];}
  const reasons=[];activeSignalsAt([tp],t.entryT,protocol.actualSettings.signals,protocol.actualWf.signalLongH,protocol.actualWf,reasons);
  const ownActivation=reasons.find(x=>x.sym===t.sym&&x.side===t.side)??reasons.filter(x=>x.key?.includes(t.sym)&&x.side===t.side)[0]??null;
  details.push({cfg:t.cfg,sym:t.sym,side:t.side,kind:t.kind,entryT:t.entryT,exitT:t.exitT,reason:t.reason,entry:t.entry,exit:t.exit,unitR:modeledUnitReturn(t),n:past.length,gp,gl,historicalPf:gl>0?gp/gl:null,entryEvaluation:ev,entryLastN:lastN,ownActivation});
 }
 if(scanned%100===0)console.log('traced',scanned,'configs',details.length,'funded closes');
}
assert.equal(details.length,funded.trades.length);
const summarize=xs=>{let gp=0,gl=0;for(const x of xs){assert(Number.isFinite(x.unitR));if(x.unitR>0)gp+=x.unitR;else gl-=x.unitR;}return{n:xs.length,gp,gl,pf:gl>0?gp/gl:null,noLoss:xs.length>0&&gl===0,entryOwnValid:xs.filter(x=>x.entryEvaluation.ok&&x.entryLastN).length,entryInvalid:xs.filter(x=>!x.entryEvaluation.ok||!x.entryLastN).map(x=>({cfg:x.cfg,sym:x.sym,side:x.side,entryT:x.entryT,why:x.entryEvaluation.fail,lastN:x.entryLastN}))};};
const groups={};for(const field of ['kind','sym','side','reason']){groups[field]={};for(const value of new Set(details.map(x=>String(x[field]))))groups[field][value]=summarize(details.filter(x=>String(x[field])===value));}
const result={schema:'cts-signal-entry-settlement-trace-v1',auditScriptSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),sourceSha256:protocol.source.sha256,protocolSha256,scope:'Actual funded settled cohort; exact own qualification before entry, unchanged archived returns. Historical contexts overlap across configs and are not independent market observations.',total:summarize(details),groups,details};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({total:result.total,groups}));
