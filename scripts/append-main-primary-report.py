#!/usr/bin/env python3
"""Append audited own-Main-window sensitivity and complete processed order listings to the grid report."""
import base64,gzip,hashlib,json,re,sys
from pathlib import Path
if len(sys.argv)!=8:raise SystemExit('usage: append-main-primary-report.py REPORT_HTML SIX_STUDY_DIRECTORIES')
report=Path(sys.argv[1]);text=report.read_text();match=re.search(r'(<script id="payload" type="application/octet-stream">)([^<]+)(</script>)',text)
assert match
data=json.loads(gzip.decompress(base64.b64decode(match[2])));studies=[]
names=['main','inverseMain','real','inverseReal','active','inverseActive']
for directory in sys.argv[2:]:
    path=Path(directory);p=json.loads((path/'protocol.json').read_text());r=json.loads((path/'results.json').read_text());a=json.loads((path/'audit.json').read_text());trace=json.loads((path/'trace.json').read_text())
    assert a['status']=='pass' and trace['status']=='pass' and a['contexts']==4800 and a['cases']==8
    contexts=[];orders=[]
    with gzip.open(path/'contexts.jsonl.gz','rt') as source:
        for line in source:
            c=json.loads(line);ci=len(contexts);contexts.append([c['cfg'],c['sym'],c['side'],c['tf'],c['kind'],c['relation']]);dictionary=c['dictionary']
            for bkey,b in c['bases'].items():
                primary=int(bkey.split('|')[0])
                for choice,case in b['cases'].items():
                    main_n,real_n=map(int,choice.split('|'))
                    for name in names:
                        wrapper=b[name] if name in ['main','inverseMain'] else case[name];result=dictionary[wrapper['data']]
                        decisions=dictionary[b['mainDecisions' if name=='main' else 'inverseDecisions']] if name in ['main','inverseMain'] else dictionary[case['decisions'][name]]
                        decisions={d['entryT']:d for d in decisions}
                        for closed,t in [(True,t) for t in result['trades']]+([(False,result['open'])] if result.get('open') else []):
                            if not p['start']<=t['entryT']<p['end']:continue
                            decision=decisions.get(t['entryT']);assert decision and decision['state']=='qualified'
                            gate=[decision['primary']['n'],decision['primary']['pf'],decision['secondary'][0]['n'] if decision['secondary'] else None,decision['secondary'][0]['pf'] if decision['secondary'] else None] if 'primary' in decision else [p['mainPrimaryN'],decision['primaryPf'],'negative mean',decision['mean']]
                            orders.append([ci,primary,main_n,real_n,names.index(name),t['side'],t['entryT'],t['exitT'] if closed else None,t['entry'],t['exit'] if closed else None,t['r'] if closed else None,t.get('reason','held'),gate])
    assert len(contexts)==4800
    studies.append({'protocol':p,'results':r,'audit':a,'trace':trace,'contexts':contexts,'orders':orders})
    print(p['range'],p['mainPrimaryN'],len(orders),'listing rows',flush=True)
data['mainPrimarySensitivity']=studies
payload=base64.b64encode(gzip.compress(json.dumps(data,separators=(',',':')).encode(),compresslevel=9)).decode();text=text[:match.start(2)]+payload+text[match.end(2):]
section='''<h2>Main’s own-history window · separate sensitivity test</h2>
<p>The original grid above retains Main primary N = 50. These additional 48 cases test Main primary N = 15/25, each with secondary 15/25, Base20+15 or Base50+15 and Real15/25. Every stage still validates only its immediate predecessor’s own processed closes. Threshold1.1 and all prices, costs, holds and source calculations remain fixed. A shorter own-history requirement can create Active orders; it does not establish positive future returns. No production default is promoted.</p>
<div class="scroll"><table><thead><tr><th>Range / Main primary</th><th>Base / Main second / Real</th><th>Base passed / evaluated</th><th>Historical Base PF</th><th>Later Main PF</th><th>Real positions O/C/H</th><th>Real orders O/C/H</th><th>End Active positions O/C/H</th><th>End Active orders O/C/H</th><th>End Active PF</th><th>Main50 end Active orders</th></tr></thead><tbody id="sensSummary"></tbody></table></div>
<h2>Every sensitivity stage and order</h2><div class="controls"><label>Range / Main primary<select id="sensStudy"></select></label><label>Base primary / Main second / Real<select id="sensCase"></select></label><label>Stage<select id="sensStage"><option>active</option><option>real</option><option>main</option><option>inverseActive</option><option>inverseReal</option><option>inverseMain</option></select></label><label>Find symbol / config / direction<input id="sensSearch" type="search" placeholder="BTC, long, trailing…"></label></div>
<div id="sensScope" class="note"></div><div class="scroll"><table><thead><tr><th>Stage</th><th>Passed / attempts</th><th>Passed %</th><th>Own positions O/C/H</th><th>Own orders O/C/H</th><th>Subsequent PF</th><th>Reasons</th></tr></thead><tbody id="sensStages"></tbody></table></div>
<div class="scroll"><table><thead><tr><th>Type / timeframe</th><th>Stage</th><th>Positions O/C/H</th><th>Orders O/C/H</th><th>Subsequent PF</th></tr></thead><tbody id="sensGroups"></tbody></table></div>
<div class="pager"><button id="sensPrev">Previous</button><span id="sensPage"></span><button id="sensNext">Next</button></div>
<div class="scroll"><table><thead><tr><th>Own Base configuration / symbol</th><th>Direction / type</th><th>Entry Vienna</th><th>Exit Vienna</th><th>Entry / exit prices</th><th>Net return</th><th>Close / hold minutes</th><th>Prior own gate at entry</th></tr></thead><tbody id="sensOrders"></tbody></table></div>
<p>The same market entry can appear in different policy cases; case totals are not an additive funded book. Initial checkpoint validation, entry-time qualification, subsequent model results and venue fills remain distinct samples. All source IDs and raw decisions are retained in the separate sensitivity evidence.</p>
'''
marker='<h2>Verification, selection and limits</h2>';assert marker in text;text=text.replace(marker,section+marker,1)
script=r'''
let sensitivityPage=0;
const sensKey=c=>`${c.basePrimaryN}|${c.baseSecondaryN}|${c.mainSecondaryN}|${c.realN}`;
const sensRange=r=>({mc:'Micro · 15m',mn:'Minimal · 30m',sh:'Short · 60m'}[r]);
function initSensitivity(){
 const studies=DATA.mainPrimarySensitivity;
 el('sensStudy').innerHTML=studies.map((s,i)=>`<option value="${i}">${sensRange(s.protocol.range)} · Main primary ${s.protocol.mainPrimaryN}</option>`).join('');
 el('sensSummary').innerHTML=studies.flatMap(s=>s.results.cases.map(c=>{const a=s.audit.effectiveActive.find(a=>a.case===sensKey(c)),baseline=DATA.datasets.find(d=>d.protocol.range===s.protocol.range),original=baseline.audit.effectiveActive.find(a=>a.case===sensKey(c));return row([`${sensRange(s.protocol.range)} / ${s.protocol.mainPrimaryN}`,`${c.basePrimaryN}+15 / ${c.mainSecondaryN} / ${c.realN}`,`${c.historical.base}/4800 (${pct(c.historical.basePercent)})`,c.historical.baseNoLoss?'no losses':num(c.historical.basePrimaryPf),pf(c.stages.main),pc(c.stages.real),oc(c.stages.real),pc(a),oc(a),pf(a),oc(original)]);})).join('');
 el('sensStudy').addEventListener('change',changeSensitivityStudy);el('sensCase').addEventListener('change',()=>{sensitivityPage=0;renderSensitivity();});
 for(const id of ['sensStage','sensSearch'])el(id).addEventListener(id==='sensSearch'?'input':'change',()=>{sensitivityPage=0;renderSensitivity();});
 el('sensPrev').addEventListener('click',()=>{sensitivityPage--;renderSensitivity();});el('sensNext').addEventListener('click',()=>{sensitivityPage++;renderSensitivity();});changeSensitivityStudy();
}
function changeSensitivityStudy(){const s=DATA.mainPrimarySensitivity[+el('sensStudy').value];el('sensCase').innerHTML=s.results.cases.map((c,i)=>`<option value="${i}">${c.basePrimaryN}+15 / ${c.mainSecondaryN} / ${c.realN}</option>`).join('');sensitivityPage=0;renderSensitivity();}
function renderSensitivity(){
 const si=+el('sensStudy').value,ci=+el('sensCase').value,s=DATA.mainPrimarySensitivity[si],c=s.results.cases[ci],a=s.audit.effectiveActive.find(a=>a.case===sensKey(c)),stage=el('sensStage').value,q=el('sensSearch').value.toLowerCase();
 el('sensScope').textContent=`${sensRange(s.protocol.range)} · Base${c.basePrimaryN}+15 / Main${s.protocol.mainPrimaryN}+${c.mainSecondaryN} / Real${c.realN}. End Active PF ${pf(a)}, positions${pc(a)}, orders${oc(a)} O/C/H. Model only; venue PF unavailable. Historical Base ${c.historical.base}/4800 (${pct(c.historical.basePercent)}), PF ${c.historical.baseNoLoss?'no losses':num(c.historical.basePrimaryPf)}.`;
 el('sensStages').innerHTML=NAMES.map(n=>{const d=c.decisions[n],r=c.stages[n];return row([n,`${d.qualified}/${d.evaluated}`,pct(d.percent),pc(r),oc(r),pf(r),esc(JSON.stringify(r.reasons))]);}).join('');
 el('sensGroups').innerHTML=Object.entries(c.groups).flatMap(([k,g])=>NAMES.map(n=>row([esc(k),n,pc(g[n]),oc(g[n]),pf(g[n])]))).join('');
 const xs=s.orders.filter(o=>o[1]===c.basePrimaryN&&o[2]===c.mainSecondaryN&&o[3]===c.realN&&NAMES[o[4]]===stage&&[...s.contexts[o[0]],o[5]>0?'long':'short'].join(' ').toLowerCase().includes(q)),pages=Math.max(1,Math.ceil(xs.length/50));
 sensitivityPage=Math.max(0,Math.min(sensitivityPage,pages-1));el('sensPage').textContent=`${xs.length.toLocaleString()} orders · page ${sensitivityPage+1}/${pages}`;el('sensPrev').disabled=sensitivityPage===0;el('sensNext').disabled=sensitivityPage+1>=pages;
 el('sensOrders').innerHTML=xs.slice(50*sensitivityPage,50*(sensitivityPage+1)).map(o=>{const ctx=s.contexts[o[0]],g=o[12];return row([`<details><summary>${esc(ctx[1])} · ${esc(ctx[0].slice(0,38))}…</summary>${esc(ctx[0])}<br>${esc(ctx[5])}</details>`,`${o[5]>0?'Long':'Short'} · ${esc(ctx[4])} ${ctx[3]}m`,date(o[6]),date(o[7]),`${num(o[8],8)} / ${num(o[9],8)}`,o[10]===null?'held; excluded':pct(100*o[10]),`${esc(o[11])} · ${o[7]===null?'held':num((o[7]-o[6])/60000,1)}`,`prior N ${g[0]}, PF ${num(g[1])}${g[2]===null?'':`<br>second ${g[2]}: ${num(g[3])}`}`]);}).join('')||row(['No orders in this exact sensitivity selection.']);
 window.CTS_SENSITIVITY_SELECTION={study:si,caseIndex:ci,key:sensKey(c),stage};
}
initSensitivity();
'''
needle="render();el('loading').remove();window.CTS_REPORT_READY=true;";assert needle in text;text=text.replace(needle,script+'\n'+needle,1)
text=text.replace('240 comparisons across three ranges · net unit-return PF','240 grid comparisons + 48 Main-window sensitivity cases · net unit-return PF',1)
report.write_text(text)
manifest_path=report.with_suffix('.manifest.json');m=json.loads(manifest_path.read_text());m.update(bytes=report.stat().st_size,sha256=hashlib.sha256(report.read_bytes()).hexdigest(),sensitivityCases=48,sensitivityContexts=28800,sensitivityOrders=sum(len(s['orders']) for s in studies));manifest_path.write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m),flush=True)
