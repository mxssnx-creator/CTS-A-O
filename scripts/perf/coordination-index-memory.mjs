// node --expose-gc --experimental-strip-types scripts/perf/coordination-index-memory.mjs [repository-root]
// Offline synthetic fixture. Reports index output hash and per-process peak memory; it opens no exchange session.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

if (!global.gc) throw new Error("Run with --expose-gc");
const root = resolve(process.argv[2] ?? ".");
const { fakeRt } = await import(pathToFileURL(root + "/src/core/test-support.ts"));
const { CoreRuntime } = await import(pathToFileURL(root + "/src/core/server/runtime.server.ts"));
const { rt } = fakeRt();
Object.setPrototypeOf(rt, CoreRuntime.prototype);
const n = 500_000;
const cfg = "follow|ema-9-21@m15|tp1|sl1|tr0|h4|mn";
const feed = Array.from({ length: n }, (_, i) => {
  const entryT = 1_700_000_000_000 + ((i * 77471) % 8_640_000);
  return { cfg, sym: `S${i % 12}`, side: i % 2 ? 1 : -1, entryT, exitT: entryT + (i % 100) * 60_000, r: .01 };
});
const sim = { trades: [], feed };
Object.assign(rt, { sim, coordCache: null, realtimeLearning: null });
global.gc();
const before = process.memoryUsage(), start = performance.now();
const result = rt.coordOf(sim), ms = performance.now() - start, after = process.memoryUsage();
const hash = createHash("sha256");
for (const [key, x] of [...result.engineIv].sort(([a], [b]) => a.localeCompare(b))) {
  hash.update(key);
  hash.update(Buffer.from(x.e.buffer));
  hash.update(Buffer.from(x.mx.buffer));
}
console.log(JSON.stringify({ n, ms: Math.round(ms), heapDeltaMiB: (after.heapUsed - before.heapUsed) / 1048576,
  arrayBufferDeltaMiB: (after.arrayBuffers - before.arrayBuffers) / 1048576, rssBeforeMiB: before.rss / 1048576,
  peakRssMiB: process.resourceUsage().maxRSS / 1024, hash: hash.digest("hex") }));
rt.db.db.close();
