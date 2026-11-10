#!/usr/bin/env node
// Frozen offline candidate-coverage study; no connection, venue, orders or PF promotion.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, headBars } from "../src/core/market/bars.ts";
import { makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { buildTapes, defaultWalkForward } from "../src/core/sim/walkforward.ts";
import { lastNSamplesGen } from "../src/core/server/last-n-samples.ts";

const [directory, output] = process.argv.slice(2);
assert.ok(directory && output,"usage: script MARKET_DIRECTORY OUTPUT_JSON");
const H = 3_600_000, M = 60_000;
const from = Date.UTC(2026,10,6,6), tradeStart = Date.UTC(2026,10,8,6), end = Date.UTC(2026,10,9,6);
const names = readdirSync(directory).filter(x => x.endsWith(".json")).sort();
assert.equal(names.length,12);
const hashes = {}, bars = names.map(name => {
  const body = readFileSync(resolve(directory,name));
  hashes[name] = createHash("sha256").update(body).digest("hex");
  const rows = JSON.parse(body);
  assert.equal(rows.length,4320);
  for (const [i,row] of rows.entries()) {
    assert.equal(row[0],from+i*M);
    assert.ok(row.length >= 6 && row.slice(0,6).every(Number.isFinite));
    assert.ok(row[2] >= Math.max(row[1],row[4]) && row[3] <= Math.min(row[1],row[4]));
  }
  assert.equal(rows.at(-1)[0]+M,end);
  const out = barsFromCandles(name.slice(0,-5),1,rows.map(([t,o,h,l,c,v])=>({t,o,h,l,c,v})));
  out.lanes = [1]; return out;
});
assert.equal(end-from,72*H);
const indications = ["ema-9-21@m1","rsi-mid@m1","micro-1-adaptive-fast","micro-1-break-close-fast"];
const cost=.0011, minSl=.001+cost;
const protects = [
  ["mc",[.002,.003]], ["mn",[.005,.006]], ["sh",[.01,.012]],
].flatMap(([tag,tps])=>tps.flatMap(tp=>[.25,.5].map(ratio=>({
  tp,sl:Math.max(minSl,tp*ratio),trail:0,hold:60,tag,
}))));
const drain = gen => { for (;;) { const next=gen.next(); if(next.done)return next.value; } };
const results=[];
let scalarChecks=0, prefixChecks=0;
for (const preH of [24,48]) {
  const began=performance.now(), evaluationFromT=tradeStart-preH*H;
  const universe=makeUniverse(bars,evaluationFromT);
  const options={...defaultWalkForward(DEFAULT_SETTINGS),preH,longH:preH,simH:24,startT:tradeStart,
    // The ordinary diagnostic has no Signal/Exit input; their defaults are not rewritten.
    signalLongH:150};
  const tapes=buildTapes(universe,protects,cost,undefined,new Set(indications.map(ind=>`follow|${ind}`)),null);
  assert.ok(tapes.length>0);
  const startCoverage=drain(lastNSamplesGen(tapes,tradeStart,options));
  const endCoverage=drain(lastNSamplesGen(tapes,end,options));
  // Independent direct filter oracle includes both sides and symbols without any closes.
  const oracle=new Map();
  for(const tp of tapes) for(const sym of new Set(tp.syms)) for(const side of [1,-1]) {
    const rows=Array.from({length:tp.n},(_,i)=>i).filter(i=>tp.syms[tp.symI[i]]===sym&&tp.side[i]===side&&
      tp.exitT[i]>=tradeStart-preH*H&&tp.exitT[i]<tradeStart);
    const key=tp.protect.tag, count=oracle.get(key)??{contexts:0,usable:0};
    count.contexts++;if(rows.length>=options.gates.minTrades&&rows.every(i=>Number.isFinite(tp.r[i])))count.usable++;
    oracle.set(key,count);scalarChecks++;
  }
  for(const row of startCoverage.rows.filter(x=>x.window==="history")) {
    assert.deepEqual({contexts:row.contexts,usable:row.usable},oracle.get(row.range));
    assert.equal(row.unknown,0);
  }
  // Building only the actual past must reproduce every recorded pre-start close.
  const past=buildTapes(makeUniverse(bars.map(b=>headBars(b,tradeStart)),evaluationFromT),
    protects,cost,undefined,new Set(indications.map(ind=>`follow|${ind}`)),null);
  const closePrefix=tp=>Array.from({length:tp.n},(_,i)=>i).filter(i=>tp.exitT[i]<tradeStart)
    .map(i=>[tp.syms[tp.symI[i]],tp.side[i],tp.entryT[i],tp.exitT[i],tp.r[i]]);
  const pastById=new Map(past.map(tp=>[tp.id,tp]));
  assert.equal(pastById.size,tapes.length);
  for(const tp of tapes) {assert.deepEqual(closePrefix(tp),closePrefix(pastById.get(tp.id)));prefixChecks++;}
  const rows=tapes.map(tp=>({id:tp.id,ind:tp.ind,kind:tp.kind,protect:tp.protect,
    historyCloses:Array.from(tp.exitT).filter(t=>t<tradeStart).length,
    subsequentCandidateCloses:Array.from(tp.exitT).filter(t=>t>=tradeStart&&t<end).length}));
  results.push({preH,evaluationFromT,tapes:tapes.length,startCoverage,endCoverage,configs:rows,
    elapsedMs:performance.now()-began});
}
const report={kind:"native-candidate-readiness",generatedAt:new Date().toISOString(),
  sourceBase:"057f9d1",window:{from,tradeStart,end,totalH:72,tradeH:24},symbols:bars.map(b=>b.sym),
  inputs:hashes,protocol:{indications,protects,cost,minSl,source:"frozen retrospective minute OHLCV",
    strategies:["normal"],scope:"compact configured candidate catalogue; no Base admission or execution claim",
    historicalPf:null,postBasePf:null,venuePf:null,processedNative:"persistent-paper-venue-adapter-pending"},
  checks:{scalarContexts:scalarChecks,prefixConfigs:prefixChecks,mismatches:0},
  sourceSha256:Object.fromEntries(["scripts/history-readiness-study-20261110.mjs","src/core/sim/walkforward.ts",
    "src/core/server/last-n-samples.ts","src/core/pipeline/pipeline.ts","src/core/config.ts",
    "src/core/minimal-coord.ts","src/core/step-pf.ts"].map(path=>[path,createHash("sha256").update(readFileSync(path)).digest("hex")])),
  results,peakRssKiB:process.resourceUsage().maxRSS};
mkdirSync(dirname(resolve(output)),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+"\n");
for (const r of results) for (const row of r.startCoverage.rows.filter(x=>x.window==="history"))
  console.log(JSON.stringify({preH:r.preH,range:row.range,n:row.n,usable:row.usable,contexts:row.contexts,pct:row.pct}));
console.log(JSON.stringify({output,tapes:results.map(r=>r.tapes),elapsedMs:results.map(r=>r.elapsedMs),peakRssKiB:report.peakRssKiB}));
