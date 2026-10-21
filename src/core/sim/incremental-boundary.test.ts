// Functional parity: older indicator warmup is never performance evidence in a bounded replay.
import assert from "node:assert/strict";
import { it } from "node:test";
import { barsFromCandles, headBars, syntheticCandles } from "../market/bars.ts";
import { CandleSeries } from "../market/candle-series.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { IncrementalState } from "../server/incremental.ts";
import { buildTapes, type ConfigTape } from "./walkforward.ts";
import { seedTape, extendTape } from "./tape-extend.ts";

const M = 60_000, start = Date.UTC(2026, 9, 10);
const candles = syntheticCandles("BOUNDARY", 1, 1440, start + 1440 * M, 17);
const bars = barsFromCandles("BOUNDARY", 1, candles);
const fromT = start + 720 * M, cut = start + 1200 * M;
const pairs = new Set(["follow|mc-rsi2-5@m1", "revert|mc-rsi2-5@m1"]);
const protects = [
  { tp: .005, sl: .01, trail: 0, hold: 6 },
  { tp: .01, sl: .02, trail: .005, hold: 12 },
];
const universe = (end: number, boundary: number | undefined = fromT) => makeUniverse([headBars(bars, end)], boundary);
const build = (u: ReturnType<typeof universe>) => buildTapes(u, protects, .0015, undefined, pairs,
  null, undefined, { minSl: 0, minTrail: 0 });
const same = (a: ConfigTape, b: ConfigTape) => {
  assert.equal(a.id, b.id);
  assert.equal(a.n, b.n, `${a.id}: indicator warmup changed the evaluated sample`);
  for (const key of ["exitT", "entryT", "r", "side", "entry", "exit", "gp", "gl", "rs", "r2"] as const)
    assert.deepEqual(a[key], b[key], `${a.id}: ${key}`);
  assert.deepEqual(a.open, b.open);
  assert.deepEqual(a.pending, b.pending);
};

it("bounded replay seeds and extends the same exact evaluated history as a full build", () => {
  const u = universe(cut), initial = build(u), unbounded = build(makeUniverse([headBars(bars, cut)]));
  assert.equal(initial.length, 4);
  assert.ok(unbounded.reduce((n, t) => n + t.n, 0) > initial.reduce((n, t) => n + t.n, 0));
  for (const tape of initial) {
    const seed = seedTape(tape, u, .0015, null)!;
    same(seed.tape, tape);
    const nextU = universe(cut + 8 * M);
    const next = extendTape(seed.tape, seed.resume, nextU, .0015, null)!;
    same(next.tape, build(nextU).find((x) => x.id === tape.id)!);
    assert.ok(Array.from(next.tape.entryT).every((t) => t >= fromT));
  }
});

it("incremental universe growth preserves the explicit replay boundary and its cohort", () => {
  const state = new IncrementalState(universe(cut), .0015, null, 1);
  const initial = build(state.universe);
  assert.equal(state.seed(initial).taken, initial.length, "qualified bounded tapes must remain resumable");
  const cs = CandleSeries.fromCandles(candles.filter((x) => x.t < cut + 8 * M));
  const next = state.step(new Map([[bars.sym, cs]]))!;
  assert.equal(state.universe.evaluationFromT, fromT);
  assert.equal(state.universe.startT, fromT);
  assert.deepEqual(next.broken, []);
  const full = new Map(build(state.universe).map((x) => [x.id, x]));
  for (const tape of next.tapes.values()) same(tape, full.get(tape.id)!);
});

it("a changed performance boundary requires a new seed instead of reusing the old proof", () => {
  const u = universe(cut), tape = build(u)[0], seed = seedTape(tape, u, .0015, null)!;
  assert.equal(extendTape(seed.tape, seed.resume, universe(cut + M, fromT + M), .0015, null), null);
});
