import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STEP_PF, protectSlRatio, stepPfFloor } from "./step-pf.ts";
import { checkSettings } from "./settings-check.ts";
it("manual step PF matches CTS-G percent units, flooring, cap and stricter settings", () => {
  for (const [pct, expected] of [[.2,1.04],[.25,1.04],[.3,1.06],[3.2,1.64],[3.5,1.7],[9,1.7]])
    assert.equal(stepPfFloor(1,pct,DEFAULT_STEP_PF),expected);
  assert.equal(stepPfFloor(1,3.2,{...DEFAULT_STEP_PF,max:1.15}),1.15);
  assert.equal(stepPfFloor(1.5,.2,DEFAULT_STEP_PF),1.5);
  assert.equal(stepPfFloor(1.25,NaN,DEFAULT_STEP_PF),1.25);
  assert.equal(stepPfFloor(1.25,2,{...DEFAULT_STEP_PF,enabled:false}),1.25);
});


it("exact step and SL floors are independent and preserve stricter range policy", () => {
 const r={...DEFAULT_STEP_PF,byStep:{"2":1.08,"3":1.12},bySlRatio:{"0.5":1.15,"1":1.3}};
 assert.equal(stepPfFloor(1.01,.2,r,.5),1.15);
 assert.equal(stepPfFloor(1.01,.3,r,1),1.3);
 assert.equal(stepPfFloor(1.6,.2,r,.5),1.6);
 assert.equal(stepPfFloor(1.01,.4,r,.75),1.08);
 assert.throws(()=>stepPfFloor(1.01,.2,{...r,byStep:{"2":NaN}},.5));
});

it("rejects ambiguous numeric override aliases and malformed settings before they can qualify", () => {
  const stepMaps: Record<string, number>[] = [{ "2": 1.1, "02": 1.9 }, { "2.0": 1.9, "2": 1.1 }, { "-1": 1.2 }, { "1.5": 1.2 }];
  for (const map of stepMaps) {
    const rules = { ...DEFAULT_STEP_PF, byStep: map };
    assert.throws(() => stepPfFloor(1.05, .2, rules), /Invalid step\/SL PF policy/);
    assert.throws(() => checkSettings({ gates: { stepPf: rules } }), /Invalid step\/SL PF policy/);
  }
  const slMaps: Record<string, number>[] = [{ "0.5": 1.1, ".50": 1.9 }, { "0": 1.1 }, { "0.5": NaN }];
  for (const bySlRatio of slMaps)
    assert.throws(() => checkSettings({ gates: { stepPf: { ...DEFAULT_STEP_PF, bySlRatio } } }), /Invalid step\/SL PF policy/);
  assert.doesNotThrow(() => checkSettings({ gates: { stepPf: { ...DEFAULT_STEP_PF, byStep: { "02": 1.3 }, bySlRatio: { ".50": 1.4 } } } }));
});

it("derives SL ratio from the configured distances and never invents a TP for trailing-only", () => {
  assert.equal(protectSlRatio({ tp: .004, sl: .003 }), .75);
  assert.equal(protectSlRatio({ tp: 0, sl: .003 }), undefined);
  assert.equal(protectSlRatio({ tp: NaN, sl: .003 }), undefined);
});
