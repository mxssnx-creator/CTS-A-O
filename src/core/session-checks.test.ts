// The session's execution check (session-checks.ts): a family passes only when every candidate was refused by a named
// gate. The refusal record alone (the earlier rule) let a family pass with candidates that were never refused.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executionCheck } from "./session-checks.ts";

describe("session execution check", () => {
  it("a family that executed an order passes, with no named refusal", () => {
    const r = executionCheck("range gn", 3, { lastN: 9 }, 12);
    assert.equal(r.ok, true);
    assert.equal(r.named, false);
  });

  it("a family with no executed order passes when every candidate was refused by a named gate", () => {
    const r = executionCheck("strategy type axis", 0, { engineSide: 5, lastN: 2 }, 7);
    assert.equal(r.ok, true);
    assert.equal(r.named, true);
    assert.match(r.name, /every one of 7 candidates refused by a named gate \(engineSide 5 · lastN 2\)/);
  });

  it("a family with a candidate that was never refused by a gate fails (the earlier rule passed it)", () => {
    const r = executionCheck("signals", 0, { lastN: 5 }, 7);
    assert.equal(r.ok, false);
    assert.equal(r.named, false);
  });

  it("a family with no candidates at all fails, and so does one with no refusal record", () => {
    assert.equal(executionCheck("range mc", 0, {}, 0).ok, false);
    assert.equal(executionCheck("range mc", 0, null, 4).ok, false);
  });

  it("a dump without candidate counts (an earlier run) cannot pass a family with no executed order", () => {
    assert.equal(executionCheck("sig", 0, { lastN: 3 }, undefined).ok, false);
  });
});
