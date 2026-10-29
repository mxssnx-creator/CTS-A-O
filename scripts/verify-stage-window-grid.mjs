#!/usr/bin/env node
// Independent scalar audit. No strategy, PF, stage gate or position-count implementation imports.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
const dir=process.argv[2];if(!dir)throw new Error('usage: verify-stage-window-grid.mjs STUDY_DIRECTORY');
const p=JSON.parse(readFileSync(`${dir}/protocol.json`)),reported=JSON.parse(readFileSync(`${dir}/results.json`)),
  sha=b=>createHash('sha256').update(b).digest('hex');
for(const [file,expected]of Object.entries(p.sourceSha256)){const snapshot=`${dir}/source-snapshot/${file}`;
  assert.equal(sha(readFileSync(existsSync(snapshot)?snapshot:file)),expected,`source changed ${file}`);}
const near=(a,b,label='number')=>a===null||b===null?assert.equal(a,b,label):
  assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${label}: ${a} != ${b}`),
  pf=(gp,gl)=>gl>0?gp/gl:gp>0?4:0,names=['main','inverseMain','real','inverseReal','active','inverseActive'];
let windows=0,prices=0,contexts=0;const keys=new Set(),aggregates=new Map();
const blank=()=>({qualified:0,failed:0,insufficient:0,unknown:0,parentMissing:0});
for(const a of p.primarySamples)for(const b of p.secondarySamples)for(const m of p.mainSecondarySamples)for(const r of p.realSamples)
  aggregates.set(`${a}|${b}|${m}|${r}`,{historical:{base:0,baseGp:0,baseGl:0,main:0,inverseMain:0},
    decisions:Object.fromEntries(names.map(n=>[n,blank()])),stages:Object.fromEntries(names.map(n=>[n,[]])),
    readiness:{matchedMain:0,maxMainOwnN:0,mainFullPrimary:0,matchedInverse:0,maxInverseOwnN:0,inverseFullPrimary:0}});
const win=(trades,t,n)=>{windows++;const xs=trades.filter(x=>x.exitT<t).sort((a,b)=>a.exitT-b.exitT||a.entryT-b.entryT).slice(-n);
  const gp=xs.reduce((a,x)=>a+Math.max(0,x.r),0),gl=xs.reduce((a,x)=>a+Math.max(0,-x.r),0);
  return{n:xs.length,pf:xs.length<n?null:pf(gp,gl),gp,gl,mean:xs.length<n?null:(gp-gl)/n,
    state:xs.length<n?'insufficient':gp>gl&&pf(gp,gl)>=p.minPf?'qualified':'failed'};};
const dual=(trades,t,primaryN,secondaryN)=>{const a=win(trades,t,primaryN),b=win(trades,t,secondaryN);
  return{state:a.state==='insufficient'||b.state==='insufficient'?'insufficient':a.state==='qualified'&&b.state==='qualified'?'qualified':'failed',primary:a,secondary:[b]};};
const compareGate=(actual,expected)=>{assert.equal(actual.state,expected.state);assert.equal(actual.primary.n,expected.primary.n);near(actual.primary.pf,expected.primary.pf);
  assert.equal(actual.secondary.length,expected.secondary.length);for(let i=0;i<actual.secondary.length;i++){assert.equal(actual.secondary[i].n,expected.secondary[i].n);near(actual.secondary[i].pf,expected.secondary[i].pf);}};
const negative=(trades,t)=>{const a=win(trades,t,50),b=win(trades,t,5),c=win(trades,t,10),mean=b.mean!==null&&c.mean!==null?(b.mean+c.mean)/2:null;
  return{primary:a,mean,state:a.state==='insufficient'||b.state==='insufficient'||c.state==='insufficient'?'insufficient':a.state==='qualified'&&mean<0?'qualified':'failed'};};
const all=(result,c)=>[...result.trades.map(t=>({...t,closed:true,tf:c.tf,kind:c.kind})),
  ...(result.open?[{...result.open,exitT:Infinity,closed:false,tf:c.tf,kind:c.kind}]:[])],
  entryTimes=(result,c)=>new Set(all(result,c).map(t=>t.entryT)),policy=(n,s)=>JSON.stringify([n,s,'static',[5,10,15,20,25]]);
const checkSet=(wrapper,c,stage,side,parent,admission,variant='direct')=>{const id=JSON.parse(wrapper.setId);
  assert.equal(id[0],stage);assert.equal(id[1],wrapper.parentSetId);if(parent!==undefined)assert.equal(id[1],parent);
  assert.deepEqual(JSON.parse(id[2]),[c.cfg,c.sym,side,c.kind,c.relation,p.economicRevision]);assert.equal(id[4],variant);
  near(id[5],p.minPf);assert.equal(id[6],admission);assert.equal(wrapper.admissionPolicy,admission);};
const readable=createReadStream(`${dir}/contexts.jsonl.gz`).pipe(createGunzip());
for await(const line of createInterface({input:readable,crlfDelay:Infinity})){
  const c=JSON.parse(line),key=JSON.stringify([c.cfg,c.sym,c.side,c.tf,c.kind,c.relation]);
  assert.ok(!keys.has(key));keys.add(key);contexts++;assert.ok(p.symbols.includes(c.sym)&&p.tfs.includes(c.tf)&&[1,-1].includes(c.side));
  const read=wrapper=>{assert.ok(Number.isInteger(wrapper.data)&&wrapper.data>=0&&wrapper.data<c.dictionary.length);return c.dictionary[wrapper.data];},
    raw=c.dictionary[c.raw],checkPrices=(result,side)=>{const seen=new Set();for(const t of result.trades){
      assert.equal(t.cfg,c.cfg);assert.equal(t.sym,c.sym);assert.equal(t.side,side);assert.ok(!seen.has(t.entryT));seen.add(t.entryT);
      assert.ok(Number.isFinite(t.entry)&&Number.isFinite(t.exit)&&t.entry>0&&t.exit>0&&Number.isFinite(t.r));
      assert.ok(t.entryT>=p.from&&t.exitT<=p.end&&t.exitT>=t.entryT);assert.ok((t.exitT-t.entryT)/60000<=p.holdMinutes);
      near(t.r,side*(t.exit-t.entry)/t.entry-p.cost,'cost-adjusted price return');prices++;
    }if(result.open){assert.equal(result.open.cfg,c.cfg);assert.equal(result.open.sym,c.sym);assert.equal(result.open.side,side);assert.ok(result.open.entryT>=p.from&&result.open.entryT<p.end);}};
  checkPrices(raw,c.side);
  for(const primary of p.primarySamples)for(const secondary of p.secondarySamples){const b=c.bases[`${primary}|${secondary}`],main=read(b.main),inverse=read(b.inverseMain),
    mainEntries=entryTimes(main,c),mainDecisions=c.dictionary[b.mainDecisions],inverseDecisions=c.dictionary[b.inverseDecisions];
    checkSet(b.main,c,'main',c.side,undefined,policy(primary,secondary));const root=JSON.parse(b.main.parentSetId);
    assert.equal(root[0],'base');assert.equal(root[1],null);assert.equal(root[6],policy(primary,secondary));
    assert.deepEqual(JSON.parse(root[2]),[c.cfg,c.sym,c.side,c.kind,c.relation,p.economicRevision]);
    checkSet(b.inverseMain,c,'main',-c.side,b.main.setId,JSON.stringify([50,true,[5,10]]),'inverse');
    checkPrices(main,c.side);checkPrices(inverse,-c.side);
    for(const t of all(main,c))assert.equal(dual(raw.trades,t.entryT,primary,secondary).state,'qualified');
    for(const t of all(inverse,c)){assert.ok(mainEntries.has(t.entryT));assert.equal(negative(main.trades,t.entryT).state,'qualified');}
    for(const d of mainDecisions){assert.ok(d.entryT>=p.start);compareGate(d,dual(raw.trades,d.entryT,primary,secondary));}
    for(const d of inverseDecisions){assert.ok(d.entryT>=p.start);if(!mainEntries.has(d.entryT))assert.equal(d.state,'parentMissing');
      else{const e=negative(main.trades,d.entryT);assert.equal(d.state,e.state);near(d.primaryPf,e.primary.pf);near(d.mean,e.mean);}}
    for(const mainN of p.mainSecondarySamples)for(const realN of p.realSamples){const data=b.cases[`${mainN}|${realN}`],a=aggregates.get(`${primary}|${secondary}|${mainN}|${realN}`),
      real=read(data.real),inverseReal=read(data.inverseReal),active=read(data.active),inverseActive=read(data.inverseActive),
      checkpoint={base:dual(raw.trades,p.start,primary,secondary),main:dual(main.trades,p.start,50,mainN),inverseMain:dual(inverse.trades,p.start,50,mainN)},
      decisions={main:mainDecisions,inverseMain:inverseDecisions,...Object.fromEntries(Object.entries(data.decisions).map(([n,index])=>[n,c.dictionary[index]]))};
      for(const n of ['base','main','inverseMain'])compareGate(data.checkpoint[n],checkpoint[n]);
      if(checkpoint.base.state==='qualified'){const h=a.historical;h.base++;h.baseGp+=checkpoint.base.primary.gp;h.baseGl+=checkpoint.base.primary.gl;
        if(checkpoint.main.state==='qualified')h.main++;if(checkpoint.inverseMain.state==='qualified')h.inverseMain++;}
      checkSet(data.real,c,'real',c.side,b.main.setId,policy(50,mainN));
      checkSet(data.inverseReal,c,'real',-c.side,b.inverseMain.setId,policy(50,mainN),'inverse');
      checkSet(data.active,c,'active',c.side,data.real.setId,JSON.stringify(realN));
      checkSet(data.inverseActive,c,'active',-c.side,data.inverseReal.setId,JSON.stringify(realN),'inverse');
      for(const [name,result,parent,label]of [['real',real,main,'Main'],['inverseReal',inverseReal,inverse,'Inverse']]){
        checkPrices(result,label==='Main'?c.side:-c.side);const parents=entryTimes(parent,c);
        for(const t of all(result,c)){assert.ok(parents.has(t.entryT));assert.equal(dual(parent.trades,t.entryT,50,mainN).state,'qualified');}
        for(const d of decisions[name]){if(!parents.has(d.entryT))assert.equal(d.state,'parentMissing');else{const e=dual(parent.trades,d.entryT,50,mainN);compareGate(d,e);
          a.readiness[`matched${label}`]++;a.readiness[`max${label}OwnN`]=Math.max(a.readiness[`max${label}OwnN`],e.primary.n);if(e.primary.n===50)a.readiness[label==='Main'?'mainFullPrimary':'inverseFullPrimary']++;}}
      }
      for(const [name,result,parent]of [['active',active,real],['inverseActive',inverseActive,inverseReal]]){
        const expected=all(parent,c).filter(t=>win(parent.trades,t.entryT,realN).state==='qualified');
        const actual=all(result,c);assert.equal(actual.length,expected.length);
        for(let i=0;i<actual.length;i++){const x=actual[i],y=expected[i];for(const k of ['entryT','exitT','entry','exit','side','r','closed'])assert.equal(x[k],y[k],`Active mirrors exact Real ${k}`);}
        for(const d of decisions[name]){const e=win(parent.trades,d.entryT,realN);compareGate(d,{state:e.state,primary:e,secondary:[]});}
      }
      const values={main,inverseMain:inverse,real,inverseReal,active,inverseActive};
      for(const n of names){for(const d of decisions[n]){assert.ok(Object.hasOwn(a.decisions[n],d.state));a.decisions[n][d.state]++;}
        a.stages[n].push(...all(values[n],c).filter(t=>t.entryT>=p.start&&t.entryT<p.end));}
    }
  }
  if(contexts%1200===0)process.stderr.write(`independently audited ${contexts}/4800 contexts\n`);
}
assert.equal(contexts,4800);assert.equal(contexts,reported.contextCount);assert.equal(reported.cases.length,80);
const counts=orders=>{const by=new Map();for(const t of orders){const key=`${t.sym}|${t.side}`;const xs=by.get(key)??[];xs.push(t);by.set(key,xs);}let openedPositions=0,closedPositions=0,openPositions=0;
  for(const xs of by.values()){xs.sort((a,b)=>a.entryT-b.entryT);let end=-Infinity,exists=false;for(const t of xs){if(t.entryT>=end){if(exists&&Number.isFinite(end))closedPositions++;openedPositions++;end=t.exitT;exists=true;}else end=Math.max(end,t.exitT);}
    if(exists&&Number.isFinite(end))closedPositions++;else if(exists)openPositions++;}
  return{openedPositions,closedPositions,openPositions,openedOrders:orders.length,settledOrders:orders.filter(t=>t.closed).length,openOrders:orders.filter(t=>!t.closed).length};};
const compareStats=(actual,orders)=>{const count=counts(orders);for(const[k,n]of Object.entries(count))assert.equal(actual[k],n,k);
  const closed=orders.filter(t=>t.closed),gp=closed.reduce((a,t)=>a+Math.max(0,t.r),0),gl=closed.reduce((a,t)=>a+Math.max(0,-t.r),0),reasons={};
  for(const t of closed)reasons[t.reason]=(reasons[t.reason]??0)+1;
  near(actual.grossProfit,gp);near(actual.grossLoss,gl);near(actual.returnPf,closed.length&&gl?gp/gl:null);assert.equal(actual.noLoss,closed.length>0&&gp>0&&!gl);assert.deepEqual(actual.reasons,reasons);
  assert.equal(actual.hourly.length,24);for(let i=0;i<24;i++){const h=actual.hourly[i],from=p.start+i*3600000,xs=closed.filter(t=>t.exitT>from&&t.exitT<=from+3600000),gain=xs.reduce((a,t)=>a+Math.max(0,t.r),0),loss=xs.reduce((a,t)=>a+Math.max(0,-t.r),0);
    assert.equal(h.t,from);assert.equal(h.n,xs.length);near(h.gp,gain);near(h.gl,loss);near(h.net,gain-loss);near(h.pf,loss?gain/loss:null);}};
for(const c of reported.cases){const a=aggregates.get(`${c.basePrimaryN}|${c.baseSecondaryN}|${c.mainSecondaryN}|${c.realN}`);
  for(const [k,n]of Object.entries(a.historical))near(c.historical[k],n,k);near(c.historical.basePercent,100*a.historical.base/contexts);
  near(c.historical.basePrimaryPf,a.historical.baseGl?a.historical.baseGp/a.historical.baseGl:null);assert.deepEqual(c.readiness,a.readiness);
  for(const n of names){const d=a.decisions[n],total=Object.values(d).reduce((a,b)=>a+b,0);for(const[k,value]of Object.entries(d))assert.equal(c.decisions[n][k],value);
    assert.equal(c.decisions[n].evaluated,total);near(c.decisions[n].percent,total?100*d.qualified/total:null);compareStats(c.stages[n],a.stages[n]);
    for(const[k,g]of Object.entries(c.groups)){const[kind,tf]=k.split('|');compareStats(g[n],a.stages[n].filter(t=>t.kind===kind&&t.tf===+tf));}
    for(const s of [1,-1])compareStats(c.sides[s][n],a.stages[n].filter(t=>t.side===s));
  }
}
const effectiveActive=[...aggregates].map(([key,a])=>{const orders=[...a.stages.active,...a.stages.inverseActive],closed=orders.filter(t=>t.closed),gp=closed.reduce((sum,t)=>sum+Math.max(0,t.r),0),gl=closed.reduce((sum,t)=>sum+Math.max(0,-t.r),0);return{case:key,...counts(orders),grossProfit:gp,grossLoss:gl,returnPf:closed.length&&gl?gp/gl:null,noLoss:closed.length>0&&gp>0&&!gl};});
const audit={status:'pass',contexts,cases:reported.cases.length,independentlyScoredWindows:windows,independentlyCheckedPriceReturns:prices,
  effectiveActive,verifierSha256:sha(readFileSync(new URL(import.meta.url))),protocolSha256:sha(readFileSync(`${dir}/protocol.json`)),scope:p.scope};
writeFileSync(`${dir}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify(audit)+'\n');
