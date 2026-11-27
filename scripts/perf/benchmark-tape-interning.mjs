import { createHash } from 'node:crypto';
import { createTapeInterner } from '../../src/core/server/tape-merge.ts';

if (typeof globalThis.gc !== 'function') throw new Error('Run with --expose-gc');
const count = Number(process.argv[2] ?? 20000), perTape = Number(process.argv[3] ?? 4);
const copy = (s) => Buffer.from(s).toString('utf8');
const tapes = Array.from({ length: count }, (_, i) => {
  const id = `follow|ema-cross-long-timeframe-${i % 20}|tp0.0125|sl0.0075|trail0.0025|hold${i}`;
  return { id, bot: copy('follow'), ind: copy(`ema-cross-long-timeframe-${i % 20}`), kind: copy('normal'),
    open: Array.from({ length: perTape }, (_, j) => ({ cfg: copy(id), sym: copy(`SYMBOL-${j % 12}-USDT`) })),
    pending: Array.from({ length: perTape }, (_, j) => ({ sym: copy(`SYMBOL-${j % 12}-USDT`), side: j % 2 ? 1 : -1 })) };
});
const checksum = () => createHash('sha256').update(JSON.stringify(tapes)).digest('hex');
const beforeHash = checksum(); globalThis.keepTapes = tapes; globalThis.gc();
const before = process.memoryUsage().heapUsed, interner = createTapeInterner();
for (const tape of tapes) for (const _ of interner(tape)) { /* drain */ }
globalThis.gc(); const after = process.memoryUsage().heapUsed, afterHash = checksum();
console.log(JSON.stringify({ tapes: count, openPerTape: perTape, pendingPerTape: perTape,
  retainedHeapBefore: before, retainedHeapAfter: after, savedBytes: before - after,
  beforeHash, afterHash, identical: beforeHash === afterHash }));
