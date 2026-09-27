#!/bin/sh
set -eu
cd /workspace
if [ -r /tmp/cts-ssh/id_kex ] && [ ! -r /root/.ssh/id_cts_a ]; then
  install -m 600 /tmp/cts-ssh/id_kex /root/.ssh/id_cts_a
fi
# :8081 is QA-only — a revive must never inherit a stale built-output preview.
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# the whole machine: V8 heap = three quarters of RAM, one worker per core
HEAP_MB=$(awk '/MemTotal/{print int($2*3/4/1024)}' /proc/meminfo)
MALLOC_ARENA_MAX=2 NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" CTS_CORE_WORKERS="$(nproc)" \
  npm run dev >>/tmp/app-startup.log 2>&1 &
