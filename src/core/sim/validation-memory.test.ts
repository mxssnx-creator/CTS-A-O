import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { configEval, defaultWalkForward, makeTape, selectFixedGen, walkForward } from "./walkforward.ts";

const H = 3_600_000, T = 1000 * H;
const ind = "ema-21-55@m5";
const protect = { tp: 0.01, sl: 0.01, trail: 0, hold: 12 };
const tapes = [0, 1, 2].map((j) => {
  const id = `follow|${ind}|cell${j}`;
  const rows: Trade[] = Array.from({ length: 72 }, (_, i) => ({
    cfg: id, sym: i % 2 ? "A" : "B", side: i % 2 ? 1 : -1,
    entryT: T + (i - 48) * H + 60_000, exitT: T + (i - 48) * H + 120_000,
    entry: 100, exit: 101, r: j === 1 || i % 4 === 0 ? -0.005 : 0.012,
    reason: "tp", bars: 1, mfe: 0, mae: 0,
  }));
  return makeTape(id, "follow", ind, protect, "normal", ["A", "B"], rows, [], []);
});
const defaults = defaultWalkForward(DEFAULT_SETTINGS);
const options = { ...defaults, startT: T, simH: 24, bots: [], preH: 6, longH: 24,
  preGate: false, validLastN: 15, lastN: 0, durableFrac: 0, rangeGate: undefined,
  symGate: "off" as const, coord: { ...defaults.coord!, enabled: false },
  toggles: { ...defaults.toggles, normal: true, block: false, blockActive: false },
  gates: { ...defaults.gates, minPf: 1.1, minTrades: 3, minGreen: 0, maxDdr: 0,
    maxDdtH: 1000, stableBlocks: 0, lossPrior: false, lastNFloor: 0 },
};

test("compact validation summaries preserve config verdicts, selection and executions across 24 hours", () => {
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 24 * H,
    splitT: T, nowT: T + 24 * H, baseTf: 5 } as never;
  const full = walkForward(u, tapes, { ...options, recordValidation: true });
  const compact = walkForward(u, tapes, { ...options, recordValidation: "summary" });
  const none = walkForward(u, tapes, { ...options, recordValidation: false });
  const economic = ({opts: _opts, steps, ...rest}: typeof full) => ({...rest,
    steps: steps.map(({checks: _checks, validationSummary: _summary, ...step}) => step)});
  assert.deepEqual(economic(compact), economic(full));
  assert.deepEqual(economic(none), economic(full));
  assert.ok(full.trades.length > 0, "parity includes actual modeled entries and closes");
  assert.ok(full.trades.some((t) => t.r < 0), "passing sets retain their future losses");
  for (let i = 0; i < full.steps.length; i++) {
    const checks = full.steps[i].checks!;
    const s = compact.steps[i].validationSummary!;
    assert.equal(compact.steps[i].checks, undefined);
    assert.equal(s.evaluated, checks.length);
    const passing = checks.filter((x) => x[1]);
    assert.equal(s.passed, passing.length);
    assert.equal(s.closes, passing.reduce((a, x) => a + x[2], 0));
    assert.equal(s.gp, passing.reduce((a, x) => a + x[4], 0));
    assert.equal(s.gl, passing.reduce((a, x) => a + x[5], 0));
    assert.equal(Object.values(s.failures).reduce((a, n) => a + n, 0), s.evaluated - s.passed);
  }
  const gen = selectFixedGen(tapes, T, {...options, recordValidation: "summary"});
  let next = gen.next();
  while (!next.done) next = gen.next();
  const at = next.value;
  const fails: Record<string, number> = {};
  for (const tp of tapes) {
    const ev = configEval(tp, T, options);
    if (!ev.ok) fails[ev.fail] = (fails[ev.fail] ?? 0) + 1;
  }
  assert.deepEqual(at.validationSummary?.failures, fails);
});

test("Signal diagnostics retain every independent verdict without retaining per-config rows in summary mode", () => {
  const signalTapes = tapes.map((tp) => {
    const source = "sig-ema-cross-s@m5", id = tp.id.replace(ind, source);
    const rows: Trade[] = Array.from({ length: tp.n }, (_, i) => ({
      cfg: id, sym: tp.syms[tp.symI[i]], side: tp.side[i] as 1 | -1,
      entryT: tp.entryT[i], exitT: tp.exitT[i], entry: tp.entry[i], exit: tp.exit[i],
      r: tp.r[i], reason: "tp", bars: 1, mfe: 0, mae: 0,
    }));
    return makeTape(id, "follow", source, protect, "normal", tp.syms, rows, [], []);
  });
  const u = { bars: [], caches: [], startT: T - 48 * H, endT: T + 24 * H, splitT: T, nowT: T + 24 * H, baseTf: 5 } as never;
  for (const signalOwnBase of [false, true]) {
    const own = { ...options, signalOwnBase, signalLongH: 24, signalValidLastN: 15,
      signalRank: { ...DEFAULT_SETTINGS.signals, enabled: true } };
    const full = walkForward(u, [...tapes, ...signalTapes], { ...own, recordValidation: true });
    const compact = walkForward(u, [...tapes, ...signalTapes], { ...own, recordValidation: "summary" });
    for (let i = 0; i < full.steps.length; i++) {
      const checks = full.steps[i].checks!, summary = compact.steps[i].validationSummary!;
      assert.equal(summary.evaluated, checks.length);
      assert.equal(summary.passed, checks.filter((c) => c[1]).length);
      assert.equal(summary.closes, checks.filter((c) => c[1]).reduce((n, c) => n + c[2], 0));
      assert.equal(compact.steps[i].checks, undefined);
      assert.ok(checks.some((c) => c[0].includes("sig-ema-cross")));
    }
    assert.deepEqual(compact.trades, full.trades);
    assert.deepEqual(compact.skips, full.skips);
  }
});
