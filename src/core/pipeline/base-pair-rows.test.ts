import { test } from "node:test";
import assert from "node:assert/strict";
import { basePairRows } from "./pipeline.ts";

test("Base reporting distinguishes held-only empty results from qualified Wide and tagged ranges", () => {
  const input = ["held", "absent", "wide", "micro"].map((ind) => ({
    bot: "follow" as const, ind, full: { n: 12, pf: 2, net: 1 },
  })) as Parameters<typeof basePairRows>[0];
  const rows = basePairRows(input, { "follow|held": [], "follow|wide": [""], "follow|micro": ["mc"] });
  assert.deepEqual(rows.map((x) => [x.pair, x.passed, x.tags]), [
    ["follow|held", false, []], ["follow|absent", false, []],
    ["follow|wide", true, [""]], ["follow|micro", true, ["mc"]],
  ]);
});
