#!/bin/bash
# Start the x01 signals-only desk (50 pinned symbols) on a host. REAL MONEY (BingX mainnet).
#
#   BINGX_API_KEY=... BINGX_API_SECRET=... docs/live-coordination/start-x01-signals.sh [--yes] [--dry-run]
#
# - The keys come from the environment only. Nothing is read from a file, written to a file or printed.
# - It installs the reviewed patch (x01-signals-only.patch.json) into the desk's data directory, then starts the desk with
#   launch.sh x01 (loss guard --max-loss 2 USDT, free-margin floor from the settings, order tag CTSV2X_).
# - Without --yes it asks you to type START. --dry-run prints what it would do and starts nothing (no keys needed).
# - The desk data lives in $CTS_DESK_DATA (default /var/lib/cts-a-o/desks), outside the checkout. A fresh data directory
#   starts with no recorded positions: positions an earlier x01 desk opened stay on the exchange, untracked by this one.
set -u
HERE="$(cd "$(dirname "$0")" && pwd -P)"
DATA="${CTS_DESK_DATA:-/var/lib/cts-a-o/desks}"
X01="$DATA/x01"
yes=0
dry=0
for a in "$@"; do
  case $a in
    --yes) yes=1 ;;
    --dry-run) dry=1 ;;
    *) echo "usage: $0 [--yes] [--dry-run]"; exit 2 ;;
  esac
done
say() { echo "[x01-signals] $*"; }

for f in x01.settings.json x01-signals-only.patch.json launch.sh; do
  [ -f "$HERE/$f" ] || { say "missing $HERE/$f"; exit 1; }
done
command -v node >/dev/null || { say "node is not installed"; exit 1; }

if [ "$dry" = 0 ]; then
  if [ -z "${BINGX_API_KEY:-}" ] || [ -z "${BINGX_API_SECRET:-}" ]; then
    say "set BINGX_API_KEY and BINGX_API_SECRET (the x01 account's keys) in the environment first"
    exit 1
  fi
fi

say "patch to install ($HERE/x01-signals-only.patch.json):"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const s = p.settings || {};
const on = Object.entries(s.toggles || {}).filter(([, v]) => v).map(([k]) => k);
console.log("  symbols            ", s.symbols, "(" + (s.forceSymbols || []).length + " pinned)");
console.log("  engine types on    ", on.length ? on.join(", ") : "none (signals only)");
console.log("  signals enabled    ", !!(s.signals && s.signals.enabled));
console.log("  confirmation       ", p.wf && p.wf.coord ? (p.wf.coord.confirm ? "on" : "off") : "unchanged");
console.log("  paused             ", !!p.paused);
' "$HERE/x01-signals-only.patch.json" || { say "the patch is not valid JSON"; exit 1; }
say "data directory: $X01"
say "this starts a REAL-MONEY desk on the account of the keys in BINGX_API_KEY / BINGX_API_SECRET"

if [ "$dry" = 1 ]; then
  say "dry run: would create $X01, copy x01.settings.json -> x01.json (if absent) and the patch -> patch.json, then run launch.sh x01. Nothing started."
  exit 0
fi

if [ "$yes" = 0 ]; then
  printf "[x01-signals] type START to start the desk: "
  read -r ans
  [ "$ans" = "START" ] || { say "not started"; exit 1; }
fi

mkdir -p "$X01" || { say "cannot create $X01"; exit 1; }
chmod 700 "$DATA" "$X01" 2>/dev/null || true
[ -f "$X01/x01.json" ] || cp "$HERE/x01.settings.json" "$X01/x01.json"
if [ -f "$X01/patch.json" ] && ! cmp -s "$HERE/x01-signals-only.patch.json" "$X01/patch.json"; then
  cp "$X01/patch.json" "$X01/patch.json.prev.$(date -u +%Y%m%dT%H%M%SZ)"
fi
cp "$HERE/x01-signals-only.patch.json" "$X01/patch.json"

CTS_DESK_DATA="$DATA" "$HERE/launch.sh" x01
rc=$?
[ "$rc" = 0 ] || { say "launch.sh x01 failed ($rc)"; exit "$rc"; }

say "started; waiting for the first status (up to 180 s) ..."
OUT="$X01/live-x01/status.json"
for _ in $(seq 1 36); do
  [ -f "$OUT" ] && break
  sleep 5
done
CTS_DESK_DATA="$DATA" "$HERE/x01-status.sh" || true
say "watch it with: CTS_DESK_DATA=$DATA $HERE/x01-status.sh --watch"
say "stop it gracefully (state saved, nothing closed): kill -USR2 \$(pgrep -f 'core-live-test.mjs --name x01 ')"
