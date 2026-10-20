#!/bin/sh
set -eu
APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$APP_ROOT"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# :8081 is QA-only — a revive must never inherit a stale built-output preview.
node scripts/preview.mjs stop || true
# Use the memory limit for this workspace when it is tighter than host RAM. `max` means no cgroup v2 limit.
MEM_KB=$(awk '/MemTotal/{print $2; exit}' /proc/meminfo)
CGROUP_MEM_KB=
CGROUP_MEM_BYTES=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || true)
case "$CGROUP_MEM_BYTES" in
  ''|max|*[!0-9]*) ;;
  *) CGROUP_MEM_KB=$((CGROUP_MEM_BYTES / 1024)) ;;
esac
if [ -z "$CGROUP_MEM_KB" ] && [ -r /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
  CGROUP_MEM_BYTES=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
  case "$CGROUP_MEM_BYTES" in
    ''|*[!0-9]*) ;;
    *) CGROUP_MEM_KB=$((CGROUP_MEM_BYTES / 1024)) ;;
  esac
fi
if [ -n "$CGROUP_MEM_KB" ] && [ "$CGROUP_MEM_KB" -gt 0 ] && [ "$CGROUP_MEM_KB" -lt "$MEM_KB" ]; then
  MEM_KB=$CGROUP_MEM_KB
fi
CPU_COUNT=$(node -p 'require("node:os").availableParallelism()')
MEM_MB=$((MEM_KB / 1024))
HEAP_PERCENT_MB=$((MEM_MB * 85 / 100))
HEAP_HEADROOM_MB=$((MEM_MB - 256 - 128 * CPU_COUNT))
HEAP_MB=$HEAP_PERCENT_MB
[ "$HEAP_HEADROOM_MB" -lt "$HEAP_MB" ] && HEAP_MB=$HEAP_HEADROOM_MB
[ "$HEAP_MB" -lt 256 ] && HEAP_MB=256
echo "local server resources: memory ${MEM_MB} MB, V8 heap ${HEAP_MB} MB, ${CPU_COUNT} compute workers" >>/tmp/app-startup.log
nohup env \
  MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 \
  "NODE_OPTIONS=${NODE_OPTIONS:+$NODE_OPTIONS }--require=${APP_ROOT}/scripts/lib/safe-network-interfaces.cjs --max-old-space-size=${HEAP_MB}" \
  CTS_CORE_WORKERS="$CPU_COUNT" UV_THREADPOOL_SIZE="$CPU_COUNT" \
  CTS_CORE_STATE=off CTS_CORE_SNAPSHOT= CTS_CORE_MARKET=synthetic CTS_CORE_AUTOSTART=0 CTS_CORE_LIVE=0 \
  CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 \
  CTS_CORE_TEST_SETTINGS='{"symbols":2,"historyDays":18,"tfDays":{"1":3,"5":6,"15":18,"30":18},"mainTop":8,"refineTop":3,"evalTop":5,"gates":{"minPf":1.05,"minTrades":3,"maxDdr":0}}' \
  npm run dev >>/tmp/app-startup.log 2>&1 </dev/null &
