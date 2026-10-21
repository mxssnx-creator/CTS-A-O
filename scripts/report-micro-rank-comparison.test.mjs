import assert from "node:assert/strict";
import { test } from "node:test";
import {
  add,
  empty,
  measuredPf,
  compareCohorts,
  htmlReport,
} from "./report-micro-rank-comparison.mjs";

const trade = (r, other = {}) => ({
  cfg: "exact",
  sym: "A",
  side: 1,
  entryT: 0,
  exitT: 60_000,
  r,
  mult: 1,
  ...other,
});
test("report PF uses known net unit returns once and distinguishes empty, flat and no-loss", () => {
  const x = empty();
  add(x, trade(0.1, { mult: 2 }));
  add(x, trade(-0.025));
  assert.equal(measuredPf(x).value, 2);
  assert.deepEqual(measuredPf(empty()), { value: null, state: "empty" });
  assert.equal(measuredPf(add(empty(), trade(0))).state, "flat");
  assert.equal(measuredPf(add(empty(), trade(0.1))).state, "no-loss");
  assert.throws(() => add(empty(), trade(0.1, { mult: undefined })), /Unknown/);
});
test("same-time order changes preserve a multiset; missing duplicate legs and costs are exposed", () => {
  const a = [trade(0.1), trade(-0.05), trade(0.01, { cfg: "sibling" })];
  assert.equal(compareCohorts(a, [...a].reverse()).same, true);
  assert.equal(compareCohorts(a, a.slice(1)).onlyLeft, 1);
  assert.equal(
    compareCohorts(
      a,
      a.map((t, i) => (i ? t : { ...t, r: t.r - 0.0015 })),
    ).mismatchedReturns,
    1,
  );
  assert.equal(compareCohorts([a[0]], [{ ...a[0], side: -1 }]).same, false);
});
test("standalone HTML has no external dependencies or unescaped embedded data", () => {
  const s = htmlReport({ text: "</script><script>bad()</script>" });
  assert.ok(s.includes("DecompressionStream"));
  assert.ok(!s.includes("<script>bad()"));
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(s));
  assert.ok(s.includes('id="hourpf"') && s.includes('id="stages"'));
});
