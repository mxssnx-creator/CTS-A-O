#!/usr/bin/env python3
"""Exact source-bound, serial CP10 scripts/platform/lint protocol. Default prepares only."""
from pathlib import Path
import argparse, datetime, hashlib, json, os, re, subprocess, time
ROOT = Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
SELF = Path('/tmp/cts-block-final-cp10-broad-run-20261016.py')
PREFIX = Path('/tmp/cts-block-final-cp10-20261016')
EXPECTED_HEAD = '08cd452e16b37acac9799450066088ebceaa1314'
EXPECTED_TREE = '214927a2683e2ba2e69d8fcd4e6249c72effe71d'
EXPECTED_MANIFEST = Path(str(PREFIX) + '-source-expected.json')
GUARD = str(ROOT / 'scripts/lib/core-test-offline-guard.cjs')
PLATFORM = ['src/lib/app-data/app-data.test.ts', 'src/lib/app-data/readiness-schedule.test.ts', 'src/lib/auth/gate-identity.test.ts', 'src/lib/auth/sign-in-gate.test.ts', 'src/components/v2/accounting.test.ts', 'src/components/v2/signal-units.test.ts', 'src/components/v2/indication-ui.test.ts', 'src/components/v2/base-counts.test.ts']
def stamp(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(path, value): Path(path).write_text(json.dumps(value, indent=2) + '\n')
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
def hashes():
    paths = [p for directory in ['src', 'scripts'] for p in (ROOT / directory).rglob('*') if p.is_file()]
    paths += [ROOT / p for p in ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'eslint.config.mjs']]
    return {str(p.relative_to(ROOT)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in sorted(set(paths))}
def env():
    return {'PATH': os.environ['PATH'], 'LANG': 'C.UTF-8', 'TZ': 'UTC', 'NODE_OPTIONS': '--require ' + json.dumps(GUARD), 'CTS_CORE_WORKERS': '1', 'CTS_CORE_COMPARE': '0', 'CTS_CORE_LIVE': '0', 'CTS_CORE_SLOW': '0', 'CTS_CORE_TEST_CONCURRENCY': '1', 'MALLOC_ARENA_MAX': '2', 'MALLOC_MMAP_THRESHOLD_': '1048576'}
def jobs():
    common = ['node', '--require', GUARD, '--expose-gc', '--experimental-strip-types', '--no-warnings', '--test', '--test-concurrency=1']
    return [('scripts', common[:3] + ['--max-old-space-size=1024'] + common[3:] + ['scripts/**/*.test.mjs']), ('platform', common[:3] + ['--max-old-space-size=512', '--heap-growing-percent=50'] + common[3:] + PLATFORM), ('lint', ['node', '--require', GUARD, '--max-old-space-size=768', 'node_modules/eslint/bin/eslint.js', '.'])]
def cg():
    out = {'at': stamp(), 'scope': 'Whole concurrent cgroup; no per-process attribution.'}
    for name in ['memory.current', 'memory.max', 'memory.peak', 'memory.events', 'memory.stat']:
        try:
            raw = (Path('/sys/fs/cgroup') / name).read_text().strip()
            out[name] = ({k: int(v) for k, v in (line.split() for line in raw.splitlines())} if name in ['memory.events', 'memory.stat'] else int(raw) if raw.isdigit() else raw)
        except OSError: out[name] = None
    return out

def processes():
    out = {}
    for d in Path('/proc').iterdir():
        if not d.name.isdigit(): continue
        try:
            tail = (d / 'stat').read_text().rsplit(')', 1)[1].split()
            args = [x.decode(errors='replace') for x in (d / 'cmdline').read_bytes().split(b'\0') if x]
            out[int(d.name)] = {'pid': int(d.name), 'ppid': int(tail[1]), 'startTicks': tail[19], 'args': args, 'cmdSha256': hashlib.sha256('\0'.join(args).encode()).hexdigest()}
        except (OSError, ValueError, IndexError): pass
    return out

def root_pid(ps):
    roots = [pid for pid, p in ps.items() if str(SELF) in p['args'] and p['args'][-1] == '--run' and p['args'][0].split('/')[-1].startswith('python')]
    if len(roots) != 1: raise RuntimeError('Expected one exact external wrapper in /proc: ' + str(roots))
    return roots[0]
def tree(ps, outer):
    owned = {outer}
    while True:
        more = {pid for pid, p in ps.items() if p['ppid'] in owned} - owned
        if not more: return owned - {outer}
        owned |= more

def remaining(seen):
    ps = processes()
    return {key: row for key, row in seen.items() if row['pid'] in ps and ps[row['pid']]['startTicks'] == row['startTicks']}
def counts(path):
    text = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', path.read_text(errors='replace'))
    value = {}
    for key in ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms']:
        m = re.findall(rf'^(?:ℹ |# )?{key}\s+(\d+(?:\.\d+)?)\s*$', text, re.M)
        if m: value[key] = float(m[-1]) if '.' in m[-1] else int(m[-1])
    return value

def dependencies():
    lockbytes = (ROOT / 'package-lock.json').read_bytes(); lock = json.loads(lockbytes)
    present = 0; absent = []; mismatch = []
    for name, entry in lock.get('packages', {}).items():
        if not name.startswith('node_modules/') or not entry.get('version'): continue
        path = ROOT / name / 'package.json'
        if not path.exists(): absent.append({'name': name, 'optional': entry.get('optional', False)}); continue
        actual = json.loads(path.read_text()).get('version'); present += 1
        if actual != entry['version']: mismatch.append({'name': name, 'expected': entry['version'], 'actual': actual})
    return {'at': stamp(), 'lockSha256': hashlib.sha256(lockbytes).hexdigest(), 'present': present, 'versionMismatches': mismatch, 'absent': absent, 'absentCount': len(absent), 'allAbsentOptional': all(p['optional'] for p in absent), 'nodeModulesRealpath': str((ROOT / 'node_modules').resolve()), 'passed': not mismatch and all(p['optional'] for p in absent), 'readOnly': True, 'noInstalls': True}

def production_memory_preflight(env):
    # Fresh process reads the actual bound production calculation; no runtime or test is imported.
    code = """import {memInfo,cgroupAvailMb,memSoftMb,memHardMb,parseMemAvailable} from './src/core/server/memguard.server.ts';
import {readFileSync} from 'node:fs';
const read = (path) => { try { return readFileSync(path,'utf8').trim(); } catch { return null; } };
const info = memInfo(); const cg = cgroupAvailMb();
const value = {at:new Date().toISOString(),memInfo:info,cgroupAvailableMb:cg,
  thresholds:{softMb:memSoftMb(),hardMb:memHardMb()},
  hostMemAvailableMb:parseMemAvailable(read('/proc/meminfo') ?? ''),
  raw:{selfCgroup:read('/proc/self/cgroup'),memoryCurrent:read('/sys/fs/cgroup/memory.current'),memoryMax:read('/sys/fs/cgroup/memory.max'),memoryStat:read('/sys/fs/cgroup/memory.stat'),memoryEvents:read('/sys/fs/cgroup/memory.events')},
  scope:'Read-only diagnostic process. Its RSS is not the suite worker RSS.',
  passed:info.level === 'ok' && Number.isFinite(cg)};
process.stdout.write(JSON.stringify(value));"""
    result = subprocess.run(['node', '--require', str(ROOT / 'scripts/lib/core-test-offline-guard.cjs'),
                             '--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', code],
                            cwd=ROOT, env=env, capture_output=True, text=True, check=True)
    value = json.loads(result.stdout)
    value['guardFirst'] = True
    value['thresholdOverrides'] = {k: env[k] for k in ['CTS_CORE_MEM_SOFT_MB', 'CTS_CORE_MEM_HARD_MB'] if k in env}
    value['memorySourceSha256'] = hashlib.sha256((ROOT / 'src/core/server/memguard.server.ts').read_bytes()).hexdigest()
    return value

def plan():
    scripts = sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'scripts').rglob('*.test.mjs') if p.is_file())
    return {'preparedAt': stamp(), 'root': str(ROOT), 'expectedHead': EXPECTED_HEAD, 'expectedTree': EXPECTED_TREE, 'sourceManifest': str(EXPECTED_MANIFEST), 'sourceScope': 'All src/ and scripts/ files plus package.json/package-lock.json/tsconfig.json/vite.config.ts/eslint.config.mjs', 'sourceFileCount': len(hashes()), 'scriptsTestFiles': scripts, 'scriptsTestFileCount': len(scripts), 'platformTestFiles': PLATFORM, 'platformTestFileCount': len(PLATFORM), 'jobs': [{'phase': name, 'args': args} for name, args in jobs()], 'testSelection': 'Full standard scripts/**/*.test.mjs glob, exact standard eight platform files, then eslint .', 'env': env(), 'statePolicy': 'CTS_CORE_STATE and CTS_CORE_AUTOSTART unset; normal fixture persistence, no inherited overrides or credentials', 'concurrency': 1, 'dependencyPhaseGate': 'Fresh version/lock audit before and after each phase, no installs', 'productionMemoryLaunchGate': 'Fresh actual production level must be ok with finite cgroup availability; default thresholds', 'runtimeSourceWrites': False, 'stopAfterFailureOrSourceChange': True}

def check_checkpoint():
    if git('rev-parse', 'HEAD') != EXPECTED_HEAD or git('rev-parse', 'HEAD^{tree}') != EXPECTED_TREE: raise RuntimeError('Refusing unbound or different CP10 HEAD/tree')
def prepare():
    check_checkpoint(); current = hashes()
    if EXPECTED_MANIFEST.exists() and json.loads(EXPECTED_MANIFEST.read_text()) != current: raise RuntimeError('Existing expected source manifest differs; refusing reseal')
    write(EXPECTED_MANIFEST, current); value = plan(); value['expectedManifestSha256'] = hashlib.sha256(EXPECTED_MANIFEST.read_bytes()).hexdigest(); write(str(PREFIX) + '-plan.json', value); print(json.dumps(value, indent=2))

def run():
    check_checkpoint(); expected = json.loads(EXPECTED_MANIFEST.read_text()); before = hashes()
    if before != expected: raise RuntimeError('Refusing source different from bound CP10')
    lock = Path(str(PREFIX) + '.lock'); lock.mkdir()
    started = stamp(); start = time.monotonic(); cgbefore = cg(); results = []; allseen = {}; child = None; error = None; rc = 0
    headbefore = git('rev-parse', 'HEAD'); treebefore = git('rev-parse', 'HEAD^{tree}'); outer = root_pid(processes())
    write(str(PREFIX) + '-plan.json', plan()); write(str(PREFIX) + '-source-before.json', before); write(str(PREFIX) + '-memory-before.json', cgbefore)
    depbefore = dependencies(); write(str(PREFIX) + '-dependency-before.json', depbefore)
    try:
        if not depbefore['passed']: raise RuntimeError('Installed dependency versions do not match final lock or required package is absent')
        for name, args in jobs():
            if hashes() != before: raise RuntimeError('Source changed before ' + name)
            phase_dependencies = dependencies(); write(str(PREFIX) + '-' + name + '-dependency-before.json', phase_dependencies)
            if not phase_dependencies['passed']: raise RuntimeError('Dependency versions differ before ' + name)
            phase_memory = production_memory_preflight(env()); write(str(PREFIX) + '-' + name + '-production-memory-preflight.json', phase_memory)
            if not phase_memory['passed']: raise RuntimeError('Production memory is not ok before ' + name)
            log = Path(str(PREFIX) + '-' + name + '.log'); seen = {}; t = time.monotonic(); phase_before = cg(); phase_started = stamp(); last_progress = t
            with log.open('wb') as output:
                child = subprocess.Popen(args, cwd=ROOT, env=env(), stdout=output, stderr=subprocess.STDOUT)
                print(json.dumps({'event': 'started', 'phase': name, 'at': phase_started, 'head': headbefore, 'log': str(log)}), flush=True)
                while True:
                    ps = processes()
                    for pid in tree(ps, outer):
                        row = ps[pid]; seen[str(pid) + ':' + row['startTicks']] = row
                    if child.poll() is not None: break
                    if time.monotonic() - last_progress >= 30:
                        progress = {'at': stamp(), 'phase': name, 'elapsedSeconds': time.monotonic() - t, 'logBytes': log.stat().st_size, 'cgroup': cg()}; write(str(PREFIX) + '-progress.json', progress); print(json.dumps({'event': 'running', 'phase': name, 'elapsedSeconds': round(progress['elapsedSeconds'], 1), 'logBytes': progress['logBytes']}), flush=True); last_progress = time.monotonic()
                    time.sleep(.5)
                code = child.wait()
            allseen.update(seen); after = hashes(); text = log.read_text(errors='replace')
            phase_dependencies_after = dependencies(); write(str(PREFIX) + '-' + name + '-dependency-after.json', phase_dependencies_after)
            result = {'phase': name, 'args': args, 'startedAt': phase_started, 'completedAt': stamp(), 'elapsedSeconds': time.monotonic() - t, 'exitCode': code, 'rawLog': str(log), 'rawLogBytes': log.stat().st_size, 'rawLogSha256': hashlib.sha256(log.read_bytes()).hexdigest(), 'counts': counts(log), 'dependenciesBeforePassed': phase_dependencies['passed'], 'dependenciesAfterPassed': phase_dependencies_after['passed'], 'dependencyLockUnchanged': phase_dependencies['lockSha256'] == phase_dependencies_after['lockSha256'], 'summary': [line for line in text.splitlines() if line.startswith('ℹ ') or re.search(r'\d+ problems? \(\d+ errors?, \d+ warnings?\)', line)], 'sourceUnchanged': before == after, 'changedPaths': sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p)), 'cgroupBefore': phase_before, 'cgroupAfter': cg(), 'observedOwnedIdentities': seen, 'remainingOwnedIdentities': remaining(seen)}
            write(str(PREFIX) + '-' + name + '-result.json', result); results.append(result); print(json.dumps({k: result[k] for k in ['phase', 'exitCode', 'elapsedSeconds', 'counts', 'summary', 'sourceUnchanged', 'remainingOwnedIdentities']}), flush=True)
            if code or not result['sourceUnchanged'] or not result['dependenciesAfterPassed'] or not result['dependencyLockUnchanged']: rc = code or 1; break
    except BaseException as exc:
        error = type(exc).__name__ + ': ' + str(exc); rc = 1
        if child and child.poll() is None:
            child.terminate()
            try: child.wait(timeout=15)
            except subprocess.TimeoutExpired: child.kill(); child.wait()
    finally:
        after = hashes(); cgafter = cg(); depafter = dependencies(); rem = remaining(allseen)
        write(str(PREFIX) + '-source-after.json', after); write(str(PREFIX) + '-memory-after.json', cgafter); write(str(PREFIX) + '-dependency-after.json', depafter)
        delta = {k: cgafter['memory.events'].get(k, 0) - cgbefore['memory.events'].get(k, 0) for k in set(cgbefore['memory.events']) | set(cgafter['memory.events'])}
        result = {'startedAt': started, 'completedAt': stamp(), 'elapsedSeconds': time.monotonic() - start, 'expectedHead': EXPECTED_HEAD, 'expectedTree': EXPECTED_TREE, 'headBefore': headbefore, 'treeBefore': treebefore, 'headAfter': git('rev-parse', 'HEAD'), 'treeAfter': git('rev-parse', 'HEAD^{tree}'), 'exitCode': rc, 'wrapperError': error, 'jobs': results, 'sourceFileCount': len(before), 'sourceUnchanged': expected == before == after, 'changedSourcePaths': sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p)), 'sourceManifestSha256': hashlib.sha256(EXPECTED_MANIFEST.read_bytes()).hexdigest(), 'memoryEventDelta': delta, 'dependenciesBeforePassed': depbefore['passed'], 'dependenciesAfterPassed': depafter['passed'], 'dependencyLockUnchanged': depbefore['lockSha256'] == depafter['lockSha256'], 'wrapperOuterPid': outer, 'observedOwnedIdentities': allseen, 'remainingOwnedIdentities': rem, 'processIdentityMethod': 'Outer /proc ancestry from exact unique wrapper, PID+startTicks identity (command hash also recorded); no namespace Popen PID guessing or unrelated process signals.', 'repositoryWrites': False}
        if len(results) != len(jobs()) or not result['sourceUnchanged'] or not depafter['passed'] or rem or result['headAfter'] != EXPECTED_HEAD or result['treeAfter'] != EXPECTED_TREE: rc = result['exitCode'] = rc or 1
        write(str(PREFIX) + '-result.json', result); lock.rmdir(); print(json.dumps({'event': 'finished', 'result': str(PREFIX) + '-result.json', 'exitCode': rc, 'sourceUnchanged': result['sourceUnchanged'], 'memoryEventDelta': delta, 'remainingOwnedIdentities': rem}), flush=True)
    return rc
if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--run', action='store_true'); args = parser.parse_args()
    if args.run: raise SystemExit(run())
    prepare()
