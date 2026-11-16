import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  DEFAULT_POSITION_WINDOWS, checkPositionWindows, mainnetPositionWindows, partialFloorOf, positionStageStats, positionStats,
  type PositionWindows,
} from "./position-windows.ts";
import { passesBase } from "./pipeline/pipeline.ts";
import { defaultWalkForward, makeTape, positionConfigEval, type WalkForwardOptions } from "./sim/walkforward.ts";
import type { Trade } from "./domain/types.ts";

const wins = (n: number, r = 0.01) => Array.from({ length: n }, () => r);

it("a window shorter than requested is complete only from the partial floor, and only when one is given", () => {
  assert.equal(positionStats(wins(40), 40).complete, true);
  assert.equal(positionStats(wins(36), 40).complete, false, "strict by default");
  assert.equal(positionStats(wins(36), 40, 9).complete, true, "judged on the 36 closes it has");
  assert.equal(positionStats(wins(9), 40, 9).complete, true, "exactly the floor");
  assert.equal(positionStats(wins(8), 40, 9).complete, false, "below the floor");
  assert.equal(positionStats(wins(8), 8, 9).complete, true, "a window that asks for fewer than the floor stays exact");
  assert.equal(positionStats(wins(5), 8, 9).complete, false);
  assert.equal(positionStats(wins(36), 40, 0).complete, false, "0 = strict");
  // the statistics themselves are those of the closes that exist
  const s = positionStats([0.02, -0.01, 0.02], 40, 3);
  assert.equal(s.n, 3);
  assert.equal(s.requested, 40);
  assert.ok(Math.abs(s.net - 0.03) < 1e-12);
});

it("the stage statistics carry the floor through, and a block policy stays exact", () => {
  assert.equal(positionStageStats(wins(20), 40, undefined, 1.05, 9).complete, true);
  assert.equal(positionStageStats(wins(20), 40, undefined, 1.05, 0).complete, false);
  assert.equal(positionStageStats(wins(20), 40).complete, false, "no floor argument = strict, as before");
});

it("the floor is gates.lastNFloor unless the policy is strict (the mainnet minimums)", () => {
  assert.equal(partialFloorOf(DEFAULT_POSITION_WINDOWS, 9), 9);
  assert.equal(partialFloorOf(DEFAULT_POSITION_WINDOWS, 0), 0);
  assert.equal(partialFloorOf(DEFAULT_POSITION_WINDOWS, undefined), 0);
  assert.equal(partialFloorOf(null, 9), 9);
  assert.equal(partialFloorOf({ strictCounts: true }, 9), 0);
  const mainnet = mainnetPositionWindows(DEFAULT_POSITION_WINDOWS, 12, 25, 12);
  assert.equal(mainnet.strictCounts, true, "native mainnet sample sizes are exact");
  assert.equal(partialFloorOf(mainnet, 9), 0);
  assert.doesNotThrow(() => checkPositionWindows({ ...DEFAULT_POSITION_WINDOWS, strictCounts: true }));
  assert.throws(() => checkPositionWindows({ ...DEFAULT_POSITION_WINDOWS, strictCounts: "yes" as never }), /strictCounts/);
});

it("Base judges a profitable 36-close window on its closes, and a strict setting still refuses it", () => {
  const stat = (n: number) => ({ n, pf: 6.4, net: 12, mdd: 0.5, rangeTag: "wide", configId: "c",
    baseLast: { requested: 40, n, gp: 14.9, gl: 2.3, stop: 0, mdd: 0.5 } });
  const g = (over: object) => ({ minPf: 1.25, minTrades: 12, maxDdr: 1, baseLastN: 40, lastNFloor: 9,
    positionWindows: { ...DEFAULT_POSITION_WINDOWS } as PositionWindows, ...over });
  assert.equal(passesBase(stat(40), g({})), true, "a full window");
  assert.equal(passesBase(stat(36), g({})), true, "36 closes, floor 9");
  assert.equal(passesBase(stat(9), g({})), true, "the floor itself");
  assert.equal(passesBase(stat(8), g({})), false, "below the floor");
  assert.equal(passesBase(stat(36), g({ lastNFloor: 0 })), false, "strict setting");
  assert.equal(passesBase(stat(36), g({ positionWindows: { ...DEFAULT_POSITION_WINDOWS, strictCounts: true } })), false, "strict policy");
  // the result half is never waived: a short window with a losing result still fails
  assert.equal(passesBase({ ...stat(36), baseLast: { requested: 40, n: 36, gp: 2, gl: 9, stop: 0, mdd: 3 }, pf: 0.2, net: -7 }, g({})), false);
});

const H = 3600_000, M = 60_000, NOW = Date.UTC(2026, 9, 16, 12), ind = "rsi-mom-14-20@m15";
function tape(closes: number, r = 0.01, sym = "A") {
  const id = `follow|${ind}|tp1|sl1|tr0|h32|${sym}|1|normal`;
  const row = (i: number): Trade => ({ cfg: id, sym, side: 1, entryT: NOW - (closes + 2) * H + i * H, exitT: NOW - (closes + 2) * H + i * H + 20 * M,
    entry: 100, exit: 101, r, mult: 1, reason: "time", bars: 2, mfe: 0, mae: 0, kind: "normal" });
  return makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 32 }, "normal", [sym], Array.from({ length: closes }, (_, i) => row(i)), [], []);
}
function options(over: { lastNFloor?: number; strict?: boolean }): WalkForwardOptions {
  const d = defaultWalkForward({ ...DEFAULT_SETTINGS });
  const pw: PositionWindows = { ...DEFAULT_POSITION_WINDOWS, ...(over.strict ? { strictCounts: true } : {}) };
  return { ...d, gates: { ...d.gates, lastNFloor: over.lastNFloor ?? 9, positionWindows: pw, minGreen: 0 } };
}

const failOf = (e: ReturnType<typeof positionConfigEval>) => (e.ok ? undefined : e.fail);

it("Main, Real and Entry judge a 20-close winning context on its closes; strict settings reject it as insufficient closes", () => {
  const tp = tape(20);
  const open = positionConfigEval(tp, NOW, options({}), "A", 1);
  assert.equal(open.ok, true, JSON.stringify(open));
  assert.equal(open.n, 20);
  assert.equal(open.requestedN, 40, "the window still asks for 40; it is judged on the 20 that exist");
  const strictFloor = positionConfigEval(tp, NOW, options({ lastNFloor: 0 }), "A", 1);
  assert.deepEqual([strictFloor.ok, failOf(strictFloor)], [false, "closes"]);
  const strictPolicy = positionConfigEval(tp, NOW, options({ strict: true }), "A", 1);
  assert.deepEqual([strictPolicy.ok, failOf(strictPolicy)], [false, "closes"]);
  // below the floor, or with a losing result, nothing is waived
  assert.equal(failOf(positionConfigEval(tape(8), NOW, options({}), "A", 1)), "closes");
  const losing = positionConfigEval(tape(20, -0.01), NOW, options({}), "A", 1);
  assert.equal(losing.ok, false);
  assert.notEqual(failOf(losing), "closes", "a losing 20-close window fails on its result, not on its length");
});
