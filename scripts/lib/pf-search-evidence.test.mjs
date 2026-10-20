import assert from "node:assert/strict";
import { test } from "node:test";
import { POSITION_COST_RT } from "../../src/core/model-cost.ts";
import {
  pfSearchFamilyRows,
  pfSearchObjectiveText,
  pfSearchSample,
  scorePfSearchUnits,
} from "./pf-search-evidence.mjs";

const COLS = [
  "cfg",
  "sym",
  "side",
  "entryT",
  "exitT",
  "entry",
  "exit",
  "r",
  "reason",
  "rWeighted",
  "unitR",
];
const CFG = "follow|test|sh|tp1";
const T = Date.parse("2026-09-29T11:00:00Z");
const family = (rows, extra = {}) => ({
  schema: 7,
  label: "eng follow sh",
  pfBasis: "unit-net-returns",
  rowsCols: COLS,
  rows,
  ...extra,
});
const tuple = (r, at = T, extra = {}) => {
  const side = extra.side ?? 1;
  const obj = {
    cfg: CFG,
    sym: `S${at}`,
    side,
    entryT: at,
    exitT: at + 60_000,
    entry: 100,
    exit: 100 * (1 + side * (r + 0.002)),
    r,
    reason: "tp",
    rWeighted: r,
    unitR: r,
    ...extra,
  };
  return COLS.map((key) => obj[key]);
};
const near = (got, expected) => assert.ok(Math.abs(got - expected) < 1e-10, `${got} ≠ ${expected}`);

test("schema7 preserves explicit unit returns and weighted diagnostics without dividing twice", () => {
  const rows = pfSearchFamilyRows(
    family([
      tuple(0.0136, T, { r: 0.0136 * 6.8, rWeighted: 0.0136 * 6.8 }),
      tuple(-0.01, T + 1, { r: -0.068, rWeighted: -0.068 }),
    ]),
  );
  assert.equal(rows[0].unitR, 0.0136);
  assert.equal(rows[0].r, 0.0136);
  assert.equal(rows[0].recordedR, 0.0136 * 6.8);
  assert.equal(rows[1].rWeighted, -0.068);
  const result = pfSearchSample(rows);
  near(result.primary.pf, 1.36);
  near(result.objective.pf, 1.36);
  assert.equal(result.objective.kind, "unit-net-returns-repriced-round-trip");
  assert.equal(result.objective.roundTrip, POSITION_COST_RT);
  assert.equal(result.n, 2);
});

test("legacy schema3 tuples without explicit unit evidence remain whole and unavailable", () => {
  const tuples = [tuple(0.0136).slice(0, 9), tuple(-0.068, T + 1).slice(0, 9)];
  const rows = pfSearchFamilyRows({ schema: 3, rows: tuples });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].recordedR, -0.068);
  assert.equal(rows[1].unitR, null);
  const result = pfSearchSample(rows);
  assert.equal(result.primary.unknownReturns, 2);
  assert.equal(result.primary.pf, null);
  assert.equal(result.objective.available, false);
  assert.equal(result.stats, null);
  assert.equal(result.n, 2);
  assert.equal(pfSearchObjectiveText(result.objective), "unavailable");
});

test("unit metadata requires a recorded basis and follows named columns", () => {
  const source = family([tuple(0.01)], { rowsCols: [...COLS].reverse() });
  source.rows = [tuple(0.01).reverse()];
  const row = pfSearchFamilyRows(source)[0];
  assert.equal(row.cfg, CFG);
  assert.equal(row.unitR, 0.01);
  assert.equal(row.exit_t, T + 60_000);
  assert.equal(pfSearchFamilyRows({ ...source, pfBasis: undefined })[0].unitR, null);
  assert.equal(pfSearchFamilyRows(family([tuple(0.01)], { schema: 3 }))[0].unitR, 0.01);
});

test("a null unit-return loss blocks the complete period rather than selecting known winners", () => {
  const rows = pfSearchFamilyRows(
    family([tuple(0.02), tuple(-0.068, T + 1, { unitR: null, rWeighted: -0.068 })], {
      pfBasis: "unavailable",
    }),
  );
  const result = pfSearchSample(rows);
  assert.equal(result.n, 2);
  assert.equal(result.primary.n, 2);
  assert.equal(result.primary.unknownReturns, 1);
  assert.equal(result.primary.pf, null);
  assert.equal(result.objective.pf, null);
  assert.equal(result.objective.available, false);
  assert.equal(result.stats, null);
  assert.equal(rows[1].rWeighted, -0.068);
});

test("cost repricing deducts only missing cost and preserves already greater recorded costs", () => {
  const missingCost = pfSearchFamilyRows(
    family([tuple(0.009, T, { exit: 101 }), tuple(-0.01, T + 1, { exit: 99.1 })]),
  );
  const result = pfSearchSample(missingCost);
  // the fixture's exits embed 0.1 % of cost; the repricing deducts the rest of POSITION_COST_RT
  const missing = POSITION_COST_RT - 0.001;
  near(result.objective.pf, (0.009 - missing) / (0.01 + missing));
  near(result.primary.pf, 0.9);
  assert.equal(missingCost[0].r, 0.009);
  const greaterCost = pfSearchSample(
    pfSearchFamilyRows(
      family([tuple(0.016, T, { exit: 102 }), tuple(-0.01, T + 1, { exit: 99.4 })]),
    ),
  );
  near(greaterCost.objective.pf, 1.6);
});

test("endpoint marks stay in the primary sample but missing mark prices block the complete repriced objective", () => {
  const rows = pfSearchFamilyRows(
    family([tuple(0.03), tuple(-0.05, T + 1, { reason: "open-end", exit: null })]),
  );
  const result = pfSearchSample(rows);
  near(result.primary.pf, 0.6);
  assert.equal(result.n, 2);
  assert.equal(result.stress.invalidPriceBasis, 1);
  assert.equal(result.objective.available, false);
  assert.equal(result.stats, null);
});

test("the frozen no-loss objective stays unbounded while primary evidence retains engine score4", () => {
  const result = pfSearchSample(pfSearchFamilyRows(family([tuple(0.01)])));
  assert.equal(result.primary.pf, 4);
  assert.equal(result.primary.pfConvention, "no-loss-sentinel");
  assert.equal(result.objective.pf, Infinity);
  assert.equal(result.objective.exactRatio, null);
  assert.equal(result.objective.pfConvention, "no-loss-unbounded-objective");
  assert.equal(pfSearchObjectiveText(result.objective), "No losses (unbounded objective)");
});

test("D1a alone orders candidates; a better D1b cannot replace its frozen selection", () => {
  const training = { from: T, to: T + 86_400_000 };
  const validation = { from: training.to, to: training.to + 86_400_000 };
  const samples = (a, b) =>
    pfSearchFamilyRows(
      family([
        ...[a, a, -0.01].map((r, i) =>
          tuple(r, training.from + i * 900_000, { side: i === 2 ? -1 : 1 }),
        ),
        ...[b, b, -0.01].map((r, i) =>
          tuple(r, validation.from + i * 900_000, { side: i === 2 ? -1 : 1 }),
        ),
      ]),
    );
  const units = [
    { name: "first on D1a", xs: samples(0.01, 0.0005) },
    { name: "better only on D1b", xs: samples(0.0075, 0.1) },
    {
      name: "unknown D1a loss",
      xs: samples(0.1, 0.1).map((row, i) => (i === 2 ? { ...row, r: NaN, unitR: null } : row)),
    },
  ];
  const result = scorePfSearchUnits(units, {
    training,
    validation,
    minTrades: 3,
    judge: { pf: 1.2, trades: 3, events: 3, blockShare: 2 / 3 },
  });
  assert.equal(result.minimumSample, 3);
  assert.equal(result.unavailable.length, 1);
  assert.equal(result.unavailable[0].nA, 3);
  assert.equal(result.unavailable[0].primaryA.unknownReturns, 1);
  assert.deepEqual(
    result.scored.map((x) => x.name),
    ["first on D1a", "better only on D1b"],
  );
  assert.equal(result.scored[0].judgeB.pass, false);
  assert.equal(result.scored[1].judgeB.pass, true);
  near(result.scored[0].pfA, 2);
  near(result.scored[1].judgeB.pf02, 20);
});
