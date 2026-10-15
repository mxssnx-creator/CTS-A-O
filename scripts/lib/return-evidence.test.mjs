import { test } from "node:test";
import assert from "node:assert/strict";
import { returnBucket, addReturnEvidence, finishReturnEvidence, returnEvidenceText, mergeReturnEvidence } from "./return-evidence.mjs";

test("unit return PF and sized P&L remain independent", () => {
  const b = returnBucket();
  addReturnEvidence(b, 0.0136, 1.36);
  addReturnEvidence(b, -0.01, -6.8);
  const x = finishReturnEvidence(b);
  assert.ok(Math.abs(x.pf - 1.36) < 1e-12);
  assert.equal(x.usd, 1.36 - 6.8);
  assert.equal(x.pfBasis, "unit-net-returns");
  assert.equal(returnEvidenceText(x), "1.36");
});
test("unknown legacy loss cannot disappear behind a known winner", () => {
  const b = returnBucket();
  addReturnEvidence(b, 0.01, 1);
  addReturnEvidence(b, null, -5);
  const x = finishReturnEvidence(b);
  assert.equal(x.n, 2);
  assert.equal(x.unknownReturns, 1);
  assert.equal(x.pf, null);
  assert.equal(x.returnGp, null);
  assert.equal(x.returnGl, null);
  assert.equal(x.gp, null);
  assert.equal(x.gl, null);
  assert.equal(x.usd, -4);
  assert.equal(x.noLoss, false);
  assert.equal(returnEvidenceText(x), "unit basis unavailable");
});
test("No losses differs from measured PF4 and an empty sample", () => {
  const b = returnBucket(); addReturnEvidence(b, 0.04);
  const won = finishReturnEvidence(b);
  assert.equal(won.pf, 4);
  assert.equal(returnEvidenceText(won), "No losses");
  addReturnEvidence(b, -0.01);
  const mixed = finishReturnEvidence(b);
  assert.equal(mixed.pf, 4);
  assert.equal(returnEvidenceText(mixed), "4.00");
  assert.equal(returnEvidenceText(finishReturnEvidence(returnBucket())), "–");
});

test("merging finalized groups keeps unknown returns unavailable instead of treating null as zero", () => {
  const won = returnBucket(); addReturnEvidence(won, 0.02, 2);
  const unknown = returnBucket(); addReturnEvidence(unknown, null, -5);
  const total = mergeReturnEvidence([finishReturnEvidence(won), finishReturnEvidence(unknown)]);
  assert.equal(total.n, 2);
  assert.equal(total.usd, -3);
  assert.equal(total.pf, null);
  assert.equal(total.unknownReturns, 1);
  assert.equal(returnEvidenceText(total), "unit basis unavailable");
  const lost = returnBucket(); addReturnEvidence(lost, -0.01, -1);
  const known = mergeReturnEvidence([finishReturnEvidence(won), finishReturnEvidence(lost)]);
  assert.equal(known.pf, 2);
  assert.equal(returnEvidenceText(known), "2.00");
});
