"""Run one predeclared native comparison, retaining failures and full evidence."""
import json
import os
from pathlib import Path
import platform
import resource
import shutil
import subprocess
import sys
import time

root = Path('runs/signals-native')
plan = json.loads((root / 'plan.json').read_text())
expected = json.loads(Path('docs/signals-coverage-20261023/universal-plan.json').read_text())
assert plan['sourceSha256'] == expected['sourceSha256'], 'Unexpected economic source'
scenario = sys.argv[1]
job = next(j for j in plan['jobs'] if j['scenario']['id'] == scenario)
case = Path(job['dir'])
protocol = json.loads((case / 'protocol.json').read_text())
w = protocol['window']
assert w['preH'] == 100 and w['runH'] == 12 and len(protocol['symbols']) == 12

def iso(t):
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t / 1000))

node = ['node', '--expose-gc', '--experimental-strip-types', '--no-warnings']
cmd = node + ['--max-old-space-size=4096', 'scripts/core-session.mjs',
    '--feed', protocol['feed']['path'], '--desk', str(case / 'desk.json'),
    '--frozen-session', str(case / 'protocol.json'), '--symbols', '12', '--pre', '100',
    '--run', '12', '--end-at', iso(w['endT']), '--evaluation-from', iso(w['evaluationFromT']),
    '--selection-hours', '100', '--live-since', iso(w['tradeStartT']), '--replay-preload-all',
    '--balance', '10', '--pct', '.001', '--leverage', '10', '--out', str(case / 'session'),
    '--html', str(case / 'report'), '--dump', str(case / 'raw.json'),
    '--tape-trades-all', '--chunk-allocations', '--quiet', 'true']
env = dict(os.environ)
env['NODE_OPTIONS'] = '--require ' + str(Path('scripts/lib/core-test-offline-guard.cjs').resolve())
recorded_env = {k: env[k] for k in env if k.startswith('CTS_CORE_') or k.startswith('MALLOC_') or k == 'NODE_OPTIONS'}
(case / 'command.json').write_text(json.dumps({'argv': cmd, 'env': recorded_env}, indent=2) + '\n')
metrics = {'scenario': scenario, 'runner': 'GitHub ubuntu-24.04', 'machine': platform.machine(),
    'cpuCount': os.cpu_count(), 'sourceSha256': plan['sourceSha256']}

def run(command, log_name):
    print(json.dumps({'scenario': scenario, 'stage': log_name, 'startedAt': iso(time.time() * 1000)}), flush=True)
    with (case / log_name).open('w') as log:
        code = subprocess.call(command, env=env, stdout=log, stderr=log)
    print(json.dumps({'scenario': scenario, 'stage': log_name, 'exitCode': code}), flush=True)
    if code:
        print((case / log_name).read_text()[-10000:], flush=True)
        raise RuntimeError(f'{log_name} failed: {code}')

try:
    start = time.monotonic()
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    try:
        run(cmd, 'run.log')
        metrics['exitCode'] = 0
    except Exception:
        metrics['exitCode'] = 1
        raise
    finally:
        after = resource.getrusage(resource.RUSAGE_CHILDREN)
        metrics.update(wallSeconds=time.monotonic() - start,
            childPeakRssMiB=after.ru_maxrss / 1024,
            userSeconds=after.ru_utime - before.ru_utime,
            systemSeconds=after.ru_stime - before.ru_stime)
        (case / 'process-metrics.json').write_text(json.dumps(metrics, indent=2) + '\n')
    for script, log in [('audit-signal-coverage', 'coverage-audit.log'),
                        ('export-signal-execution', 'execution-export.log'),
                        ('audit-signal-admission', 'admission-audit.log')]:
        run(node + ['--max-old-space-size=2048', f'scripts/{script}.mjs', str(case)], log)
    data = json.loads((case / 'coverage.json').read_text())
    print(json.dumps({'scenario': scenario, 'catalog': data['catalog'], 'account': data['account'],
        'audit': data['audit'], 'metrics': metrics}), flush=True)
finally:
    receipts = root / 'receipts' / scenario
    receipts.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / 'plan.json', receipts / 'plan.json')
    for name in ['protocol.json', 'desk.json', 'command.json', 'process-metrics.json', 'run.log',
                 'coverage-audit.log', 'coverage.json', 'derived-catalog.json', 'execution-export.log',
                 'execution-contexts.json', 'admission-audit.log', 'admission-trace.json', 'session.json', 'session.md']:
        if (case / name).exists():
            shutil.copyfile(case / name, receipts / name)
