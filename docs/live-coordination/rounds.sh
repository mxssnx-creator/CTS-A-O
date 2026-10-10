#!/bin/bash
# Every 10 min: check both desks on the exchange, one summary line per round. Runs from the project checkout; the desks'
# data is on the server ($CTS_DESK_DATA, default /var/lib/cts-a-o/desks), as in launch.sh.
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
DATA="${CTS_DESK_DATA:-/var/lib/cts-a-o/desks}"
X01="$DATA/x01"
X02="$DATA/x02"
cd "$ROOT" || exit 1
mkdir -p "$X01" "$X02" || { echo "cannot create $DATA"; exit 1; }
while [ ! -f "$DATA/stop-rounds" ]; do
  # range switching off: Base validation (min PF per range) decides what trades on every range
  coord="off (Base validation decides)"
  ( export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET" \
      CTS_BINGX_BAN_FILE="$X02/bingx-ban" CTS_BINGX_BOOK_FILE="$X02/bingx-book"
    timeout 540 node --experimental-strip-types --no-warnings scripts/core-live-monitor.mjs --dir "$X02" \
      --conn bingx-vst-02 --out "$X02/monitor.md" --max-notional 200 > "$X02/monitor-last.txt" 2>&1 )
  rc2=$?
  ( export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET" \
      CTS_BINGX_BAN_FILE="$X01/bingx-ban" CTS_BINGX_BOOK_FILE="$X01/bingx-book"
    timeout 540 node --experimental-strip-types --no-warnings scripts/core-live-monitor.mjs --dir "$X01" \
      --conn bingx-x01 --out "$X01/monitor.md" --max-notional 200 > "$X01/monitor-last.txt" 2>&1 )
  rc1=$?
  line=$(DATA="$DATA" node -e '
const fs=require("fs");const out=[];const D=process.env.DATA;
for (const [d,f] of [["twin",D+"/x02/live-twin/status.json"],["x01",D+"/x01/live-x01/status.json"],["losstest",D+"/x02/live-losstest/status.json"]]) { try { const s=JSON.parse(fs.readFileSync(f));
 const P=Object.entries(s.paper??{}); const n=P.reduce((a,[,v])=>a+v.n,0), gp=P.reduce((a,[,v])=>a+v.gp,0), gl=P.reduce((a,[,v])=>a+v.gl,0);
 const rng=P.map(([k,v])=>`${k[0]}${v.n}:${(v.gl>1e-12?v.gp/v.gl:v.gp>0?99:0).toFixed(2)}`).join(",");
 const ord=(s.orders??[]).reduce((a,o)=>a+o.n,0); const age=((Date.now()-Date.parse(s.at))/60000).toFixed(0);
 const lc=s.lossCheck?` own$${s.lossCheck.net.toFixed(2)}`:"";
 out.push(`${d} ${s.hours.toFixed(2)}h age${age}m${s.final?" FINAL":""} paper ${n} PF ${(gl>1e-12?gp/gl:gp>0?99:0).toFixed(2)} [${rng}] open${s.openPositions??"?"} orders${ord}${lc} ${(s.live?.reason??"").slice(0,48)}`);} catch(e){} }
console.log(out.join(" | "));')
  echo "$(date -u +%H:%M) x02rc=$rc2 x01rc=$rc1 ${line} || coord: ${coord}" >> "$DATA/rounds.log"
  sleep 600
done
