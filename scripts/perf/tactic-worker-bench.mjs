// Compare source roots in separate processes, offline:
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/tactic-worker-bench.mjs ROOT [batches]
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] ?? process.cwd()), batches = Number(process.argv[3] ?? 8);
if (!globalThis.gc || !Number.isSafeInteger(batches) || batches < 1 || batches > 100)
  throw new Error('Use --expose-gc and 1–100 batches');
const load = p => import(pathToFileURL(resolve(root, 'src/core', p)).href);
const [p, m, c, r, pool] = await Promise.all([load('pipeline/pipeline.ts'), load('market/bars.ts'), load('config.ts'),
  load('minimal-coord.ts'), load('server/pool.server.ts')]);
const tfs = [1, 5, 15, 30], bars = [];
for (const sym of ['A-USDT', 'B-USDT', 'C-USDT', 'D-USDT']) for (const tf of tfs)
  bars.push(m.barsFromCandles(sym, tf, m.syntheticCandles(sym, tf, Math.floor(3 * 1440 / tf), Date.UTC(2026, 9, 1))));
const grid = { ...c.DEFAULT_SETTINGS.grid, tp: [.02, .04], slOfTp: [1, 2], trailOfTp: [0, .5], holdH: [16],
  micro: false, minimal: false, short: false, general: false, long: false, minimalPlus: false };
const gates = { ...c.DEFAULT_SETTINGS.gates, positionWindows: null, minPf: 1.05, baseSetsMinPf: 1.05, minTrades: 3, maxDdr: 0 };
const tactics = { ...c.DEFAULT_SETTINGS.tactics, volRegime: true, session: false, cooldown: false };
const all = p.allCombos([], ['micro', 'inverse'], tfs, 0, false, 0).sort((a, b) => a.ind < b.ind ? -1 : a.ind > b.ind ? 1 : 0);
const startAt = all.findIndex(x => x.ind.startsWith('tactic-dca')), shared = pool.shareBars(bars);
if (startAt < 0 || startAt + batches * 256 > all.length) throw new Error('Tactic benchmark inventory is incomplete');
const messages = Array.from({ length: batches }, (_, i) => ({ type: 's1', bars: shared,
  combos: all.slice(startAt + i * 256, startAt + (i + 1) * 256), cost: .002, tactics,
  rangeProtects: p.baseRangeProtects(grid, .002), completeRangeProtects: p.completeBaseRangeProtects(grid, .002),
  rangeMinTf: r.rangeMinTfOf(grid), microOwnInds: r.microIndRule(grid), gates, cells: false }));
try {
  const start = performance.now(), result = await pool.runOnWorkers(messages, 1, 120_000);
  console.log(JSON.stringify({ batches, combos: batches * 256, ms: Math.round(performance.now() - start),
    maxRssKiB: process.resourceUsage().maxRSS, hash: createHash('sha256').update(JSON.stringify(result)).digest('hex') }));
} finally { pool.closePool(); }
