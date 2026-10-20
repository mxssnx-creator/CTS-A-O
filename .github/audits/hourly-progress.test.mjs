import assert from "node:assert/strict";
import { test } from "node:test";
import { scalarStats, scalarEval } from "./hourly-progress.mjs";
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
