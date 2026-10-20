#!/usr/bin/env node
// Per-phase profile of the engine cycle on the synthetic market: one full cycle (backfill + compute + paper step),
// then K more cycles, each after one new closed 1m bar per symbol. Prints the status.phases of every cycle and the
// cycle's wall time. `--mode incremental` runs the same with settings.runtime.cycle = "incremental".
//
//   MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_WORKERS=2 \
//   node --experimental-strip-types --no-warnings scripts/bench-cycle.mjs --symbols 12 --cycles 4 [--mode incremental]
//        [--days 3] [--out file.json]
import { writeFileSync } from "node:fs";
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : process.argv[i + 1];
};
const symbols = Number(arg("symbols", 12));
const cycles = Number(arg("cycles", 4));
const mode = arg("mode", "full");
const days = Number(arg("days", 3));
// guard rails: refuse to start when the host has under 6 GB available, and exit at 2.5 GB RSS (workers are threads of
// this process, so its RSS is the whole tree's)
import { readFileSync } from "node:fs";
const availMb = Number(/MemAvailable:\s+(\d+)/.exec(readFileSync("/proc/meminfo", "utf8"))?.[1] ?? 0) / 1024;
if (availMb < 6144) {
  console.error(`abort: only ${Math.round(availMb)} MB available (< 6144)`);
  process.exit(2);
}
process.env.CTS_CORE_WORKERS ??= "1";
setInterval(() => {
  if (process.memoryUsage().rss > 2.5e9) {
    console.error("abort: RSS above 2.5 GB");
    process.exit(3);
  }
}, 200).unref();
process.env.CTS_CORE_SYNTHETIC_END ??= String(Math.floor(Date.now() / 3_600_000) * 3_600_000);

const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { signalSettings } = await import("../src/core/signals.ts");
const { SIGNAL_SOURCES } = await import("../src/core/signal-config.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { closePool } = await import("../src/core/server/pool.server.ts").catch(() => ({}));

const rt = new CoreRuntime(
  new CoreDb(":memory:"),
  {
    symbols,
    historyDays: days,
    cycleMs: 60_000,
    // small grid (runtime.test.ts): the equality / profile fixture stays inside the memory cap
    tfDays: { 1: Math.min(days, 1), 5: days, 15: days, 30: days },
    mainTop: 12,
    refineTop: 4,
    evalTop: 8,
    grid: { short: false },
    tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
    gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
    signals: signalSettings({
      exits: "pct",
      sources: Object.fromEntries(SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false])),
    }),
    runtime: { cycle: mode, heavyEveryBars: 60 },
  },
  { market: "synthetic" },
);
const R = rt;
const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const out = [];
let stallMax = 0;
let last = performance.now();
const watch = setInterval(() => {
  const now = performance.now();
  stallMax = Math.max(stallMax, now - last - 50);
  last = now;
}, 50);
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
async function oneCycle(label) {
  stallMax = 0;
  const t0 = performance.now();
  await rt.cycle();
  const ms = performance.now() - t0;
  const phases = {};
  for (const [k, v] of Object.entries(rt.status.phases ?? {})) phases[k] = Math.round(v.ms);
  const row = { label, ms: Math.round(ms), stallMs: Math.round(stallMax), rssMb: rss(), light: rt.status.cycleMode ?? null, phases };
  out.push(row);
  console.log(JSON.stringify(row));
}
await oneCycle("full #1 (backfill + compute)");
for (let k = 2; k <= cycles + 1; k++) {
  for (const [sym, cs] of R.candles) {
    const t = cs.lastT() + 60_000;
    const c = cs.lastC();
    const o = c;
    const cl = o * (1 + (rnd() - 0.5) * 0.002);
    await R.storeCandles(sym, [{ t, o, h: Math.max(o, cl) * 1.0004, l: Math.min(o, cl) * 0.9996, c: cl, v: 1000 }], true);
  }
  R.barsPending = true;
  await oneCycle(`#${k}`);
}
clearInterval(watch);
if (arg("out", "")) writeFileSync(arg("out", ""), JSON.stringify({ symbols, mode, days, out }, null, 1));
rt.stop?.();
process.exit(0);
