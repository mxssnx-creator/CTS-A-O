import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { EvalMemo, configEvalSummary, defaultWalkForward, makeTape, type ConfigTape, type WalkForwardOptions } from "./walkforward.ts";
import type { Trade } from "../domain/types.ts";

const H = 3_600_000, M = 60_000, T0 = Date.UTC(2026, 9, 16, 0);
const IND = "rsi-mom-14-20@m1";
let seed = 99;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

function randomTape(k: number): ConfigTape {
  const id = `follow|${IND}|tp${k}|sl1|tr0|h32`;
  const rows: Trade[] = [];
  const syms = ["A", "B", "C"].slice(0, 1 + (k % 3));
  for (const sym of syms) for (const side of [1, -1] as const) {
    const n = Math.floor(rnd() * 40);
    let t = T0 + Math.floor(rnd() * 60) * M;
    for (let i = 0; i < n; i++) {
      t += (5 + Math.floor(rnd() * 90)) * M;
      rows.push({ cfg: id, sym, side, entryT: t, exitT: t + 10 * M, entry: 100, exit: 101, r: rnd() < 0.65 ? 0.01 : -0.012,
        mult: 1, reason: "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" });
    }
  }
  rows.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
  return makeTape(id, "follow", IND, { tp: 0.01 + k * 0.001, sl: 0.01, trail: 0, hold: 32 }, "normal", syms, rows, [], []);
}
function options(): WalkForwardOptions {
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  return { ...d, gates: { ...d.gates, minTrades: 9, minPf: 1.0, lastNFloor: 9,
    positionWindows: { base: 12, main: 12, real: 12, entry: 12, maxDrawdownPositions: 12 } } };
}
const plain = (tp: ConfigTape, t: number, o: WalkForwardOptions) => JSON.stringify(configEvalSummary(tp, t, { ...o, evalMemo: undefined }));

it("a memo with exit events returns exactly a fresh evaluation at every forward, repeated and skipped clock", () => {
  const tapes = Array.from({ length: 40 }, (_, k) => randomTape(k));
  const o0 = options();
  const memo = new EvalMemo();
  const g = memo.attach(tapes, T0, T0 + 30 * H);
  while (!g.next().done);
  const o = { ...o0, evalMemo: memo };
  let checked = 0;
  for (const minutes of [0, 0, 7, 7, 55, 56, 200, 200, 201, 600, 1000, 1000, 1500]) {
    const t = T0 + minutes * M;
    for (const tp of tapes) { assert.equal(JSON.stringify(configEvalSummary(tp, t, o)), plain(tp, t, o), `${tp.id} @ ${minutes} min`); checked++; }
  }
  // a clock that goes backward falls back to the exact path and still agrees
  for (const tp of tapes) assert.equal(JSON.stringify(configEvalSummary(tp, T0 + 100 * M, o)), plain(tp, T0 + 100 * M, o));
  assert.ok(checked > 400);
});

it("without attached events the memo is still exact (by settled-close count)", () => {
  const tapes = Array.from({ length: 12 }, (_, k) => randomTape(100 + k));
  const o = { ...options(), evalMemo: new EvalMemo() };
  for (const minutes of [10, 10, 300, 299, 800]) for (const tp of tapes)
    assert.equal(JSON.stringify(configEvalSummary(tp, T0 + minutes * M, o)), plain(tp, T0 + minutes * M, o));
});

it("a tape with no newly settled close is not opened again", () => {
  const tapes = Array.from({ length: 30 }, (_, k) => randomTape(200 + k));
  const reads = new Map<ConfigTape, number>();
  for (const tp of tapes) {
    const real = tp.exitT;
    Object.defineProperty(tp, "exitT", { configurable: true, get() { reads.set(tp, (reads.get(tp) ?? 0) + 1); return real; } });
  }
  const memo = new EvalMemo();
  const g = memo.attach(tapes, T0, T0 + 30 * H);
  while (!g.next().done);
  const o = { ...options(), evalMemo: memo };
  const t1 = T0 + 600 * M;
  for (const tp of tapes) configEvalSummary(tp, t1, o);
  reads.clear();
  const t2 = t1 + 3 * M; // a short step: only a few tapes settle a close
  const moved = tapes.filter((tp) => { let n = 0; for (let i = 0; i < tp.n; i++) if (tp.exitT[i] >= t1 && tp.exitT[i] < t2) n++; return n > 0; });
  reads.clear();
  for (const tp of tapes) configEvalSummary(tp, t2, o);
  const opened = tapes.filter((tp) => (reads.get(tp) ?? 0) > 0);
  assert.ok(moved.length < tapes.length, "the step must leave some tapes unchanged for the test to mean something");
  assert.deepEqual(new Set(opened.map((x) => x.id)), new Set(moved.map((x) => x.id)), "only tapes with a newly settled close are opened");
});
