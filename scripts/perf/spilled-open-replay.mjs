// node --expose-gc --experimental-strip-types scripts/perf/spilled-open-replay.mjs [repository-root]
// Deterministic stored-tape scheduling; no exchange sessions or external data.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

if (!global.gc) throw new Error("Run with --expose-gc");
const root = resolve(process.argv[2] ?? ".");
const load = path => import(pathToFileURL(root + "/" + path));
const [{ TapeHistoryStore, historyOf }, { makeTape, signalEntryQueueGen, scheduledEngineEntriesGen }] = await Promise.all([
  load("src/core/server/history-store.server.ts"), load("src/core/sim/walkforward.ts"),
]);
const M = 60_000, start = 1_700_000_000_000, stop = start + 10 * M, count = Number(process.argv[3] ?? 5000), each = 8;
if (!Number.isSafeInteger(count) || count < 1 || count > 100_000) throw new Error("invalid tape count");
const store = new TapeHistoryStore({ cacheBytes: 32 * 1048576 });
const tapes = [];
for (let i = 0; i < count; i++) {
  const cfg = `follow|ema-9-21@m1|tp1|sl1|tr0|h8|mn|${i}`;
  const open = Array.from({ length: each }, (_, j) => ({ cfg, sym: `S${i % 12}`, side: j % 2 ? 1 : -1,
    entryT: start + j * M, entryI: j, entry: 100, stop: 99, target: 102, peak: 100, trailOn: false, mtm: .01 }));
  tapes.push(store.append(makeTape(cfg, "follow", "ema-9-21@m1", { tp: .01, sl: .01, trail: 0, hold: 8, tag: "mn" },
    "normal", [`S${i % 12}`], [], open, [])));
}
global.gc();
const before = process.memoryUsage(), begin = performance.now();
const drain = gen => { for (;;) { const next = gen.next(); if (next.done) return next.value; } };
const queue = drain(signalEntryQueueGen(tapes, start, stop, true)), selected = new Set(tapes.map(t => t.id));
const hash = createHash("sha256"); let rows = 0;
for (let minute = 0; minute < 10; minute++) {
  const batch = drain(scheduledEngineEntriesGen(queue, start + (minute + 1) * M, selected, stop));
  for (const { tr } of batch) { hash.update(JSON.stringify(tr)); rows++; }
}
global.gc();
const after = process.memoryUsage();
console.log(JSON.stringify({ tapes: count, opens: rows, ms: Math.round(performance.now() - begin),
  retainedHeapMiB: (after.heapUsed - before.heapUsed) / 1048576,
  retainedPositionLists: tapes.filter(t => historyOf(t).positions !== undefined).length,
  positionReads: store.stats.positionReads, peakRssMiB: process.resourceUsage().maxRSS / 1024,
  hash: hash.digest("hex") }));
store.close();
