#!/usr/bin/env node
// Deterministic CPU/retention microbenchmark for the shared 336h Signal config evaluator.
// This is a synthetic performance fixture, not a trading or PF study.
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { configEval, defaultWalkForward, makeTape } from "../../src/core/sim/walkforward.ts";

const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) throw new Error("Run with --expose-gc for comparable heap measurements");

const H = 3_600_000;
const now = Date.UTC(2026, 9, 21);
const symbols = Array.from({ length: 12 }, (_, i) => `PERF${String(i).padStart(2, "0")}-USDT`);
const configs = 2_000;
const passes = 5;
const closesPerContext = 16;
const source = "sig-ema-cross-s@m15";
const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const tapes = Array.from({ length: configs }, (_, config) => {
  const id = `follow|${source}|perf-cell-${config}`;
  const trades = [];
  for (let sym = 0; sym < symbols.length; sym++) for (const side of [1, -1]) {
    for (let i = 0; i < closesPerContext; i++) {
      const r = i % 5 === 0 ? -0.003 : 0.004;
      const entry = 100 + sym;
      const direction = side;
      const entryT = now - (closesPerContext - i) * H;
      trades.push({
        cfg: id,
        sym: symbols[sym],
        side: direction,
        entryT,
        exitT: entryT + 60_000,
        entry,
        exit: entry * (1 + direction * r),
        r,
        reason: r > 0 ? "tp" : "sl",
        bars: 1,
        mfe: 0,
        mae: 0,
        kind: "normal",
        mult: 1,
      });
    }
  }
  return makeTape(id, "follow", source, protect, "normal", symbols, trades, [], []);
});
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const options = {
  ...defaults,
  startT: now,
  longH: 336,
  signalLongH: 336,
  preH: 6,
  validLastN: 0,
  signalValidLastN: 0,
  lastN: 0,
  preGate: false,
  gates: {
    ...defaults.gates,
    minTrades: 3,
    minPf: 1.05,
    minGreen: 0,
    maxDdr: 0,
    maxDdtH: 1000,
    stableBlocks: 0,
    lossPrior: false,
  },
};

gc();
const before = process.memoryUsage();
const started = performance.now();
const hash = createHash("sha256");
let evaluated = 0;
let passed = 0;
let contexts = 0;
const passMs: number[] = [];
for (let pass = 0; pass < passes; pass++) {
  const passStarted = performance.now();
  const t = now + pass * H;
  for (const tp of tapes) {
    const result = configEval(tp, t, options);
    evaluated++;
    passed += result.ok ? 1 : 0;
    contexts += result.contexts?.length ?? 0;
    hash.update(
      JSON.stringify({
        id: tp.id,
        ok: result.ok,
        fail: result.ok ? null : result.fail,
        n: result.n,
        pf: result.pf,
        net: result.net,
        gp: result.gp,
        gl: result.gl,
        lcb: result.lcb,
        gh: result.gh,
        ddt: result.ddt,
        candidate: result.candidate,
        contexts: result.contexts?.map(({ sym, side, evaluation }) => ({
          sym,
          side,
          ok: evaluation.ok,
          fail: evaluation.ok ? null : evaluation.fail,
          n: evaluation.n,
          pf: evaluation.pf,
          net: evaluation.net,
          gp: evaluation.gp,
          gl: evaluation.gl,
          lcb: evaluation.lcb,
          gh: evaluation.gh,
          ddt: evaluation.ddt,
        })),
      }),
    );
  }
  passMs.push(performance.now() - passStarted);
}
const elapsedMs = performance.now() - started;
gc();
const after = process.memoryUsage();
console.log(JSON.stringify({
  classification: "synthetic Signal evaluator microbenchmark; no trading or PF claim",
  configs,
  passes,
  symbols: symbols.length,
  closesPerContext,
  lookbackHours: options.signalLongH,
  evaluated,
  passed,
  contexts,
  elapsedMs,
  firstPassMs: passMs[0],
  warmMedianMs: passMs.slice(1).sort((a, b) => a - b)[Math.floor((passMs.length - 1) / 2)],
  passMs,
  heapDeltaMiB: (after.heapUsed - before.heapUsed) / 1048576,
  rssMiB: after.rss / 1048576,
  maxRssMiB: process.resourceUsage().maxRSS / 1024,
  outputSha256: hash.digest("hex"),
}, null, 2));
