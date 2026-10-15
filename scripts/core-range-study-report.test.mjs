import { it } from "node:test";
import assert from "node:assert/strict";
import { frozenRangeEligibility, parseEvidenceCsv, portfolioEvidence } from "./core-range-study-report.mjs";
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
it("reads the complete quoted CSV evidence including escaped quotes and empty cohorts", () => {
  assert.deepEqual(parseEvidenceCsv('id,unitR,sizedPnl\r\n"a,b",0.02,2\r\n"c""d",-0.01,-1\r\n'), [
    { id: "a,b", unitR: "0.02", sizedPnl: "2" }, { id: 'c"d', unitR: "-0.01", sizedPnl: "-1" },
  ]);
  assert.deepEqual(parseEvidenceCsv("\n\n"), []);
  assert.throws(() => parseEvidenceCsv('id\n"unterminated'), /Unclosed/);
});
it("whole-book aggregation retains every range and loss with return PF separate from cash PF", () => {
  const rows = [{ id: "micro", sym: "A", side: "1", entryT: "1", unitR: "0.02", sizedPnl: "20", allocation: "positive" },
    { id: "minimal", sym: "B", side: "-1", entryT: "2", unitR: "-0.01", sizedPnl: "-2", allocation: "positive" }];
  const p = portfolioEvidence(rows, "funded");
  assert.equal(p.n, 2); assert.equal(p.pf, 2); assert.equal(p.cashPf, 10); assert.equal(p.usd, 18); assert.equal(p.uniqueSettledOnsets, 2);
  assert.equal(portfolioEvidence([], "funded").pf, null);
  assert.equal(portfolioEvidence(rows.slice(0, 1), "funded").noLoss, true);
  assert.equal(portfolioEvidence(rows.slice(0, 1), "funded").pf, null);
  const unknown = [...rows, { id: "short", sym: "C", side: "1", entryT: "3", unitR: "", sizedPnl: "", allocation: "unknown" }];
  const q = portfolioEvidence(unknown, "funded"); assert.equal(q.n, 3); assert.equal(q.unknownReturns, 1); assert.equal(q.pf, null); assert.equal(q.usd, null);
  assert.throws(() => portfolioEvidence([{ ...rows[0], allocation: "zero" }], "funded"), /zero allocation/);
});
