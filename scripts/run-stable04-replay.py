#!/usr/bin/env python3
"""Run the frozen session, refusing degraded memory fallback as a completed result."""
import datetime
import hashlib
import json
import os
import pathlib
import resource
import signal
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(out, staged_warmup=False):
    out.mkdir(parents=True, exist_ok=True)
    spill = out / 'spill'
    spill.mkdir(mode=0o700, exist_ok=True)
    feed, protocol = out / 'feed-causal.json', out / 'protocol.json'
    sealed = json.loads(protocol.read_text())
    expected_window = {
        'evaluationFromT': 1791925200000 if staged_warmup else 1792011600000,
        'tradeStartT': 1792011600000 if staged_warmup else 1792098000000,
        'endT': 1792184400000, 'preH': 24, 'runH': 48 if staged_warmup else 24,
    }
    if sealed.get('window') != expected_window:
        raise ValueError('Frozen protocol window does not match requested replay mode')
    if staged_warmup != ('targetWindow' in sealed.get('policy', {})):
        raise ValueError('Frozen protocol staged-warmup scope does not match requested replay mode')
    settings, wf = (out / 'settings.json').read_text(), (out / 'wf.json').read_text()
    args = ['node', '--experimental-strip-types', '--no-warnings', '--expose-gc', 'scripts/core-session.mjs',
            '--feed', str(feed), '--symbols', '12', '--pre', '24', '--run', '48' if staged_warmup else '24', '--end-at', '2026-10-16T21:00:00.000Z',
            '--evaluation-from', '2026-10-13T21:00:00.000Z' if staged_warmup else '2026-10-14T21:00:00.000Z', '--selection-hours', '24', '--replay-preload-all',
            '--max-wait-min', '165',
            '--settings', settings, '--toggles', json.dumps({'axis': True, 'block': True, 'exit': False}), '--wf', wf,
            '--frozen-session', str(protocol), '--chunk-allocations', '--no-archive',
            '--dump', str(out / 'raw.json'), '--html', str(out / 'report'), '--quiet', 'true']
    (out / 'command.json').write_text(json.dumps(args, indent=2) + '\n')
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith(('BINGX', 'BINANCE', 'BYBIT', 'OKX'))}
    env.update(CTS_CORE_STATE='off', CTS_CORE_AUTOSTART='0', CTS_CORE_LIVE='0', CTS_CORE_COMPARE='0', CTS_CORE_VARIANTS='0',
               CTS_CORE_WORKERS='2', CTS_CORE_HISTORY_MEMORY_MB='64', CTS_HISTORY_CACHE_MB='32', CTS_CORE_DERIVED_CACHE_MB='64',
               CTS_CORE_HISTORY_DIR=str(spill), TMPDIR=str(spill), CTS_CORE_MEM_RSS_SOFT_MB='6500', CTS_CORE_MEM_RSS_HARD_MB='7500',
               CTS_CORE_TAPE_MEMORY_TRACE='1', MALLOC_ARENA_MAX='2', MALLOC_MMAP_THRESHOLD_='1048576',
               NODE_OPTIONS='--max-old-space-size=5500 --require ' + str(ROOT / 'scripts/lib/core-test-offline-guard.cjs'))
    print(json.dumps({'historyCacheMiB': 32, 'historyResidentMiB': 64, 'derivedCacheMiB': 64,
                      'rssSoftMiB': 6500, 'rssHardMiB': 7500, 'workers': 2}), flush=True)
    start = time.monotonic()
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    reason = None
    with (out / 'run.log').open('w') as log, (out / 'memory.jsonl').open('w') as metrics:
        proc = subprocess.Popen(args, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        cursor = 0
        while proc.poll() is None:
            elapsed = time.monotonic() - start
            if elapsed > 190 * 60:
                reason = '190-minute safety timeout'
                os.killpg(proc.pid, signal.SIGTERM)
                break
            try:
                status = pathlib.Path(f'/proc/{proc.pid}/status').read_text()
                values = {line.split(':', 1)[0]: line.split(':', 1)[1].strip() for line in status.splitlines()
                          if line.startswith(('VmRSS:', 'VmHWM:', 'VmSwap:', 'Threads:'))}
                available = next(line.split(':', 1)[1].strip() for line in pathlib.Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
                metrics.write(json.dumps({'elapsed': round(elapsed, 1), **values, 'available': available}) + '\n')
                metrics.flush()
                with (out / 'run.log').open() as read_log:
                    read_log.seek(cursor)
                    new_log = read_log.read()
                    cursor = read_log.tell()
                if new_log:
                    print(new_log, end='', flush=True)
                if 'compute aborted' in new_log:
                    reason = 'memory guard aborted compute; incomplete fallback refused'
                    os.killpg(proc.pid, signal.SIGTERM)
                    break
            except (OSError, StopIteration):
                pass
            time.sleep(10)
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
        with (out / 'run.log').open() as read_log:
            read_log.seek(cursor)
            final_log = read_log.read()
            if final_log:
                print(final_log, end='', flush=True)
    # The process might exit between polls; inspect the final tail as well.
    if reason is None and 'compute aborted' in (out / 'run.log').read_text(errors='replace'):
        reason = 'memory guard aborted compute; incomplete fallback refused'
    complete_files = (out / 'raw.json').is_file() and (out / 'report/index.html').is_file() and (out / 'report/data.json').is_file()
    if proc.returncode == 0 and not complete_files:
        reason = 'session returned success without all expected result files'
    completion = {'exitCode': proc.returncode, 'reason': reason, 'complete': proc.returncode == 0 and reason is None and complete_files,
                  'elapsedSeconds': round(time.monotonic() - start, 2), 'peakChildRssKiB': resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,
                  'startedAt': started, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'sourceCommit': sealed['source']['checkpoint'], 'sourceSha256': sealed['source']['sha256'],
                  'feedSha256': hashlib.sha256(feed.read_bytes()).hexdigest(), 'account': 'offline; no exchange or live orders',
                  'dumpScope': 'ever seated or executed; rejected config tapes are not complete scalar audit evidence'}
    (out / 'completion.json').write_text(json.dumps(completion, indent=2) + '\n')
    print(json.dumps(completion), flush=True)
    return 0 if completion['complete'] else 1


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != '--staged-warmup'):
        raise SystemExit('usage: run-stable04-replay.py OUTPUT_DIR [--staged-warmup]')
    raise SystemExit(main(pathlib.Path(sys.argv[1]).resolve(), len(sys.argv) == 3))
