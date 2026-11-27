import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { ContinuousPositionSelection, EvalMemo, defaultWalkForward, makeTape, selectFixed, validatedSetGen,
  walkForward, type ConfigTape, type WalkForwardOptions } from "./walkforward.ts";

const M = 60_000, H = 60 * M, T = Date.UTC(2026, 9, 16);
const drain = <T>(gen: Generator<number, T>): T => { for (;;) { const r = gen.next(); if (r.done) return r.value; } };
function catalog(): ConfigTape[] {
  return Array.from({ length: 72 }, (_, k) => {
    const ind = k % 3 ? "rsi-mom-14-20@m1" : "ema-9-21@m5";
    const kind = (["normal", "trailing", "axis", "dca"] as const)[k % 4];
    const tag = (["mc", "mn", "sh"] as const)[k % 3];
    const id = `follow|${ind}|tp${k + 1}|sl1|tr0|h1|${tag}|${kind}`;
    const rows: Trade[] = Array.from({ length: 70 }, (_, i) => ({
      cfg: id, sym: i % 2 ? "B" : "A", side: i % 4 < 2 ? 1 : -1,
      entryT: T + (i - 42) * 5 * M, exitT: T + (i - 41) * 5 * M,
      entry: 100, exit: 101, r: (i + k) % (k % 5 + 3) ? .02 : -.004 * (1 + k % 4),
      reason: "tp", bars: 1, mfe: 0, mae: 0, kind,
    }));
    const tape = makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: kind === "trailing" ? .002 : 0,
      hold: 10, tag }, kind, ["A", "B"], rows, [], []);
    if (k === 3) tape.heldOnly = true;
    return tape;
  });
}

test("incremental per-config picks exactly match a complete selection at every causal clock", () => {
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  for (const scope of ["config", "context", "auto", "both"] as const)
    for (const portfolio of [0, 3, 9]) for (const rankBy of ["green", undefined] as const) {
      const tapes = catalog(), memo = new EvalMemo();
      const o: WalkForwardOptions = { ...d, wideEnabled: true, seatSet: "validated", seatPer: "config", portfolio,
        microSeats: portfolio ? 2 : 0, rankBy, rangeGate: undefined, ladderNeedsBase: false,
        basePassed: new Set(["follow|rsi-mom-14-20@m1"]), evalMemo: memo,
        gates: { ...d.gates, minTrades: 3, minGreen: 0, maxDdr: 0, lastNFloor: 0,
          positionWindows: { base: 4, main: 4, real: 3, entry: 3, maxDrawdownPositions: 10, scope } } };
      const initial = drain(validatedSetGen(tapes, T, o));
      drain(memo.attach(tapes, T, T + 3 * H));
      const byId = new Map(tapes.map(tp => [tp.id, tp])), selection = new ContinuousPositionSelection(memo, byId);
      drain(selection.reset(initial, T, o));
      let sawPicks = false, sawUnchanged = false;
      for (const t of [T, T + 5 * M, T + 10 * M, T + 10 * M, T + 23 * M, T + H, T + 2 * H, T + 3 * H]) {
        assert.equal(memo.advance(t), true);
        if (memo.dirty.size < tapes.length) sawUnchanged = true;
        const actual = drain(selection.refresh(t, o));
        const expected = selectFixed(tapes, t, { ...o, evalMemo: undefined, seatSet: "pool", validated: undefined,
          recordValidation: undefined });
        assert.deepEqual(actual, expected, `${scope} portfolio=${portfolio} rank=${rankBy} clock=${t}`);
        sawPicks ||= actual.picks.length > 0;
      }
      assert.ok(sawPicks, `nonempty selection for ${scope}`);
      assert.ok(sawUnchanged, "the fixture must exercise unchanged tapes");
    }
});

test("whole walk-forward and owned-stage output match the full-scan fallback", () => {
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  for (const processed of [false, true]) for (const portfolio of [0, 3]) {
    const tapes = catalog(), reversed = new EvalMemo();
    drain(reversed.attach([...tapes].reverse(), T, T + 2 * H));
    const o: WalkForwardOptions = { ...d, startT: T, simH: 2, stepH: 1, wideEnabled: true,
      seatSet: "validated", seatPer: "config", portfolio, rangeGate: undefined, symGate: "off",
      recordValidation: true, onePerPairEvent: false, coord: { ...d.coord!, enabled: false },
      ...(processed ? { processedStages: { validationN: 2, realN: 2 },
        basePassed: new Set(["follow|rsi-mom-14-20@m1", "follow|ema-9-21@m5"]) } : {}),
      gates: { ...d.gates, minTrades: 3, minGreen: 0, maxDdr: 0, lastNFloor: 0,
        positionWindows: { base: 4, main: 4, real: 3, entry: 3, maxDrawdownPositions: 10, scope: "config" } } };
    const u = { bars: [], caches: [], startT: T - 24 * H, endT: T + 2 * H,
      splitT: T, nowT: T + 2 * H, baseTf: 1 } as never;
    const fast = walkForward(u, tapes, o), reference = walkForward(u, tapes, { ...o, evalMemo: reversed });
    assert.ok(fast.steps.length === 2 && fast.steps.every(s => (s.checks?.length ?? 0) > 0));
    assert.deepEqual(fast, reference, `processed=${processed}, portfolio=${portfolio}`);
  }
});
