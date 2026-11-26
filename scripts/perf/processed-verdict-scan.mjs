// node --expose-gc --experimental-strip-types scripts/perf/processed-verdict-scan.mjs [repository-root]
// Synthetic owned-stage coverage, including cold, winning, losing and unknown contexts.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

if (!global.gc) throw new Error("Run with --expose-gc");
const root = resolve(process.argv[2] ?? ".");
const { ProcessedReplay } = await import(pathToFileURL(root + "/src/core/sim/processed-replay.ts"));
const p = new ProcessedReplay({ validationN: 2, realN: 2 }, .001);
let clock = 1_000_000;
for (let i = 0; i < 1000; i++) {
  const tp = { id: `cfg-${i}`, kind: "normal", ind: "ema-9-21@m1" }, side = i % 2 ? 1 : -1;
  for (let j = 0; j < 5; j++) {
    const opened = p.enter(tp, "A", side, clock, 1.1);
    const r = i % 7 === 0 && j === 4 ? null : i % 5 === 0 && j >= 3 ? -.01 : .02;
    p.settle(opened, clock + 1, r);
    clock += 2;
  }
}
const total = 500_000;
function* contexts() {
  for (let i = 0; i < total; i++) yield { identity: p.identity({ id: `cfg-${i}`, kind: "normal", ind: "ema-9-21@m1" },
    "A", i % 2 ? 1 : -1, 1.1), minPf: 1.1 };
}
global.gc();
const before = process.memoryUsage(), start = performance.now(), gen = p.reportGen(clock + 1, contexts(), "summary");
let yields = 0, current = gen.next();
while (!current.done) { yields++; current = gen.next(); }
const ms = performance.now() - start, after = process.memoryUsage();
console.log(JSON.stringify({ total, ms: Math.round(ms), yields,
  heapDeltaMiB: (after.heapUsed - before.heapUsed) / 1048576, peakRssMiB: process.resourceUsage().maxRSS / 1024,
  hash: createHash("sha256").update(JSON.stringify(current.value)).digest("hex"),
  validation: current.value.validation, real: current.value.real }));
