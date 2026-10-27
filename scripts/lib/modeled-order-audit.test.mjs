import assert from "node:assert/strict";
import { test } from "node:test";
import { auditModeledOrders } from "./modeled-order-audit.mjs";

const cfg = (name) => `follow|mc-${name}@m1|tp1|sl1|tr0|h60|mc`;
const row = (name, patch = {}) => ({ cfg: cfg(name), sym: "A", side: 1, entryT: 1, exitT: 3,
  entry: 100, exit: 101, r: .02, mult: 2, kind: "normal", ...patch });

test("independent same-onset configurations survive while a repeated order is counted as a duplicate", () => {
  const a = row("one"), b = row("two", { r: -.01 });
  const report = auditModeledOrders({ trades: [a, b, { ...a }], openEnd: [] });
  assert.equal(report.ok, false);
  assert.deepEqual(report.exactEntryDuplicates, { groups: 1, extraRows: 1 });
  assert.deepEqual(report.canonicalEntryCollisions, { groups: 1, extraRows: 1 });
  assert.deepEqual(report.exactClosedEventDuplicates, { groups: 1, extraRows: 1 });
  assert.equal(report.simultaneousOnsetGroups, 1);
  assert.equal(report.maxOrdersAtOneOnset, 3);
  assert.equal(report.uniqueConfigurations, 2);
  assert.equal(report.settledReturnPf, 4);
});

test("a missing return basis is unavailable and an endpoint holding remains an open order", () => {
  const a = row("one", { mult: undefined });
  const open = { ...row("two"), entryT: 2 };
  delete open.exitT;
  const report = auditModeledOrders({ trades: [a], openEnd: [open] });
  assert.equal(report.unknownSettledReturns, 1);
  assert.equal(report.settledReturnPf, null);
  assert.equal(report.noLoss, false);
  assert.equal(report.ok, false);
  assert.equal(report.counts.openedOrders, 2);
  assert.equal(report.counts.settledOrders, 1);
  assert.equal(report.counts.openOrders, 1);
  assert.equal(report.counts.openPositions, 1);
});

test("a malformed identity cannot produce a certified count or profit factor", () => {
  const report = auditModeledOrders({ trades: [row("one", { side: 0 })], openEnd: [] });
  assert.equal(report.invalidRecords, 1);
  assert.equal(report.counts, null);
  assert.equal(report.ok, false);
  assert.equal(report.settledReturnPf, null);
  assert.throws(() => auditModeledOrders({ trades: [] }), /openEnd/);
});
