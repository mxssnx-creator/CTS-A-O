import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { basePairRows } from "./pipeline.ts";

const pair = "follow|ema-21-55@m15";
// The representative can lose while a range cell independently passes Base; tags carry that decision.
const runs = [{ bot: "follow", ind: "ema-21-55@m15", full: { n: 20, pf: 0.8, net: -1 } }] as never;

describe("Base pair reporting eligibility", () => {
  it("reports both missing eligibility and an explicit held-only Base failure as not passed", () => {
    const missing = basePairRows(runs, {})[0];
    const heldOnly = basePairRows(runs, { [pair]: [] })[0];
    assert.equal(missing.passed, false);
    assert.equal(heldOnly.passed, false, "an empty range list retains exits without inventing a Base pass");
    assert.deepEqual(heldOnly, missing);
    assert.deepEqual(heldOnly.tags, []);
    assert.equal(heldOnly.n, 20);
    assert.equal(heldOnly.pf, 0.8, "report eligibility never rewrites the measured representative PF");
  });

  for (const tags of [[""], ["gn"], ["mn", "lg"]]) {
    it(`reports the nonempty ${JSON.stringify(tags)} eligibility as passed`, () => {
      const row = basePairRows(runs, { [pair]: tags })[0];
      assert.equal(row.passed, true, "Wide is one eligible range even though its tag is an empty string");
      assert.deepEqual(row.tags, tags);
      assert.notEqual(row.tags, tags, "report rows own their tag arrays");
      assert.equal(row.pf, 0.8);
    });
  }
});
