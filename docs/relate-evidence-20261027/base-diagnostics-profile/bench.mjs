// Isolated diagnostic-only comparison. It does not generate tapes or model a live trading cycle.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const [root, mode] = process.argv.slice(2);
if (!root || !["before", "after"].includes(mode)) throw new Error("usage: bench.mjs SOURCE_ROOT before|after");
const load = (p) => import(pathToFileURL(join(root, p)).href);
const p = await load("src/core/pipeline/pipeline.ts");
const tags = ["mc", "mn", "sh", "gn", "lg", "mp"];
const inds = ["micro-fake@m1", "inverse-fake@m5", "ema-9-21@m15"];
const stats = (i, k) => {
  const n = (i + k) % 19, pf = (i + k) % 37 === 0 ? NaN : ((i * 7 + k * 3) % 48) / 10;
  const net = ((i * 11 + k) % 61 - 25) / 10, mdd = (i + k) % 43 === 0 ? NaN : ((i + k) % 13) / 5;
  return { n, pf, net, mdd, gp: Math.max(net, 0) + 0.2, gl: 0.2, bw: { gate: (i + k) % 17 !== 0 } };
};
const runs = Array.from({ length: 16000 }, (_, i) => ({
  ind: inds[i % inds.length], full: stats(i, 0),
  ranges: Object.fromEntries(tags.filter((_, j) => (i + j) % 3 !== 0).map((t, j) => [t, stats(i, j + 1)])),
}));
const gates = { minPf: 1.1, minTrades: 6, maxDdr: 2, rangeMinPf: { micro: 1.4, minimal: 1.3, short: 1.2 },
  baseWindows: { gate: true } };
const eligible = (ind, tag) => !(tag === "mp" && ind.startsWith("inverse"));
let rt = null;
if (mode === "after") {
  const { CoreRuntime } = await load("src/core/server/runtime.server.ts");
  const { CoreDb } = await load("src/core/server/db.server.ts");
  rt = new CoreRuntime(new CoreDb(":memory:"), {}, { market: "synthetic", priceStream: null });
  rt.stop();
}
let last = performance.now(), maxGapMs = 0, beats = 0;
const timer = setInterval(() => {
  const now = performance.now(); maxGapMs = Math.max(maxGapMs, now - last); last = now; beats++;
}, 5);
await delay(30);
maxGapMs = 0; beats = 0; last = performance.now();
const start = performance.now();
let counts, sensitivity, why;
if (rt) {
  // The production time-slicing driver is used; UI progress emission is deliberately excluded from this microbenchmark.
  counts = await rt.drive("Base ranges", p.baseRangeCountsGen(runs, gates, tags, eligible), () => {}, rt.gen);
  sensitivity = await rt.drive("Base gate sensitivity", p.baseGateSensitivityGen(runs, gates, tags, p.BASE_GATE_VARIANTS, eligible), () => {}, rt.gen);
  why = await rt.drive("Base gate reasons", p.baseRangeWhyGen(runs, gates, tags, eligible), () => {}, rt.gen);
} else {
  counts = p.baseRangeCounts(runs, gates, tags, eligible);
  sensitivity = p.baseGateSensitivity(runs, gates, tags, p.BASE_GATE_VARIANTS, eligible);
  why = p.baseRangeWhy(runs, gates, tags, eligible);
}
const computeMs = performance.now() - start;
await delay(25);
clearInterval(timer);
const digest = createHash("sha256").update(JSON.stringify({ counts, sensitivity, why })).digest("hex");
const phases = rt?.status.phases ?? null;
const rssMiB = process.memoryUsage().rss / 1048576;
if (rt) { rt.dispose(); await rt.backtestsSettled(); rt.db.db.close(); }
console.log(JSON.stringify({ mode, runs: runs.length, digest, computeMs, maxHeartbeatGapMs: maxGapMs, beats,
  rssMiB, phases }));
