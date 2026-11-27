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

it("a finished walk-forward result carries no memo: its options serialize small", async () => {
  const { walkForward, defaultWalkForward } = await import("./walkforward.ts");
  const { DEFAULT_SETTINGS } = await import("../config.ts");
  const d = defaultWalkForward(DEFAULT_SETTINGS);
  const u = { bars: [], caches: [], startT: 0, endT: 3_600_000, splitT: 0, nowT: 3_600_000, baseTf: 1 } as never;
  const sim = walkForward(u, [], { ...d, simH: 1 });
  assert.equal("evalMemo" in sim.opts, false);
  assert.ok(JSON.stringify(sim.opts).length < 200_000);
});

it("Signal tapes outside the attached engine index refresh their own settled history", () => {
  const engine = randomTape(801), signal = randomTape(802);
  signal.ind = "sig-ema-cross-s@m1";
  assert.ok(signal.n > 5);
  const memo = new EvalMemo(), o = { ...options(), evalMemo: memo };
  const first = signal.exitT[0] + 1, later = signal.exitT[5] + 1;
  // A previously cached signal is still not part of an engine-only event index.
  assert.equal(JSON.stringify(configEvalSummary(signal, first, o)), plain(signal, first, o));
  const g = memo.attach([engine], T0, T0 + 30 * H);
  while (!g.next().done);
  assert.equal(JSON.stringify(configEvalSummary(signal, first, o)), plain(signal, first, o));
  assert.equal(JSON.stringify(configEvalSummary(signal, later, o)), plain(signal, later, o));
});

it("a backward query cannot replace a tracked tape's later cached verdict", () => {
  const tape = randomTape(803);
  assert.ok(tape.n > 10);
  const memo = new EvalMemo(), o = { ...options(), evalMemo: memo };
  const g = memo.attach([tape], T0, T0 + 30 * H);
  while (!g.next().done);
  const earlier = tape.exitT[0] + 1, later = tape.exitT[6] + 1;
  for (const t of [later, earlier, later + 1])
    assert.equal(JSON.stringify(configEvalSummary(tape, t, o)), plain(tape, t, o), `clock ${t}`);
});

it("reattaching a different tape set invalidates the previous membership", () => {
  const kept = randomTape(806), removed = randomTape(807), memo = new EvalMemo();
  assert.ok(removed.n > 5);
  const o = { ...options(), evalMemo: memo }, first = removed.exitT[0] + 1, later = removed.exitT[5] + 1;
  const drain = (g: Generator<number, void>) => { while (!g.next().done) { /* drain slices */ } };
  drain(memo.attach([kept, removed], T0, T0 + 30 * H));
  assert.equal(JSON.stringify(configEvalSummary(removed, first, o)), plain(removed, first, o));
  drain(memo.attach([kept], T0, T0 + 30 * H));
  assert.equal(JSON.stringify(configEvalSummary(removed, later, o)), plain(removed, later, o));
});

it("queries beyond the attached interval use fresh history and do not poison later in-range reads", () => {
  const tape = randomTape(804);
  assert.ok(tape.n > 10);
  const memo = new EvalMemo(), o = { ...options(), evalMemo: memo };
  const first = tape.exitT[0] + 1, limit = tape.exitT[4] + 2, outside = tape.exitT[9] + 1;
  const g = memo.attach([tape], T0, limit);
  while (!g.next().done);
  for (const t of [first, outside, tape.exitT[tape.n - 1] + 1, tape.exitT[2] + 1])
    assert.equal(JSON.stringify(configEvalSummary(tape, t, o)), plain(tape, t, o), `clock ${t}`);
});

it("hourly Signal validation records each new settled close when engine events are indexed", async () => {
  const { walkForward } = await import("./walkforward.ts");
  const ind = "sig-ema-cross-s@m1", id = `follow|${ind}|tp1|sl1|tr0|h1`;
  const rows: Trade[] = Array.from({ length: 16 }, (_, i) => ({
    cfg: id, sym: "A", side: 1, entryT: T0 - 20 * M + i * 20 * M,
    exitT: T0 - 10 * M + i * 20 * M, entry: 100, exit: 101,
    r: i % 4 ? 0.01 : -0.01, reason: "tp", bars: 1, mfe: 0, mae: 0,
  }));
  const signal = makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 1 }, "normal", ["A"], rows, [], []);
  const engine = randomTape(805);
  const d = options();
  const o: WalkForwardOptions = { ...d, startT: T0, simH: 6, stepH: 1, wideEnabled: true,
    signalActive: new Set([`follow|${ind}`]), signalRank: undefined, recordValidation: true,
    symGate: "off", rangeGate: undefined, coord: { ...d.coord!, enabled: false } };
  const u = { bars: [], caches: [], startT: T0 - 24 * H, endT: T0 + 6 * H,
    splitT: T0, nowT: T0 + 6 * H, baseTf: 1 } as never;
  const run = walkForward(u, [engine, signal], o);
  assert.equal(run.steps.length, 6);
  const counts = [];
  for (const step of run.steps) {
    const actual = step.checks?.find(row => row[0] === id);
    const expected = configEvalSummary(signal, step.t, { ...o, evalMemo: undefined });
    assert.deepEqual(actual, [id, expected.ok ? 1 : 0, expected.n, expected.pf,
      (expected.gp ?? 0) / 100, (expected.gl ?? 0) / 100], `hour ${step.t}`);
    counts.push(expected.n);
  }
  assert.ok(new Set(counts).size > 1, "the fixture must observe changing Signal history");
});

it("optional ladder comparison still requires a passing base; independent selection keeps both", async () => {
  const { selectFixed } = await import("./walkforward.ts");
  const make = (ind: string, kind: "normal" | "axis") => {
    const id = `follow|${ind}|tp1|sl1|tr0|h1|${kind}`;
    const rows: Trade[] = Array.from({ length: 20 }, (_, i) => ({
      cfg: id, sym: "A", side: 1, entryT: T0 - (22 - i) * M, exitT: T0 - (21 - i) * M,
      entry: 100, exit: 101, r: i % 10 ? .01 : -.002, reason: "tp", bars: 1, mfe: 0, mae: 0,
    }));
    return makeTape(id, "follow", ind, { tp: .01, sl: .01, trail: 0, hold: 1 }, kind, ["A"], rows, [], []);
  };
  const base = make(IND, "normal"), axis = make(IND, "axis"), orphan = make("ema-9-21@m1", "axis");
  const d = options(), o = { ...d, wideEnabled: true, seatSet: "pool" as const, rangeGate: undefined,
    gates: { ...d.gates, positionWindows: { ...d.gates.positionWindows!, scope: "config" as const } } };
  const independent = selectFixed([base, axis, orphan], T0, { ...o, ladderNeedsBase: false }).picks.map(p => p.id);
  const needsBase = selectFixed([base, axis, orphan], T0, { ...o, ladderNeedsBase: true }).picks.map(p => p.id);
  assert.deepEqual(new Set(independent), new Set([base.id, axis.id, orphan.id]));
  assert.deepEqual(new Set(needsBase), new Set([base.id, axis.id]));
});
