#!/usr/bin/env python3
"""Owner-scoped advisory cache cleanup. Never reads research contents; --run only after owner release."""
from pathlib import Path
import argparse,datetime,hashlib,json,os,stat,subprocess
ROOT=Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
HEAD='08cd452e16b37acac9799450066088ebceaa1314';TREE='214927a2683e2ba2e69d8fcd4e6249c72effe71d'
REFERENCE=Path('/tmp/cts-block-cp10-pre-push-source-510-20261016.json')
REFERENCE_SHA='c5a5e3820789c9968f9b2fabb8774c7af7619cc2a9edbf7871045d1419e02324'
NAMES=['block-relations-20261016-attempt-01-superseded-before-outcomes','block-relations-20261016-attempt-02-superseded-before-outcomes','block-relations-20261016-attempt-03-captured-before-reporting-fix','block-relations-20261016-attempt-04-before-pool-fix','block-relations-20261016-attempt-05-memory-degraded','block-relations-20261016-attempt-06-before-direction-history-fix','block-relations-20261016-attempt-07-before-backtest-lifecycle-fix','block-relations-20261016-attempt-08-before-preset-edit-invalidation','block-relations-20261016']
OUT=Path('/tmp/cts-block-own-artifact-cache-release-cp10-final-regular-20261016.json')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def cg():
 result={'at':now(),'scope':'Whole concurrent cgroup; no exclusive causal or per-PID attribution.'}
 for name in ['memory.current','memory.max','memory.events','memory.stat']:
  raw=(Path('/sys/fs/cgroup')/name).read_text().strip();result[name]={k:int(v) for k,v in (line.split() for line in raw.splitlines())} if name in ['memory.events','memory.stat'] else int(raw)
 return result

def identity(s):return {k:getattr(s,k) for k in ['st_dev','st_ino','st_mode','st_nlink','st_uid','st_gid','st_size','st_atime_ns','st_mtime_ns','st_ctime_ns']}
def source():
 h=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip();t=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=ROOT,text=True).strip()
 assert h==HEAD and t==TREE,'Source checkpoint differs'
 assert hashlib.sha256(REFERENCE.read_bytes()).hexdigest()==REFERENCE_SHA
 expected=json.loads(REFERENCE.read_text());assert len(expected)==510
 paths=[p for d in ['src','scripts'] for p in (ROOT/d).rglob('*') if p.is_file()]+[ROOT/p for p in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','eslint.config.mjs']]
 actual={str(p.relative_to(ROOT)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(set(paths))};assert actual==expected,'Source map differs'
 return {'head':h,'tree':t,'sourceCount':len(actual),'canonicalMapSHA256':REFERENCE_SHA,'allSourceHashesMatch':True}

def main(run):
 if not run:print(json.dumps({'status':'prepared only; no scan or hint executed','roots':[str(ROOT/'runs'/n) for n in NAMES],'output':str(OUT)},indent=2));return
 if OUT.exists():raise RuntimeError('Refusing overwrite of completed cache-hint evidence')
 before_source=source();before_mem=cg();errors=[];skipped=[];candidates=[];rows=[]
 assert ROOT.resolve()==ROOT and (ROOT/'runs').resolve()==ROOT/'runs'
 for name in NAMES:
  base=ROOT/'runs'/name
  assert base.is_dir() and not base.is_symlink() and base.resolve()==base
  for folder,dirs,files in os.walk(base,followlinks=False):
   dirs[:]=[d for d in dirs if not (Path(folder)/d).is_symlink()]
   for filename in files:
    p=Path(folder)/filename
    if p.suffix!='.json':continue
    s=p.lstat()
    if not stat.S_ISREG(s.st_mode):skipped.append({'path':str(p),'reason':'nonregular or symlink'});continue
    if s.st_size<1_000_000:continue
    if s.st_nlink!=1:skipped.append({'path':str(p),'reason':'hardlinked shared inode'});continue
    if p.resolve()!=p or base not in p.parents:raise RuntimeError('Outside/symlink candidate')
    candidates.append((p,s))
 # Root explicitly released engines and the independent owner audit with all large files closed.
 # Check visible descriptor metadata too; inaccessible unrelated namespaces are recorded, never guessed or signalled.
 keys={(s.st_dev,s.st_ino) for p,s in candidates};visible_open=set();denied=[];fd_errors=0
 for proc in Path('/proc').iterdir():
  if not proc.name.isdigit():continue
  try:fds=list((proc/'fd').iterdir())
  except PermissionError:denied.append(int(proc.name));continue
  except FileNotFoundError:continue
  for fd in fds:
   try:
    ss=fd.stat()
    if (ss.st_dev,ss.st_ino) in keys:visible_open.add((ss.st_dev,ss.st_ino))
   except PermissionError:fd_errors+=1
   except FileNotFoundError:pass
 for p,initial in candidates:
  if (initial.st_dev,initial.st_ino) in visible_open:skipped.append({'path':str(p),'reason':'visible open handle'});continue
  fd=None
  try:
   flags=os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|getattr(os,'O_NOATIME',0)
   fd=os.open(p,flags);pre=identity(os.fstat(fd));assert pre==identity(initial),'Identity changed before hint'
   os.fsync(fd);os.posix_fadvise(fd,0,0,os.POSIX_FADV_DONTNEED)
   post=identity(os.fstat(fd));path_post=identity(p.lstat());assert pre==post==path_post,'Identity changed around hint'
   rows.append({'path':str(p),'before':pre,'after':post,'statIdentitiesUnchanged':True})
  except Exception as e:errors.append({'path':str(p),'error':type(e).__name__+': '+str(e)})
  finally:
   if fd is not None:os.close(fd)
 after_source=source();after_mem=cg();delta={k:after_mem['memory.events'].get(k,0)-before_mem['memory.events'].get(k,0) for k in set(before_mem['memory.events'])|set(after_mem['memory.events'])}
 result={'schema':'cts-own-immutable-artifact-cache-hint-v2','at':now(),'operation':'fsync then POSIX_FADV_DONTNEED on exact owned regular inode, no content reads/writes, global drop, signals, threshold changes or unrelated data','resourceBasis':'Root explicit audit/engines release: all own large sealed files closed; only tiny SHA annotation remains','roots':[str(ROOT/'runs'/n) for n in NAMES],'files':rows,'fileCount':len(rows),'bytes':sum(x['before']['st_size'] for x in rows),'errors':errors,'skipped':skipped,'visibleDescriptorCheck':{'candidateOpenInodesSkipped':len(visible_open),'inaccessibleProcFdDirectories':denied,'fdStatPermissionErrors':fd_errors,'scope':'Visible descriptors only; closed ownership is grounded in explicit completed-owner release, not an exhaustive unrelated namespace claim.'},'sourceBefore':before_source,'sourceAfter':after_source,'sourceUnchanged':before_source==after_source,'memoryBefore':before_mem,'memoryAfter':after_mem,'memoryEventDelta':delta,'interpretation':'Whole concurrent cgroup; memory differences cannot establish exclusive causality. Fresh production memory gate still required.'}
 OUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'output':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'files':len(rows),'bytes':result['bytes'],'errors':len(errors),'skipped':len(skipped),'allStatIdentitiesUnchanged':all(x['statIdentitiesUnchanged'] for x in rows),'source510Unchanged':result['sourceUnchanged'],'memoryCurrentBefore':before_mem['memory.current'],'memoryCurrentAfter':after_mem['memory.current'],'memoryEventDelta':delta},indent=2))
 if errors:raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--run',action='store_true');main(p.parse_args().run)
