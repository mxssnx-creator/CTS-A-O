#!/bin/bash
# One-screen status of the x01 desk. Read-only on the desk's own files; no exchange call.
#   CTS_DESK_DATA=/var/lib/cts-a-o/desks docs/live-coordination/x01-status.sh [--watch]
DATA="${CTS_DESK_DATA:-/var/lib/cts-a-o/desks}"
F="$DATA/x01/live-x01/status.json"
show() {
  [ -f "$F" ] || { echo "[x01-status] no status file yet: $F"; return 1; }
  node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const age = Math.round((Date.now() - Date.parse(s.at)) / 1000);
console.log("[x01-status] at", s.at, "(" + age + " s ago)", "pid", s.pid, "final", s.final, age > 120 && !s.final ? "  <-- STALE: the desk may have stopped" : "");
console.log("  symbols", Array.isArray(s.symbols) ? s.symbols.length : "-", " open positions", s.openPositions, " orders", JSON.stringify(s.orders).slice(0, 80));
console.log("  loss check", JSON.stringify(s.lossCheck).slice(0, 120), " max loss", s.maxLoss);
console.log("  mem", JSON.stringify(s.mem).slice(0, 100), " exchange calls", s.exchangeCalls, " bans", JSON.stringify(s.exchangeBans).slice(0, 60));
console.log("  last compute", s.lastComputeAt, " gate", JSON.stringify(s.gate).slice(0, 100));
' "$F" || return 1
  if pgrep -f 'core-live-test.mjs --name x01 ' >/dev/null; then echo "  process: running"; else echo "  process: NOT running"; fi
}
if [ "${1:-}" = "--watch" ]; then
  while true; do show; echo; sleep 300; done
else
  show
fi
