#!/usr/bin/env bash
# Stop the x01 SIGNALS eval gracefully (SIGTERM): the control stops, the desk's own tagged positions are closed
# (never another system's), and state + snapshot are saved.  To stop WITHOUT closing positions (each keeps its
# exchange stop and a relaunch picks them up), send SIGUSR2 instead — see core-live-test.mjs.
#
#   docs/live-coordination/x01-stop.sh
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." # repo root

P=$(pgrep -f 'core-live-test.mjs --name x01-signals ' || true)
if [ -z "$P" ]; then
  echo "x01-signals: not running"
  exit 0
fi
echo "stopping x01-signals (pid $P): SIGTERM — control stops, own positions closed, state saved"
kill -TERM $P
for _ in $(seq 1 60); do
  if ! ps -p "$P" >/dev/null 2>&1; then
    echo "x01-signals: stopped"
    exit 0
  fi
  sleep 1
done
echo "x01-signals: did not exit within 60 s (pid $P still up)"
exit 1
