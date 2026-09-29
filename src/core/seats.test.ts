// Real seats: every strategy family has its own seats, DCA / Axis only where they beat the base, a minimum of
// seats per timeframe lane, no seat / position limit by default; short-lane protect floors; the stage audit.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./config.ts";
import { LANE_MIN, laneProtect, mainByLane } from "./pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, selectDurable, type ConfigTape } from "./sim/walkforward.ts";
import { auditState } from "./audit.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
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
/** family seats switched on (off by default) */
const of = { ...o0, familySeats: true };

describe("Real seats", () => {
  it("defaults: capped seats (12 per family) and positions (12); no order limit; 3 seats minimum per lane", () => {
    assert.equal(o0.portfolio, 12);
    assert.equal(o0.maxPositions, 12);
    assert.equal(o0.maxPerSymbol, 0);
    assert.equal(o0.maxOpen, 0);
    assert.equal(o0.familySeats, false, "one seat per pair (family seats lowered PF on real data)");
    assert.equal(o0.laneSeats, 3);
    assert.equal(DEFAULT_SETTINGS.mainTop, 0);
    assert.equal(DEFAULT_SETTINGS.live.maxPositions, 12);
  });

  it("DCA / Axis run next to the base on the same pair, only when they beat its PF", () => {
    const base = tape("follow", "rsi@m15", "normal", 0.01, 4, "n");
    const dcaGood = tape("follow", "rsi@m15", "dca-active", 0.02, 4, "d");
    const picks = selectDurable([base, dcaGood], now, of, new Set()).picks.map((p) => p.id);
    assert.deepEqual(picks.sort(), [base.id, dcaGood.id].sort(), "base and DCA both seated");
    // one seat per pair without family seats
    const one = selectDurable([base, dcaGood], now, { ...of, familySeats: false }, new Set()).picks;
    assert.equal(one.length, 1);
    // a DCA tape worse than the base is not seated
    const dcaWorse = tape("follow", "rsi@m15", "dca-active", 0.01, 4, "w");
    for (let i = 1; i <= dcaWorse.n; i++) dcaWorse.gl[i] *= 1.5;
    const p2 = selectDurable([base, dcaWorse], now, of, new Set()).picks.map((p) => p.id);
    assert.deepEqual(p2, [base.id]);
    // a DCA tape on a pair without any base result to beat is not seated
    const lone = tape("follow", "macd@m15", "dca-active", 0.02, 4, "l");
    assert.deepEqual(selectDurable([lone], now, of, new Set()).picks, []);
    assert.equal(
      selectDurable([lone], now, { ...of, familyNeedsBase: false }, new Set()).picks.length,
      1,
    );
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
      selectDurable(xs, now, { ...o0, portfolio: 0 }, new Set()).picks.length,
      xs.length,
      "0 seats = no limit: every validated tape",
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

describe("Block default", () => {
  it("Block Active needs a sustained streak (≥ 6 of 10); the former default is migrated once", () => {
    assert.equal(DEFAULT_SETTINGS.block.maxLevel, 10);
    assert.equal(DEFAULT_SETTINGS.block.minActiveLevel, 6);
    const db = new CoreDb(":memory:");
    db.kvSet("settings", { block: { ratio: 0.3, maxLevel: 6, minActiveLevel: 1, maxMult: 2.5 } });
    const rt = new CoreRuntime(db, undefined, { market: "synthetic" });
    assert.equal(rt.settings.block.maxLevel, 10);
    assert.equal(rt.settings.block.minActiveLevel, 6);
    assert.equal(rt.settings.block.ratio, 0.3, "other Block values kept");
    // a user's own choice is kept
    const db2 = new CoreDb(":memory:");
    db2.kvSet("settings", { block: { ratio: 0.2, maxLevel: 8, minActiveLevel: 2, maxMult: 2.5 } });
    assert.equal(
      new CoreRuntime(db2, undefined, { market: "synthetic" }).settings.block.minActiveLevel,
      2,
    );
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

describe("best first", () => {
  it("engine sets by selection score, then signals by their active ranking", async () => {
    const { bestFirst } = await import("./sim/walkforward.ts");
    const tp = (id: string, ind: string) => ({ id, bot: "follow", ind }) as unknown as ConfigTape;
    const prio = bestFirst(
      [
        { id: "weak", score: 1 },
        { id: "strong", score: 9 },
      ],
      { signalActive: new Set(["follow|sig-b-s@m5|A", "follow|sig-a-s@m5|A"]) },
    );
    const order = [
      tp("sigA", "sig-a-s@m5"),
      tp("weak", "rsi@m15"),
      tp("sigB", "sig-b-s@m5"),
      tp("strong", "rsi@m15"),
    ]
      .sort((a, b) => prio(a, "A") - prio(b, "A"))
      .map((t) => t.id);
    assert.deepEqual(order, ["strong", "weak", "sigB", "sigA"]);
  });
});

describe("bug-hunt regressions", () => {
  it("held seats of one lane never starve another lane's minimum (durable)", () => {
    const slow = [4, 6, 7, 8, 9, 11, 13, 14, 16, 17, 18, 19].map((e, i) =>
      tape("follow", `s${i}@m30`, "normal", 0.02, e),
    );
    const fast = [3, 4, 6].map((e, i) => tape("follow", `f${i}@m1`, "normal", 0.004, e));
    const held = new Set(slow.map((t) => t.id));
    const picks = selectDurable([...slow, ...fast], now, o0, held).picks.map((p) => p.id);
    assert.equal(picks.filter((id) => id.includes("@m1")).length, 3, `${picks}`);
  });

  it("the paper equity check counts an open order's Block volume", () => {
    const eq = (vol: number) =>
      auditState({
        sim: null,
        tapes: [],
        cost: 0.002,
        paper: {
          selected: [],
          positions: [{ cfg: "a", sym: "A", entryT: 0, mtm: 0.01, vol }],
          trades: [],
          equity: 0.01 * vol * 20,
          sizing: { balance: 1000, sizing: { mode: "equityPct", pct: 0.02 }, fixedNotional: 100 },
        },
      }).checks.find((c) => c.name.startsWith("paper: equity"))!.ok;
    assert.equal(eq(3), true);
  });

  it("a settings change keeps the signal gates and adjust pauses until the next compute", () => {
    const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic" });
    const act = new Set(["follow|sig-a-s@m5|A"]);
    rt.wf.signalActive = act;
    rt.wf.signalGuardN = 8;
    rt.wf.paused = new Set(["x"]);
    rt.updateSettings({ symbols: 5 });
    assert.equal(rt.wf.signalActive, act);
    assert.equal(rt.wf.signalGuardN, 8);
    assert.ok(rt.wf.paused?.has("x"));
  });

  it("the migration only runs the steps a database has not seen (choices made later are kept)", () => {
    const db = new CoreDb(":memory:");
    db.kvSet("wfCapsV", 5);
    db.kvSet("wf", { maxPerSymbol: 4, portfolio: 20 });
    db.kvSet("settings", { signals: { enabled: false, lanes: [15] }, live: { maxPositions: 0 } });
    const rt = new CoreRuntime(db, undefined, { market: "synthetic" });
    assert.equal(rt.wf.maxPerSymbol, 4);
    assert.equal(rt.wf.portfolio, 20);
    assert.equal(rt.settings.signals.enabled, false);
    assert.deepEqual(rt.settings.signals.lanes, [15]);
    assert.equal(
      rt.settings.live.maxPositions,
      12,
      "the unlimited value a v5 migration wrote goes back",
    );
  });
  it("v10: signal settings still on the former defaults move to the validated ones; user choices stay", () => {
    const old = new CoreDb(":memory:");
    old.kvSet("wfCapsV", 9);
    old.kvSet("settings", {
      signals: {
        lanes: [1, 5, 15],
        exits: "both",
        holdH: 24,
        perSymbol: 8,
        normal: { tp: [0.015, 0.02, 0.025, 0.03, 0.04], slOfTp: [1, 1.5, 2] },
      },
    });
    const a = new CoreRuntime(old, undefined, { market: "synthetic" });
    assert.deepEqual(a.settings.signals.lanes, [15, 30]);
    assert.equal(a.settings.signals.exits, "pct");
    assert.equal(a.settings.signals.holdH, 48);
    assert.deepEqual(a.settings.signals.normal.slOfTp, [1.5, 2, 3]);
    assert.equal(a.settings.signals.perSymbol, 32);
    const mine = new CoreDb(":memory:");
    mine.kvSet("wfCapsV", 9);
    mine.kvSet("settings", { signals: { lanes: [5], exits: "atr", holdH: 12 } });
    const b = new CoreRuntime(mine, undefined, { market: "synthetic" });
    assert.deepEqual(b.settings.signals.lanes, [5]);
    assert.equal(b.settings.signals.exits, "atr");
    assert.equal(b.settings.signals.holdH, 12);
  });
});
