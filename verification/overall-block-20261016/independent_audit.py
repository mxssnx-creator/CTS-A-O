from pathlib import Path
import json,hashlib,math,gc,datetime,subprocess,collections
root=Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block'); run=root/'runs/block-relations-20261016'
def read(p): return json.loads(p.read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''): h.update(b)
 return h.hexdigest()
def canon(x): return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
def close(a,b): return isinstance(a,(int,float)) and isinstance(b,(int,float)) and math.isfinite(a) and math.isfinite(b) and math.isclose(a,b,rel_tol=1e-11,abs_tol=1e-12)
def key(x): return (x['cfg'],x['sym'],x['side'],x['entryT'],x['exitT'],x['kind'])
def okey(x): return (x['cfg'],x['sym'],x['side'],x['entryT'])
def need(ok,desc):
 if not ok: defects.append(desc)
import bisect

def audit_minute_book(raw,book,label):
 M=60000; H=3600000
 start=book['window']['startT']; end=book['window']['endT']; balance=book['settings']['balance0']; leverage=book['settings']['leverage']; cost=raw['settings']['cost']
 closed=raw['trades']; opens=raw['openEnd']; ca=book['sizedOrders']; oa=book['sizedOpenOrders']
 need(len(opens)==len(oa),'open endpoint allocations complete '+label)
 allrows=[]; closedrows=[]
 for i,x in enumerate(closed):
  a=ca[i]; z={**x,'auditUnit':a['unitNotional'],'auditPnl':a['sizedPnl']}; closedrows.append(z); allrows.append(z)
 for i,x in enumerate(opens):
  a=oa[i]
  need(a['openIndex']==i and all(a[k]==x[k] for k in ['cfg','sym','side','entryT']),'open endpoint identity '+label+':'+str(i))
  need(a['volume']==x.get('vol',1) and close(a['allocatedNotional'],a['unitNotional']*a['volume']),'open allocation arithmetic '+label+':'+str(i))
  need(close(a['sizedPnl'],x['mtmR']*a['unitNotional']),'open mark allocation arithmetic '+label+':'+str(i))
  norm=x.get('unitR') if 'unitR' in x else x['mtmR']/x['mult']
  need(close(norm,a['unitR']),'open intrinsic normalized unit return '+label+':'+str(i))
  allrows.append({**x,'exitT':math.inf,'auditUnit':a['unitNotional'],'auditPnl':a['sizedPnl'],'auditOpen':True})
 allrows.sort(key=lambda x:x['entryT']); closedrows.sort(key=lambda x:x['exitT'])
 closes={s:sorted(rows) for s,rows in raw['closes'].items()}; times={s:[v[0] for v in rows] for s,rows in closes.items()}
 rl=0; pk=balance; pkT=start; dd=0; ddPct=0; mg=0; eqmin=balance; eqend=balance; ddt=0; over=0; missing=0; ti=0; ei=0; active=[]; perhour={}; endMtm=0
 for t in range(start+M,end+1,M):
  while ti<len(closedrows) and closedrows[ti]['exitT']<=t: rl+=closedrows[ti]['auditPnl']; ti+=1
  while ei<len(allrows) and allrows[ei]['entryT']<=t: active.append(allrows[ei]);ei+=1
  active=[x for x in active if x['exitT']>t];mtm=0; margin=0; endpointMtm=0
  for x in active:
   j=bisect.bisect_right(times.get(x['sym'],[]),t-M)-1
   amount=x['auditUnit']*x.get('vol',1)
   if j<0: missing+=1
   else:
    price=closes[x['sym']][j][1]
    value=(x['side']*(price-x['entry'])/x['entry']-cost)*amount
    mtm+=value
    if x.get('auditOpen'):endpointMtm+=value
   margin+=amount/leverage
  eq=balance+rl+mtm;eqend=eq;mg=max(mg,margin);eqmin=min(eqmin,eq);over+=int(margin>eq)
  if eq>=pk:pk=eq;pkT=t
  ddt=max(ddt,t-pkT);dd=max(dd,pk-eq);curDd=(pk-eq)/pk if pk>0 else 0;ddPct=max(ddPct,curDd)
  hour=start+((t-1-start)//H)*H
  q=perhour.setdefault(hour,{'eqMin':math.inf,'eqMax':-math.inf,'marginMax':0})
  q.update({'eqMin':min(q['eqMin'],eq),'eqMax':max(q['eqMax'],eq),'marginMax':max(q['marginMax'],margin),'equity':eq,'balance':balance+rl,'marginEnd':margin,'ddEndPct':curDd})
  endMtm=endpointMtm
 exact=book['frozenBlockRiskExact']
 result={'equityMaxDd':dd,'equityMaxDdPct':ddPct,'eqMin':eqmin,'marginMax':mg,'equityDdtMaxH':ddt/H,'equityEnd':eqend,'balanceEnd':balance+rl,'openEndpoints':len(opens),'openAllocatedNotional':sum(a['allocatedNotional'] for a in oa),'fundedOpenEndpoints':sum(a['allocatedNotional']>1e-9 for a in oa),'zeroOpenEndpoints':sum(a['allocatedNotional']<=1e-9 for a in oa),'endOpenMtm':endMtm,'missingMinuteMarks':missing,'marginOverMinutes':over,'minutePoints':(end-start)//M}
 for k in ['equityMaxDd','equityMaxDdPct','eqMin','marginMax','equityDdtMaxH']:need(close(result[k],exact[k]),'independent minute risk '+label+'/'+k)
 for k in ['equityEnd','balanceEnd']:need(abs(result[k]-book['total'][k])<=.00000051,'independent minute endpoint '+label+'/'+k)
 need(abs(result['endOpenMtm']-book['total']['openEnd']['mtm'])<=.00000051,'independent final open MTM '+label)
 need(missing==0,'independent missing minute marks '+label)
 need(over==book['total']['marginOver']['minutes'],'independent margin feasibility '+label)
 for h in book['hours']:
  q=perhour[h['t']]
  for k in ['eqMin','eqMax','marginMax','equity','balance','marginEnd','ddEndPct']:need(abs(q[k]-h[k])<=.00000051,'independent hour minute '+label+'/'+str(h['t'])+'/'+k)
 return result

proto=read(run/'protocol.json'); seal=read(run/'source-freeze.json'); comparison=read(run/'comparison.json'); previous=root/'runs/block-relations-20261016-attempt-08-before-preset-edit-invalidation'; previousProto=read(previous/'protocol.json'); previousSeal=read(previous/'source-freeze.json'); equivalence=[]; defects=[]; artifacts=[]; summaries=[]; selected={}; risks={}; failures=collections.Counter(); states={}; minuteResults=[]; coverageResults=[]; noncomparable=[]
for name in ['protocol.json','source-freeze.json','comparison.json']: artifacts.append({'path':name,'sha256':sha(run/name)})
need(seal['protocolSha256']==sha(run/'protocol.json')=='6e1b90de1d36c00fa7876c3da8c53e5d81789b1131e962d83cc2f8a03e16ef1f','protocol seal digest')
need(seal['sourceSha256']=='585c1f5ea43199789d608610eac06e290a0ed8c90380b4354bdee6d8998dcee9' and seal['checkpoint']=='08cd452e16b37acac9799450066088ebceaa1314','final CP10 source binding')
need(seal['sourceSha256']==hashlib.sha256(canon(seal['files']).encode()).hexdigest(),'canonical source inventory digest')
for f in seal['files']: need(sha(root/f['path'])==f['sha256'],'current source differs '+f['path'])
need(comparison['sourceSha256']==seal['sourceSha256'] and comparison['sourceCheckpoint']==seal['checkpoint'],'comparison source binding')
need(len(proto['folds'])==2 and len(proto['arms'])==10,'declared scope')
for field in ['symbols','arms','nativeBaselineId','sourceFlags','performancePolicy','preH','runH','actualSettings','actualWf','book']: need(proto[field]==previousProto[field],'unchanged previous protocol '+field)
for a,b in zip(proto['folds'],previousProto['folds']):
 for field in ['id','endT','tradeStartT','evaluationFromT','feedSha256','feedBytes']: need(a[field]==b[field],'unchanged previous fold '+field)
for fold in proto['folds']:
 need(sha(run/fold['id']/'feed.json')==fold['feedSha256'],'feed '+fold['id'])
 capture=read(run/fold['id']/'arm-capture.json')
 need(capture['exactBaselineReproduction'] and capture['nativeDigest']==capture['replayDigest'],'native replay identity '+fold['id'])
 for arm in proto['arms']:
  label=fold['id']+'/'+arm['id']; d=run/label
  e=read(d/'evidence.json'); raw=read(d/'raw.json'); book=read(d/'book/data.json')
  for f in ['evidence.json','raw.json','book/data.json']: artifacts.append({'path':label+'/'+f,'sha256':sha(d/f)})
  need(e['fold']==fold['id'] and e['arm']==arm['id'],'arm identity '+label)
  need(e['protocolSha256']==seal['protocolSha256'] and e['sourceSha256']==seal['sourceSha256'],'evidence seal '+label)
  need(raw['frozenBlockComparison']['arm']==arm,'exact arm declaration '+label)
  need(raw['frozenBlockComparison']['actualSettingsVerifiedBeforeCompute'] is True,'precompute parity '+label)
  need(raw['frozenBlockComparison']['liveOrders'] is False,'no live orders '+label)
  need(raw['engine']['universe']==proto['symbols'],'four-symbol scope '+label)
  need(raw['engine']['mem']['computeLevel']==0,'memory fallback '+label)
  need(raw['settings']['cost']==proto['actualSettings']['cost']==.002,'frozen source cost '+label)
  need(raw['settings']['block']['historySource']=='accepted-orders','accepted-order Block source '+label)
  need(raw['settings']['block']['mode']==arm['mode'] and raw['settings']['block']['ratio']==arm['ratio'] and raw['settings']['block']['maxMult']==arm['maxMult'] and raw['settings']['block']['steps']==arm['steps'],'arm Block settings '+label)
  need(raw['settings']['toggles']['block']==arm['block'] and raw['settings']['toggles']['blockActive']==arm['active'],'arm toggles '+label)
  need(raw['settings']['book']['balance']==1000 and raw['settings']['book']['sizing']=={'mode':'equityPct','pct':.02} and raw['settings']['book']['leverage']==10,'native account model '+label)
  need(e['window']=={k:book['window'][k] for k in ['startT','endT']}==raw['window']=={'startT':fold['tradeStartT'],'endT':fold['endT']} and book['window']['preStartT']==fold['evaluationFromT'] and book['window']['preH']==6 and book['window']['runH']==6,'window '+label)
  slices=e['slices']; rows=raw['trades']; allocations={x['closeIndex']:x for x in book['sizedOrders']}
  need(len(rows)==len(slices)==len(allocations),'one row per modeled close '+label)
  need(len(set(map(key,slices)))==len(slices),'duplicate canonical close '+label)
  parentCount=len(set(map(okey,slices)))
  tape={}
  for tp in raw.get('tapeTrades',[]):
   for sym,side,en,ex,r in tp['trades']: tape[(tp['id'],sym,side,en,ex)]=r
  pos=[]; zero=[]; unknown=[]
  for i,(x,s) in enumerate(zip(rows,slices)):
   a=allocations[i]; norm=x.get('unitR', x['r']/x['mult'])
   need(key(x)==key(s),'raw close identity '+label+':'+str(i))
   need(close(norm,s['unitR']),'strict normalized return '+label+':'+str(i))
   need(close(norm,tape.get(tuple(key(x)[:5]))),'intrinsic source cost-return parity '+label+':'+str(i))
   need(fold['tradeStartT']<=x['entryT']<fold['endT'] and fold['tradeStartT']<x['exitT']<=fold['endT'] and not x.get('markedOpen') and x.get('reason') not in ['end','open'],'settled scope '+label+':'+str(i))
   need(s['closeIndex']==i and a['entryT']==s['entryT'] and a['exitT']==s['exitT'] and a['cfg']==s['cfg'] and a['sym']==s['sym'] and a['side']==s['side'],'allocation identity '+label+':'+str(i))
   need(a['volume']==s['volume']==x.get('vol',1) and a['allocatedNotional']==a['unitNotional']*a['volume'],'exact allocation '+label+':'+str(i))
   need(a['sizedPnl']==x['r']*a['unitNotional']==s['sizedPnl'],'exact same-slice cash '+label+':'+str(i))
   need(x['mult']<=arm['maxMult']+1e-10,'external multiplier cap '+label+':'+str(i))
   if x.get('legs'): need(1+sum(x['legs'].values())<=arm['maxMult']+1e-10,'source legs cap '+label+':'+str(i))
   (pos if a['allocatedNotional']>1e-9 else zero).append(s)
   need(s['allocation']==('positive' if a['allocatedNotional']>1e-9 else 'zero'),'ownership status '+label+':'+str(i))
  t=e['total']; gp=sum(x['unitR'] for x in pos if x['unitR']>0); gl=-sum(x['unitR'] for x in pos if x['unitR']<0); cp=sum(x['sizedPnl'] for x in pos if x['sizedPnl']>0); cl=-sum(x['sizedPnl'] for x in pos if x['sizedPnl']<0)
  need(t['n']==t['ownedCloses']==len(pos),'funded canonical sample '+label)
  need(t['zeroAllocations']==len(zero),'zero allocations retained '+label)
  need(all(t[f]==0 for f in ['unknownAllocations','unknownReturns','unknownSizedPnl']),'unknown sample retained '+label)
  if pos:
   need(close(t['gp'],gp) and close(t['gl'],gl) and close(t['net'],gp-gl),'unit gross recomputation '+label)
   need(close(t['pf'],gp/gl) and close(t['exactPf'],gp/gl),'primary PF recomputation '+label)
   need(close(t['cashGp'],cp) and close(t['cashGl'],cl) and close(t['cashNet'],cp-cl),'cash gross recomputation '+label)
  else: need(t['pf'] is None and t['exactPf'] is None and t['noLoss'] is None,'empty not performance '+label)
  need(len(e['hourly'])==6 and sum(x['funded']['n'] for x in e['hourly'])==len(pos),'six zero-inclusive hours '+label)
  for part in ['byType','byIndication','byLane','byRange','bySide','byConfig','bySymbol','byIdentity','byRelation']:
   need(sum(x['funded']['n'] for x in e[part])==len(pos),'partition count '+label+'/'+part)
  risk=e['risk']; exact=book['frozenBlockRiskExact']; need(risk['exactMinuteEvidence']==exact,'risk exact-source binding '+label)
  need(exact['protocolSha256']==seal['protocolSha256'] and exact['sourceSha256']==seal['sourceSha256'] and exact['window']==e['window'] and exact['fold']==fold['id'] and exact['arm']==arm['id'],'risk provenance '+label)
  for source,target in [('equityMaxDd','equityMaxDrawdownUsd'),('equityMaxDdPct','equityMaxDrawdownFraction'),('eqMin','equityMin'),('marginMax','marginMax'),('equityDdtMaxH','equityDdtMaxH')]:
   need(risk[target]==exact[source],'risk exact field '+label+'/'+source)
   need(abs(book['total'][source]-exact[source])<=.00000051,'rounded display tolerance '+label+'/'+source)
  need(risk['stack']['knownCapSatisfied'] and not risk['stack']['violations'],'stack audit '+label)
  need(risk['feasible'] is True and risk['marginOver']['minutes']==0,'margin feasibility '+label)
  failed=[x for x in book['checks'] if not x['ok']]; need(e['book']['failedChecks']==failed,'retained native failures '+label)
  failures.update(x['name'] for x in failed)
  selected[(fold['id'],arm['id'])]={key(s):s['unitR'] for s in pos}
  risks[(fold['id'],arm['id'])]=risk['equityMaxDrawdownFraction']
  states[(fold['id'],arm['id'])]=(len(rows),len(pos),len(raw['openEnd']))
  summaries.append({'fold':fold['id'],'arm':arm['id'],'virtualClosed':len(rows),'fundedOwnedCloses':len(pos),'uniqueNativeEntryParents':parentCount,'uniqueFundedEntryParents':len(set(map(okey,pos))),'fundedLosingCloses':sum(x['unitR']<0 for x in pos),'zeroAllocations':len(zero),'unknownReturns':t['unknownReturns'],'unitGp':gp,'unitGl':gl,'unitPf':t['pf'],'cashPf':t['cashPfDiagnostic'],'cashNet':t.get('cashNet'),'openEndpoints':len(raw['openEnd']),'equityDrawdownFraction':risk['equityMaxDrawdownFraction'],'equityDdtH':risk['equityDdtMaxH'],'maxExternalMult':risk['stack']['maxExternalMult'],'nativeFailedChecks':len(failed),'coverageComplete':None,'fundingSource':risk['caps']['source'],'bySide':[{ 'side':x['key'],'n':x['funded']['n'],'pf':x['funded']['pf']} for x in e['bySide']]})
  # Independently inspect scalar, every native group and hour on the funded cohort, before rounding.
  def rounded(got,want): return got is not None and math.isfinite(got) and abs(got-want)<=.00000051
  def expectGroup(g, groupRows, name, countField='n'):
   funded=[x for x in groupRows if x['allocation']=='positive']; unitGp=sum(x['unitR'] for x in funded if x['unitR']>0); unitGl=-sum(x['unitR'] for x in funded if x['unitR']<0)
   cashGp=sum(x['sizedPnl'] for x in funded if x['sizedPnl']>0); cashGl=-sum(x['sizedPnl'] for x in funded if x['sizedPnl']<0)
   need(g[countField]==len(funded) and g.get('fundedOrders')==len(funded),'native funded count '+label+'/'+name)
   need(g['virtual']['n']==len(groupRows) and g['zeroAllocatedOrders']==len(groupRows)-len(funded),'native virtual/zero split '+label+'/'+name)
   if funded:
    pf=unitGp/unitGl if unitGl else 4 if unitGp else 0
    need(rounded(g['pf'],pf) and rounded(g['gpR'],unitGp) and rounded(g['glR'],unitGl),'native unit PF/gross '+label+'/'+name)
    need(g.get('pfBasis','unit-net-returns')=='unit-net-returns' and not g['unknownReturns'] and not g['unknownAllocations'],'native known cohort '+label+'/'+name)
   else: need(g['pf'] is None and g['gpR'] is None and g['glR'] is None and g.get('pfBasis','unavailable')=='unavailable','native empty unavailable '+label+'/'+name)
   need(rounded(g['gp'],cashGp) and rounded(g['gl'],cashGl) and rounded(g['net'],cashGp-cashGl),'native same-cohort cash '+label+'/'+name)
   need(g['wins']==sum(x['unitR']>0 for x in funded) and g['losses']==sum(x['unitR']<0 for x in funded),'native losses retained '+label+'/'+name)
  expectGroup(book['total'],slices,'total','orders')
  labels={'normal':'Normal','trailing':'Trailing','axis':'Axis','dca':'DCA','dca-active':'DCA Active'}
  def typeLabel(x): return ('Signal · ' if x['indicationSource'] else '')+labels.get(x['kind'],x['kind'])
  def blockLabel(x): return ('Block Active' if arm['active'] else 'Block') if x['mult']/(x['coordinationMult'] or 1)>1 else 'Plain'
  def multLabel(x):
   m=x['mult']/(x['coordinationMult'] or 1)
   return '×1' if m<=1 else '×1–1.5' if m<=1.5 else '×1.5–2' if m<=2 else '×2–3' if m<=3 else '×3–4' if m<=4 else '×4–6' if m<=6 else '×6–8'
  selectors={'types':typeLabel,'kinds':lambda x:labels.get(x['kind'],x['kind']),'classes':lambda x:'Signals' if x['indicationSource'] else 'Engine','subTypes':lambda x:typeLabel(x)+' · '+blockLabel(x),'blockLevels':lambda x:('level '+str(x['level']) if x['mult']>1 else 'plain') if x['kind'] in ['normal','trailing'] else None,'mult':multLabel,'indKinds':lambda x:'signal:'+x['indicationSource'] if x['indicationSource'] else raw['engine']['coverage']['perInd'][x['indicationBase']]['kind'],'indBases':lambda x:x['cfg'].split('|')[0]+'|'+x['indicationBase'],'lanes':lambda x:str(x['lane'])+'m'+('+' if x['combined'] else '') if x['lane'] else 'plain','ranges':lambda x:x['range'],'sources':lambda x:x['indicationSource'],'symbols_':lambda x:x['sym'],'sides':lambda x:'Long' if x['side']>0 else 'Short'}
  for name, selector in selectors.items():
   grouped={}
   for x in slices:
    k=selector(x)
    if k is not None: grouped.setdefault(k,[]).append(x)
   need(set(grouped)=={x['key'] for x in book[name]},'native group inventory '+label+'/'+name)
   for g in book[name]: expectGroup(g,grouped[g['key']],name+'/'+str(g['key']))
  for hour in book['hours']:
   hs=[x for x in slices if hour['t']<x['exitT']<=hour['t']+3600000]
   expectGroup(hour,hs,'hour/'+str(hour['t']),'orders')
   need(hour['cumOrders']==sum(x['allocation']=='positive' and x['exitT']<=hour['t']+3600000 for x in slices),'native cumulative funded count '+label)
  for g in book['typeHours']:
   hs=[x for x in slices if g['t']<x['exitT']<=g['t']+3600000 and typeLabel(x)==g['key']]
   # typeHours report wins, not losses; derive the missing count solely for shared validation.
   gg={**g,'losses':sum(x['allocation']=='positive' and x['unitR']<0 for x in hs)}
   expectGroup(gg,hs,'type-hour/'+g['key'],'closes')
  status=next(x['coverageStatus'] for x in comparison['performance']['rows'] if x['fold']==fold['id'] and x['arm']==arm['id']) if arm['id']!='off' else None
  if status:
   need(status['baseComplete'] and status['expectedCombos']==status['evaluated'] and status['evaluated']>0,'actual Base completion '+label)
   need(not status['complete'] and not status['missingChecks'] and len(status['failedChecks'])>0,'actual missing range coverage '+label)
  minuteResults.append({'fold':fold['id'],'arm':arm['id'],**audit_minute_book(raw,book,label)})
  c=raw['engine']['coverage']; completionKnown=(c['engineCombos']+c['signalCombos']==c['expectedCombos'] and c['expectedCombos']==c['evaluated'] and sum(x['evaluated'] for x in c['byKind'].values())==c['evaluated'] and all(c['byKind'].get(k,{}).get('evaluated',0)>0 for k in c['kindsAll']))
  need(completionKnown,'independent actual Base completion '+label)
  coverageFailures=[x['name'] for x in failed if x['name'].startswith(('coverage:','config sets:','config sets complete (grid.allSets):'))]
  coverageResults.append({'fold':fold['id'],'arm':arm['id'],'expectedCombos':c['expectedCombos'],'evaluated':c['evaluated'],'baseComplete':completionKnown,'allSetsMode':c['allSets'],'coverageFailures':coverageFailures})
  summaries[-1]['coverageComplete']=completionKnown and not coverageFailures
  for check in failed:
   if check['name']=='last cumulative PF = total PF' and book['total']['pf'] is None:
    noncomparable.append({'fold':fold['id'],'arm':arm['id'],'nativeCheck':check,'classification':'Unavailable-empty-PF comparison remains raw ok:false; not an economic mismatch or performance PASS.'})
  for h in book['hours']:
   cumulative=[x for x in pos if x['exitT']<=h['t']+3600000]
   cgp=sum(x['unitR'] for x in cumulative if x['unitR']>0); cgl=-sum(x['unitR'] for x in cumulative if x['unitR']<0)
   want=cgp/cgl if cgl else 4 if cgp else 0
   need((not cumulative and h['cumPf'] is None) or (cumulative and abs(h['cumPf']-want)<=.00000051),'native cumulative unit PF '+label+'/'+str(h['t']))
   for f,v in [('cumGpR',cgp),('cumGlR',cgl)]: need((not cumulative and h[f] is None) or (cumulative and abs(h[f]-v)<=.00000051),'native cumulative return gross '+label+'/'+f)

  oldRaw=read(previous/label/'raw.json'); oldBook=read(previous/label/'book/data.json')
  # CP10 repairs stale preset-result invalidation without strategy retuning: economic identity is observed, never required.
  # Preserve observed exact-allocation differences without post-hoc strategy tuning.
  economic=['equityMaxDd','equityMaxDdPct','eqMin','marginMax','equityDdtMaxH']


  equivalence.append({'fold':fold['id'],'arm':arm['id'],'economicTradeRowsIdentical':raw['trades']==oldRaw['trades'],'exactAllocationsIdentical':book['sizedOrders']==oldBook['sizedOrders'],'exactMinuteRiskIdentical':all(exact[k]==oldBook['frozenBlockRiskExact'][k] for k in economic),'previousHeadlineOwnedCount':oldBook['total']['orders'],'previousPrimaryPf':oldBook['total']['pf'],'rawClosesEqualCount':len(oldRaw['trades'])==len(raw['trades']),'oldVirtualClosedCount':len(oldRaw['trades']),'newHeadlineFundedCount':book['total']['orders'],'newHeadlinePrimaryPf':book['total']['pf']})
  del oldRaw,oldBook
  del e,raw,book,slices,rows,allocations,tape,pos,zero,unknown; gc.collect()
  print('AUDITED '+label,flush=True)
paired=[]
for fold in proto['folds']:
 off=selected[(fold['id'],'off')]
 for arm in proto['arms'][1:]:
  own=selected[(fold['id'],arm['id'])]; common=off.keys()&own.keys(); maxdiff=max((abs(off[k]-own[k]) for k in common),default=None)
  need(maxdiff is None or maxdiff<=1e-10,'matched unit invariance '+fold['id']+'/'+arm['id'])
  paired.append({'fold':fold['id'],'arm':arm['id'],'commonOwned':len(common),'maxUnitDifference':maxdiff})
need(len(comparison['results'])==2 and sum(len(x['arms']) for x in comparison['results'])==20 and all(x['complete'] for f in comparison['results'] for x in f['arms']),'all20 captures completed')
passingProfiles=[x['arm'] for x in comparison['performance']['arms'] if x['passesEveryDeclaredFold']]
for row in comparison['performance']['rows']:
 expect=next(x for x in summaries if x['fold']==row['fold'] and x['arm']==row['arm'])
 need(row['fullArm']['n']==expect['fundedOwnedCloses'] and row['fullArm']['pf']==expect['unitPf'],'policy row binds full primary cohort '+row['fold']+'/'+row['arm'])
for f in seal['files']: need(sha(root/f['path'])==f['sha256'],'source changed during audit '+f['path'])
need(subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==seal['checkpoint'],'HEAD final checkpoint')
out={'schema':'cts-block-independent-cp10-final-review-v1','reviewer':'/root/return_pf_review','reviewedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Read-only independent recomputation of all 20 frozen modeled comparison arms; no outcome-driven source edits, engines, network or live execution.','protocolSha256':seal['protocolSha256'],'sourceSha256':seal['sourceSha256'],'checkpoint':seal['checkpoint'],'scopeCounts':{'folds':2,'armsPerFold':10,'captures':20,'currentSourceFilesMatched':len(seal['files'])},'findings':defects,'passed':not defects,'releaseBlockers':[],'previousAttempt':{'path':str(previous),'checkpoint':previousSeal['checkpoint'],'sourceSha256':previousSeal['sourceSha256'],'originalIndependentAuditSha256':'48eda39b63495b637e65e70697ac6d7eecda7f48630f6c8c3a8096958292c98f'},'observedPreviousEconomicComparison':equivalence,'economicIdentityAssumed':False,'independentMinuteRecomputation':minuteResults,'coverageRecomputation':coverageResults,'noncomparablePfChecks':noncomparable,'passingProfiles':passingProfiles,'attestation':'Reviewer /root/return_pf_review independently checked all 20 native retained cohorts and minute-risk bindings using direct arithmetic; no engine runs, source writes or outcome-driven tuning.','summaries':summaries,'matchedSliceChecks':paired,'nativeFailedCheckOccurrences':dict(failures),'noPromotion':comparison['noPromotion'],'limitations':['Both historical windows reused retrospective development data.','Any empty fold or Active cold start is insufficient evidence, not a profitable result; counts are computed per arm.','sideGateN absent/0 and blockTrace absent/false in frozen parameters; targeted CP7/CP8 tests cover those paths, this study does not enable or validate their performance.','Raw native unavailable PF comparisons remain ok:false and are classified noncomparable; no null-equality performance pass is manufactured.','Native account model uses $1000, equityPct2%, leverage10 and x01 fallback caps0.75/7 because selected settings contained no positive live caps; not venue account funding.','Exact drawdown uses native minute-close marks, not wick/tick or liquidation paths; five-minute display samples are distinct.','Actual venue fills, fees, funding and execution latency were not measured.'],'artifacts':artifacts}
p=Path('/tmp/cts-block-independent-cp10-final-review-20261016.json'); p.write_text(json.dumps(out,indent=2)+'\n'); digest=sha(p); Path(str(p)+'.sha256').write_text(digest+'  '+p.name+'\n')
print(json.dumps({'manifest':str(p),'sha256':digest,'passed':out['passed'],'defectCount':len(defects),'defects':defects[:20],'summaries':summaries,'matched':paired,'nativeFailureOccurrences':dict(failures)},indent=2))
