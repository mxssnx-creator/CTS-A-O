import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareComparisonPf,
  comparisonAggregate,
  comparisonPfText,
  comparisonRunReport,
  comparisonStats,
  rankableComparison,
} from "./walkforward-comparison-report.mjs";

const H = 3_600_000;
const trade = (r, mult = 1, extra = {}) => ({ r, mult, entryT: 1, exitT: H, ...extra });
const run = (trades, openAtEnd = [], extra = {}) => ({
  startT: 0,
  endT: 2 * H,
  trades,
  openAtEnd,
  stable: false,
  ...extra,
});
const aggregate = (...runs) => {
  const reports = runs.map(comparisonRunReport);
  return comparisonAggregate(
    reports.flatMap((r) => r.trades),
    reports.map((r) => r.detail),
  );
};
const near = (got, expected) => assert.ok(Math.abs(got - expected) < 1e-10, `${got} ≠ ${expected}`);

test("comparison primary PF 1.36 and sized PF 0.20 retain the same settled closes", () => {
  const result = aggregate(run([trade(0.0136), trade(-0.068, 6.8)]));
  near(result.pf, 1.36);
  near(result.gp, 1.36);
  near(result.gl, 1);
  near(result.net, 0.36);
  near(result.sizedSimulation.pf, 0.2);
  near(result.sizedSimulation.net, -5.44);
  assert.equal(result.n, 2);
  assert.equal(result.sizedSimulation.n, 2);
  assert.equal(result.pfBasis, "unit-net-returns");
  assert.equal(result.sizedSimulation.pfBasis, "size-weighted-simulated-returns");
  assert.equal(result.positiveRuns, 1);
  assert.equal(result.detail[0].byKind.normal.pf, result.pf);
  assert.equal(result.noLoss, false);
  assert.equal(result.pfConvention, "gross-return-ratio");
});

test("ranking uses primary PF rather than the opposing sized result", () => {
  const primaryWinner = aggregate(run([trade(0.0136), trade(-0.068, 6.8)]));
  const sizedWinner = aggregate(run([trade(0.016, 2), trade(-0.01)]));
  near(sizedWinner.pf, 0.8);
  near(sizedWinner.sizedSimulation.pf, 1.6);
  assert.deepEqual([sizedWinner, primaryWinner].sort(compareComparisonPf), [
    primaryWinner,
    sizedWinner,
  ]);
});

test("unknown losing close remains in the full sample and cannot enter ranked results", () => {
  const unknown = aggregate(
    run([...Array.from({ length: 199 }, () => trade(0.01)), trade(-5, 0, { unitR: null })]),
  );
  assert.equal(unknown.n, 200);
  assert.equal(unknown.detail[0].n, 200);
  assert.equal(unknown.unknownReturns, 1);
  assert.equal(unknown.unavailableRuns, 1);
  assert.equal(unknown.pfBasis, "unavailable");
  for (const field of [
    "pf",
    "gp",
    "gl",
    "net",
    "gh",
    "mdd",
    "ddt",
    "noLoss",
    "exactRatio",
    "positiveRuns",
  ])
    assert.equal(unknown[field], null, field);
  assert.equal(unknown.sizedSimulation.n, 200);
  near(unknown.sizedSimulation.net, -301);
  assert.equal(rankableComparison(unknown, 200), false);
  assert.equal(comparisonPfText(unknown), "unit basis unavailable");
  const measured = { ...comparisonStats([trade(0.001), trade(-0.01)]), n: 200 };
  assert.deepEqual(
    [unknown, measured].sort(compareComparisonPf).filter((r) => rankableComparison(r, 200)),
    [measured],
  );
  assert.equal(JSON.parse(JSON.stringify(unknown)).pf, null);
});

test("a positive endpoint mark cannot turn a settled losing run positive", () => {
  const result = aggregate(
    run([trade(-0.01)], [trade(0.02, 1, { markedOpen: true, exitT: 2 * H })], {
      stable: true,
      stats: { n: 2, pf: 2, net: 1 },
    }),
  );
  assert.equal(result.n, 1);
  assert.equal(result.pf, 0);
  assert.equal(result.net, -1);
  assert.equal(result.positiveRuns, 0);
  assert.equal(result.detail[0].byKind.normal.net, -1);
  assert.equal(result.detail[0].endpointMarks.n, 1);
  assert.equal(result.detail[0].endpointMarks.net, 2);
  assert.equal(result.detail[0].withEndpointMarks.n, 2);
  assert.equal(result.detail[0].withEndpointMarks.net, 1);
  assert.equal(result.detail[0].withEndpointMarks.engineStable, true);
  assert.equal(result.withEndpointMarksStableRuns, 1);
  assert.equal(result.sizedSimulation.net, -1);
});

test("settled selection keeps end-boundary closes and excludes marks and out-of-window rows", () => {
  const kept = [trade(0.01), trade(-0.005, 1, { exitT: 2 * H })];
  const excluded = [
    trade(0.1, 1, { entryT: -1 }),
    trade(0.1, 1, { exitT: 0 }),
    trade(0.1, 1, { entryT: 2 * H, exitT: 2 * H }),
    trade(0.1, 1, { exitT: 2 * H + 1 }),
    trade(0.1, 1, { markedOpen: true }),
  ];
  const report = comparisonRunReport(run([...excluded, ...kept]));
  assert.deepEqual(report.trades, kept);
  assert.equal(report.detail.n, 2);
  near(report.detail.net, 0.5);
});

test("no-loss score 4 is distinct from a measured finite PF 4", () => {
  const noLoss = comparisonStats([trade(0.04)]);
  const measured = comparisonStats([trade(0.04), trade(-0.01)]);
  assert.equal(noLoss.pf, 4);
  assert.equal(measured.pf, 4);
  assert.equal(noLoss.noLoss, true);
  assert.equal(noLoss.exactRatio, null);
  assert.equal(noLoss.pfConvention, "no-loss-sentinel");
  assert.equal(comparisonPfText(noLoss), "No losses (score 4)");
  assert.equal(measured.noLoss, false);
  assert.equal(measured.exactRatio, 4);
  assert.equal(comparisonPfText(measured), "4.00");
  const empty = comparisonStats([]);
  assert.equal(comparisonPfText(empty), "–");
  assert.equal(rankableComparison(empty), false);
});

test("verified unit returns override weighted r without a second normalization", () => {
  const result = comparisonStats([
    trade(0.0136 * 6.8, 6.8, { unitR: 0.0136 }),
    trade(-0.01 * 6.8, 6.8, { unitR: -0.01 }),
  ]);
  near(result.pf, 1.36);
  near(result.net, 0.36);
});

test("one unavailable run makes the aggregate positive-run count unavailable", () => {
  const result = aggregate(run([trade(0.02)]), run([trade(-0.01, 0)]));
  assert.equal(result.n, 2);
  assert.equal(result.detail[0].noLoss, true);
  assert.equal(result.detail[1].unknownReturns, 1);
  assert.equal(result.unknownReturns, 1);
  assert.equal(result.positiveRuns, null);
  assert.equal(result.pf, null);
  assert.equal(result.sizedSimulation.net, 1);
});
