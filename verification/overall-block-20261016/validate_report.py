#!/usr/bin/env python3
"""Check the authorized final six-file report after actual core completion.

Preparation only until root releases final generation after regular and slow
core pass. Reads generated outputs only; no raw arm evidence, engine, network
or packaging. Retrospective results and blocked venue status remain distinct.
"""
import argparse
import base64
import collections
import csv
import hashlib
import io
import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path


NAMES={'index.html','comparison.csv','hourly.csv','all-close-slices.csv','report-data.json','report-manifest.json'}
CSVS={'comparison.csv','hourly.csv','all-close-slices.csv'}


def check(condition,message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.capture=False;self.embedded=[];self.remote=[];self.text=[]
        self.tables=[];self.table=None;self.row=None;self.in_title=False;self.title=[]
        self.in_header=False;self.header=[]

    def handle_starttag(self,tag,attrs):
        attributes=dict(attrs)
        for name in ('src','href'):
            value=attributes.get(name,'').strip().lower()
            if value.startswith(('http:','https:','//')):
                self.remote.append(value)
        if tag=='title':self.in_title=True
        if tag=='header':self.in_header=True
        if tag=='script' and attributes.get('id')=='csv-downloads':
            check(not self.embedded,'Duplicate embedded CSV payload')
            self.capture=True
        if tag=='table':
            check(self.table is None,'Nested report table')
            self.table=[]
        if tag=='tr' and self.table is not None:self.row=0
        if tag in ('td','th') and self.row is not None:self.row+=1

    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='header':self.in_header=False
        if tag=='script':self.capture=False
        if tag=='tr' and self.row is not None:
            self.table.append(self.row);self.row=None
        if tag=='table' and self.table is not None:
            self.tables.append(self.table);self.table=None

    def handle_data(self,data):
        if self.capture:self.embedded.append(data)
        if self.in_title:self.title.append(data)
        if self.in_header:self.header.append(data)
        self.text.append(data)


def validate(directory,checkpoint,freeze_sha,manifest_sha,generator_sha,audit_sha,parameter_proof_sha):
    check(directory.is_dir() and not directory.is_symlink(),'Report directory unavailable or symlinked')
    check({p.name for p in directory.iterdir()}==NAMES,'Report must contain exactly six declared files')
    check(all(p.is_file() and not p.is_symlink() for p in directory.iterdir()),'Report files must be regular nonsymlinks')
    blobs={name:(directory/name).read_bytes() for name in NAMES}
    data=json.loads(blobs['report-data.json']);manifest=json.loads(blobs['report-manifest.json'])
    for value in (data,manifest):
        check(value['sourceCheckpoint']==checkpoint and value['sourceFreezeSha256']==freeze_sha,'Final checkpoint/freeze mismatch')
        check(value['provisional'] is False,'Final output must not be provisional')
        check('provisional' not in value['releaseSnapshotLabel'].lower() and 'offline checks complete' in value['releaseSnapshotLabel'].lower(),'Final release label must state offline checks complete')
        check(value['productionRepair']['sourceCheckpoint']==checkpoint,'Integration manifest checkpoint mismatch')
        check(value['productionRepair']['priorEconomicIdentityAssumed'] is False,'Prior economic identity must remain unassumed')
        check(value['productionRepair']['focusedEvidenceEstablishesFinalSuiteOrVenuePass'] is False,'Focused proof must not imply final suite/venue pass')
        repair=value['productionRepair']
        ids=['independent-candidate-direction-history','sparse-cumulative-fill-fee-provenance','opt-in-causal-block-source-trace','conservative-six-decimal-block-recording','merged-main-PR139-history','backtest-rerun-eligibility','scoped-backtest-cancellation','preset-edit-result-invalidation']
        check(repair['manifestSchema']=='cts-overall-block-final-integrated-source-v3' and [row['id'] for row in repair['integrationChanges']]==ids,'Final v3 evidence must retain all eight ordered integration/preset contracts')
        ancestor=repair['integratedAncestry']['cp8Manifest']
        check(ancestor['schema']=='cts-overall-block-final-integrated-source-v1' and ancestor['checkpoint']=='e6914363380599e1f49a837a3a7a835ff9276faf' and ancestor['sha256']=='0e3ff350e9cbadcb03c4d3e2e888204e4f3aea543884b813350e64550fb022af' and ancestor['parents']==['c6ed5e9275a70f1fd995992f11a19cd9b57bf290','fc2ec3b3e9e6fe61b55a95fd1ea8802103c564a8'],'Historical CP8 integrated-main ancestry mismatch')
        refs=[row for row in value['inputs'] if row['path']==str(Path(repair['reference']).absolute())]
        check(len(refs)==1 and refs[0]['sha256']==manifest_sha,'Authorized final v3 source manifest hash missing')
        hashes={row['path']:row['sha256'] for row in value['inputs']}
        check(hashes.get(str(Path(ancestor['path']).absolute()))==ancestor['sha256'],'Historical ancestry manifest missing from hashed inputs')
        chain=repair['integratedAncestry']['sourceParents']
        check(chain and len(chain)<=64 and repair['integratedAncestry']['checkpointChainVerified'] is True and repair['integratedAncestry']['treeShaUniquenessRequired'] is False,'Ordered acyclic checkpoint-chain validation missing')
        check(checkpoint!=ancestor['checkpoint'],'Final checkpoint cannot be its historical CP8 base')
        seen={ancestor['checkpoint'],checkpoint};previous=ancestor['checkpoint'];prefix=[]
        for index,parent in enumerate(chain):
            check(parent['checkpoint'] not in seen and parent['parents']==[previous],'Repeated/cyclic checkpoint or actual single-parent chain mismatch')
            check(isinstance(parent['tree'],str) and re.fullmatch(r'[a-f0-9]{40}',parent['tree']),'Ancestor declared tree metadata unavailable')
            check(parent['schema']==('cts-overall-block-final-integrated-source-v2' if index==0 else 'cts-overall-block-final-integrated-source-v3'),'Ancestor schema prefix mismatch')
            check(parent['baseReference']=={key:ancestor[key] for key in ('path','sha256','checkpoint')},'Ancestor CP8 base reference mismatch')
            check(parent['declaredSourceParents']==prefix and len(parent['integrationChanges'])>=7 and parent['integrationChanges']==ids[:len(parent['integrationChanges'])],'Ancestor declared chain/integration prefix mismatch')
            if index==0:
                check(parent['checkpoint']=='da5fe49058bc721086d207ac4b34e67cab856b32' and parent['sha256']=='3e8777a46c66646737b43769c32771c9990211293150587418f76d2cc6dbf286' and len(parent['integrationChanges'])==7,'First source parent must be immutable CP9 v2')
            check(hashes.get(str(Path(parent['path']).absolute()))==parent['sha256'],'Ancestor source-parent manifest missing from hashed inputs')
            seen.add(parent['checkpoint']);previous=parent['checkpoint'];prefix.append({key:parent[key] for key in ('path','sha256','checkpoint')})
        check(repair['parents']==[previous],'Final direct parent must equal the last verified source-parent checkpoint')
        old_hashes={row['sha256'] for row in repair['historicalFocusedEvidence']}
        check(repair['focusedEvidence'] and any(Path(row['path']).suffix=='.json' for row in repair['focusedEvidence']),'Fresh CP10 preset-edit proof required')
        check(all(row['sha256'] not in old_hashes and hashes.get(row['path'])==row['sha256'] for row in repair['focusedEvidence']),'Ancestor focused hashes cannot become fresh CP10 proof')
        expected_paths={'src/core/sim/walkforward.ts','src/core/server/runtime.server.ts','src/core/audit.ts','src/core/server/live.server.ts','src/core/domain/types.ts','src/core/sim/block.ts','package-lock.json','src/core/server/pool.server.ts'}
        check(set(repair['sealedIntegrationFileSha256'])==expected_paths,'Final runtime/pool and retained integration hashes must all be source-bound')
    check(manifest['generatorSha256']==generator_sha,'Generator revision mismatch')
    boundary=data['studyBoundaries']
    check(boundary==manifest['studyBoundaries'],'Report data/manifest study boundaries differ')
    check(boundary['auditSha256']==audit_sha and boundary['parameterProofSha256']==parameter_proof_sha,'Reviewed boundary proof hashes differ')
    check(boundary['auditSchema']=='cts-block-independent-cp10-final-review-v1' and boundary['parameterProofSchema']=='cts-block-cp10-parameter-source-and-summary-proof-v1','Fresh CP10 study proof schemas required; no ancestor-study fallback')
    check(data['productionRepair']['currentStudyEvidence']=={'independentAudit':{'path':boundary['auditReference'],'sha256':audit_sha},'parameterProof':{'path':boundary['parameterProofReference'],'sha256':parameter_proof_sha}},'Explicit fresh audit/parameter proof must exactly match final v3 manifest studyEvidence')
    for value in (data,manifest):
        refs={row['path']:row['sha256'] for row in value['inputs']}
        check(refs.get(boundary['auditReference'])==audit_sha and refs.get(boundary['parameterProofReference'])==parameter_proof_sha,'Boundary proofs missing from hashed report inputs')
    signal=boundary['signalActivity']
    check(signal['established'] is False and signal['captureCount']==signal['failedCaptureCount']==len(data['rows']),'All-capture missing Signal execution boundary changed')
    for row in data['rows']:
        check(any(item.get('name')==signal['nativeCheck'] and item.get('expected')==1 and item.get('actual')==0 and item.get('ok') is False for item in row['nativeFailedChecks']),'Native Signal activity limitation missing from a capture')
    check(boundary['independentMicroMinimumShortQualificationEstablished'] is False,'Independent range qualification cannot be inferred from aggregate Engine closes')
    qualification=boundary['qualificationInference']
    check(qualification['classification']=='inference from audited native checks and policy assessment' and qualification['statement']=='This study does not establish independent Micro, Minimum and Short range qualification systemwide.','Range-qualification statement must be an explicit limited inference')
    check(qualification['captureCount']==len(data['rows']) and qualification['auditNoLivePromotion'] is True and qualification['auditPassingProfiles']==[] and qualification['assessmentPassingProfiles']==[],'Audited non-promotion and empty passing-profile basis missing')
    reasons=qualification['auditedObservedReasons']
    check(isinstance(reasons,list) and bool(reasons) and all(isinstance(reason,str) and bool(reason.strip()) for reason in reasons),'Original nonempty audited reasons missing from range inference')
    check(isinstance(qualification['basis'],str) and bool(qualification['basis'].strip()) and set(qualification['rangeFailures'])=={'mc','mn','sh'},'Named range inference basis/counts missing')
    for kind,counts in qualification['rangeFailures'].items():
        check(isinstance(counts,dict) and set(counts)=={'coverage','execution'},'Range inference needs coverage and execution failure counts')
        for field,name in (('coverage',f'coverage: range {kind} has config sets'),('execution',f'execution: range {kind} executed orders')):
            count=counts[field]
            actual=sum(item.get('name')==name and item.get('ok') is not True for row in data['rows'] for item in row['nativeFailedChecks'])
            check(type(count) is int and 0<count<=len(data['rows']) and count==actual,'Range inference counts differ from retained native checks')
    account=boundary['modelAccount'];caps=account['caps']
    check(account['sizingMode']=='equityPct' and account['selectedLiveCapsPositive'] is False,'Actual model sizing/cap source boundary changed')
    check(all(type(account.get(key)) in (int,float) and math.isfinite(account[key]) and account[key]>0 for key in ('balance','equityPct','leverage')),'Modeled account parameters unavailable')
    check(caps['on'] is True and caps['source']=='x01 defaults (no live caps in the settings)' and all(type(caps.get(key)) in (int,float) and math.isfinite(caps[key]) and caps[key]>0 for key in ('maxPositionX','maxExposureX')),'Fallback cap boundary unavailable')
    check(boundary['risk']['method']=='minute-close marked model' and {'wick/tick extremes','liquidation execution'}<=set(boundary['risk']['excludes']),'Minute-close risk limitation missing')
    features=boundary['frozenFeatures']
    check(features['sideGateN']==0 and features['blockTrace'] is False and features['enabledPathsPerformanceEstablished'] is False and features['focusedSoftwareTestsAreSeparate'] is True,'Inactive study feature context missing')
    outputs=manifest['outputs']
    check(len(outputs)==5 and {x['path'] for x in outputs}==NAMES-{'report-manifest.json'},'Manifest must hash the other five outputs exactly once')
    for item in outputs:
        body=blobs[item['path']]
        check(item['bytes']==len(body) and item['sha256']==sha(body),'Output hash/size mismatch')
    parsed={name:list(csv.DictReader(io.StringIO(blobs[name].decode('utf-8'),newline=''))) for name in CSVS}
    check(len(data['rows'])==len(parsed['comparison.csv'])==manifest['comparisonRows']==20,'Comparison must retain all twenty declared rows')
    check(len(data['hours'])==len(parsed['hourly.csv'])==manifest['hourlyRows']==120,'Hourly export must retain all120 rows')
    check(len(parsed['all-close-slices.csv'])==manifest['closeSlices']==data['closeSliceCount'],'All-close CSV count mismatch')
    groups={(row['fold'],row['arm']):row for row in data['rows']}
    check(len(groups)==20,'Duplicate fold/arm in report data')
    compare={(row['fold'],row['arm']):row for row in parsed['comparison.csv']}
    check(len(compare)==20 and set(compare)==set(groups),'CSV/data comparison identities differ')
    hours=collections.Counter((row['fold'],row['arm']) for row in parsed['hourly.csv'])
    check(set(hours)==set(groups) and all(n==6 for n in hours.values()),'Six hourly rows required per declared fold/arm')
    allocations=collections.defaultdict(collections.Counter);seen=set()
    for row in parsed['all-close-slices.csv']:
        key=(row['fold'],row['arm']);kind=row['allocation']
        check(key in groups and kind in {'positive','zero','unknown'},'Close export has unknown cohort')
        identity=(key,row['canonical_close_identity'])
        check(identity not in seen,'Duplicate close identity in exported cohort');seen.add(identity)
        allocations[key][kind]+=1
        check(row['source_checkpoint']==checkpoint,'Close CSV checkpoint mismatch')
        check(row['primary_sample_included']==str(kind!='zero'),'Zero/unknown primary membership changed')
        check(row['positive_owned']==str(kind=='positive'),'Owned membership changed')
    totals=collections.Counter()
    for key,row in groups.items():
        counts=allocations[key];totals.update(counts)
        expected={'n':counts['positive']+counts['unknown'],'ownedCloses':counts['positive'],
                  'zeroAllocations':counts['zero'],'unknownAllocations':counts['unknown']}
        check(row['virtual']['n']==sum(counts.values()),'Virtual close slices dropped')
        for name,count in expected.items():
            check(row['funded'].get(name,0)==count,'Funded/zero/unknown counts disagree with complete close CSV')
            check(int(compare[key]['funded_'+name])==count,'Comparison CSV cohort count mismatch')
    checks={item['id']:item for item in data['releaseStatus']['checks']}
    required={'scripts-broad','platform','lint','production-build','production-ui','full-core-regular','full-core-slow','x02-vst-venue'}
    check(len(data['releaseStatus']['checks'])==len(checks)==8 and set(checks)==required,'Final release must retain all eight distinct verification stages')
    check(not data['unfinishedOfflineStages'] and not data['failedOrBlockedOfflineStages'],'Final offline stages must actually be complete without failures/blockers')
    input_hashes={row['path']:row['sha256'] for row in manifest['inputs']}
    for key,item in checks.items():
        if key=='x02-vst-venue':continue
        check(item['status']=='passed','Every final offline verification stage must have actually passed')
        check(type(item.get('failed')) is int and item['failed']==0,'Passed offline stage requires actual zero failures')
        check(item.get('evidence'),'Passed offline stage requires explicit actual evidence')
        for ref in item['evidence']:
            check(input_hashes.get(ref['path'])==ref['sha256'],'Stage evidence hash missing or inconsistent with generated input manifest')
    for key in ('full-core-regular','full-core-slow'):
        check(type(checks[key].get('passed')) is int and checks[key]['passed']>0,'Completed core requires its actual positive pass count, never a fixed assumed count')
        check(type(checks[key].get('skipped')) is int and checks[key]['skipped']>=0,'Completed core requires its actual nonnegative skipped count')
    check(checks['x02-vst-venue']['status']=='blocked','Unauthenticated X02 venue must remain blocked')
    check(data['access']['namedConnection'].get('actualAuthenticatedAccountVerified') is not True,'Final blocked X02 access must remain explicitly unverified')
    document=Document();document.feed(blobs['index.html'].decode('utf-8'));document.close()
    check(not document.remote,'Standalone HTML must not load remote assets')
    check('provisional' not in ''.join(document.title).lower(),'Final HTML title must not be provisional')
    check('provisional' not in ''.join(document.header).lower() and 'offline checks complete' in ''.join(document.header).lower(),'Final HTML header must state offline checks complete without a provisional label')
    check('Modeled Engine cohort' in ''.join(document.header) and 'Signal execution not established' in ''.join(document.header),'Final header must retain Engine/Signal evidence boundary')
    check(document.embedded,'Embedded CSV downloads missing')
    embedded=json.loads(''.join(document.embedded))
    check(set(embedded)==CSVS,'Embedded downloads must contain all three CSVs')
    for name,encoded in embedded.items():
        check(base64.b64decode(encoded,validate=True)==blobs[name],'Embedded CSV bytes differ from standalone CSV')
    check(all(table and len(set(table))==1 for table in document.tables),'HTML table cells are not rectangular')
    check([len(table)-1 for table in document.tables]==[2,20,120,20,16,8],'HTML table rows differ from complete baseline/comparison/hourly/activity/functionality/release inventories')
    text=' '.join(document.text)
    for needle in ('Return PF primary','Cash PF diagnostic','X02 VST execution tests remain blocked','Final integrated source contracts'):
        check(needle in text,'Required factual HTML label missing')
    for needle in ('Modeled account:',f"${account['balance']:,.2f}",f"{account['equityPct']*100:g}%",f"{account['leverage']:g}× leverage",'x01 fallback caps:',f"{caps['maxPositionX']:g}× equity",f"{caps['maxExposureX']:g}× gross exposure",f"{signal['failedCaptureCount']}/{signal['captureCount']} captures",'Inference:',qualification['statement'],'Minute-close drawdown excludes wick/tick extremes and liquidation execution','sideGateN=0 and blockTrace=false'):
        check(needle in text,'Required source-bound model/Signal/range/risk/feature disclosure missing')
    return {'schema':'cts-overall-block-final-report-cross-artifact-check-v1',
            'directory':str(directory),'sourceCheckpoint':checkpoint,'sourceFreezeSha256':freeze_sha,
            'generatorSha256':generator_sha,'sourceManifestSha256':manifest_sha,'provisional':False,
            'comparisonRows':20,'hourlyRows':120,'closeSliceRows':len(parsed['all-close-slices.csv']),
            'allocationRows':dict(totals),'tables':[len(table)-1 for table in document.tables],
            'embeddedCSVBytesMatch':True,'standaloneNoRemoteAssets':True,'fullCoreComplete':True,'offlineChecksComplete':True,'x02VenueBlocked':True,
            'actualCoreCounts':{key:{name:checks[key][name] for name in ('passed','failed','skipped')} for key in ('full-core-regular','full-core-slow')},
            'stageEvidenceHashesMatchInputManifest':True,
            'studyBoundaryProofsVerified':True,'independentAuditSha256':audit_sha,'parameterProofSha256':parameter_proof_sha,
            'files':[{'name':name,'bytes':len(body),'sha256':sha(body)} for name,body in sorted(blobs.items())],
            'limits':'Final cross-artifact integrity and actual offline-completion labels only; independent raw PF/exact-minute-risk audit and blocked venue execution remain separate.'}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',required=True);parser.add_argument('--checkpoint',required=True)
    parser.add_argument('--freeze-sha256',required=True);parser.add_argument('--manifest-sha256',required=True)
    parser.add_argument('--generator-sha256',required=True);parser.add_argument('--out',required=True)
    parser.add_argument('--audit-sha256',required=True)
    parser.add_argument('--parameter-proof-sha256',required=True)
    args=parser.parse_args()
    result=validate(Path(args.directory),args.checkpoint,args.freeze_sha256,args.manifest_sha256,args.generator_sha256,args.audit_sha256,args.parameter_proof_sha256)
    with Path(args.out).open('x') as file:json.dump(result,file,indent=2);file.write('\n')
    print(json.dumps(result,indent=2))
