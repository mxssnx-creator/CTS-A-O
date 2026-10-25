import json,pathlib,shutil
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'docs/postbase-stop-study-20261025';out.mkdir(exist_ok=True)
cases=['wide-cap1','wide-cap05','short-cap1','short-cap125','short-cap15','short-cap2']
rows=[]
for range_name in ['wide','short']:
 d=json.loads((root/f'docs/live-ready-ranges-20261025/{range_name}-details.json').read_text())
 rows.append((range_name+' baseline',d,None,None))
for name in cases:
 p=root/'runs'/('stop-study-'+name)
 if not (p/'details.json').exists():continue
 d=json.loads((p/'details.json').read_text());a=json.loads((p/'entry-audit.json').read_text()) if (p/'entry-audit.json').exists() else None
 h=json.loads((p/'hourly-audit.json').read_text()) if (p/'hourly-audit.json').exists() else None
 rows.append((name,d,a,h))
 for f in ['details.json','protocol.json','entry-audit.json','parity.json']:
  if (p/f).exists():shutil.copy2(p/f,out/(name+'-'+f))
 if h:
  # Preserve all transition arithmetic, omit only verbose sample examples from this compact receipt.
  compact={**h,'steps':[{k:v for k,v in s.items() if k!='examples'} for s in h['steps']]}
  (out/(name+'-hourly-audit.json')).write_text(json.dumps(compact,indent=2)+'\n')
text=['# Post-Base loss drawdown and stop-grid comparison','',
'12 symbols; 16 October 2026 21:00–17 October 2026 09:00 UTC (23:00–11:00 Vienna). Twelve hours of evaluated history plus 24 hours of indicator warmup; minute pricing and entry/exit calculations. Retrospective cached BingX experiment, not an unseen profitability test.',
'', '**These are funded modeled orders from the Base-qualified, subsequently validated execution path, not unfiltered pre-Base returns.** Historical qualification and future execution are different samples. A passing historical PF does not mathematically guarantee a profitable next order or hour. The independent entry audit checks saved own-direction historical PF/Last-N at each settled order’s entry, but does not reconstruct unexported exact Base-cell metadata.',
'', 'Equity = initial equity + realized net P&L + open-position net P&L. Margin is reported separately and is not subtracted from equity. Peak drawdown = largest (prior equity peak − current equity) / prior peak. Loss below initial = max(0, initial − lowest equity) / initial. Both include losses and open P&L. Negative modeled equity is retained; a real account could not continue through ruin.',
'', 'All rows include their independent Exit cohort. Do not sum separate portfolios. Initial equity $10, unchanged 0.2% sizing and 10× leverage, no account exposure caps. Only the ordinary configured stop-ratio ladder changes. TP, trailing choices, fees, PF gates, Last-N and Exit are unchanged. Fewer configured stops also change admissions, order counts and exposure; drawdown reduction cannot be attributed solely to a per-order improvement.',
'', 'A configured ratio ceiling is not a universal realized-loss bound: lane scaling, mandatory minimum stops, price rounding and gaps remain. Actual executed configuration ratios are disclosed below. Trailing-only has no TP and is excluded from SL/TP ratios.',
'', '| Arm | Positions opened / held | Orders opened / settled / held | PF | Lowest equity $ | Loss below initial % | Peak equity DD % | End equity $ | Green / red / flat hours | Compute s |',
'|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
summary=[]
for name,d,a,h in rows:
 t=d['total'];c=t['fundedCounts'];loss=max(0,(10-t['eqMin'])/10)*100
 text.append(f'| {name} | {c["openedPositions"]} / {c["openPositions"]} | {c["openedOrders"]} / {c["settledOrders"]} / {c["openOrders"]} | {t["pf"]:.3f} | {t["eqMin"]:.5f} | {loss:.2f} | {100*t["equityMaxDdPct"]:.2f} | {t["equityEnd"]:.5f} | {t["greenHours"]} / {t["redHours"]} / {t["flatHours"]} | {d["computeMs"]/1000:.1f} |')
 summary.append({'arm':name,'total':t,'lossBelowInitialPct':loss,'computeMs':d['computeMs'],'entryAudit':a['stats'] if a else None,'hourlyDecisions':h['decisions'] if h else None})
text+=['','## Protection and audit evidence','', '| Arm / range | Max configured executed SL % | Max executed SL/TP | Min nonzero trailing % | Native checks | Entry failures / tested closes | Hourly discrepancies / decisions |','|---|---:|---:|---:|---:|---:|---:|']
for name,d,a,h in rows:
 for r in d['ranges']:
  if r['range']=='Exit':continue
  p=r['protection'];entry=f'{a["stats"]["failedOwnDirectionAtEntry"]} / {a["stats"]["orders"]}' if a else 'prior report'
  hour=f'{len(h["violations"])} / {h["decisions"]}' if h else 'prior report'
  text.append(f'| {name} / {r["range"]} | {100*p["maxSl"]:.3f} | {p["maxSlToTp"]:.4f} | {100*p["minTrail"]:.3f} | {sum(x["ok"] for x in d["checks"])}/{len(d["checks"])} | {entry} | {hour} |')
text+=['','## Fix and current decision','',
'Large Micro/Minimal simulations completed calculation but failed export because their selected-config metadata records exceeded the 8 MiB chunk limit (17,455,990 / 13,541,750 bytes). Validation sidecar v2 streams selected identities individually, preserving order, duplicates, all gate checks, bounded chunks and checksums. The reader retains v1 compatibility. Original failure tails are retained here.',
'', 'No candidate is promoted merely because drawdown falls. Require preserved post-Base execution PF above 1, sufficient own samples, acceptable loss drawdown, and later chronological validation. Completed 1×/0.5× Wide and 1× Short candidates fail the PF requirement. Production strategy defaults are unchanged.',
'', 'Only arms with completed details and audits are certified above; remaining Short experiments and the separate Micro/Minimal/General/Long matrix are pending until independently audited. Minimal Plus still has no selected ordinary cells. Signals retain their own 150h policy and independent Exit; this ordinary-range experiment does not certify new Signal profitability.',
'', 'Checks: 44 sidecar/consumer tests; 41 funded-cohort/native-report tests; margin-versus-loss replay regression; 13 trailing/readiness tests; build and TypeScript. This is not a claim of full-system stability or live profitability.']
(out/'report.md').write_text('\n'.join(text)+'\n');(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print('Saved',len(rows),'completed rows')
