// longRelax: a LONG signal unit skips the recent-window validation, the 4-hour block share and the low-drawdown floor;
// shorts and the default (off) are unchanged. x01, 20 Oct: no long unit was active, so no long order could open.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeSignals, sigActiveKey } from "./signals.ts";
import { DEFAULT_SIGNALS } from "./signal-config.ts";

// a unit that fails every activation test on both sides except the net sign: recent window negative, few positive
// 4-hour blocks, and a drawdown larger than its net
const weak = { n: 9, net: 2, pf: 1.1, dd: 5, okShare: 0.2, recentN: 3, recentNet: -1 };
const bySym = { A: { ...weak, sides: { "1": weak, "-1": weak } } };
const runs = [{ bot: "follow", ind: "sig-x-s@m5", bySym }];

function active(longRelax: boolean) {
  return activeSignals(runs, { ...DEFAULT_SIGNALS, count: 0, minTrades: 3, rank: "lowdd", validate: true, minBlockShare: 0.6, longRelax });
}

describe("longRelax: long units only", () => {
  it("off (default): the weak long unit stays inactive", () => {
    assert.equal(active(false).has(sigActiveKey("follow", "sig-x-s@m5", "A", 1)), false);
  });

  it("on: the long unit becomes active", () => {
    assert.equal(active(true).has(sigActiveKey("follow", "sig-x-s@m5", "A", 1)), true);
  });

  it("on: the weak short unit stays inactive (shorts unchanged)", () => {
    assert.equal(active(true).has(sigActiveKey("follow", "sig-x-s@m5", "A", -1)), false);
  });

  it("on: a long unit with a negative net is still inactive (the net sign is kept)", () => {
    const neg = { ...weak, net: -2 };
    const r = [{ bot: "follow", ind: "sig-x-s@m5", bySym: { A: { ...neg, sides: { "1": neg, "-1": neg } } } }];
    const set = activeSignals(r, { ...DEFAULT_SIGNALS, count: 0, minTrades: 3, rank: "lowdd", validate: true, minBlockShare: 0.6, longRelax: true });
    assert.equal(set.has(sigActiveKey("follow", "sig-x-s@m5", "A", 1)), false);
  });

  it("the setting defaults to off in the parsed settings", () => {
    assert.equal(DEFAULT_SIGNALS.longRelax, false);
  });
});
