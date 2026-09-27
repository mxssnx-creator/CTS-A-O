// Real seats: every strategy family has its own seats, DCA / Axis only where they beat the base, a minimum of
// seats per timeframe lane, no seat / position limit by default; short-lane protect floors; the stage audit.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import { LANE_MIN, laneProtect, mainByLane } from "./pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, selectDurable, type ConfigTape } from "./sim/walkforward.ts";
import { auditState } from "./audit.ts";
import type { StratKind, Trade } from "./domain/types.ts";

const H = 3_600_000;
const now = 336 * H;
/** a tape over the 14-day window: one trade every `every` hours, a loss every 5th */
function tape(
  bot: string,
  ind: string,
  kind: StratKind,
  r: number,
  every = 4,
  tag = "x",
): ConfigTape {
  const ts: Trade[] = [];
  for (let h = 0; h < 336; h += every)
    ts.push({
      cfg: `${bot}|${ind}|${tag}`,
      sym: "A",
      side: 1,
      entryT: h * H,
      exitT: (h + 1) * H,
      entry: 1,
      exit: 1,
      r: h % 5 === 0 ? -r / 2 : r,
      reason: "tp",
      bars: 4,
      mfe: 0,
      mae: 0,
      kind,
    });
  const t = makeTape(
    `${bot}|${ind}|${tag}`,
    bot as never,
    ind,
    { tp: 0.02, sl: 0.02, trail: 0, hold: 32 },
    kind,
    ["A"],
    ts,
    [],
    [],
  );
  t.fromT = 0;
  return t;
}
const o0 = { ...defaultWalkForward(DEFAULT_SETTINGS), preGate: false };

describe("Real seats", () => {
  it("defaults: no seat / position / order limit; seats per family; 3 seats minimum per lane", () => {
    assert.equal(o0.portfolio, 0);
    assert.equal(o0.maxPositions, 0);
    assert.equal(o0.familySeats, true);
    assert.equal(o0.laneSeats, 3);
    assert.equal(DEFAULT_SETTINGS.mainTop, 0);
    assert.equal(DEFAULT_SETTINGS.live.maxPositions, 0);
  });

  it("DCA / Axis run next to the base on the same pair, only when they beat its PF", () => {
    const base = tape("follow", "rsi@m15", "normal", 0.01, 4, "n");
    const dcaGood = tape("follow", "rsi@m15", "dca-active", 0.02, 4, "d");
    const picks = selectDurable([base, dcaGood], now, o0, new Set()).picks.map((p) => p.id);
    assert.deepEqual(picks.sort(), [base.id, dcaGood.id].sort(), "base and DCA both seated");
    // one seat per pair without family seats
    const one = selectDurable([base, dcaGood], now, { ...o0, familySeats: false }, new Set()).picks;
    assert.equal(one.length, 1);
    // a DCA tape worse than the base is not seated
    const dcaWorse = tape("follow", "rsi@m15", "dca-active", 0.01, 4, "w");
    for (let i = 1; i <= dcaWorse.n; i++) dcaWorse.gl[i] *= 1.5;
    const p2 = selectDurable([base, dcaWorse], now, o0, new Set()).picks.map((p) => p.id);
    assert.deepEqual(p2, [base.id]);
  });

  it("each lane gets at least laneSeats seats; 0 seats = no limit", () => {
    const xs = [
      // trade spacing never a multiple of 5 (every 5th hour is a loss in the fixture)
      ...[4, 6, 7, 8].map((e, i) => tape("follow", `s${i}@m30`, "normal", 0.02, e)),
      ...[3, 4, 6].map((e, i) => tape("follow", `f${i}@m1`, "normal", 0.004, e)),
    ];
    const picks = selectDurable(xs, now, { ...o0, portfolio: 2 }, new Set()).picks.map((p) => p.id);
    assert.equal(picks.filter((id) => id.includes("@m1")).length, 3, `1m lane seats: ${picks}`);
    assert.equal(
      selectDurable(xs, now, o0, new Set()).picks.length,
      xs.length,
      "unlimited: every validated tape",
    );
  });

  it("Main takes every validated pair with mainTop 0", () => {
    const passed = Array.from({ length: 300 }, (_, i) => ({
      bot: "follow",
      ind: `i${i}@m${[1, 5, 15][i % 3]}`,
      score: i,
    }));
    assert.equal(mainByLane(passed, 0).size, 300);
    assert.equal(mainByLane(passed, 30).size, 30);
  });
});

describe("short-lane floors", () => {
  it("a 1m lane's scaled target never falls below 3 × the round-trip cost", () => {
    const p = laneProtect({ tp: 0.015, sl: 0.015, trail: 0.006, hold: 96 }, "rsi@m1");
    assert.ok(
      p.tp >= LANE_MIN.tp && p.sl >= LANE_MIN.sl && p.trail >= LANE_MIN.trail,
      JSON.stringify(p),
    );
    // longer lanes are scaled, never floored up
    const q = laneProtect({ tp: 0.004, sl: 0.004, trail: 0, hold: 96 }, "rsi@m30");
    assert.ok(q.tp > 0.004);
  });
});

describe("stage audit", () => {
  it("flags a validated pair without config sets, a stray Main pair and trades outside Main", () => {
    const t = tape("follow", "rsi@m15", "normal", 0.01);
    const ok = auditState({
      sim: null,
      tapes: [t],
      cost: 0.002,
      stages: {
        passed: new Set(["follow|rsi@m15"]),
        main: new Set(["follow|rsi@m15"]),
        held: new Set(),
        mainTop: 0,
      },
    });
    assert.ok(ok.checks.filter((c) => c.name.startsWith("stages")).every((c) => c.ok));
    const bad = auditState({
      sim: null,
      tapes: [t],
      cost: 0.002,
      stages: {
        passed: new Set(["follow|rsi@m15", "follow|macd@m5"]),
        main: new Set(["follow|rsi@m15", "follow|x@m1"]),
        held: new Set(),
        mainTop: 0,
      },
    });
    const failed = bad.checks.filter((c) => !c.ok).map((c) => c.name);
    assert.ok(failed.includes("stages: every validated pair has config sets"));
    assert.ok(failed.includes("stages: Main ⊆ Base-validated ∪ held"));
  });
});
