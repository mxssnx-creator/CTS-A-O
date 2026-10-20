// Source-only reseal of the existing frozen experiments; no formulas, costs, splits or selection change.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sessionStudySourceFiles,studyExactJson,studySha256} from '../../scripts/lib/session-study.mjs';
const docs='docs/micro-optimization-2026-10-20',audit='docs/hourly-progress-2026-10-21';
const sourceSha256=studySha256(studyExactJson(sessionStudySourceFiles()));
const prior=JSON.parse(readFileSync(`${docs}/plan.json`));assert.equal(prior.caseRevision,'v6');
const archive=`${docs}/plan-v6-before-publication-fix.json`;assert.ok(!existsSync(archive));copyFileSync(`${docs}/plan.json`,archive);
const plan={...prior,revision:6,caseRevision:'v7',sourceSha256,trainingCases:{standard:'runs/micro-opt-train-standard-v7',fast:'runs/micro-opt-train-fast-v7'},preflightNotes:[...prior.preflightNotes,'v7 changes only coherent completed runtime publication, carries Exit Base proof across settings changes, and expands optional raw-history audit coverage. All v6 economic settings, windows, account, costs, thresholds and training-only selection remain exactly unchanged. This is a repeated cached-data correctness test, not fresh unseen evidence.']};
const paired=[];
for(const hold of ['standard','fast']) {
 const out=plan.trainingCases[hold];
 execFileSync(process.execPath,['--experimental-strip-types','--no-warnings','scripts/micro-optimization-study.mjs','prepare','--feed',`${docs}/reproduction-feed.json.gz`,'--out',out,'--end',String(plan.trainingEndT),'--hold',hold,'--label',`micro-optimization-training-${hold}`],{stdio:'pipe'});
 const p=JSON.parse(readFileSync(`${out}/protocol.json`)),old=JSON.parse(readFileSync(`${docs}/train-${hold}-v6-protocol.json`));
 assert.equal(p.source.sha256,sourceSha256);
 for(const key of ['actualSettings','actualWf','window','account'])assert.equal(studyExactJson(p[key]),studyExactJson(old[key]),`${hold}: ${key}`);
 assert.equal(p.feed.sha256,old.feed.sha256);
 copyFileSync(`${out}/protocol.json`,`${docs}/train-${hold}-v7-protocol.json`);
 paired.push({hold,feedSha256:p.feed.sha256,settingsWfWindowsAccountIdentical:true});
}
writeFileSync(`${docs}/plan.json`,JSON.stringify(plan,null,2)+'\n');
const universal=JSON.parse(readFileSync('docs/universal-correctness-2026-10-21/plan.json'));
universal.schema='cts-universal-correctness-plan-v3';universal.sourceSha256=sourceSha256;universal.revisionReason='Repeat the identical catalog/gate/native hourly and unfinished-bar audits after atomic runtime publication fix. Preserve previous immutable audit receipts separately.';
writeFileSync(`${audit}/universal-plan.json`,JSON.stringify(universal,null,2)+'\n');
const result={schema:'cts-hourly-progress-repeat-plan-v1',sourceSha256,checkpoint:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineSourceSha256:prior.sourceSha256,originalWindow:{symbols:20,ordinarySources:616,preH:12,runH:12,indicatorWarmupH:24,completeTapeHistories:true,requiredScalarDecisions:750636},research:{caseRevision:'v7',paired,windows:[prior.trainingEndT,prior.validationEndT,prior.confirmationEndT],selectionUnchanged:true},acceptance:['Current cohort, qualifications, counts/history and realtime inputs remain coherent through failures and economic/settings/generation transitions.','Every recorded own hourly decision has complete raw rows and matches independent scalar arithmetic, including never-passing configs.','Hourly window delta equals newly closed minus expired net returns; Last-N stays exact and independent.','All complete market filtered-stage outputs reproduce the same frozen economic cases; preserve losses and any discrepancy.','Full ordinary core inventory, optional slow tests, all registry hourly/unfinished-bar audits and stress pass on this source.'],profitability:'No upward PF clamping, gate relaxation, loss removal or manufactured stable counts; positive hourly market results remain an empirical target, not a correctness assertion.'};
writeFileSync(`${audit}/plan.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({sourceSha256,paired}));
