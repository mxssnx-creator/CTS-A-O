import assert from "node:assert/strict";
import { test } from "node:test";
import { configStrategyLabel, indicationKindLabel, indicationOptionLabel, includeRelateInFocus, includeTacticInFocus, relateFocusCoverage, tacticFocusCoverage } from "./indication-ui.ts";

test("the registered Tactic kind has its named UI label without changing other identities", () => {
  assert.equal(indicationKindLabel("tactic"), "Tactic");
  assert.equal(indicationKindLabel("relate"), "Relate");
  assert.equal(indicationKindLabel("rsi"), "rsi");
  assert.equal(indicationOptionLabel({ kind: "tactic", label: "Tactic · Trend · Short" }), "Tactic · Trend · Short");
  assert.equal(indicationOptionLabel({ kind: "rsi", label: "RSI momentum" }), "rsi · RSI momentum");
});

test("Signal configs show each actual strategy type in simulation and paper", () => {
  for (const source of ["sim", "paper"])
    for (const kind of ["Normal", "Trailing", "Trailing only", "DCA", "DCA Active", "Axis"])
      assert.equal(configStrategyLabel({ type: "Signals", kind }, source), `Signals · ${kind}`);
  assert.equal(configStrategyLabel({ type: "Trailing", kind: "Trailing" }, "sim"), "Trailing");
});

test("live aggregate rows never turn a guessed strategy into an executed type", () => {
  assert.equal(configStrategyLabel({ type: "Signals", kind: "Normal" }, "live"), "Signals · type unavailable");
  assert.equal(configStrategyLabel({ type: "Normal", kind: "Normal" }, "live"), "Type unavailable");
  assert.equal(configStrategyLabel({ type: "Signals" }, "paper"), "Signals · type unavailable");
});

const tacticIds = ["trend", "pullback", "mean-reversion", "breakout", "adaptive"].flatMap((method) => ["s", "m"].map((range) => `tactic-${method}-${range}`));
const relateIds = ["relate-1-trend-guarded", "relate-mc-5x15-adaptive-balanced"];

test("including Tactic merges all ten bases without replacing custom Focus, and is idempotent", () => {
  const original = ["revert|rsi-mom-14-20", "follow|tactic-trend-s@m15"];
  const included = includeTacticInFocus(original, tacticIds);
  assert.deepEqual(included.slice(0, original.length), original);
  for (const id of tacticIds) assert.ok(included.includes(`follow|${id}`));
  assert.equal(included.length, original.length + 10);
  assert.deepEqual(includeTacticInFocus(included, tacticIds), included);
  assert.deepEqual(original, ["revert|rsi-mom-14-20", "follow|tactic-trend-s@m15"]);
});

test("empty Focus keeps its all-indications meaning and coverage distinguishes lane-specific pairs", () => {
  assert.deepEqual(includeTacticInFocus([], tacticIds), []);
  assert.deepEqual(tacticFocusCoverage([], tacticIds), { all: true, covered: 10, full: 10, total: 10 });
  assert.deepEqual(tacticFocusCoverage(["revert|rsi-mom-14-20"], tacticIds), { all: false, covered: 0, full: 0, total: 10 });
  assert.deepEqual(tacticFocusCoverage(["follow|tactic-trend-s@m15"], tacticIds), { all: false, covered: 1, full: 0, total: 10 });
  assert.deepEqual(tacticFocusCoverage(["revert|tactic-trend-s@m15"], tacticIds), { all: false, covered: 1, full: 0, total: 10 });
  assert.deepEqual(tacticFocusCoverage(["revert|rsi-mom-14-20"], tacticIds, ["follow|tactic-trend-s"]), { all: false, covered: 1, full: 1, total: 10 });
  assert.deepEqual(tacticFocusCoverage(["follow|tactic-trend-s"], tacticIds), { all: false, covered: 1, full: 1, total: 10 });
});

test("Relate focus includes its exact IDs additively and reports lane coverage", () => {
  const original = ["revert|rsi-mom-14-20"];
  const included = includeRelateInFocus(original, relateIds);
  assert.deepEqual(included, [...original, "follow|relate-1-trend-guarded", "follow|relate-mc-5x15-adaptive-balanced"]);
  assert.deepEqual(includeRelateInFocus(included, relateIds), included);
  assert.deepEqual(includeRelateInFocus([], relateIds), []);
  assert.deepEqual(relateFocusCoverage([], relateIds), { all: true, covered: 2, full: 2, total: 2 });
  assert.deepEqual(relateFocusCoverage(["follow|relate-1-trend-guarded@m1"], relateIds), { all: false, covered: 1, full: 0, total: 2 });
});
