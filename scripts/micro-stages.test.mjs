import assert from "node:assert/strict";
import { it } from "node:test";
import { addValidation, cohortPf, emptyCohort } from "./audit-micro-stages.mjs";
it("stage PF includes only individually passing configs and the actual seated subset", () => {
  const checks = [["pass",1,30,2,6,3],["rejected-winner",0,100,9,90,10],["passed-but-unseated",1,20,1.5,3,2]];
  assert.equal(cohortPf(addValidation(emptyCohort(), checks)).pf, 9/5);
  assert.deepEqual(cohortPf(addValidation(emptyCohort(), checks, new Set(["pass", "rejected-winner"]))),
    { configs:1,closes:30,gp:6,gl:3,unknownReturns:0,pf:2,pfState:"measured" });
});
it("empty, missing evidence and the no-loss gate convention never become measured finite profitability", () => {
  assert.equal(cohortPf(emptyCohort()).pf, null);
  assert.equal(cohortPf({ ...emptyCohort(),closes:1,gp:1 }).pfState, "no-loss-gate-score-4");
  assert.equal(cohortPf({ ...emptyCohort(),closes:2,gp:1,gl:1,unknownReturns:1 }).pf, null);
});
