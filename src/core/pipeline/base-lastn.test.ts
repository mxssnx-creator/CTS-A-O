import assert from "node:assert/strict";
import { test } from "node:test";
import { baseLastNForRange, baseLastNOf, passesBaseLastN } from "./base-lastn.ts";
import { BaseCellAccumulator } from "./base-cell-stats.ts";
import { basePassTags, baseRangeCounts, baseRangeWhy, cellStats, makeUniverse, passesBase, rangeBaseStats, rangeCellPass, runCombo } from "./pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { defaultWalkForward, lastNOk, makeTape, processedBaseCheck } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
import { statsOf } from "../metrics/stats.ts";
const gates = { minPf: 1.1, minTrades: 5, baseLastN: 40, lastNFloor: 5 };
const trade = (i: number, r: number) => ({ entryT: i * 2, exitT: i * 2 + 1, r });

test("Base last-N defaults to 40 and rejects malformed settings", () => {
  assert.equal(DEFAULT_SETTINGS.gates.baseLastN, 40);
  assert.deepEqual(DEFAULT_SETTINGS.gates.baseRangeLastN, { micro: 30, minimal: 30 });
  for (const n of [0, 1, 40, 500]) assert.doesNotThrow(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, baseLastN: n } }));
  for (const n of [-1, 1.5, 501, NaN, Infinity]) assert.throws(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, baseLastN: n } }));
});

test("Base evaluates the configured signed blocks and the PF of the complete window", () => {
  const both = { long: 2, short: 2, minimal: 1, shortPolarity: "negative", minimalPolarity: "positive" } as const;
  const options = { ...DEFAULT_SETTINGS.gates, minPf: 1.2, maxDdr: 0,
    positionWindows: { ...DEFAULT_SETTINGS.gates.positionWindows!, blocks: { base: both } } };
  const requested = baseLastNForRange(options, "sh");
  assert.equal(requested, 5);
  const cell = (values: number[], signed = true) => {
    const rows = values.map((value, i) => trade(i, value));
    const acc = new BaseCellAccumulator();
    for (const row of rows) acc.push(row.r, row.entryT, row.exitT);
    const result = acc.stats(requested, 0, signed);
    assert.deepEqual(result.baseLast, baseLastNOf(rows, requested, 0, signed));
    return result;
  };
  const qualified = cell([.06, .02, -.01, -.02, .01]);
  assert.equal(passesBase(qualified, options), true);
  assert.equal(passesBase(qualified, { ...options, positionWindows: { ...options.positionWindows,
    blocks: { base: { ...both, shortPolarity: "positive" } } } }), false);
  assert.equal(passesBase(cell([.015, .015, -.04, -.03, .01]), options), false, "the winning Long cannot hide a losing full book");
  assert.equal(passesBase(cell([.06, .02, -.01, -.02, -.001]), options), false, "Last has its own sign");
  assert.equal(passesBase(cell([.06, -.01, -.02, .01]), options), false, "a signed window needs all of its closes");
  assert.equal(passesBase(cell([.06, .02, -.01, -.02, .01], false), options), false, "old unsigned proof is insufficient");
});

test("Micro and Minimal own Last-30 Base results are used for admission and rejection counts", () => {
  const own = { ...DEFAULT_SETTINGS.gates, positionWindows:null, minTrades: 9, maxDdr: 0, lastNFloor: 9 };
  assert.equal(baseLastNForRange(own, "mc"), 30);
  assert.equal(baseLastNForRange(own, "mn"), 30);
  assert.equal(baseLastNForRange(own, "sh"), 40);
  assert.equal(baseLastNForRange({ ...own, baseLastN: 0 }, "mc"), 0);
  const rows = [...Array.from({ length: 10 }, (_, i) => trade(i, .03)),
    ...Array.from({ length: 30 }, (_, i) => trade(i + 10, -.005))];
  const stats = statsOf(rows);
  const at = (n: number) => ({ ...stats, baseLast: baseLastNOf(rows, n, 1) });
  const run = { full: at(40), ranges: { mc: at(30), mn: at(30), sh: at(40) }, ind: "ema-9-21@m1" };
  assert.deepEqual(basePassTags(run, own), ["", "sh"]);
  for (const tag of ["mc", "mn"]) {
    assert.equal(rangeCellPass(own, run.ind)(tag, run.ranges[tag as "mc" | "mn"]), false);
    const count = baseRangeCounts([run], own, [tag]).find((x) => x.tag === tag)!;
    const why = baseRangeWhy([run], own, [tag]).find((x) => x.tag === tag)!;
    assert.equal(count.passed, 0);
    assert.equal(why.passed, 0);
    assert.equal(why.first.lastN, 1, "recent rejection must not be reported as a Base pass");
  }
  assert.throws(() => checkSettings({ gates: { ...own, baseRangeLastN: { micro: 30.5 } } }), /last-N/);
  assert.throws(() => checkSettings({ gates: { ...own, baseRangeLastN: { micro: -1 } } }), /last-N/);
});

test("actual range Base cells calculate their own requested windows", () => {
  const bars = Array.from({ length: 2 }, (_, i) => barsFromCandles(`R${i}`, 1,
    syntheticCandles(`R${i}`, 1, 2500, Date.UTC(2026, 9, 17), 28 + i)));
  const u = makeUniverse(bars), ind = "ema-9-21@m1";
  const protects = ["mc", "mn", "sh"].map((tag) => ({ tp: .01, sl: .01, trail: 0, hold: 20,
    tag: tag as "mc" | "mn" | "sh" }));
  const tactics = { ...DEFAULT_SETTINGS.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false };
  const g = DEFAULT_SETTINGS.gates;
  const out = rangeBaseStats(u, "follow", ind, protects, DEFAULT_SETTINGS.cost, tactics, undefined, false,
    rangeCellPass(g, ind), 1, undefined, undefined, undefined, g.baseLastN, g.baseRangeLastN)!;
  for (const p of protects) {
    const n = p.tag === "sh" ? 40 : 30;
    assert.equal(out[p.tag].baseLast?.requested, n);
    assert.deepEqual(out[p.tag].baseLast, cellStats(u, "follow", ind, p, DEFAULT_SETTINGS.cost, tactics, undefined, n)!.baseLast);
  }
});

test("a passing Base symbol and direction survives wider discovery without qualifying siblings", () => {
  const bars = Array.from({ length: 6 }, (_, i) => barsFromCandles(`R${i}`, 1,
    syntheticCandles(`R${i}`, 1, 2500, Date.UTC(2026, 9, 17), 28 + i)));
  const u = makeUniverse(bars), ind = "ema-9-21@m1", cost = .00176;
  const protect = { tp: .008, sl: .008, trail: 0, hold: 10, tag: "mn", priceDistance: true } as const;
  const windows = { base: 10, main: 12, real: 12, entry: 12, maxDrawdownPositions: 40, strictCounts: true };
  const gates = { ...DEFAULT_SETTINGS.gates, minPf: 1.25, baseSetsMinPf: 1.25, rangeMinPf: {},
    stepPf: { enabled: false, ratio: .2, max: 2 }, maxDdr: 0, positionWindows: windows };
  const tactics = { ...DEFAULT_SETTINGS.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false };
  const pass = rangeCellPass(gates, ind);
  const pooled = cellStats(u, "follow", ind, protect, cost, tactics, undefined, 0, windows)!;
  const scoped = cellStats(u, "follow", ind, protect, cost, tactics, undefined, 0, windows, st => pass("mn", st))!;
  assert.equal(pass("mn", pooled), false);
  assert.equal(pass("mn", scoped), true);
  const run = runCombo(u, "follow", ind, protect, cost, 2, tactics)!;
  const tape = makeTape(run.id, "follow", ind, run.protect, "normal", bars.map(b => b.sym), run.trades, run.open, run.pending);
  const options = defaultWalkForward({ ...DEFAULT_SETTINGS, cost, gates, tactics });
  for (const sym of tape.syms) for (const side of [1, -1] as const) {
    const acc = new BaseCellAccumulator();
    for (const t of run.trades) if (t.sym === sym && t.side === side && t.exitT < u.nowT) acc.push(t.r, t.entryT, t.exitT);
    const own = acc.stats(windows.base, protect.sl * 100);
    assert.equal(processedBaseCheck(tape, options, sym, side, u.nowT)(undefined, undefined, "context"),
      passesBase(own, gates), `${sym} ${side}`);
  }

  const negative = { long: 4, short: 2, minimal: 1, shortPolarity: "negative", minimalPolarity: "negative" } as const;
  const positive = { ...negative, minimalPolarity: "positive" } as const;
  const signedWindows = { ...windows, base: 60 };
  for (const [block, expected] of [[negative, true], [positive, false]] as const) {
    const baseContext = { defaultWindow: false, blocks: [block] };
    const scopedGates = { ...gates, positionWindows: signedWindows, baseContext };
    const pass = rangeCellPass(scopedGates, ind);
    const stat = cellStats(u, "follow", ind, protect, cost, tactics, undefined, 0, signedWindows,
      st => pass("mn", st), baseContext)!;
    assert.equal(stat.baseLast?.requested, 7);
    assert.equal(pass("mn", stat), expected);
    const scopedOptions = { ...options, gates: scopedGates };
    const passing = tape.syms.some(sym => [1, -1].some(side =>
      processedBaseCheck(tape, scopedOptions, sym, side, u.nowT)(block, undefined, "context")));
    assert.equal(passing, expected);
  }

  const symbol = tape.syms[0];
  const small = makeTape(run.id, "follow", ind, run.protect, "normal", [symbol], run.trades.slice(0, 2)
    .map(t => ({ ...t, sym: symbol, side: 1 as const, r: .01 })), [], []);
  const shortWindow = { ...windows, base: 2, strictCounts: false };
  assert.equal(processedBaseCheck(small, { ...options, gates: { ...gates, positionWindows: shortWindow, lastNFloor: 9 } },
    symbol, 1, u.nowT)(undefined, undefined, "context"), true);
});

test("Base last-40 rejects recent losses despite a profitable full history", () => {
  const trades = [...Array.from({ length: 80 }, (_, i) => trade(i, .01)),
    ...Array.from({ length: 40 }, (_, i) => trade(80 + i, -.002))];
  const baseLast = baseLastNOf(trades, 40, .01)!;
  assert.equal(passesBase({ n: trades.length, pf: 10, net: 72, baseLast }, gates), false);
  assert.equal(passesBase({ n: trades.length, pf: 10, net: 72, baseLast }, { ...gates, baseLastN: 0 }), true);
});

test("Base recent sample obeys its floor and fails closed on missing, stale or invalid evidence", () => {
  for (const n of [0, 4, 5, 39, 40, 60]) {
    const trades = Array.from({ length: n }, (_, i) => trade(i, .01));
    const s = baseLastNOf(trades, 40, .01)!;
    assert.equal(passesBaseLastN(n, s, gates), n >= 5);
    assert.equal(passesBaseLastN(n, s, { ...gates, lastNFloor: 0 }), n >= 40);
  }
  const good = baseLastNOf(Array.from({ length: 40 }, (_, i) => trade(i, .01)), 40, .01)!;
  assert.equal(passesBaseLastN(40, undefined, gates), false);
  assert.equal(passesBaseLastN(41, { ...good, requested: 39 }, gates), false);
  assert.equal(passesBaseLastN(41, { ...good, gp: NaN }, gates), false);
  assert.equal(passesBaseLastN(41, { ...good, invalid: true }, gates), false);
  assert.equal(baseLastNOf([trade(0, .01), { ...trade(1, .01), exitT: NaN }], 1, .01)?.invalid, true);
  assert.equal(baseLastNOf([trade(1, .01), trade(0, .01)], 1, .01)?.invalid, true);
  const badTime = new BaseCellAccumulator();
  badTime.beginRun(); badTime.push(.01, 0, NaN); badTime.push(.01, 1, 2);
  assert.equal(badTime.stats(1, .01).baseLast?.invalid, true);
  assert.equal(passesBaseLastN(41, good, { ...gates, lossPrior: true }), true);
  assert.equal(passesBaseLastN(41, { ...good, stop: 100 }, { ...gates, lossPrior: true }), false);
});

test("Base last-N preserves stable chronological ordering across interleaved source runs", () => {
  const a = Array.from({ length: 35 }, (_, i) => trade(2 * i, i < 20 ? .01 : -.02));
  const b = Array.from({ length: 35 }, (_, i) => trade(2 * i + 1, i < 20 ? .02 : -.01));
  const sorted = [...a, ...b].sort((x, y) => x.exitT - y.exitT || x.entryT - y.entryT);
  const cell = new BaseCellAccumulator();
  for (const rows of [a, b]) { cell.beginRun(); for (const row of rows) cell.push(row.r, row.entryT, row.exitT); }
  assert.deepEqual(cell.stats(40, .5).baseLast, baseLastNOf(sorted, 40, .5));
});

test("actual Base cells match independent sorted trade and walk-forward last-N evidence", () => {
  const bars = Array.from({ length: 4 }, (_, i) => barsFromCandles(`S${i}`, 1,
    syntheticCandles(`S${i}`, 1, 2500, Date.UTC(2026, 9, 17), 25 + i)));
  const u = makeUniverse(bars), ind = "ema-9-21@m1";
  const protect = { tp: .01, sl: .01, trail: 0, hold: 20, tag: "sh" as const };
  const tactics = { ...DEFAULT_SETTINGS.tactics, session: false, volRegime: false, trendStrength: false, cooldown: false };
  for (const n of [5, 40, 100, 500]) {
    const run = runCombo(u, "follow", ind, protect, DEFAULT_SETTINGS.cost, 1, tactics, false, n)!;
    const cell = cellStats(u, "follow", ind, protect, DEFAULT_SETTINGS.cost, tactics, undefined, n)!;
    assert.ok(run.trades.length > 5, "real simulated closes exercise the comparison");
    const expected = baseLastNOf(run.trades, n, run.protect.sl * 100)!;
    assert.deepEqual(run.full.baseLast, expected);
    assert.deepEqual(cell.baseLast, expected, "optimized Base accumulator uses the same exact ordered closes");
    const tape = makeTape(run.id, run.bot, run.ind, run.protect, "normal", bars.map((b) => b.sym), run.trades, [], []);
    for (const floor of [0, 5]) for (const prior of [false, true]) for (const minPf of [.8, 1.1, 2]) {
      const ours = passesBaseLastN(run.trades.length, expected,
        { baseLastN: n, lastNFloor: floor, lossPrior: prior, minPf });
      const direct = lastNOk(tape, u.nowT, n, minPf, 0, 0, floor, true, prior ? run.protect.sl : 0);
      assert.equal(ours, direct, `n=${n}, floor=${floor}, prior=${prior}, minPf=${minPf}`);
    }
  }
});
