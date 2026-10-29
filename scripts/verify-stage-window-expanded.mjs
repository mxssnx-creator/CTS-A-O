#!/usr/bin/env node
// Independent scalar audit: standard-library imports only. No simulator, gate, stats or position helper imports.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { createGunzip,gunzipSync } from 'node:zlib';
import { createInterface } from 'node:readline';
const dir=process.argv[2];if(!dir)throw new Error('usage: verify-stage-window-expanded.mjs STUDY_DIRECTORY');
const p=JSON.parse(readFileSync(`${dir}/protocol.json`)),r=JSON.parse(readFileSync(`${dir}/results.json`)),
  sha=x=>createHash('sha256').update(x).digest('hex'),feedBytes=readFileSync('docs/micro-optimization-2026-10-20/reproduction-feed.json.gz'),
  feed=JSON.parse(gunzipSync(feedBytes)),bpBy=new Map(p.basePolicies.map(x=>[x.id,x])),npBy=new Map(p.negativePolicies.map(x=>[x.id,x]));
assert.equal(p.version,2);assert.equal(sha(feedBytes),p.feedSha256);assert.equal(bpBy.size,98);assert.equal(npBy.size,30);
assert.equal(p.rejectedPairs.length,6);assert.equal(p.caseCount,48608);assert.equal(p.symbols.length,20);
for(const [path,hash]of Object.entries(p.sourceSha256))assert.equal(sha(readFileSync(existsSync(`${dir}/source-snapshot/${path}`)?`${dir}/source-snapshot/${path}`:path)),hash,path);
const blank=()=>({qualified:0,failed:0,insufficient:0,unknown:0,parentMissing:0}),fresh=()=>({orders:[],checks:blank()}),aggs=new Map(),hist=new Map(),pruned=new Map(),
  names={1:'qualified',2:'failed',3:'insufficient',4:'unknown',5:'parentMissing'},codes=Object.fromEntries(Object.entries(names).map(([a,b])=>[b,+a])),
  get=k=>{let x=aggs.get(k);if(!x)aggs.set(k,x=fresh());return x;},add=(a,b)=>{for(const k of Object.keys(a))a[k]+=b[k]??0;return a;},
  near=(a,b,label='number')=>a===null||b===null?assert.equal(a,b,label):assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${label}: ${a} != ${b}`),
  equal=(a,b,label='value')=>{if(typeof a==='number'&&typeof b==='number')return near(a,b,label);if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return assert.equal(a,b,label);
    assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),`${label} keys`);for(const k of Object.keys(a))equal(a[k],b[k],`${label}.${k}`);},
  combine=ws=>ws.some(w=>w.state==='unknown')?'unknown':ws.some(w=>w.state==='insufficient')?'insufficient':ws.every(w=>w.state==='qualified')?'qualified':'failed',
  all=s=>[...s.trades,...s.open?[s.open]:[]];
let contexts=0,scalarWindows=0,gateDecisions=0,priceRuns=0,priceCloses=0,certificates=0;const identities=new Set(),barCache=new Map();
function counts(xs){let openedPositions=0,closedPositions=0,openPositions=0;const buckets=new Map();
  for(const t of xs){const key=`${t.sym}|${t.side}`,a=buckets.get(key)??[];a.push([t.entryT,t.closed?t.exitT:Infinity]);buckets.set(key,a);}
  for(const a of buckets.values()){a.sort((x,y)=>x[0]-y[0]);let end=-Infinity;for(const [enter,exit]of a){if(enter>=end){if(end!==-Infinity){if(Number.isFinite(end))closedPositions++;else openPositions++;}openedPositions++;end=exit;}else end=Math.max(end,exit);}
    if(end!==-Infinity){if(Number.isFinite(end))closedPositions++;else openPositions++;}}
  return {openedPositions,closedPositions,openPositions,openedOrders:xs.length,settledOrders:xs.filter(x=>x.closed).length,openOrders:xs.filter(x=>!x.closed).length};
}
function stats(a=fresh()){
  const xs=a.orders,cs=xs.filter(t=>t.closed),gp=cs.reduce((s,t)=>s+Math.max(0,t.r),0),gl=cs.reduce((s,t)=>s+Math.max(0,-t.r),0),reasons={},hourly=[],groups={};
  for(const t of cs)reasons[t.reason]=(reasons[t.reason]??0)+1;
  for(let hour=0;hour<24;hour++){const orders=cs.filter(t=>t.exitT>p.start+hour*3600000&&t.exitT<=p.start+(hour+1)*3600000);if(orders.length)hourly.push({hour,n:orders.length,gp:orders.reduce((s,t)=>s+Math.max(0,t.r),0),gl:orders.reduce((s,t)=>s+Math.max(0,-t.r),0)});}
  for(const kind of ['normal','trailing'])for(const tf of [1,5,15])for(const side of [1,-1]){const sub=xs.filter(t=>t.kind===kind&&t.tf===tf&&t.side===side),closed=sub.filter(t=>t.closed),gain=closed.reduce((s,t)=>s+Math.max(0,t.r),0),loss=closed.reduce((s,t)=>s+Math.max(0,-t.r),0);
    groups[`${kind}|${tf}|${side}`]={...counts(sub),gp:gain,gl:loss,pf:loss?gain/loss:null,noLoss:gain>0&&!loss};}
  const evaluated=a.checks.qualified+a.checks.failed+a.checks.insufficient+a.checks.unknown;
  return {...counts(xs),gp,gl,pf:cs.length&&gl?gp/gl:null,noLoss:gp>0&&!gl,reasons,checks:{...a.checks,evaluated,attempted:evaluated+a.checks.parentMissing,percent:evaluated?100*a.checks.qualified/evaluated:null},hourly,groups};
}
function barsFor(sym,tf){const key=`${sym}|${tf}`;let result=barCache.get(key);if(result)return result;const minutes=feed.candles[`${sym}|1`].filter(x=>x.t>=p.from&&x.t<p.end);assert.equal(minutes.length,(p.prehistoryHours+24)*60);
  result=[];for(let i=0;i<minutes.length;i+=tf){const xs=minutes.slice(i,i+tf);assert.equal(xs.length,tf);for(let j=0;j<tf;j++)assert.equal(xs[j].t,p.from+(i+j)*60000);
    result.push({t:xs[0].t,o:xs[0].o,h:Math.max(...xs.map(x=>x.h)),l:Math.min(...xs.map(x=>x.l)),c:xs.at(-1).c});}barCache.set(key,result);return result;}
function scalarPrice(c,direction,allowed){
  priceRuns++;const bars=barsFor(c.sym,c.tf),byTime=new Map(bars.map((b,i)=>[b.t,i])),trades=[],attempts=[];let open=null,blockedUntil=-Infinity;
  const q=c.protect;assert.equal(q.maxHoldMin,p.holdMinutes);assert.equal(q.hold,Math.floor(p.holdMinutes/c.tf));assert.ok(q.tp>0&&q.sl>0&&q.trail>=0);
  for(const t of c.times){if(t<blockedUntil)continue;attempts.push(t);if(!allowed.has(t))continue;const entryI=byTime.get(t);assert.ok(Number.isInteger(entryI));const entry=bars[entryI].o;
    let stop=entry*(1-direction*q.sl),target=entry*(1+direction*q.tp),peak=entry,trailOn=false,closed=false;
    for(let i=entryI;i<bars.length;i++){const b=bars[i],gap=i>entryI,stopHit=direction===1?b.l<=stop:b.h>=stop,targetHit=direction===1?b.h>=target:b.l<=target;let exit,reason;
      if(stopHit){exit=gap?(direction===1?Math.min(b.o,stop):Math.max(b.o,stop)):stop;reason=trailOn?'trail':'sl';}
      else if(targetHit&&!(trailOn&&q.trailFree)){exit=gap?(direction===1?Math.max(b.o,target):Math.min(b.o,target)):target;reason='tp';}
      else if(i-entryI+1>=q.hold){exit=b.c;reason='time';}
      if(reason){const exitT=b.t+c.tf*60000;trades.push({cfg:c.cfg,sym:c.sym,side:direction,entryT:t,exitT,entry,exit,r:direction*(exit-entry)/entry-p.cost,reason,bars:i-entryI+1});blockedUntil=exitT;closed=true;break;}
      if(q.trail>0){peak=direction===1?Math.max(entry,peak,b.h):Math.min(entry,peak,b.l);
        if(direction*(peak-entry)/entry>=q.trail){trailOn=true;const next=peak*(1-direction*q.trail*(q.trailStep??1));stop=direction===1?Math.max(stop,next):Math.min(stop,next);}}
    }
    if(!closed){open={cfg:c.cfg,sym:c.sym,side:direction,entryT:t,entry,stop,target,peak,trailOn};blockedUntil=Infinity;}
  }return {trades,open,attempts};
}
function comparePrice(actual,expected){assert.equal(actual.trades.length,expected.trades.length,'complete close coverage');for(let i=0;i<expected.trades.length;i++){const a=actual.trades[i],b=expected.trades[i];for(const k of Object.keys(b))equal(a[k],b[k],`trade.${i}.${k}`);priceCloses++;}
  assert.equal(!!actual.open,!!expected.open,'complete held coverage');if(expected.open)for(const [k,v]of Object.entries(expected.open))equal(actual.open[k],v,`held.${k}`);
  assert.equal(actual.pending,0,'an unfilled endpoint intent is never an owned order');}
const readable=createReadStream(`${dir}/contexts.jsonl.gz`).pipe(createGunzip());
for await(const line of createInterface({input:readable,crlfDelay:Infinity})){
  const c=JSON.parse(line),key=JSON.stringify([c.cfg,c.sym,c.side,c.tf,c.kind,c.relation]);assert.ok(!identities.has(key));identities.add(key);contexts++;
  assert.ok(p.symbols.includes(c.sym)&&p.tfs.includes(c.tf)&&[1,-1].includes(c.side)&&['normal','trailing'].includes(c.kind));assert.equal(c.base.length,98);
  assert.ok(c.times.every((t,i)=>t>=p.from&&t<p.end&&(!i||t>c.times[i-1])));
  const caches=new Map(),simCache=new Map(),streamIds=new Set([0]),window=(id,n,t)=>{
    const k=`${id}|${n}|${t}`;if(caches.has(k))return caches.get(k);scalarWindows++;
    const xs=c.streams[id].trades.filter(x=>x.entryT<t&&x.exitT<=t).sort((a,b)=>a.exitT-b.exitT||a.entryT-b.entryT).slice(-n),gp=xs.reduce((s,x)=>s+Math.max(0,x.r),0),gl=xs.reduce((s,x)=>s+Math.max(0,-x.r),0),ready=xs.length===n,
      pf=ready?(gl?gp/gl:gp?4:0):null,w={n:xs.length,requestedN:n,pf,mean:ready?(gp-gl)/n:null,state:!ready?'insufficient':gp>gl&&pf>=p.minPf?'qualified':'failed',gp,gl};caches.set(k,w);return w;},
    baseVerdict=(bp,t)=>{const a=window(0,bp.long,t),b=window(0,bp.short,t);if(!bp.minimal)return combine([a,b]);const m=window(0,bp.minimal.n,t),sign=m.mean!==null&&(bp.minimal.polarity==='positive'?m.mean>0:m.mean<0);return combine([a,b,{...m,state:m.state==='insufficient'||m.state==='unknown'?m.state:sign?'qualified':'failed'}]);},
    actualPrice=(direction,allowed)=>{const key=`${direction}|${c.times.map(t=>Number(allowed.has(t))).join('')}`;let x=simCache.get(key);if(!x)simCache.set(key,x=scalarPrice(c,direction,allowed));return x;},
    compChecks=comp=>{const a=blank();for(const [t,s]of comp.decisions){assert.ok(t>=p.start&&t<p.end);a[names[s]]++;}return a;},
    record=(key,id,checks)=>{const a=get(key);add(a.checks,checks);for(const t of c.streams[id].trades)if(t.entryT>=p.start&&t.entryT<p.end)a.orders.push({...t,closed:true,tf:c.tf,kind:c.kind});
      const o=c.streams[id].open;if(o&&o.entryT>=p.start&&o.entryT<p.end)a.orders.push({...o,exitT:p.end,closed:false,tf:c.tf,kind:c.kind});};
  comparePrice(c.streams[0],actualPrice(c.side,new Set(c.times)));
  for(const comp of c.computations){assert.ok(Number.isInteger(comp.parent)&&comp.parent>=0&&comp.parent<c.streams.length);assert.ok(Number.isInteger(comp.stream)&&comp.stream>=0&&comp.stream<c.streams.length);streamIds.add(comp.stream);
    const parent=c.streams[comp.parent],parents=new Set(all(parent).map(t=>t.entryT)),d=comp.descriptor,verdict=t=>{
      if(d.stage==='main'){assert.equal(comp.parent,0);assert.equal(comp.direction,c.side);return baseVerdict(bpBy.get(d.basePolicy),t);}
      if(!parents.has(t))return 'parentMissing';
      if(d.stage==='real')return combine([window(comp.parent,50,t),window(comp.parent,d.mainSecondaryN,t)]);
      assert.equal(d.stage,'inverseMain');assert.equal(comp.direction,-c.side);const np=npBy.get(d.negativePolicy),a=window(comp.parent,50,t),ws=np.windows.map(n=>window(comp.parent,n,t));
      if(a.state==='insufficient'||ws.some(w=>w.state==='insufficient'))return 'insufficient';
      const negative=np.combination==='all'?ws.every(w=>w.mean<0):ws.reduce((s,w)=>s+w.mean,0)/ws.length<0;return a.state==='qualified'&&negative?'qualified':'failed';
    },allowed=new Set(c.times.filter(t=>verdict(t)==='qualified')),expected=actualPrice(comp.direction,allowed);comparePrice(c.streams[comp.stream],expected);assert.deepEqual(comp.attempts,expected.attempts,'source attempts respect only own filled/held orders');
    const decisions=expected.attempts.filter(t=>t>=p.start&&t<p.end).map(t=>[t,codes[verdict(t)]]);assert.deepEqual(comp.decisions,decisions);gateDecisions+=decisions.length;
  }
  for(const edge of c.base){const bp=bpBy.get(edge.policy);assert.ok(bp);const comp=c.computations[edge.main];assert.equal(comp.descriptor.basePolicy,bp.id);const main=c.streams[comp.stream];record(`M|${bp.id}`,comp.stream,compChecks(comp));
    const h=hist.get(bp.id)??{passed:0,evaluated:0,gp:0,gl:0};h.evaluated++;if(baseVerdict(bp,p.start)==='qualified'){h.passed++;const w=window(0,bp.long,p.start);h.gp+=w.gp;h.gl+=w.gl;}hist.set(bp.id,h);
    const pack=w=>Object.fromEntries(['n','requestedN','pf','mean','state'].map(k=>[k,w[k]]));equal(edge.checkpoint,{primary:pack(window(0,bp.long,p.start)),secondary:pack(window(0,bp.short,p.start)),state:baseVerdict(bp,p.start)});
    if(edge.certificate){assert.equal(edge.branches,undefined);certificates++;const cert=edge.certificate,parents=new Set(all(main).map(t=>t.entryT));assert.equal(cert.parentStream,comp.stream);assert.deepEqual(cert.parentEntries,[...parents]);
      assert.equal(cert.primaryN,50);let max=0;for(const t of parents){const w=window(comp.stream,50,t);assert.notEqual(w.state,'qualified','pruning cannot omit a qualified processed parent');max=Math.max(max,w.n);}assert.equal(cert.maxOwnN,max);
      const checks=blank();for(const t of c.times)if(t>=p.start&&t<p.end)checks[parents.has(t)?window(comp.stream,50,t).state:'parentMissing']++;
      const potential=c.times.filter(t=>t>=p.start&&t<p.end).length;assert.equal(cert.potential,potential);assert.deepEqual(cert.checks,checks);
      const b=pruned.get(bp.id)??{checks:blank(),potential:0,contexts:0};add(b.checks,checks);b.potential+=potential;b.contexts++;pruned.set(bp.id,b);
    }else{
      assert.equal(edge.branches.length,31);assert.deepEqual(new Set(edge.branches.map(b=>b.variant)),new Set(['direct',...npBy.keys()]));
      for(const branch of edge.branches){const m=c.computations[branch.main];if(branch.variant==='direct')assert.equal(branch.main,edge.main);else{assert.equal(m.parent,comp.stream);assert.equal(m.descriptor.negativePolicy,branch.variant);record(`I|${bp.id}|${branch.variant}`,m.stream,compChecks(m));}
        assert.deepEqual(branch.real.map(b=>b.n),p.mainSecondarySamples);
        for(const re of branch.real){const rc=c.computations[re.comp];assert.equal(rc.parent,m.stream);assert.equal(rc.descriptor.mainSecondaryN,re.n);assert.equal(rc.direction,branch.variant==='direct'?c.side:-c.side);record(`R|${bp.id}|${branch.variant}|${re.n}`,rc.stream,compChecks(rc));assert.deepEqual(re.active.map(b=>b.n),p.realSamples);
          for(const a of re.active){streamIds.add(a.stream);const source=c.streams[rc.stream],passing=new Set(all(source).filter(t=>window(rc.stream,a.n,t.entryT).state==='qualified').map(t=>t.entryT)),s=c.streams[a.stream];
            assert.deepEqual(s.trades,source.trades.filter(t=>passing.has(t.entryT)));assert.deepEqual(s.open,source.open&&passing.has(source.open.entryT)?source.open:null);
            const decisions=all(source).filter(t=>t.entryT>=p.start&&t.entryT<p.end).map(t=>[t.entryT,codes[window(rc.stream,a.n,t.entryT).state]]);assert.deepEqual(a.decisions,decisions);const checks=blank();for(const [,s]of decisions)checks[names[s]]++;record(`A|${bp.id}|${branch.variant}|${re.n}|${a.n}`,a.stream,checks);}
        }
      }
    }
  }
  assert.equal(streamIds.size,c.streams.length,'no orphaned result stream');
  if(contexts%1200===0)process.stderr.write(`scalar audited ${contexts}/4800 exact contexts\n`);
}
assert.equal(contexts,4800);assert.equal(r.contextCount,4800);assert.equal(r.cases.length,48608);assert.equal(certificates,r.computation.certificateCount);
const summaryCache=new Map(),calculated=(key,extra)=>{const cacheKey=`${key}|${JSON.stringify(extra??null)}`;let x=summaryCache.get(cacheKey);if(!x){const a=aggs.get(key)??fresh();summaryCache.set(cacheKey,x=stats({orders:a.orders,checks:extra?add({...a.checks},extra):a.checks}));}return x;},checked=new Set();
for(const b of r.bases){const h=hist.get(b.policy),pr=pruned.get(b.policy)??{checks:blank(),potential:0,contexts:0};equal(b.historical,{...h,percent:100*h.passed/h.evaluated,pf:h.gl?h.gp/h.gl:null,noLoss:h.gp>0&&!h.gl});equal(r.summaries[b.main],calculated(`M|${b.policy}`));assert.equal(b.certifiedContexts,pr.contexts);assert.deepEqual(b.certifiedNoPrimaryChecks,pr.checks);}
for(const c of r.cases){assert.ok(bpBy.has(c.base));assert.ok(c.variant==='direct'||npBy.has(c.variant));assert.ok(p.mainSecondarySamples.includes(c.mainN)&&p.realSamples.includes(c.realN));assert.equal(c.id,`${c.base}|${c.variant}|${c.mainN}|${c.realN}`);assert.ok(!checked.has(c.id));checked.add(c.id);
  const pr=pruned.get(c.base)??{checks:blank(),potential:0},empty=blank();empty.parentMissing=pr.potential;
  for(const [name,key,extra]of [['main',c.variant==='direct'?`M|${c.base}`:`I|${c.base}|${c.variant}`,c.variant==='direct'?null:pr.checks],
    ['real',`R|${c.base}|${c.variant}|${c.mainN}`,c.variant==='direct'?pr.checks:empty],['active',`A|${c.base}|${c.variant}|${c.mainN}|${c.realN}`,null]]){
    assert.ok(Number.isInteger(c[name])&&c[name]>=0&&c[name]<r.summaries.length);equal(r.summaries[c[name]],calculated(key,extra),`${c.id}.${name}`);}
}
assert.equal(checked.size,98*31*4*4);
const activeCases=r.cases.filter(c=>r.summaries[c.active].settledOrders>0),audit={status:'pass',contexts,cases:checked.size,scalarWindows,gateDecisions,priceRuns,priceCloses,certificates,
  activeCases:activeCases.length,finiteHighActiveCases:activeCases.filter(c=>r.summaries[c.active].pf>=p.minPf).length,scope:p.scope,
  verifierSha256:sha(readFileSync(new URL(import.meta.url))),protocolSha256:sha(readFileSync(`${dir}/protocol.json`)),
  limitations:'Price/protection and causal gate replay are independent scalar checks. Indicator onset times retain recorded-source provenance; these are isolated unallocated modeled orders, not production or venue fills.'};
writeFileSync(`${dir}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify(audit)+'\n');
