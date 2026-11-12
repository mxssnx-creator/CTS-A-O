#!/usr/bin/env bash
# x02 (BingX VST demo) desk: Micro + Low-Range only, tracking tag CTSAO_ (operator, 11 Nov 2026).
#
#   docs/live-coordination/start-x02-micro-low-range.sh [symbols] [heap-mb] [probe]     (defaults: 50, 4096, 0)
#
# Demo money only (conn bingx-vst-02). probe N > 0: the best N configs of each range trade even when they fail the
# gates (demo connections only) — used to exercise the exchange path; such orders are not gate-qualified results.
# Restart keeping positions: kill -USR2 <pid>, then run this script again (same tag, same folder).
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
SYMBOLS="${1:-50}"; HEAP="${2:-4096}"; PROBE="${3:-0}"
OUT=runs/x02-ao
: "${BINGX_API_KEY:?set BINGX_API_KEY}"; : "${BINGX_API_SECRET:?set BINGX_API_SECRET}"
export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name x02-ao "; then echo "x02-ao is already running"; exit 1; fi
mkdir -p "$OUT"
node --experimental-strip-types --no-warnings docs/live-coordination/x02-micro-low-range.build.mjs "$OUT/settings.json" "$SYMBOLS"
export CTS_CORE_LIVE_TAG=CTSAO_ CTS_BINGX_BAN_FILE="$OUT/bingx-ban" CTS_BINGX_BOOK_FILE="$OUT/bingx-book"
export MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_STALL_PROBE=1 CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-4}"
echo "$(date -u +%FT%TZ) starting x02-ao: tag CTSAO_, VST demo, $SYMBOLS symbols, heap $HEAP MB, probe $PROBE" | tee -a "$OUT/launches.txt"
nohup setsid node --max-old-space-size="$HEAP" --expose-gc --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
  --name x02-ao --conn bingx-vst-02 --settings "$OUT/settings.json" --symbols "$SYMBOLS" --notional 6 \
  --hours 0 --every 5 --max-loss 0 --probe "$PROBE" --patch-file "$OUT/patch.json" --out "$OUT" >> "$OUT/x02-ao.out" 2>&1 &
echo "pid $! (log $OUT/x02-ao.out, status $OUT/status.json)" | tee -a "$OUT/launches.txt"
