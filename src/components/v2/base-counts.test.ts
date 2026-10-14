import assert from "node:assert/strict";
import { test } from "node:test";
import { basePairAdmission } from "./base-counts.ts";

test("full-grid cell results do not broaden representative admission across bot, range or lane", () => {
  const summary = { admittedPairKeys: ["follow|tactic-trend-s@m5"] };
  assert.equal(basePairAdmission({ bot: "follow", ind: "tactic-trend-s@m5" }, summary), true);
  for (const row of [{ bot: "revert", ind: "tactic-trend-s@m5" }, { bot: "follow", ind: "tactic-trend-m@m5" }, { bot: "follow", ind: "tactic-trend-s@m15" }, { bot: "follow", ind: "tactic-trend-s" }])
    assert.equal(basePairAdmission(row, summary), false);
  assert.equal(basePairAdmission({ bot: "follow", ind: "tactic-trend-s@m5" }, { admittedPairKeys: [] }), false);
  assert.equal(basePairAdmission({ bot: "follow", ind: "tactic-trend-s@m5" }, null), null);
  assert.equal(basePairAdmission({ bot: "follow", ind: "tactic-trend-s@m5" }, {}), null);
});
