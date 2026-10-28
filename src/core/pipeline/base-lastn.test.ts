import assert from "node:assert/strict";
import { test } from "node:test";
import { baseLastNOf, passesBaseLastN } from "./base-lastn.ts";
import { BaseCellAccumulator } from "./base-cell-stats.ts";
import { cellStats, makeUniverse, passesBase, runCombo } from "./pipeline.ts";
import { barsFromCandles, syntheticCandles } from "../market/bars.ts";
import { lastNOk, makeTape } from "../sim/walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { checkSettings } from "../settings-check.ts";
const gates = { minPf: 1.1, minTrades: 5, baseLastN: 40, lastNFloor: 5 };
const trade = (i: number, r: number) => ({ entryT: i * 2, exitT: i * 2 + 1, r });

test("Base last-N defaults to 40 and rejects malformed settings", () => {
  assert.equal(DEFAULT_SETTINGS.gates.baseLastN, 40);
  for (const n of [0, 1, 40, 500]) assert.doesNotThrow(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, baseLastN: n } }));
  for (const n of [-1, 1.5, 501, NaN, Infinity]) assert.throws(() => checkSettings({ gates: { ...DEFAULT_SETTINGS.gates, baseLastN: n } }));
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
