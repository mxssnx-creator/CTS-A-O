#!/bin/bash
# every 10 min: coordinate x01 from the twin, check both desks on the exchange, one summary line per round
cd /tmp/claude-0/live
while [ ! -f runs/stop-rounds ]; do
  # range switching off: Base validation (min PF 1.05) decides what trades on every range
  coord="off (Base validation decides)"
  ( export BINGX_X02_API_KEY="$BINGX_API_KEY" BINGX_X02_SECRET="$BINGX_API_SECRET" \
      CTS_BINGX_BAN_FILE=runs/x02/bingx-ban CTS_BINGX_BOOK_FILE=runs/x02/bingx-book
    timeout 540 node --experimental-strip-types --no-warnings scripts/core-live-monitor.mjs --dir runs/x02 \
      --conn bingx-vst-02 --out runs/x02/monitor.md --max-notional 200 > runs/x02/monitor-last.txt 2>&1 )
  rc2=$?
  ( export BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET" \
      CTS_BINGX_BAN_FILE=runs/x01/bingx-ban CTS_BINGX_BOOK_FILE=runs/x01/bingx-book
    timeout 540 node --experimental-strip-types --no-warnings scripts/core-live-monitor.mjs --dir runs/x01 \
      --conn bingx-x01 --out runs/x01/monitor.md --max-notional 200 > runs/x01/monitor-last.txt 2>&1 )
  rc1=$?
  line=$(node -e '
const fs=require("fs");const out=[];
for (const [d,f] of [["twin","runs/x02/live-twin/status.json"],["x01","runs/x01/live-x01/status.json"],["losstest","runs/x02/live-losstest/status.json"]]) { try { const s=JSON.parse(fs.readFileSync(f));
 const P=Object.entries(s.paper??{}); const n=P.reduce((a,[,v])=>a+v.n,0), gp=P.reduce((a,[,v])=>a+v.gp,0), gl=P.reduce((a,[,v])=>a+v.gl,0);
 const rng=P.map(([k,v])=>`${k[0]}${v.n}:${(v.gl>1e-12?v.gp/v.gl:v.gp>0?99:0).toFixed(2)}`).join(",");
 const ord=(s.orders??[]).reduce((a,o)=>a+o.n,0); const age=((Date.now()-Date.parse(s.at))/60000).toFixed(0);
 const lc=s.lossCheck?` own$${s.lossCheck.net.toFixed(2)}`:"";
 out.push(`${d} ${s.hours.toFixed(2)}h age${age}m${s.final?" FINAL":""} paper ${n} PF ${(gl>1e-12?gp/gl:gp>0?99:0).toFixed(2)} [${rng}] open${s.openPositions??"?"} orders${ord}${lc} ${(s.live?.reason??"").slice(0,48)}`);} catch(e){} }
console.log(out.join(" | "));')
  echo "$(date -u +%H:%M) x02rc=$rc2 x01rc=$rc1 ${line} || coord: ${coord}" >> runs/rounds.log
  sleep 600
done
