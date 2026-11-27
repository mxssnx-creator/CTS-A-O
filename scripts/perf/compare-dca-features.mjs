// Compare a baseline checkout and a candidate checkout, including malformed bars, gaps and streaming prefixes:
// node --experimental-strip-types --no-warnings scripts/perf/compare-dca-features.mjs BASELINE_ROOT CANDIDATE_ROOT
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
if (process.argv.length !== 4) throw new Error('Supply baseline and candidate source roots');
const roots=process.argv.slice(2).map(p => resolve(p));
const mods=await Promise.all(roots.map(async root=>{
  const load=p=>import(pathToFileURL(`${root}/src/core/${p}`).href);
  return Object.assign({},await load('indications/dca-tactic.ts'),await load('indications/cache.ts'),await load('indications/stream-math.ts'));
}));
let s=178495421; const rand=()=>((s=Math.imul(s,1664525)+1013904223|0)>>>0)/4294967296;
const hash=createHash('sha256'); let checks=0;
function input(seed){
  s=seed; const n=500, b={sym:'TEST',tfMin:1,n,t:new Float64Array(n),o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n),v:new Float64Array(n)}; let price=100;
  for(let i=0;i<n;i++){ let open=price;price=Math.max(1,price+(rand()-.5)*2);b.o[i]=open;b.c[i]=price;b.h[i]=Math.max(open,price)+rand();b.l[i]=Math.min(open,price)-rand();b.v[i]=100*rand();b.t[i]=i*60000; }
  if(seed%2) for(let a=0;a<30;a++){const idx=Math.floor(rand()*n);switch(Math.floor(rand()*11)){
    case 0:b.o[idx]=NaN;break;case 1:b.h[idx]=Infinity;break;case 2:b.l[idx]=-Infinity;break;case 3:b.c[idx]=NaN;break;
    case 4:b.v[idx]=Infinity;break;case 5:b.v[idx]=-1;break;case 6:b.l[idx]=0;break;case 7:b.h[idx]=0;break;
    case 8:b.l[idx]=1e9;break;case 9:b.t[idx]+=60000;break;case 10:b.t[idx]=NaN;break;
  }}
  return b;
}
function prefix(b,n){return {...b,n,...Object.fromEntries(['t','o','h','l','c','v'].map(k=>[k,b[k].slice(0,n)]))};}
function sameArrays(a,b,label){assert.deepEqual(a,b,label);hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));checks++;}
for(let seed=1;seed<=30;seed++){
 const b=input(seed), streams=mods.map(m=>new m.StreamMath());
 for(const streaming of [false,true]) for(const n of streaming?[1,15,16,17,20,40,79,80,81,160,161,250,499,500]:[500]){
   const ks=mods.map((m,k)=>{const cache=new m.SeriesCache(prefix(b,n));return streaming?cache.enableStreaming(streams[k]):cache});
   for(const lookback of [8,20,40,80]){
     const config={lookback,basis:'percent',spacing:.5,level:2,recovery:.5,method:'bounce'};
     const result=mods.map((m,k)=>m.dcaTacticState(ks[k],config)); sameArrays(result[0],result[1],`state seed=${seed} n=${n} look=${lookback}`);
     const features=ks.map(k=>k.memo(`tactic-dca:features:${lookback}`,()=>null));
     for(const key of Object.keys(features[0])) sameArrays(features[0][key],features[1][key],`feature ${key} seed=${seed} n=${n} look=${lookback}`);
   }
 }
}
console.log(JSON.stringify({datasets:30,checks,sha256:hash.digest('hex')}));
