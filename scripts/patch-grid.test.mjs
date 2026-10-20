import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeGridPatch, patchSettings } from "./lib/patch-grid.mjs";

const cur = { holdH: [16, 24], micro: { tp: [0.002], minSlNet: 0.002, ownInds: true }, minimal: { tp: [0.01], minSl: 0.005 }, short: false };

test("a range in a patch is merged over the current range, the rest of the grid is kept", () => {
  const g = mergeGridPatch(cur, { micro: { maxHoldMin: 15 } });
  assert.deepEqual(g.micro, { tp: [0.002], minSlNet: 0.002, ownInds: true, maxHoldMin: 15 });
  assert.deepEqual(g.minimal, cur.minimal);
  assert.deepEqual(g.holdH, [16, 24]);
  assert.equal(g.short, false);
});

test("a patch value wins; a range switched off or on stays what the patch says", () => {
  assert.equal(mergeGridPatch(cur, { micro: false }).micro, false);
  assert.deepEqual(mergeGridPatch(cur, { short: { tp: [0.02] } }).short, { tp: [0.02] }, "no current range to merge into");
  assert.deepEqual(mergeGridPatch(cur, { holdH: [8] }).holdH, [8]);
  assert.equal(mergeGridPatch(cur, { micro: { minSlNet: 0.003 } }).micro.minSlNet, 0.003);
});

test("settings without a grid pass through; the current grid is not mutated", () => {
  const s = { signals: { enabled: true } };
  assert.equal(patchSettings(s, cur), s);
  const before = JSON.stringify(cur);
  patchSettings({ grid: { micro: { maxHoldMin: 15 } } }, cur);
  assert.equal(JSON.stringify(cur), before);
});
