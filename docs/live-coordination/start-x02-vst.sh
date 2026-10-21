#!/usr/bin/env bash
# Start the x02 desk on the BingX VST (demo) connection with ALL indications and strategy types.
#
#   docs/live-coordination/start-x02-vst.sh [symbols] [heap-mb]      (defaults: 12 symbols, 3072 MB heap)
#
# Demo money only (conn bingx-vst-02, no --mainnet): its own tag (CTSV2X_), its own ban/book files and out folder, so it never
# shares a tag or a rate-limit file with the live x01 desk (CTSX01S_). It shares the HOST with x01: the heap is capped and the
# process refuses to start below 6 GB available memory.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root
SYMBOLS="${1:-12}"
HEAP="${2:-3072}"
OUT=runs/x02
: "${BINGX_API_KEY:?set BINGX_API_KEY}"
: "${BINGX_API_SECRET:?set BINGX_API_SECRET}"
export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name x02-vst "; then
  echo "x02-vst is already running"; exit 1
fi
AVAIL=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
if [ "$AVAIL" -lt 6000 ]; then echo "only ${AVAIL} MB available (< 6000): not starting x02 next to the live x01 desk"; exit 1; fi
mkdir -p "$OUT"
export CTS_CORE_LIVE_TAG=CTSV2X_ CTS_BINGX_BAN_FILE="$OUT/bingx-ban" CTS_BINGX_BOOK_FILE="$OUT/bingx-book"
export MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_STALL_PROBE=1 CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-3}"
printf '{"symbols": %s, "heapMb": %s, "at": "%s"}\n' "$SYMBOLS" "$HEAP" "$(date -u +%FT%TZ)" > "$OUT/launch.json"
echo "$(date -u +%FT%TZ) starting x02-vst: tag CTSV2X_, VST demo, $SYMBOLS symbols, heap $HEAP MB"
nohup node --max-old-space-size="$HEAP" --expose-gc --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
  --name x02-vst --conn bingx-vst-02 --settings docs/live-coordination/x02.settings.json --symbols "$SYMBOLS" --notional 1 \
  --hours 0 --every 5 --max-loss 0 --patch-file docs/live-coordination/x02.patch.json --out "$OUT" >> "$OUT/x02-vst.log" 2>&1 &
echo "$(date -u +%FT%TZ) started x02-vst pid $! (log: $OUT/x02-vst.log; status: $OUT/status.json)"
