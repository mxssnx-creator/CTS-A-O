import { it } from "node:test";
import assert from "node:assert/strict";
import { frozenRangeEligibility } from "./core-range-study-report.mjs";
const fold = (id) => ({ fold: id, complete: true, funded: { pf: 1.2, unknownReturns: 0, uniqueSettledOnsets: 30 }, virtualQualified: { pf: 1.2, unknownReturns: 0 } });
it("selects only two complete predeclared folds with both finite primary PF axes and30 funded onsets", () => {
  assert.equal(frozenRangeEligibility([fold("a"), fold("b")]).eligible, true);
  const loss = fold("b"); loss.funded.pf = 0.8; loss.funded.cashPf = 3;
  assert.equal(frozenRangeEligibility([fold("a"), loss]).eligible, false);
  const sparse = fold("b"); sparse.funded.uniqueSettledOnsets = 29; sparse.funded.n = 100;
  assert.equal(frozenRangeEligibility([fold("a"), sparse]).eligible, false);
});
it("preserves no-loss/empty/unknown/incomplete folds as insufficient instead of substituting profitable PF", () => {
  for (const patch of [{ pf: null, noLoss: true }, { pf: null, n: 0 }, { unknownReturns: 1 }]) {
    const x = fold("b"); Object.assign(x.funded, patch);
    assert.equal(frozenRangeEligibility([fold("a"), x]).eligible, false);
  }
  const x = fold("b"); x.complete = false;
  assert.equal(frozenRangeEligibility([fold("a"), x]).eligible, false);
  assert.equal(frozenRangeEligibility([fold("a")]).eligible, false);
  assert.equal(frozenRangeEligibility([fold("a"), fold("a")]).eligible, false);
});
