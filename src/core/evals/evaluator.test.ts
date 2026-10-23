import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_GATES } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { evaluateConfig } from "./evaluator.ts";

const H = 3_600_000, NOW = Date.UTC(2026, 9, 17, 12);
const trade = (exitT: number, r: number): Trade => ({
  cfg: "fixture", sym: "A", side: 1, entryT: exitT - 60_000, exitT,
  entry: 100, exit: 100 * (1 + r), r, mult: 1,
  reason: r > 0 ? "tp" : "sl", bars: 1, mfe: 0, mae: 0,
});
test("every evaluation window and score stops at its requested clock, including Last-N", () => {
  const closed = Array.from({ length: 30 }, (_, i) => trade(NOW - (29 - i) * 60_000, 0.01));
  const future = Array.from({ length: 100 }, (_, i) => trade(NOW + (i + 1) * 60_000, -0.1));
  const options = { gates: DEFAULT_GATES, nowT: NOW, timeWindowsH: [1, 6, 72], tradeWindows: [5, 15] };
  const expected = evaluateConfig("fixture", closed, options);
  assert.equal(expected.windows.find(w => w.key === "1h")?.n, 30);
  assert.deepEqual(evaluateConfig("fixture", [...closed, ...future], options), expected);
  assert.equal(evaluateConfig("fixture", future, options).windows.every(w => w.n === 0 && !w.pass), true);
  assert.equal(evaluateConfig("fixture", future, options).score, 0);
  assert.equal(evaluateConfig("fixture", [...closed, ...future], { ...options, nowT: NOW + 2 * H }).success, false);
});
