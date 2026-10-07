// Usage: node control-bench.ts <root> [positions] [steps]
// The live control step on an x02-sized paper book (positions over 30 symbols, many lanes per key) against the
// simulated exchange: garbage (sampled allocation) and wall time per step, steady state (nothing changed between steps).
import { Session } from "node:inspector/promises";
process.env.CTS_CORE_LIVE = "1";
const [root, nArg, stepsArg] = process.argv.slice(2);
const N = Number(nArg ?? 2500);
const STEPS = Number(stepsArg ?? 20);
const { CoreDb } = await import(`${root}/src/core/server/db.server.ts`);
const { stepLive, resetLiveBackoff } = await import(`${root}/src/core/server/live.server.ts`);
const { SimExchange, fakeRt, lane } = await import(`${root}/src/core/test-support.ts`);
resetLiveBackoff();
const ex = new SimExchange().withEquity(1000);
const { rt } = fakeRt(new CoreDb(":memory:"), 30);
rt.settings.live = { ...rt.settings.live, maxPositions: 0, maxNotionalUsd: 0, notionalUsd: 1 };
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const now = Date.now();
rt.paper.positions = Array.from({ length: N }, (_, i) => {
  const s = Math.floor(rnd() * 30);
  const side = rnd() < 0.5 ? 1 : -1;
  const p = lane(`follow|ind-${i % 400}@m15|tp${i % 7}|sl${i % 5}`, `S${s}-USDT`, side, 10 + s * 7, 1 + (i % 3), 0.01 + rnd() * 0.05);
  return { ...p, entryT: now - (i % 50) * 60_000, target: p.entry * (1 + side * 0.02) };
});
const step = () => stepLive(rt as never, [], 1, ex as never);
// warm-up: the first steps open the positions and settle the books
for (let i = 0; i < 3; i++) await step();
const s = new Session();
s.connect();
await s.post("HeapProfiler.enable");
await s.post("HeapProfiler.startSampling", { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
const t0 = performance.now();
for (let i = 0; i < STEPS; i++) await step();
const ms = (performance.now() - t0) / STEPS;
const { profile } = await s.post("HeapProfiler.stopSampling");
let bytes = 0;
const walk = (n: { selfSize: number; children?: unknown[] }) => {
  bytes += n.selfSize;
  for (const c of (n.children ?? []) as never[]) walk(c);
};
walk(profile.head);
const self = new Map<string, number>();
const w2 = (n: { selfSize: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: unknown[] }) => {
  const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) ?? 0) + n.selfSize);
  for (const c of (n.children ?? []) as never[]) w2(c);
};
w2(profile.head as never);
// natives (empty url) attributed to the nearest app caller
const byCaller = new Map<string, number>();
const w3 = (n: { selfSize: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: unknown[] }, app: string) => {
  const own = n.callFrame.url && /src\//.test(n.callFrame.url) ? `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber + 1}` : app;
  if (!(n.callFrame.url && /src\//.test(n.callFrame.url)) && n.selfSize) {
    const k = `${n.callFrame.functionName} ← ${app}`;
    byCaller.set(k, (byCaller.get(k) ?? 0) + n.selfSize);
  }
  for (const c of (n.children ?? []) as never[]) w3(c, own);
};
w3(profile.head as never, "?");
if (process.env.NATIVE) for (const [k, v] of [...byCaller].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.NATIVE))) console.log(`  native ${(v / STEPS / 1024).toFixed(0).padStart(6)} KB/step  ${k}`);
if (process.env.TOP) for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP))) console.log(`  ${(v / STEPS / 1024).toFixed(0).padStart(6)} KB/step  ${k}`);
console.log(`${N} positions · ${STEPS} steady steps: ${(bytes / STEPS / 1048576).toFixed(2)} MB garbage per step · ${ms.toFixed(1)} ms per step · exchange positions ${ex.positions.size}`);
process.exit(0);
