import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const { DEFAULT_BLOCK } = await import(pathToFileURL(root + '/src/core/config.ts'));
const { AutoBlockBook, BLOCK_SOURCES } = await import(pathToFileURL(root + '/src/core/sim/block.ts'));
const hash = createHash('sha256');
let seed = 134268;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
for (const independent of [false, true]) for (const windowHours of [0, 2]) for (const acceptedOnly of [false, true]) {
  const policy = { ...DEFAULT_BLOCK, historySource: acceptedOnly ? 'accepted-orders' : 'real-candidates',
    holdUntilNet: true, pause: 2, window: 2, windowAuto: true, windowIndependent: independent,
    windowCandidates: [1, 2, 5], windowMinSamples: 30, windowLookback: 50, windowHours, maxLevel: 4,
    sources: { config: true, overall: true, symbol: true, direction: true, indication: true, type: true } };
  const book = new AutoBlockBook(policy, false);
  for (let i = 0; i < 1400; i++) {
    const v = Math.floor(rnd() * 10000), c = v % 20;
    const x = { sym: `S${c % 4}`, side: c % 2 ? 1 : -1, kind: 'trend', ind: `i${c % 3}`,
      type: c % 3 ? 'normal' : 'axis', cfg: `c${c}`, r: i === 700 ? NaN : (rnd() < .56 ? .01 : -.008),
      accepted: rnd() > .08, entryT: i * 300000, exitT: i * 300000 + 1 };
    if (i % 3 !== 0) book.stampEntry(x);
    book.add(x, i % 11 === 0);
    if (i % 7 === 0) {
      const result = BLOCK_SOURCES.map(source => {
        const key = book.keyOf(source, x);
        return [book.level(key, 4), book.windowOf(key, 4), book.paused(key), book.sampleCount(key, 4),
          book.tailSum(key, 6), book.scoresForKey(key)];
      });
      hash.update(JSON.stringify([result, book.scores()]));
    }
  }
}
console.log(hash.digest('hex'));
