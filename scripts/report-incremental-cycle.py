#!/usr/bin/env python3
"""Self-contained latency report; frozen raw measurements, failed attempts and math parity stay visible."""
import argparse, base64, gzip, hashlib, html, io, json, math, re, subprocess
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ap=argparse.ArgumentParser()
ap.add_argument('--run',default='runs/realtime-cycle-final-cohort.json')
ap.add_argument('--checks',default='runs/incremental-verification.json')
ap.add_argument('--out',default='docs/sims/incremental-cycle-20261020')
ap.add_argument('--require-complete',action='store_true')
a=ap.parse_args(); d=json.loads(Path(a.run).read_text()); out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest(); esc=lambda v:html.escape(str(v),quote=True)
for name,digest in d['sourceManifest'].items(): assert sha(Path(name).read_bytes())==digest,f'stale source: {name}'
assert d['harnessSha256']==sha(Path('scripts/perf/realtime-cycle.mjs').read_bytes()),'stale benchmark harness'
assert len(d['symbols'])==20 and d['oracle']['exactTapes']==d['historicalCohort']['qualifiedConfigs'] and not d['failures']
checks=json.loads(Path(a.checks).read_text()) if Path(a.checks).exists() else {'complete':False,'checks':[]}
if a.require_complete: assert checks.get('complete') and d['budget']['passed'], 'complete passing verification and 500-ms budget required'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#30434c','text.color':'#182e38','axes.edgecolor':'#bdcbd0','xtick.color':'#405b68','ytick.color':'#405b68','svg.fonttype':'none'})
charts=[]
def plot(title,draw,caption):
 fig,ax=plt.subplots(figsize=(9,3.3),layout='constrained');draw(ax);ax.grid(axis='y',alpha=.16);buf=io.StringIO();fig.savefig(buf,format='svg',metadata={'Date':None});plt.close(fig)
 svg=buf.getvalue();svg=svg[svg.index('<svg'):];charts.append((title,svg,caption))
x=np.arange(1,len(d['series']['cycleMs'])+1); cycle=np.array(d['series']['cycleMs']);worker=np.array(d['series']['workerMs']);tick=np.array(d['series']['ticks'])
def timeline(ax):
 ax.plot(x,cycle,label='Kompletter Vordergrundzyklus',color='#087c69',linewidth=2);ax.plot(x,worker,label='Worker inklusive Transport',color='#557dba',alpha=.8)
 ax.axhline(500,color='#b33c31',linestyle='--',label='Ziel 500 ms');ax.set(xlabel='Nachgestellter neuer Kerzenabschluss',ylabel='Millisekunden',ylim=(0,max(550,float(cycle.max())*1.1)));ax.legend(fontsize=9,loc='upper left',ncol=2)
plot('01 · Zyklus und Worker',timeline,'Enthält Merge, aktuelle Gates, fortgesetzte Lernhistorie, Paper-Schritt und Persistenz. Bereits empfangene Kerzen; Netzwerk und kalte Forschung separat.')
def cdf(ax):
 z=np.sort(cycle);ax.step(z,np.arange(1,len(z)+1)/len(z)*100,where='post',color='#087c69',linewidth=2)
 ax.axvline(500,color='#b33c31',linestyle='--');ax.set(xlabel='Kompletter Zyklus in ms',ylabel='Anteil der Zyklen in %',xlim=(0,max(550,float(z[-1])*1.1)),ylim=(0,102))
plot('02 · Verteilung aller Zyklen',cdf,f"{d['cycles']['n']} gemessene Zyklen; {d['cycles']['over500']} bei mindestens 500 ms. Warmup und Überschreitungen werden nicht aus der Serie entfernt.")
plot('03 · Arbeit nach dem Worker',lambda ax:(ax.plot(x,cycle-worker,color='#ba8a29'),ax.set(xlabel='Kerzenabschluss',ylabel='Millisekunden')), 'Differenz aus kompletter Zykluszeit und Worker-Roundtrip. Die historische Vollberechnung läuft außerhalb dieses Messfensters.')
plot('04 · Tatsächlicher Tick',lambda ax:(ax.plot(x,tick,color='#087c69',marker='.',markersize=3),ax.set(xlabel='Abgeschlossener Tick',ylabel='Millisekunden')), 'Jeder Tick ist auf erfolgreiche Beendigung und endliche Positionsmarkierungen geprüft. Der 2.000-Positionen-Worker wird separat auf mathematische Gleichheit getestet.')
plot('05 · Kalte und unabhängige Arbeit',lambda ax:(ax.barh(['Kandidatenaufbau','Worker-Bootstrap','Unabhängiger Vollhistorien-Oracle'],[d['candidateBuildMs']/1000,d['bootstrapMs']/1000,d['oracle']['ms']/1000],color=['#557dba','#ba8a29','#087c69']),ax.set(xlabel='Sekunden')), 'Diese Arbeit wird ausdrücklich nicht als 500-ms-Vordergrundzyklus ausgegeben. Standard für die erneute Forschung: 5 Minuten; Benchmark hält die Kohorte bis nach dem letzten gemessenen Kerzenabschluss fest.')
attempt_names=['first','recipes','boundary','profile','streammath','segment','source-profile','market','rank','matrix','sources','onset','final','sealed-concurrent','release','publish','60-research-boundary','60','final-population','final-ingestion','final-cohort']
attempts=[]
reasons={'boundary':'Timeout, danach Forschungs-Fallback; kein gültiger Vordergrundvergleich.','streammath':'Timeout; fehlgeschlagener Entwicklungsstand.','publish':'Ein 501-ms-Ausreißer; Markt-Zuordnung danach weiter inkrementell optimiert.','final-population':'60 warme Zyklen nach Korrektur der fortschreitenden Symbolpopulation; Quellstand vor den abschließenden Ingestion-/Kohorten-Korrekturen.','final-ingestion':'60 warme Zyklen nach Entkopplung kosmetischer Tickerdaten und atomarer Kerzenübernahme.','final-cohort':'Abschließender eingefrorener Quellstand; neue Kohorten holen sofort auf. Vollhistorien-Oracle und alle warmen Zyklen enthalten.','60-research-boundary':'88,618 s kalte Forschung am Endpunkt. Launcher-Grenze: beim 60. Abschluss war Forschung fällig und lief korrekt; die kalte Forschung ist kein Vordergrund-Zyklus. Endpoint-Guard im Launcher danach korrigiert.'}
for name in attempt_names:
 p=Path(f'runs/realtime-cycle-{name}.json');log=Path(f'runs/realtime-cycle-{name}.log');v=json.loads(p.read_text()) if p.exists() else None
 if v or log.exists():attempts.append({'name':name,'result':v,'logSha256':sha(log.read_bytes()) if log.exists() else None,'log':log.read_text() if log.exists() else None,'reason':reasons.get(name,'Entwicklungsstand; andere Revision und Hostlast, kein isolierter kausaler Speedup-Beweis.')})
valid=[v for v in attempts if v['result'] and not v['result'].get('failures') and v['result'].get('cycles',{}).get('n',0)>=5]
labels=[v['name'] for v in valid];med=[v['result']['cycles']['median'] for v in valid];mx=[v['result']['cycles']['max'] for v in valid]
def development(ax):
 y=np.arange(len(labels));ax.barh(y,med,color='#557dba',label='Median');ax.plot(mx,y,'o',color='#ba8a29',label='Maximum');ax.axvline(500,color='#b33c31',linestyle='--');ax.set_yticks(y,labels);ax.set(xlabel='Millisekunden');ax.legend(fontsize=9)
plot('06 · Entwicklungsverlauf',development,'Fehlgeschlagene Zeitmessungen sind unten separat erhalten. Verschiedene Revisionen und Hostlasten; die tatsächlichen Stichproben und Maxima bleiben sichtbar.')
num=lambda v:f'{v:,d}' if isinstance(v,int) else f'{v:,.2f}' if isinstance(v,float) else str(v)
def table(headers,rows):
 return '<div class="scroll"><table><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(num(v))+'</td>' for v in row)+'</tr>' for row in rows)+'</tbody></table></div>'
co=d['historicalCohort']; stamp=datetime.now(ZoneInfo('Europe/Vienna')).strftime('%d.%m.%Y %H:%M %Z'); code=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
rows=[]
for name in ['cycles','fast','workers','ticks']:
 v=d[name];rows.append([name,v['n'],v['median'],v['p95'],v['max'],v['over500']])
status='Messziel bestanden · Prüfplan abgeschlossen' if checks.get('complete') and d['budget']['passed'] else 'Zwischenstand · vollständige technische Prüfung läuft' if not checks.get('complete') else 'Prüfplan abgeschlossen · 500-ms-Messziel nicht vollständig erreicht'
body='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CTS-A-O · Inkrementeller Zyklus</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f5;color:#182e38;font:16px/1.6 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:42px 26px}header{border-top:6px solid #087c69;padding-top:18px}h1{font-size:clamp(30px,5vw,50px);line-height:1.12;margin:12px 0}h2{font-size:23px;margin:38px 0 14px}.eyebrow{font-weight:700;letter-spacing:.08em;font-size:12px;color:#087c69}.badge{display:inline-block;padding:6px 12px;border:1px solid #aac9c0;border-radius:4px;background:#e7f2ed}.intro{max-width:950px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:26px 0}.card,figure{background:#fff;border:1px solid #d8e1df;border-radius:5px;padding:18px;margin:0}.value{font-size:31px;font-weight:700;line-height:1.3}.muted,figcaption{color:#506770;font-size:14px}.plots{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}.plots figure{min-width:0}figure h3{margin:0 0 12px;font-size:19px}.plot,.scroll{overflow:auto;max-width:100%}.plot svg{display:block;width:100%;min-width:680px;height:auto}table{width:100%;border-collapse:collapse;background:#fff;white-space:nowrap;font-size:14px}th,td{padding:10px 13px;text-align:left;border-bottom:1px solid #d8e1df}th{background:#e7eeec}code{overflow-wrap:anywhere;font-size:12px}details{background:white;border:1px solid #d8e1df;padding:15px;margin:14px 0}summary{cursor:pointer;font-weight:700}a{color:#086a5b}footer{margin-top:40px;padding-top:16px;border-top:1px solid #c4d2ce}@media(max-width:600px){main{padding:24px 14px}.card,figure{padding:13px}.cards{grid-template-columns:1fr 1fr}.value{font-size:25px}}
</style><main><header><div class="eyebrow">CTS-A-O / LAUFZEIT & KORREKTHEIT</div><h1>Neue Kerzen fortsetzen.<br>Historie bewahren.</h1>'''
body+=f'<p class="badge">{esc(status)}</p><p class="muted">Stand {stamp} · Europe/Vienna</p></header>'
body+=f'''<p class="intro">{len(d['symbols'])} Symbole, 1/5/15-Minuten-Lanes und {co['qualifiedConfigs']} am Messbeginn validierte Configs. {d['cycles']['n']} historische Kerzenabschlüsse werden chronologisch durch den tatsächlichen Runtime-Zyklus weitergeführt. Das ist ein Latenz- und Korrektheitstest ab bereits empfangenen, abgeschlossenen Kerzen; keine Messung der Börsen- oder Netzwerklatenz und keine neue Profitabilitätsstudie.</p>'''
body+='<div class="cards">'+''.join(f'<div class="card"><div class="muted">{esc(k)}</div><div class="value">{esc(v)}</div></div>' for k,v in [('Median Zyklus',num(d['cycles']['median'])+' ms'),('p95 Zyklus',num(d['cycles']['p95'])+' ms'),('Maximum Zyklus',num(d['cycles']['max'])+' ms'),('≥ 500 ms',str(d['cycles']['over500'])+' / '+str(d['cycles']['n']))])+'</div>'
body+='<h2>Gemessene Zeiten</h2>'+table(['Messgröße','N','Median ms','p95 ms','Max ms','≥500 ms'],rows)
body+=f'''<p>Die Zeitreihen enthalten jeden gemessenen warmen Zyklus. Kalter Aufbau: {num(d['candidateBuildMs']/1000)} s; Bootstrap: {num(d['bootstrapMs']/1000)} s. Peak-RSS des gesamten Benchmark-Prozesses inklusive Archiv, kaltem Aufbau und Vollhistorien-Oracle: {num(d['peakRssMiB'])} MiB. Das ist keine isolierte Speichergröße des warmen Workers.</p><h2>Messdiagramme</h2><p class="muted">Auf schmalen Bildschirmen lassen sich die Diagramme horizontal verschieben.</p><div class="plots">'''
for title,svg,caption in charts:body+=f'<figure><h3>{esc(title)}</h3><div class="plot">{svg}</div><figcaption>{esc(caption)}</figcaption></figure>'
body+='</div><h2>Qualifikation und mathematische Kontrolle</h2>'
body+=table(['Stufe / Umfang','Menge'],[['Base-qualifizierte Zeilen im eingefrorenen Studienprotokoll',co['consideredBasePassed']],['Zuvor ausgeführte Config-Identitäten vor dem Cut',co['earlierExecutedIds']],['Nach aktueller Config-Evaluation gültige Testkohorte',co['qualifiedConfigs']],['Durch Produktionsauswahl belegte Configs',co['seatedConfigs']],['Offene Modellpositionen am Anfang',co['initialPositions']],['Exakt verglichene vollständige Tapes',d['oracle']['exactTapes']],['Alle verglichenen historischen Abschlüsse',d['oracle']['exactCloses']]])
body+='''<p>Der unabhängige Vollhistorien-Aufbau vergleicht jede numerische Trade- und Präfixspalte sowie offene und ausstehende Positionen exakt. Frühere Verluste bleiben enthalten. Der Benchmark beginnt mit zuvor ausgeführten Identitäten und prüft deren aktuelle Gates; er beansprucht keine Messung jeder möglicherweise qualifizierenden Config der vollständigen Discovery-Menge. Standard-Micro, Minimal, Short, General, Long und die vollständigen TP/SL-/Trailing-Rezepte behalten ihre eigenen Identitäten. Die separaten Regressionen prüfen Normal, Trailing, DCA, DCA Active, Axis, Historic Exit sowie Long und Short.</p>
<p>Im laufenden Betrieb gelten weiter die aktuellen Config-/Last-N- und expliziten Symbol-/Richtungsgates. Base und neue Set-Auswahl laufen standardmäßig alle fünf Minuten im Hintergrund. Für die isolierte Zeitreihe hält der Benchmark die Anfangskohorte bis nach dem letzten gemessenen Kerzenabschluss fest. Jeder Zyklus wird erst nach Abschluss seines Vorgängers gestartet; es gibt keinen überlappenden Intervallstart. Roh-PF unter 1 bleibt für jeden Typ normal, die Admission-Gates beginnen bei Base. Keine neuen Venue-Orders, kein Live-Profitabilitätsbeweis und keine Berechtigung durch leere PF-Stichproben.</p>'''
body+='<h2>Technische Prüfungen</h2>'+table(['Prüfung','Status','Umfang'],[[v.get('name'),v.get('status'),v.get('scope','')] for v in checks.get('checks',[])])
if checks.get('regressionNote'):body+='<p>'+esc(checks['regressionNote'])+'</p>'
if checks.get('resolutions'):body+='<h2>Befunde und Nachprüfung</h2>'+table(['Ursprünglicher Befund','Korrektur / Nachprüfung'],[[v['name'],v['resolution']] for v in checks['resolutions']])
body+='<h2>Erhaltene Entwicklungsversuche</h2>'+table(['Revision / Versuch','N Zyklen','Max ms','≥500 ms','Einordnung'],[[v['name'],v['result'].get('cycles',{}).get('n','—') if v['result'] else '—',v['result'].get('cycles',{}).get('max','—') if v['result'] and not v['result'].get('failures') else 'ungültige Vordergrundmessung',v['result'].get('cycles',{}).get('over500','—') if v['result'] else '—',v['reason']] for v in attempts])
body+=f'''<details><summary>Provenienz und Messgrenzen</summary><p>Symbole: {esc(', '.join(d['symbols']))}</p><p>Core-SHA256: <code>{esc(d['sourceSha256'])}</code><br>Harness-SHA256: <code>{esc(d['harnessSha256'])}</code><br>Archiv-SHA256: <code>{esc(d['feedSha256'])}</code><br>Report-Quellstand: <code>{code}</code></p><p>Keine harte Echtzeitgarantie bei beliebiger Config-Menge, Hostlast, Netzwerk- oder Börsenwartezeit. Kalte Discovery, Forschung und Initialisierung sind separat. Die warmen Maxima und alle Überschreitungen werden ausgewiesen; fehlgeschlagene Versuche werden nicht zu bestandenen Messungen umgedeutet.</p></details><footer>'''
body+=f'<a href="{out.name}.json.gz" download>Vollständige Messdaten und Prüfprotokolle</a> · <a href="inverse-20-symbol-20261020.html">Vorherige ökonomische Studien</a><p class="muted">Selbstenthaltener Bericht, sechs SVG-Diagramme, keine externen Bibliotheken oder Netzwerkabfragen.</p></footer></main>'
archive={'current':d,'checks':checks,'attempts':attempts,'sourceCommit':code,'timezone':'Europe/Vienna'}
payload=gzip.compress(json.dumps(archive,separators=(',',':'),allow_nan=False).encode(),mtime=0)
body=body.replace(f'href="{out.name}.json.gz"', 'href="data:application/gzip;base64,'+base64.b64encode(payload).decode()+'"')
Path(str(out)+'.html').write_text(body)
Path(str(out)+'.json.gz').write_bytes(payload)
print(json.dumps({'html':str(out)+'.html','charts':len(charts),'checksComplete':checks.get('complete',False),'budgetPassed':d['budget']['passed'],'bytes':len(body)}))
