// Continuous stability (gates.stableBlocks) judges the history a tape has: its window starts at the tape's own
// history (fromT), not at t − longH. A 5m tape (~120 h) at longH 336 with 2 blocks had an empty first block, the
// warm-up waived it, and a set that lost its first half and won its second was validated.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { configEval, defaultWalkForward, makeTape, selectFixed, stableOk, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000;
const T = Date.UTC(2026, 9, 1);
const IND = "rsi-mom-14-20@m5";
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };

/** 120 hourly closes over the 120 h before T: the first 60 h lose (1 win in 3), the last 60 h win (3 wins in 4) */
function burstTape(fromT: number | undefined) {
  const xs: Trade[] = [];
  for (let i = 0; i < 120; i++) {
    const entryT = T - 120 * H + i * H + 10 * 60_000;
    const r = i < 60 ? (i % 3 === 0 ? 0.01 : -0.01) : i % 4 === 0 ? -0.01 : 0.02;
    xs.push({ cfg: "c", sym: "AAA-USDT", side: 1, entryT, exitT: entryT + 20 * 60_000, entry: 100, exit: 100 * (1 + r), r, reason: r > 0 ? "tp" : "sl", bars: 4, mfe: 0, mae: 0, kind: "normal" } as Trade);
  }
  const tp = makeTape(`follow|${IND}|tp1|sl1|tr0|h32`, "follow", IND, P, "normal", ["AAA-USDT"], xs, [], []);
  if (fromT !== undefined) tp.fromT = fromT;
  return tp;
}

const o = (blocks: number): WalkForwardOptions => {
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  return {
    ...d,
    longH: 336,
    preH: 20,
    preGate: false,
    validLastN: 0,
    lastN: 0,
    rangeGate: null,
    toggles: { ...d.toggles, normal: true, block: false },
    gates: { ...d.gates, minPf: 1.05, minTrades: 3, maxDdtH: 1e6, maxDdr: 0, minGreen: 0, stableBlocks: blocks, warmup: true },
  };
};

describe("continuous stability clipped to the tape's own history (gates.stableBlocks)", () => {
  it("a 5m tape with 120 h that lost its first 60 h fails 2 blocks at longH 336", () => {
    const tp = burstTape(T - 120 * H);
    // whole window: PF 2 — every other gate passes
    assert.equal(configEval(tp, T, o(0)).ok, true, "without the gate the set validates");
    // the two blocks are [T − 120 h, T − 60 h) at PF 0.5 and [T − 60 h, T) at PF 6
    assert.equal(stableOk(tp, T, 336, 2, 1.05), false);
    const r = configEval(tp, T, o(2));
    assert.equal(r.ok, false);
    assert.equal((r as { fail?: string }).fail, "stable");
    // the seat selection (configPassAt) reads the same window
    assert.deepEqual(selectFixed([tp], T, o(0)).picks.map((p) => p.id), [tp.id]);
    assert.deepEqual(selectFixed([tp], T, o(2)).picks, [], "not seated");
  });

  it("a steady tape with the same history passes; a tape without fromT or with a longer history keeps the full window", () => {
    const steady = burstTape(T - 120 * H);
    // rewrite to 3 wins in 4 throughout: both blocks clear
    for (let i = 0; i < steady.n; i++) steady.r[i] = i % 4 === 0 ? -0.01 : 0.02;
    let gp = 0;
    let gl = 0;
    let rs = 0;
    for (let i = 0; i < steady.n; i++) {
      const r = steady.r[i];
      if (r > 0) gp += r;
      else gl -= r;
      rs += r;
      steady.gp[i + 1] = gp;
      steady.gl[i + 1] = gl;
      steady.rs[i + 1] = rs;
    }
    assert.equal(stableOk(steady, T, 336, 2, 1.05), true);
    // no fromT: the window is [T − 336 h, T) as before — its first block holds no close, the warm-up waives it
    assert.equal(stableOk(burstTape(undefined), T, 336, 2, 1.05), true);
    assert.equal(stableOk(burstTape(undefined), T, 336, 2, 1.05, false), false, "strict: one block with closes is not judgeable");
    // history from before the window: the window is not clipped (the same [T − 336 h, T) blocks)
    assert.equal(stableOk(burstTape(T - 400 * H), T, 336, 2, 1.05), true);
    // 3 blocks over the clipped 120 h: [−120, −80) loses, the gate refuses
    assert.equal(stableOk(burstTape(T - 120 * H), T, 336, 3, 1.05), false);
    // no history before T: nothing to judge (warm-up) / strict
    assert.equal(stableOk(burstTape(T), T, 336, 2, 1.05), true);
    assert.equal(stableOk(burstTape(T), T, 336, 2, 1.05, false), false);
    // off: always passes
    assert.equal(stableOk(burstTape(T - 120 * H), T, 336, 0, 1.05), true);
  });
});
