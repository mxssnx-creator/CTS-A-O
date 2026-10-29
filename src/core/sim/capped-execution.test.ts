import assert from "node:assert/strict";
import { test } from "node:test";
import type { Protect } from "../domain/types.ts";
import { barsFromCandles } from "../market/bars.ts";
import type { Universe } from "../pipeline/pipeline.ts";
import { cappedExecution } from "./capped-execution.ts";

const M = 60_000, T = Date.UTC(2026, 9, 9);
const bars = (sym: string, tf: number, n: number) => barsFromCandles(sym, tf, Array.from({ length: n }, (_, i) =>
  ({ t: T + i * tf * M, o: 100, h: 101, l: 99, c: 100, v: 1 })));
const p: Protect = { tp: .01, sl: .01, trail: 0, hold: 0, maxHoldMin: 3 };
const universe = (prices = bars("A", 1, 8), source = bars("A", 5, 1)) => ({ bars: [prices, source] }) as Universe;

test("minute projection is sparse and can use only already completed source signal/ATR values", () => {
  const u = universe(), signal = Int8Array.of(1);
  const view = cappedExecution(u, 1, signal, p, 2);
  assert.equal(view.minute, true); assert.equal(view.protect.hold, 3); assert.equal(view.cooldown, 10);
  assert.deepEqual([...view.signal], [0, 0, 0, 0, 1, 0, 0, 0], "no forward filling or same-bar entry");
  const atr = Float64Array.of(42), mapped = view.series(atr);
  assert.ok(mapped.slice(0, 4).every(Number.isNaN), "unobserved ATR cannot price an earlier entry");
  assert.deepEqual([...mapped.slice(4)], [42, 42, 42, 42]);
  assert.equal(view.series(atr), mapped, "all protection cells share one immutable numeric projection");
  const grown = universe(bars("A", 1, 12), bars("A", 5, 2));
  const next = cappedExecution(grown, 1, Int8Array.of(1, -1), p);
  assert.deepEqual(next.signal.slice(0, 8), view.signal, "later source outcomes cannot rewrite an earlier prefix");
  assert.equal(next.signal[9], -1);
});

test("missing sibling, stale or gapped minute prices cannot silently become a different execution sample", () => {
  assert.throws(() => cappedExecution(universe(bars("B", 1, 8)), 1, Int8Array.of(1), p), /missing own minute/);
  assert.throws(() => cappedExecution(universe(bars("A", 1, 4)), 1, Int8Array.of(1), p), /stale minute/);
  const gapped = bars("A", 1, 8); gapped.t[6] += M;
  assert.throws(() => cappedExecution(universe(gapped), 1, Int8Array.of(1), p), /invalid minute/);
});

test("native controls stay native; genuine minute caps resolve independently of source-bar count", () => {
  const u = universe(), signal = Int8Array.of(1);
  const native = cappedExecution(u, 1, signal, { ...p, maxHoldMin: undefined, hold: 3 }, 2);
  assert.equal(native.minute, false); assert.equal(native.bars, u.bars[1]); assert.equal(native.signal, signal);
  assert.equal(native.protect.hold, 3); assert.equal(native.cooldown, 2);
  const minute = cappedExecution(u, 0, new Int8Array(8), p);
  assert.equal(minute.protect.hold, 3); assert.equal(minute.minute, true);
});
