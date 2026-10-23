#!/usr/bin/env node
// Diagnostic-only summaries. A virtual sweep has no shared-book allocations and cannot nominate a funded winner.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function summarizeDcaSweep(windows) {
  assert.ok(windows.length, "No sweep windows found");
  const ordered = [...windows].sort((a,b)=>(a.window?.startT??0)-(b.window?.startT??0));
  for (let i=0;i<ordered.length;i++) {
    const w=ordered[i];
    assert.equal(w.schema,"cts-dca-sweep-v2","Legacy sweeps lack verified return/endpoint evidence; rerun the sweep");
    assert.ok(Number.isFinite(w.window?.startT)&&w.window.endT>w.window.startT,"Exact window boundaries are required");
    if(i) assert.ok(w.window.startT>=ordered[i-1].window.endT,"Overlapping windows cannot be pooled as independent closes");
  }
  const empty=()=>({n:0,gp:0,gl:0,net:0,mdd:0,ddt:0,positiveWindows:0,unknownReturns:0,markedOpenExcluded:0,known:true});
  const add=(a,s,basis)=>{
    assert.ok(s&&Number.isInteger(s.n)&&s.n>=0,"Missing or invalid scenario statistics");
    assert.equal(s.basis,basis);
    a.n+=s.n;a.unknownReturns+=s.unknownReturns??0;a.markedOpenExcluded+=s.markedOpenExcluded??0;
    if(s.pfBasis!=="unit-net-returns"||![s.gp,s.gl,s.net,s.mdd,s.ddt].every(Number.isFinite)) { a.known=false;return; }
    a.gp+=s.gp;a.gl+=s.gl;a.net+=s.net;a.mdd=Math.max(a.mdd,s.mdd);a.ddt=Math.max(a.ddt,s.ddt);
    if(s.net>0)a.positiveWindows++;
  };
  const finish=a=>({...a,...(!a.known?{gp:null,gl:null,net:null,mdd:null,ddt:null,positiveWindows:null}:{}),
    pf:a.known&&a.gl>0?a.gp/a.gl:null,pfState:!a.known?"unknown":!a.n?"empty":a.gl>0?"ratio":a.gp>0?"no-loss":"flat"});
  const agg=new Map();
  for(const w of ordered) {
    const seen=new Set();
    for(const r of w.rows)for(const kind of ["dca","dca-active"]) {
      const key=`${r.name}|${kind}`;assert.ok(!seen.has(key),"Duplicate scenario in a window");seen.add(key);
      const a=agg.get(key)??{name:r.name,kind,dca:r.dca,windows:0,base:empty(),virtual:empty()};
      assert.deepEqual(a.dca,r.dca,"A scenario name cannot pool different configurations");
      a.windows++;add(a.base,r.base?.[kind],"unfiltered-tape-diagnostic");
      add(a.virtual,r.byKind?.[kind],"post-gate-unfunded-virtual-scenario");agg.set(key,a);
    }
  }
  const rows=[...agg.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.kind.localeCompare(b.kind))
    .map(a=>({...a,base:finish(a.base),virtual:finish(a.virtual)}));
  return {schema:"cts-dca-sweep-summary-v2",basis:"unfunded-sensitivity-diagnostics",windowCount:ordered.length,
    windows:ordered.map(w=>({...w.window,symbols:w.symbols})),
    promotion:{eligible:false,reason:"Funded shared-book allocations and an untouched confirmation window are not recorded",candidates:[]},rows};
}
export function renderDcaSweep(summary) {
  const f=x=>Number.isFinite(x)?x.toFixed(2):"—";
  const pf=s=>s.pfState==="no-loss"?"no loss":s.pfState==="ratio"?f(s.pf):s.pfState;
  return ["# DCA sweep diagnostics","",`${summary.windowCount} non-overlapping windows. Rows are alphabetical, not a ranking.`,"",
    "Base is unfiltered candidate history. WF is post-gate virtual settlement without shared-book funding. Endpoint marks are excluded. These are not account returns; drawdown and DDT are the worst individual-window values, not a pooled equity path. Unknown evidence remains unknown.","",
    "No best configuration is emitted: funded allocations and an untouched confirmation window are required for that decision.","",
    "| Variant | Kind | Base closes | Base PF | WF closes | WF PF | WF unit net % | WF worst DD % | WF worst DDT h | WF positive windows | Excluded marks |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summary.rows.map(r=>`| ${r.name.replaceAll("|","/")} | ${r.kind} | ${r.base.n} | ${pf(r.base)} | ${r.virtual.n} | ${pf(r.virtual)} | ${f(r.virtual.net)} | ${f(r.virtual.mdd)} | ${f(r.virtual.ddt)} | ${r.virtual.positiveWindows??"unknown"}/${r.windows} | ${r.virtual.markedOpenExcluded} |`),""].join("\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const argv=process.argv.slice(2),arg=(k,d)=>{const i=argv.indexOf(`--${k}`);return i<0?d:argv[i+1];};
  const prefix=arg("glob","runs/dca/s1-w"),out=arg("out","runs/dca/stage1"),dir=dirname(prefix);
  const windows=readdirSync(dir).filter(f=>f.startsWith(basename(prefix))&&f.endsWith(".json"))
    .sort().map(f=>JSON.parse(readFileSync(join(dir,f),"utf8")));
  const result=summarizeDcaSweep(windows);
  writeFileSync(`${out}.md`,renderDcaSweep(result));
  writeFileSync(`${out}.summary.json`,JSON.stringify(result,null,2)+"\n");
  writeFileSync(`${out}.best.json`,"[]\n");
  console.log(`${result.windowCount} windows · ${result.rows.length} diagnostic rows · 0 funded promotion candidates`);
}
