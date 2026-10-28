import test from "node:test";
import assert from "node:assert/strict";
import { RELATIONS, relationCatalog, relationOf, blankReturns, recordReturn, finishReturns } from "./low-range-relation-comparison.mjs";

const focus = [12, 24, 48].flatMap((n) => ["edge-turn", "failed-break", "breakout", "mid-reclaim", "compression-break"]
  .flatMap((m) => RELATIONS.map((r) => `follow|low-range-${n}-${m}-${r}`)));
test("exact catalog distinguishes method and nested relation names", () => {
  const c = relationCatalog(focus);
  assert.equal(relationOf("follow|low-range-24-breakout-trend-breakout-move-reverse@m5|tp0|sh", c), "trend-breakout-move-reverse");
  assert.equal(relationOf("follow|low-range-24-breakout-trend-move-reverse@m5|tp0|sh", c), "trend-move-reverse");
  assert.throws(() => relationOf("follow|low-range-24-breakout-move-reverse@m15|tp0|sh", c));
  assert.throws(() => relationOf("follow|low-range-24-breakout-unknown@m5|tp0|sh", c));
  assert.throws(() => relationCatalog([...focus.slice(1), focus[1]]));
});
test("funded returns retain losses; zero and unknown allocation remain distinct", () => {
  const a = blankReturns(), v = { side: 1, allocatedNotional: 1, unitR: 0.02, sizedPnl: 0.01 };
  assert.equal(recordReturn(a, v), true);
  assert.equal(recordReturn(a, { ...v, unitR: -0.01, sizedPnl: -0.005 }), true);
  assert.equal(recordReturn(a, { ...v, allocatedNotional: 0, unitR: -10 }), false);
  assert.equal(finishReturns(a).settled, 2);
  assert.equal(finishReturns(a).unitPf, 2);
  assert.throws(() => recordReturn(a, { ...v, allocatedNotional: NaN }));
  assert.throws(() => recordReturn(a, { ...v, side: 0 }));
  assert.equal(finishReturns(blankReturns()).unitPf, null);
  const b = blankReturns(); recordReturn(b, v); assert.equal(finishReturns(b).unitPf, "no-loss");
});
