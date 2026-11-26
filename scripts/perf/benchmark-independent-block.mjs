// Compare implementations in separate processes: node --expose-gc --experimental-strip-types --no-warnings
// scripts/perf/benchmark-independent-block.mjs ROOT [configs] [cycles] [repeat|varied]
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
const configs = Number(process.argv[3] ?? 200), cycles = Number(process.argv[4] ?? 900);
const pattern = process.argv[5] ?? 'varied';
if (!globalThis.gc || !Number.isSafeInteger(configs) || configs < 1 || !Number.isSafeInteger(cycles) || cycles < 1 ||
    !['repeat', 'varied'].includes(pattern)) throw new Error('Use --expose-gc, positive counts, and repeat or varied');
const load = (path) => import(pathToFileURL(resolve(root, 'src/core', path)).href);
const [{ DEFAULT_BLOCK }, { AutoBlockBook }] = await Promise.all([load('config.ts'), load('sim/block.ts')]);
globalThis.gc();
const before = process.memoryUsage(), start = performance.now(), hash = createHash('sha256');
const book = new AutoBlockBook({ ...DEFAULT_BLOCK, window: 1, windowCandidates: [1, 2, 4] }, false);
for (let i = 0; i < cycles; i++) for (let c = 0; c < configs; c++) {
  const base = (i + c) % 5 ? .01 : -.025;
  const r = base + (pattern === 'varied' ? ((i * 65599 + c * 997) % 1000) * 1e-7 : 0);
  const x = { cfg: `set${c}`, sym: `S${c % 12}`, side: c % 2 ? 1 : -1, kind: 'trend', ind: `ema${c % 7}@m1`,
    type: 'normal', entryT: (i * configs + c) * 2, exitT: (i * configs + c) * 2 + 1, r, accepted: true };
  book.stampEntry(x); book.add(x);
  if ((i * configs + c) % 127 === 0) hash.update(JSON.stringify([book.windowOf(book.keyOf('config', x), 8),
    book.scoresForKey(book.keyOf('config', x)), book.level(book.keyOf('symbol', x), 8)]));
}
globalThis.keepBenchmarkBook = book;
globalThis.gc();
const after = process.memoryUsage();
console.log(JSON.stringify({ configs, cycles, pattern, entries: configs * cycles,
  elapsedMs: Math.round(performance.now() - start), retainedHeapBytes: after.heapUsed - before.heapUsed,
  rssBytes: after.rss, checksum: hash.digest('hex') }));
