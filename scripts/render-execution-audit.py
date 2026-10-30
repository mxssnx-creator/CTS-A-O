#!/usr/bin/env python3
"""Render a self-contained, bounded-DOM report from an exact CTS session/audit bundle."""
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
audit = json.loads((source / 'main-audit.json').read_text())
raw = json.loads((source / 'raw.json').read_text())
session = json.loads((source / 'session.json').read_text())
parity = json.loads((source / 'parity.json').read_text())
qualified_path = source / 'qualified-parity.json'
qualified = json.loads(qualified_path.read_text()) if qualified_path.exists() else None
protocol = json.loads((source / 'protocol.json').read_text())
diagnostic = protocol.get('study', {}).get('experiment', '').startswith('retrospective diagnostic only:')
if qualified and (qualified['retainedIdentical'] != qualified['afterTapes'] or
                  qualified['baselineTapes'] - qualified['afterTapes'] != len(qualified['removed']) or
                  any(r['baseAllowed'] for r in qualified['removed']) or
                  any(not x['identical'] for x in qualified['stages'].values())):
    raise ValueError('qualified baseline comparison is incomplete')
comparison = ({'ok': True} if qualified else {'ok': None} if diagnostic else json.loads((source / 'comparison.json').read_text()))
orders = [json.loads(x) for x in (source / 'main-audit-orders.jsonl').read_text().splitlines() if x]
key = lambda x: (x['cfg'], x.get('sym', x.get('symbol')), x['side'], x['entryT'], x['exitT'])
trades = {}
for chunk in raw['arraySidecars']['trades']['chunks']:
    for line in (source / chunk['path']).read_text().splitlines():
        record = json.loads(line)[2]
        k = key(record)
        if k in trades: raise ValueError('duplicate funded execution identity')
        trades[k] = record
for row in orders:
    tr = trades.pop(key(row))
    row.update({k: tr.get(k) for k in ('entry', 'exit', 'vol', 'r')})
if trades or len(orders) != audit['entryChecks'] or len(orders) != parity['totalExecutions']:
    raise ValueError('unmatched funded orders')
configs = [{**{k:c[k] for k in ('cfg','kind','range','initiallySelected','initialBaseAllowed','sourceCloses','subsequent')},
    'initial': {k:c['initial'].get(k) for k in ('ok','fail','n','gp','gl','measuredPf')}} for c in audit['configs']]
data = {'study':audit['study'], 'window':audit['window'], 'counts':audit['counts'],
  'execution':audit['total'], 'initial':audit['initialSelection'], 'readiness':audit['sourceOwnConfigReadiness'],
  'configs':configs, 'orders':orders, 'open':raw['openEnd'], 'byReason':audit['byReason'],
  'baseEvaluated':raw['engine']['baseEvaluated'], 'basePassed':raw['engine']['basePassed'],
  'baseByRange':raw['engine']['baseByRange'], 'evalAfterBase':session['evalAfterBase'], 'evalStats':session['evalStats'],
  'parity': {k:parity[k] for k in ('ok','matched','missingCount','mismatchCount')},
  'comparisonOk':comparison['ok'], 'qualifiedComparison':qualified, 'diagnosticExperiment':protocol.get('study') if diagnostic else None,
  'resources':json.loads((source / 'resources.json').read_text())}
encoded = json.dumps(data, separators=(',', ':'), ensure_ascii=False, allow_nan=False).replace('<', '\\u003c')
template = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CTS-A-O · 12-hour execution audit</title>
<style>
:root{font:15px/1.5 system-ui,sans-serif;color:#142d39;background:#f1f5f5}body{max-width:1500px;margin:auto;padding:26px}h1{font-size:30px;line-height:1.2}h2{margin-top:30px}p{max-width:1120px}.eyebrow{font-size:12px;letter-spacing:.12em;color:#3b6374}.warning{border-left:4px solid #b03838;background:#ffedeb;padding:14px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.card,section{background:white;border:1px solid #d0dfe3;border-radius:8px;padding:15px}.card b{display:block;font-size:26px}.muted{color:#4c6673}.scroll{overflow:auto;max-height:620px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:8px;border-bottom:1px solid #dce5e8;white-space:nowrap;text-align:right}th{position:sticky;top:0;background:#e8f0f2;z-index:1}th:first-child,td:first-child{text-align:left}.identity{font:11px ui-monospace,monospace;white-space:normal;min-width:220px;overflow-wrap:anywhere}.controls{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}input,select,button{font:inherit;padding:7px;border:1px solid #a0b7c0;border-radius:4px;background:white}button:disabled{opacity:.4}code{overflow-wrap:anywhere}a{color:#165d7d}@media(max-width:600px){body{padding:14px}h1{font-size:24px}}@media print{.scroll{max-height:none}.controls{display:none}th{position:static}}
</style></head><body><div class="eyebrow">CTS-A-O · OFFLINE REPLAY · 30 OCTOBER 2026</div><h1>Validation and execution audit</h1>
<p>Eight symbols · Prehistory: <strong>8 October 12:00–9 October 00:00 UTC</strong> · Trading: <strong>9 October 00:00–12:00 UTC</strong> · modeled round-trip cost: <strong>0.15%</strong>.</p>
<div class="warning"><strong>Not ready for live trading.</strong> This previously examined market window is retrospective. A controlled conflict case reproduces a raw-candidate versus processed-set validation mismatch; the persistent Base → Main → Real adapter is not integrated. Its regression remains an expected failure. The results below are modeled; exchange PF is unavailable. A positive aggregate does not establish consistently positive hours or future performance.</div>
<h2>Measured cohorts</h2><div id="cards" class="cards"></div><p class="muted">Initial validation is a single snapshot, not the subsequent execution sample. The historical mean excludes true no-loss sets and labels them separately. PF = gross positive unit returns ÷ gross negative unit returns; exactly 1.00 is neutral. Empty or flat samples are unavailable, not neutral. NL = positive returns without any losses; it is not the engine’s finite gate score.</p>
<section><h3>Scope and checks</h3><p>All enabled Base indication/bot combinations were requested, with a bounded protection grid and the existing EMA, MACD and RSI Signal sources. Report coverage: 74/76 checks. Only 20/21 indication kinds and 27,284/42,366 expected combinations were evaluated. The low-range indication kind was not evaluated; 15m and 30m lanes had too few bars for the 120-bar production minimum in this history. Long-side closes: 294; short-side closes: 0. Other strategy types with no closes have no execution PF.</p><p>All 294 funded-model settled orders matched the same exact source identities and returns after removing the external sizing multiplier once. Baseline and repaired code produced identical selections, candidate histories, closes, allocations and holdings in this window; the unknown-return fix is not the cause of this window’s PF. 110 ordinary trailing closes were price/cost checked; DCA cost behavior is covered by separate deterministic tests. Intrabar ordering and exchange fills were not verified here.</p><p>Worst reported processing slice: 1,954 ms; target: &lt;500 ms. Peak RSS: 642.1 MiB. Full run exited with status 1 because the two coverage checks failed.</p></section>
<h2>Hourly model execution heatmap</h2><p class="muted">Settled orders only; each hour is (start, end], UTC. Red is PF below 1, green is above 1 or no-loss, neutral is 1, gray is empty. Counts are orders.</p><div class="scroll"><table id="heat"></table></div>
<h2>Strategy × range</h2><div class="scroll"><table id="strategies"></table></div>
<h2>Close reasons and holding times</h2><p>Four DCA stop-loss closes account for 0.338536 of 0.369983 total modeled unit gross losses (91.5%). This identifies where losses occurred in this sample; it does not establish why the market moved or prove the cause of other PF drops. No time exit occurred.</p><div class="scroll"><table id="reasons"></table></div>
<h2>Base ranges and initial post-Base validation</h2><p class="muted">Ranges and initial config rows use different denominators and are not additive. Signal activation has its own path.</p><div class="scroll"><table id="base"></table></div><div class="scroll"><table id="validation"></table></div>
<h2>All calculated config tapes</h2><p class="muted">These are the 818 recorded post-Base tapes, not every Base cell. The legacy diagnostic applies engine configEval to each tape; Signal selection has a separate path. First-seat flags describe the engine only. Search preserves every config; 100 are rendered per page.</p><div class="controls"><input id="configQuery" type="search" placeholder="Search config, strategy or range" aria-label="Search configs"><button id="configPrev">Previous</button><span id="configPage"></span><button id="configNext">Next</button></div><div class="scroll"><table id="configs"></table></div>
<h2>All modeled settled orders</h2><p class="muted">Every allocated close, including losses. Prices are modeled execution prices; ladder returns can include multiple legs. External multiplier is separate from unit return. This audit checks the current legacy gates, not the unimplemented stage lineage.</p><div class="controls"><input id="orderQuery" type="search" placeholder="Search config, symbol or reason" aria-label="Search orders"><button id="orderPrev">Previous</button><span id="orderPage"></span><button id="orderNext">Next</button><button id="download">Download all orders as JSONL</button></div><div class="scroll"><table id="orders"></table></div>
<h2>Open model orders at the end</h2><div class="scroll"><table id="open"></table></div><h2>Provenance</h2><pre id="provenance"></pre>
<script>const D=__DATA__;const O=D.orders;const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};const fmt=(x,n=3)=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(n):'—';const time=t=>new Date(t).toISOString().replace('T',' ').replace('.000Z',' UTC');const pct=(a,b)=>b?fmt(100*a/b,2)+'%':'—';
function table(id,heads,rows){const e=document.getElementById(id);e.replaceChildren();const h=el('thead'),tr=el('tr');heads.forEach(s=>tr.append(el('th',s)));h.append(tr);e.append(h);const b=el('tbody');for(const row of rows){const r=el('tr');for(const [i,v] of row.entries()){const c=el('td',v&&typeof v==='object'?v.text:v);if(v&&typeof v==='object'&&v.color)c.style.background=v.color;if(i===0&&(id==='orders'||id==='configs'||id==='open'))c.className='identity';r.append(c)}b.append(r)}e.append(b)}
function sums(xs){let gp=0,gl=0;for(const x of xs){if(!Number.isFinite(x.unitReturn))return {n:xs.length,state:'unknown'};if(x.unitReturn>0)gp+=x.unitReturn;else gl-=x.unitReturn}return {n:xs.length,gp,gl,pf:gl>0?gp/gl:null,state:!xs.length?'empty':gl===0&&gp>0?'no-loss':gl===0?'flat':'ratio'}}
function pf(s){return s.state==='no-loss'?'NL':s.state==='ratio'?fmt(s.pf):'—'}function cell(s){return {text:pf(s)+' · '+s.n,color:s.state==='ratio'?(s.pf<1?'#f9dedb':s.pf>1?'#dff1e4':'#edf1f2'):s.state==='no-loss'?'#dff1e4':'#edf1f2'}}
const cards=[['Base pass',D.basePassed+' / '+D.baseEvaluated+' · '+pct(D.basePassed,D.baseEvaluated)],['Initial engine validation',D.evalStats.passed+' / '+D.evalStats.evaluated+' · '+pct(D.evalStats.passed,D.evalStats.evaluated)],['Historical finite mean',fmt(D.initial.finiteMeanPf)+' · '+D.initial.finiteSets+' sets'],['No-loss validated sets',D.initial.noLossSets+' separate'],['Closed model PF',fmt(D.execution.exactPf)],['Orders: opened / closed / held',D.counts.openedOrders+' / '+D.counts.settledOrders+' / '+D.counts.openOrders],['Positions: opened / closed / held',D.counts.openedPositions+' / '+D.counts.closedPositions+' / '+D.counts.openPositions],['Exchange PF','Unavailable']];for(const [label,value] of cards){const c=el('div');c.className='card';c.append(el('span',label),el('b',value));document.getElementById('cards').append(c)}
const kinds=['normal','trailing','trailing-only','dca','dca-active','axis','exit'];const ranges=['mc','mn','sh','gn','lg','wide','sig'];const hours=Array.from({length:Math.ceil((D.window.endT-D.window.startT)/3600000)},(_,i)=>D.window.startT+i*3600000);table('heat',['UTC hour',...kinds],hours.map(t=>[time(t),...kinds.map(k=>cell(sums(O.filter(x=>x.kind===k&&x.exitT>t&&x.exitT<=t+3600000))))]));table('strategies',['Strategy',...ranges.map(r=>r+' · PF / N')],kinds.map(k=>[k,...ranges.map(r=>cell(sums(O.filter(x=>x.kind===k&&x.range===r))))]));
const reasons=[...new Set(O.map(x=>x.kind+' | '+x.reason))].sort();table('reasons',['Strategy | reason','Orders','PF','Mean hold min','Min','Max'],reasons.map(k=>{const xs=O.filter(x=>x.kind+' | '+x.reason===k),h=xs.map(x=>x.holdMinutes);return[k,xs.length,pf(sums(xs)),fmt(h.reduce((a,b)=>a+b,0)/h.length,1),Math.min(...h),Math.max(...h)]}));
table('base',['Range','Evaluated','Passed','Validated %','Passing mean PF'],D.baseByRange.map(x=>[x.range,x.evaluated,x.passed,pct(x.passed,x.evaluated),fmt(x.pfPassedMean)]));table('validation',['Range | strategy','Calculated','Type off','Evaluated','Passed','Validated %'],Object.entries(D.evalAfterBase).map(([k,x])=>{const n=x.configs-(x['type off']??0)-(x['base off']??0);return[k,x.configs,x['type off']??0,n,x.passed,pct(x.passed,n)]}));
function paginator(prefix,all,draw){let page=0,filtered=all;const q=document.getElementById(prefix+'Query');function go(){const pages=Math.max(1,Math.ceil(filtered.length/100));page=Math.min(page,pages-1);draw(filtered.slice(page*100,(page+1)*100));document.getElementById(prefix+'Page').textContent='Page '+(page+1)+' / '+pages+' · '+filtered.length+' rows';document.getElementById(prefix+'Prev').disabled=page===0;document.getElementById(prefix+'Next').disabled=page>=pages-1}q.addEventListener('input',()=>{const term=q.value.trim().toLowerCase();filtered=all.filter(x=>JSON.stringify(x).toLowerCase().includes(term));page=0;go()});document.getElementById(prefix+'Prev').onclick=()=>{page--;go()};document.getElementById(prefix+'Next').onclick=()=>{page++;go()};go()}
paginator('config',D.configs,xs=>table('configs',['Config','Kind','Range','Base allowed','First engine seat','Diagnostic verdict','Diagnostic N','Diagnostic PF','Later closes','Later PF'],xs.map(x=>[x.cfg,x.kind,x.range,x.initialBaseAllowed?'yes':'no',x.initiallySelected?'yes':'no',x.initial.ok?'passed':x.initial.fail,x.initial.n,x.initial.gp>0&&x.initial.gl===0?'NL':fmt(x.initial.measuredPf),x.subsequent.n,x.subsequent.noLoss?'NL':fmt(x.subsequent.pf)])));
paginator('order',O,xs=>table('orders',['Config','Symbol','Side','Entry UTC','Exit UTC','Entry price','Exit price','Hold min','Reason','Unit return %','Size ×','Legacy checks'],xs.map(x=>[x.cfg,x.symbol,x.side===1?'long':'short',time(x.entryT),time(x.exitT),fmt(x.entry,6),fmt(x.exit,6),x.holdMinutes,x.reason,fmt(x.unitReturn*100,4),fmt(x.externalMultiplier,3),x.failures.length?x.failures.join(','):'passed'])));
table('open',['Config','Symbol','Side','Entry UTC','Entry price','Marked return','Size ×'],D.open.map(x=>[x.cfg,x.sym,x.side===1?'long':'short',time(x.entryT),fmt(x.entry,6),fmt(x.mtmR*100,4)+'%',fmt(x.mult,3)]));document.getElementById('download').onclick=()=>{const a=el('a'),url=URL.createObjectURL(new Blob([O.map(x=>JSON.stringify(x)).join('\n')+'\n'],{type:'application/x-ndjson'}));a.href=url;a.download='cts-model-settled-orders.jsonl';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};document.getElementById('provenance').textContent=JSON.stringify({study:D.study,parity:D.parity,baselineComparison:D.comparisonOk,resources:D.resources},null,2);
</script></body></html>'''
if qualified or diagnostic:
    if qualified and len(configs) != qualified['afterTapes']:
        raise ValueError('report config count differs from qualified tape comparison')
    if diagnostic:
        trailing = [o for o in orders if o['kind'] == 'trailing-only']
        trail_closes = sum(o['reason'] == 'trail' for o in trailing)
        stop_closes = sum(o['reason'] == 'sl' for o in trailing)
        template = template.replace('Eight symbols · Prehistory:', '<strong>Research-only comparison: Base/config minimum closes 10 and validation Last-10 instead of 12; these are not the default settings.</strong> Eight symbols · Prehistory:')
        template = template.replace('Long-side closes: 294; short-side closes: 0.',
            f"Long-side closes: {sum(o['side'] == 1 for o in orders)}; short-side closes: {sum(o['side'] == -1 for o in orders)}.")
        template = template.replace('All 294 funded-model settled orders matched the same exact source identities and returns after removing the external sizing multiplier once. Baseline and repaired code produced identical selections, candidate histories, closes, allocations and holdings in this window; the unknown-return fix is not the cause of this window’s PF. 110 ordinary trailing closes were price/cost checked;',
            f"All {len(orders)} funded-model settled orders matched their exact source identities and returns after removing the external sizing multiplier once. This is a changed-gate experiment, not an identical-settings parity comparison. {audit['ordinaryCostChecked']} ordinary closes were price/cost checked;")
        template = template.replace('Four DCA stop-loss closes account for 0.338536 of 0.369983 total modeled unit gross losses (91.5%). This identifies where losses occurred in this sample; it does not establish why the market moved or prove the cause of other PF drops. No time exit occurred.',
            f'This research-only run is not a live recommendation. Trailing-only had {len(trailing)} modeled closes: {trail_closes} trailing exits and {stop_closes} stop exits. Its historical and execution PFs are different cohorts; inspect the hourly heatmap.')
    else:
        template = template.replace('Baseline and repaired code produced identical selections, candidate histories, closes, allocations and holdings in this window; the unknown-return fix is not the cause of this window’s PF.',
            f"The baseline and repaired code produced identical funded closes, allocations, holdings, Base pairs, initial selection and validation steps. Of {qualified['baselineTapes']} baseline tapes, {qualified['retainedIdentical']} were retained identically and {len(qualified['removed'])} unselected, unqualified trailing-only tapes were removed. This comparison does not establish the cause of this window’s PF.")
    timing = re.search(r'worst slice of the last 60 s (\d+) ms', (source / 'run.log').read_text())
    if not timing:
        raise ValueError('run log is missing worst processing slice')
    peak = data['resources']['peakChildRssKiB'] / 1024
    template = template.replace('Worst reported processing slice: 1,954 ms; target: &lt;500 ms. Peak RSS: 642.1 MiB.',
        f'Worst reported processing slice: {int(timing.group(1)):,} ms; target: &lt;500 ms. Peak child RSS: {peak:.1f} MiB.')
    template = template.replace('These are the 818 recorded post-Base tapes', f"These are the {len(configs)} recorded post-Base tapes")
    no_tp_base = [c for c in configs if c['kind'] == 'trailing-only' and c['initialBaseAllowed']]
    no_tp_pass = sum(c['initial']['ok'] for c in no_tp_base)
    message = (f'At the initial snapshot, {no_tp_pass}/{len(no_tp_base)} Base-target-allowed trailing-only configs passed. {len(trailing)} later modeled orders closed; their execution PF appears in the strategy table. This is not exchange PF.' if diagnostic else
        'At the initial snapshot, 0/8 Base-target-allowed trailing-only configs passed: each had 8–11 closes against the 12-close minimum. No trailing-only modeled orders closed in this window; their execution PF is unavailable.')
    template = template.replace('<h2>All calculated config tapes</h2>', f'<h2>All calculated config tapes</h2><p>{message}</p>')
    template = template.replace('baselineComparison:D.comparisonOk,resources:D.resources',
        'baselineQualifiedComparison:D.qualifiedComparison,diagnosticExperiment:D.diagnosticExperiment,resources:D.resources')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(template.replace('__DATA__', encoded))
print(json.dumps({'file':str(target),'orders':len(orders),'configs':len(configs),'bytes':target.stat().st_size}))
