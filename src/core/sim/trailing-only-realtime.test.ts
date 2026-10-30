import assert from "node:assert/strict";
import { test } from "node:test";
import type { Candle, Protect } from "../domain/types.ts";
import { barsFromCandles, resample } from "../market/bars.ts";
import { configId, laneProtect, makeUniverse, protectCellKey, rangeBaseStats } from "../pipeline/pipeline.ts";
import { TickMathBook, type TickPosition } from "../server/tick-math.ts";
import { IncrementalState } from "../server/incremental.ts";
import { simulate } from "./backtest.ts";
import { RealtimeTapeBook } from "./realtime.ts";
import { extendTape, seedTape } from "./tape-extend.ts";
import { capTrailingOnlyProtect } from "./trailing.ts";
import { baseAllowsTape, buildTapes, passedCellsOf, pendingAsOpen } from "./walkforward.ts";

const M = 60_000, START = Date.UTC(2026, 9, 8, 12), IND = "ema-9-21@m5", COST = .0015;
const symbols = ["ADA", "APT", "ARB", "ATOM", "AVAX", "BCH", "BNB", "BTC"].map((s) => `${s}-USDT`);

test("pending trailing-only entries use the same capped protection as their simulator, on both sides", () => {
  const protect: Protect = { tp: 0, sl: .08, trail: .04, trailOnly: true, trailStep: 1.5, hold: 10 };
  const id = configId("follow", IND, protect);
  for (const side of [1, -1] as const) {
    const rows = [0, 1].map((i) => ({ t: START + i * 5 * M, o: 100, h: 100.01, l: 99.99, c: 100, v: 1 }));
    const simulated = simulate(id, barsFromCandles("ADA-USDT", 5, rows), new Int8Array([side, 0]), protect, { cost: COST });
    assert.ok(simulated.open);
    const [pending] = pendingAsOpen({ id, ind: IND, kind: "trailing-only", protect,
      pending: [{ sym: "ADA-USDT", side }] }, START + 5 * M, 1, () => 100, COST);
    assert.equal(pending.target, 0);
    assert.ok(Math.abs(pending.stop - simulated.open.stop) < 1e-10, `side ${side}: pending SL must equal simulation`);
    assert.equal(pending.trail, simulated.open.trail);
    assert.equal(pending.trailDist, simulated.open.trailDist);
    assert.equal(pending.trailFree, false);
  }
});

test("8-symbol minute-projected pending orders retain each 3-minute hold deadline and own clock", () => {
  const bars = symbols.flatMap((sym, i) => {
    const d = i < 4 ? 1 : -1;
    const candles: Candle[] = Array.from({ length: 24 * 60 }, (_, k) => {
      const close = k >= 24 * 60 - 5 ? 100 + d * 2 : 100;
      return { t: START + k * M, o: close, h: close + .001, l: close - .001, c: close, v: 1 };
    });
    return [barsFromCandles(sym, 1, candles), barsFromCandles(sym, 5, resample(candles, 1, 5))];
  });
  const u = makeUniverse(bars), protect: Protect = { tp: 0, sl: .01, trail: .005,
    hold: 1, maxHoldMin: 3, tag: "mn", trailOnly: true, trailMax: .03 };
  const [tape] = buildTapes(u, [protect], COST, undefined, new Set([`follow|${IND}`]), null, null,
    { minSl: 0, minTrail: 0 });
  assert.ok(tape, "a 3-minute execution hold can use a completed 5-minute indication");
  assert.equal(tape.pending.length, 8, "the completed source bar has an independent pending intent per symbol");
  assert.deepEqual(new Set(tape.pending.map((x) => x.side)), new Set([1, -1]));
  const state = new IncrementalState(u, COST, null, 1);
  assert.deepEqual(state.seed([tape]), { taken: 1, skipped: [] });
  const altered = { ...tape, pending: tape.pending.map((p) => ({ ...p, execution: { tfMin: 1, holdMin: 2 } })) };
  assert.deepEqual(new IncrementalState(u, COST, null, 1).seed([altered]), { taken: 0, skipped: [tape.id] },
    "a changed pending deadline cannot be silently replaced by a different continuation");
  const barEnd = START + 24 * 60 * M;
  const opens = pendingAsOpen(tape, barEnd, 1, (sym) => symbols.indexOf(sym) < 4 ? 102 : 98, COST);
  assert.equal(opens.length, 8);
  assert.throws(() => pendingAsOpen(altered, barEnd, 1, () => 100, COST), /hold-clock provenance/);
  for (const open of opens) {
    const tick = open as TickPosition;
    assert.equal(open.executionTfMin, 1, "the minute pricing clock is attached to the pending order");
    assert.equal(open.holdEndT, barEnd + 3 * M, "the original hold is a wall-clock deadline");
    assert.equal(open.target, 0);
    const book = new TickMathBook([open], Float64Array.of(1), COST, 1, false);
    book.advance({ [open.sym]: open.entry }, barEnd);
    book.advance({ [open.sym]: open.entry }, barEnd + 3 * M - 1);
    assert.equal(tick.stopHit, undefined);
    book.advance({ [open.sym]: open.entry }, barEnd + 3 * M);
    assert.equal(tick.stopHit, barEnd + 3 * M);
    assert.equal(open.hitReason, "time");
    assert.ok(Math.abs(open.mtm + COST) < 1e-12, "a flat expiry deducts cost once");
  }
  assert.equal(laneProtect(protect, IND).hold, 0, "the hold cannot be rounded to a 5-minute bar");
});

test("the realtime continuation preserves minute-clock provenance for each newly pending lane", () => {
  const groups = symbols.map((sym, i) => {
    const direction = i < 4 ? 1 : -1;
    return Array.from({ length: 24 * 60 }, (_, k) => {
      const px = k >= 24 * 60 - 5 ? 100 + direction * 2 : 100;
      return { t: START + k * M, o: px, h: px + .001, l: px - .001, c: px, v: 1 };
    });
  });
  const prefix = groups.flatMap((rows, i) => {
    const initial = rows.slice(0, -5);
    return [barsFromCandles(symbols[i], 1, initial), barsFromCandles(symbols[i], 5, resample(initial, 1, 5))];
  });
  const append = groups.flatMap((rows, i) => {
    const last = rows.slice(-5);
    return [barsFromCandles(symbols[i], 1, last), barsFromCandles(symbols[i], 5, resample(last, 1, 5))];
  });
  const protect: Protect = { tp: 0, sl: .01, trail: .005, hold: 1, maxHoldMin: 3,
    tag: "mn", trailOnly: true, trailMax: .03 };
  const book = new RealtimeTapeBook(prefix, [{ key: "engine", pairs: [`follow|${IND}`], protects: [protect],
    floors: { minSl: 0, minTrail: 0 } }], COST);
  const result = book.advance(append);
  const tape = result.tapes.find((x) => x.kind === "trailing-only");
  assert.ok(tape); assert.equal(tape.pending.length, 8);
  for (const intent of tape.pending) assert.deepEqual(intent.execution, { tfMin: 1, holdMin: 3 });
  const opens = pendingAsOpen(tape, START + 24 * 60 * M, 1, (sym) => symbols.indexOf(sym) < 4 ? 102 : 98, COST);
  assert.equal(opens.length, 8);
  assert.ok(opens.every((p) => p.executionTfMin === 1 && p.holdEndT === START + (24 * 60 + 3) * M));
});

test("trailing-only incremental continuation matches full 8-symbol 12h + 12h simulation", () => {
  const rows = symbols.map((_, i) => Array.from({ length: 24 * 60 }, (_, k) => {
    const px = 100 + (i % 2 ? -1 : 1) * 2 * Math.sin(k / 35);
    return { t: START + k * M, o: px, h: px + .002, l: px - .002, c: px, v: 1 };
  }));
  const universe = (minutes: number) => makeUniverse(rows.flatMap((all, i) => {
    const data = all.slice(0, minutes);
    return [barsFromCandles(symbols[i], 1, data), barsFromCandles(symbols[i], 5, resample(data, 1, 5))];
  }), START);
  const protect: Protect = { tp: 0, sl: .01, trail: .004, hold: 1, maxHoldMin: 3,
    tag: "mn", trailOnly: true, trailMax: .03 };
  const build = (minutes: number) => buildTapes(universe(minutes), [protect], COST, undefined,
    new Set([`follow|${IND}`]), null, null, { minSl: 0, minTrail: 0 })[0];
  const initial = build(12 * 60); assert.ok(initial);
  let current = seedTape(initial, universe(12 * 60), COST, null);
  assert.ok(current, "qualified trailing-only tapes can continue rather than requiring a full rebuild");
  for (const minutes of [16 * 60, 20 * 60, 24 * 60]) {
    const next = extendTape(current.tape, current.resume, universe(minutes), COST, null);
    assert.ok(next); const full = build(minutes);
    assert.equal(next.tape.n, full.n);
    for (const key of ["entryT", "exitT", "r", "side", "reason", "symI"] as const)
      assert.deepEqual(Array.from(next.tape[key]), Array.from(full[key]), `${minutes}: ${key}`);
    assert.deepEqual(next.tape.open, full.open);
    assert.deepEqual(next.tape.pending, full.pending);
    current = next;
  }
  assert.ok(current.tape.n > 0);
  assert.deepEqual(new Set(current.tape.side), new Set([1, -1]));
});

test("ATR trailing-only orders never invent a take-profit on long or short entries", () => {
  for (const side of [1, -1] as const) for (const signal of [false, true]) {
    const ind = signal ? "sig-ema-cross-s@m5" : IND;
    const protect: Protect = { tp: 0, sl: .01, trail: .0095, trailOnly: true, trailMax: .03,
      hold: 10, atr: { sl: 1, tpRatio: .5, trail: .8 } };
    const id = configId("follow", ind, protect);
    const rows: Candle[] = Array.from({ length: 27 }, (_, i) => ({ t: START + i * 5 * M,
      o: 100, h: i === 26 && side === 1 ? 102 : 100.01,
      l: i === 26 && side === -1 ? 98 : 99.99, c: 100, v: 1 }));
    const entries = new Int8Array(rows.length); entries[25] = side;
    const result = simulate(id, barsFromCandles("ADA-USDT", 5, rows), entries, protect,
      { cost: COST, atr: new Float64Array(rows.length).fill(1) });
    assert.equal(result.trades.length, 0, `${ind}, side ${side}: price crossing the ATR target cannot close a no-TP order`);
    assert.ok(result.open); assert.equal(result.open.target, 0); assert.equal(result.open.trailOnly, true);
  }
});

test("repairing a legacy no-TP position requests protection reconciliation even if its stop is unchanged", () => {
  for (const side of [1, -1] as const) {
    const p: Protect = { tp: 0, sl: .02, trail: .01, trailOnly: true, hold: 8 };
    const cfg = configId("follow", IND, p), entry = 100;
    const position: TickPosition = { cfg, sym: "ADA-USDT", side, entryT: START, entryI: 0, entry,
      stop: entry * (1 - side * .02), target: entry * (1 + side * .04), peak: entry,
      trailOn: false, trail: .01, trailDist: .01, mtm: -COST };
    const book = new TickMathBook([position], Float64Array.of(1), COST, 1, false);
    const result = book.advance({ [position.sym]: entry }, START + M);
    assert.equal(position.target, 0); assert.equal(position.trailOnly, true);
    assert.equal(position.stop, entry * (1 - side * .02), "repair cannot loosen or tighten this valid stop");
    assert.equal(result.trailMoved, true, "live controls must learn that a stale TP was removed");
    assert.equal(position.stopHit, undefined);
  }
});

test("trailing-only tapes obey the same Base target proof at construction and selection", () => {
  const candles: Candle[] = Array.from({ length: 24 * 60 }, (_, i) => {
    const px = 100 + 2 * Math.sin(i / 35);
    return { t: START + i * M, o: px, h: px + .002, l: px - .002, c: px, v: 1 };
  });
  const universe = makeUniverse(symbols.flatMap((sym) => [barsFromCandles(sym, 1, candles),
    barsFromCandles(sym, 5, resample(candles, 1, 5))]));
  const pair = `follow|${IND}`, protect: Protect = { tp: 0, sl: .01, trail: .004, hold: 1,
    maxHoldMin: 15, tag: "mn", trailOnly: true, trailMax: .03 };
  const build = (targets: number[]) => buildTapes(universe, [protect], COST, undefined, new Set([pair]), null, null,
    { minSl: 0, minTrail: 0, pairTags: { [pair]: ["mn"] }, pairTps: { [pair]: { mn: targets } } });
  const failed = build([.01]);
  assert.equal(failed.length, 0, "a passed TP sibling is not proof for a zero-TP trailing-only cell");
  const passed = build([0]);
  assert.equal(passed.length, 1, "the independently passed zero-TP target must be buildable");
  const actual = passed[0], base = { basePassed: new Set([pair]), basePassedRanges: { [pair]: ["mn"] },
    basePassedTargets: { [pair]: { mn: [0] } },
    basePassedCells: passedCellsOf({ [pair]: [protectCellKey(actual.protect)] }) };
  assert.equal(baseAllowsTape(actual, base), true);
  assert.equal(baseAllowsTape(actual, { ...base, basePassedTargets: { [pair]: { mn: [.01] } } }), false);
  assert.equal(baseAllowsTape(actual, { ...base, basePassedCells: passedCellsOf({
    [pair]: [protectCellKey({ ...actual.protect, sl: .02 })],
  }) }), false, "a different trailing-only cell cannot lend its Base proof");
  for (const [name, sibling] of [
    ["trail ratio", { ...actual.protect, trailStep: .5 }],
    ["stop ceiling", { ...actual.protect, trailMax: .02 }],
    ["trailing mode", { ...actual.protect, trailOnly: false }],
  ] as const) {
    assert.notEqual(protectCellKey(sibling), protectCellKey(actual.protect), `${name} has an independent Base proof`);
    assert.equal(baseAllowsTape({ ...actual, protect: sibling }, base), false, `${name} cannot borrow this proof`);
  }
});

test("Base records the capped effective no-TP cell and admits only that lane policy", () => {
  const rows: Candle[] = Array.from({ length: 24 * 60 }, (_, i) => {
    const price = 100 + 5 * Math.sin(i / 25);
    return { t: START + i * M, o: price, h: price + .001, l: price - .001, c: price, v: 1 };
  });
  const universe = makeUniverse(symbols.flatMap((sym) => [barsFromCandles(sym, 1, rows),
    barsFromCandles(sym, 5, resample(rows, 1, 5))]));
  const pair = `follow|${IND}`, p: Protect = { tp: 0, sl: .08, trail: .04, trailStep: 1.5,
    hold: 1, maxHoldMin: 15, tag: "mn", trailOnly: true };
  const proof: string[] = [];
  const stats = rangeBaseStats(universe, "follow", IND, [p], COST, null, undefined, false,
    (_tag, stat) => stat.n > 0, 5, undefined, undefined, proof);
  assert.ok(stats?.mn?.n, "the eight-symbol cell generated Base closes");
  const capped = capTrailingOnlyProtect(laneProtect(p, IND));
  assert.ok(capped.sl <= .03 && capped.trail <= .03 && capped.trail * (capped.trailStep ?? 1) <= .03 + 1e-12);
  assert.deepEqual(proof, [protectCellKey(capped)], "proof names the actual post-lane capped protection");
  const tapes = buildTapes(universe, [p], COST, undefined, new Set([pair]), null, null,
    { minSl: 0, minTrail: 0, pairTags: { [pair]: ["mn"] }, pairTps: { [pair]: { mn: [0] } },
      pairCells: { [pair]: proof } });
  assert.equal(tapes.length, 1);
  assert.equal(protectCellKey(tapes[0].protect), proof[0]);
});

test("a Micro trailing-only pending order expires at its captured 15-minute limit", () => {
  const ind = "mc-rsi2-5@m5", pair = `follow|${ind}`;
  const data = symbols.flatMap((sym, i) => {
    const sign = i < 4 ? 1 : -1;
    const candles: Candle[] = Array.from({ length: 24 * 60 }, (_, k) => {
      const px = k >= 24 * 60 - 5 ? 100 + sign * 2 : 100;
      return { t: START + k * M, o: px, h: px + .001, l: px - .001, c: px, v: 1 };
    });
    return [barsFromCandles(sym, 1, candles), barsFromCandles(sym, 5, resample(candles, 1, 5))];
  });
  const protect: Protect = { tp: 0, sl: .01, trail: .004, hold: 1, maxHoldMin: 15,
    tag: "mc", trailOnly: true, trailMax: .03 };
  const universe = makeUniverse(data), [tape] = buildTapes(universe, [protect], COST, undefined,
    new Set([pair]), null, null, { minSl: 0, minTrail: 0, microOwnInds: false });
  assert.ok(tape);
  const source = tape;
  assert.equal(source.pending.length, 8, "each Micro symbol generates a genuine pending signal");
  assert.deepEqual(new Set(source.pending.map((p) => p.side)), new Set([1, -1]));
  const at = START + 24 * 60 * M;
  for (const position of pendingAsOpen(source, at, 1, (sym) => symbols.indexOf(sym) < 4 ? 102 : 98, COST)) {
    assert.equal(position.holdEndT, at + 15 * M);
    assert.equal(position.executionTfMin, 1);
    const tick = position as TickPosition, book = new TickMathBook([tick], Float64Array.of(1), COST, 1, false);
    book.advance({ [tick.sym]: tick.entry }, at);
    book.advance({ [tick.sym]: tick.entry }, at + 15 * M - 1); assert.equal(tick.stopHit, undefined);
    book.advance({ [tick.sym]: tick.entry }, at + 15 * M); assert.equal(tick.hitReason, "time");
  }
});
