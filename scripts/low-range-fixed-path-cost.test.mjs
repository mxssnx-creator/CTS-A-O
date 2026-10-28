import { test } from "node:test";
import assert from "node:assert/strict";
import { addRow, CLOSE_REASONS, makeAnalysis, reconcile, results, stepOf } from "./low-range-fixed-path-cost.mjs";

const p = (tp, extra = {}) => ({ tp, lowRangeOnly: true, ...extra });
const row = (side, unitR, allocatedNotional = 1, sizedPnl = unitR,
  reason = unitR < 0 ? "sl" : "tp", kind = "normal", initialVerdict = "passed") =>
  ({ side, unitR, allocatedNotional, sizedPnl, reason, kind, initialVerdict });
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
  assert.equal(r.byCloseReason.sl.settled, 2);
  assert.equal(r.byCloseReason.tp.settled, 1);
  assert.equal(r.byStepCloseReason.noTP.sl.settled, 1);
});

test("settled close-reason diagnostics stay separate by reason, target step and direction", () => {
  const a = makeAnalysis(.0015);
  for (const [i, reason] of CLOSE_REASONS.entries())
    addRow(a, "2", row(i % 2 ? -1 : 1, i % 2 ? -.002 : .003, 1, i % 2 ? -.002 : .003, reason,
      ["normal", "trailing", "trailing-only", "normal"][i], i === 2 ? "failed" : "passed"));
  const r = results(a);
  assert.deepEqual(Object.fromEntries(CLOSE_REASONS.map(reason => [reason, r.byCloseReason[reason].settled])),
    { tp: 1, sl: 1, trail: 1, time: 1 });
  assert.equal(r.byStepCloseReason["2"].trail.settled, 1);
  assert.equal(r.byDirectionCloseReason.long.tp.settled, 1);
  assert.equal(r.byDirectionCloseReason.short.sl.settled, 1);
  assert.equal(r.byKind.normal.settled, 2);
  assert.equal(r.byKindCloseReason.trailing.sl.settled, 1);
  assert.equal(r.byKindCloseReason["trailing-only"].trail.settled, 1);
  assert.equal(r.byKindCloseReason.normal.time.settled, 1);
  assert.equal(r.byInitialVerdict.passed.settled, 3);
  assert.equal(r.byInitialVerdict.failed.settled, 1);
  assert.equal(r.byInitialVerdictCloseReason.failed.trail.settled, 1);
  assert.equal(r.total.settled, 4, "reason partitions reconcile to all funded settled orders");
});

test("unknown funding and returns fail closed; known zero needs no fabricated return", () => {
  const a = makeAnalysis(.0015);
  assert.throws(() => addRow(a, "2", row(1, .01, null)));
  assert.throws(() => addRow(a, "2", row(0, .01)));
  assert.throws(() => addRow(a, "2", row(1, null)));
  assert.throws(() => addRow(a, "2", row(1, .01, 1, NaN)));
  assert.throws(() => addRow(a, "2", row(1, .01, 1, .01, "external-exit")));
  assert.throws(() => addRow(a, "2", row(1, .01, 1, .01, "tp", "mystery")));
  assert.throws(() => addRow(a, "2", row(1, .01, 1, .01, "tp", "normal", "unknown")));
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
