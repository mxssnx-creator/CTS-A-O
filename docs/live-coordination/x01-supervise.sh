#!/usr/bin/env bash
# Idempotent supervisor for the x01 Signals eval.
#
#   docs/live-coordination/x01-supervise.sh [loss-pct] [symbols]   (loss-pct = % of the session's starting wallet; default 80)
#
# If the desk is alive, report and exit 0. If it is down, relaunch it — state continues from runs/x01-signals (the
# ownership ledger, the live record and the paper book are restored from the folder, so open positions are picked up,
# not reset). Run on a heartbeat (a scheduled trigger) so the desk comes back after the cloud container is reaped.
#
# The loss budget counts from each SESSION's start: a relaunch is a new session with its own 80 % of its starting wallet
# (src/core/loss-limit.ts sessionBaseline; the loss check in scripts/core-live-test.mjs). The stop at the limit is recorded
# (lossStopAt in runs/x01-signals/desk-start.json) for the record only; nothing reads it to decide a relaunch.
#
# The supervisor changes NO settings: the real-money guards and every positive coordination are whatever
# start-x01-signals.sh applies. It never force-kills or double-launches (start-x01-signals.sh refuses a second process on
# the tag). A HALT file stops relaunches until a person removes it: runs/x01-signals/HALT (written when the desk holds or
# orders something it does not own).
#
# Test hooks (no effect in production): CTS_SUPERVISE_PATTERN overrides the process pattern, CTS_SUPERVISE_LAUNCHER the
# launcher, CTS_SUPERVISE_DRY_RUN=1 prints the decision and exits without launching.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root
LOSS_PCT="${1:-80}"
SYMBOLS="${2:-60}"
PATTERN="${CTS_SUPERVISE_PATTERN:-[c]ore-live-test.mjs --name x01-signals }"
LAUNCHER="${CTS_SUPERVISE_LAUNCHER:-docs/live-coordination/start-x01-signals.sh}"
HALT_FILE="${CTS_SUPERVISE_HALT:-runs/x01-signals/HALT}"

if [ -f "$HALT_FILE" ]; then
  echo "$(date -u +%FT%TZ) x01-signals halted ($HALT_FILE present) — not relaunching: $(head -c 300 "$HALT_FILE")"
  exit 0
fi
PID=$(pgrep -f "$PATTERN" | head -1 || true)
if [ -n "$PID" ]; then
  echo "$(date -u +%FT%TZ) x01-signals alive (pid $PID)"
  exit 0
fi
if [ "${CTS_SUPERVISE_DRY_RUN:-0}" = "1" ]; then
  echo "$(date -u +%FT%TZ) x01-signals down — would relaunch (loss limit ${LOSS_PCT}% of the session's starting wallet, ${SYMBOLS} symbols)"
  exit 0
fi
echo "$(date -u +%FT%TZ) x01-signals down — relaunching (loss limit ${LOSS_PCT}% of the session's starting wallet, ${SYMBOLS} symbols)"
exec "$LAUNCHER" "$LOSS_PCT" "$SYMBOLS"
