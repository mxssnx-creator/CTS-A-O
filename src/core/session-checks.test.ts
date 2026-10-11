// The session's execution check (session-checks.ts): a family passes only when every candidate was refused by a named
// gate. The refusal record alone (the earlier rule) let a family pass with candidates that were never refused.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executionCheck, memoryCheck, signalBaseGates, signalPairPassesBase, signalPairPassesBase as passesSignalBase } from "./session-checks.ts";
import { passesBase } from "./pipeline/pipeline.ts";

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

describe("memory check: a run without a memory record fails (10 Oct)", () => {
  it("a run that recorded the full level passes", () => {
    assert.equal(memoryCheck({ computeLevel: 0, fallback: 0 }).ok, true);
    assert.equal(memoryCheck({ fallback: 0 }).ok, true, "the fallback stands in when no compute level is recorded");
  });

  it("a memory fallback fails, and so does a run with no memory record at all", () => {
    assert.equal(memoryCheck({ computeLevel: 2 }).ok, false, "a lighter level is a fallback");
    const none = memoryCheck(null);
    assert.equal(none.ok, false, "no record: cannot show the level");
    assert.equal(none.level, null);
    assert.equal(memoryCheck(undefined).ok, false);
  });
});

describe("signal pairs pass Base by one rule (10 Oct)", () => {
  it("with the signal Base gate off (the default) every pair passes, gate or not", () => {
    assert.equal(signalPairPassesBase(false, false), true);
    assert.equal(signalPairPassesBase(false, true), true);
  });

  it("with the gate on a pair passes only when it passes the sets gates", () => {
    assert.equal(signalPairPassesBase(true, false), false);
    assert.equal(signalPairPassesBase(true, true), true);
    assert.equal(signalPairPassesBase(undefined, false), false, "unset is the gate on");
  });
});

// Signals: the Base stage gate for signal pairs (10 Oct, plan T1). With the gate on, a pair's pooled Base record must clear
// signals.baseMinPf (in place of the engine sets floor) with the sets' sample and drawdown rules.
describe("the signal Base gate uses the signal minimum PF when it is on (10 Oct, T1)", () => {
  const setsGates = { minPf: 1, minTrades: 12, maxDdr: 1 };
  const rec = (pf: number, n = 20, net = 1, mdd = 0.1) => ({ n, pf, net, mdd });
  it("with baseMinPf 1.6 a pair at PF 1.5 is refused and one at PF 1.6 passes", () => {
    const g = signalBaseGates(1.6, setsGates);
    assert.equal(g.minPf, 1.6, "the signal minimum replaces the sets floor");
    assert.equal(passesSignalBase(true, passesBase(rec(1.5), g)), false, "PF 1.5 is refused at 1.6");
    assert.equal(passesSignalBase(true, passesBase(rec(1.6), g)), true, "PF 1.6 passes at 1.6");
  });
  it("with baseMinPf 1.3 a pair at PF 1.5 passes; the sample and drawdown rules are unchanged", () => {
    const g = signalBaseGates(1.3, setsGates);
    assert.equal(passesSignalBase(true, passesBase(rec(1.5), g)), true);
    assert.equal(passesSignalBase(true, passesBase(rec(1.5, 11), g)), false, "11 closes are below the 12-close sample");
    assert.equal(passesSignalBase(true, passesBase(rec(1.5, 20, 1, 2), g)), false, "a drawdown ratio above 1 is refused");
  });
  it("with the gate off every pair passes, whatever its record", () => {
    const g = signalBaseGates(1.6, setsGates);
    assert.equal(passesSignalBase(false, passesBase(rec(0.5), g)), true);
  });
});
