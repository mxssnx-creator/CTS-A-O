#!/usr/bin/env python3
"""Render audited grid studies as one offline HTML heatmap with full context/order listings."""
import base64, gzip, hashlib, json, sys
from pathlib import Path
if len(sys.argv)!=5:
    raise SystemExit('usage: render-stage-window-report.py MICRO_DIR MINIMAL_DIR SHORT_DIR OUTPUT_HTML')
order_rows=[];order_keys={};order_sets=[];set_keys={};gates=[];gate_keys={}
def intern(value,rows,keys):
    key=json.dumps(value,separators=(',',':'))
    if key not in keys:keys[key]=len(rows);rows.append(value)
    return keys[key]
def order_set(result,start):
    rows=[]
    for t in result['trades']:
        if t['entryT']>=start:
            row=[t['entryT'],t['exitT'],t['entry'],t['exit'],t['r'],t['reason'],t['side']]
            rows.append(intern(row,order_rows,order_keys))
    op=result.get('open')
    if op and op['entryT']>=start:rows.append(intern([op['entryT'],None,op['entry'],None,None,'held',op['side']],order_rows,order_keys))
    return intern(rows,order_sets,set_keys)
def gate(g):
    sec=g['secondary'][0] if g['secondary'] else {'n':0,'pf':None}
    return intern([g['state'],g['primary']['n'],g['primary']['pf'],sec['n'],sec['pf']],gates,gate_keys)
datasets=[]
for label,directory in zip(['Micro · 15 min','Minimal · 30 min','Short · 60 min'],sys.argv[1:4]):
    path=Path(directory);p=json.loads((path/'protocol.json').read_text());r=json.loads((path/'results.json').read_text());a=json.loads((path/'audit.json').read_text());trace=json.loads((path/'trace.json').read_text())
    assert trace['status']=='pass' and a['status']=='pass' and a['contexts']==4800 and a['cases']==80
    contexts=[]
    with gzip.open(path/'contexts.jsonl.gz','rt') as source:
        for line in source:
            c=json.loads(line);d=c['dictionary'];bases={}
            read=lambda wrapper:d[wrapper['data']]
            for key,b in c['bases'].items():
                cells={}
                for choice,case in b['cases'].items():
                    cells[choice]=[gate(case['checkpoint']['main']),gate(case['checkpoint']['inverseMain'])]+[order_set(read(case[n]),p['start']) for n in ['real','inverseReal','active','inverseActive']]
                bases[key]=[gate(b['cases']['15|15']['checkpoint']['base']),order_set(read(b['main']),p['start']),order_set(read(b['inverseMain']),p['start']),cells]
            contexts.append([c['cfg'],c['sym'],c['side'],c['tf'],c['kind'],c['relation'],bases,order_set(d[c['raw']],p['start'])])
    assert len(contexts)==4800
    datasets.append({'label':label,'protocol':p,'results':r,'audit':a,'trace':trace,'contexts':contexts})
    print(label,len(contexts),'contexts',flush=True)
data={'datasets':datasets,'orders':order_rows,'sets':order_sets,'gates':gates}
encoded=base64.b64encode(gzip.compress(json.dumps(data,separators=(',',':')).encode(),compresslevel=9)).decode()
template=r'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CTS-A-O · 24-hour stage window audit</title>
<style>
:root{color-scheme:light;--navy:#17334e;--ink:#182b3c;--muted:#596b7d}*{box-sizing:border-box}body{margin:0;background:#f3f6f9;color:var(--ink);font:15px/1.5 system-ui,sans-serif}header{background:var(--navy);color:#fff;padding:32px max(20px,calc((100vw - 1440px)/2))}h1{font-size:30px;line-height:1.2;margin:0 0 12px}h2{font-size:21px;margin:28px 0 10px}main{max-width:1480px;margin:auto;padding:24px}p{max-width:1200px}.notice,.note{padding:16px;border-left:5px solid #987000;background:#fff0cd;margin:16px 0}.note{background:#e7eef5;border-color:#315e8b}.controls{display:flex;flex-wrap:wrap;gap:14px;align-items:end;margin:20px 0}label{display:grid;gap:5px;font-weight:600}select,input,button{font:inherit;padding:8px 10px;border:1px solid #8b9bad;border-radius:5px;color:var(--ink);background:#fff}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px}.card{border:1px solid #d0dbe5;background:#fff;border-radius:8px;padding:15px}.value{font-size:23px;font-weight:700;margin:4px 0}.muted,small{color:var(--muted)}.scroll{overflow:auto;background:white;border:1px solid #cfdae4;border-radius:6px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;vertical-align:top;padding:9px 11px;border-bottom:1px solid #dbe3eb;white-space:nowrap}th{background:#e6edf4;position:sticky;top:0;z-index:1}tbody tr:nth-child(even){background:#f7f9fb}.heat{table-layout:fixed;min-width:680px}.heat th{text-align:center}.heat td{padding:0}.heat button{width:100%;min-height:100px;border:3px solid transparent;border-radius:0;line-height:1.35}.heat button.selected{border-color:#153a61}.heat b{display:block;font-size:22px}.heat small{display:block;color:inherit}.good{color:#075e43}.bad{color:#9d202d}.pager{display:flex;gap:15px;align-items:center;margin:14px 0}details{white-space:normal;overflow-wrap:anywhere;max-width:480px}summary{cursor:pointer}.hour td{text-align:center;min-width:52px;font-size:11px}.hour th{min-width:100px}.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:13px}.dot{display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:5px}footer{padding:24px;color:var(--muted)}.error{background:#ffe1e1;color:#7e1322;padding:20px}.note code{overflow-wrap:anywhere}svg{width:100%;height:230px;background:#fff;border:1px solid #d1dbe4;border-radius:7px}.chart-label{font-size:11px;fill:#4b6074}@media(max-width:600px){main{padding:14px}h1{font-size:25px}.controls>label{flex:1;min-width:140px}}
</style>
<header><h1>CTS-A-O · stage windows under a 24-hour test</h1><div>20 symbols · 24h prior candles + 24h trading · 240 comparisons across three ranges · net unit-return PF</div></header>
<main><div id="loading" class="note">Loading the embedded audited results…</div>
<div class="notice"><strong>These results do not establish stable high execution PF.</strong> This is an isolated Low-Range Normal/Trailing model. It excludes additional/Overall adjustments, funded allocation, production paper, fees/funding measured at a venue and exchange fills. Production stage integration remains unfinished. Empty samples have unavailable PF.</div>
<p>Base uses two independent windows on the same exact configuration: primary 20/30/40/50 and secondary 5/10/15/20/25. Every Base-qualified signal is evaluated for its own Main source before taking a position slot. Main’s own processed closes feed its primary Last-50 plus secondary 15/25. Its qualified entries create a distinct Real source. Real’s own Last-15/25 qualifies the final Active model mirror. No raw Base or sibling history substitutes for a downstream set.</p>
<div class="controls"><label>Range / hold<select id="range"><option value="0">Micro · 15 min</option><option value="1">Minimal · 30 min</option><option value="2">Short · 60 min</option></select></label><label>Main secondary N<select id="mainN"><option>15</option><option>25</option></select></label><label>Real N<select id="realN"><option>15</option><option>25</option></select></label><label>Heatmap metric<select id="metric"><option value="main">Subsequent Main PF</option><option value="real">Subsequent Real PF</option><option value="end">End Active PF</option><option value="base">Base qualified %</option><option value="orders">End Active closed orders</option></select></label></div>
<div id="scope" class="note"></div><div id="cards" class="cards"></div>
<h2>Base Last-N heatmap</h2><p>Click any cell to inspect its full progression, exact contexts and orders. Rows are primary N; columns are secondary N. PF colors use neutral 1.0. Gray means unavailable, including empty samples; no-loss samples are labeled separately.</p><div class="legend"><span><i class="dot" style="background:#c8e6d9"></i>PF above 1</span><span><i class="dot" style="background:#f2d0d0"></i>PF below 1</span><span><i class="dot" style="background:#e5eaf0"></i>Unavailable</span></div>
<div class="scroll"><table class="heat"><thead><tr><th>Primary ↓ / secondary →</th><th>5</th><th>10</th><th>15</th><th>20</th><th>25</th></tr></thead><tbody id="heatmap"></tbody></table></div>
<div id="finding" class="notice"></div>
<h2>All 80 combinations for this range</h2><div class="scroll"><table><thead><tr><th>Base primary / second</th><th>Main second / Real</th><th>Base passed / evaluated</th><th>Historical Base PF</th><th>Later Main PF</th><th>Main positions O/C/H</th><th>Main orders O/C/H</th><th>Real passed / matched</th><th>End Active orders O/C/H</th><th>End Active PF</th></tr></thead><tbody id="sweep"></tbody></table></div>
<h2>Stage progression · selected combination</h2><div class="scroll"><table><thead><tr><th>Stage</th><th>Qualified / all attempts</th><th>Qualified %</th><th>Missing parent</th><th>Insufficient</th><th>Failed</th><th>Positions O/C/H</th><th>Orders O/C/H</th><th>Subsequent PF</th><th>Close reasons</th></tr></thead><tbody id="stages"></tbody></table></div>
<h2>Hourly progression of realized model returns</h2><p>Each hour uses that stage’s own completed orders. The curve shows cumulative return PF on the selected stage; no-loss and empty points are gaps. Endpoint held MTM is excluded. Dates and hours below use Vienna time.</p>
<div class="controls"><label>Curve stage<select id="chartStage"><option>main</option><option>inverseMain</option><option>real</option><option>inverseReal</option><option>active</option><option>inverseActive</option></select></label></div><div id="curve"></div>
<div class="scroll"><table class="hour"><thead id="hourHead"></thead><tbody id="hours"></tbody></table></div>
<h2>Base → Main: what changed and what closes the orders</h2><div id="parity" class="note"></div>
<p>The matched-entry check compares the same Base and Main order. Main can also enter at an intent that raw Base did not take: rejecting an earlier signal leaves Main’s own slot free. Such an order still needs its exact causal Base proof. All modeled costs below are deducted once; the gross price PF is only a labeled cost diagnostic.</p>
<div class="scroll"><table><thead><tr><th>Subset</th><th>Closed / held orders</th><th>Net unit PF</th><th>Gross price PF</th><th>Sum cost / original unit</th><th>Median / p95 / max hold min</th></tr></thead><tbody id="parityRows"></tbody></table></div>
<h2>Loss attribution · close reason, hold duration and source group</h2><div class="scroll"><table><thead><tr><th>Category</th><th>Group</th><th>Closed / held</th><th>Net unit PF</th><th>Gross price PF</th><th>Median / p95 / max hold min</th><th>Reasons</th></tr></thead><tbody id="attribution"></tbody></table></div>
<h2>Each strategy and timeframe</h2><div class="scroll"><table><thead><tr><th>Type / timeframe</th><th>Stage</th><th>Positions O/C/H</th><th>Orders O/C/H</th><th>Subsequent PF</th><th>Close reasons</th></tr></thead><tbody id="groups"></tbody></table></div>
<h2>Long and Short independently</h2><div class="scroll"><table><thead><tr><th>Direction</th><th>Stage</th><th>Positions O/C/H</th><th>Orders O/C/H</th><th>Subsequent PF</th></tr></thead><tbody id="sides"></tbody></table></div>
<h2>Every exact context and processed order</h2><p>All 4,800 contexts per range are listed, including failures and insufficient samples. Context gate PF is historical at the start; listed order returns are subsequent outcomes. O/C/H means opened / closed / held. A position is a continuous symbol × direction episode of overlapping orders; individual config orders remain independent.</p>
<div class="controls"><label>Find symbol / configuration / direction<input id="search" type="search" placeholder="BTC, trailing, long…"></label><label>Listing<select id="listing"><option value="contexts">Exact contexts</option><option value="orders">Processed orders</option></select></label><label>Order stage<select id="orderStage"><option>main</option><option>inverseMain</option><option>real</option><option>inverseReal</option><option>active</option><option>inverseActive</option></select></label></div>
<div class="pager"><button id="previous">Previous</button><span id="page"></span><button id="next">Next</button></div><div class="scroll"><table><thead id="listHead"></thead><tbody id="listBody"></tbody></table></div>
<h2>Verification, selection and limits</h2><div id="audit" class="note"></div>
<p>Prices, one cost deduction, direction, hold duration, exact parent/policy identities, every recorded gate, closed/held counts, type/timeframe/direction groups and 24 hourly bins were independently reconstructed. Primary PF uses cost-adjusted unit returns. Gate score 4 for a no-loss window is not a finite measured PF ratio. The tested fixed hold values are not hold-time optimization results.</p>
<p>A negative Main average over Last-5/10 creates a separate opposite-direction simulation only when the original primary Last-50 remains positive. That inverse set pays its own cost and can lose too. It must collect and validate its own Main and Real history before Active. No parent return is negated.</p>
<p>“Best” means measured closed Active PF with at least 30 closes, subject to coverage and hourly losses. If those samples are unavailable, the report identifies no best Active default. Main-only rankings remain exploratory. The period ends before the earlier 10 October trading window, but is retrospective market research; no prospective high-PF guarantee is inferred.</p>
<p>DCA/Axis entry-slot and invalid-cost guards are merged in <a href="https://github.com/mxssnx-creator/CTS-A-O/pull/230">#230</a>. The production Base/Main/Real persistence, Settings, partial-fill recovery and final Active-to-Live adapter remain unfinished in <a href="https://github.com/mxssnx-creator/CTS-A-O/pull/219">draft #219</a>. No deployed account or venue order was changed by this study.</p>
</main><footer>Frozen minute feed and code hashes are recorded with the accompanying experiment evidence. Report generated 29 October 2026.</footer>
<script id="payload" type="application/octet-stream">__DATA__</script>
<script>
(async()=>{
const packed=Uint8Array.from(atob(document.getElementById('payload').textContent),c=>c.charCodeAt(0)),stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
const DATA=JSON.parse(await new Response(stream).text()),NAMES=['main','inverseMain','real','inverseReal','active','inverseActive'];
window.CTS_REPORT_DATA=DATA;
const el=id=>document.getElementById(id),esc=s=>String(s??'unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  num=(x,n=4)=>x===null||x===undefined?'unavailable':Number(x).toFixed(n),pct=x=>x===null||x===undefined?'unavailable':Number(x).toFixed(2)+'%',
  pf=s=>s.noLoss?'no losses':num(s.returnPf),oc=s=>`${s.openedOrders}/${s.settledOrders}/${s.openOrders}`,pc=s=>`${s.openedPositions}/${s.closedPositions}/${s.openPositions}`,
  row=xs=>'<tr>'+xs.map(x=>'<td>'+x+'</td>').join('')+'</tr>',date=t=>t===null?'held':new Date(t).toLocaleString('en-GB',{timeZone:'Europe/Vienna',hour12:false}),
  bg=v=>v===null?'#e5eaf0':v>1?'#c8e6d9':v<1?'#f2d0d0':'#fff1c9';
let primary=50,secondary=15,page=0,filtered=[];const SIZE=50;
const key=c=>`${c.basePrimaryN}|${c.baseSecondaryN}|${c.mainSecondaryN}|${c.realN}`;
function chosen(){const d=DATA.datasets[+el('range').value],m=+el('mainN').value,r=+el('realN').value,c=d.results.cases.find(c=>c.basePrimaryN===primary&&c.baseSecondaryN===secondary&&c.mainSecondaryN===m&&c.realN===r),end=d.audit.effectiveActive.find(x=>x.case===key(c));return{d,m,r,c,end};}
function selectedOrders(c,b,m,r,stage){const v=c[6][b];if(stage==='main')return DATA.sets[v[1]];if(stage==='inverseMain')return DATA.sets[v[2]];return DATA.sets[v[3][`${m}|${r}`][{real:2,inverseReal:3,active:4,inverseActive:5}[stage]]];}
function smallStats(ids){let closed=0,held=0,gp=0,gl=0;for(const id of ids){const x=DATA.orders[id];if(x[1]===null)held++;else{closed++;gp+=Math.max(0,x[4]);gl+=Math.max(0,-x[4]);}}return`${closed+held}/${closed}/${held} · ${gl?num(gp/gl):gp?'no losses':'unavailable'}`;}
function gate(index,n){const g=DATA.gates[index];return`${esc(g[0])} · ${g[1]}/${n} PF ${num(g[2])}<br>second ${g[3]} PF ${num(g[4])}`;}
function render(){page=0;const{d,m,r,c,end}=chosen(),p=d.protocol;
 el('scope').textContent=`Trading: ${date(p.start)} → ${date(p.end)} Vienna · 24h prior candles · 20 symbols · 1/5/15m · modeled round-trip cost ${(100*p.cost).toFixed(2)}% · min PF ${p.minPf}. Selected Base ${primary}+${secondary}, Main 50+${m}, Real ${r}.`;
 el('cards').innerHTML=[['Base passed',`${c.historical.base}/4,800`,pct(c.historical.basePercent)+' at start'],['Historical Base PF',c.historical.baseNoLoss?'no losses':num(c.historical.basePrimaryPf),'primary window, different sample'],['Subsequent Main PF',pf(c.stages.main),oc(c.stages.main)+' orders O/C/H'],['End Active PF',pf(end),oc(end)+' orders O/C/H'],['Venue-fill PF','unavailable','offline model; no fills']].map(x=>`<div class="card">${x[0]}<div class="value">${x[1]}</div><small>${x[2]}</small></div>`).join('');
 el('heatmap').innerHTML=[20,30,40,50].map(a=>'<tr><th>'+a+'</th>'+[5,10,15,20,25].map(b=>{const x=d.results.cases.find(x=>x.basePrimaryN===a&&x.baseSecondaryN===b&&x.mainSecondaryN===m&&x.realN===r),e=d.audit.effectiveActive.find(e=>e.case===key(x)),metric=el('metric').value,s=metric==='main'?x.stages.main:metric==='real'?x.stages.real:e,v=metric==='base'?x.historical.basePercent:metric==='orders'?e.settledOrders:s.returnPf,label=metric==='base'?pct(v):metric==='orders'?String(v):pf(s),color=metric==='base'||metric==='orders'?'#e6edf5':bg(v);return`<td><button data-primary="${a}" data-secondary="${b}" class="${primary===a&&secondary===b?'selected':''}" style="background:${color}" aria-label="Base ${a} plus ${b}: ${esc(label)}"><b>${label}</b><small>Base ${x.historical.base}/4800 · ${pct(x.historical.basePercent)}</small><small>${s.settledOrders} closed / ${s.openOrders} held orders</small></button></td>`;}).join('')+'</tr>').join('');
 el('heatmap').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{primary=+button.dataset.primary;secondary=+button.dataset.secondary;render();}));
 const eligible=d.audit.effectiveActive.filter(x=>x.settledOrders>=30&&x.returnPf!==null).sort((a,b)=>b.returnPf-a.returnPf),maxReady=Math.max(...d.results.cases.map(x=>x.readiness.maxMainOwnN));
 el('finding').textContent=eligible.length?`Highest observed end Active PF with at least 30 closes: ${num(eligible[0].returnPf)} at ${eligible[0].case.replaceAll('|',' / ')}. This is an exploratory grid maximum, not a proven deployment default.`:`No combination has 30 closed Active orders with measurable finite PF. No best Active default is established. The largest Main primary sample observed across this range is ${maxReady}/50; selected combination ${c.readiness.maxMainOwnN}/50.`;
 el('sweep').innerHTML=d.results.cases.map(x=>{const e=d.audit.effectiveActive.find(e=>e.case===key(x));return row([`${x.basePrimaryN} / ${x.baseSecondaryN}`,`${x.mainSecondaryN} / ${x.realN}`,`${x.historical.base}/4800 (${pct(x.historical.basePercent)})`,x.historical.baseNoLoss?'no losses':num(x.historical.basePrimaryPf),pf(x.stages.main),pc(x.stages.main),oc(x.stages.main),`${x.decisions.real.qualified}/${x.readiness.matchedMain}`,oc(e),pf(e)]);}).join('');
 el('stages').innerHTML=NAMES.map(n=>{const q=c.decisions[n],s=c.stages[n];return row([n,`${q.qualified}/${q.evaluated}`,pct(q.percent),q.parentMissing,q.insufficient,q.failed,pc(s),oc(s),pf(s),esc(JSON.stringify(s.reasons))]);}).join('');
 const trace=d.trace.cases.find(t=>t.case===`${primary}|${secondary}`),duration=s=>[s.medianHoldMin,s.p95HoldMin,s.maxHoldMin].map(x=>num(x,1)).join(' / ');
 el('parity').textContent=`${trace.contextsWithMain} exact contexts processed new Main orders. ${trace.matchedEntries} Main entries match raw Base entries; ${trace.equalFullEconomics} closed matches have identical prices, close clocks/reasons and net returns. ${trace.extraEntries} entries use an independently freed Main slot. Across this range, ${d.trace.changedMatchedEconomics} matched trades changed and ${d.trace.silentlyLostQualifiedEntries} qualified Main entries were silently lost.`;
 el('parityRows').innerHTML=[['All Main',trace.main],['Matched Base/Main entries',trace.matched],['Independent Main slot entries',trace.extra],['Initial Base-qualified configs: later raw source',trace.initiallyQualifiedBaseFuture]].map(([label,s])=>row([label,`${s.n} / ${s.held}`,s.noLoss?'no losses':num(s.returnPf),num(s.grossPricePf),pct(s.costSum*100),duration(s)])).join('');
 el('attribution').innerHTML=[['Close reason',trace.byReason],['Hold duration',trace.holdBuckets],['Type / timeframe / relation',trace.groups],['Symbol',trace.symbols]].flatMap(([category,groups])=>Object.entries(groups).map(([label,s])=>row([category,esc(label),`${s.n} / ${s.held}`,s.noLoss?'no losses':num(s.returnPf),num(s.grossPricePf),duration(s),esc(JSON.stringify(s.reasons))]))).join('');
 el('groups').innerHTML=Object.entries(c.groups).flatMap(([k,group])=>NAMES.map(n=>row([esc(k),n,pc(group[n]),oc(group[n]),pf(group[n]),esc(JSON.stringify(group[n].reasons))]))).join('');
 el('sides').innerHTML=[1,-1].flatMap(side=>NAMES.map(n=>{const s=c.sides[side][n];return row([side===1?'Long':'Short',n,pc(s),oc(s),pf(s)]);})).join('');
 el('audit').textContent=`${d.audit.contexts.toLocaleString()} contexts · ${d.audit.cases} combinations · ${d.audit.independentlyScoredWindows.toLocaleString()} independent windows · ${d.audit.independentlyCheckedPriceReturns.toLocaleString()} price-return checks. Sampled peak RSS ${(d.results.memory.maxSampledRssBytes/1048576).toFixed(1)} MiB; study ${(d.results.elapsedSeconds/60).toFixed(1)} minutes. This is research runtime, not a warmed execution-cycle timing.`;
 renderHours();renderList();window.CTS_REPORT_SELECTION={range:+el('range').value,primary,secondary,mainN:m,realN:r,case:key(c)};
}
function renderHours(){const{c}=chosen(),hours=c.stages[el('chartStage').value].hourly;
 el('hourHead').innerHTML='<tr><th>Stage / hour</th>'+hours.map(h=>'<th>'+new Date(h.t).toLocaleTimeString('en-GB',{timeZone:'Europe/Vienna',hour:'2-digit',minute:'2-digit'})+'</th>').join('')+'</tr>';
 el('hours').innerHTML=NAMES.map(n=>'<tr><th>'+n+'</th>'+c.stages[n].hourly.map(h=>`<td style="background:${h.n?bg(h.gl?h.gp/h.gl:h.gp?4:0):'#e5eaf0'}" title="${date(h.t)}; ${h.n} closed orders; sum return ${pct(h.net*100)}">${h.n} orders<br>${h.gl?num(h.gp/h.gl,2):h.gp?'no loss':'—'}</td>`).join('')+'</tr>').join('');
 let gain=0,loss=0;const points=hours.map((h,i)=>{gain+=h.gp;loss+=h.gl;return{i,v:loss?gain/loss:null};}),values=points.filter(x=>x.v!==null),max=Math.max(2,...values.map(x=>x.v)),W=1100,H=230,left=55,right=20,top=18,bottom=35,x=i=>left+i*(W-left-right)/23,y=v=>H-bottom-v*(H-top-bottom)/max;
 let path='',continued=false;for(const p of points){if(p.v===null){continued=false;continue;}path+=(continued?'L':'M')+x(p.i).toFixed(1)+','+y(p.v).toFixed(1);continued=true;}
 el('curve').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative closed unit-return PF"><line x1="${left}" x2="${W-right}" y1="${y(1)}" y2="${y(1)}" stroke="#a47139" stroke-dasharray="5 4"/><text x="4" y="${y(1)+4}" class="chart-label">PF 1</text><text x="4" y="22" class="chart-label">${num(max,2)}</text><path d="${path}" fill="none" stroke="#245a88" stroke-width="3"/>${[0,6,12,18,23].map(i=>`<text x="${x(i)}" y="220" text-anchor="middle" class="chart-label">${i+1}h</text>`).join('')}${values.length?'':'<text x="550" y="110" text-anchor="middle" class="chart-label">PF unavailable: no closed loss-bearing sample</text>'}</svg>`;
}
function renderList(){const{d,m,r}=chosen(),b=`${primary}|${secondary}`,name=el('orderStage').value,q=el('search').value.toLowerCase(),orders=el('listing').value==='orders',matches=(c,side=c[2])=>[c[0],c[1],c[4],c[5],c[3],side>0?'long':'short'].join(' ').toLowerCase().includes(q);
 filtered=orders?d.contexts.flatMap((c,ci)=>selectedOrders(c,b,m,r,name).filter(id=>matches(c,DATA.orders[id][6])).map(id=>({c,ci,id}))):d.contexts.filter(c=>matches(c));
 const pages=Math.max(1,Math.ceil(filtered.length/SIZE));page=Math.max(0,Math.min(page,pages-1));el('page').textContent=`${filtered.length.toLocaleString()} ${orders?'orders':'contexts'} · page ${page+1}/${pages}`;el('previous').disabled=page===0;el('next').disabled=page+1>=pages;
 const heads=orders?['Symbol / direction / type','Base configuration','Entry Vienna','Exit Vienna','Entry / exit price','Net unit return','Reason / minutes','Own source / Base parity']:['Symbol / side','Timeframe / type','Base configuration','Base historical gate','Main historical gate','Later Main O/C/H · PF','Real O/C/H · PF','End Active O/C/H · PF'];
 el('listHead').innerHTML='<tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr>';
 const cfg=c=>`<details><summary>${esc(c[0].slice(0,48))}…</summary>${esc(c[0])}<br>Coordination ${esc(c[5])}<br>Base ${primary}+${secondary}; Main 50+${m}; Real ${r}</details>`;
 el('listBody').innerHTML=filtered.slice(page*SIZE,(page+1)*SIZE).map(x=>{if(orders){const c=x.c,o=DATA.orders[x.id];return row([`${esc(c[1])} · ${o[6]>0?'Long':'Short'} · ${esc(c[4])} ${c[3]}m`,cfg(c),date(o[0]),date(o[1]),`${num(o[2],8)} / ${num(o[3],8)}`,o[4]===null?'held; excluded':pct(o[4]*100),`${esc(o[5])} · ${o[1]===null?'held':num((o[1]-o[0])/60000,1)}`,`${name} · own ${esc(c[1])} / ${o[6]>0?'long':'short'}<br>${name==='main'?(DATA.sets[c[7]].some(id=>DATA.orders[id][0]===o[0])?'Matching Base entry: identical economics':'Independent Main slot; own Base proof required'):'Own stage price/protection source'}`]);}
 const z=x[6][b],cell=z[3][`${m}|${r}`];return row([`${esc(x[1])} · ${x[2]>0?'Long':'Short'}`,`${x[3]}m · ${esc(x[4])}`,cfg(x),gate(z[0],primary),gate(cell[0],50),smallStats(DATA.sets[z[1]]),smallStats(DATA.sets[cell[2]]),smallStats([...DATA.sets[cell[4]],...DATA.sets[cell[5]]])]);}).join('')||row([`No ${orders?'orders':'contexts'} in this selection.`]);
}
['range','mainN','realN','metric'].forEach(id=>el(id).addEventListener('change',render));['listing','orderStage'].forEach(id=>el(id).addEventListener('change',()=>{page=0;renderList();}));el('search').addEventListener('input',()=>{page=0;renderList();});el('previous').addEventListener('click',()=>{page--;renderList();});el('next').addEventListener('click',()=>{page++;renderList();});el('chartStage').addEventListener('change',renderHours);
render();el('loading').remove();window.CTS_REPORT_READY=true;
})().catch(error=>{document.getElementById('loading').className='error';document.getElementById('loading').textContent='Report failed to load: '+error.message;console.error(error);});
</script></html>'''
output=Path(sys.argv[4]);output.write_text(template.replace('__DATA__',encoded))
manifest={'report':str(output),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
          'datasets':len(datasets),'contexts':sum(len(d['contexts']) for d in datasets),'cases':sum(len(d['results']['cases']) for d in datasets),
          'uniqueOrders':len(order_rows),'orderSets':len(order_sets),'gateRecords':len(gates)}
output.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest),flush=True)
