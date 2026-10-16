from pathlib import Path
import hashlib,json,time,datetime
SELF='/tmp/cts-overall-block-cp10-regular-only-runner-20261016.py'
OUT=Path('/tmp/cts-overall-block-cp10-regular-only-20261016-owned-process-observations.json')
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def scan():
 out={}
 for d in Path('/proc').iterdir():
  if not d.name.isdigit():continue
  try:
   s=(d/'stat').read_text().rsplit(')',1)[1].split();a=[x.decode(errors='replace') for x in (d/'cmdline').read_bytes().split(b'\0') if x]
   out[int(d.name)]={'pid':int(d.name),'ppid':int(s[1]),'startTicks':s[19],'state':s[0],'cpuTicks':int(s[11])+int(s[12]),'cmdSha256':hashlib.sha256('\0'.join(a).encode()).hexdigest(),'testFiles':[v for v in a if v.endswith('.test.ts')],'isExactRoot':SELF in a and a[-1]=='--run' and a[0].split('/')[-1].startswith('python')}
  except (OSError,ValueError,IndexError):pass
 return out
ps=scan();roots=[p for p,v in ps.items() if v['isExactRoot']]
assert len(roots)==1,roots
root=ps[roots[0]];seen={};started=stamp();last=0
while True:
 ps=scan();owned={root['pid']} if root['pid'] in ps and ps[root['pid']]['startTicks']==root['startTicks'] else set();rootAlive=bool(owned)
 while True:
  more={pid for pid,p in ps.items() if p['ppid'] in owned}-owned
  if not more:break
  owned|=more
 for pid in owned:
  p=ps[pid];key=str(pid)+':'+p['startTicks']
  if key not in seen:seen[key]={**p,'firstSeenAt':stamp()}
  seen[key].update({'lastSeenAt':stamp(),'lastState':p['state'],'lastCpuTicks':p['cpuTicks']})
 if time.monotonic()-last>=30 or not rootAlive:
  rem={key:{'pid':p['pid'],'startTicks':p['startTicks'],'state':ps[p['pid']]['state']} for key,p in seen.items() if p['pid'] in ps and ps[p['pid']]['startTicks']==p['startTicks']}
  value={'startedAt':started,'at':stamp(),'exactRoot':root,'rootAlive':rootAlive,'observedIdentities':seen,'remainingExactIdentities':rem,'signalsSent':False,'unrelatedProcessesUntouched':True,'identityPolicy':'Outer /proc ancestry from exact wrapper, PID+startTicks identity; command hash recorded; read-only .5s observations after initial start.'}
  OUT.write_text(json.dumps(value,indent=2)+'\n');last=time.monotonic()
  if not rootAlive:
   print(json.dumps({'event':'observer-finished','observedIdentities':len(seen),'remainingExactIdentities':rem,'path':str(OUT)}),flush=True);break
 time.sleep(.5)
