import assert from "node:assert/strict";
import { test } from "node:test";
import { breakFocusCoverage, configStrategyLabel, indicationFocusCoverage, indicationKindLabel, indicationOptionLabel, includeBreakInFocus, includeRelateInFocus, includeTacticInFocus, relateFocusCoverage, tacticFocusCoverage } from "./indication-ui.ts";

test("registered first-class indication kinds have named UI labels without changing other identities", () => {
  assert.equal(indicationKindLabel("tactic"), "Tactic");
  assert.equal(indicationKindLabel("inverse"), "Inverse");
  assert.equal(indicationKindLabel("signal-coordination"), "Signals Coordination");
  assert.equal(indicationKindLabel("relate"), "Relate");
  assert.equal(indicationKindLabel("break"), "Break");
  assert.equal(indicationKindLabel("rsi"), "rsi");
  assert.equal(indicationOptionLabel({ kind: "tactic", label: "Tactic · Trend · Short" }), "Tactic · Trend · Short");
  assert.equal(indicationOptionLabel({ kind: "break", label: "Break · Donchian · 5m trend · 24bar DD" }), "Break · Donchian · 5m trend · 24bar DD");
  assert.equal(indicationOptionLabel({ kind: "rsi", label: "RSI momentum" }), "rsi · RSI momentum");
});

test("Signal configs show each actual strategy type in simulation and paper", () => {
  for (const source of ["sim", "paper"])
    for (const kind of ["Normal", "Trailing", "Trailing only", "DCA", "DCA Active", "Axis"])
      assert.equal(configStrategyLabel({ type: "Signals", kind }, source), `Signals · ${kind}`);
  for (const source of ["sim", "paper"])
    assert.equal(configStrategyLabel({ type: "Signals Coordination", kind: "Trailing" }, source), "Signals Coordination · Trailing");
  assert.equal(configStrategyLabel({ type: "Trailing", kind: "Trailing" }, "sim"), "Trailing");
});

test("live aggregate rows never turn a guessed strategy into an executed type", () => {
  assert.equal(configStrategyLabel({ type: "Signals", kind: "Normal" }, "live"), "Signals · type unavailable");
  assert.equal(configStrategyLabel({ type: "Signals Coordination", kind: "Normal" }, "live"), "Signals Coordination · type unavailable");
  assert.equal(configStrategyLabel({ type: "Normal", kind: "Normal" }, "live"), "Type unavailable");
  assert.equal(configStrategyLabel({ type: "Signals" }, "paper"), "Signals · type unavailable");
});

const tacticIds = ["trend", "pullback", "mean-reversion", "breakout", "adaptive"].flatMap((method) => ["s", "m"].map((range) => `tactic-${method}-${range}`));
const relateIds = ["relate-1-trend-guarded", "relate-mc-5x15-adaptive-balanced"];
const breakIds = ["break-rel-don-5-dd24-guarded", "break-mc-rel-retest-15-dd48-balanced"];

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

test("focus coverage preserves exact and lane-prefix matches across a large inventory", () => {
  const ids = [...Array.from({ length: 200 }, (_, i) => `method-${i}`), "method-1@m5", "missing"];
  const focus = [...Array.from({ length: 900 }, (_, i) => `follow|unrelated-${i}@m5`),
    "revert|method-1@m5@m15", "follow|method-20", "malformed"];
  const pinned = ["follow|method-3@m15", "revert|method-2@m5"];
  const expected = ids.filter((id) => [...focus, ...pinned].some((pair) => {
    const ind = pair.split("|")[1];
    return ind === id || ind?.startsWith(`${id}@m`);
  })).length;
  assert.deepEqual(indicationFocusCoverage(focus, ids, pinned),
    { all: false, covered: expected, full: 1, total: ids.length });
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

test("Break focus includes its exact IDs additively and reports anchor-lane coverage", () => {
  const original = ["revert|rsi-mom-14-20"];
  const included = includeBreakInFocus(original, breakIds);
  assert.deepEqual(included, [...original, "follow|break-rel-don-5-dd24-guarded", "follow|break-mc-rel-retest-15-dd48-balanced"]);
  assert.deepEqual(includeBreakInFocus(included, breakIds), included);
  assert.deepEqual(includeBreakInFocus([], breakIds), []);
  assert.deepEqual(breakFocusCoverage([], breakIds), { all: true, covered: 2, full: 2, total: 2 });
  assert.deepEqual(breakFocusCoverage(["follow|break-rel-don-5-dd24-guarded@m5"], breakIds), { all: false, covered: 1, full: 0, total: 2 });
});
