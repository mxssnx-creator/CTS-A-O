#!/usr/bin/env bash
# x01 (BingX MAINNET, real money): the 20 most volatile symbols (1 h), minimum volume (positionSize "min", ratio 1),
# code-default gates, tracking tag CTSAO_ (operator, 12 Nov 2026). Credentials are NOT in the repository:
# they are read from an env file (default /home/user/.cts/bingx.env, mode 600) with BINGX_X01_API_KEY / BINGX_X01_SECRET.
#
#   docs/live-coordination/start-x01-20-minvol.sh [loss-pct] [symbols]            (defaults: 80, 20)
#
# Signals are OFF by default here (CTS_X01_SIGNALS=true turns them on): with the default Signal source matrix on 20 symbols the
# first compute held 8 GB native memory and sat at "48h sim step 0/49" for more than 10 minutes (12 Nov); the gates stay code defaults.
# The loss limit is a share of the wallet at this SESSION's start (src/core/loss-limit.ts). The overall-system readiness
# check is waived as in start-x01-signals.sh (operator's choice); the last-N floors are NOT waived.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
LOSS_PCT="${1:-80}"; SYMBOLS="${2:-20}"
ENV_FILE="${CTS_CREDENTIALS_FILE:-/home/user/.cts/bingx.env}"
[ -r "$ENV_FILE" ] || { echo "missing $ENV_FILE (BINGX_X01_API_KEY / BINGX_X01_SECRET)"; exit 1; }
set -a; . "$ENV_FILE"; set +a
: "${BINGX_X01_API_KEY:?}"; : "${BINGX_X01_SECRET:?}"
OUT=runs/x01-20
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name x01-20 "; then echo "x01-20 is already running"; exit 1; fi
mkdir -p "$OUT"
cat > "$OUT/settings.json" <<JSON
{ "symbols": $SYMBOLS, "symbolRank": "volatility1h", "mainTop": 100,
  "signals": { "enabled": ${CTS_X01_SIGNALS:-false} },
  "live": { "positionSize": "min", "ratio": 1, "maxPositions": 100, "leverage": "max" } }
JSON
export CTS_CORE_LIVE_TAG=CTSAO_ CTS_CORE_MAINNET_WAIVE_READY=1
export CTS_BINGX_BAN_FILE="$OUT/bingx-ban" CTS_BINGX_BOOK_FILE="$OUT/bingx-book"
export MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_STALL_PROBE=1 CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-2}"
echo "$(date -u +%FT%TZ) starting x01-20: MAINNET, tag CTSAO_, $SYMBOLS symbols, loss limit ${LOSS_PCT}% of the session wallet" | tee -a "$OUT/launches.txt"
nohup setsid node --max-old-space-size=4096 --expose-gc --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
  --name x01-20 --conn bingx-x01 --mainnet yes --max-loss 0 --max-loss-pct "$LOSS_PCT" \
  --settings "$OUT/settings.json" --symbols "$SYMBOLS" --notional 1 --hours 0 --every 5 --out "$OUT" >> "$OUT/x01-20.log" 2>&1 &
echo "pid $! (log $OUT/x01-20.log, status $OUT/status.json)" | tee -a "$OUT/launches.txt"
