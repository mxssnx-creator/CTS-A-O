#!/usr/bin/env bash
# Status of the x01 SIGNALS eval: whether it is running, its status.json (loss check, own net, loss limit) and
# the tail of its log.  Read-only.
#
#   docs/live-coordination/x01-status.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root
OUT=runs/x01-signals

P=$(pgrep -f '[c]ore-live-test.mjs --name x01-signals ' || true)
if [ -n "$P" ]; then
  echo "x01-signals: RUNNING (pid $P)"
else
  echo "x01-signals: NOT running"
fi

if [ -f "$OUT/status.json" ]; then
  echo "--- $OUT/status.json ---"
  cat "$OUT/status.json"
else
  echo "(no status.json yet in $OUT — the first report is written a few minutes in)"
fi

echo "--- last 25 log lines ($OUT/x01-signals.log) ---"
if [ -f "$OUT/x01-signals.log" ]; then
  tail -25 "$OUT/x01-signals.log"
else
  echo "(no log yet)"
fi
