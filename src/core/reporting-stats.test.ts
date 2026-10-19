import assert from "node:assert/strict";
import { test } from "node:test";
import { unitStatsOf } from "./metrics/stats.ts";
import { modeledReturnReport, primaryPfLabel, unitReturnReport } from "./reporting-stats.ts";

const trades = (returns: number[]) => returns.map((r, i) => ({ r, entryT: i + 1, exitT: i + 2 }));

test("unit reports retain every unknown losing close without changing the conservative engine primitive", () => {
  const xs = [trades([0.01])[0], { ...trades([-0.05])[0], unitR: null }];
  assert.equal(unitStatsOf(xs).n, 0, "engine primitive remains unchanged");
  const result = unitReturnReport(xs);
  assert.equal(result.n, 2); assert.equal(result.unknownReturns, 1);
  assert.equal(result.pfBasis, "unavailable"); assert.equal(result.noLoss, null);
  for (const key of ["pf", "net", "gp", "gl", "wr", "wins", "losses", "mdd", "ddt", "greenHours", "gh"] as const) assert.equal(result[key], null, key);
});

test("reported gross sums distinguish a no-loss score from measured PF four and an empty sample", () => {
  const noLoss = unitReturnReport(trades([0.01]));
  assert.equal(noLoss.pf, 4); assert.equal(noLoss.noLoss, true); assert.equal(noLoss.pfConvention, "no-loss-sentinel");
  const measured = unitReturnReport(trades([0.04, -0.01]));
  assert.equal(measured.pf, 4); assert.equal(measured.noLoss, false); assert.equal(measured.pfConvention, "gross-return-ratio");
  const empty = unitReturnReport([]); assert.equal(empty.n, 0); assert.equal(empty.pf, null); assert.equal(empty.noLoss, null); assert.equal(empty.pfBasis, "unavailable");
});

test("runtime PF labels keep empty, unknown and no-loss samples distinct", () => {
  assert.equal(primaryPfLabel(unitReturnReport([])), "unavailable");
  assert.equal(primaryPfLabel(modeledReturnReport(trades([0.01]))), "unavailable");
  assert.equal(primaryPfLabel(unitReturnReport(trades([0.01]))), "∞ (no loss; gate score 4.00)");
  assert.equal(primaryPfLabel(unitReturnReport(trades([0.04, -0.01]))), "4.00");
});

test("reporting removes modeled execution weighting once and honors explicit unit evidence", () => {
  const xs = [{ ...trades([0.0136])[0], mult: 1 }, { ...trades([-0.068])[0], mult: 6.8 }];
  assert.ok(Math.abs(unitReturnReport(xs).pf! - 1.36) < 1e-10);
  assert.equal(unitReturnReport([{ ...xs[0], unitR: 0.02, mult: 10 }]).gp, 2);
  assert.equal(xs[1].r, -0.068);
});

test("modeled reports require evidence without changing unweighted historical reports", () => {
  const raw = trades([0.02, -0.01]);
  assert.equal(unitReturnReport(raw).pf, 2);
  const legacy = modeledReturnReport(raw);
  assert.equal(legacy.pf, null);
  assert.equal(legacy.n, 2);
  assert.equal(legacy.unknownReturns, 2);
  assert.equal(legacy.pfConvention, "unavailable");
  assert.equal(modeledReturnReport(raw.map((t) => ({ ...t, mult: 1 }))).pf, 2);
  assert.equal(modeledReturnReport(raw.map((t) => ({ ...t, unitR: t.r }))).pf, 2);
});
