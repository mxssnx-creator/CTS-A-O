#!/bin/bash
# Graceful stop of the x01 desk: SIGUSR2 saves the state and closes nothing, then waits for the process to exit.
#   docs/live-coordination/x01-stop.sh
P=$(pgrep -f 'core-live-test.mjs --name x01 ')
[ -n "$P" ] || { echo "[x01-stop] no x01 desk process"; exit 0; }
kill -USR2 $P
for _ in $(seq 1 60); do
  pgrep -f 'core-live-test.mjs --name x01 ' >/dev/null || { echo "[x01-stop] stopped (state saved, nothing closed)"; exit 0; }
  sleep 1
done
echo "[x01-stop] the desk did not exit within 60 s"
exit 1
