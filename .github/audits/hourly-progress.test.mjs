import assert from "node:assert/strict";
import { test } from "node:test";
import { scalarStats, scalarEval, scalarWindow, exactPositiveLcb } from "./hourly-progress.mjs";
const H = 3600000,
  T = Date.UTC(2026, 9, 17, 12);
const options = {
  longH: 12,
  preH: 12,
  preGate: true,
  validLastN: 15,
  exitMinTrades: 12,
  exitMinPf: 1.1,
  gates: {
    minPf: 1.1,
    minTrades: 12,
    lastNFloor: 5,
    maxDdtH: 35,
    minDdtH: 18,
    maxDdr: 1,
    minGreen: 0.5,
  },
  rangeGate: { lastN: 75, minPf: 1.35 },
};
const rows = Array.from({ length: 36 * 20 }, (_, i) => [
  "A",
  i % 2 ? 1 : -1,
  T - 24 * H + i * 3 * 60000,
  T - 24 * H + i * 3 * 60000 + 60000,
  i % 5 ? 0.01 : -0.005,
]);

test("independent scalar arithmetic has known gross amounts, variance, hour boundary and drawdown", () => {
  const w = scalarStats(
    [
      ["A", 1, T - 60000, T, 0.02],
      ["A", 1, T, T + 60000, -0.01],
      ["A", 1, T + 60000, T + 120000, 0.02],
    ],
    T + 180000,
  );
  assert.equal(w.n, 3);
  assert.equal(w.gp, 0.04);
  assert.equal(w.gl, 0.01);
  assert.equal(w.pf, 4);
  assert.equal(w.net, 3);
  assert.equal(w.gh, 1);
  assert.ok(Math.abs(w.mdd - 0.01) < 1e-12);
});
test("all seven ranges and seven types retain passing own history through twelve hourly transitions", () => {
  for (const tag of [undefined, "mc", "mn", "mp", "sh", "gn", "lg"])
    for (const kind of ["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis"])
      for (let i = 0; i < 12; i++) {
        const r = scalarEval(
          rows,
          T + i * H,
          options,
          { tp: 0.02, sl: 0.01, trail: 0, hold: 60, tag },
          kind,
        );
        assert.equal(r.ok, true, `${tag}/${kind}/${i}/${r.fail}`);
        assert.equal(r.n, 240);
      }
});
test("future closes do not alter past scalar verdicts and a losing own Last-N cannot borrow wins", () => {
  const protect = { tp: 0.02, sl: 0.01, tag: "mc" };
  const a = scalarEval(rows, T, options, protect),
    future = rows.map((x) => (x[3] > T ? [...x.slice(0, 4), -1] : x));
  assert.deepEqual(scalarEval(future, T, options, protect), a);
  const past = rows.filter((x) => x[3] <= T),
    losing = past.map((x, i) => (i >= past.length - 15 ? [...x.slice(0, 4), -0.02] : x));
  assert.equal(scalarEval(losing, T, options, protect).ok, false);
  assert.equal(a.ok, true);
});

const independentOptions = {
  ...options,
  preGate: false,
  validLastN: 3,
  rangeGate: undefined,
  gates: { ...options.gates, minTrades: 3, lastNFloor: 0, maxDdr: 0, minGreen: 0 },
};
const mixedRows = Array.from({ length: 12 }, (_, i) => [
  "A",
  i % 2 ? -1 : 1,
  T - H + i * 60000 - 1,
  T - H + i * 60000,
  i % 2 ? -0.03 : i === 10 ? -0.01 : 0.02,
]);
const microProtect = { tp: 0.02, sl: 0.01, tag: "mc" };

test("a losing pooled window still seats only its independently profitable direction", () => {
  const e = scalarEval(mixedRows, T, independentOptions, microProtect);
  assert.ok(scalarStats(mixedRows, T).net < 0);
  assert.equal(e.ok, true);
  assert.deepEqual(e.qualifiedSides, [1]);
  assert.equal(e.n, 6);
  assert.equal(e.gp, 0.1);
  assert.equal(e.gl, 0.01);
  assert.equal(e.pf, 10);
  assert.equal(e.directions[1].ok, false);
  assert.equal(e.directions[1].fail, "net");
});

test("failed selection summaries are zero while both losing direction samples remain auditable", () => {
  const losing = mixedRows.map((x) => [...x.slice(0, 4), -0.01]);
  const e = scalarEval(losing, T, independentOptions, microProtect);
  assert.equal(e.ok, false);
  assert.equal(e.n, 0);
  assert.equal(e.pf, 0);
  assert.equal(e.gp, 0);
  assert.equal(e.gl, 0);
  assert.deepEqual(e.qualifiedSides, []);
  assert.deepEqual(
    e.directions.map((x) => [x.n, x.gl, x.fail]),
    [
      [6, 0.060000000000000005, "net"],
      [6, 0.060000000000000005, "net"],
    ],
  );
});

test("two passing directions combine their actual gross sums without borrowing qualification", () => {
  const both = mixedRows.map((x, i) => [...x.slice(0, 4), i >= 10 ? -0.01 : 0.02]);
  const e = scalarEval(both, T, independentOptions, microProtect);
  assert.equal(e.ok, true);
  assert.deepEqual(e.qualifiedSides, [1, -1]);
  assert.equal(e.n, 12);
  assert.equal(e.gp, 0.2);
  assert.equal(e.gl, 0.02);
  assert.equal(e.pf, 10);
});

test("Last-N includes a close at the decision while its history window excludes that boundary", () => {
  const boundaryLoss = ["A", 1, T - 60000, T, -0.2];
  const e = scalarEval([...mixedRows, boundaryLoss], T, independentOptions, microProtect);
  assert.equal(e.ok, false);
  assert.equal(e.directions[0].n, 6);
  assert.equal(e.directions[0].fail, "lastN");
  assert.equal(
    scalarEval([...mixedRows, boundaryLoss], T - 1, independentOptions, microProtect).ok,
    true,
  );
  assert.equal(
    scalarEval(
      [...mixedRows, [...boundaryLoss.slice(0, 3), T + 1, -0.2]],
      T,
      independentOptions,
      microProtect,
    ).ok,
    true,
  );
});

test("range-specific Last-N overrides are applied to each own direction", () => {
  const o = { ...independentOptions, validLastN: 100, rangeOpts: { mc: { validLastN: 3 } } };
  assert.equal(scalarEval(mixedRows, T, o, microProtect).ok, true);
  assert.equal(scalarEval(mixedRows, T, { ...o, rangeOpts: undefined }, microProtect).ok, false);
});

test("raw incoming-minus-expired conservation survives a change of qualified direction membership", () => {
  const more = [...mixedRows, ["A", 1, T, T + 60000, -0.5]];
  const before = scalarWindow(more, T, 12),
    after = scalarWindow(more, T + H, 12);
  const a = scalarEval(more, T, independentOptions, microProtect),
    b = scalarEval(more, T + H, independentOptions, microProtect);
  assert.deepEqual(a.qualifiedSides, [1]);
  assert.deepEqual(b.qualifiedSides, []);
  assert.ok(Math.abs(after.net - before.net + 50) < 1e-10);
  assert.notEqual(b.net - a.net, after.net - before.net);
});

test("legacy Micro keeps its configured 1.05 floor while first-class Micro retains its own 1.1 minimum", () => {
  const old = Array.from({ length: 20 }, (_, i) => ["A", 1, T - 12 * H + i * 60000 - 1, T - 12 * H + i * 60000, .02]);
  const recent = [.0030963229416467977, .0018820822254040064, -.002604180966307504, -.0021151609205043494]
    .map((r, i) => ["A", 1, T - H + i * 60000 - 1, T - H + i * 60000, r]);
  const o = { ...independentOptions, longH: 24, preH: 6, preGate: true, validLastN: 15,
    gates: { ...independentOptions.gates, rangeMinPf: { micro: 1.05 } } };
  assert.equal(scalarEval([...old, ...recent], T, o, microProtect, "trailing-only", "mc-rsit5-10@m5").ok, true);
  const modern = scalarEval([...old, ...recent], T, o, microProtect, "trailing-only", "micro-1-turn-fast@m1");
  assert.equal(modern.ok, false);
  assert.equal(modern.directions[0].fail, "pre");
});

test("exact binary LCB boundary distinguishes zero and either side without weakening the gate", () => {
  const rowsOf = values => values.map((r, i) => ["A", 1, T - 60000 * (values.length - i), T - 60000 * (values.length - i) + 1, r]);
  const zero = [...Array(6).fill(1.5), ...Array(10).fill(-.5)];
  const positive = [...zero], negative = [...zero];
  positive[0] = 1.5000000000000002; negative[0] = 1.4999999999999998;
  for (const scale of [1, 2 ** -200, 2 ** 200]) {
    for (const [values, expected] of [[zero, false], [positive, true], [negative, false]]) {
      const rows = rowsOf(values.map(x => x * scale));
      assert.equal(exactPositiveLcb(rows), expected);
      assert.equal(scalarStats(rows, T).lcbPositive, expected);
      assert.equal(exactPositiveLcb([...rows].reverse()), expected);
    }
  }
  const observed = rowsOf([-0.0115, -0.011499999999999991, -0.011500000000000038, -0.011500000000000015, -0.011499999999999918, -0.011499999999999915, 0.03450000000000006, -0.011500000000000066, 0.03449999999999998, 0.03450000000000005, 0.034500000000000024, 0.034500000000000045, -0.011500000000000078, -0.011499999999999995, -0.011500000000000071, 0.03450000000000001]);
  const stats = scalarStats(observed, T);
  assert.equal(stats.lcb, 0, "Welford rounding loses the actual tiny positive sign");
  assert.equal(stats.lcbExactBoundary, true);
  assert.equal(stats.lcbPositive, true, "exact input-double arithmetic preserves the positive result");
});
