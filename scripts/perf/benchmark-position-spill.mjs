import { createHash } from 'node:crypto';
import { makeTape } from '../../src/core/sim/walkforward.ts';
import { TapeHistoryStore } from '../../src/core/server/history-store.server.ts';

if (typeof globalThis.gc !== 'function') throw new Error('Run with --expose-gc');
const count = Number(process.argv[2] ?? 30000), perTape = Number(process.argv[3] ?? 6);
const protect = { tp: .01, sl: .006, trail: 0, hold: 30 }, syms = ['A', 'B', 'C'];
globalThis.gc(); const base = process.memoryUsage().heapUsed;
let source = Array.from({ length: count }, (_, i) => {
  const id = `follow|bench|${i}`;
  const open = Array.from({ length: perTape }, (_, j) => ({ cfg: id, sym: syms[j % 3], side: j % 2 ? 1 : -1,
    entryT: 1750000000000 + j * 60000, entryI: j, entry: 100.234, stop: 99.123, target: 101.345,
    peak: 100.234, trailOn: false, mtm: .002 }));
  return makeTape(id, 'follow', 'bench', protect, 'normal', syms, [], open, []);
});
const digest = (tapes) => createHash('sha256').update(JSON.stringify(tapes.slice(0, 25).map(t => t.open))).digest('hex');
const beforeHash = digest(source); globalThis.gc(); const before = process.memoryUsage().heapUsed;
const oldStore = new TapeHistoryStore({ cacheBytes: 1048576, spillPositions: false });
const store = new TapeHistoryStore({ cacheBytes: 1048576 });
try {
  let baseline = source.map(t => oldStore.append(t)); source = null; globalThis.keep = baseline;
  globalThis.gc(); const baselineHeap = process.memoryUsage().heapUsed;
  const saved = baseline.map(t => store.append(t)); baseline = null; globalThis.keep = saved; oldStore.close();
  globalThis.gc(); const after = process.memoryUsage().heapUsed, afterHash = digest(saved);
  console.log(JSON.stringify({ tapes: count, positions: count * perTape, originalHeap: before - base,
    previousStoreHeap: baselineHeap - base, spilledHeap: after - base, savedBytes: baselineHeap - after, positionDiskBytes: store.stats.positionBytes,
    beforeHash, afterHash, identical: beforeHash === afterHash }));
} finally { oldStore.close(); store.close(); }
