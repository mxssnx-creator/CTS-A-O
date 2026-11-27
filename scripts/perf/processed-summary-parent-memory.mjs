// node --expose-gc --experimental-strip-types scripts/perf/processed-summary-parent-memory.mjs [repository-root]
// Offline, deterministic summary-only model books; no venue or paper ownership is created.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

if (!global.gc) throw new Error("Run with --expose-gc");
const root = resolve(process.argv[2] ?? ".");
const { ProcessedReplay } = await import(pathToFileURL(root + "/src/core/sim/processed-replay.ts"));
const p = new ProcessedReplay({ validationN: 12, realN: 12, reportDetail: "summary" }, .001);
const total = 30_000, perSet = 6;
let clock = 1_700_000_000_000;
global.gc();
const before = process.memoryUsage(), start = performance.now();
for (let i = 0; i < total; i++) {
  const tp = { id: `follow|ema-9-21@m1|tp1.2|sl0.24|trail0|hold15|mn|normal|config-${i}`,
    ind: "ema-9-21@m1", kind: "normal" }, side = i % 2 ? 1 : -1;
  for (let j = 0; j < perSet; j++) {
    const opened = p.enter(tp, `S${i % 12}`, side, clock, 1.1);
    p.settle(opened, clock + 1, j % 4 ? .02 : -.01);
    clock += 2;
  }
}
global.gc();
const held = process.memoryUsage();
function* contexts() {
  for (let i = 0; i < total; i++) {
    const tp = { id: `follow|ema-9-21@m1|tp1.2|sl0.24|trail0|hold15|mn|normal|config-${i}`,
      ind: "ema-9-21@m1", kind: "normal" };
    yield { identity: p.identity(tp, `S${i % 12}`, i % 2 ? 1 : -1, 1.1), minPf: 1.1 };
  }
}
const gen = p.reportGen(clock + 1, contexts(), "summary");
let value = gen.next();
while (!value.done) value = gen.next();
console.log(JSON.stringify({ sets: total, closes: total * perSet, ms: Math.round(performance.now() - start),
  retainedHeapMiB: (held.heapUsed - before.heapUsed) / 1048576,
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
  hash: createHash("sha256").update(JSON.stringify(value.value)).digest("hex") }));
