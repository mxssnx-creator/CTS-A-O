#!/usr/bin/env node
// Offline microbenchmark only: no market feed, account, runtime or exchange requests.
// node --expose-gc --max-old-space-size=96 --experimental-strip-types --no-warnings scripts/bench-signal-accept-index.mjs [--generic]
import { SignalAcceptIndex } from "../src/core/signals.ts";
import { createHash } from "node:crypto";

const mode = process.argv.includes("--generic") ? "generic" : "direct";
const syms = Array.from({ length: 4 }, () => Array.from({ length: 20 }, (_, i) => `SYM${i}-USDT`)).flat();
const tapes = Array.from({ length: 200 }, (_, config) => {
  const n = 2048;
  return { id: `config-${config}`, ind: "sig-ema-cross-fast-s@m15", kind: "trailing", syms, n,
    symI: Uint16Array.from({ length: n }, (_, i) => i % syms.length),
    side: Int8Array.from({ length: n }, (_, i) => (Math.floor(i / syms.length) % 2) * 2 - 1),
    exitT: Float64Array.from({ length: n }, (_, i) => 3_600_000 + Math.floor(i / 7) * 60_000),
    entryT: Float64Array.from({ length: n }, (_, i) => Math.floor(i / 160) * 60_000),
    r: Float64Array.from({ length: n }, (_, i) => (((i * 17 + config) % 19) - 8) / 1000) };
});
globalThis.gc?.();
const before = process.memoryUsage(), start = performance.now();
// Empty duplicate identities force the unchanged generic path without adding any return/onset evidence.
const index = new SignalAcceptIndex(mode === "generic" ? [...tapes, ...tapes.map((tp) => ({ ...tp, n: 0 }))] : tapes);
const elapsedMs = performance.now() - start, after = process.memoryUsage();
const hash = createHash("sha256");
for (const [key, group] of [...index.groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
  hash.update(key);
  for (const col of [group.t, group.gp, group.gl, group.cn])
    hash.update(Buffer.from(col.buffer, col.byteOffset, col.byteLength));
}
const mb = (x) => +(x / 1048576).toFixed(2);
console.log(JSON.stringify({ mode, configs: tapes.length, closes: tapes.length * tapes[0].n,
  symbolTable: syms.length, uniqueSymbols: 20, groups: index.groups.size, elapsedMs: +elapsedMs.toFixed(3),
  rssBeforeMb: mb(before.rss), rssAfterMb: mb(after.rss), peakRssMb: +(process.resourceUsage().maxRSS / 1024).toFixed(2),
  arrayBuffersBeforeMb: mb(before.arrayBuffers), arrayBuffersAfterMb: mb(after.arrayBuffers), digest: hash.digest("hex") }));
