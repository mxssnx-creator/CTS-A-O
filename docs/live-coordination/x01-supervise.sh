#!/usr/bin/env bash
# Idempotent supervisor for the x01 Signals eval.
#
#   docs/live-coordination/x01-supervise.sh [loss-pct] [symbols]   (loss-pct = % of wallet, dynamic; default 80)
#
# If the desk is alive, report and exit 0. If it is down, relaunch it — state continues from runs/x01-signals
# (the ownership ledger, the live record and the loss baseline are restored from the folder, so the loss limit
# and any open positions are picked up, not reset). Meant to run on a heartbeat (a scheduled trigger, or a
# session keep-alive) so the desk comes back after the cloud container reaps it on idle.
#
# The supervisor changes NO settings: the real-money guards (loss limit, free-margin floor, last-N floors) and
# every positive coordination are whatever start-x01-signals.sh applies. It never force-kills or double-launches
# (start-x01-signals.sh refuses a second process on the tag).
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root
LOSS_PCT="${1:-80}"
SYMBOLS="${2:-50}"

PID=$(pgrep -f 'core-live-test.mjs --name x01-signals ' | head -1 || true)
if [ -n "$PID" ]; then
  echo "$(date -u +%FT%TZ) x01-signals alive (pid $PID)"
  exit 0
fi
echo "$(date -u +%FT%TZ) x01-signals down — relaunching (loss limit ${LOSS_PCT}% of wallet, ${SYMBOLS} symbols)"
exec docs/live-coordination/start-x01-signals.sh "$LOSS_PCT" "$SYMBOLS"
