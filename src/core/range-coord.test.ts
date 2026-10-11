// A range's own allow-lists (bots, indication families): what they admit, and that an absent list admits everything.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INDICATION_FAMILIES, rangeAllows } from "./range-coord.ts";
import { INDICATION_BY_ID } from "./indications/registry.ts";

describe("range allow-lists", () => {
  it("admits every combo when the range has no coordination or no list", () => {
    assert.equal(rangeAllows(undefined, "follow", "trend-ema"), true);
    assert.equal(rangeAllows({}, "revert", "rsi-14-25-75"), true);
    assert.equal(rangeAllows({ validLastN: 5 }, "sandwich", "break-squeeze"), true);
  });

  it("admits only the listed bots", () => {
    const c = { bots: ["follow" as const] };
    assert.equal(rangeAllows(c, "follow", "trend-ema"), true);
    assert.equal(rangeAllows(c, "revert", "trend-ema"), false);
  });

  it("admits only the listed indication families, lanes included", () => {
    const rev = { indFamilies: ["reversion" as const] };
    assert.equal(rangeAllows(rev, "revert", "rsi-14-25-75"), true);
    assert.equal(rangeAllows(rev, "revert", "rsi-14-25-75@m5c"), true, "a lane id reads its base indication");
    assert.equal(rangeAllows(rev, "follow", "trend-ema"), false);
    assert.equal(rangeAllows({ indFamilies: ["trend", "breakout"] }, "follow", "break-don20"), true);
  });

  it("refuses an indication outside the registry under a family list", () => {
    assert.equal(rangeAllows({ indFamilies: ["trend"] }, "follow", "no-such-indication"), false);
    assert.equal(rangeAllows({ bots: ["follow"] }, "follow", "no-such-indication"), true, "a bot list does not read the indication");
  });

  it("names only registry kinds, each in one family; the kinds outside every family are listed, not run silently", () => {
    const kinds = new Set([...INDICATION_BY_ID.values()].map((s) => s.kind));
    const members: string[] = Object.values(INDICATION_FAMILIES).flat();
    assert.equal(new Set(members).size, members.length, "a kind belongs to one family");
    for (const k of members) assert.ok(kinds.has(k as never), `${k} is a registry kind`);
    const orphan = [...kinds].filter((k) => !members.includes(k as string)).sort();
    assert.deepEqual(orphan, ["active", "volume"], "the kinds outside every family");
  });
});
