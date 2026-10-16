import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  modeledUnitReturn,
  modeledUnitStatsOf,
  statsOf,
  unitReturn,
  unitStatsOf,
} from "./stats.ts";

describe("explicit unit return accounting", () => {
  const rows = [
    { r: 0.016, mult: 2, entryT: 1, exitT: 2 },
    { r: -0.01, mult: 1, entryT: 3, exitT: 4 },
  ];
  it("keeps sized diagnostics while primary PF uses each order's unit net return", () => {
    const original = structuredClone(rows);
    assert.equal(statsOf(rows).pf, 1.6);
    const primary = unitStatsOf(rows);
    assert.equal(primary.pf, 0.8);
    assert.equal(primary.pfBasis, "unit-net-returns");
    assert.ok(Math.abs(primary.net + 0.2) < 1e-12);
    assert.deepEqual(rows, original);
    assert.equal(
      rows.reduce((n, r) => n + r.r * 100, 0),
      0.6000000000000001,
      "cash arithmetic remains sized",
    );
  });
  it("uses verified persisted unit returns and explicitly rejects legacy unknowns", () => {
    assert.equal(unitReturn({ r: 100, mult: 50, unitR: -0.01 }), -0.01);
    assert.ok(Number.isNaN(unitReturn({ r: 1, unitR: null })));
    const unknown = unitStatsOf([...rows, { r: -1, unitR: null, entryT: 5, exitT: 6 }]);
    assert.equal(unknown.pfBasis, "unavailable");
    assert.equal(unknown.unknownReturns, 1);
    assert.equal(unknown.n, 0, "the good subset is not presented as the whole sample");
  });
  it("does not invent normalization for invalid multipliers and retains ordinary unweighted records", () => {
    assert.equal(unitReturn({ r: 0.02 }), 0.02);
    for (const mult of [0, -1, NaN, Infinity])
      assert.ok(Number.isNaN(unitReturn({ r: 0.01, mult })));
    assert.ok(Number.isNaN(unitReturn({ r: NaN, mult: 1 })));
    assert.equal(unitStatsOf([]).pfBasis, "unit-net-returns");
  });
  it("requires explicit modeled provenance while ordinary unweighted historical returns remain valid", () => {
    const legacy = [
      { r: 0.02, entryT: 1, exitT: 2 },
      { r: -0.01, entryT: 3, exitT: 4 },
    ];
    assert.equal(unitStatsOf(legacy).pf, 2);
    assert.ok(Number.isNaN(modeledUnitReturn(legacy[0])));
    const primary = modeledUnitStatsOf(legacy);
    assert.equal(primary.pfBasis, "unavailable");
    assert.equal(primary.unknownReturns, 2);
    assert.equal(primary.n, 0, "no known subset is substituted for the modeled sample");
  });
  it("accepts verified modeled unit returns or explicit multipliers and preserves sized outcomes", () => {
    const original = structuredClone(rows);
    assert.equal(modeledUnitStatsOf(rows).pf, 0.8);
    assert.equal(modeledUnitReturn({ r: 0.02, mult: 1 }), 0.02);
    assert.equal(modeledUnitReturn({ r: NaN, unitR: -0.01 }), -0.01);
    assert.equal(modeledUnitReturn({ r: 100, mult: 50, unitR: -0.01 }), -0.01);
    assert.deepEqual(rows, original);
  });
  it("cannot repair explicit unknown or invalid modeled provenance from another field", () => {
    for (const mult of [undefined, 0, -1, NaN, Infinity, Number.MIN_VALUE])
      assert.ok(Number.isNaN(modeledUnitReturn({ r: 1, mult })), String(mult));
    for (const unitR of [null, NaN, Infinity])
      assert.ok(Number.isNaN(modeledUnitReturn({ r: 0.02, mult: 1, unitR })), String(unitR));
    const unknown = modeledUnitStatsOf([...rows, { r: -1, entryT: 5, exitT: 6 }]);
    assert.equal(unknown.pfBasis, "unavailable");
    assert.equal(unknown.unknownReturns, 1);
    assert.equal(unknown.n, 0);
  });
  it("withholds overflowing totals and PF quotients without inventing unknown individual returns", () => {
    for (const values of [[1e308, 1e308, -1], [1, -Number.MIN_VALUE], [1e307]]) {
      const trades = values.map((r, i) => ({ r, mult: 1, entryT: i, exitT: i + 1 }));
      const original = structuredClone(trades);
      for (const calculate of [unitStatsOf, modeledUnitStatsOf]) {
        const stats = calculate(trades);
        assert.equal(stats.pfBasis, "unavailable");
        assert.equal(stats.unknownReturns, 0, "each individual return is finite");
        assert.equal(stats.unknownReturnTotals, 1);
        assert.equal(stats.pf, 0, "an unavailable sample cannot pass a positive PF gate");
        assert.equal(stats.n, 0, "no known subset replaces the overflowing sample");
        assert.ok(
          Object.values(stats)
            .filter((x) => typeof x === "number")
            .every(Number.isFinite),
        );
      }
      assert.deepEqual(trades, original, "raw sized outcomes remain unchanged");
    }
    const finite = modeledUnitStatsOf([
      { r: 1, mult: 1, entryT: 0, exitT: 1 },
      { r: -1e-100, mult: 1, entryT: 1, exitT: 2 },
    ]);
    assert.equal(finite.pfBasis, "unit-net-returns");
    assert.equal(finite.pf, 1e100, "large representable ratios remain measured");
    assert.equal(finite.unknownReturnTotals, undefined);
  });
});
