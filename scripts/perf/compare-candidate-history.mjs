import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const root=process.argv[2],{DEFAULT_BLOCK}=await import(pathToFileURL(root+'/src/core/config.ts'));
const {AutoBlockBook,BLOCK_SOURCES}=await import(pathToFileURL(root+'/src/core/sim/block.ts'));
const hash=createHash('sha256');let seed=24681357;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(const historySource of ['accepted-orders','real-candidates']) for(const windowHours of [0,2])
for(const pause of [0,2]) for(const scope of ['rule','key']){
 const p={...DEFAULT_BLOCK,historySource,holdUntilNet:true,pause,window:2,windowAuto:true,windowCandidates:[1,2,5,35],
   windowLookback:50,windowHours,maxLevel:4,poolDedupe:true,poolSignals:false,auto:{enabled:true,n:30,min:10,pf:1.1,scope}};
 const b=new AutoBlockBook(p,false);
 for(let i=0;i<2500;i++){
  const c=Math.floor(rnd()*25),end=i*60000+1000000000,entryT=end-Math.floor(rnd()*100)*60000;
  const x={sym:`S${c%5}`,side:c%2?1:-1,kind:'trend',ind:`i${c%3}`,type:c%3?'normal':'axis',cfg:`c${c}`,
    r:rnd()<.57?.01:-.008,accepted:rnd()>.08,entryT,exitT:end};
  if(i%3!==0)b.stampEntry(x);b.add(x,i%11===0);
  if(i%17===0){const vals=BLOCK_SOURCES.map(s=>{const key=b.keyOf(s,x);return [b.level(key,4),b.windowOf(key,4),b.paused(key),
    b.sampleCount(key,4),b.tailSum(key,6),b.auto?.verdict(s,key,1)];});hash.update(JSON.stringify([vals,b.scores()]));}
 }
}
console.log(hash.digest('hex'));
