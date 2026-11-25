#!/usr/bin/env bash
# Start the x01 desk (mainnet, live on, 50 symbols) when it is not running; idempotent, one instance (pidfile).
# Settings live in $CTS_HOME/state.bingx-x01.json (kept across container restarts); the key is read from
# $CTS_HOME/bingx.env (mode 600, never printed). It touches no setting, position or order itself.
set -u
CTS_HOME="${CTS_HOME:-/home/user/.cts}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID="$CTS_HOME/desk.pid"
[ -f "$CTS_HOME/bingx.env" ] || { echo "no $CTS_HOME/bingx.env: x01 desk not started"; exit 0; }
if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "x01 desk already running (pid $(cat "$PID"))"; exit 0; fi
if curl -s -m 3 -o /dev/null http://localhost:8080/; then echo "port 8080 is in use: x01 desk not started"; exit 0; fi
set -a; . "$CTS_HOME/bingx.env"; set +a
export MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_STATE="$CTS_HOME/state.json" CTS_CORE_SYMBOLS=50 \
  CTS_CORE_LIVE_CONN=bingx-x01 CTS_CORE_PRIMARY_CONN=bingx-x01 CTS_CORE_LIVE=1 CTS_CORE_CONNS=bingx-x01 CTS_CORE_WORKERS="${CTS_CORE_WORKERS:-3}"
cd "$REPO" || exit 0
setsid nohup npm run dev > "$CTS_HOME/desk.log" 2>&1 < /dev/null &
echo $! > "$PID"
echo "x01 desk started (pid $!, log $CTS_HOME/desk.log)"
