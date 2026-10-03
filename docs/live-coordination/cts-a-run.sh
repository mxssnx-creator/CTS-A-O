#!/bin/bash
# CTS-A sessions in this environment, settings as its systemd units (deploy/cts-a/cts-a-vst*.service):
#   run.sh x01 | x02   — loop: restart 8 s after the 12 h session ends (Restart=always); touch <dir>/stop to end
D=/tmp/claude-0/ctsa
which=$1
case $which in x01|x02) ;; *) echo "usage: run.sh x01|x02"; exit 2 ;; esac
if ps -eo args | grep -v grep | grep -q -- "cts-a-vst-session.mjs --desk=$which"; then echo "CTS-A $which already running"; exit 1; fi
mkdir -p $D/$which
cd /home/user/cts-a
export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET"
export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET"
export CTS_A_VST_HOURS=12 CTS_A_SYMBOLS=50
export CTS_A_STATUS=$D/$which/vst-session.json CTS_A_SETTINGS=$D/$which/desk-settings.json
export CTS_A_OVERALL=$D/$which/overall-stats.json CTS_A_DISABLED=$D/$which/live-disabled.json
export CTS_A_PROTECT=$D/$which/protect-grid.json
if [ $which = x01 ]; then
  export CTS_A_CONN=bingx-x01 CTS_A_NETWORK=mainnet CTS_A_LIVE_MIN_PF=1.15 CTS_A_LIVE_MAX_POS=100
  export CTS_A_EVAL_SYMBOLS=50 CTS_A_TICK_MS=1000 CTS_A_CYCLE_MS=1000 CTS_A_SHORT_CYCLE_MS=1000
  # one API key shared with the CTS-A-O desks: a slower exchange I/O cycle keeps the endpoint bans away
  export CTS_A_IO_MS=1500
  HEAP=384
else
  export CTS_A_CONN=bingx-vst-02 CTS_A_NETWORK=testnet CTS_A_LIVE_MIN_PF=${CTS_A_X02_MIN_PF:-0} CTS_A_LIVE_MAX_POS=2000
  export CTS_A_EVAL_SYMBOLS=300 CTS_A_TICK_MS=800
  HEAP=1024
fi
export NODE_OPTIONS=--max-old-space-size=$HEAP
nohup bash -c "while [ ! -f $D/$which/stop ]; do
  echo \"\$(date -u +%FT%TZ) start\" >> $D/$which/session.log
  node --max-old-space-size=$HEAP --experimental-strip-types --no-warnings scripts/cts-a-vst-session.mjs --desk=$which >> $D/$which/session.log 2>&1
  echo \"\$(date -u +%FT%TZ) exit \$?\" >> $D/$which/session.log
  sleep 8
done" > /dev/null 2>&1 &
echo "$(date -u +%T) started CTS-A $which loop pid $!" >> $D/started.log
