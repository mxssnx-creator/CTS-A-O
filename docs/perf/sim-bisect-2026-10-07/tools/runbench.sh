#!/bin/bash
# usage: runbench.sh <sha> [prof]
s=$1; wt=/tmp/wt-$s; mkdir -p /tmp/run-$s /tmp/prof-$s; cd $wt
P=""; [ "$2" = prof ] && P="--cpu-prof --cpu-prof-dir=/tmp/prof-$s --import /tmp/wp/preload.mjs"; export WORKER_PROF_DIR=/tmp/prof-$s
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3 /usr/bin/time -v node --max-old-space-size=7168 --expose-gc --experimental-strip-types --no-warnings $P scripts/core-session.mjs --symbols 30 --pre 24 --run 24 --focus all --desk /tmp/bench-desk.json --max-wait-min 300 --end-at 2026-10-06T15:00:00Z --out /tmp/run-$s/session --html /tmp/run-$s/html --writeup /tmp/run-$s/writeup.md --dump /tmp/run-$s/raw.json > /tmp/run-$s/log.txt 2>&1
echo "exit $?" > /tmp/run-$s/done
