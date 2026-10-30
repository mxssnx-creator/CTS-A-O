#!/usr/bin/env node
// Same-entry economic parity and loss attribution. Does not infer profit from historical qualification.
import assert from 'node:assert/strict';
import { createReadStream,readFileSync,writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
const directory=process.argv[2];if(!directory)throw new Error('usage: trace-stage-window-attrition.mjs AUDITED_STUDY_DIRECTORY');
const p=JSON.parse(readFileSync(`${directory}/protocol.json`)),audit=JSON.parse(readFileSync(`${directory}/audit.json`));assert.equal(audit.status,'pass');
const fresh=()=>({n:0,held:0,gp:0,gl:0,grossGp:0,grossGl:0,costSum:0,durations:[],reasons:{}}),
  add=(s,t)=>{if(!t.closed){s.held++;return;}s.n++;s.gp+=Math.max(0,t.r);s.gl+=Math.max(0,-t.r);const gross=t.side*(t.exit-t.entry)/t.entry;
    s.grossGp+=Math.max(0,gross);s.grossGl+=Math.max(0,-gross);s.costSum+=p.cost;s.durations.push((t.exitT-t.entryT)/60000);s.reasons[t.reason]=(s.reasons[t.reason]??0)+1;},
  score=s=>{const durations=s.durations.toSorted((a,b)=>a-b),{durations:_,...rest}=s;return{...rest,returnPf:s.n&&s.gl?s.gp/s.gl:null,
    grossPricePf:s.n&&s.grossGl?s.grossGp/s.grossGl:null,noLoss:s.n>0&&s.gp>0&&!s.gl,
    medianHoldMin:durations.length?durations[Math.floor((durations.length-1)/2)]:null,p95HoldMin:durations.length?durations[Math.ceil(durations.length*.95)-1]:null,
    maxHoldMin:durations.length?durations.at(-1):null};},
  all=result=>[...result.trades.map(t=>({...t,closed:true})),...(result.open?[{...result.open,closed:false}]:[])],
  near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`different economics ${a} vs ${b}`),
  accum=new Map();
for(const a of p.primarySamples)for(const b of p.secondarySamples)accum.set(`${a}|${b}`,{main:fresh(),matched:fresh(),extra:fresh(),
  initiallyQualifiedBaseFuture:fresh(),contextsWithMain:0,matchedEntries:0,extraEntries:0,equalFullEconomics:0,unmatchedCloses:0,groups:new Map(),symbols:new Map(),byReason:new Map(),holdBuckets:new Map()});
const contextRows=[];let contexts=0,matched=0,extra=0;
for await(const line of createInterface({input:createReadStream(`${directory}/contexts.jsonl.gz`).pipe(createGunzip()),crlfDelay:Infinity})){
  const c=JSON.parse(line),d=c.dictionary,raw=d[c.raw],rawEntries=new Map(all(raw).map(t=>[t.entryT,t]));contexts++;
  for(const [key,b]of Object.entries(c.bases)){const a=accum.get(key),main=d[b.main.data],trades=all(main).filter(t=>t.entryT>=p.start&&t.entryT<p.end),
    accepted=new Set(trades.map(t=>t.entryT)),decisions=d[b.mainDecisions];
    assert.equal(accepted.size,trades.length,'one entry per exact source slot');
    assert.equal(decisions.filter(x=>x.state==='qualified').length,trades.length,'no accepted entry silently lost');
    for(const x of decisions)assert.equal(accepted.has(x.entryT),x.state==='qualified','exact qualified admission ownership');
    if(b.cases['15|15'].checkpoint.base.state==='qualified')for(const t of all(raw).filter(t=>t.entryT>=p.start&&t.entryT<p.end))add(a.initiallyQualifiedBaseFuture,t);
    if(trades.length)a.contextsWithMain++;
    const own=fresh();let ownMatched=0,ownExtra=0;
    for(const t of trades){add(a.main,t);add(own,t);const original=rawEntries.get(t.entryT);
      if(original){a.matchedEntries++;matched++;ownMatched++;
        assert.equal(t.closed,original.closed,'same entry retains its own held/closed lifecycle');assert.equal(t.side,original.side);near(t.entry,original.entry);
        if(t.closed){assert.equal(t.exitT,original.exitT);assert.equal(t.reason,original.reason);near(t.exit,original.exit);near(t.r,original.r);a.equalFullEconomics++;}
        add(a.matched,t);
      }else{a.extraEntries++;extra++;ownExtra++;add(a.extra,t);}
      const group=`${c.kind}|${c.tf}|${c.relation}`,reason=t.closed?t.reason:'held',hold=t.closed?(t.exitT-t.entryT)/60000:null,
        bucket=hold===null?'held':hold<=5?'0–5 min':hold<=15?'5–15 min':hold<=30?'15–30 min':hold<=60?'30–60 min':'>60 min';
      for(const [map,label]of [[a.groups,group],[a.symbols,c.sym],[a.byReason,reason],[a.holdBuckets,bucket]]){if(!map.has(label))map.set(label,fresh());add(map.get(label),t);}
    }
    contextRows.push({cfg:c.cfg,sym:c.sym,side:c.side,tf:c.tf,kind:c.kind,relation:c.relation,case:key,initialBase:b.cases['15|15'].checkpoint.base,
      main:score(own),matchedEntries:ownMatched,extraEntries:ownExtra});
  }
}
assert.equal(contexts,4800);
const results=[...accum].map(([key,a])=>({case:key,contextsWithMain:a.contextsWithMain,matchedEntries:a.matchedEntries,extraEntries:a.extraEntries,equalFullEconomics:a.equalFullEconomics,
  main:score(a.main),matched:score(a.matched),extra:score(a.extra),initiallyQualifiedBaseFuture:score(a.initiallyQualifiedBaseFuture),
  groups:Object.fromEntries([...a.groups].map(([key,s])=>[key,score(s)])),symbols:Object.fromEntries([...a.symbols].map(([key,s])=>[key,score(s)])),
  byReason:Object.fromEntries([...a.byReason].map(([key,s])=>[key,score(s)])),holdBuckets:Object.fromEntries([...a.holdBuckets].map(([key,s])=>[key,score(s)]))}));
const result={status:'pass',contexts,matchedMainEntryChecks:matched,extraMainEntries:extra,changedMatchedEconomics:0,silentlyLostQualifiedEntries:0,
  note:'All matched Base/Main orders keep identical entry, exit, duration, reason, direction and net return. Extra Main entries arise because denying earlier raw intents leaves the independent Main slot free. Historical gate PF and subsequent returns are different samples. This isolated study has no cross-strategy Exit controller.',
  tracerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),cases:results};
writeFileSync(`${directory}/trace.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const zipped=await import('node:zlib');writeFileSync(`${directory}/trace-contexts.json.gz`,zipped.gzipSync(JSON.stringify(contextRows),{level:9}),{flag:'wx'});
process.stdout.write(JSON.stringify({status:result.status,contexts,matched,extra,changedMatchedEconomics:0,silentlyLostQualifiedEntries:0})+'\n');
