#!/bin/bash
# Start the x01 signals-only desk on a host. REAL MONEY (BingX mainnet).
#
#   BINGX_API_KEY=... BINGX_API_SECRET=... docs/live-coordination/start-x01-signals.sh [--yes] [--dry-run]
#   docs/live-coordination/start-x01-signals.sh --yes --keys-file <credentials.txt> [--patch <patch.json>] [--hours N]
#
# - The keys come from the environment, or from --keys-file (read in this process only). They are never written to a file or printed.
# - It installs the reviewed patch (--patch; default x01-signals-only.patch.json, 50 pinned symbols) into the desk's data directory,
#   then starts the desk with launch.sh x01 (loss guard --max-loss 2 USDT, free-margin floor from the settings, order tag CTSV2X_).
# - --hours N ends the desk after N hours (a test run): on mainnet the end closes the desk's own positions and writes the final
#   report. 0 (the default) = no end.
# - Without --yes it asks you to type START. --dry-run prints what it would do and starts nothing (no keys needed).
# - The desk data lives in $CTS_DESK_DATA (default /var/lib/cts-a-o/desks), outside the checkout. A fresh data directory
#   starts with no recorded positions: positions an earlier x01 desk opened stay on the exchange, untracked by this one.
set -u
HERE="$(cd "$(dirname "$0")" && pwd -P)"
DATA="${CTS_DESK_DATA:-/var/lib/cts-a-o/desks}"
X01="$DATA/x01"
yes=0
dry=0
keys_file=""
patch="$HERE/x01-signals-only.patch.json"
hours=0
usage() { echo "usage: $0 [--yes] [--dry-run] [--keys-file <credentials.txt>] [--patch <patch.json>] [--hours N]"; exit 2; }
while [ $# -gt 0 ]; do
  case $1 in
    --yes) yes=1 ;;
    --dry-run) dry=1 ;;
    --keys-file) shift; keys_file="${1:-}" ;;
    --patch) shift; patch="${1:-}" ;;
    --hours) shift; hours="${1:-}" ;;
    *) usage ;;
  esac
  shift
done
say() { echo "[x01-signals] $*"; }

case $hours in
  '' | . | *[!0-9.]* | *.*.*) say "--hours takes a number of hours (0 = no end), not '$hours'"; exit 2 ;;
esac
# as the desk reads it ("0.0", "00", ".5" are numbers): 0 = no end. The desk's end timer overflows past ~596 h and would fire at
# once, so the test length stays at 500 h at most.
hours="$(awk -v h="$hours" 'BEGIN { printf "%g", h + 0 }')"
awk -v h="$hours" 'BEGIN { exit !(h <= 500) }' || { say "--hours above 500 is not supported (0 = no end)"; exit 2; }
for f in x01.settings.json launch.sh; do
  [ -f "$HERE/$f" ] || { say "missing $HERE/$f"; exit 1; }
done
[ -f "$patch" ] || { say "no such patch: $patch"; exit 1; }
command -v node >/dev/null || { say "node is not installed"; exit 1; }

if [ -n "$keys_file" ]; then
  # --keys-file: a text file with the two values after the labels "API Key" and "Secret Key"; read here, exported to the desk's
  # environment only, never printed (the command line then carries a path, not the keys)
  [ -f "$keys_file" ] || { say "no such file: $keys_file"; exit 1; }
  BINGX_API_KEY="$(node -e '
const l = require("fs").readFileSync(process.argv[1], "utf8").split("\n").map((x) => x.trim());
const at = l.findIndex((x) => x.toLowerCase().startsWith("api key"));
process.stdout.write(at < 0 ? "" : (l.slice(at + 1).find((x) => /^[A-Za-z0-9]{40,}$/.test(x)) || ""));
' "$keys_file")"
  BINGX_API_SECRET="$(node -e '
const l = require("fs").readFileSync(process.argv[1], "utf8").split("\n").map((x) => x.trim());
const at = l.findIndex((x) => x.toLowerCase().startsWith("secret key"));
process.stdout.write(at < 0 ? "" : (l.slice(at + 1).find((x) => /^[A-Za-z0-9]{40,}$/.test(x)) || ""));
' "$keys_file")"
  export BINGX_API_KEY BINGX_API_SECRET
fi
if [ "$dry" = 0 ]; then
  if [ -z "${BINGX_API_KEY:-}" ] || [ -z "${BINGX_API_SECRET:-}" ]; then
    say "set BINGX_API_KEY and BINGX_API_SECRET (the x01 account's keys) in the environment first"
    exit 1
  fi
fi

say "patch to install ($patch):"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const s = p.settings || {};
const on = Object.entries(s.toggles || {}).filter(([, v]) => v).map(([k]) => k);
const live = s.live || {};
console.log("  symbols            ", s.symbols, "(" + (s.forceSymbols || []).length + " pinned)");
console.log("  engine types on    ", on.length ? on.join(", ") : "none (signals only)");
console.log("  signals enabled    ", !!(s.signals && s.signals.enabled), " max positions", s.signals && s.signals.maxPositions !== undefined ? s.signals.maxPositions : "unchanged");
console.log("  confirmation       ", p.wf && p.wf.coord ? (p.wf.coord.confirm ? "on" : "off") : "unchanged");
console.log("  volume factor      ", live.ratio !== undefined ? live.ratio : "unchanged");
console.log("  opening            ", live.openPaused === false ? "on (clears a saved pause)" : live.openPaused ? "paused: " + live.openPaused : "unchanged (the seed pauses it)");
' "$patch" || { say "the patch is not valid JSON"; exit 1; }
say "run length: $([ "$hours" = 0 ] && echo "no end" || echo "$hours h, then the desk closes its own positions and stops")"
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

# a running x01 desk re-reads patch.json every 30 s: its patch is never swapped from here (launch.sh would refuse the start anyway,
# after the copy)
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name x01 "; then
  say "an x01 desk is already running: stop it first (x01-stop.sh); its patch is left as it is"
  exit 1
fi
mkdir -p "$X01" || { say "cannot create $X01"; exit 1; }
chmod 700 "$DATA" "$X01" 2>/dev/null || true
[ -f "$X01/x01.json" ] || cp "$HERE/x01.settings.json" "$X01/x01.json"
if [ -f "$X01/patch.json" ] && ! cmp -s "$patch" "$X01/patch.json"; then
  cp "$X01/patch.json" "$X01/patch.json.prev.$(date -u +%Y%m%dT%H%M%SZ)"
fi
cp "$patch" "$X01/patch.json"

CTS_DESK_DATA="$DATA" X01_HOURS="$hours" "$HERE/launch.sh" x01
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
say "stop it and close its own positions: kill -TERM \$(pgrep -f 'core-live-test.mjs --name x01 ')"
