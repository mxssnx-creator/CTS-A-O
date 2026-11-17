#!/usr/bin/env bash
# x01 (BingX MAINNET, real money): 80 symbols, memory-bounded. Wrapper around start-x01-20-minvol.sh (operator approval 17 Nov 2026).
#
#   docs/live-coordination/start-x01-80.sh [loss-pct]                 (default 80)
#
# Needs /home/user/.cts/bingx.env (BINGX_X01_API_KEY / BINGX_X01_SECRET, mode 600) on a host that stays up: an open
# position must not be orphaned by a container restart. Signals are ON with the code-default cadence gate (a source needs
# an average of 2 raw onsets per day over the 7 preceding days, tactics.signalMinDaily) - that gate removes quiet sources
# before any protection simulation, which is the main Signal work reduction at 80 symbols. Memory: bounded decoded-history
# cache, two compute workers, and a 6 GB heap; watch runs/x01-20/status.json and the log's "rss" / "available" fields in the
# first compute (Base, Tapes, Signals, Real) and stop with SIGTERM if available memory falls under 2 GB.
set -Eeuo pipefail
export CTS_X01_SIGNALS=true
export CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-2}"
export CTS_CORE_HISTORY_CACHE_MB="${CTS_CORE_HISTORY_CACHE_MB:-256}"
# Each compute worker may hold up to CTS_CORE_WORKER_HEAP_MB of V8 heap (default 2048) plus its transferred tapes. With
# 3-4 workers that, not the history cache, drove native memory to 10 GB on 80 symbols and made the guard abort and
# restart the compute at 80 %. A 1.25 GB heap per worker keeps the pool inside the host, and returning freed arenas to the
# OS early (trim threshold 128 KiB) stops freed tape buffers from staying resident between phases.
export CTS_CORE_WORKER_HEAP_MB="${CTS_CORE_WORKER_HEAP_MB:-1280}"
export MALLOC_TRIM_THRESHOLD_="${MALLOC_TRIM_THRESHOLD_:-131072}"
exec "$(dirname "${BASH_SOURCE[0]}")/start-x01-20-minvol.sh" "${1:-80}" "${CTS_X01_SYMBOLS:-80}"
