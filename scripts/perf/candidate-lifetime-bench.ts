// Bounded Real-candidate lifecycle benchmark. Compare two source roots in separate --expose-gc processes;
// result and simulated-step hashes must match. Heap samples are after explicit GC at completed steps.
// node --expose-gc --experimental-strip-types --no-warnings scripts/perf/candidate-lifetime-bench.ts ROOT
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const root = process.argv[2] ?? process.cwd();
const small = process.argv.includes("--small");
const configs = small ? 3 : 12;
const hours = small ? 4 : 24;
const perHour = small ? 4 : 24;
const load = (name: string) => import(pathToFileURL(`${root}/src/core/${name}`).href);
const [{ makeTape, defaultWalkForward, walkForwardGen }, { DEFAULT_SETTINGS }] = await Promise.all([
  load("sim/walkforward.ts"), load("config.ts"),
]);
const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) throw new Error("Run with --expose-gc for comparable retained-heap measurements");
const H = 3_600_000;
const start = Date.UTC(2026, 9, 15);
const fixture = () => {
  const tapes = [];
  const active = new Set<string>();
  for (let k = 0; k < configs; k++) {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp${1 + k / 100}|sl1|tr0|h32`;
    const syms = ["A-USDT", "B-USDT", "C-USDT"];
    const trades = [];
    // Every admitted source/config/symbol/direction supplies its own causal Last-25 evidence.
    // These closes precede the measured lifecycle window and do not enter its candidate/feed counts.
    for (const sym of syms) for (const side of [1, -1]) for (let i = 0; i < 30; i++) {
      const entryT = start - (100 - i) * H;
      trades.push({ cfg: id, sym, side, entryT, exitT: entryT + 30_000,
        entry: 100, exit: 100 * (1 + side * 0.01), r: 0.01, reason: "tp", bars: 1,
        mfe: 0, mae: 0, kind: "normal", mult: 1 });
    }
    for (let hour = 0; hour < hours; hour++) for (let i = 0; i < perHour; i++) {
      const side = i % 2 ? 1 : -1;
      const sym = syms[i % syms.length];
      active.add(`follow|${ind}|${sym}|${side}|normal|cfg=${encodeURIComponent(id)}`);
      const entryT = start + hour * H + i * 60_000;
      const r = (i + k) % 7 ? 0.004 : -0.006;
      const holdMs = small && i === 0 && hour < hours - 1 ? 1.5 * H : 30_000;
      trades.push({ cfg: id, sym, side, entryT, exitT: entryT + holdMs,
        entry: 100, exit: 100 * (1 + side * r), r, reason: r > 0 ? "tp" : "sl", bars: 1,
        mfe: 0, mae: 0, kind: "normal", mult: 1 });
      if (small && i === 0) trades.push({ ...trades[trades.length - 1] });
    }
    tapes.push(makeTape(id, "follow", ind, { tp: 0.01 + k / 10000, sl: 0.01, trail: 0, hold: 32 }, "normal", syms, trades, [], []));
  }
  const o = { ...defaultWalkForward(DEFAULT_SETTINGS),
    // Freeze the archived fixture's inputs (9c037e2); production defaults and independent Exit options changed later.
    // A direct baseline comparison confirms every non-options output field remains identical.
    // The Inverse catalogue adds volume metadata to current defaults. Keep the archived Signal-only fixture's
    // complete volume inputs explicit; the snapshot still hashes every trade, accepted marker and diagnostic.
    indicationVolumeFactors: { coordination: 8, combined: Object.fromEntries([
      "trend", "break", "active", "direction", "move", "rsi", "bollinger", "sar", "macd", "ema",
      "osc", "volume", "channel", "ichimoku", "smooth", "tactic", "relate",
    ].map((kind) => [kind, 1])) },
    // Freeze the archived Block ladder too; current factory defaults changed 6→7 independently of lifecycle.
    block: { ...DEFAULT_SETTINGS.block, ranges: { ...DEFAULT_SETTINGS.block.ranges, steps: [0, 6] } },
    dca: { levels:1,addRatio:2.5,step:.02,stopGap:.5,slOfTp:1 },
    axisVolumeFactor: undefined, exitVolumeFactor: undefined,
    longH: 336, preH: 20, signalLongH: 336,
    exitMinTrades: undefined, exitMinPf: undefined, exitMinGreenHourShare: undefined, exitMaxDdr: undefined,
    startT: start, simH: hours, stepH: 1, signalActive: active, signalOwnBase: true,
    signalValidLastN: 0, validLastN: 0, lastN: 0, preGate: false, rangeGate: undefined,
    signalGuardN: 0, signalCluster: undefined, signalAccept: undefined, signalSideAccept: undefined,
    signalSourceGate: undefined, engineSideAccept: undefined,
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    symGate: undefined, signalPerSymbol: 0, signalMaxOpen: 0, signalMaxPositions: 0,
    // This archived lifecycle fixture predates Relate; leave the new feature absent so its option snapshot
    // remains comparable to the archived implementation while exercising the same inert execution path.
    relate: undefined,
    toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  };
  return { tapes, o, u: { bars: [], caches: [], startT: start - H, endT: start + hours * H, splitT: start,
    nowT: start + hours * H, baseTf: 1 } };
};
const { tapes, o, u } = fixture();
gc();
const before = process.memoryUsage();
const started = performance.now();
const cpu = process.cpuUsage();
const g = walkForwardGen(u, tapes, o);
const steps: number[] = [];
const heap: Array<{ step: number; t: number; heapUsed: number; rss: number; arrayBuffers: number }> = [];
let result;
let slices = 0;
for (;;) {
  const r = g.next();
  if (r.done) { result = r.value; break; }
  if (r.value < 0) { slices++; continue; }
  steps.push(r.value);
  gc();
  const m = process.memoryUsage();
  heap.push({ step: steps.length, t: r.value, heapUsed: m.heapUsed, rss: m.rss, arrayBuffers: m.arrayBuffers });
}
const ms = performance.now() - started;
const cpuUs = process.cpuUsage(cpu);
const hash = createHash("sha256");
// Stream the complete output by field/row so the comparison does not create one large report string.
for (const [key, value] of Object.entries(result)) {
  hash.update(`${key}\n`);
  if (Array.isArray(value)) for (const row of value) hash.update(`${JSON.stringify(row)}\n`);
  else hash.update(`${JSON.stringify(value)}\n`);
}
const sha256 = (x: string | Uint8Array) => createHash("sha256").update(x).digest("hex");
console.log(JSON.stringify({ benchmark: "Real candidate retained lifetime", root,
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  walkforwardSha256: sha256(readFileSync(`${root}/src/core/sim/walkforward.ts`)),
  capturedAt: new Date().toISOString(), node: process.version,
  input: { tapes: tapes.length, candidates: configs * hours * (perHour + (small ? 1 : 0)), hours },
  fullResultSha256: hash.digest("hex"), stepProgressSha256: sha256(JSON.stringify(steps)),
  settled: result.trades.length, feed: result.feed.length, inactive: result.signalFunnel?.inactive,
  slices, ms, cpuUs, before, heap, maxRssKiB: process.resourceUsage().maxRSS,
}, null, 2));
