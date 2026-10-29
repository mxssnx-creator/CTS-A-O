import assert from "node:assert/strict";
import { test } from "node:test";
import { TickMathBook, carryTrail, type TickPosition } from "./tick-math.ts";

const M = 60_000;
const position = (): TickPosition => ({
  cfg: "follow|ema-9-21@m30|t0.05|s0.02|r0.005|h0|hm15|mc",
  sym: "CLOCK-USDT", side: 1, entryT: 0, entryI: 0, entry: 100,
  stop: 98, target: 105, peak: 100, trailOn: false, trail: .005,
  trailDist: .005, mtm: -.0015,
});

test("a capped position advances its realtime trail on its execution clock and preserves the legacy lane clock", () => {
  const minute = { ...position(), executionTfMin: 1 }, legacy = position();
  const book = new TickMathBook([minute, legacy], Float64Array.of(1, 1), .0015, 1, false);
  book.advance({ "CLOCK-USDT": 101 }, M);
  book.advance({ "CLOCK-USDT": 101 }, 2 * M);
  assert.ok(minute.stop > 100, "the closed minute must arm/ratchet the validated minute trail");
  assert.equal(legacy.stop, 98, "an unstamped legacy/native position still owns its30m clock");
  const closed = book.advance({ "CLOCK-USDT": 100 }, 2 * M + 1);
  assert.ok(minute.stopHit, "a reversal hits the actual ratcheted minute stop");
  assert.equal(legacy.stopHit, undefined);
  assert.equal(Object.keys(closed.hits ?? {}).length, 1);
});

test("rebuilding a position cannot reinterpret retained tick indices using a different clock", () => {
  const old = { ...position(), tkBar: 5, tkHi: 101, tkLo: 100, tkClose: 101 };
  const now = { ...position(), executionTfMin: 1 };
  const carried = carryTrail(now, old);
  assert.equal(carried.tkBar, undefined);
  assert.equal(carried.stop, 98, "price protection remains monotone independently of bar provenance");
});
