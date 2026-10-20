#!/usr/bin/env bash
# Idempotent supervisor for the x01 Signals eval.
#
#   docs/live-coordination/x01-supervise.sh [loss-pct|auto] [symbols|auto]   (loss-pct = % of the session's starting wallet)
#
# Omitted or "auto" = the ACTIVE run's values: from the running desk's command line while it is alive, else from the last launch
# (runs/x01-signals/launch.json, written by start-x01-signals.sh), else the old defaults (80 % / 60 symbols). A number wins.
# The heap of the last launch is passed on (CTS_X01_HEAP_MB) unless it is already set.
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
# the tag). A HALT file stops relaunches until a person removes it: runs/x01-signals/HALT, written by the desk
# (scripts/core-live-test.mjs, its loss check every minute; scripts/lib/ownership-halt.mjs) when an own-tagged fill took
# more out of a symbol and side than the desk held there (it closed or reduced a position that is not its own).
#
# Test hooks (no effect in production): CTS_SUPERVISE_PATTERN overrides the process pattern, CTS_SUPERVISE_LAUNCHER the
# launcher, CTS_SUPERVISE_DRY_RUN=1 prints the decision and exits without launching.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root
OUT="${CTS_SUPERVISE_OUT:-runs/x01-signals}"
LAUNCH_FILE="$OUT/launch.json"
PATTERN="${CTS_SUPERVISE_PATTERN:-[c]ore-live-test.mjs --name x01-signals }"
LAUNCHER="${CTS_SUPERVISE_LAUNCHER:-docs/live-coordination/start-x01-signals.sh}"
HALT_FILE="${CTS_SUPERVISE_HALT:-$OUT/HALT}"

# a number from launch.json (one-line JSON written by the launcher): jfield <name>
jfield() { [ -f "$LAUNCH_FILE" ] && grep -o "\"$1\": *[0-9.]*" "$LAUNCH_FILE" | head -1 | grep -o '[0-9.]*$' || true; }
# a value of a "--flag value" pair on the running desk's command line: cmdarg <pid> <flag>
cmdarg() { [ -r "/proc/$1/cmdline" ] && tr '\0' '\n' < "/proc/$1/cmdline" | awk -v f="$2" '$0==f{getline; print; exit}' || true; }

PID=$(pgrep -f "$PATTERN" | head -1 || true)
LOSS_PCT="${1:-auto}"
SYMBOLS="${2:-auto}"
LOSS_FROM="argument"
SYM_FROM="argument"
if [ "$LOSS_PCT" = auto ]; then
  V=""; [ -n "$PID" ] && V=$(cmdarg "$PID" --max-loss-pct) && LOSS_FROM="running desk"
  if [ -z "$V" ]; then V=$(jfield lossPct); LOSS_FROM="launch.json"; fi
  if [ -z "$V" ]; then V=80; LOSS_FROM="default"; fi
  LOSS_PCT="$V"
fi
if [ "$SYMBOLS" = auto ]; then
  V=""; [ -n "$PID" ] && V=$(cmdarg "$PID" --symbols) && SYM_FROM="running desk"
  if [ -z "$V" ]; then V=$(jfield symbols); SYM_FROM="launch.json"; fi
  if [ -z "$V" ]; then V=60; SYM_FROM="default"; fi
  SYMBOLS="$V"
fi
WHAT="loss limit ${LOSS_PCT}% [${LOSS_FROM}], ${SYMBOLS} symbols [${SYM_FROM}]"

if [ -f "$HALT_FILE" ]; then
  echo "$(date -u +%FT%TZ) x01-signals halted ($HALT_FILE present) — not relaunching: $(head -c 300 "$HALT_FILE")"
  exit 0
fi
if [ -n "$PID" ]; then
  echo "$(date -u +%FT%TZ) x01-signals alive (pid $PID; $WHAT)"
  exit 0
fi
if [ -z "${CTS_X01_HEAP_MB:-}" ]; then
  H=$(jfield heapMb)
  [ -n "$H" ] && export CTS_X01_HEAP_MB="$H"
fi
if [ "${CTS_SUPERVISE_DRY_RUN:-0}" = "1" ]; then
  echo "$(date -u +%FT%TZ) x01-signals down — would relaunch ($WHAT, heap ${CTS_X01_HEAP_MB:-default} MB)"
  exit 0
fi
echo "$(date -u +%FT%TZ) x01-signals down — relaunching ($WHAT, heap ${CTS_X01_HEAP_MB:-default} MB)"
exec "$LAUNCHER" "$LOSS_PCT" "$SYMBOLS"
