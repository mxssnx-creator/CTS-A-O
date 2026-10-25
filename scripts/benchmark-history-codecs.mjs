// Codec timing on actual immutable minute-close columns, with a bit-exact round trip for every buffer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as z from 'node:zlib';
import {readSessionFeed} from './lib/session-feed.mjs';
import {barsFromCandles,resample} from '../src/core/market/bars.ts';
import {makeUniverse} from '../src/core/pipeline/pipeline.ts';
import {buildTapesBoundedGen,tapeBytes} from '../src/core/sim/walkforward.ts';
const [protocol,feedPath,output]=process.argv.slice(2),p=JSON.parse(readFileSync(protocol)),s=p.actualSettings,wf=p.actualWf;
let feed=readSessionFeed(feedPath);
const bars=p.symbols.flatMap(sym=>s.tfs.map(tf=>barsFromCandles(sym,tf,resample(feed.candles[`${sym}|1`]
  .filter(c=>c.t>=p.window.evaluationFromT-24*3_600_000&&c.t<p.window.endT),1,tf))));feed=null;
const g=buildTapesBoundedGen(makeUniverse(bars,p.window.evaluationFromT),wf.protects.filter(x=>x.tag==='mc').slice(0,16),s.cost,
 undefined,new Set(['follow|micro-1-drawdown-turn-fast@m1']),s.tactics,null,{...s.protectFloor,microOwnInds:true});
let tapes;for(;;){const r=g.next();if(r.done){tapes=r.value;break;}}
const inputs=tapes.map(t=>Buffer.from(t.exitT.buffer,t.exitT.byteOffset,tapeBytes(t.n)));
const codecs=[{name:'deflate1',encode:b=>z.deflateRawSync(b,{level:1}),decode:z.inflateRawSync},
 {name:'zstd1',encode:b=>z.zstdCompressSync(b,{params:{[z.constants.ZSTD_c_compressionLevel]:1}}),decode:z.zstdDecompressSync}];
const rows=[];
for(const c of codecs){let writeMs=0,readMs=0,bytes=0;
 for(let pass=0;pass<5;pass++)for(const raw of inputs){let at=performance.now();const packed=c.encode(raw);writeMs+=performance.now()-at;at=performance.now();const result=c.decode(packed);readMs+=performance.now()-at;assert.deepEqual(result,raw);if(pass===0)bytes+=packed.length;}
 rows.push({codec:c.name,writeMs:writeMs/5,readMs:readMs/5,packedBytes:bytes});
}
const result={ok:true,tapes:tapes.length,closes:tapes.reduce((n,t)=>n+t.n,0),rawBytes:inputs.reduce((n,x)=>n+x.length,0),rows};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
