import { createHash } from 'node:crypto';
import { DEFAULT_BLOCK } from '../../src/core/config.ts';
import { AutoBlockBook, sourceKey } from '../../src/core/sim/block.ts';

const configs = Number(process.argv[2] ?? 2500);
const cycles = Number(process.argv[3] ?? 40);
const policy = { ...DEFAULT_BLOCK, historySource: 'accepted-orders', holdUntilNet: true,
  window: 5, windowAuto: true, windowIndependent: true, windowCandidates: [5, 10, 15, 25, 35],
  sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } };
global.gc();
const start = process.memoryUsage();
const book = new AutoBlockBook(policy, false);
const hash = createHash('sha256');
for (let cycle = 0; cycle < cycles; cycle++) {
  for (let c = 0; c < configs; c++) {
    const x = { sym: `S${c % 12}`, side: c % 2 ? 1 : -1, kind: 'trend', ind: `i${c % 7}`,
      type: 'normal', cfg: `c${c}`, r: (c + cycle) % 5 ? .01 : -.025, accepted: true,
      exitT: (cycle * configs + c) * 1000, autoRaise: 0, autoSources: [0, 0, 0, 0, 0] };
    book.add(x);
    if ((cycle * configs + c) % 509 === 0) {
      const key = sourceKey('config', x);
      hash.update(JSON.stringify([book.level(key, 6), book.windowOf(key, 6), book.sampleCount(key, 6), book.tailSum(key, 6)]));
    }
  }
}
globalThis.keepBenchmarkBook = book;
global.gc();
const end = process.memoryUsage();
console.log(JSON.stringify({ configs, cycles, heapGrowth: end.heapUsed - start.heapUsed,
  rss: end.rss, checksum: hash.digest('hex') }));
