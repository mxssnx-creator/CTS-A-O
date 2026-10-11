// The signal Base gate in the walk-forward (10 Oct, W1): a signal pair that fails the Base stage is removed before any
// decision. Each removed pair is one candidate refused by the named gate "signalBase", so a run where the gate removes
// every pair reads as named refusals (not as an empty family) in the execution check.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signalBaseGate } from "./walkforward.ts";

const grp = (pair: string): { pair: string } => ({ pair });

describe("the signal Base gate removes pairs and counts them as named refusals (10 Oct, W1)", () => {
  it("keeps the passed pairs and counts the removed ones", () => {
    const groups = [grp("p1"), grp("p2"), grp("p3")];
    const r = signalBaseGate(groups, new Set(["p2"]));
    assert.deepEqual(r.kept.map((g) => g.pair), ["p2"]);
    assert.equal(r.gated, 2);
  });

  it("when no pair passes, nothing is kept and every pair is counted as gated", () => {
    const r = signalBaseGate([grp("p1"), grp("p2")], new Set<string>());
    assert.equal(r.kept.length, 0);
    assert.equal(r.gated, 2);
  });

  it("with every pair passing, nothing is gated", () => {
    const r = signalBaseGate([grp("p1")], new Set(["p1"]));
    assert.equal(r.gated, 0);
  });
});
