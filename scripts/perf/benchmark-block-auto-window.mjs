import { createHash } from 'node:crypto';
import { BlockAutoEval } from '../../src/core/sim/block.ts';
if (typeof globalThis.gc !== 'function') throw new Error('Run with --expose-gc');
const mode=process.argv[2], keys=Number(process.argv[3] ?? 20000), samples=Number(process.argv[4] ?? 100), n=30;
if (!['previous','bounded'].includes(mode)) throw new Error('Choose previous or bounded');
globalThis.gc();const before=process.memoryUsage().heapUsed, started=performance.now();
const windows=mode==='previous'?new Map():new BlockAutoEval({n,min:30,pf:1.1,scope:'key'},8);
for(let k=0;k<keys;k++) for(let i=0;i<samples;i++){
  const key=`c:${k}`, r=(k+i)%5 ? .01 : -.025;
  if(mode==='bounded') windows.record('config',key,1,r);
  else {let v=windows.get(key);if(!v)windows.set(key,v=[]);v.push(r);if(v.length>4*n)v.splice(0,v.length-n);}
}
globalThis.keepWindows=windows;globalThis.gc();const retained=process.memoryUsage().heapUsed-before;
const hash=createHash('sha256');
for(let k=0;k<keys;k++){
  const key=`c:${k}`;let v;
  if(mode==='bounded'){const x=windows.verdict('config',key,1);v=[x.n,x.pf,x.raise];}
  else {const a=windows.get(key).slice(-n);let gp=0,gl=0;for(const r of a)if(r>0)gp+=r;else gl-=r;
    const pf=gl>0?gp/gl:gp>0?Infinity:0;v=[a.length,pf,a.length<30?null:pf>=1.1];}
  hash.update(JSON.stringify(v));
}
console.log(JSON.stringify({mode,keys,samples,window:n,retainedHeapBytes:retained,elapsedMs:Math.round(performance.now()-started),digest:hash.digest('hex')}));
