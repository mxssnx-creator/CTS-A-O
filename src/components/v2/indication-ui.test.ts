import assert from "node:assert/strict";
import { test } from "node:test";
import { configStrategyLabel, indicationKindLabel, indicationOptionLabel } from "./indication-ui.ts";

test("the registered Tactic kind has its named UI label without changing other identities", () => {
  assert.equal(indicationKindLabel("tactic"), "Tactic");
  assert.equal(indicationKindLabel("rsi"), "rsi");
  assert.equal(indicationOptionLabel({ kind: "tactic", label: "Tactic · Trend · Short" }), "Tactic · Trend · Short");
  assert.equal(indicationOptionLabel({ kind: "rsi", label: "RSI momentum" }), "rsi · RSI momentum");
});

test("Signal configs show each actual strategy type in simulation and paper", () => {
  for (const source of ["sim", "paper"])
    for (const kind of ["Normal", "Trailing", "DCA", "DCA Active", "Axis"])
      assert.equal(configStrategyLabel({ type: "Signals", kind }, source), `Signals · ${kind}`);
  assert.equal(configStrategyLabel({ type: "Trailing", kind: "Trailing" }, "sim"), "Trailing");
});

test("live aggregate rows never turn a guessed strategy into an executed type", () => {
  assert.equal(configStrategyLabel({ type: "Signals", kind: "Normal" }, "live"), "Signals · type unavailable");
  assert.equal(configStrategyLabel({ type: "Normal", kind: "Normal" }, "live"), "Type unavailable");
  assert.equal(configStrategyLabel({ type: "Signals" }, "paper"), "Signals · type unavailable");
});
