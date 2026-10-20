#!/usr/bin/env python3
"""Offline HTML with exact charts and frozen evidence; no CDN, PF averaging or loss filtering."""
import argparse, gzip, hashlib, html, io, json, re, subprocess
from datetime import datetime, timezone
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ap=argparse.ArgumentParser()
ap.add_argument('--runs',nargs='+',default=['inverse-20-6h','inverse-20-24h','inverse-20-long'])
ap.add_argument('--out',default='docs/sims/inverse-20-symbol-20261020')
args=ap.parse_args()
sha=lambda b:hashlib.sha256(b).hexdigest()
esc=lambda v:html.escape(str(v),quote=True)
fmt=lambda v,n=3:'—' if v is None else f'{v:,.{n}f}'
read=lambda p:json.loads(Path(p).read_text())
def pf(s):
    if not s.get('n'):return '— · keine Closes'
    if s.get('noLoss'):return 'keine Verluste · kein endlicher PF'
    return fmt(s.get('exactRatio',s.get('pf')))
def utc(t):return datetime.fromtimestamp(t/1000,timezone.utc).strftime('%d.%m. %H:%M UTC')
def table(headers,rows,cls=''):
    return '<div class="scroll"><table class="'+cls+'"><thead><tr>'+''.join('<th>'+esc(v)+'</th>' for v in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>' for row in rows)+'</tbody></table></div>'

runs=[]
for name in args.runs:
    d=Path('runs')/name;p,r=read(d/'protocol.json'),read(d/'result.json')
    assert r['protocolSha256']==sha((d/'protocol.json').read_bytes()),name
    assert p['harnessSha256']==sha(Path('scripts/audit-inverse.mjs').read_bytes()),name
    for path,digest in p['source'].items():assert sha(Path(path).read_bytes())==digest,f'{name}: stale {path}'
    assert not r['qualificationViolations'] and len(p['symbols'])==20,name
    ex=json.loads(gzip.decompress((d/'executions.json.gz').read_bytes()))
    assert len(ex['settled'])==r['settled']['n'],name
    runs.append(dict(name=name,protocol=p,result=r,executions=ex))
assert len({x['protocol']['feedSha256'] for x in runs})==1
assert all(x['protocol']['settings']==runs[0]['protocol']['settings'] for x in runs)
bench=read('runs/inverse-20-bench.json')
assert bench['variants']==114 and len(bench['symbols'])==20
verification={}
for name in ['inverse-20-final-targeted','inverse-20-api-contract','inverse-20-full-core-final']:
    log=Path(f'runs/{name}.log').read_text()
    v={k:float(v) if '.' in v else int(v) for k,v in re.findall(r'ℹ (tests|pass|fail|cancelled|skipped|duration_ms) ([\d.]+)',log)}
    verification[name]=dict(**v,completed='tests' in v,logSha256=sha(log.encode()))
for name in ['typecheck-final','lint','build','ui']:
    log=Path(f'runs/inverse-20-{name}.log').read_text()
    ok={'typecheck-final':'error TS' not in log and '> tsc --noEmit' in log,'lint':not log.strip(),
        'build':'[migrate] DATABASE_URL not set' in log,'ui':log.count('"includeButtonWorks": true')==4}[name]
    verification[name]=dict(passed=ok,logSha256=sha(log.encode()))
ui=read('../inverse-ui-targeted.json')
assert len(ui)==4 and all(not v['errors'] and not v['overflow'] for v in ui)
verification['ui']['surfaces']=ui
bundle=dict(classification='Retrospective virtual-order evidence, not funded-account or live performance proof',
    sourceCheckpoint=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    sourceManifestSha256=sha(json.dumps(runs[0]['protocol']['source'],sort_keys=True).encode()),
    feedProvenance='Previously examined public archive, 1–17 October 2026; overlapping windows, no fresh holdout',
    runs=[{k:v for k,v in x.items() if k!='executions'} for x in runs],benchmark=bench,verification=verification)
out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
Path(str(out)+'.json.gz').write_bytes(gzip.compress(json.dumps(bundle,separators=(',',':')).encode(),mtime=0))
Path(str(out)+'-executions.json.gz').write_bytes(gzip.compress(json.dumps([{k:x[k] for k in ['name','executions']} for x in runs],separators=(',',':')).encode(),mtime=0))

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,
 'axes.edgecolor':'#d1dce2','axes.labelcolor':'#496171','xtick.color':'#496171','ytick.color':'#496171',
 'text.color':'#173142','grid.color':'#e8eef1','figure.facecolor':'white','axes.facecolor':'white','svg.fonttype':'none'})
teal,blue,red,gray='#087f83','#3f62bb','#bc5448','#a4b3bd'
counter=0
def chart(title,sub,draw,wide=False,height=3.5):
    global counter
    counter+=1;plt.rcParams['svg.hashsalt']=f'inverse-{counter}'
    fig,ax=plt.subplots(figsize=(11 if wide else 6.2,height),layout='constrained');draw(fig,ax)
    s=io.StringIO();fig.savefig(s,format='svg',bbox_inches='tight');plt.close(fig)
    return '<article class="chart '+('wide' if wide else '')+'"><h3>'+esc(title)+'</h3><p>'+esc(sub)+'</p>'+s.getvalue()[s.getvalue().index('<svg'):]+'</article>'
def horizontal(ax,labels,values,xlabel):
    y=np.arange(len(labels));ax.barh(y,values,color=[teal if v>0 else red if v<0 else gray for v in values],height=.65)
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlabel(xlabel);ax.axvline(0,color=gray,lw=.8);ax.grid(axis='x');ax.set_axisbelow(True)
def empty(ax,text='Keine abgeschlossenen modellierten Orders'):
    ax.text(.5,.5,text,ha='center',va='center',transform=ax.transAxes,color='#6e828f');ax.set_xticks([]);ax.set_yticks([])
rangeNames={'mc':'Micro','mn':'Minimal','mp':'Minimal plus','sh':'Short','gn':'General','lg':'Long','wide':'Wide'}
panels=[]
for idx,x in enumerate(runs):
    p,r=x['protocol'],x['result'];s,e=r['validatedSnapshots']['start'],r['validatedSnapshots']['end']
    title=f"{p['wf']['simH']}h Replay · {p['wf']['longH']}h Evaluation"+(' · lange Historie' if p['wf']['longH']>24 else '')
    heading=f'<div class="run-heading"><div><span class="eyebrow">Studie {idx+1:02}</span><h2>{esc(title)}</h2><p>{utc(r["startT"])} — {utc(r["endT"])}</p></div><span class="tag">20 Symbole · eingefrorener Replay</span></div>'
    metrics=[('Base bestanden / geprüft',f'{r["baseQualified"]:,} / {r["baseEvaluated"]:,}','Indikation × Lane × Bot; keine Config-Zählung'),
      ('Sets validiert / berechnet',f'{e["passed"]:,} / {e["total"]:,}','End-Snapshot; alle Config-Gates inkl. Last-N'),
      ('PF ausgeführter Closes',pf(r['settled']),f'{r["settled"]["n"]:,} Modell-Closes nach Entry-Gates'),
      ('Stunden + / 0 / −',f'{r["positiveHours"]} / {r["flatHours"]} / {r["negativeHours"]}','Netto Unit-Returns geschlossener Orders')]
    cards='<div class="metrics">'+''.join(f'<div><span>{esc(k)}</span><strong>{esc(v)}</strong><small>{esc(d)}</small></div>' for k,v,d in metrics)+'</div>'
    def validation(fig,ax):
        xx=np.arange(2)
        for j,(k,c,l) in enumerate([('validatedHistory',teal,'Eval-Fenster'),('validatedLastN',blue,'Last-N')]):
            vals=[v[k].get('exactRatio') for v in [s,e]]
            ax.bar(xx+(j-.5)*.32,[v if v is not None else 0 for v in vals],width=.32,color=c,label=l)
            for i,v in enumerate(vals):
                q=[s,e][i][k];label=fmt(v,2) if v is not None else ('verlustfrei' if q['noLoss'] else 'n/a')
                ax.annotate(label,(xx[i]+(j-.5)*.32,v or 0),xytext=(0,6),textcoords='offset points',ha='center',fontsize=8,rotation=0 if v is not None else 90)
        ax.axhline(1,color=red,lw=1,ls='--',label='PF 1');ax.set_xticks(xx,['Start','Ende']);ax.set_ylabel('Gemessener Return-PF');ax.legend(fontsize=8);ax.margins(y=.35)
    def amounts(fig,ax):
        xx=np.arange(2);ax.bar(xx,[s['total'],e['total']],color='#e6edef',label='Post-Base berechnet');ax.bar(xx,[s['passed'],e['passed']],color=teal,label='alle Config-Gates bestanden')
        for i,v in enumerate([s,e]):ax.text(i,v['total'],f'{v["passed"]:,} / {v["total"]:,}',ha='center',va='bottom',fontsize=9)
        ax.set_xticks(xx,['Start','Ende']);ax.set_ylabel('Configs (keine Orders)');ax.margins(y=.25);ax.legend(fontsize=8)
    def hours(fig,ax):
        hs=r['hourly'];xx=np.arange(len(hs));vs=[h['net'] for h in hs]
        ax.bar(xx,vs,color=[teal if v>0 else red if v<0 else gray for v in vs]);ax.axhline(0,color=gray,lw=.8)
        ax.plot(xx,np.cumsum(vs),color=blue,marker='.',lw=1.5,label='kumulierte Return-Summe')
        ax.set_xticks(xx,[datetime.fromtimestamp(h['t']/1000,timezone.utc).strftime('%H:%M') for h in hs],rotation=45,ha='right',fontsize=8)
        ax.set_ylabel('Netto Unit-Return-Summe (Prozentpunkte)');ax.set_xlabel('UTC · Stunde des Abschlusses');ax.legend(fontsize=8)
        if not r['settled']['n']:ax.text(.5,.55,'0 Closes · alle Stunden flach',transform=ax.transAxes,ha='center')
    def directions(fig,ax):
        vals=[r['byDirection'][k] for k in ['long','short']];xx=np.arange(2)
        ax.bar(xx-.18,[v['gp'] for v in vals],.36,color=teal,label='Bruttogewinne');ax.bar(xx+.18,[-v['gl'] for v in vals],.36,color=red,label='Bruttoverluste')
        ax.set_xticks(xx,[f'{l}\nn={v["n"]} · PF {pf(v)}' for l,v in zip(['Long','Short'],vals)],fontsize=8);ax.axhline(0,color=gray,lw=.8);ax.set_ylabel('Unit-Return-Summe (pp)');ax.legend(fontsize=8)
    def symbols(fig,ax):
        vals=list(r['bySymbol'].items());horizontal(ax,[k.replace('-USDT','')+f'  n={v["n"]}' for k,v in vals],[v['net'] for _,v in vals],'Netto Unit-Return-Summe (pp)')
    def coverage(fig,ax):
        tags=['mc','mn','sh','gn','lg'];kinds=['normal','trailing','dca','dca-active','axis'];arr=np.zeros((5,5))
        for i,tag in enumerate(tags):
            for j,kind in enumerate(kinds):
                cs=[c for c in r['coverageMatrix'] if c['range']==tag and c['kind']==kind];n=sum(c['built'] for c in cs);q=sum(c['qualifiedEnd'] for c in cs);arr[i,j]=q/n*100 if n else 0
                ax.text(j,i,f'{q:,} / {n:,}' if n else '—',ha='center',va='center',fontsize=7,color='#173142')
        ax.imshow(arr,cmap='Blues',vmin=0,vmax=100,aspect='auto',alpha=.65);ax.set_xticks(range(5),kinds,rotation=20,ha='right',fontsize=8);ax.set_yticks(range(5),[rangeNames[t] for t in tags]);ax.set_xlabel('Config-Gates bestanden / nach Base gebaut (Ende)')
    def lanes(fig,ax):
        vals=[r['perLane'][str(t)] for t in [1,5,15]];xx=np.arange(3);ax.bar(xx,[v['sourceStates'] for v in vals],color=blue)
        ax.set_xticks(xx,['1m','5m','15m']);ax.set_ylabel('Nichtneutrale Source-Zustände (Rohdaten)')
        for i,v in enumerate(vals):ax.annotate(f'{v["sourceStates"]:,}\n{v["n"]:,} Closes',(i,v['sourceStates']),xytext=(0,4),textcoords='offset points',ha='center',fontsize=8)
        ax.margins(y=.2)
    def distribution(fig,ax):
        ts=x['executions']['settled']
        if not ts:return empty(ax)
        vals=[(t['unitR'] if isinstance(t.get('unitR'),(float,int)) else t['r']/t['mult'])*100 for t in ts if isinstance(t.get('unitR'),(float,int)) or t.get('mult',0)>0]
        if not vals:return empty(ax,'Unit-Evidenz für das Histogramm unbekannt')
        ax.hist(vals,bins=min(40,max(5,int(len(vals)**.5))),color=teal,edgecolor='white');ax.axvline(0,color=red,lw=1);ax.set_xlabel(f'Netto Unit-Return je Close (%) · bekannt {len(vals)}/{len(ts)}');ax.set_ylabel('Closes')
    charts='<div class="charts">'+chart('PF nach Validierung / Last-N',f'Nur bestandene Configs. Last-N {s["requestedLastN"]}; Range Last-N {s["rangeLastN"]}. Überlappende Historien, keine unabhängigen Orders.',validation)+chart('Menge / Von',f'Ausführbare Strategien zusätzlich: Start {s["executablePassed"]}/{s["executable"]}, Ende {e["executablePassed"]}/{e["executable"]}.',amounts)+chart('Stündliche Ergebnisse','Geschlossene Modellorders nach Entry-Gates; Return-Summe ist keine Kontoequity.',hours,True)+chart('Long und Short','Richtungen separat; gepoolter PF qualifiziert keine verlierende Untergruppe.',directions)+chart('Ranges × Schutz- und Strategietypen','Unberechnete Zellen = —; deaktivierte Ausführungsarten können historisch berechnet sein.',coverage)+chart('20 Symbole','Alle Symbole bleiben sichtbar, auch ohne akzeptierte Closes.',symbols,height=6.2)+chart('Source-Berechnung je Zeitrahmen','Rohzustände sind keine bestandenen Configs oder Orders. Roh-PF darf unter 1 liegen.',lanes)+chart('Verteilung akzeptierter Closes','Netto nach Kosten; externe Sizing-Multiplikatoren entfernt. Intrinsisches DCA-Modell bleibt erhalten.',distribution)+'</div>'
    snaps=table(['Snapshot','Sets bestanden/von','Eval-Closes','Eval-PF','Last-N-Closes','Last-N-PF'],[[l,f'{v["passed"]}/{v["total"]}',v['validatedHistory']['n'],pf(v['validatedHistory']),v['validatedLastN']['n'],pf(v['validatedLastN'])] for l,v in [('Start',s),('Ende',e)]])
    samples=table(['Sample','Closes / Marks','PF','Netto Unit-Return (pp)'],[[l,v['n'],pf(v),fmt(v['net'],6)] for l,v in [('Akzeptiert & geschlossen',r['settled']),('Noch offen · Endpoint-Marks',r['endpointMarks']),('Geschlossen + Marks · Diagnose',r['settledPlusMarks'])]])
    matrix=table(['Range','Typ','Lane','Gebaut','Historie > 0','Long-Historie','Short-Historie','Validiert Start/Ende','Ausgef. Configs','Closes'],[[rangeNames.get(c['range'],c['range']),c['kind'],c['lane'],c['built'],c['nonempty'],c['longHistoryCells'],c['shortHistoryCells'],f'{c["qualifiedStart"]}/{c["qualifiedEnd"]}',c['executedConfigs'],c['settled']] for c in r['coverageMatrix']])
    sources=table(['Indikation','Akzeptierte Closes','PF der Closes','Netto (pp)'],[[k,v['n'],pf(v),fmt(v['net'],6)] for k,v in r['byIndication'].items()],'sources')
    hist=table(['Symbol','Lane','Bars','Von','Bis (Close)','Stunden verfügbar'],[[c['sym'],f'{c["tf"]}m',c['bars'],utc(c['firstT']),utc(c['lastCloseT']),fmt((c['lastCloseT']-c['firstT'])/3600000,1)] for c in r['sourceCoverage']])
    fails=table(['Erste nicht bestandene Prüfung','Configs'],sorted(e['failures'].items()))
    panels.append(f'''<section class="run" id="run-{idx}" {'hidden' if idx else ''}>{heading}{cards}{charts}
    <section class="detail"><h3>Exakte Samples und Validierung</h3>{snaps}{samples}<p class="note">PF = Σ positive Netto-Returns / |Σ negative Netto-Returns|; kein Mittelwert einzelner PFs. Verlustfreie Samples haben keinen endlichen gemessenen Quotienten; Engine-Score 4 bleibt eine Konvention. Endpoint-Marks sind keine realisierten Closes. Validierungsfenster teilen sich Marktbeobachtungen; ihre Menge ist keine Zahl unabhängiger Trades.</p></section>
    <details><summary>Vollständige Range-, Typ- und Lane-Matrix</summary>{matrix}</details>
    <details><summary>Alle 114 Indikationen · Ergebnisse nach Entry-Gates</summary><input class="source-search" type="search" aria-label="Indikationen filtern" placeholder="Indikation filtern …">{sources}</details>
    <details><summary>Historie · Quellenabdeckung für 20 Symbole und drei Lanes</summary><p>{esc(p['lastNHistory'])}. Base beginnt erst am {utc(p['evaluationFromT'])}. Ältere Candles dienen explizit Warmup und Auswahlhistorie.</p>{hist}</details>
    <details><summary>Nicht bestandene Config-Prüfungen · End-Snapshot</summary><p>Jede Config zählt an ihrem ersten fehlgeschlagenen Gate. Rohwerte werden nicht entfernt oder positiv geklemmt.</p>{fails}</details>
    <details><summary>Eingefrorene Einstellungen, WF und Herkunft</summary><pre>{esc(json.dumps({'protocolSha256':r['protocolSha256'],'feedSha256':p['feedSha256'],'harnessSha256':p['harnessSha256'],'wf':p['wf'],'settings':p['settings']},ensure_ascii=False,indent=2))}</pre></details></section>''')

def performance_plot(fig,ax):
    xx=np.arange(len(runs));bottom=np.zeros(len(runs))
    for key,color in [('base',blue),('tapes','#5ca3c0'),('walk',teal),('reporting','#b0bfc7')]:
        vals=[x['result']['timingMs'][key]/1000 for x in runs];ax.bar(xx,vals,bottom=bottom,label=key,color=color);bottom+=vals
    ax.set_xticks(xx,[f'{x["protocol"]["wf"]["simH"]}h / {x["protocol"]["wf"]["longH"]}h' for x in runs]);ax.set_ylabel('Sekunden');ax.legend(fontsize=8)
    for i,x in enumerate(runs):ax.annotate(f'{bottom[i]:.1f}s\nRSS {x["result"]["rssMaxMiB"]:.0f} MiB',(i,bottom[i]),xytext=(0,5),textcoords='offset points',ha='center',fontsize=8)
    ax.margins(y=.25)
perf=chart('Laufzeit und Peak-Speicher','Base / Config-Aufbau / Replay / Bericht. Gleicher Host unter paralleler Testlast; keine garantierte Live-Latenz.',performance_plot,True)
overviewRows=[[x['name'],f'{x["result"]["baseQualified"]}/{x["result"]["baseEvaluated"]}',f'{x["result"]["passingSetsAtEnd"]}/{x["result"]["tapes"]}',x['result']['settled']['n'],pf(x['result']['settled']),f'{x["result"]["byDirection"]["long"]["n"]}/{x["result"]["byDirection"]["short"]["n"]}',f'{x["result"]["positiveHours"]}/{x["result"]["flatHours"]}/{x["result"]["negativeHours"]}',fmt(x['result']['timingMs']['total']/1000,2),fmt(x['result']['rssMaxMiB'],1)] for x in runs]
overview=table(['Studie','Base bestanden/von','Validiert Ende/von','Closes','PF Closes','Long/Short','Stunden +/0/−','Dauer s','RSS MiB'],overviewRows)
checks=table(['Prüfung','Status','Tests','Bestanden','Fehler'],[[k,('vollständig' if v.get('completed') else 'unvollständig') if 'completed' in v else ('bestanden' if v.get('passed') else 'fehlgeschlagen'),v.get('tests','—'),v.get('pass','—'),v.get('fail','—')] for k,v in verification.items()])
grid=table(['Range','TP-Preisdistanz','SL/TP','Normal / Trailing Zellen','Lane-Floor'],[
 ['Micro','0,35–0,95%; netto 0,20–0,80%','1–5; Schritt 0,25','238 / 714','5m'],
 ['Minimal','0,80–1,60%; Schritt 0,10%','1,5–3; Schritt 0,25','126 / 378','1m'],
 ['Short','1,80–2,80%; Schritt 0,20%','1–2,5; Schritt 0,25','84 / 252','15m'],
 ['General','3,00–4,40%; Schritt 0,20%','0,25–1,5; min. SL 1%','96 / 288','15m'],
 ['Long','4,60–6,40%; Schritt 0,20%','0,25–1,5; min. SL 1,6%','120 / 360','15m']])
css='''*{box-sizing:border-box}body{margin:0;background:#eef3f5;color:#173142;font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}header{background:#102f40;color:white;padding:36px max(24px,calc((100vw - 1300px)/2)) 32px}header p{color:#c4d8df;max-width:950px}h1{font-size:clamp(30px,4vw,48px);line-height:1.13;margin:12px 0 16px;font-weight:650;letter-spacing:-1.4px}h2{font-size:27px;line-height:1.2;margin:8px 0}h3{font-size:17px;margin:0 0 7px;line-height:1.3}p{margin:8px 0 18px}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:2px;font-weight:700;color:#5cc5c5}main{max-width:1348px;margin:auto;padding:24px}nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:22px}select,button,input{font:inherit;border:1px solid #c2d3db;border-radius:6px;padding:10px 13px;background:white;color:#173142}button{cursor:pointer}select{max-width:100%}input{margin:14px 0;width:min(100%,400px)}.rule{border-left:4px solid #087f83;background:#e1f1f0;padding:18px 22px;border-radius:4px;margin:0 0 24px}.rule strong{display:block;margin-bottom:6px}.run-heading{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.run-heading p{color:#617987}.tag{font-size:12px;border:1px solid #c0d1d9;border-radius:100px;padding:7px 12px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:18px 0 24px}.metrics>div{padding:20px;background:white;border-top:3px solid #087f83;border-radius:6px}.metrics span,.metrics small{display:block;color:#617987;font-size:12px}.metrics strong{display:block;font-size:clamp(18px,1.9vw,29px);line-height:1.25;margin:10px 0;overflow-wrap:anywhere}.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.chart{background:white;border:1px solid #dfe8ec;border-radius:7px;padding:22px;min-width:0}.chart p{font-size:12px;color:#617987;min-height:36px}.chart svg{width:100%;height:auto;display:block}.wide{grid-column:1/-1}.detail,details,.shared{background:white;border:1px solid #dfe8ec;border-radius:7px;margin-top:20px;padding:22px}.shared .chart{border:0;padding:0}.scroll{max-width:100%;overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap;margin:12px 0}th{text-align:left;border-bottom:2px solid #c5d6de;color:#4b6879;font-weight:650;padding:10px}td{border-bottom:1px solid #e7eef1;padding:9px 10px}tbody tr:hover{background:#f1f8f8}.note{font-size:12px;color:#617987;margin:16px 0 0}summary{font-weight:650;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6f8;padding:18px;font-size:11px;max-height:600px;overflow:auto}.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#b6d8e0;margin:16px 0}.legend span:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#5cc5c5;margin-right:7px}footer{color:#617987;font-size:11px;padding:26px 0;overflow-wrap:anywhere}[hidden]{display:none!important}@media(max-width:760px){main{padding:14px}header{padding:28px 20px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metrics>div{padding:14px}.charts{grid-template-columns:1fr}.chart{padding:14px}.chart p{min-height:0}.detail,details,.shared{padding:16px}.tag{font-size:10px}h2{font-size:23px}nav>*{width:100%}}@media print{body{background:white}header{background:white;color:#173142;padding:20px}header p{color:#496171}nav,button{display:none}main{padding:0}.run[hidden]{display:block!important;break-before:page}.chart,details,.detail{break-inside:avoid}.scroll{overflow:visible}table{white-space:normal}.metrics{grid-template-columns:repeat(2,1fr)}}'''
options=''.join(f'<option value="{i}">{esc(x["name"])}</option>' for i,x in enumerate(runs))
data=json.dumps(bundle,separators=(',',':'),ensure_ascii=False).replace('<','\\u003c')
doc=f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CTS-A-O · Inverse · 20-Symbol Evaluationsbericht</title><style>{css}</style></head><body>
<header><span class="eyebrow">CTS-A-O / Research & Evaluation / 20. Oktober 2026</span><h1>Inverse.<br>Quellen, Gates und Ergebnisse.</h1><p>114 eigenständige Indikationen · 20 Symbole · 1 / 5 / 15 Minuten. Vollständige Standard-Ranges mit Normal TP/SL und Trailing, Long und Short sowie explizit längere Historie.</p><div class="legend"><span>Return-PF nach Kosten</span><span>Last-N-validierte Sets</span><span>Menge / Von je Sample</span><span>Quellen und Ergebnisse hash-verifiziert</span></div></header>
<main><aside class="rule"><strong>Systemweite Regel · für alle Typen</strong>PF unter 1 ist bei ungefilterten Source- und Berechnungsergebnissen normal. Erst ab der Stage-Base-Evaluation gelten die konfigurierten PF-Gates über 1. Validierte Ergebnisse enthalten ausschließlich bestandene Sets; spätere ausgeführte Orders werden vollständig einschließlich Verlusten ausgewertet.</aside>
<nav><label for="run-select">Studie</label><select id="run-select">{options}</select><button id="download">Evidenz als JSON speichern</button><button onclick="window.print()">Druckansicht / PDF</button></nav>
{''.join(panels)}
<section class="shared"><h2>Studienvergleich und Performance</h2><p>Überlappende Zeiträume desselben bereits untersuchten öffentlichen Archivs. Studien werden nicht addiert und sind kein unabhängiger Holdout. Die Messung umfasst virtuelle Orders vor Kontoallokation.</p>{overview}{perf}<p>Calculation-Benchmark: {bench['barValues']:,} Zustandswerte, 60 Serien, 120h. Cold <strong>{fmt(bench['coldMs'],1)} ms</strong>; warm kompletter Cache-Pass <strong>{fmt(bench['warmMeanPassMs'],3)} ms</strong> (100 Wiederholungen); Peak RSS <strong>{fmt(bench['peakRssMiB'],1)} MiB</strong>. Kein Nachweis für Live-Ticklatenz oder Börsen-Orderdurchsatz.</p></section>
<section class="shared"><h2>Welche Configs werden verwendet?</h2><p>Die gewöhnlichen Produktions-Ranges gelten auch für Inverse. Trailing-Abstände: 0 / 0,25 / 0,5 / 0,75 × TP; 0 bedeutet Normal TP/SL. Haltedauer 16h oder 24h. Die Zellenzahlen verwenden die effektiven, deduplizierten Floors des Referenzgrids.</p>{grid}<p>38 Gegensignal-/Bestätigungsvarianten aus 19 bekannten Quellen, 48 Math-/Marktvarianten über 10/20/40/80 Bars, 16 eigene Micro-Identitäten und 12 BTC/ETH-Referenzpaar-Varianten. Neu: RSI2-Umkehr und VWAP-Abweichung. Weitere Methoden: Z-Score, Impuls, Beschleunigung, OLS-Abweichung, Docht-Abweisung, Fehlausbruch, Konsens, Marktresiduum und Marktschock. Referenzpaare sind einzeln gehandelte Symbol-Legs, keine atomaren Zwei-Leg-Arbitrageorders.</p><p>Micro-Identitäten nutzen Micro und gemäß Standardregel Minimal. Wide und Minimal plus sind im normalen Factory-Grid aus. DCA ist ausführbar; DCA Active und Axis werden unabhängig berechnet und sind standardmäßig für neue Entries aus. Historische Exit- und Signal-Strategien besitzen eigene Prüfungen und sind aus diesem Inverse-Marktreplay ausgeklammert.</p></section>
<section class="shared"><h2>Technische Prüfung und Betriebsstand</h2>{checks}<p>Vollständige Produktionsgrids sind mit 20 konstruierten Symbolen auf Long-/Short-Abschlüsse je Range und Normal/Trailing geprüft. Native SimExchange-Prüfungen öffnen und schließen auf 12 sowie 20 Symbolen und prüfen TP/SL-Orders. Das belegt Korrektheit, keine Marktprofitabilität.</p><p>Factory-Focus: 211 Einträge. Migration v37 aktualisiert nur exakte frühere Standards einschließlich Presets und erhält eigene/off-Auswahlen. Explizit längere Evaluationen erweitern Backfill, Retention und Lanes; Prüfungen decken 168/336/720/1440h-Anforderungen ab. Der Archiv-Replay hier belegt maximal 336h Auswahlhistorie, keine 60-Tage-Marktergebnisse.</p><p>Native Live-Zulassung beurteilt qualifizierte Sets einzeln. Eine unpassende verlierende Gesamt-Simulation blockiert sie nicht pauschal. Matching post-Base-PF, eigene bestätigte Ausführungsnachweise, Ownership-, Risiko- und Schutzprüfungen bleiben erforderlich. Kein Konto aktiviert, keine echten Orders gesendet, kein Deployment geändert.</p><p>Positive Historie garantiert keine folgenden Stunden. Negative Ausführungsrenditen bleiben vollständig sichtbar. Frühere 102-Varianten-Studien mit zurückgezogener zusätzlicher Kontextprüfung sind als superseded archiviert und zertifizieren diesen Stand nicht.</p></section>
<footer>Source-Checkpoint: {esc(bundle['sourceCheckpoint'])}<br>Source-Manifest: {bundle['sourceManifestSha256']}<br>Feed: {runs[0]['protocol']['feedSha256']}<br>Darstellung: UTC. Selbstständig offline lesbar; keine externen Diagramm-Bibliotheken oder Datenabrufe.</footer></main>
<script id="evidence" type="application/json">{data}</script><script>
document.getElementById('run-select').addEventListener('change',e=>{{document.querySelectorAll('.run').forEach((r,i)=>r.hidden=String(i)!==e.target.value)}});
document.querySelectorAll('.source-search').forEach(input=>input.addEventListener('input',()=>{{const q=input.value.toLowerCase();input.parentElement.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q))}}));
document.getElementById('download').addEventListener('click',()=>{{const b=new Blob([document.getElementById('evidence').textContent],{{type:'application/json'}});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='inverse-20-symbol-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}});
</script></body></html>'''
Path(str(out)+'.html').write_text(doc)
md='# Inverse — 114 identities, 20 symbols, 20 October 2026\n\n[Detailed offline HTML report]('+out.name+'.html)\n\nAll types: raw source PF below 1 is normal; configured PF gates above 1 apply from Base evaluation onward. Validated snapshots contain only sets passing validation/Last-N. Accepted future executions retain every losing close. No gates were weakened.\n\n'
md+='| Study | Base passed/evaluated | Validated end/built | Settled closes | Return PF | Long/Short | +/0/− hours |\n|---|---:|---:|---:|---|---:|---|\n'
for row in overviewRows:md+='| '+' | '.join(map(str,row[:7]))+' |\n'
md+='\nRetrospective virtual-order evidence from previously examined public history, not funded-account fills or a fresh holdout. Independent config evaluation preserves its configured population; explicit symbol gates remain separate. Source, settings, WF, Last-N counts, endpoint marks, ranges, per-source/per-symbol/per-direction results and runtime/memory are embedded in HTML and compressed evidence. No actual live account or deployment changed. Consistently profitable hourly Long/Short operation is not established.\n\n```json\n'+json.dumps(verification,indent=2)+'\n```\n'
Path(str(out)+'.md').write_text(md)
print(json.dumps(dict(html=str(out)+'.html',bytes=len(doc.encode()),charts=counter,studies=len(runs),sourceHashesVerified=True,verification=verification),indent=2))
