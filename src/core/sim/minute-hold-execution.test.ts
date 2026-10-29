import assert from "node:assert/strict";
import { test } from "node:test";
import type { Candle, Protect } from "../domain/types.ts";
import { barsFromCandles, resample } from "../market/bars.ts";
import { SeriesCache } from "../indications/cache.ts";
import { entrySignal } from "../bots/bots.ts";
import { configId, laneProtect, makeUniverse, parseConfigId, protectCellKey, runCombo } from "../pipeline/pipeline.ts";
import { buildTapes, tradeAt } from "./walkforward.ts";
import { TapeContinuations } from "./cursor.ts";
import { seedTape, extendTape } from "./tape-extend.ts";

const M = 60_000, START = Date.UTC(2026, 9, 6, 12), ind = "ema-9-21@m30", cost = .0015;
const protect: Protect = { tp: .005, sl: .01, trail: 0, hold: 1, tag: "mc", maxHoldMin: 15 };
function fixture(tp: boolean) {
  // Exactly72h total; the30m indication has144 usable bars. Only minute highs change in the TP case,
  // so the entry indication's close/EMA path remains identical before and after the price event.
  const candles: Candle[] = Array.from({ length: 4320 }, (_, i) => {
    const price = i < 3600 ? 100 : 102;
    return { t: START + i * M, o: price, h: price + .001, l: price - .001, c: price, v: 100 };
  });
  let source = barsFromCandles("HOLD-USDT", 30, resample(candles, 1, 30));
  const state = entrySignal("follow", ind, new SeriesCache(source), null)!;
  const first = state.findIndex((x) => x === 1);
  assert.ok(first >= 0 && first < source.n - 1, "the independently computed indication has a usable long entry");
  const entryT = source.t[first] + 30 * M, minute = (entryT - START) / M;
  if (tp) candles[minute + 1].h = candles[minute + 1].o * 1.006;
  source = barsFromCandles("HOLD-USDT", 30, resample(candles, 1, 30));
  const at = (end: number) => {
    const prefix = candles.filter((x) => x.t < end);
    return makeUniverse([barsFromCandles("HOLD-USDT", 1, prefix),
      barsFromCandles("HOLD-USDT", 30, resample(prefix, 1, 30).filter((x) => x.t + 30 * M <= end))]);
  };
  return { u: makeUniverse([barsFromCandles("HOLD-USDT", 1, candles), source]), entryT, at };
}

test("Normal TP executes on minute prices despite a15min hold being shorter than its30m indication", () => {
  const { u, entryT } = fixture(true);
  const tapes = buildTapes(u, [protect], cost, undefined, new Set([`follow|${ind}`]), null, null,
    { minSl: 0, minTrail: 0, microOwnInds: false });
  assert.equal(tapes.length, 1, "a positive wall-clock duration is not an invalid zero-bar configuration");
  const rows = Array.from({ length: tapes[0].n }, (_, i) => tradeAt(tapes[0], i));
  const first = rows.find((x) => x.entryT === entryT)!;
  assert.ok(first, "the completed30m indication reaches its next minute entry");
  assert.equal(first.reason, "tp"); assert.equal(first.exitT, entryT + 2 * M);
  assert.ok(Math.abs(first.r - (.005 - cost)) < 1e-12, "TP price return less exactly one round-trip cost");
  const base = runCombo(u, "follow", ind, protect, cost, 1)!;
  assert.ok(base, "Base must use the same executable wall-clock hold");
  assert.equal(base.full.n, rows.length);
  assert.ok(Math.abs(base.full.net - rows.reduce((n, x) => n + x.r * 100, 0)) < 1e-10,
    "Base and executable tape keep the same complete cohort, including later time-exit losses");
});

test("a15min expiry stays15min with30m indications instead of disappearing or rounding to30min", () => {
  const { u, entryT } = fixture(false);
  const [tape] = buildTapes(u, [protect], cost, undefined, new Set([`follow|${ind}`]), null, null,
    { minSl: 0, minTrail: 0, microOwnInds: false });
  assert.ok(tape, "the source remains calculable");
  const first = Array.from({ length: tape.n }, (_, i) => tradeAt(tape, i)).find((x) => x.entryT === entryT)!;
  assert.ok(first); assert.equal(first.reason, "time"); assert.equal(first.exitT - first.entryT, 15 * M);
  assert.ok(Math.abs(first.r + cost) < 1e-12, "a flat time exit still pays its cost and remains a loss");
});

test("distinct requested minute holds retain distinct config identities and survive parsing", () => {
  const p15 = laneProtect(protect, ind), p20 = laneProtect({ ...protect, maxHoldMin: 20 }, ind);
  const id15 = configId("follow", ind, p15), id20 = configId("follow", ind, p20);
  assert.notEqual(id15, id20, "flooring both caps to the same source-bar count cannot alias their new execution sets");
  assert.equal(parseConfigId(id15)?.protect.maxHoldMin, 15);
  assert.equal(parseConfigId(id20)?.protect.maxHoldMin, 20);
  assert.notEqual(protectCellKey(p15), protectCellKey(p20), "a passed15min cell cannot prove a20min sibling");
  for (const suffix of ["|hm0", "|hmNaN", "|hm15|hm20", "|hm1.2.3"])
    assert.equal(parseConfigId(id15.replace("|hm15", "") + suffix), null, "invalid or duplicate hold evidence stays invalid");
});

test("private cursors close a capped position on the next minute without waiting for another30m bar", () => {
  const { entryT, at } = fixture(true), initialU = at(entryT + M), nextU = at(entryT + 2 * M);
  assert.equal(initialU.bars[1].n, nextU.bars[1].n, "the indication lane has not advanced");
  const continuations = new TapeContinuations();
  const [initial] = buildTapes(initialU, [protect], cost, undefined, new Set([`follow|${ind}`]), null, null,
    { minSl: 0, minTrail: 0, microOwnInds: false, continuations });
  assert.equal(initial.open.length, 1);
  assert.equal(initial.open[0].executionTfMin, 1, "held tick/restart protection must retain its execution clock");
  const closed = [...continuations.advance(nextU, new Set([1]))].flatMap((x) => x.result.trades);
  assert.equal(closed.length, 1); assert.equal(closed[0].reason, "tp");
  assert.equal(closed[0].entryT, entryT); assert.equal(closed[0].exitT, entryT + 2 * M);
  assert.equal([...continuations.advance(nextU, new Set([1]))].flatMap((x) => x.result.trades).length, 0,
    "a repeated minute cannot settle or count the order twice");
});

test("a restart seed and its minute extension match a full capped build including retained ownership", () => {
  const { entryT, at } = fixture(true), initialU = at(entryT + M), nextU = at(entryT + 2 * M);
  const build = (u: ReturnType<typeof at>) => buildTapes(u, [protect], cost, undefined,
    new Set([`follow|${ind}`]), null, null, { minSl: 0, minTrail: 0, microOwnInds: false })[0];
  const original = build(initialU), seeded = seedTape(original, initialU, cost, null)!;
  assert.ok(seeded); assert.deepEqual(seeded.tape.open, original.open, "restart must retain the same actual position");
  const extended = extendTape(seeded.tape, seeded.resume, nextU, cost, null)!, full = build(nextU);
  assert.ok(extended);
  for (const key of ["entryT", "exitT", "r", "reason", "side"] as const)
    assert.deepEqual(extended.tape[key], full[key], key);
  assert.deepEqual(extended.tape.open, full.open); assert.deepEqual(extended.tape.pending, full.pending);
});

test("a literal pre-migration held identity keeps its native exits and cannot become a new capped candidate", () => {
  const { entryT, at } = fixture(false), u = at(entryT + 30 * M);
  const oldProtect = { ...protect, hold: 2, maxHoldMin: undefined };
  const legacy = configId("follow", ind, oldProtect);
  assert.ok(!legacy.includes("|hm"));
  const [retained] = buildTapes(u, [protect], cost, undefined, new Set([`follow|${ind}`]), null, null,
    { minSl: 0, minTrail: 0, microOwnInds: false, onlyIds: new Set([legacy]), heldIds: new Set([legacy]) });
  assert.ok(retained, "a changed capped grid cannot orphan a pre-migration held configuration");
  assert.equal(retained.id, legacy); assert.equal(retained.heldOnly, true);
  assert.equal(retained.open.length, 1); assert.equal(retained.open[0].executionTfMin, undefined);
  assert.equal(retained.protect.hold, 2); assert.equal(retained.protect.maxHoldMin, undefined);
});

test("a longer indication prehistory cannot overstate the capped tape's minute-price coverage", () => {
  const { u } = fixture(false), minutes = u.bars[0], cut = minutes.t[2000];
  const prices = barsFromCandles(minutes.sym, 1, Array.from({ length: minutes.n - 2000 }, (_, k) => {
    const i = k + 2000;
    return { t: minutes.t[i], o: minutes.o[i], h: minutes.h[i], l: minutes.l[i], c: minutes.c[i], v: minutes.v[i] };
  }));
  const shortened = makeUniverse([prices, u.bars[1]]);
  const [tape] = buildTapes(shortened, [protect], cost, undefined, new Set([`follow|${ind}`]), null, null,
    { minSl: 0, minTrail: 0, microOwnInds: false });
  assert.equal(tape.fromT, cut);
});
