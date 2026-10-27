import { test } from "node:test";
import assert from "node:assert/strict";
import { addRow, makeAnalysis, reconcile, results, stepOf } from "./low-range-fixed-path-cost.mjs";

const p = (tp, extra = {}) => ({ tp, lowRangeOnly: true, ...extra });
const row = (side, unitR, allocatedNotional = 1, sizedPnl = unitR) => ({ side, unitR, allocatedNotional, sizedPnl });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test("cost add-back preserves the selected long/short cohort, with no-TP kept separate", () => {
  const a = makeAnalysis(.0015);
  addRow(a, stepOf(p(.0055), .0015, .002), row(1, -.002, 2, -.004));
  addRow(a, stepOf(p(.0055), .0015, .002), row(-1, .003, 1, .003));
  addRow(a, stepOf(p(0, { trailOnly: true }), .0015, .002), row(-1, -.004, .5, -.002));
  addRow(a, "2", row(1, -.2, 0, 0));
  const r = results(a);
  assert.equal(r.zeroAllocated, 1); assert.equal(r.total.settled, 3);
  assert.equal(r.byStep["2"].long, 1); assert.equal(r.byStep["2"].short, 1);
  assert.equal(r.byStep.noTP.short, 1); assert.equal(r.byDirection.long.settled, 1); assert.equal(r.byDirection.short.settled, 2);
  near(r.byStep["2"].meanNetBp, 5); near(r.byStep["2"].meanGrossFrozenPathBp, 20);
  near(r.byStep.noTP.meanNetBp, -40); near(r.byStep.noTP.meanGrossFrozenPathBp, -25);
  near(r.total.meanNetBp, -10); near(r.total.meanGrossFrozenPathBp, 5);
  near(r.total.cash, -.003);
});

test("unknown funding and returns fail closed; known zero needs no fabricated return", () => {
  const a = makeAnalysis(.0015);
  assert.throws(() => addRow(a, "2", row(1, .01, null)));
  assert.throws(() => addRow(a, "2", row(0, .01)));
  assert.throws(() => addRow(a, "2", row(1, null)));
  assert.throws(() => addRow(a, "2", row(1, .01, 1, NaN)));
  addRow(a, "2", row(1, null, 0, null)); assert.equal(a.zeroAllocated, 1);
  assert.equal(results(a).total.netPf, null);
  addRow(a, "2", row(1, .01)); assert.equal(results(a).total.netPf, "no-loss");
  assert.throws(() => makeAnalysis(-.01));
});

test("step detection and independent summary reconciliation detect discrepancies", () => {
  for (let n = 2; n <= 6; n++) assert.equal(stepOf(p(.0015 + n * .002), .0015, .002), String(n));
  assert.throws(() => stepOf(p(.006), .0015, .002));
  assert.throws(() => stepOf({ tp: .0055 }, .0015, .002));
  const a = makeAnalysis(.0015); addRow(a, "3", row(-1, -.002));
  const detail = { status: "passed", zeroAllocated: 0, byStep: structuredClone(a.byStep) };
  reconcile(a, detail); detail.byStep["3"].short = 0;
  assert.throws(() => reconcile(a, detail));
});
