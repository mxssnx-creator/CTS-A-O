"""Bounded offline replay with preserved failure logs and source-frozen evidence."""
import json, os, resource, subprocess, sys, time
from pathlib import Path
case=Path(sys.argv[1]); p=json.loads((case/'protocol.json').read_text()); w=p['window']
assert p['actualSettings']['signals']['enabled'] is False
assert len(p['symbols'])==12 and w['runH']==12
iso=lambda t: time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(t/1000))
env=dict(os.environ,CTS_CORE_STATE='off',CTS_CORE_AUTOSTART='0',CTS_CORE_LIVE='0',CTS_CORE_COMPARE='0',CTS_CORE_VARIANTS='0',CTS_CORE_WORKERS='2',MALLOC_ARENA_MAX='2',MALLOC_MMAP_THRESHOLD_='1048576')
env['NODE_OPTIONS']='--require '+str(Path('scripts/lib/core-test-offline-guard.cjs').resolve())
node=['node','--expose-gc','--experimental-strip-types','--no-warnings','--max-old-space-size='+os.environ.get('STUDY_HEAP_MB','6144')]
cmd=node+['scripts/core-session.mjs','--feed',p['feed']['path'],'--desk',str(case/'desk.json'),
 '--frozen-session',str(case/'protocol.json'),'--symbols','12','--pre',str(w['preH']),'--run','12',
 '--end-at',iso(w['endT']),'--evaluation-from',iso(w['evaluationFromT']),'--selection-hours','100',
 '--live-since',iso(w['tradeStartT']),'--replay-preload-all','--signals','off',
 '--balance','10','--pct','.001','--leverage','10','--out',str(case/'session'),'--html',str(case/'report'),
 '--dump',str(case/'raw.json'),'--tape-trades-all','--chunk-allocations','--quiet','true']
(case/'command.json').write_text(json.dumps({'argv':cmd,'environment':{k:v for k,v in env.items() if k.startswith(('CTS_CORE_','MALLOC_')) or k=='NODE_OPTIONS'}},indent=2))
start=time.monotonic(); code=None
try:
 with (case/'run.log').open('w') as log:
  code=subprocess.call(cmd,env=env,stdout=log,stderr=log,timeout=10800)
 if code: raise RuntimeError('Native replay failed: '+str(code))
 for script,args in [('summarize-range-session.mjs',[str(case),str(case/'report/data.json')]),
                     ('audit-simulation-parity.mjs',[str(case/'raw.json'),str(case/'parity.json')])]:
  with (case/(script+'.log')).open('w') as log:
   subprocess.run(node+['scripts/'+script]+args,env=env,stdout=log,stderr=log,check=True,timeout=1800)
finally:
 (case/'process-metrics.json').write_text(json.dumps({'exitCode':code,'elapsedSeconds':time.monotonic()-start,
  'childPeakRssMiB':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss/1024,'sourceSha256':p['source']['sha256']},indent=2))
 print((case/'run.log').read_text()[-4000:])
