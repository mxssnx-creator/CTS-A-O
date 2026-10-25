// Complete-catalog own-context cache and exact ordered-key parity against a frozen reference.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [input,referenceRoot,output]=process.argv.slice(2);
if(!input||!referenceRoot||!output)throw new Error('Usage: profile-signal-context-cache.mjs CASE REFERENCE_ROOT OUTPUT');
const root=process.cwd(),at=p=>import(pathToFileURL(resolve(root,p)).href);
const {iterateSessionTapeTrades}=await at('scripts/lib/session-dump.mjs');const {coverageTape}=await at('scripts/audit-signal-coverage.mjs');const {signalIndex,SignalActivationBook}=await at('src/core/sim/walkforward.ts');
const dir=resolve(input),p=JSON.parse(readFileSync(resolve(dir,'protocol.json'))),tapes=[];
for await(const row of iterateSessionTapeTrades(resolve(dir,'raw.json')))if(row.kind!=='exit')tapes.push(coverageTape(row,p.symbols));
const {activeSignalsAt}=await import(pathToFileURL(resolve(referenceRoot,'src/core/sim/walkforward.ts')).href);
const index=signalIndex(tapes),wf={...p.actualWf,signalRank:p.actualSettings.signals},book=new SignalActivationBook(index,wf.signalRank,wf.signalLongH,wf),original=book.context;
let calls=0,hits=0;book.context=function(...args){calls++;hits+=Number(this.own.has(args[0].key));return original.apply(this,args)};
const rows=[];for(let minute=0;minute<3;minute++){calls=0;hits=0;const t=p.window.tradeStartT+minute*60000,start=performance.now(),g=book.at(t);let value;for(;;){const r=g.next();if(r.done){value=r.value;break;}}const row={minute,ms:performance.now()-start,calls,hits,cacheItems:book.own.size,cacheBytes:book.ownBytes,ranked:book.ranked.length,active:value.size,rss:process.memoryUsage().rss};row.keysSha256=createHash('sha256').update(JSON.stringify([...value])).digest('hex');const ref=[...activeSignalsAt(tapes,t,wf.signalRank,wf.signalLongH,wf)];assert.deepEqual([...value],ref);row.exactOrderedKeys=true;rows.push(row);console.log(JSON.stringify(row));}
writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
