#!/bin/bash
# launch one desk from the frozen snapshot: launch.sh twin | x01 | losstest
cd /tmp/claude-0/live
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
export CTS_CORE_WORKERS=1
case $which in
  twin)
    # the demo reference: same settings as x01, micro + minimal on, no end time
    export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE=runs/x02/bingx-ban CTS_BINGX_BOOK_FILE=runs/x02/bingx-book CTS_CORE_LIVE_TAG=CTSV2T_
    nohup node --max-old-space-size=4096 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name twin --conn bingx-vst-02 --settings runs/x02/twin.json --symbols 25 --notional 1 --hours 0 \
      --every 5 --patch-file runs/x02/patch.json --out runs/x02/live-twin >> runs/x02/twin.log 2>&1 &
    ;;
  losstest)
    # the loss stop end to end on the demo account: a tiny limit, so it trips on the first losses
    export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE=runs/x02/bingx-ban CTS_BINGX_BOOK_FILE=runs/x02/bingx-book CTS_CORE_LIVE_TAG=CTSV2Q_
    nohup node --max-old-space-size=3072 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name losstest --conn bingx-vst-02 --settings runs/x02/twin.json --wf '{"validLastN":0}' --symbols 12 \
      --notional 1 --hours 1 --max-loss 0.05 --every 5 --out runs/x02/live-losstest >> runs/x02/losstest.log 2>&1 &
    ;;
  x01)
    # real money: guarded (loss limit 2 USDT, free-margin floor in the settings), opening gated by the twin
    export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET"
    export CTS_BINGX_BAN_FILE=runs/x01/bingx-ban CTS_BINGX_BOOK_FILE=runs/x01/bingx-book CTS_CORE_LIVE_TAG=CTSV2X_
    # the operator's explicit waiver of the readiness check (each validated set trades on its own validation; the
    # loss limit, the free-margin floor and the last-N floors stay)
    export CTS_CORE_MAINNET_WAIVE_READY=1
    nohup node --max-old-space-size=4096 --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
      --name x01 --conn bingx-x01 --mainnet yes --max-loss 2 --settings runs/x01/x01.json --symbols 25 \
      --notional 1 --hours 0 --every 5 --patch-file runs/x01/patch.json --out runs/x01/live-x01 >> runs/x01/x01.log 2>&1 &
    ;;
  *) echo "usage: launch.sh twin|x01|losstest"; exit 2 ;;
esac
echo "$(date -u +%H:%M:%S) started $which pid $!" >> runs/started.log
