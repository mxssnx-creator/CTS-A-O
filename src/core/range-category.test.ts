// Range categories (8 Oct): every config id maps to exactly one category, and the six engine ranges map to six different
// Normal categories, so a category run can take its own configs and nothing else.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_OF_TAG,
  NORMAL_RANGE_CATEGORIES,
  RANGE_CATEGORIES,
  categoryOfConfig,
} from "./range-category.ts";
import { RANGE_TAGS } from "./minimal-coord.ts";

const NORMAL = "follow|rsi-14-30-70@m15";
const SIG = "follow|sig-ema-cross-s@m15";

describe("range categories", () => {
  it("each engine range tag has its own Normal category", () => {
    const cats = RANGE_TAGS.map((t) => CATEGORY_OF_TAG[t]);
    assert.equal(new Set(cats).size, RANGE_TAGS.length, "six tags, six categories");
    assert.deepEqual([...NORMAL_RANGE_CATEGORIES].sort(), [...cats].sort());
  });

  it("a tagged Normal config belongs to its range's category", () => {
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|mc`), "micro");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|mn`), "minimal");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|mp`), "minimalPlus");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|sh`), "short");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|gn`), "general");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|lg`), "long");
  });

  it("a signal config is Signals whatever tag it carries", () => {
    assert.equal(categoryOfConfig(`${SIG}|tp1|sl1|tr0|h32`), "signals");
    assert.equal(categoryOfConfig(`${SIG}|tp1|sl1|tr0|h32|gn`), "signals", "the tag does not move a signal into General");
    assert.equal(categoryOfConfig(`${SIG}|tp1|sl1|tr0|h32|mc`), "signals", "nor into Micro");
  });

  it("an untagged Normal or Trailing config is the wide grid", () => {
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32`), "wide");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr1|h32`), "wide", "trailing (no tr0) is wide too");
  });

  it("axis and DCA are their own families, tagged or not", () => {
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|axis`), "axis");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|dca`), "dca");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|dcaA`), "dca");
    assert.equal(categoryOfConfig(`${NORMAL}|tp1|sl1|tr0|h32|mc|dca`), "dca", "a DCA config on a range tag is DCA");
  });

  it("every category name is one of the declared categories", () => {
    const ids = [
      `${SIG}|tp1|sl1|tr0|h32`,
      ...RANGE_TAGS.map((t) => `${NORMAL}|tp1|sl1|tr0|h32|${t}`),
      `${NORMAL}|tp1|sl1|tr0|h32`,
      `${NORMAL}|tp1|sl1|tr0|h32|axis`,
      `${NORMAL}|tp1|sl1|tr0|h32|dca`,
    ];
    for (const id of ids) assert.ok(RANGE_CATEGORIES.includes(categoryOfConfig(id)), id);
  });
});
