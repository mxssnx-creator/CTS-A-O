// Compare source roots in separate processes:
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/dca-base-cache-bench.mjs ROOT [bars] [configs-per-lookback]
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? process.cwd()), n = Number(process.argv[3] ?? 2880), per = Number(process.argv[4] ?? 40);
if (!globalThis.gc || !Number.isSafeInteger(n) || n < 200 || !Number.isSafeInteger(per) || per < 1)
  throw new Error('Use --expose-gc, at least 200 bars, and a positive config count');
const load = p => import(pathToFileURL(resolve(root, 'src/core', p)).href);
const [{ baseRuns, makeUniverse }, { barsFromCandles, syntheticCandles }, { dcaTacticConfigs, dcaTacticId }, { laneInd }] =
  await Promise.all([load('pipeline/pipeline.ts'), load('market/bars.ts'), load('indications/dca-tactic.ts'), load('indications/registry.ts')]);
const bars = ['A-USDT', 'B-USDT'].map(s => barsFromCandles(s, 1, syntheticCandles(s, 1, n, Date.UTC(2026, 9, 1))));
const all = dcaTacticConfigs(), configs = [8, 20, 40, 80].flatMap(look => all.filter(c => c.lookback === look).slice(0, per));
const combos = configs.flatMap(c => ['follow', 'revert'].map(bot => ({ bot, ind: laneInd(dcaTacticId(c), 1) })));
const u = makeUniverse(bars);
globalThis.gc();
const before = process.memoryUsage(), start = performance.now();
const result = baseRuns(u, combos, .002, null, true, true);
const elapsedMs = Math.round(performance.now() - start), hash = createHash('sha256').update(JSON.stringify(result)).digest('hex');
globalThis.gc();
const after = process.memoryUsage();
console.log(JSON.stringify({ bars: n, symbols: bars.length, combos: combos.length, rows: result.length, elapsedMs,
  retainedHeapBytes: after.heapUsed - before.heapUsed, rssBytes: after.rss, maxRssKiB: process.resourceUsage().maxRSS, hash }));
