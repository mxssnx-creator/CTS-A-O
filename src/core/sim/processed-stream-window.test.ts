import assert from "node:assert/strict";
import { test } from "node:test";
import { stressWindow } from "../../../scripts/perf/processed-stream-stress.ts";

test("stress studies reject market windows longer than the operator's three-day total limit", () => {
  for (const pair of [[24, 24], [48, 24], [1, 1]]) assert.doesNotThrow(() => stressWindow(...pair as [number, number]));
  for (const pair of [[48, 25], [72, 1], [0, 24], [24, NaN], [Infinity, 1]])
    assert.throws(() => stressWindow(...pair as [number, number]), /72 hours/);
});
