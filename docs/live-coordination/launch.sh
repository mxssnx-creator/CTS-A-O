#!/bin/bash
# Launch one desk: launch.sh twin | x01 | losstest | restart <desk>
#
# The desk runs the code of this checkout (the project directory, found from this script's own location), so it runs
# what is committed here. Its data lives on the server, outside the checkout, in $CTS_DESK_DATA/<x01|x02> (default
# /var/lib/cts-a-o/desks): the settings and patch files, the state, the snapshot, the exchange ban and book files and the
# logs. A checkout change, a reinstall or an uninstall does not touch it (docs/live-coordination.md).
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
DATA="${CTS_DESK_DATA:-/var/lib/cts-a-o/desks}"
X01="$DATA/x01"
X02="$DATA/x02"
cd "$ROOT" || exit 1
mkdir -p "$X01" "$X02" || { echo "cannot create $DATA"; exit 1; }
which=$1
# restart <desk>: graceful (state saved, nothing closed), then the same launch
if [ "$which" = "restart" ]; then
  d=$2; P=$(ps -eo pid,args | grep -v grep | grep -- "core-live-test.mjs --name $d " | awk '{print $1}')
  [ -n "$P" ] && kill -USR2 $P && for i in $(seq 1 60); do ps -p $P >/dev/null || break; sleep 1; done
  ps -p $P >/dev/null 2>&1 && { echo "desk $d did not exit"; exit 1; }
  exec "$0" "$d"
fi
# one desk per name (one tag): never a second process on the same tag (its shutdown would close the other's positions)
if ps -eo args | grep -v grep | grep -q -- "core-live-test.mjs --name $which "; then
  echo "desk $which is still running — stop it first"; exit 1
fi
need() { [ -f "$1" ] || { echo "missing $1 (the desk's settings live on the server; see docs/live-coordination.md)"; exit 1; }; }
export CTS_CORE_WORKERS=1
case $which in
  twin)
    # the demo reference: same settings as x01, micro + minimal on, no end time
    need "$X02/twin.json"; need "$X02/patch.json"
    export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE="$X02/bingx-ban" CTS_BINGX_BOOK_FILE="$X02/bingx-book" CTS_CORE_LIVE_TAG=CTSV2T_
    nohup node --max-old-space-size=4096 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name twin --conn bingx-vst-02 --settings "$X02/twin.json" --symbols 25 --notional 1 --hours 0 \
      --every 5 --patch-file "$X02/patch.json" --out "$X02/live-twin" >> "$X02/twin.log" 2>&1 &
    ;;
  losstest)
    # the loss stop end to end on the demo account: a tiny limit, so it trips on the first losses
    need "$X02/twin.json"
    export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE="$X02/bingx-ban" CTS_BINGX_BOOK_FILE="$X02/bingx-book" CTS_CORE_LIVE_TAG=CTSV2Q_
    nohup node --max-old-space-size=3072 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name losstest --conn bingx-vst-02 --settings "$X02/twin.json" --wf '{"validLastN":0}' --symbols 12 \
      --notional 1 --hours 1 --max-loss 0.05 --every 5 --out "$X02/live-losstest" >> "$X02/losstest.log" 2>&1 &
    ;;
  x01)
    # real money: guarded (loss limit 2 USDT, free-margin floor in the settings), opening gated by the twin
    need "$X01/x01.json"; need "$X01/patch.json"
    export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE="$X01/bingx-ban" CTS_BINGX_BOOK_FILE="$X01/bingx-book" CTS_CORE_LIVE_TAG=CTSV2X_
    # the operator's explicit waiver of the readiness check (each validated set trades on its own validation; the
    # loss limit, the free-margin floor and the last-N floors stay)
    export CTS_CORE_MAINNET_WAIVE_READY=1
    nohup node --max-old-space-size=4096 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name x01 --conn bingx-x01 --mainnet yes --max-loss 2 --settings "$X01/x01.json" --symbols 25 \
      --notional 1 --hours 0 --every 5 --patch-file "$X01/patch.json" --out "$X01/live-x01" >> "$X01/x01.log" 2>&1 &
    ;;
  *) echo "usage: launch.sh twin|x01|losstest|restart <desk>"; exit 2 ;;
esac
echo "$(date -u +%H:%M:%S) started $which pid $!" >> "$DATA/started.log"
