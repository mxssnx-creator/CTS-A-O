import assert from "node:assert/strict";
import { it } from "node:test";
import { controlTargets, type ControlContribution, type ControlSettings } from "./live.ts";

it("one-way netting preserves only the surviving side's bounded or mixed backstop policy", () => {
  const cs: ControlSettings = { notionalUsd: 10, ratio: 1, maxNotionalUsd: 1000, maxPositions: 10,
    rebalancePct: .25, positionMode: "oneway", minStopPct: .001 };
  for (const side of [1, -1] as const) {
    const lane = (sd: 1 | -1, vol: number, bounded: boolean): ControlContribution => ({
      sym: "AAA-USDT", side: sd, cfg: `follow|ema@m1|tp1|sl3|tr1|h32|${sd}|${bounded}`,
      vol, sl: bounded ? .03 : .05, stopPx: 100 * (1 - sd * (bounded ? .03 : .05)),
      ...(bounded ? { stopMax: .03 } : {}),
    });
    const opposite = (-side) as 1 | -1;
    const bounded = controlTargets([lane(side, 2, true), lane(opposite, 1, false)], new Map([["AAA-USDT", 100]]), cs).targets;
    assert.equal(bounded.length, 1);
    assert.equal(bounded[0].side, side);
    assert.equal(bounded[0].stopMax, .03);
    assert.equal(bounded[0].stopDist, .03, "the losing side's unbounded lane cannot erase the survivor's ceiling");
    const mixed = controlTargets([lane(side, 1, true), lane(side, 1, false), lane(opposite, 1, true)], new Map([["AAA-USDT", 100]]), cs).targets;
    assert.equal(mixed.length, 1);
    assert.equal(mixed[0].stopMax, undefined);
    assert.ok(Math.abs(mixed[0].stopDist - .06) < 1e-12, "a surviving unbounded lane retains its wider backstop");
  }
});
