import { test } from "node:test";
import assert from "node:assert/strict";
import { RANGE_GATE, rangeGateLastN, rangeGateOf } from "./minimal-coord.ts";

test("Minimal (mn) gates on its own 20-close window; other gated ranges keep the shared 75", () => {
  const g = rangeGateOf({ rangeGate: { ...RANGE_GATE } });
  assert.ok(g);
  assert.equal(rangeGateLastN(g, "mn"), 20);
  assert.equal(rangeGateLastN(g, "mc"), 75);
  assert.equal(rangeGateLastN(g, "sh"), 75);
  assert.equal(rangeGateLastN(g, "mp"), 75);
  assert.equal(rangeGateLastN(g, undefined), 75);
});

test("a per-tag window never goes below 20, and the shared window keeps its 50 floor", () => {
  const g = rangeGateOf({ rangeGate: { enabled: true, lastN: 10, minPf: 1.35, lastNByTag: { mn: 5, sh: 30 } } });
  assert.ok(g);
  assert.equal(g.lastN, 50);
  assert.equal(rangeGateLastN(g, "mn"), 20);
  assert.equal(rangeGateLastN(g, "sh"), 30);
});

test("range gate off returns null", () => {
  assert.equal(rangeGateOf({ rangeGate: { enabled: false, lastN: 75, minPf: 1.35 } }), null);
});
