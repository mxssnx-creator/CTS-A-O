#!/usr/bin/env python3
"""Prepare/run one immutable standard offline phase; invocation requires explicit --run."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
PREFIX = Path('/tmp/cts-overall-block-cp10-early-slow-20261016')
CGROUP = Path('/sys/fs/cgroup')
EXPECTED_HEAD = '08cd452e16b37acac9799450066088ebceaa1314'
EXPECTED_TREE = '214927a2683e2ba2e69d8fcd4e6249c72effe71d'
EXPECTED_MANIFEST = Path(str(PREFIX) + '-source-expected-cp10.json')


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def git_output(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def sources():
    # Include all runtime/UI/types/scripts and their fixtures, not only trade-engine TypeScript.
    paths = [p for directory in ['src', 'scripts'] for p in (ROOT / directory).rglob('*') if p.is_file()]
    paths += [ROOT / p for p in ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'eslint.config.mjs']]
    return {str(p.relative_to(ROOT)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in sorted(set(paths))}


def memory():
    result = {'at': utc_now()}
    for name in ['memory.current', 'memory.peak', 'memory.max', 'memory.events']:
        p = CGROUP / name
        if p.exists():
            raw = p.read_text().strip()
            result[name] = ({k: int(v) for k, v in (line.split() for line in raw.splitlines())}
                            if name.endswith('events') else (int(raw) if raw.isdigit() else raw))
    return result


def clean_env():
    env = dict(os.environ)
    removed = []
    for key in list(env):
        if (key.startswith('CTS_CORE_') or re.match(r'^(BINGX|BINANCE|BYBIT|OKX)', key, re.I)
            or re.match(r'^(https?|all|no)_proxy$', key, re.I)
            or key in {'NODE_OPTIONS', 'NODE_TEST_CONTEXT', 'NODE_USE_ENV_PROXY'}):
            removed.append(key)
            del env[key]
    env['CTS_CORE_TEST_CONCURRENCY'] = '1'
    # Deliberately leave CTS_CORE_STATE unset: SQL fixtures retain standard disk-enabled semantics.
    return env, sorted(removed)


def write_json(path, obj):
    path.write_text(json.dumps(obj, indent=2) + '\n')


def driver_metadata(env):
    # Ask the standard driver for its actual selection without importing/running any tests.
    code = """import { coreTestInvocation } from './scripts/test-core.mjs';
const describe = (args) => { const p = coreTestInvocation(args); return {files:p.files, concurrency:p.concurrency, args:p.args}; };
process.stdout.write(JSON.stringify({regular:describe([]), slow:describe(['--slow'])}));"""
    result = subprocess.run(['node', '--require', str(ROOT / 'scripts/lib/core-test-offline-guard.cjs'),
                             '--input-type=module', '-e', code], cwd=ROOT, env=env,
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


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


def dependencies():
    lockbytes = (ROOT / 'package-lock.json').read_bytes(); lock = json.loads(lockbytes)
    present = 0; absent = []; mismatch = []
    for name, entry in lock.get('packages', {}).items():
        if not name.startswith('node_modules/') or not entry.get('version'): continue
        path = ROOT / name / 'package.json'
        if not path.exists(): absent.append({'name': name, 'optional': entry.get('optional', False)}); continue
        actual = json.loads(path.read_text()).get('version'); present += 1
        if actual != entry['version']: mismatch.append({'name': name, 'expected': entry['version'], 'actual': actual})
    return {'at': utc_now(), 'lockSha256': hashlib.sha256(lockbytes).hexdigest(), 'present': present, 'versionMismatches': mismatch, 'absent': absent, 'absentCount': len(absent), 'allAbsentOptional': all(p['optional'] for p in absent), 'nodeModulesRealpath': str((ROOT / 'node_modules').resolve()), 'passed': not mismatch and all(p['optional'] for p in absent), 'readOnly': True, 'noInstalls': True}

def plan():
    env, removed = clean_env()
    metadata = driver_metadata(env)
    files = metadata['regular']['files']
    selected = [{'phase': 'slow', 'command': ['node', 'scripts/test-core.mjs'] + ['--slow'], 'testFileCount': len(metadata['slow']['files']), 'selectedCases': 2}]
    return {
        'preparedAt': utc_now(), 'cwd': str(ROOT),
        'expectedHead': EXPECTED_HEAD, 'expectedTree': EXPECTED_TREE,
        'expectedSourceManifest': str(EXPECTED_MANIFEST),
        'currentHeadMatchesExpected': git_output('rev-parse', 'HEAD') == EXPECTED_HEAD,
        'sourceScope': 'All files in src/ and scripts/, package+lock, tsconfig, Vite and ESLint configs',
        'sourceFileCount': len(sources()), 'commands': selected, 'phaseSelection': 'early-slow',
        'selectedPhases': ['slow'], 'standardRegularFileInventoryCount': len(files),
        'regularTestFiles': [], 'regularTestFileCount': 0,
        'standardDriverMetadata': metadata, 'selectionPolicy': 'Actual coreTestInvocation([], sanitizedEnv) selection; counts are never forced to a previous checkpoint',
        'driver': 'One immutable early-slow standard invocation; other phase is a separate receipt and is never claimed by this run',
        'concurrency': 1, 'workerProcesses': 1,
        'driverHeapMiB': 4096,
        'beforeImportGuard': str(ROOT / 'scripts/lib/core-test-offline-guard.cjs'),
        'guardSurface': 'Portable Node transport/worker guard; not an operating-system sandbox',
        'CTS_CORE_STATE': 'unset; standard fixture persistence semantics, not globally off',
        'sanitizedEnvironmentNames': removed,
        'regularLog': str(PREFIX) + '-regular.log', 'slowLog': str(PREFIX) + '-slow.log', 'result': str(PREFIX) + '-result.json',
        'beforeManifest': str(PREFIX) + '-source-before.json', 'afterManifest': str(PREFIX) + '-source-after.json',
        'runtimeSourceWrites': False,
        'stopAfterFailedRegular': True,
        'dependencyPhaseGate': 'Fresh lock/package-version audit before and after each phase; no installs',
        'productionMemoryLaunchGate': 'Fresh guarded production memInfo level must be ok and cgroupAvailMb finite before each phase; no threshold override',
    }


def parse_counts(raw_log):
    text = raw_log.read_text(errors='replace') if raw_log.exists() else ''
    text = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', text)
    counts = {}
    for name in ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms']:
        matches = re.findall(rf'^(?:ℹ |# )?{name}\s+(\d+(?:\.\d+)?)\s*$', text, re.M)
        if matches:
            counts[name] = float(matches[-1]) if '.' in matches[-1] else int(matches[-1])
    return counts


def run():
    run_plan = plan()
    if git_output('rev-parse', 'HEAD') != EXPECTED_HEAD or git_output('rev-parse', 'HEAD^{tree}') != EXPECTED_TREE:
        raise SystemExit('Refusing run: repository checkpoint differs from explicitly bound CP10')
    if not EXPECTED_MANIFEST.exists() or sources() != json.loads(EXPECTED_MANIFEST.read_text()):
        raise SystemExit('Refusing run: runtime/UI/type/script source differs from frozen CP10 manifest')
    lock = Path(str(PREFIX) + '.lock')
    try:
        lock.mkdir()
    except FileExistsError:
        raise SystemExit(f'Refusing duplicate run; lock already exists: {lock}')
    before = sources()
    before_mem = memory()
    before_git = {'head': git_output('rev-parse', 'HEAD'), 'tree': git_output('rev-parse', 'HEAD^{tree}'),
                  'status': git_output('status', '--short')}
    write_json(Path(str(PREFIX) + '-plan.json'), run_plan)
    write_json(Path(str(PREFIX) + '-source-before.json'), before)
    write_json(Path(str(PREFIX) + '-memory-before.json'), before_mem)
    env, _ = clean_env()
    before_dependencies = dependencies()
    write_json(Path(str(PREFIX) + '-dependency-before.json'), before_dependencies)
    started = utc_now()
    start = time.monotonic()
    samples = [before_mem]
    results = []
    started_phases = []
    error = None
    child = None
    try:
        for invocation in run_plan['commands']:
            phase = invocation['phase']
            phase_before = sources()
            if phase_before != before:
                raise RuntimeError(f'Source changed before {phase}; refusing to combine different source snapshots')
            phase_dependencies = dependencies()
            write_json(Path(str(PREFIX) + '-' + phase + '-dependency-before.json'), phase_dependencies)
            if not phase_dependencies['passed']:
                raise RuntimeError(f'Dependency versions differ before {phase}; phase not launched')
            phase_memory = production_memory_preflight(env)
            write_json(Path(str(PREFIX) + '-' + phase + '-production-memory-preflight.json'), phase_memory)
            if not phase_memory['passed']:
                raise RuntimeError(f'Production memory preflight is not ok before {phase}; phase not launched: '
                                   f"level={phase_memory['memInfo']['level']} availMb={phase_memory['memInfo']['availMb']} "
                                   f"cgroupAvailableMb={phase_memory['cgroupAvailableMb']}")
            raw_log = Path(run_plan[phase + 'Log'])
            phase_start = time.monotonic()
            phase_started = utc_now()
            with raw_log.open('wb') as log:
                child = subprocess.Popen(invocation['command'], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
                started_phases.append(phase)
                print(json.dumps({'event': 'started', 'phase': phase, 'at': phase_started, 'pid': child.pid,
                                  'files': invocation['testFileCount'], 'head': before_git['head'], 'log': str(raw_log)}), flush=True)
                while True:
                    try:
                        code = child.wait(timeout=30)
                        break
                    except subprocess.TimeoutExpired:
                        sample = memory()
                        samples.append(sample)
                        write_json(Path(str(PREFIX) + '-progress.json'), {
                            'at': utc_now(), 'phase': phase, 'pid': child.pid,
                            'phaseElapsedSeconds': time.monotonic() - phase_start,
                            'totalElapsedSeconds': time.monotonic() - start,
                            'logBytes': raw_log.stat().st_size, 'memory': sample,
                        })
                        print(json.dumps({'event': 'running', 'phase': phase,
                                          'phaseElapsedSeconds': round(time.monotonic() - phase_start, 1),
                                          'logBytes': raw_log.stat().st_size,
                                          'memoryCurrent': sample.get('memory.current')}), flush=True)
            phase_dependencies_after = dependencies()
            write_json(Path(str(PREFIX) + '-' + phase + '-dependency-after.json'), phase_dependencies_after)
            phase_result = {
                **invocation, 'startedAt': phase_started, 'completedAt': utc_now(),
                'elapsedSeconds': time.monotonic() - phase_start, 'exitCode': code,
                'counts': parse_counts(raw_log), 'sourceUnchanged': sources() == phase_before,
                'dependenciesBeforePassed': phase_dependencies['passed'], 'dependenciesAfterPassed': phase_dependencies_after['passed'],
                'dependencyLockUnchanged': phase_dependencies['lockSha256'] == phase_dependencies_after['lockSha256'],
                'rawLog': str(raw_log), 'rawLogBytes': raw_log.stat().st_size,
                'rawLogSha256': hashlib.sha256(raw_log.read_bytes()).hexdigest(),
            }
            results.append(phase_result)
            write_json(Path(str(PREFIX) + '-' + phase + '-result.json'), phase_result)
            print(json.dumps({'event': 'phase-finished', **phase_result}), flush=True)
            if not phase_dependencies_after['passed'] or phase_dependencies['lockSha256'] != phase_dependencies_after['lockSha256']:
                raise RuntimeError(f'Dependency versions or lock changed after {phase}; no next phase launched')
            if phase == 'regular' and code != 0:
                print(json.dumps({'event': 'slow-not-started', 'reason': 'Regular suite completed with failure; preserve results for repair before slow work'}), flush=True)
                break
    except BaseException as exc:
        error = f'{type(exc).__name__}: {exc}'
        if child and child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=15)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
    finally:
        after = sources()
        after_mem = memory()
        after_dependencies = dependencies()
        write_json(Path(str(PREFIX) + '-dependency-after.json'), after_dependencies)
        samples.append(after_mem)
        write_json(Path(str(PREFIX) + '-source-after.json'), after)
        write_json(Path(str(PREFIX) + '-memory-samples.json'), samples)
        changed = sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p))
        events_before = before_mem.get('memory.events', {})
        events_after = after_mem.get('memory.events', {})
        event_delta = {k: events_after.get(k, 0) - events_before.get(k, 0) for k in set(events_before) | set(events_after)}
        exit_code = next((r['exitCode'] for r in results if r['exitCode'] != 0), 0)
        if error or changed or not after_dependencies['passed'] or before_dependencies['lockSha256'] != after_dependencies['lockSha256'] or len(results) != len(run_plan['commands']):
            exit_code = exit_code or 1
        result = {
            'startedAt': started, 'completedAt': utc_now(), 'elapsedSeconds': time.monotonic() - start,
            'exitCode': exit_code, 'wrapperError': error, 'phases': results,
            'regularTestFileCount': run_plan['regularTestFileCount'], 'standardRegularFileInventoryCount': run_plan['standardRegularFileInventoryCount'],
            'selectedPhases': run_plan['selectedPhases'], 'regularStarted': 'regular' in started_phases, 'slowSelectedCaseCount': 2,
            'slowStarted': 'slow' in started_phases,
            'slowNotRunReason': None,
            'countPolicy': 'Report regular and slow counts separately; do not add filtered/skipped counts as distinct cases',
            'sourceFileCount': len(before), 'sourceUnchanged': not changed, 'changedSourcePaths': changed,
            'gitBefore': before_git,
            'gitAfter': {'head': git_output('rev-parse', 'HEAD'), 'tree': git_output('rev-parse', 'HEAD^{tree}'),
                         'status': git_output('status', '--short')},
            'memoryBefore': before_mem, 'memoryAfter': after_mem, 'memoryEventDelta': event_delta,
            'reportedChildMaxRssKiB': resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,
            'fixtureEnvironment': run_plan['CTS_CORE_STATE'], 'concurrency': 1,
            'dependenciesBeforePassed': before_dependencies['passed'], 'dependenciesAfterPassed': after_dependencies['passed'],
            'dependencyLockUnchanged': before_dependencies['lockSha256'] == after_dependencies['lockSha256'],
            'expectedHead': EXPECTED_HEAD, 'expectedTree': EXPECTED_TREE,
            'expectedSourceManifest': str(EXPECTED_MANIFEST),
            'sourceMatchesBoundCP10': before == json.loads(EXPECTED_MANIFEST.read_text()),
        }
        write_json(Path(run_plan['result']), result)
        print(json.dumps({'event': 'finished', 'result': str(run_plan['result']), 'exitCode': exit_code,
                          'phases': [{'phase': r['phase'], 'counts': r['counts'], 'exitCode': r['exitCode']} for r in results],
                          'sourceUnchanged': not changed, 'memoryEventDelta': event_delta}), flush=True)
        lock.rmdir()
    return exit_code


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', action='store_true', help='Execute only after comparison-owner clearance')
    parser.add_argument('--preflight', action='store_true', help='Read production memory only after explicit resource release; no tests')
    args = parser.parse_args()
    if args.run and args.preflight:
        raise SystemExit('Choose either --run or --preflight')
    if args.preflight:
        if git_output('rev-parse', 'HEAD') != EXPECTED_HEAD or git_output('rev-parse', 'HEAD^{tree}') != EXPECTED_TREE:
            raise SystemExit('Refusing preflight: repository differs from bound CP10')
        if not EXPECTED_MANIFEST.exists() or sources() != json.loads(EXPECTED_MANIFEST.read_text()):
            raise SystemExit('Refusing preflight: source differs from bound CP10')
        env, _ = clean_env()
        value = production_memory_preflight(env)
        write_json(Path(str(PREFIX) + '-production-memory-launch-preflight.json'), value)
        print(json.dumps(value, indent=2))
        raise SystemExit(0 if value['passed'] else 3)
    if args.run:
        sys.exit(run())
    value = plan()
    if git_output('rev-parse', 'HEAD') != EXPECTED_HEAD or git_output('rev-parse', 'HEAD^{tree}') != EXPECTED_TREE:
        raise SystemExit('Cannot prepare expected CP10 manifest from a different checkpoint')
    expected = sources()
    if EXPECTED_MANIFEST.exists() and expected != json.loads(EXPECTED_MANIFEST.read_text()):
        raise SystemExit('Existing expected CP10 manifest changed; preserve it and investigate before resealing')
    write_json(EXPECTED_MANIFEST, expected)
    value['expectedManifestSha256'] = hashlib.sha256(EXPECTED_MANIFEST.read_bytes()).hexdigest()
    write_json(Path(str(PREFIX) + '-plan.json'), value)
    print(json.dumps(value, indent=2))
