// Same bounded, deterministic workload on old/new source. Synthetic evidence is not financial performance.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const source = resolve(process.argv[2] ?? '.');
const get = name => import(pathToFileURL(resolve(source, 'src/core', name)).href);
const { barsFromCandles, syntheticCandles, resample } = await get('market/bars.ts');
const { makeUniverse, allCombos } = await get('pipeline/pipeline.ts');
const builders = await get('sim/walkforward.ts');
const buildTapesGen = process.env.TAPE_CACHE_BOUNDED === '1' ? builders.buildTapesBoundedGen : builders.buildTapesGen;
const { DEFAULT_PROTECT } = await get('config.ts');
const end = Date.UTC(2026, 9, 17), bars = [];
for (const symbol of ['A', 'B', 'C', 'D']) {
  const cs = syntheticCandles(symbol, 1, 162 * 60, end);
  for (const tf of [1, 5, 15, 30]) bars.push(barsFromCandles(symbol+'-USDT', tf, tf === 1 ? cs : resample(cs, 1, tf)));
}
const u = makeUniverse(bars);
const combos = allCombos(undefined, undefined, [1, 5, 15, 30]).filter(c => c.bot === 'follow').filter((_, i) => i % 13 === 0).slice(0, 360);
const pairs = new Set(combos.map(c => c.bot+'|'+c.ind));
const protects = [DEFAULT_PROTECT, {...DEFAULT_PROTECT, tp:.01, sl:.02, trail:0}, {...DEFAULT_PROTECT, tp:.01, sl:.02, trail:.003}];
globalThis.gc?.();
const start = performance.now();
const gen = buildTapesGen(u, protects, .002, undefined, pairs, null);
let tapes;
for (;;) { const r = gen.next(); if (r.done) { tapes=r.value; break; } }
const elapsedMs = performance.now()-start;
const memBeforeGc = process.memoryUsage();
globalThis.gc?.();
const hash = createHash('sha256');
let trades=0, open=0, pending=0;
for (const t of tapes) {
  const {id,bot,ind,protect,kind,syms,fromT,heldOnly}=t;
  hash.update(JSON.stringify({id,bot,ind,protect,kind,syms,fromT,heldOnly,open:t.open,pending:t.pending}));
  for (const k of ['exitT','entryT','r','entry','exit','symI','side','reason','bars','vol','level','gp','gl','rs','r2'])
    hash.update(Buffer.from(t[k].buffer,t[k].byteOffset,t[k].byteLength));
  trades+=t.n;open+=t.open.length;pending+=t.pending.length;
}
const result={source,pairs:pairs.size,tapes:tapes.length,trades,open,pending,sha256:hash.digest('hex'),elapsedMs,
  maxRssMiB:process.resourceUsage().maxRSS/1024,memBeforeGc,memAfterGc:process.memoryUsage(),
  cachedSeries:u.caches.reduce((n,k)=>n+k.m.size,0),fixture:'Synthetic four-symbol 162h minute data; all math, losses and identities retained. Not a trading result.'};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
