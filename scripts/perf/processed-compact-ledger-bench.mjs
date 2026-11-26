// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/processed-compact-ledger-bench.mjs . full|compact [sets] [closes-per-set] [contexts-per-config]
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
if (!global.gc) throw new Error('Use --expose-gc');
const root = resolve(process.argv[2] ?? '.'), mode = process.argv[3], total = Number(process.argv[4] ?? 30000), perSet = Number(process.argv[5] ?? 6), grouping = Number(process.argv[6] ?? 1);
if (!['full', 'compact'].includes(mode) || ![total, perSet, grouping].every(n => Number.isSafeInteger(n) && n > 0))
  throw new Error('Provide full|compact and positive integer counts');
const { ProcessedReplay, ProcessedSummaryReplay } = await import(pathToFileURL(root + '/src/core/sim/processed-replay.ts'));
const Type = mode === 'compact' ? ProcessedSummaryReplay : ProcessedReplay;
const p = new Type({ validationN: 12, realN: 12, reportDetail: 'summary' }, .001);
let clock = 1700000000000;
global.gc();
const before = process.memoryUsage(), start = performance.now();
for (let i = 0; i < total; i++) {
  const tp = { id: `follow|ema-9-21@m1|tp1.2|sl0.24|trail0|hold15|mn|normal|config-${Math.floor(i / grouping)}`,
    ind: 'ema-9-21@m1', kind: 'normal' }, side = i % 2 ? 1 : -1;
  for (let j = 0; j < perSet; j++) {
    const opened = p.enter(tp, `S${Math.floor((i % grouping) / 2)}`, side, clock, 1.1);
    p.settle(opened, clock + 1, j % 4 ? .02 : -.01);
    clock += 2;
  }
}
global.gc();
const held = process.memoryUsage(), eventsMs = performance.now() - start;
function* contexts() {
  for (let i = 0; i < total; i++) {
    const tp = { id: `follow|ema-9-21@m1|tp1.2|sl0.24|trail0|hold15|mn|normal|config-${Math.floor(i / grouping)}`,
      ind: 'ema-9-21@m1', kind: 'normal' };
    yield { identity: p.identity(tp, `S${Math.floor((i % grouping) / 2)}`, i % 2 ? 1 : -1, 1.1), minPf: 1.1 };
  }
}
const gen = p.reportGen(clock + 1, contexts(), 'summary');
let value = gen.next();
while (!value.done) value = gen.next();
console.log(JSON.stringify({ mode, sets: total, grouping, closes: total * perSet, eventsMs: Math.round(eventsMs), totalMs: Math.round(performance.now() - start),
  retainedHeapMiB: Math.round((held.heapUsed - before.heapUsed) / 1048576 * 100) / 100,
  peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024 * 100) / 100,
  hash: createHash('sha256').update(JSON.stringify(value.value)).digest('hex') }));
