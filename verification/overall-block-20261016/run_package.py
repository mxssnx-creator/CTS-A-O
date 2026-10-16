#!/usr/bin/env python3
"""Run the frozen public-evidence collector only after the explicit root grant.

No application imports, upload, friendly copies, source changes, or archive
re-scoring. Collector copy SHA/CRC/fingerprint/security checks are not repeated
over the full archive. The wrapper independently checks metadata and ten report
payloads, including the frozen six-file final report.
"""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import resource
import shutil
import subprocess
import time
from datetime import datetime, timezone
import zipfile

REPO=Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
RUN=REPO/'runs/block-relations-20261016'
COLLECTOR=Path('/tmp/cts-overall-block-package-20261016.py')
COLLECTOR_SHA='ec7f5d06c3bcad62767d01d39b47998adedefc6ecfc060d5c0850db258192bd0'
CHECKPOINT='08cd452e16b37acac9799450066088ebceaa1314'
TREE='214927a2683e2ba2e69d8fcd4e6249c72effe71d'
FREEZE_SHA='c3eedf13c9bb053be341157db683909953bbc0a38e5472745c62b76c4746c183'
OUT=Path('/tmp/cts-ao-overall-block-20261016.zip')
REPORT=Path('/tmp/cts-overall-block-final-cp10-20261016')
PREFIX='/tmp/cts-overall-block-package-final-cp10-20261016'
STDOUT=Path(PREFIX+'.stdout.json')
STDERR=Path(PREFIX+'.stderr.log')
RECEIPT=Path(PREFIX+'.run.json')
ROOT510=Path('/tmp/cts-block-cp10-pre-push-source-510-20261016.json')
EXTRAS={
 '/tmp/cts-block-cp10-preset-revision-baseline-20261016/red-manifest.json':'2380c2044ae3414bd2450ab2daaeec862a61862d04bbd14edf50fecdbd7d107a',
 '/tmp/cts-block-cp10-preset-revision-baseline-20261016/publication-red-manifest.json':'0e7bf49216cbc00cbe697c176af1310c68f2bfbaafb97838d24c1cc909837503',
 '/tmp/cts-block-cp10-preset-revision-baseline-20261016/intermediate-manifest.json':'e03b0641c87a44ca98d317d27173d8f5a8fdd17d00eba1b568d6817bfe2a5544',
 '/tmp/cts-block-cp10-preset-revision-baseline-20261016/tsc-failure-manifest.json':'732a381f7517edae789b6e9a5c64da74aa96ea34135fe88e7f244b14d921a965',
}
REPORTS={
 'all-close-slices.csv':(5410047,'445b77adacc7bf396251343e72c0735820be5d785280c0abbdae68a03607334f'),
 'comparison.csv':(83449,'2429dbeff08b6d1186f58cf036c1727572f0ebd8ff8d2211b9b853123215fc90'),
 'hourly.csv':(128103,'4976d0bc1a56714f99523838f121c6d38f784e3c39406474b90e33642179e04c'),
 'index.html':(7741448,'2aeb1cf9717a2d46f04bdc62400a5609c501b6d2d14f589e57890ff6fccd7da8'),
 'report-data.json':(724918,'0dca0b5ddf60784ef51a793807407d19f6d8d17e885de1760dd68fb3c7ce2564'),
 'report-manifest.json':(33694,'783b7385d15fb59b708fa379787f51173f4f2ab309ecf5b9b830593cb493d8b1'),
}
PINS={
 str(COLLECTOR):COLLECTOR_SHA,
 str(ROOT510):'c5a5e3820789c9968f9b2fabb8774c7af7619cc2a9edbf7871045d1419e02324',
 str(RUN/'source-freeze.json'):FREEZE_SHA,
 '/tmp/cts-overall-block-current-coordination-20261016.json':'c2db60c44f187c8d47a67a66a13a8ff8a7558cdc463f0ad13d35cc5808e292f2',
 '/tmp/cts-overall-block-release-evidence-index-20261016.json':'f82a71b9846643efc0370c24b8b88c3370f0cdc8499c0ca5fb29dfbb5150f676',
 '/tmp/cts-overall-block-release-status-20261016.json':'865620956de179b1eaf050ad4a2953f863aac66b1a5cf980e6457f80d4337383',
 '/tmp/cts-block-functionality-matrix-20261016.json':'ad7ef57cce07c0b0cdd41bfe2f0fec5e2cc609447886aa59bf3967c4a446e60b',
 '/tmp/cts-block-functionality-matrix-20261016.md':'6f9bb56af62911dfeb660943b820c66f1d0d38a60fa289e03ee5a439b331d647',
 '/tmp/cts-block-cp10-final-source-manifest-20261016.json':'797bd366b02e115266afb879cc3867f174d6748d658e1b3486e49dd7d086dce2',
 '/tmp/cts-block-independent-cp10-final-review-20261016.json':'931b078bb0f52aba04a97f15a14723755201fbd4c0e57d437c1dda9b2bcc9fcc',
 str(RUN/'cp10-parameter-source-summary-proof.json'):'df9dab106ea98a68d71ecb990f19873397a82762f00af052706d72b999d89d3e',
 '/tmp/cts-block-report-final-cp10-ui-qa-20261016-2aeb1cf9.json':'c2109e08ef4fe914fb909b3b14ee94d149b6d25d082d29f11940f1531730ea7d',
 '/tmp/cts-block-report-final-cp10-root-visual-review-20261016.json':'e425f4c58231ab8f657d8c255db7de70a4d288b1fc75c7823afed55b2d06b5fb',
 '/tmp/cts-block-report-final-cp10-run-20261016.json':'ee07325f851503799980928ef8db355418a8fdb4b631fb6869e71f1971024fbc',
 '/tmp/cts-block-report-final-cp10-validation-20261016.json':'e410949c2c267c7b3120280756fe63977860ddcf106490cc52b94121af1977c9',
 **EXTRAS,
 **{str(REPORT/name):sha for name,(_,sha) in REPORTS.items()},
}
ARGV=['python3',str(COLLECTOR),'--package','--evidence-ready','comparator-finished',
 '--source-checkpoint',CHECKPOINT,'--freeze-sha256',FREEZE_SHA,'--out',str(OUT),
 '--report-dir',str(REPORT)]
for extra in EXTRAS:ARGV.extend(['--report',extra])
EXTENSIONS={'.json','.jsonl','.ndjson','.log','.txt','.md','.html','.csv','.tsv','.sha256'}
DENIED_PARTS={'.git','node_modules','engine-source','source','src','scripts','.cts-core','.ssh','.grok','screenshots','screenshot','private','qa','qa-private','ui-private','.output','.tanstack','__pycache__'}
DENIED_NAME=re.compile(r'(?:private|screenshot|credential|secret|account-record|account-snapshot|\.env(?:\.|$))',re.I)

def require(condition,message):
 if not condition:raise ValueError(message)

def stamp():return datetime.now(timezone.utc).isoformat()

def sha_file(path):
 p=Path(path);require(p.is_file() and not p.is_symlink(),f'Not a regular nonsymlink file: {p}')
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()

def verify_pins():
 for path,sha in PINS.items():require(sha_file(path)==sha,f'Pinned input changed: {path}')
 require({p.name for p in REPORT.iterdir()}==set(REPORTS),'Final report is not exactly the frozen six files')

def git_state():
 identities=subprocess.check_output(['git','rev-parse','HEAD','HEAD^{tree}'],cwd=REPO,text=True).splitlines()
 require(identities==[CHECKPOINT,TREE],'Release HEAD/tree changed')
 status=subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],cwd=REPO)
 return {'head':identities[0],'tree':identities[1],'statusSha256':hashlib.sha256(status).hexdigest()}

def source_scope():
 expected=json.loads(ROOT510.read_bytes());require(len(expected)==510,'Root source scope changed')
 for name,record in expected.items():
  p=REPO/name;require(not Path(name).is_absolute() and '..' not in Path(name).parts,'Unsafe source scope path')
  require(p.stat().st_size==record['bytes'] and sha_file(p)==record['sha256'],f'Source510 mismatch: {name}')
 return {'files':len(expected),'rootManifestSha256':PINS[str(ROOT510)],'allBytesMatch':True,'scope':'Exact pinned510 members; source contents are hashed only, never archived by wrapper'}

def owned_identity(pid):
 try:
  s=Path(f'/proc/{pid}/stat').read_text();return {'pid':pid,'startTicks':s[s.rfind(')')+2:].split()[19]}
 except FileNotFoundError:return None

def memory():
 root=Path('/sys/fs/cgroup');out={'at':stamp()}
 for name in ('memory.current','memory.peak','memory.max'):
  if (root/name).exists():out[name]=(root/name).read_text().strip()
 if (root/'memory.events').exists():out['memory.events']={k:int(v) for k,v in (line.split() for line in (root/'memory.events').read_text().splitlines())}
 return out

def inspect_archive(result):
 require(result['archive']==str(OUT) and result['manifest']==str(OUT)+'.manifest.json','Unexpected collector output paths')
 require(result['uploadPerformed'] is False and OUT.stat().st_size==result['bytes'],'Archive size/upload status changed')
 require(re.fullmatch('[a-f0-9]{64}',result['sha256']) is not None,'Malformed collector archive hash')
 require(Path(str(OUT)+'.sha256').read_text()==f"{result['sha256']}  {OUT.name}\n",'Whole-archive hash sidecar mismatch')
 side=Path(str(OUT)+'.manifest.json');body=side.read_bytes();manifest=json.loads(body)
 require(manifest['sourceCheckpoint']==CHECKPOINT and manifest['sourceFreezeSha256']==FREEZE_SHA,'Archive source identity mismatch')
 require(manifest['completeness']=='all-expected-artifacts-present' and manifest['missingExpectedArtifacts']==[] and manifest['incompleteReason'] is None,'Final archive is incomplete')
 rows=manifest['inputs'];payloads={r['archivePath']:r for r in manifest['payloads']}
 require(len(rows)==manifest['inputFiles']==result['inputFiles'],'Archive logical inventory count mismatch')
 expected_reports={f'reports/{n}':(str(REPORT/n),size,sha) for n,(size,sha) in REPORTS.items()}
 expected_reports.update({f'reports/{Path(p).name}':(p,Path(p).stat().st_size,s) for p,s in EXTRAS.items()})
 actual_reports={r['logicalPath']:r for r in rows if r['logicalPath'].startswith('reports/')}
 require(set(actual_reports)==set(expected_reports),'Archive must contain exactly six report files and four safe baseline metadata reports')
 for name,(source,size,sha) in expected_reports.items():
  row=actual_reports[name]
  require(row['source']==source and row['bytes']==size and row['sha256']==sha and row['archivePath']==name,f'Report identity changed: {name}')
 with zipfile.ZipFile(OUT) as archive:
  infos=archive.infolist();names=[i.filename for i in infos]
  require(len(names)==len(set(names)) and set(names)==set(payloads)|{'MANIFEST.json'},'ZIP inventory differs from manifest')
  require(archive.read('MANIFEST.json')==body,'Embedded/sidecar manifest bytes differ')
  for info in infos:
   parts=PurePosixPath(info.filename).parts
   require(parts and not PurePosixPath(info.filename).is_absolute() and '..' not in parts,'Unsafe ZIP member')
   require(not set(p.lower() for p in parts)&DENIED_PARTS and not DENIED_NAME.search(parts[-1]),'Forbidden source/private/screenshot archive member')
   require(PurePosixPath(info.filename).suffix.lower() in EXTENSIONS,'Code/DB/image/archive body in evidence payload')
   require(not parts[-1].startswith(('cts-overall-block-checkpoint','cts-overall-block-package')),'Raw checkpoint or mutable packaging output in archive')
   if info.filename in payloads:require(info.file_size==payloads[info.filename]['bytes'],'ZIP payload size mismatch')
  for name,(_,size,sha) in expected_reports.items():
   h=hashlib.sha256();count=0
   with archive.open(name) as member:
    while chunk:=member.read(1024*1024):h.update(chunk);count+=len(chunk)
   require(count==size and h.hexdigest()==sha,f'Archived report bytes mismatch: {name}')
 require(not Path(str(OUT)+'.partial').exists(),'Owned partial archive remains')
 return {'archive':result,'manifestSha256':hashlib.sha256(body).hexdigest(),'logicalInputFiles':manifest['inputFiles'],'physicalInputFiles':manifest['physicalInputFiles'],'zipMembers':len(payloads)+1,'logicalInputBytes':manifest['inputBytes'],'physicalPayloadBytes':manifest['physicalPayloadBytes'],'deduplicatedFeedBytes':manifest['deduplicatedFeedBytes'],'protocolRoots':manifest['researchProtocolRoots'],'allCurrentExpectedArtifactsPresent':True,'frozenSixReportsAndFourSafeBaselineReportsMatch':True,'excludedSourceCodePrivateDbScreenshotsBySelectionAndNames':True,'exclusionReasonCounts':dict(collections.Counter(r['reason'] for r in manifest['excluded'])),'verificationDivision':'Frozen collector ec7f exit0 establishes every-input credential scan, streaming copy SHA, full CRC test, final selected-file/input-fingerprint stability and whole-ZIP SHA. Wrapper checks central-directory/manifest identities and independently hashes only the ten explicit report payloads; it does not repeat the full raw/archive read.'}

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute-after-root-package-grant',action='store_true');args=parser.parse_args()
 require(args.execute_after_root_package_grant,'Preparation only; root final package grant required')
 verify_pins()
 for p in (OUT,Path(str(OUT)+'.partial'),Path(str(OUT)+'.manifest.json'),Path(str(OUT)+'.sha256'),STDOUT,STDERR,RECEIPT):require(not p.exists() and not p.is_symlink(),f'Exclusive output already exists: {p}')
 require(ARGV.count('--report')==4 and '--incomplete-reason' not in ARGV,'Unexpected collector scope')
 before_git=git_state();before_source=source_scope();started=time.monotonic()
 receipt={'schema':'cts-cp10-final-evidence-package-execution-v1','startedAt':stamp(),'authorization':'Root explicit final collector grant after actual HTML QA cleanup, frozen final index and coordination; no upload or friendly copies','wrapper':{'path':str(Path(__file__).absolute()),'sha256':sha_file(Path(__file__)),'bytes':Path(__file__).stat().st_size},'collectorSha256':COLLECTOR_SHA,'argv':ARGV,'gitBefore':before_git,'source510Before':before_source,'pinnedInputs':PINS,'diskBefore':dict(zip(('total','used','free'),shutil.disk_usage('/tmp'))),'wrapperIdentity':owned_identity(os.getpid()),'memoryBefore':memory(),'childIdentity':None,'collectorExitCode':None,'status':'running','uploadPerformed':False,'friendlyCopiesPerformed':False,'sourceWrites':False,'selectedMetadataWrites':False}
 error=None
 try:
  with STDOUT.open('xb') as stdout,STDERR.open('xb') as stderr:
   child=subprocess.Popen(ARGV,stdout=stdout,stderr=stderr,cwd=REPO,start_new_session=True)
   receipt['childIdentity']=owned_identity(child.pid)
   print(json.dumps({'status':'collector-started','at':stamp(),'ownedChildIdentity':receipt['childIdentity'],'wrapperSha256':receipt['wrapper']['sha256'],'stdout':str(STDOUT),'stderr':str(STDERR)},indent=2),flush=True)
   receipt['collectorExitCode']=child.wait()
  require(receipt['collectorExitCode']==0,'Collector failed; preserve logs/outputs and request root review without waiver')
  receipt['inventoryAndIntegrity']=inspect_archive(json.loads(STDOUT.read_bytes()))
  verify_pins();receipt['gitAfter']=git_state();receipt['source510After']=source_scope()
  require(receipt['gitAfter']==before_git and receipt['source510After']==before_source,'Frozen source/HEAD/tree/status changed')
  receipt['status']='passed collector and bounded postchecks; upload/friendly copies not performed'
 except Exception as exc:
  error=exc;receipt['status']='FAILED; preserve outputs and logs; no automatic retry or gate waiver';receipt['error']=f'{type(exc).__name__}: {exc}'
 finally:
  receipt['completedAt']=stamp();receipt['elapsedSeconds']=time.monotonic()-started;receipt['memoryAfter']=memory()
  receipt['memoryEventDelta']={k:receipt['memoryAfter'].get('memory.events',{}).get(k,0)-v for k,v in receipt['memoryBefore'].get('memory.events',{}).items()}
  receipt['reportedChildMaxRssKiB']=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
  child=receipt['childIdentity'];receipt['observedChildRemaining']=bool(child and owned_identity(child['pid'])==child)
  receipt['resourceScope']='Child PID identity is observed in wrapper namespace; actual exec-session exit confirms wrapper completion. Cgroup values describe the whole cgroup, not process attribution.'
  receipt['logs']=[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha_file(p)} for p in (STDOUT,STDERR) if p.exists()]
  body=(json.dumps(receipt,indent=2)+'\n').encode()
  with RECEIPT.open('xb') as output:output.write(body)
  print(json.dumps({'status':receipt['status'],'collectorExitCode':receipt['collectorExitCode'],'elapsedSeconds':receipt['elapsedSeconds'],'runReceipt':str(RECEIPT),'runReceiptSha256':hashlib.sha256(body).hexdigest(),'archive':receipt.get('inventoryAndIntegrity',{}).get('archive'),'observedChildRemaining':receipt['observedChildRemaining'],'error':receipt.get('error')},indent=2),flush=True)
 if error:raise SystemExit(2)

if __name__=='__main__':main()
