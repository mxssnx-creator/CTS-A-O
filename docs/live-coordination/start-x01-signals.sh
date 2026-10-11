#!/usr/bin/env bash
# Start the x01 SIGNALS eval live on BingX mainnet (bingx-x01).
#
#   docs/live-coordination/start-x01-signals.sh [loss-pct] [symbols]
#
# Defaults: loss limit 80 % of the wallet balance (dynamic — re-read every check, so it follows the account),
# 50 symbols. --hours 0 = no end time (stop with x01-stop.sh, or SIGTERM). Pass a loss-pct of 0 only together
# with a code change to use a fixed USDT limit; this launcher is percentage-based by operator choice (11 Oct).
#
# Independent eval desk with its own tracking tag (CTSX01S_). It never shares a tag with another desk — a shared
# tag's shutdown would close the other desk's positions. Signals on (count 0 = every validated signal active),
# Block off, and every good-PF positive coordination stays on (docs/live-coordination/signals.patch.json,
# docs/positive-coordinations.md): signal confirmation, acceptance, direction acceptance, own base, vol floor,
# and engine direction acceptance (the Rally / Falling type-direction coordination).
#
# The OVERALL-SYSTEM readiness check is waived here (CTS_CORE_MAINNET_WAIVE_READY=1) — the operator's explicit
# choice — so the eval trades on its own validation (its own Base eval, acceptance, direction acceptance,
# confirmation and last-N floors). The loss limit and the free-margin floor stay. The last-N floors are NOT
# waived (that needs CTS_CORE_MAINNET_WAIVE_FLOORS=1, which this launcher does not set).
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root

LOSS_PCT="${1:-80}"
SYMBOLS="${2:-60}"
TAG=CTSX01S_
OUT=runs/x01-signals
PATCH=docs/live-coordination/signals.patch.json

# x01 is mainnet and only ever uses its own key slot; map the account key into it (as run.sh / launch.sh do).
: "${BINGX_API_KEY:?set BINGX_API_KEY (the mainnet account key)}"
: "${BINGX_API_SECRET:?set BINGX_API_SECRET}"
export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET"

# one desk per tag: never a second process on the same tag (its shutdown would close the other's positions).
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name x01-signals "; then
  echo "x01-signals is already running — stop it first (docs/live-coordination/x01-stop.sh)"
  exit 1
fi

mkdir -p "$OUT"
export CTS_CORE_LIVE_TAG="$TAG"
export CTS_CORE_MAINNET_WAIVE_READY=1 # operator's explicit waiver of the overall-system readiness check
export CTS_BINGX_BAN_FILE="$OUT/bingx-ban" CTS_BINGX_BOOK_FILE="$OUT/bingx-book"
export MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576
HEAP="${CTS_X01_HEAP_MB:-4096}"
export NODE_OPTIONS="--max-old-space-size=$HEAP"
export CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-1}"

echo "$(date -u +%FT%TZ) starting x01-signals: tag $TAG, mainnet, $SYMBOLS symbols, loss limit ${LOSS_PCT}% of wallet (dynamic), readiness WAIVED, floors kept"
nohup node --max-old-space-size="$HEAP" --expose-gc --experimental-strip-types --no-warnings \
  scripts/core-live-test.mjs \
  --name x01-signals --conn bingx-x01 --mainnet yes --max-loss 0 --max-loss-pct "$LOSS_PCT" \
  --symbols "$SYMBOLS" --notional 1 --hours 0 --every 5 \
  --patch-file "$PATCH" --out "$OUT" >>"$OUT/x01-signals.log" 2>&1 &
echo "$(date -u +%FT%TZ) started x01-signals pid $! (log: $OUT/x01-signals.log; status: $OUT/status.json)"
echo "watch it:  docs/live-coordination/x01-status.sh    stop it:  docs/live-coordination/x01-stop.sh"
